/**
 * Cross-platform AI service launcher.
 * Creates ai-service/venv if missing, installs requirements, then runs launch.py.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const aiDir = path.join(root, 'ai-service');
const isWin = process.platform === 'win32';
const venvPython = path.join(aiDir, 'venv', isWin ? 'Scripts' : 'bin', isWin ? 'python.exe' : 'python');
const requirements = path.join(aiDir, 'requirements.txt');
const reload = process.argv.includes('--reload');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: options.cwd ?? root,
    env: process.env,
    windowsHide: true,
  });
  return result.status ?? 1;
}

function resolvePython(command, prefixArgs = []) {
  const result = spawnSync(
    command,
    [...prefixArgs, '-c', 'import sys; print(sys.executable)'],
    { encoding: 'utf8', windowsHide: true }
  );
  if (result.status !== 0 || !result.stdout) return null;
  const executable = result.stdout.trim().split(/\r?\n/).at(-1)?.trim();
  if (!executable || executable.includes('WindowsApps')) return null;
  return executable;
}

function findSystemPython() {
  const candidates = isWin
    ? [
        ['py', ['-3']],
        ['python', []],
        ['python3', []],
      ]
    : [
        ['python3', []],
        ['python', []],
      ];

  for (const [command, prefixArgs] of candidates) {
    const executable = resolvePython(command, prefixArgs);
    if (executable) return executable;
  }
  return null;
}

function venvCanImport(moduleName) {
  const result = spawnSync(venvPython, ['-c', `import ${moduleName}`], {
    encoding: 'utf8',
    stdio: 'pipe',
    windowsHide: true,
  });
  return result.status === 0;
}

if (!existsSync(venvPython)) {
  const systemPython = findSystemPython();
  if (!systemPython) {
    console.error('[ai] Python 3.10+ is required but was not found. Install Python and retry.');
    process.exit(1);
  }
  console.log(`[ai] creating virtualenv at ai-service/venv with ${systemPython}`);
  const status = run(systemPython, ['-m', 'venv', path.join(aiDir, 'venv')]);
  if (status !== 0) {
    console.error('[ai] failed to create virtualenv');
    process.exit(status);
  }
}

if (!venvCanImport('uvicorn')) {
  console.log('[ai] installing Python dependencies (torch/transformers may take several minutes) …');
  const pipUpgrade = run(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip']);
  if (pipUpgrade !== 0) process.exit(pipUpgrade);
  const pipInstall = run(venvPython, ['-m', 'pip', 'install', '-r', requirements]);
  if (pipInstall !== 0) {
    console.error('[ai] failed to install ai-service/requirements.txt');
    process.exit(pipInstall);
  }
}

const childArgs = reload
  ? [
      '-m',
      'uvicorn',
      'app.main:app',
      '--reload',
      '--reload-dir',
      aiDir,
      '--host',
      '0.0.0.0',
      '--port',
      '8001',
      '--app-dir',
      aiDir,
    ]
  : [path.join(aiDir, 'launch.py')];

if (reload) {
  run(process.execPath, [path.join(root, 'backend', 'scripts', 'free-port.js'), '8001']);
}

const child = spawn(venvPython, childArgs, {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
  windowsHide: true,
});

child.on('exit', (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
