const fs = require('fs');

function requestOrigin(req) {
  const forwarded = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwarded || 'http';
  const host = req.headers.host || 'localhost';
  return `${proto}://${host}`;
}

function manifestForOrigin(origin, file) {
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  manifest.related_applications = [{ platform: 'webapp', url: `${origin}/manifest.webmanifest` }];
  manifest.prefer_related_applications = false;
  return JSON.stringify(manifest);
}

module.exports = { manifestForOrigin, requestOrigin };
