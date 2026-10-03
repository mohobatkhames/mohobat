import { readProjectSetup } from '../firebase';

export const DEPARTMENT_NAME = 'قسم الموهوبين';

export function ownerIdentity() {
  const setup = readProjectSetup() || {};
  return {
    nationalId: String(setup.ownerId || ''),
    password: String(setup.ownerPassword || ''),
    name: String(setup.ownerName || 'المالك').trim() || 'المالك',
  };
}

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
  { label: 'مسؤولة نظام', role: 'admin' },
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
  admin: 'مسؤولة نظام',
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
  if (job === 'مسؤولة نظام' || job === 'مسؤول نظام') return 'admin';
  return JOBS.find((item) => item.label === job)?.role || 'employee';
}

export function feminineJob(job) {
  return job === 'مسؤول نظام' ? 'مسؤولة نظام' : job;
}

export function isTrainer(user) {
  return user?.role === 'trainer' || user?.job === 'مدرب' || user?.job === 'مدربة';
}
