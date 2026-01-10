import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './public/manifest.json';
import { copyFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    {
      name: 'copy-css',
      writeBundle() {
        const srcCss = resolve(__dirname, 'src/content/styles.css');
        const destDir = resolve(__dirname, 'dist/src/content');
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
