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
    output = execSync('netstat -ano -p tcp', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return;
  }

  const pids = unique(output.split(/\r?\n/).flatMap((line) => {
    const fields = line.trim().split(/\s+/);
    if (fields.length < 5 || fields[0] !== 'TCP' || fields.at(-2) !== 'LISTENING') return [];

    const localAddress = fields[1];
    const portMatches = localAddress.match(/:(\d+)$/);
    if (!portMatches || Number(portMatches[1]) !== targetPort) return [];

    const pid = fields.at(-1);
    return /^\d+$/.test(pid) && pid !== String(process.pid) ? [pid] : [];
  }));

  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
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
