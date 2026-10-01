import { useState } from 'react';
import { isAttending, isInvited } from '../lib/course';
import { useStore } from '../context/Store';
import Composer from './Composer';
import { Banner, Empty, Field, GradeSelect } from './ui';

const blank = { name: '', place: 'حضوري', hours: '', date: '', trainer: '', grade: '' };

export default function Courses() {
  const { data, saveCourse, deleteCourse, setCourseFlag, sendMessage } = useStore();
  const [form, setForm] = useState(blank);
  const [message, setMessage] = useState('');
  const [activeId, setActiveId] = useState('');
  const [composer, setComposer] = useState(null);
  const active = data.courses.find((course) => course.id === activeId);
  const gradeStudents = data.students.filter((student) => student.grade === (active?.grade || form.grade));

  const submit = (event) => {
    event.preventDefault();
    const existing = data.courses.find((course) => course.id === form.id);
    const result = saveCourse(existing ? { ...existing, ...form, invitees: existing.invitees, presence: existing.presence } : form);
    setMessage(result.message || (result.ok ? 'تم حفظ الدورة.' : ''));
    if (result.ok) {
      setActiveId(result.course.id);
      setForm(blank);
    }
  };

  const openComposer = (channel) => {
    if (!active) return;
    const people = gradeStudents.filter((student) => isInvited(active, student.nationalId)).map((student) => ({
      id: student.nationalId,
      name: student.name,
      label: channel === 'sms' ? (student.guardian || student.name) : student.name,
      email: student.email,
      phone: channel === 'sms' ? (student.guardianPhone || student.phone) : student.phone,
    }));
    setComposer({
      channel,
      title: channel === 'sms' ? 'رسالة لولي الأمر' : `رسالة عن ${active.name}`,
      channels: [channel],
      recipients: people,
    });
  };

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <h2 className="mb-4 text-2xl font-extrabold">{form.id ? 'تعديل دورة' : 'إضافة دورة'}</h2>
        {message && <div className="mb-3"><Banner tone={message.includes('مطلوب') || message.includes('اختاري') ? 'bad' : 'ok'}>{message}</Banner></div>}
        <form className="grid gap-3 md:grid-cols-3" onSubmit={submit}>
          <Field label="اسم الدورة"><input className="field" value={form.name} onChange={set('name')} /></Field>
          <Field label="مكان الانعقاد">
            <select className="field" value={form.place} onChange={set('place')}>
              <option>حضوري</option>
              <option>عن بعد</option>
            </select>
          </Field>
          <Field label="ساعات التدريب"><input className="field" dir="ltr" type="number" min="1" value={form.hours} onChange={set('hours')} /></Field>
          <Field label="تاريخ التنفيذ"><input className="field" type="date" value={form.date} onChange={set('date')} /></Field>
          <Field label="المدرب / المدربة"><input className="field" value={form.trainer} onChange={set('trainer')} /></Field>
          <Field label="الصف"><GradeSelect value={form.grade} onChange={(value) => setForm({ ...form, grade: value })} /></Field>
          <div className="md:col-span-3"><button className="btn-primary" type="submit">حفظ الدورة</button></div>
        </form>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {data.courses.length === 0 && <Empty text="لا توجد برامج بعد." />}
        {data.courses.map((course) => (
          <button key={course.id} className={`card p-4 text-right ${activeId === course.id ? 'outline outline-2 outline-[var(--primary)]' : ''}`} type="button" onClick={() => { setActiveId(course.id); setForm({ ...course }); }}>
            <b>{course.name}</b>
            <p className="mt-2 text-sm text-mute">{course.place} · {course.hours || '—'} ساعة · {course.grade}</p>
            <p className="text-sm text-mute">{course.weekday} · {course.hijri}</p>
          </button>
        ))}
      </section>

      {active && (
        <section className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-extrabold">{active.name}</h3>
              <p className="text-sm text-mute">المدربة: {active.trainer || '—'} · {active.weekday} {active.hijri}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" type="button" onClick={() => openComposer('internal')}>إنشاء رسالة</button>
              <button className="btn-soft" type="button" onClick={() => openComposer('email')}>إرسال بالبريد</button>
              <button className="btn-ghost" type="button" onClick={() => openComposer('sms')}>SMS لأولياء الأمور</button>
              <button className="btn-danger" type="button" onClick={() => { if (window.confirm('حذف هذه الدورة؟')) { deleteCourse(active.id); setActiveId(''); setForm(blank); } }}>حذف</button>
            </div>
          </div>
          <p className="mb-3 text-sm text-mute">الضغط على الدعوة يحوّلها من ✓ إلى X للاستثناء. الضغط على الحضور يسجل الغياب عن البرنامج.</p>
          {gradeStudents.length === 0 ? <Empty text="لا توجد طالبات في صف هذه الدورة." /> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>الطالبة</th><th>دعوة</th><th>حضور البرنامج</th></tr></thead>
                <tbody>
                  {gradeStudents.map((student) => {
                    const invited = isInvited(active, student.nationalId);
                    const present = isAttending(active, student.nationalId);
                    return (
                      <tr key={student.nationalId}>
                        <td>{student.name}</td>
                        <td>
                          <button className={invited ? 'present rounded-full px-3 py-1 font-extrabold' : 'absent rounded-full px-3 py-1 font-extrabold'} type="button" onClick={() => setCourseFlag(active.id, student.nationalId, 'invitees')}>
                            {invited ? '✓' : 'X'}
                          </button>
                        </td>
                        <td>
                          <button className={present ? 'present rounded-full px-3 py-1 font-extrabold' : 'absent rounded-full px-3 py-1 font-extrabold'} type="button" disabled={!invited} onClick={() => setCourseFlag(active.id, student.nationalId, 'presence')}>
                            {present ? '✓' : 'X'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {composer && (
        <Composer
          {...composer}
          onClose={() => setComposer(null)}
          onSend={(draft) => {
            sendMessage({ ...draft, courseId: active?.id || '' });
            setMessage('تم تأكيد الإرسال وحفظ الرسالة في السجل.');
            setComposer(null);
          }}
        />
      )}
    </div>
  );
}
