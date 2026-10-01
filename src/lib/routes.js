export const APP_ROUTES = [
  { path: '/', page: 'dashboard' },
  { path: '/dashboard', page: 'dashboard' },
  { path: '/students', page: 'students' },
  { path: '/staff', page: 'staff' },
  { path: '/attendance', page: 'attendance' },
  { path: '/courses', page: 'courses' },
  { path: '/messages', page: 'messages' },
  { path: '/reports', page: 'reports' },
  { path: '/certificates', page: 'certificates' },
  { path: '/settings', page: 'settings' },
  { path: '/portal', page: 'portal' },
];

export function normalizePath(pathname) {
  const path = String(pathname || '/').split('?')[0].replace(/\/+$/, '');
  return path || '/';
}

export function pageFromPath(pathname) {
  const path = normalizePath(pathname);
  return APP_ROUTES.find((route) => route.path === path)?.page || 'dashboard';
}

export function pathFromPage(page) {
  if (page === 'dashboard') return '/dashboard';
  if (page === 'certificates') return '/certificates';
  if (page === 'portal') return '/portal';
  const match = APP_ROUTES.find((route) => route.page === page);
  return match?.path || '/dashboard';
}

export function navigate(path) {
  const next = normalizePath(path);
  if (normalizePath(window.location.pathname) !== next) {
    window.history.pushState({}, '', next);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}
