const http = require('http');
const fs = require('fs');
const path = require('path');

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
  '/portal',
]);

function publicEnv() {
  const keys = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID',
  ];
  const values = {};
  for (const key of keys) values[key] = process.env[key] || '';
  return `window.__MOHOBAT_ENV__ = ${JSON.stringify(values)};`;
}

function sendFile(res, file) {
  const data = fs.readFileSync(file);
  const ext = path.extname(file);
  const name = path.basename(file);
  const cache = ext === '.html' || name === 'sw.js' || ext === '.webmanifest'
    ? 'no-cache'
    : 'public, max-age=31536000, immutable';
  res.writeHead(200, {
    'Content-Type': types[ext] || 'application/octet-stream',
    'Cache-Control': cache,
  });
  res.end(data);
}

function sendIndex(res) {
  const file = path.join(root, 'index.html');
  if (!fs.existsSync(file)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Build output is missing. Run npm run build.');
    return;
  }
  sendFile(res, file);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]).replace(/\/+$/, '') || '/';

  if (urlPath === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('ok');
    return;
  }

  if (urlPath === '/env.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(publicEnv());
    return;
  }

  if (APP_PATHS.has(urlPath)) {
    sendIndex(res);
    return;
  }

  const relative = path.normalize(urlPath).replace(/^([/\\])+/, '').replace(/^(\.\.[/\\])+/, '');
  const file = path.join(root, relative);

  if (!file.startsWith(root)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    sendFile(res, file);
    return;
  }

  if (path.extname(urlPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  sendIndex(res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`mohobat-khames listening on ${port}`);
});
