import { useMemo, useState } from 'react';
import { useStore } from '../context/Store';
import UploadStudentsExcel from './UploadStudentsExcel';
import { Banner, Empty, Field, GradeSelect } from './ui';

const blank = { name: '', nationalId: '', grade: '', school: '', phone: '', email: '', guardian: '', guardianPhone: '', score: '' };

export default function Students() {
  const { data, saveStudent, deleteStudent, canManage } = useStore();
  const [tab, setTab] = useState('list');
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState('الكل');
  const [form, setForm] = useState(blank);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState('');

  const rows = useMemo(() => data.students.filter((student) => {
    const text = `${student.name} ${student.nationalId} ${student.school || ''}`.includes(query.trim());
    return text && (grade === 'الكل' || student.grade === grade);
  }), [data.students, query, grade]);

  const submit = (event) => {
    event.preventDefault();
    const result = saveStudent(form);
    setMessage(result.message || (result.ok ? 'تم حفظ الطالبة.' : ''));
    if (result.ok) {
      setForm(blank);
      setEditing('');
      setTab('list');
    }
  };

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap gap-2">
        {[['list', 'القائمة'], ['add', 'إضافة / تعديل'], ['import', 'استيراد Excel']].map(([id, label]) => (
          <button key={id} className={tab === id ? 'btn-primary' : 'btn-ghost'} type="button" onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'import' && <section className="card p-5"><UploadStudentsExcel /></section>}

      {tab === 'add' && (
        <section className="card form-sheet box-border w-full max-w-md p-4 sm:max-w-3xl sm:p-5">
          {!canManage && <Banner tone="warn">التعديل والحذف متاحان لإدارة المركز.</Banner>}
          {message && <div className="mb-3"><Banner tone={message.includes('يجب') || message.includes('مطلوب') || message.includes('خارج') ? 'bad' : 'ok'}>{message}</Banner></div>}
          <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
            <Field label="اسم الطالبة"><input className="field" value={form.name} onChange={set('name')} /></Field>
            <Field label="السجل المدني"><input className="field" dir="ltr" value={form.nationalId} onChange={set('nationalId')} disabled={Boolean(editing)} /></Field>
            <Field label="الصف"><GradeSelect value={form.grade} onChange={(value) => setForm({ ...form, grade: value })} /></Field>
            <Field label="المدرسة"><input className="field" value={form.school} onChange={set('school')} /></Field>
            <Field label="الجوال"><input className="field" dir="ltr" value={form.phone} onChange={set('phone')} /></Field>
            <Field label="البريد"><input className="field" dir="ltr" value={form.email} onChange={set('email')} /></Field>
            <Field label="ولي الأمر"><input className="field" value={form.guardian} onChange={set('guardian')} /></Field>
            <Field label="جوال ولي الأمر"><input className="field" dir="ltr" value={form.guardianPhone} onChange={set('guardianPhone')} /></Field>
            <Field label="الدرجة"><input className="field" dir="ltr" value={form.score} onChange={set('score')} /></Field>
            <div className="flex items-end"><button className="btn-primary w-full" disabled={!canManage} type="submit">{editing ? 'تحديث' : 'إضافة'}</button></div>
          </form>
        </section>
      )}

      {tab === 'list' && (
        <section className="card p-5">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_240px]">
            <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالاسم أو السجل أو المدرسة" />
            <GradeSelect includeAll value={grade} onChange={setGrade} />
          </div>
          {rows.length === 0 ? <Empty text="لا توجد طالبات مطابقات." /> : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>الاسم</th><th>السجل</th><th>الصف</th><th>المدرسة</th><th>الدرجة</th><th className="no-print">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((student) => (
                    <tr key={student.nationalId}>
                      <td>{student.name}</td>
                      <td dir="ltr">{student.nationalId}</td>
                      <td>{student.grade || '—'}</td>
                      <td>{student.school || '—'}</td>
                      <td>{student.score === '' || student.score == null ? '—' : student.score}</td>
                      <td className="no-print">
                        <div className="flex gap-2">
                          <button className="btn-soft" type="button" onClick={() => { setForm(student); setEditing(student.nationalId); setTab('add'); }}>تعديل</button>
                          {canManage && <button className="btn-danger" type="button" onClick={() => { const reason = window.prompt(`سبب حذف ${student.name}`); if (!reason?.trim()) return; const result = deleteStudent(student.nationalId, reason.trim()); if (!result.ok) setMessage(result.message); }}>حذف</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
