import { useState } from 'react';
import { useStore } from '../context/Store';
import { fingerprintSupported, savedFingerprint } from '../lib/webauthn';
import InstallApp from './InstallApp';
import { Banner, PasswordField } from './ui';

export default function Login() {
  const { loginStaff, loginStudent, loginWithFingerprint, recoverPassword, data } = useStore();
  const [tab, setTab] = useState('admin');
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [recover, setRecover] = useState(false);
  const [email, setEmail] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');
    if (!nationalId.trim()) {
      setError('يرجى إدخال السجل المدني.');
      return;
    }
    setBusy(true);
    const result = tab === 'admin'
      ? await loginStaff(nationalId, password)
      : await loginStudent(nationalId);
    setBusy(false);
    if (!result.ok) setError(result.message);
  };

  const fingerprint = async () => {
    setError('');
    setInfo('');
    if (!fingerprintSupported()) {
      setError('هذا المتصفح لا يدعم المصادقة بالبصمة.');
      return;
    }
    setBusy(true);
    const result = await loginWithFingerprint();
    setBusy(false);
    if (!result.ok) setError(result.message);
  };

  const recoverSubmit = (event) => {
    event.preventDefault();
    const result = recoverPassword(nationalId, email);
    if (!result.ok) {
      setError(result.message);
      setInfo('');
      return;
    }
    setError('');
    setInfo(`تم التحقق من البريد ${result.email}. كلمة المرور المؤقتة: ${result.password}. حُفظت في سجل الرسائل لأن الإرسال الفعلي يحتاج مزود بريد.`);
    setRecover(false);
    setTab('admin');
  };

  return (
    <div className="login-screen bg-app" dir="rtl">
      <div className="card login-card">
        <div className="mb-5 text-center">
          <h1 className="text-xl font-extrabold leading-snug sm:text-2xl">نظام موهوبات الإلكتروني</h1>
          <p className="mt-1 text-sm leading-6 text-mute">{data.settings.administrationName}</p>
          <p className="text-sm leading-6 text-mute">{data.settings.centerName}</p>
        </div>

        <div className="login-tabs">
          <button type="button" className={tab === 'admin' ? 'btn-primary' : 'btn-ghost'} onClick={() => { setTab('admin'); setRecover(false); }}>
            منسوبات المركز
          </button>
          <button type="button" className={tab === 'student' ? 'btn-primary' : 'btn-ghost'} onClick={() => { setTab('student'); setRecover(false); }}>
            دخول الموهوبات
          </button>
        </div>

        <form className="space-y-4" onSubmit={recover ? recoverSubmit : submit}>
          <label className="block">
            <span className="label">{tab === 'student' ? 'السجل المدني للطالبة' : 'السجل المدني'}</span>
            <input className="field" dir="ltr" inputMode="numeric" required value={nationalId} onChange={(event) => setNationalId(event.target.value)} placeholder="أدخلي السجل المدني" />
          </label>

          {tab === 'admin' && !recover && (
            <label className="block">
              <span className="label">كلمة المرور</span>
              <PasswordField required value={password} onChange={(event) => setPassword(event.target.value)} />
              <button type="button" className="mt-2 text-sm font-bold text-[var(--primary)]" onClick={() => { setRecover(true); setError(''); }}>
                استعادة كلمة المرور عبر البريد؟
              </button>
            </label>
          )}

          {recover && (
            <label className="block">
              <span className="label">البريد الإلكتروني المسجل</span>
              <input className="field" dir="ltr" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
          )}

          {error && <Banner tone="bad">{error}</Banner>}
          {info && <Banner>{info}</Banner>}

          <button className="btn-primary w-full" disabled={busy} type="submit">
            {busy ? 'جاري التحقق...' : recover ? 'إرسال استعادة كلمة المرور' : 'تسجيل الدخول للنظام'}
          </button>
        </form>

        {tab === 'admin' && (
          <button className="btn-soft mt-4 w-full whitespace-normal leading-7" type="button" onClick={fingerprint} disabled={busy}>
            الدخول السريع بالبصمة {savedFingerprint() ? '' : '(بعد تسجيلها من داخل النظام)'}
          </button>
        )}

        {recover && (
          <button className="btn-ghost mt-3 w-full" type="button" onClick={() => setRecover(false)}>العودة لتسجيل الدخول</button>
        )}

        <InstallApp />
        <p className="mt-4 border-t border-[var(--line)] pt-4 text-center text-xs leading-6 text-mute">
          صمم لمركز الموهوبات بخميس مشيط © جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
