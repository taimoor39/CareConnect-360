"""
CareConnect 360 AI Service — launcher.

Kills orphaned socket holders (including multiprocessing spawn-workers that
inherited the listening socket from a dead parent) before starting uvicorn.
"""
from __future__ import annotations

import os
import socket
import subprocess
import sys
import time

PORT = 8001
_OWN_PID = str(os.getpid())

# ── 0. Set env vars BEFORE any library import ────────────────────────────────
# Prevents tokenizers/transformers from spawning multiprocessing workers
# (those workers inherit the server socket and keep port 8001 locked after crashes).
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("OMP_NUM_THREADS", "2")

# ── 1. Make ai-service the working directory and importable ──────────────────
_here = os.path.dirname(os.path.abspath(__file__))
os.chdir(_here)
if _here not in sys.path:
    sys.path.insert(0, _here)


def _log(msg: str) -> None:
    print(f"[launch] {msg}", flush=True)


# ── 2. Kill all stale Python processes that might hold port 8001 ─────────────
def _kill_stale_workers() -> None:
    """
    Kill two categories of orphaned Python processes:
    1. Any process with 'uvicorn' or 'launch.py' in its command line.
    2. Any multiprocessing spawn-worker (--multiprocessing-fork) whose parent
       is dead — these are the main cause of ghost LISTENING handles on Windows.
    """
    out = subprocess.run(
        "wmic process get processid,commandline",
        capture_output=True, text=True, shell=True,
    ).stdout

    # NOTE: do NOT include "launch.py" here — that would match the parent
    # shell process (e.g. cmd.exe /c "... launch.py") and kill it, which
    # would terminate our own Python process too.
    kill_patterns = ("uvicorn", "--multiprocessing-fork")
    for line in out.splitlines():
        if not any(p in line for p in kill_patterns):
            continue
        # Last whitespace-separated token should be the PID in WMIC output
        tokens = line.split()
        pid = tokens[-1] if tokens else ""
        if pid.isdigit() and pid != _OWN_PID:
            subprocess.run(f"taskkill /PID {pid} /F", shell=True, capture_output=True)
            # Truncate command for readability
            short_cmd = line.strip()[:60]
            _log(f"killed stale worker PID {pid} ({short_cmd})")


def _free_port_windows(port: int) -> None:
    # Step A: PowerShell Remove-NetTCPConnection (handles kernel-level orphans)
    ps_cmd = (
        f"Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue "
        f"| Remove-NetTCPConnection -ErrorAction SilentlyContinue"
    )
    subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps_cmd],
        capture_output=True,
    )

    # Step B: netstat fallback for any remaining PID holders
    out = subprocess.run(
        "netstat -ano -p tcp", capture_output=True, text=True, shell=True
    ).stdout
    pids: set[str] = set()
    for line in out.splitlines():
        if f":{port}" not in line:
            continue
        parts = line.split()
        pid = parts[-1] if parts else ""
        if pid.isdigit() and pid != _OWN_PID:
            pids.add(pid)
    for pid in sorted(pids):
        subprocess.run(f"taskkill /PID {pid} /F", shell=True, capture_output=True)
        _log(f"killed netstat holder PID {pid}")


def _free_port_unix(port: int) -> None:
    out = subprocess.run(
        f"lsof -t -i tcp:{port}", capture_output=True, text=True, shell=True
    ).stdout
    for pid in out.split():
        if pid.isdigit() and pid != _OWN_PID:
            subprocess.run(f"kill -9 {pid}", shell=True, capture_output=True)
            _log(f"killed PID {pid}")


# ── 3. Poll until the port is actually bindable (up to 20 s) ─────────────────
def _wait_for_port(port: int, timeout: float = 20.0) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(("0.0.0.0", port))
            s.close()
            return True
        except OSError:
            s.close()
            _log(f"port {port} still busy — retrying in 1 s …")
            time.sleep(1.0)
    return False


# ── Run cleanup ───────────────────────────────────────────────────────────────
if sys.platform == "win32":
    _kill_stale_workers()
    _free_port_windows(PORT)
else:
    _free_port_unix(PORT)

time.sleep(0.8)  # brief OS drain

if not _wait_for_port(PORT, timeout=20.0):
    _log(f"WARNING: port {PORT} could not be freed after 20 s — attempting to start anyway")
else:
    _log(f"port {PORT} is free — starting uvicorn")

# ── 4. Start uvicorn in-process ───────────────────────────────────────────────
import uvicorn  # noqa: E402  (after sys.path update)

uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, log_level="info")
