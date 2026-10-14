const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function toEnglishDigits(value) {
  return String(value ?? '')
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)));
}

export function normalizeId(value) {
  return toEnglishDigits(value).replace(/\D/g, '').slice(0, 10);
}

const NAME_PARTS = new Set([
  'محمد', 'احمد', 'أحمد', 'علي', 'سعيد', 'خالد', 'سعد', 'فهد', 'ناصر', 'بدر', 'عمر',
  'حسن', 'حسين', 'يوسف', 'ابراهيم', 'إبراهيم', 'عبدالله', 'عبدالعزيز', 'عبدالرحمن',
]);

function splitJoinedToken(token) {
  if (!token || token.length < 5) return token;
  if (token.startsWith('عبد')) {
    const again = token.indexOf('عبد', 3);
    if (again > 0) return `${splitJoinedToken(token.slice(0, again))} ${splitJoinedToken(token.slice(again))}`;
    return token;
  }
  const kunya = token.match(/^(أبو|ابو|أبي|ابي)(.+)$/);
  if (kunya && kunya[2].length >= 2) return `${kunya[1]} ${splitJoinedToken(kunya[2])}`;
  if (!token.startsWith('ال')) {
    if (token.endsWith('بنت') && token.length > 5) return `${splitJoinedToken(token.slice(0, -3))} بنت`;
    if (token.endsWith('ابن') && token.length > 5) return `${splitJoinedToken(token.slice(0, -3))} ابن`;
    if (token.endsWith('بن') && token.length > 4) return `${splitJoinedToken(token.slice(0, -2))} بن`;
  }
  if (token.startsWith('محمد') && token.length >= 7) return `محمد ${splitJoinedToken(token.slice(4))}`;
  if (token.startsWith('السيدال')) return `السيد ${splitJoinedToken(token.slice(5))}`;
  const alAt = token.indexOf('ال');
  if (alAt > 0) {
    const left = token.slice(0, alAt);
    if (NAME_PARTS.has(left) || left === 'سيد' || left === 'محيميد') {
      return `${left} ${splitJoinedToken(token.slice(alAt))}`;
    }
  }
  for (const head of [...NAME_PARTS].sort((a, b) => b.length - a.length)) {
    if (token.startsWith(head) && token.length > head.length) {
      const rest = token.slice(head.length);
      if (NAME_PARTS.has(rest)) return `${head} ${rest}`;
    }
  }
  return token;
}

export function separateJoinedName(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(splitJoinedToken)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function uid(prefix) {
  const rand = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return prefix ? `${prefix}-${rand}` : rand;
}

export function tempPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}
