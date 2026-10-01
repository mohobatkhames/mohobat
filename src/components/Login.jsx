import { useState } from 'react';
import { useStore } from '../context/Store';
import { fingerprintSupported, savedFingerprint } from '../lib/webauthn';
import { Banner, Field } from './ui';

export default function Login() {
  const { loginStaff, loginStudent, loginWithFingerprint, recoverPassword, data } = useStore();
  const [tab, setTab] = useState('staff');
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [recover, setRecover] = useState(false);
  const [email, setEmail] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    const result = tab === 'staff'
      ? await loginStaff(nationalId, password)
      : await loginStudent(nationalId);
    setBusy(false);
    if (!result.ok) setError(result.message);
  };

  const fingerprint = async () => {
    setError('');
    setInfo('');
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
    setInfo(`تم التحقق من البريد ${result.email}. كلمة المرور المؤقتة: ${result.password}. حُفظت أيضاً في سجل الرسائل لأن الإرسال البريدي الفعلي يحتاج مزود بريد.`);
    setRecover(false);
    setTab('staff');
  };

  return (
    <div className="bg-app grid min-h-screen place-items-center px-4 py-10" dir="rtl">
      <div className="grid w-full max-w-5xl items-stretch gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="card relative overflow-hidden p-8">
          <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[var(--blob)] blur-2xl" />
          <p className="relative text-sm font-bold text-[var(--accent)]">{data.settings.administrationName}</p>
          <h1 className="relative mt-3 text-4xl font-extrabold leading-snug">نظام موهوبات</h1>
          <p className="relative mt-3 max-w-md text-lg leading-9 text-mute">{data.settings.centerName}</p>
          <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
            {['حضور بلمسة', 'برامج وشهادات', 'حفظ مستمر'].map((item) => (
              <div key={item} className="rounded-2xl bg-[var(--soft)] px-3 py-4 text-center font-bold">{item}</div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--soft)] p-1">
            <button className={tab === 'staff' ? 'btn-primary' : 'btn-ghost'} type="button" onClick={() => setTab('staff')}>الإدارة والموظفات</button>
            <button className={tab === 'student' ? 'btn-primary' : 'btn-ghost'} type="button" onClick={() => setTab('student')}>الطالبات</button>
          </div>

          <form className="space-y-4" onSubmit={recover ? recoverSubmit : submit}>
            <Field label="السجل المدني">
              <input className="field" dir="ltr" inputMode="numeric" value={nationalId} onChange={(event) => setNationalId(event.target.value)} placeholder="10 أرقام" />
            </Field>
            {tab === 'staff' && !recover && (
              <Field label="كلمة المرور">
                <div className="flex gap-2">
                  <input className="field" dir="ltr" type={show ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} />
                  <button className="btn-ghost" type="button" onClick={() => setShow((value) => !value)}>{show ? 'إخفاء' : 'إظهار'}</button>
                </div>
              </Field>
            )}
            {recover && (
              <Field label="البريد الإلكتروني المسجل">
                <input className="field" dir="ltr" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
            )}
            {error && <Banner tone="bad">{error}</Banner>}
            {info && <Banner>{info}</Banner>}
            <button className="btn-primary w-full" disabled={busy} type="submit">
              {busy ? 'جاري التحقق...' : recover ? 'استعادة كلمة المرور' : tab === 'staff' ? 'دخول الموظفات' : 'دخول الطالبة'}
            </button>
          </form>

          {tab === 'staff' && (
            <div className="mt-4 grid gap-2">
              <button className="btn-soft w-full" type="button" onClick={() => { setRecover((value) => !value); setError(''); }}>
                {recover ? 'العودة لتسجيل الدخول' : 'استعادة كلمة المرور عبر البريد الإلكتروني'}
              </button>
              <button className="btn-ghost w-full" type="button" onClick={fingerprint} disabled={!fingerprintSupported()}>
                الدخول بالبصمة {savedFingerprint() ? '' : '(بعد تسجيلها من داخل النظام)'}
              </button>
            </div>
          )}
          <p className="mt-4 text-center text-xs leading-6 text-mute">يُرفض أي سجل غير مضاف في النظام.</p>
        </section>
      </div>
    </div>
  );
}
