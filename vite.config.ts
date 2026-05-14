import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(rootDir, 'react-src'),
  base: './',
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: resolve(rootDir, 'apps/react'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        backend: resolve(rootDir, 'react-src/backend.html'),
        offline: resolve(rootDir, 'react-src/offline.html'),
        offlineModeRenderer: resolve(rootDir, 'react-src/offline-mode-renderer.tsx'),
        shellAppHost: resolve(rootDir, 'react-src/shell-app-host.tsx')
      },
      output: {
        entryFileNames(chunkInfo) {
          if (chunkInfo.name === 'offlineModeRenderer') return 'assets/offline-mode-renderer.js';
          if (chunkInfo.name === 'shellAppHost') return 'assets/shell-app-host.js';
          return 'assets/[name]-[hash].js';
        }
      }
    }
  }
});
