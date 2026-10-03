import { useState } from 'react';
import { JOBS } from '../lib/constants';
import { formatBoth } from '../lib/dates';
import { useStore } from '../context/Store';
import { Banner, Empty, Field } from './ui';

const blank = { name: '', nationalId: '', job: 'معلمة', phone: '', email: '', joinDate: '' };

export default function Staff() {
  const { data, saveStaff, deleteStaff, resetStaffPassword, canManage } = useStore();
  const [form, setForm] = useState(blank);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  if (!canManage) return <Banner tone="bad">إدارة الموظفات متاحة للمالك ومديرة المركز ومسؤولات النظام.</Banner>;

  const staff = data.users.filter((user) => user.role !== 'owner');
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = (event) => {
    event.preventDefault();
    const result = saveStaff(form);
    setMessage(result.message || (result.ok ? 'تم حفظ بيانات الموظفة.' : ''));
    if (result.ok) {
      setForm(blank);
      setEditing(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <section className="card h-fit p-5">
        <h2 className="mb-4 text-xl font-extrabold">{editing ? 'تعديل موظفة' : 'إضافة موظفة'}</h2>
        {message && <div className="mb-3"><Banner tone={message.includes('يجب') || message.includes('مطلوب') || message.includes('يمكن') ? 'bad' : 'ok'}>{message}</Banner></div>}
        <form className="space-y-3" onSubmit={submit}>
          <Field label="الاسم"><input className="field" value={form.name} onChange={set('name')} /></Field>
          <Field label="السجل المدني"><input className="field" dir="ltr" value={form.nationalId} onChange={set('nationalId')} disabled={editing} /></Field>
          <Field label="العمل">
            <select className="field" value={form.job} onChange={set('job')}>
              {JOBS.map((job) => <option key={job.label}>{job.label}</option>)}
            </select>
          </Field>
          <Field label="الجوال"><input className="field" dir="ltr" value={form.phone} onChange={set('phone')} /></Field>
          <Field label="البريد"><input className="field" dir="ltr" type="email" value={form.email} onChange={set('email')} /></Field>
          <Field label="تاريخ الالتحاق بالمركز">
            <input className="field" type="date" value={form.joinDate} onChange={set('joinDate')} />
            {form.joinDate ? <span className="mt-1 block text-xs leading-6 text-mute">{formatBoth(form.joinDate)}</span> : null}
          </Field>
          <button className="btn-primary w-full" type="submit">حفظ</button>
        </form>
      </section>
      <section className="card p-5">
        {staff.length === 0 ? <Empty text="لم تُضف موظفات بعد. كلمة مرور المسؤولات الجدد هي الكلمة الافتراضية من الإعدادات." /> : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>الاسم</th><th>السجل</th><th>العمل</th><th>الجوال</th><th>البريد</th><th>تاريخ الالتحاق بالمركز</th><th>إجراءات</th></tr>
              </thead>
              <tbody>
                {staff.map((user) => (
                  <tr key={user.nationalId}>
                    <td>{user.name}</td>
                    <td dir="ltr">{user.nationalId}</td>
                    <td>{user.job}</td>
                    <td dir="ltr">{user.phone || '—'}</td>
                    <td>{user.email || '—'}</td>
                    <td className="whitespace-normal">{user.joinDate ? formatBoth(user.joinDate) : '—'}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-soft" type="button" onClick={() => { setForm(user); setEditing(true); }}>تعديل</button>
                        <button className="btn-ghost" type="button" onClick={() => setMessage(resetStaffPassword(user.nationalId).message)}>كلمة افتراضية</button>
                        <button className="btn-danger" type="button" onClick={() => { const reason = window.prompt(`سبب حذف ${user.name}`); if (!reason?.trim()) return; const result = deleteStaff(user.nationalId, reason.trim()); if (!result.ok) setMessage(result.message); }}>حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
