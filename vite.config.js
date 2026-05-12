import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync } from 'fs';

function copyLibarchivePlugin() {
  return {
    name: 'copy-libarchive',
    buildStart() {
      mkdirSync('public/libarchive', { recursive: true });
      const src = 'node_modules/libarchive.js/dist';
      copyFileSync(`${src}/worker-bundle.js`, 'public/libarchive/worker-bundle.js');
      copyFileSync(`${src}/libarchive.wasm`,  'public/libarchive/libarchive.wasm');
    },
  };
}

export default defineConfig({
  plugins: [react(), copyLibarchivePlugin()],
  base: '/content-compare/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          parsers: ['jszip', 'xlsx', 'fast-xml-parser'],
          charts: ['chart.js', 'react-chartjs-2'],
        },
      },
    },
  },
});
