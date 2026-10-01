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
  return new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(asDate(value));
}

export function formatHijri(value) {
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(asDate(value));
}

export function weekdayName(value) {
  return new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(asDate(value));
}

export function formatTime(value) {
  return new Intl.DateTimeFormat('ar-SA', { hour: 'numeric', minute: '2-digit' }).format(asDate(value));
}

export function nowIso() {
  return new Date().toISOString();
}
