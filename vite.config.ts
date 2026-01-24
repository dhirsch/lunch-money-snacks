import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

const target = process.env.TARGET || 'chrome';

const generatedManifestPath = resolve(__dirname, 'public', 'manifest.generated.json');
const baseManifestPath = resolve(__dirname, 'public', 'manifest.json');
const manifestPath = existsSync(generatedManifestPath)
  ? generatedManifestPath
  : baseManifestPath;
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    {
      name: 'copy-css',
      writeBundle() {
        const srcCss = resolve(__dirname, 'src/content/styles.css');
        const destDir = resolve(__dirname, `dist/${target}/src/content`);
        const destCss = resolve(destDir, 'styles.css');

        try {
          mkdirSync(destDir, { recursive: true });
          copyFileSync(srcCss, destCss);
          console.log('Copied styles.css to dist');
        } catch (error) {
          console.error('Failed to copy styles.css:', error);
        }
      },
    },
  ],
  build: {
    outDir: `dist/${target}`,
    rollupOptions: {
      input: {
        settings: 'settings.html',
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
