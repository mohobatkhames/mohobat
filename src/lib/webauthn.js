const KEY = 'mohobat-webauthn';

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function fingerprintSupported() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials;
}

export function savedFingerprint() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

export async function registerFingerprint(nationalId, name) {
  if (!fingerprintSupported()) throw new Error('هذا الجهاز لا يدعم الدخول بالبصمة.');
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'نظام موهوبات' },
      user: {
        id: new TextEncoder().encode(nationalId),
        name: nationalId,
        displayName: name || nationalId,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60000,
      attestation: 'none',
    },
  });
  localStorage.setItem(KEY, JSON.stringify({
    credentialId: bytesToBase64(credential.rawId),
    nationalId,
    name,
  }));
}

export async function loginWithDeviceFingerprint() {
  const saved = savedFingerprint();
  if (!saved?.credentialId) throw new Error('لم تُسجَّل بصمة على هذا الجهاز بعد. ادخل بكلمة المرور ثم سجّل البصمة من القائمة.');
  await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: base64ToBytes(saved.credentialId) }],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  return saved;
}
