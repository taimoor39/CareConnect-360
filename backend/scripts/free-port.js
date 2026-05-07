import { execSync } from 'node:child_process';

const portArg = process.argv[2];
const parsedPort = Number(portArg);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 8000;

function unique(values) {
  return [...new Set(values)];
}

function freePortWindows(targetPort) {
  let output = '';
  try {
    output = execSync(`netstat -ano -p tcp | findstr :${targetPort}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return;
  }

  const pids = unique(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(/\s+/).at(-1))
      .filter((pid) => pid && /^\d+$/.test(pid))
      .filter((pid) => pid !== String(process.pid))
  );

  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      console.log(`Freed port ${targetPort} by terminating PID ${pid}`);
    } catch {
      // Ignore inaccessible/system PIDs.
    }
  }
}

function freePortUnix(targetPort) {
  let output = '';
  try {
    output = execSync(`lsof -t -i tcp:${targetPort}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return;
  }

  const pids = unique(
    output
      .split(/\r?\n/)
      .map((pid) => pid.trim())
      .filter((pid) => /^\d+$/.test(pid))
      .filter((pid) => pid !== String(process.pid))
  );

  for (const pid of pids) {
    try {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
      console.log(`Freed port ${targetPort} by terminating PID ${pid}`);
    } catch {
      // Ignore inaccessible/system PIDs.
    }
  }
}

if (process.platform === 'win32') {
  freePortWindows(port);
} else {
  freePortUnix(port);
}
