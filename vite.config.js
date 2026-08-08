import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // GitHub Pages serves this project from /FormSahay/, not the domain root.
  base: '/FormSahay/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'index.html'),
        eligibility: resolve(projectRoot, 'eligibility.html'),
      },
    },
  },
});
