export function todayISO() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function asDate(value) {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const text = String(value);
  return new Date(text.includes('T') ? text : `${text}T00:00:00`);
}

export function formatGregorian(value) {
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(asDate(value));
}

export function formatHijri(value) {
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(asDate(value));
}

export function formatBoth(value) {
  if (!value) return '—';
  const date = asDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${formatHijri(date)} · ${formatGregorian(date)} م`;
}

export function weekdayName(value) {
  return new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(asDate(value));
}

export function formatTime(value) {
  return new Intl.DateTimeFormat('ar-SA', { hour: 'numeric', minute: '2-digit' }).format(asDate(value));
}

export function formatBothDateTime(value) {
  if (!value) return '—';
  return `${formatBoth(value)} · ${formatTime(value)}`;
}

export function nowIso() {
  return new Date().toISOString();
}
