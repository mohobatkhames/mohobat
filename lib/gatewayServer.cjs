const https = require('https');

function blockedHost(hostname) {
  const host = String(hostname || '').replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host === '::1' || host === '0.0.0.0' || host === 'metadata.google.internal') return true;
  const parts = host.split('.').map((item) => Number(item));
  if (parts.length !== 4 || parts.some((item) => Number.isNaN(item))) return false;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function assessTarget(value) {
  let target;
  try {
    target = new URL(String(value || ''));
  } catch {
    return { ok: false, message: 'رابط مزود الخدمة غير صالح.' };
  }
  if (target.protocol !== 'https:') return { ok: false, message: 'رابط المزود يجب أن يبدأ بـ https://' };
  if (target.username || target.password) return { ok: false, message: 'رابط المزود لا يقبل اسم مستخدم داخل الرابط.' };
  if (blockedHost(target.hostname)) return { ok: false, message: 'رابط المزود يجب أن يكون عنواناً خارجياً.' };
  return { ok: true, target };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 20000) {
        reject(new Error('large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function reply(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function forward(target, apiKey, payload) {
  const body = JSON.stringify({
    to: payload.to,
    message: payload.message,
    sender: payload.sender,
    channel: payload.channel,
  });
  return new Promise((resolve, reject) => {
    const request = https.request(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Api-Key': apiKey,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 15000,
    }, (response) => {
      const chunks = [];
      let size = 0;
      response.on('data', (chunk) => {
        size += chunk.length;
        if (size <= 2000) chunks.push(chunk);
      });
      response.on('end', () => {
        resolve({
          status: response.statusCode || 0,
          body: Buffer.concat(chunks).toString('utf8').slice(0, 240),
        });
      });
    });
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('timeout'));
    });
    request.on('error', reject);
    request.end(body);
  });
}

async function handleGatewayRequest(req, res) {
  if (req.method !== 'POST') {
    reply(res, 405, { ok: false, message: 'طريقة الإرسال غير مدعومة.' });
    return;
  }
  const origin = String(req.headers.origin || '');
  const host = String(req.headers.host || '');
  let originHost = '';
  try {
    originHost = origin ? new URL(origin).host : '';
  } catch {
    originHost = '';
  }
  if (!originHost || originHost !== host) {
    reply(res, 403, { ok: false, message: 'الإرسال مسموح من النظام نفسه فقط.' });
    return;
  }
  let input;
  try {
    input = JSON.parse(await readBody(req));
  } catch {
    reply(res, 400, { ok: false, message: 'تعذر قراءة طلب الإرسال.' });
    return;
  }
  const checked = assessTarget(input.apiUrl);
  if (!checked.ok) {
    reply(res, 400, checked);
    return;
  }
  const apiKey = String(input.apiKey || '').trim();
  const sender = String(input.sender || '').trim();
  const message = String(input.message || '').trim();
  const channel = input.channel === 'whatsapp' ? 'whatsapp' : 'sms';
  const to = [...new Set((Array.isArray(input.to) ? input.to : []).map((item) => String(item || '').trim()).filter(Boolean))].slice(0, 300);
  if (!apiKey || !sender || !message || to.length === 0) {
    reply(res, 400, { ok: false, message: 'بيانات المزود أو الرسالة غير مكتملة.' });
    return;
  }
  try {
    const result = await forward(checked.target, apiKey, { to, message, sender, channel });
    if (result.status < 200 || result.status >= 300) {
      reply(res, 502, { ok: false, message: `رفض مزود الخدمة الإرسال (${result.status}).` });
      return;
    }
    reply(res, 200, { ok: true });
  } catch (error) {
    const message = error.message === 'timeout' ? 'انتهت مهلة الاتصال بمزود الخدمة.' : 'تعذر الاتصال بمزود الخدمة.';
    reply(res, 502, { ok: false, message });
  }
}

module.exports = { assessTarget, handleGatewayRequest };
