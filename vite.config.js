import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export default defineConfig(async ({ command }) => {
  const plugins = [react()];
  if (command === 'serve') {
    const hooks = await import(pathToFileURL(path.resolve('lib/viteDevHooks.mjs')).href);
    plugins.push(hooks.gatewayPlugin());
  }
  return {
    plugins,
    envPrefix: ['VITE_', 'REACT_APP_'],
    appType: 'spa',
    server: { port: 5173, host: '127.0.0.1' },
    preview: { port: 4173, host: '127.0.0.1' },
    build: { outDir: 'dist', sourcemap: false },
  };
});
