const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleGatewayRequest } = require('./lib/gatewayServer.cjs');
const { manifestForOrigin, requestOrigin } = require('./lib/manifest.cjs');

const port = Number(process.env.PORT) || 4173;
const root = path.join(__dirname, 'dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const APP_PATHS = new Set([
  '/',
  '/dashboard',
  '/students',
  '/staff',
  '/attendance',
  '/courses',
  '/messages',
  '/reports',
  '/certificates',
  '/settings',
  '/support',
  '/portal',
]);

function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'X-DNS-Prefetch-Control': 'off',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebasestorage.app wss://*.firebaseio.com",
      "manifest-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join('; '),
  };
}

function sendText(res, status, type, body) {
  res.writeHead(status, {
    ...securityHeaders(),
    'Content-Type': type,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}
function publicEnv() {
  return 'window.__MOHOBAT_ENV__ = {};';
}

function sendFile(res, file) {
  const data = fs.readFileSync(file);
  const ext = path.extname(file);
  const name = path.basename(file);
  const cache = ext === '.html' || name === 'sw.js' || ext === '.webmanifest'
    ? 'no-cache'
    : 'public, max-age=31536000, immutable';
  res.writeHead(200, {
    ...securityHeaders(),
    'Content-Type': types[ext] || 'application/octet-stream',
    'Cache-Control': cache,
  });
  res.end(data);
}

function sendIndex(res) {
  const file = path.join(root, 'index.html');
  if (!fs.existsSync(file)) {
    res.writeHead(503, { ...securityHeaders(), 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Build output is missing. Run npm run build.');
    return;
  }
  sendFile(res, file);
}

const server = http.createServer((req, res) => {
  const decoded = decodeURIComponent((req.url || '/').split('?')[0]);
  const urlPath = decoded.replace(/\/+$/, '') || '/';
  if (decoded.includes('\0') || decoded.split(/[/\\]/).includes('..')) {
    sendText(res, 403, 'text/plain; charset=utf-8', 'Forbidden');
    return;
  }

  if (urlPath === '/api/gateway') {
    handleGatewayRequest(req, res);
    return;
  }

  if (urlPath === '/manifest.webmanifest') {
    const manifestFile = path.join(root, 'manifest.webmanifest');
    if (!fs.existsSync(manifestFile)) {
      res.writeHead(404, { ...securityHeaders(), 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      ...securityHeaders(),
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    res.end(manifestForOrigin(requestOrigin(req), manifestFile));
    return;
  }

  if (urlPath === '/healthz') {
    sendText(res, 200, 'text/plain; charset=utf-8', 'ok');
    return;
  }

  if (urlPath === '/env.js') {
    sendText(res, 200, 'text/javascript; charset=utf-8', publicEnv());
    return;
  }

  if (APP_PATHS.has(urlPath)) {
    sendIndex(res);
    return;
  }

  const relative = path.normalize(decoded).replace(/^([/\\])+/, '');
  const file = path.resolve(root, relative);
  const rootResolved = path.resolve(root);
  const blockedName = path.basename(file).startsWith('.') || ['.map', '.env'].includes(path.extname(file));
  if (blockedName || (file !== rootResolved && !file.startsWith(rootResolved + path.sep))) {
    sendText(res, 403, 'text/plain; charset=utf-8', 'Forbidden');
    return;
  }

  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    sendFile(res, file);
    return;
  }

  if (path.extname(urlPath)) {
    sendText(res, 404, 'text/plain; charset=utf-8', 'Not found');
    return;
  }

  sendIndex(res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`mohobat-khames listening on ${port}`);
});
