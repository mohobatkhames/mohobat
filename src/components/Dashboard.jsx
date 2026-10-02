import { useState } from 'react';
import { formatGregorian, formatHijri, formatTime, todayISO } from '../lib/dates';
import { useStore } from '../context/Store';
import { Banner, Empty, Field, GradeSelect } from './ui';

const blankGuardian = { name: '', nationalId: '', grade: '', guardianPhone: '' };

export default function Dashboard() {
  const { data, session, cloud, saveStudent, deleteStudent, canManage } = useStore();
  const [guardianForm, setGuardianForm] = useState(null);
  const [editingId, setEditingId] = useState('');
  const [notice, setNotice] = useState('');
  const today = todayISO();
  const absentToday = Object.values(data.attendance[today] || {}).filter((value) => value === false).length;
  const notices = data.messages.filter((message) => message.channel === 'print-notice').slice(0, 5);
  const cards = [
    ['الطالبات', data.students.length],
    ['الموظفات', data.users.filter((user) => user.role !== 'owner').length],
    ['البرامج', data.courses.length],
    ['غياب اليوم', absentToday],
  ];

  const openAdd = () => {
    setEditingId('');
    setGuardianForm(blankGuardian);
    setNotice('');
  };

  const openEdit = (student) => {
    setEditingId(student.nationalId);
    setGuardianForm({
      name: student.name || '',
      nationalId: student.nationalId || '',
      grade: student.grade || '',
      guardianPhone: student.guardianPhone || '',
    });
    setNotice('');
  };

  const saveGuardian = (event) => {
    event.preventDefault();
    const current = data.students.find((item) => item.nationalId === editingId);
    const result = saveStudent({ ...(current || {}), ...guardianForm });
    setNotice(result.ok ? (editingId ? 'تم تعديل بيانات ولي الأمر.' : 'تمت إضافة ولي الأمر.') : result.message);
    if (result.ok) {
      setGuardianForm(null);
      setEditingId('');
    }
  };

  const removeGuardian = (student) => {
    const reason = window.prompt(`سبب حذف ولي أمر ${student.name}`);
    if (!reason?.trim()) return;
    const result = deleteStudent(student.nationalId, reason.trim(), 'أولياء الأمور');
    setNotice(result.ok ? 'نُقل السجل إلى الأرشيف.' : result.message);
  };

  const setField = (key) => (event) => setGuardianForm({ ...guardianForm, [key]: event.target.value });

  return (
    <div className="space-y-4">
      <section className="card p-6">
        <p className="text-sm font-bold text-[var(--accent)]">{formatGregorian(today)}</p>
        <h2 className="mt-1 text-3xl font-extrabold">
          {session?.role === 'owner' ? 'أهلاً بك يا أبو نايف في نظام موهوبات' : `أهلاً بك ${session?.name || ''} في نظام موهوبات`}
        </h2>
        <p className="mt-2 text-mute">النظام جاهز لإدارة الطالبات، الحضور، البرامج، والتقارير والشهادات. {formatHijri(today)} · {data.settings.semester} · {data.settings.academicYear}</p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={label} className="card p-5">
            <p className="text-sm text-mute">{label}</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--primary)]">{value}</p>
          </article>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <article className="card p-5">
          <h3 className="mb-3 text-lg font-extrabold">إعدادات النظام العامة</h3>
          <ul className="space-y-2 text-sm leading-7">
            <li>الإدارة: {data.settings.administrationName}</li>
            <li>المركز: {data.settings.centerName}</li>
            <li>الفصل: {data.settings.semester} ({data.settings.academicYear})</li>
          </ul>
        </article>
        <article className="card p-5">
          <h3 className="mb-3 text-lg font-extrabold">أقسام النظام</h3>
          <ul className="space-y-2 text-sm leading-7">
            <li>رفع بيانات إكسل وفلترة الطالبات</li>
            <li>الحضور والغياب</li>
            <li>الموظفات والمعلمات</li>
            <li>البرامج والدورات والرسائل</li>
            <li>التقارير والشهادات</li>
          </ul>
        </article>
        <article className="card p-5">
          <h3 className="mb-3 text-lg font-extrabold">المزامنة السحابية</h3>
          <p className="text-sm leading-7">الطالبات، الحضور والغياب، البرامج، والشهادات تُزامَن مباشرة مع Firestore.</p>
          <p className="mt-3 text-sm font-bold text-[var(--primary)]">{cloud.mode === 'synced' ? 'المزامنة السحابية تعمل' : cloud.mode === 'error' ? 'تعذرت المزامنة مع Firestore' : 'بانتظار تسجيل الدخول للمزامنة'}</p>
        </article>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="card p-5">
          <h3 className="mb-3 text-lg font-extrabold">بيانات تظهر في التقارير</h3>
          <ul className="space-y-2 text-sm leading-7">
            <li>{data.settings.administrationName}</li>
            <li>{data.settings.centerName}</li>
            <li>{data.settings.semester} — {data.settings.academicYear}</li>
          </ul>
        </article>
        <article className="card p-5">
          <h3 className="mb-3 text-lg font-extrabold">إشعارات طباعة الشهادات</h3>
          {notices.length === 0 && <p className="text-sm text-mute">لا توجد طباعة من حساب طالبة بعد.</p>}
          <ul className="space-y-2">
            {notices.map((notice) => (
              <li key={notice.id} className="rounded-2xl bg-[var(--soft)] px-3 py-2 text-sm">{notice.body}</li>
            ))}
          </ul>
        </article>
      </section>
      <section className="card p-4 sm:p-5">
        <h2 className="text-2xl font-extrabold">أولياء الأمور</h2>
        <p className="mt-1 text-sm leading-7 text-mute">اسم الطالبة والسجل والصف وجوال ولي الأمر، وأزرار الإضافة والتعديل والحذف في نهاية كل صف.</p>
        {notice && <div className="mt-3"><Banner tone={notice.includes('يجب') || notice.includes('مطلوب') || notice.includes('غير') ? 'bad' : 'ok'}>{notice}</Banner></div>}
        {guardianForm && (
          <form id="guardian-form" className="mt-4 grid gap-3" onSubmit={saveGuardian}>
            <Field label="اسم الطالبة"><input className="field" value={guardianForm.name} onChange={setField('name')} /></Field>
            <Field label="السجل المدني"><input className="field" dir="ltr" inputMode="numeric" value={guardianForm.nationalId} onChange={setField('nationalId')} disabled={Boolean(editingId)} /></Field>
            <Field label="الصف"><GradeSelect value={guardianForm.grade} onChange={(value) => setGuardianForm({ ...guardianForm, grade: value })} /></Field>
            <Field label="جوال ولي الأمر"><input className="field" dir="ltr" inputMode="tel" value={guardianForm.guardianPhone} onChange={setField('guardianPhone')} /></Field>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" type="submit" disabled={!canManage}>{editingId ? 'حفظ التعديل' : 'حفظ الإضافة'}</button>
              <button className="btn-ghost" type="button" onClick={() => { setGuardianForm(null); setEditingId(''); }}>إلغاء</button>
            </div>
          </form>
        )}
        {data.students.length === 0 ? (
          <div className="mt-4">
            <Empty text="لا توجد بيانات أولياء أمور." />
            {canManage && <button className="btn-primary mt-3" type="button" onClick={openAdd}>إضافة</button>}
          </div>
        ) : (
          <div className="table-wrap mt-4">
            <table className="data">
              <thead>
                <tr>
                  <th>اسم الطالبة</th>
                  <th>السجل المدني</th>
                  <th>الصف</th>
                  <th>جوال ولي الأمر</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((student) => (
                  <tr key={student.nationalId}>
                    <td>{student.name}</td>
                    <td dir="ltr">{student.nationalId}</td>
                    <td>{student.grade || '—'}</td>
                    <td dir="ltr">{student.guardianPhone || '—'}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-soft" type="button" disabled={!canManage} onClick={openAdd}>إضافة</button>
                        <button className="btn-ghost" type="button" disabled={!canManage} onClick={() => openEdit(student)}>تعديل</button>
                        <button className="btn-danger" type="button" disabled={!canManage} onClick={() => removeGuardian(student)}>حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="card p-4 sm:p-5">
        <h2 className="text-2xl font-extrabold">الأرشيف</h2>
        <p className="mt-1 text-sm leading-7 text-mute">بيانات المحذوفين من النظام، مع التاريخ والوقت وسبب الحذف.</p>
        {(data.archive || []).length === 0 ? <div className="mt-4"><Empty text="لا توجد سجلات محذوفة." /></div> : (
          <div className="table-wrap mt-4">
            <table className="data">
              <thead>
                <tr>
                  <th>البيان</th>
                  <th>التاريخ</th>
                  <th>الوقت</th>
                  <th>سبب الحذف</th>
                </tr>
              </thead>
              <tbody>
                {data.archive.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-normal">
                      <b>{item.kind}</b>
                      <span className="mt-1 block">{item.title}</span>
                      {item.detail && <span className="mt-1 block text-mute">{item.detail}</span>}
                    </td>
                    <td>{formatGregorian(item.deletedAt)}</td>
                    <td>{formatTime(item.deletedAt)}</td>
                    <td className="whitespace-normal">{item.reason}</td>
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
