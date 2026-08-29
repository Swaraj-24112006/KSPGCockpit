import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 5173,
      host: true,
      allowedHosts: true as const,
      proxy: {
        // Proxy Django REST API & media endpoints
        '/api/v1': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
          // Rewrite cookie domain so Set-Cookie reaches the browser correctly
          cookieDomainRewrite: 'localhost',
        },
        '/media': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
        // Proxy MinIO S3 object storage
        '/kaizenimages': {
          target: 'http://127.0.0.1:9000',
          changeOrigin: true,
          secure: false,
        },
        // Proxy local Express mock routes (redflags, fivesaudits, etc.)
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
