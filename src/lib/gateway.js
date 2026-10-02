export function emptyGateway() {
  return {
    enabled: false,
    apiUrl: '',
    apiKey: '',
    senderId: '',
    sms: true,
    whatsapp: true,
  };
}

export function normalizeGateway(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    enabled: Boolean(source.enabled),
    apiUrl: String(source.apiUrl || '').trim(),
    apiKey: String(source.apiKey || '').trim(),
    senderId: String(source.senderId || '').trim(),
    sms: source.sms !== false,
    whatsapp: source.whatsapp !== false,
  };
}

export function gatewayActive(settings, channel) {
  const gateway = normalizeGateway(settings?.gateway);
  if (!gateway.enabled || !gateway.apiUrl || !gateway.apiKey || !gateway.senderId) return false;
  if (channel === 'sms') return gateway.sms;
  if (channel === 'whatsapp') return gateway.whatsapp;
  return false;
}

export function cloudSettings(settings) {
  const gateway = normalizeGateway(settings?.gateway);
  const { defaultPassword, gateway: _gateway, ...general } = settings || {};
  return {
    general,
    security: {
      defaultPassword,
      gateway,
      updatedAt: settings?.updatedAt,
    },
  };
}

export async function sendViaGateway({ settings, channel, to, message }) {
  if (!gatewayActive(settings, channel)) return { ok: false, mode: 'device', message: '' };
  const gateway = normalizeGateway(settings.gateway);
  const recipients = [...new Set((Array.isArray(to) ? to : [to]).map((item) => String(item || '').trim()).filter(Boolean))];
  if (recipients.length === 0) return { ok: false, mode: 'gateway', message: 'لا توجد أرقام للإرسال.' };
  if (recipients.length > 300) {
    return { ok: false, mode: 'gateway', message: 'عدد المستلمين أكبر من 300 في الدفعة الواحدة. قلّلي الفئة ثم أعيدي الإرسال.' };
  }
  try {
    const response = await fetch('/api/gateway', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiUrl: gateway.apiUrl,
        apiKey: gateway.apiKey,
        sender: gateway.senderId,
        to: recipients,
        message,
        channel,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      return { ok: false, mode: 'gateway', message: payload.message || 'تعذر الإرسال عبر مزود الخدمة.' };
    }
    return { ok: true, mode: 'gateway', message: 'أُرسلت الرسالة عبر مزود الخدمة المفعّل.' };
  } catch {
    return { ok: false, mode: 'gateway', message: 'تعذر الاتصال بمزود الخدمة.' };
  }
}
