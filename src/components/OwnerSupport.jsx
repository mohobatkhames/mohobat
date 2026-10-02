import { useState } from 'react';
import { navigate } from '../lib/routes';
import { useStore } from '../context/Store';
import { Banner, Field, PasswordField } from './ui';

const LINKS = [
  ['/students', 'تعديل الطالبات'],
  ['/staff', 'تعديل الموظفات'],
  ['/settings', 'الإعدادات العامة'],
  ['/messages', 'الرسائل'],
];

export default function OwnerSupport() {
  const { data, session, updateSettings, saveOnWeb, cloud } = useStore();
  const [form, setForm] = useState(data.settings);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (session?.role !== 'owner') {
    return <Banner tone="bad">التعديل والحفظ على الويب متاح للمالك فقط.</Banner>;
  }

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const save = async (event) => {
    event.preventDefault();
    if (!form.administrationName?.trim() || !form.centerName?.trim()) {
      setMessage('اسم الإدارة واسم المركز مطلوبان.');
      return;
    }
    if (!form.defaultPassword || form.defaultPassword.length < 6) {
      setMessage('كلمة المرور الافتراضية لا تقل عن 6 خانات.');
      return;
    }
    setBusy(true);
    updateSettings(form);
    const result = await saveOnWeb();
    setBusy(false);
    setMessage(result.message);
  };

  return (
    <div className="support-page space-y-4">
      <section className="card p-4 sm:p-6">
        <p className="text-sm font-bold text-[var(--accent)]">دعم فني سريع</p>
        <h2 className="mt-1 text-2xl font-extrabold leading-snug">التعديل والحفظ على الويب</h2>
        <p className="mt-2 text-sm leading-7 text-mute">
          هذا الخيار للمالك من جهاز الحاسب أو الجوال. التعديل يُرسل مباشرة إلى Firestore.
        </p>
        <p className="mt-3 text-sm font-bold text-[var(--primary)]">
          {cloud.mode === 'synced' ? 'المزامنة مع Firestore متصلة' : 'بانتظار اتصال Firestore'}
        </p>
        {message && <div className="mt-4"><Banner tone={message.includes('تعذر') || message.includes('مطلوبان') || message.includes('لا تقل') ? 'bad' : 'ok'}>{message}</Banner></div>}
        <form className="mt-4 grid gap-3" onSubmit={save}>
          <Field label="الإدارة العامة">
            <input className="field" value={form.administrationName} onChange={set('administrationName')} />
          </Field>
          <Field label="اسم المركز">
            <input className="field" value={form.centerName} onChange={set('centerName')} />
          </Field>
          <Field label="الفصل الدراسي">
            <select className="field" value={form.semester} onChange={set('semester')}>
              <option>الفصل الدراسي الأول</option>
              <option>الفصل الدراسي الثاني</option>
              <option>الفصل الدراسي الثالث</option>
            </select>
          </Field>
          <Field label="العام الدراسي">
            <input className="field" value={form.academicYear} onChange={set('academicYear')} />
          </Field>
          <Field label="كلمة المرور الافتراضية للمسؤولات">
            <PasswordField autoComplete="new-password" value={form.defaultPassword} onChange={set('defaultPassword')} />
          </Field>
          <button className="btn-primary w-full" type="submit" disabled={busy}>
            {busy ? 'جارٍ الحفظ...' : 'حفظ التعديلات على الويب'}
          </button>
        </form>
      </section>
      <section className="grid gap-2 sm:grid-cols-2">
        {LINKS.map(([path, label]) => (
          <button key={path} className="btn-soft w-full whitespace-normal" type="button" onClick={() => navigate(path)}>
            {label}
          </button>
        ))}
      </section>
    </div>
  );
}
