import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const flociProxyTarget = process.env.FLOCI_PROXY_TARGET ?? 'http://localhost:4566';
  const sidecarProxyTarget = process.env.SIDECAR_PROXY_TARGET ?? 'http://localhost:4317';
  const sidecarToken = process.env.SIDECAR_TOKEN ?? '';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR can be disabled via DISABLE_HMR. Keeps the agent edits from flickering.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        // The UI uses this prefix to avoid CORS; Vite forwards to the emulator.
        '/aws': {
          target: flociProxyTarget,
          changeOrigin: false,
          ws: true,
          rewrite: (requestPath) => requestPath.replace(/^\/aws(?=\/|$)/, '') || '/',
        },
        '/sidecar': {
          target: sidecarProxyTarget,
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/sidecar(?=\/|$)/, '') || '/',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyRequest) => {
              if (sidecarToken) {
                proxyRequest.setHeader('x-floci-sidecar-token', sidecarToken);
              }
            });
          },
        },
      },
    },
  };
});
