/// <reference types="vitest/config" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * Local proxy: with VITE_API_URL=/api the app POSTs to its own origin and the dev or
 * preview server forwards /api to the backend Lambda running in Docker under the Lambda
 * runtime interface emulator (it answers with the same envelope API Gateway sends).
 * Override the target with API_PROXY_TARGET, e.g. http://localhost:8787 for the mock API.
 */
const LAMBDA_INVOKE_URL = 'http://localhost:9000/2015-03-31/functions/function/invocations';
const target = new URL(process.env.API_PROXY_TARGET || LAMBDA_INVOKE_URL);
const targetPath = target.pathname === '/' ? '' : target.pathname;

const apiProxy: Record<string, ProxyOptions> = {
  '/api': {
    target: target.origin,
    changeOrigin: true,
    // POST /api goes to the invoke path itself.
    rewrite: () => targetPath || '/',
  },
};

export default defineConfig({
  // Served from the root of the CloudFront distribution (S3 origin).
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(root, 'src') },
  },
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Name the lazily loaded chart libraries' chunks after the libraries.
        manualChunks(id) {
          if (/node_modules\/(lightweight-charts|fancy-canvas)\//.test(id)) return 'lightweight-charts';
          if (/node_modules\/(recharts|d3-[a-z-]+|victory-vendor|@reduxjs|redux|redux-thunk|react-redux|immer|reselect|es-toolkit|decimal\.js-light|eventemitter3|internmap|tiny-invariant|use-sync-external-store)\//.test(id)) {
            return 'recharts';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
