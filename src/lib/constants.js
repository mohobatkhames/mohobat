const env = import.meta.env ?? {};
export const OWNER_ID = env.REACT_APP_OWNER_ID || '1025774389';
export const OWNER_PASSWORD = env.REACT_APP_OWNER_PASSWORD || 'Aa9834775201';

export const GRADES = [
  'الرابع الابتدائي',
  'الخامس الابتدائي',
  'السادس الابتدائي',
  'الأول المتوسط',
  'الثاني المتوسط',
  'الثالث المتوسط',
  'الأول الثانوي',
  'الثاني الثانوي',
  'الثالث الثانوي',
];

export const JOBS = [
  { label: 'مديرة', role: 'director' },
  { label: 'معلمة', role: 'teacher' },
  { label: 'موظفة', role: 'employee' },
  { label: 'مسؤول نظام', role: 'admin' },
];

export const THEMES = [
  { id: 'orchid', label: 'بنفسجي هادئ' },
  { id: 'rose', label: 'وردي' },
  { id: 'lilac', label: 'ليلكي' },
  { id: 'blossom', label: 'زهري فاتح' },
  { id: 'dusk', label: 'بنفسجي ملكي' },
];

export const ROLE_LABELS = {
  owner: 'المالك',
  admin: 'مسؤول نظام',
  director: 'مديرة',
  teacher: 'معلمة',
  employee: 'موظفة',
  student: 'طالبة',
};

export function isManager(role) {
  return role === 'owner' || role === 'admin' || role === 'director';
}

export function jobRole(job) {
  return JOBS.find((item) => item.label === job)?.role || 'employee';
}
