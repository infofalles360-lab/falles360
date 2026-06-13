import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'subscription-preview': path.resolve(__dirname, 'subscription-preview.html'),
        noticias: path.resolve(__dirname, 'noticias.html'),
        noticia: path.resolve(__dirname, 'noticia.html'),
        whitelist: path.resolve(__dirname, 'whitelist.html'),
        'whitelist/index': path.resolve(__dirname, 'whitelist/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify - file watching is disabled to prevent flickering during agent edits.
    hmr: process.env.DISABLE_HMR !== 'true',
  },
}));
