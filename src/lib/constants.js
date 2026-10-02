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
  { label: 'مدرب', role: 'trainer' },
  { label: 'مدربة', role: 'trainer' },
  { label: 'معلمة', role: 'teacher' },
  { label: 'موظفة', role: 'employee' },
  { label: 'مسؤول نظام', role: 'admin' },
];

export const THEMES = [
  { id: 'navy', label: 'بحري', swatch: '#0b3a66' },
  { id: 'tiffany', label: 'تيفاني', swatch: '#0abab5' },
  { id: 'rose', label: 'وردي', swatch: '#db2777' },
];

export function activeTheme(theme) {
  return THEMES.some((item) => item.id === theme) ? theme : 'navy';
}

export const ROLE_LABELS = {
  owner: 'المالك',
  admin: 'مسؤول نظام',
  director: 'مديرة',
  trainer: 'مدرب / مدربة',
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

export function isTrainer(user) {
  return user?.role === 'trainer' || user?.job === 'مدرب' || user?.job === 'مدربة';
}
