// Starts the listening audio tool with the Python of tools/tts/.venv (see README.md).
// `node tools/tts/run.mjs`       starts the server (npm run tts)
// `node tools/tts/run.mjs test`  runs the Python tests (npm run test:tts); falls back to `python`
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const venvPython =
  process.platform === 'win32'
    ? join(here, '.venv', 'Scripts', 'python.exe')
    : join(here, '.venv', 'bin', 'python');
const test = process.argv[2] === 'test';

let python = venvPython;
if (!existsSync(venvPython)) {
  if (!test) {
    console.error(
      `No virtual environment at ${venvPython}. Follow the set-up steps in tools/tts/README.md.`,
    );
    process.exit(1);
  }
  python = process.platform === 'win32' ? 'python' : 'python3';
}

const args = test
  ? ['-m', 'unittest', 'discover', '-s', here, '-p', 'test_*.py']
  : [join(here, 'server.py')];
const result = spawnSync(python, args, { cwd: here, stdio: 'inherit' });
process.exit(result.status ?? 1);
