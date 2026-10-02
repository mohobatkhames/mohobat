import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { handleGatewayRequest } = require('./gatewayServer.cjs');
const { manifestForOrigin, requestOrigin } = require('./manifest.cjs');

export function gatewayPlugin() {
  return {
    name: 'mohobat-gateway',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url || '').split('?')[0];
        if (pathname === '/manifest.webmanifest') {
          const file = path.resolve('public/manifest.webmanifest');
          res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(manifestForOrigin(requestOrigin(req), file));
          return;
        }
        if (pathname !== '/api/gateway') {
          next();
          return;
        }
        handleGatewayRequest(req, res);
      });
    },
  };
}
