import { execFile } from 'child_process';
import { readFile } from 'fs/promises';
import path from 'path';
import process from 'process';

const target = process.argv[2];

if (!target) {
  console.error('Target is required (chrome|firefox).');
  process.exit(1);
}

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist', target);
const packageJson = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf-8'));
const versionTag = process.env.RELEASE_TAG || `v${packageJson.version}`;
const outputZip = path.join(rootDir, `lunchmoney-budget-notes-${target}-${versionTag}.zip`);

execFile('zip', ['-r', outputZip, '.'], { cwd: distDir }, (error, stdout, stderr) => {
  if (stdout) {
    process.stdout.write(stdout);
  }
  if (stderr) {
    process.stderr.write(stderr);
  }
  if (error) {
    console.error('Zip packaging failed.', error);
    process.exit(1);
  }
  console.log(`Created ${outputZip}`);
});
