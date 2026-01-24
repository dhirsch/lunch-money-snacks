import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import process from 'process';

const target = process.env.TARGET;

if (!target) {
  console.error('TARGET is required (chrome|firefox|safari).');
  process.exit(1);
}

const rootDir = process.cwd();
const basePath = path.join(rootDir, 'public', 'manifest.json');
const patchPath = path.join(rootDir, 'public', `manifest.patch.${target}.json`);
const outputPath = path.join(rootDir, 'public', 'manifest.generated.json');

const readJson = async (filePath) => {
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
};

const mergeObjects = (base, patch) => {
  const result = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof base?.[key] === 'object' &&
      !Array.isArray(base?.[key])
    ) {
      result[key] = mergeObjects(base[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
};

const [baseManifest, patchManifest] = await Promise.all([
  readJson(basePath),
  readJson(patchPath)
]);

const merged = mergeObjects(baseManifest, patchManifest);

await writeFile(outputPath, `${JSON.stringify(merged, null, 2)}\n`);
console.log(`Generated manifest for ${target} at ${outputPath}`);
