import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const root = path.dirname(fileURLToPath(import.meta.url));

/** GitHub Pages: VITE_BASE=/sortMySources/ */
const rawBase = process.env.VITE_BASE?.trim();
const base =
  !rawBase || rawBase === '/'
    ? '/'
    : rawBase.endsWith('/')
      ? rawBase
      : `${rawBase}/`;

export default defineConfig({
  root,
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SortMySources',
        short_name: 'SortMySources',
        description: 'Organize sources into maps. Local-first.',
        theme_color: '#4f46e5',
        background_color: '#fafafa',
        display: 'standalone',
        start_url: `${base === '/' ? './' : base}`,
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  resolve: {
    alias: {
      '@sortmysources/core': path.resolve(root, '../../packages/core/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
