import { useEffect, useState } from 'react';
import { THEMES, ROLE_LABELS } from '../lib/constants';
import { formatTime } from '../lib/dates';
import { navigate, pageFromPath, pathFromPage } from '../lib/routes';
import { useStore } from '../context/Store';
import Attendance from './Attendance';
import CoursesAndMessages from './CoursesAndMessages';
import Dashboard from './Dashboard';
import ReportsAndCertificates from './ReportsAndCertificates';
import SettingsPanel from './SettingsPanel';
import Staff from './Staff';
import Students from './Students';
import InstallApp from './InstallApp';
import { Banner, Field, Modal, PasswordField } from './ui';

const PAGES = [
  ['dashboard', 'الرئيسية', Dashboard],
  ['students', 'الطالبات', Students],
  ['staff', 'الموظفات', Staff, true],
  ['attendance', 'الحضور', Attendance],
  ['courses', 'البرامج', () => <CoursesAndMessages initialTab="courses" />],
  ['messages', 'الرسائل', () => <CoursesAndMessages initialTab="messages" />],
  ['reports', 'التقارير والشهادات', ReportsAndCertificates],
  ['settings', 'الإعدادات', SettingsPanel, true],
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

  const visible = PAGES.filter((item) => !item[3] || store.canManage);
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
    <div className="bg-app min-h-screen lg:grid lg:grid-cols-[280px_1fr]" dir="rtl">
      <aside className={`no-print card z-30 m-3 p-4 lg:m-4 ${open ? 'block' : 'hidden lg:block'}`}>
        <div className="mb-6 px-2">
          <p className="text-xs font-bold text-[var(--accent)]">نظام موهوبات</p>
          <h1 className="text-2xl font-extrabold">{store.data.settings.centerName}</h1>
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

      <div className="min-w-0">
        <header className="no-print flex flex-wrap items-center gap-3 px-4 py-4">
          <div className="flex min-w-0 w-full items-center gap-3 lg:w-auto lg:flex-1">
            <button className="btn-ghost shrink-0 lg:hidden" type="button" onClick={() => setOpen((value) => !value)}>القائمة</button>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-6 text-mute">{store.data.settings.administrationName}</p>
              <p className="break-words font-extrabold leading-7">{store.session.name} · {ROLE_LABELS[store.session.role]}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                title={theme.label}
                aria-label={theme.label}
                onClick={() => store.setTheme(theme.id)}
                className="h-7 w-7 rounded-full border-2 border-white shadow"
                style={{ background: theme.id === 'rose' ? '#e11d48' : theme.id === 'lilac' ? '#6d5efc' : theme.id === 'blossom' ? '#f472b6' : theme.id === 'dusk' ? '#6b21a8' : '#7c3aed', outline: store.data.theme === theme.id ? '2px solid var(--text)' : 'none' }}
              />
            ))}
            <InstallApp compact />
            <button className="btn-soft" type="button" onClick={() => setAccount(true)}>حسابي</button>
            <button className="btn-ghost" type="button" onClick={store.logout}>خروج</button>
          </div>
        </header>
        <div className="no-print px-4">
          <Banner tone={store.cloud.mode === 'error' ? 'bad' : 'ok'}>
            {store.cloud.message}
            {store.savedAt ? <span className="mx-1 inline-block whitespace-nowrap">آخر حفظ محلي {formatTime(store.savedAt)}</span> : null}
          </Banner>
        </div>
        <main className="px-4 py-4">
          <Active />
        </main>
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
          </div>
        </Modal>
      )}
    </div>
  );
}
