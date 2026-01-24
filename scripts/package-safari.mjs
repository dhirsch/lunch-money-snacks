import { execFile } from 'child_process';
import { mkdir, readFile, rm } from 'fs/promises';
import path from 'path';
import process from 'process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist', 'safari');
const projectDir = path.join(rootDir, 'dist', 'safari-xcode');
const packageJson = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf-8'));
const versionTag = process.env.RELEASE_TAG || `v${packageJson.version}`;
const outputZip = path.join(rootDir, `lunchmoney-budget-notes-safari-xcode-${versionTag}.zip`);

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      if (stdout) {
        process.stdout.write(stdout);
      }
      if (stderr) {
        process.stderr.write(stderr);
      }
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

await rm(projectDir, { recursive: true, force: true });
await mkdir(projectDir, { recursive: true });

await run('xcrun', [
  'safari-web-extension-converter',
  distDir,
  '--project-location',
  projectDir,
  '--no-open'
]);

await run('zip', ['-r', outputZip, '.'], { cwd: projectDir });

console.log(`Created ${outputZip}`);
