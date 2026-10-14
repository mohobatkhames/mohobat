import { useEffect, useState } from 'react';
import { DEPARTMENT_NAME, ROLE_LABELS } from '../lib/constants';
import { activeProjectId } from '../firebase';
import { formatBothDateTime } from '../lib/dates';
import { navigate, pageFromPath, pathFromPage } from '../lib/routes';
import { useStore } from '../context/Store';
import Attendance from './Attendance';
import CoursesAndMessages from './CoursesAndMessages';
import Dashboard from './Dashboard';
import OwnerSupport from './OwnerSupport';
import ReportsAndCertificates from './ReportsAndCertificates';
import SettingsPanel from './SettingsPanel';
import Staff from './Staff';
import Students from './Students';
import DirectorSignature from './DirectorSignature';
import ThemeSwitch from './ThemeSwitch';
import TrainerSignature from './TrainerSignature';
import InstallApp from './InstallApp';
import { Banner, Field, Modal, PasswordField } from './ui';

function CoursesPage() {
  return <CoursesAndMessages initialTab="courses" />;
}

function MessagesPage() {
  return <CoursesAndMessages initialTab="messages" />;
}

const PAGES = [
  ['dashboard', 'الرئيسية', Dashboard],
  ['students', 'الطالبات', Students],
  ['staff', 'الموظفات', Staff, true],
  ['attendance', 'الحضور', Attendance],
  ['courses', 'البرامج', CoursesPage],
  ['messages', 'الرسائل', MessagesPage],
  ['reports', 'التقارير والشهادات', ReportsAndCertificates],
  ['settings', 'الإعدادات', SettingsPanel, true],
  ['support', 'الدعم الفني', OwnerSupport, 'owner'],
];

export default function Layout() {
  const store = useStore();
  const [page, setPage] = useState(() => pageFromPath(window.location.pathname));
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(false);
  const [notice, setNotice] = useState('');
  const [passwords, setPasswords] = useState({ current: '', next: '' });
  useEffect(() => {
    const sync = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const visible = PAGES.filter((item) => {
    if (store.session?.role === 'trainer') return item[0] === 'dashboard';
    if (item[3] === 'owner') return store.session?.role === 'owner';
    return !item[3] || store.canManage;
  });
  const view = page === 'certificates' ? 'reports' : page;
  const Active = visible.find((item) => item[0] === view)?.[2] || Dashboard;

  const savePassword = (event) => {
    event.preventDefault();
    const result = store.changePassword(passwords.current, passwords.next);
    setNotice(result.message);
    if (result.ok) setPasswords({ current: '', next: '' });
  };

  const fingerprint = async () => {
    const result = await store.registerFingerprint();
    setNotice(result.message);
  };

  return (
    <div className="app-shell bg-app" dir="rtl">
      <header className="topbar no-print">
        <div className="topbar-brand">
          <button className="btn-ghost shrink-0 lg:hidden" type="button" onClick={() => setOpen((value) => !value)}>{open ? 'إغلاق' : 'القائمة'}</button>
          <div className="min-w-0">
            <p className="truncate text-sm leading-6 text-mute">{store.data.settings.administrationName}</p>
            <p className="break-words font-extrabold leading-7">{store.session.name} · {store.session.role === 'trainer' ? (store.session.job || ROLE_LABELS.trainer) : ROLE_LABELS[store.session.role]}</p>
          </div>
        </div>
        <div className="topbar-tools">
          <div className="topbar-group" aria-label="المظهر">
            <ThemeSwitch />
          </div>
          <div className="topbar-group" aria-label="الحساب">
            {store.session?.role === 'owner' && (
              <button className="btn-primary" type="button" onClick={() => navigate('/support')}>تعديل وحفظ</button>
            )}
            <InstallApp compact />
            <button className="btn-soft" type="button" onClick={() => setAccount(true)}>حسابي</button>
            <button className="btn-ghost" type="button" onClick={store.logout}>خروج</button>
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside className={`sidebar no-print card ${open ? 'open' : ''}`}>
          <div className="mb-6 px-2">
            <p className="text-xs font-bold text-[var(--accent)]">نظام موهوبات</p>
            <h1 className="break-words text-2xl font-extrabold leading-snug">{store.data.settings.centerName}</h1>
            <p className="mt-1 text-xs leading-6 text-mute">{store.data.settings.departmentName || DEPARTMENT_NAME}</p>
            <p className="mt-1 text-xs text-mute" dir="ltr">{activeProjectId()}</p>
          </div>
          <nav className="space-y-1">
            {visible.map(([id, label]) => (
              <a
                key={id}
                href={pathFromPage(id)}
                className={`block w-full rounded-2xl px-4 py-3 text-right font-bold ${page === id || (id === 'reports' && page === 'certificates') ? 'btn-primary' : 'hover:bg-[var(--soft)]'}`}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(pathFromPage(id));
                  setOpen(false);
                }}
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="app-content">
          <div className="no-print px-3 sm:px-4">
            <Banner tone={store.cloud.mode === 'error' ? 'bad' : 'ok'}>
              {store.cloud.message}
              {store.cloud.mode === 'synced' && store.savedAt ? <span className="mx-1 inline whitespace-normal">آخر مزامنة {formatBothDateTime(store.savedAt)}</span> : null}
            </Banner>
          </div>
          <main className="app-main">
            <Active />
          </main>
        </div>
      </div>

      {account && (
        <Modal title="الحساب والأمان" onClose={() => setAccount(false)}>
          <div className="space-y-4">
            {notice && <Banner>{notice}</Banner>}
            <form className="grid gap-3 md:grid-cols-2" onSubmit={savePassword}>
              <Field label="كلمة المرور الحالية">
                <PasswordField autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} />
              </Field>
              <Field label="كلمة المرور الجديدة">
                <PasswordField autoComplete="new-password" value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} />
              </Field>
              <button className="btn-primary md:col-span-2" type="submit">تغيير كلمة المرور</button>
            </form>
            <button className="btn-soft w-full" type="button" onClick={fingerprint}>تسجيل الدخول بالبصمة على هذا الجهاز</button>
            {store.session?.role === 'director' && <DirectorSignature />}
            {store.session?.role === 'trainer' && <TrainerSignature />}
          </div>
        </Modal>
      )}
    </div>
  );
}
