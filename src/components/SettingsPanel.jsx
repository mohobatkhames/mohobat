import { useState } from 'react';
import { useStore } from '../context/Store';
import { Banner, Field } from './ui';

export default function SettingsPanel() {
  const { data, updateSettings, backup, restore, canManage } = useStore();
  const [form, setForm] = useState(data.settings);
  const [message, setMessage] = useState('');
  if (!canManage) return <Banner tone="bad">هذه الصفحة متاحة للمالك ومديرة المركز ومسؤولات النظام.</Banner>;

  const save = (event) => {
    event.preventDefault();
    if (!form.defaultPassword || form.defaultPassword.length < 6) {
      setMessage('كلمة المرور الافتراضية لا تقل عن 6 خانات.');
      return;
    }
    updateSettings(form);
    setMessage('تم حفظ الإعدادات وستظهر في التقارير والشهادات.');
  };

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  return (
    <div className="space-y-4">
      <section className="card p-6">
        <h2 className="mb-4 text-2xl font-extrabold">الإعدادات العامة</h2>
        {message && <div className="mb-4"><Banner>{message}</Banner></div>}
        <form className="grid gap-4 md:grid-cols-2" onSubmit={save}>
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
            <input className="field" dir="ltr" value={form.defaultPassword} onChange={set('defaultPassword')} />
          </Field>
          <div className="flex items-end">
            <button className="btn-primary w-full" type="submit">حفظ الإعدادات</button>
          </div>
        </form>
        <p className="mt-3 text-sm leading-7 text-mute">الحفظ تلقائي محلياً. عند اكتمال مفاتيح Firebase تُزامَن الإعدادات العامة لحظياً، وتبقى كلمة المرور الافتراضية في مستند خاص بالمسؤولات.</p>
      </section>
      <section className="card flex flex-wrap gap-3 p-6">
        <button className="btn-soft" type="button" onClick={backup}>تنزيل نسخة احتياطية</button>
        <label className="btn-ghost cursor-pointer">
          استعادة نسخة
          <input className="hidden" type="file" accept="application/json" onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await restore(file);
            setMessage('تمت استعادة النسخة على هذا الجهاز.');
          }} />
        </label>
      </section>
    </div>
  );
}
