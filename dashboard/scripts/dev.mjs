import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const commands = [
  ['run', 'dev:api'],
  ['run', 'dev:app'],
];

const children = commands.map((args) =>
  spawn(npmCommand, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
  })
);

function shutdown(exitCode = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  process.exit(exitCode);
}

for (const child of children) {
  child.on('exit', (code) => {
    shutdown(code ?? 0);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
