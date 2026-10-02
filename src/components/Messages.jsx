import { useMemo, useState } from 'react';
import { formatBothDateTime } from '../lib/dates';
import { useStore } from '../context/Store';
import Composer from './Composer';
import { Empty } from './ui';

const GROUPS = [
  ['teachers', 'المعلمات'],
  ['employees', 'الموظفات'],
  ['students', 'الطالبات'],
  ['all', 'الكل'],
];

export default function Messages() {
  const { data, sendMessage, deleteMessage, canManage } = useStore();
  const [group, setGroup] = useState('students');
  const [picked, setPicked] = useState({});
  const [open, setOpen] = useState(false);

  const people = useMemo(() => {
    const staff = data.users.filter((user) => user.role !== 'owner').map((user) => ({
      id: user.nationalId,
      name: user.name,
      kind: user.role === 'teacher' ? 'teachers' : 'employees',
      email: user.email,
      phone: user.phone,
    }));
    const students = data.students.map((student) => ({
      id: student.nationalId,
      name: student.name,
      kind: 'students',
      email: student.email,
      phone: student.phone,
    }));
    const all = [...staff, ...students];
    if (group === 'all') return all;
    if (group === 'employees') return all.filter((person) => person.kind === 'employees');
    if (group === 'teachers') return staff.filter((person) => person.kind === 'teachers');
    return students;
  }, [data.users, data.students, group]);

  const selected = people.filter((person) => picked[person.id]);

  const toggleAll = () => {
    const every = people.every((person) => picked[person.id]);
    const next = { ...picked };
    people.forEach((person) => { next[person.id] = !every; });
    setPicked(next);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
      <section className="card p-5">
        <h2 className="mb-3 text-2xl font-extrabold">رسالة جديدة</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {GROUPS.map(([id, label]) => (
            <button key={id} className={group === id ? 'btn-primary' : 'btn-ghost'} type="button" onClick={() => setGroup(id)}>{label}</button>
          ))}
          <button className="btn-soft" type="button" onClick={toggleAll}>تحديد الكل</button>
        </div>
        <div className="max-h-96 space-y-2 overflow-auto">
          {people.length === 0 && <Empty text="لا توجد أسماء في هذه الفئة." />}
          {people.map((person) => (
            <label key={person.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--soft)] px-3 py-2">
              <span><input type="checkbox" checked={Boolean(picked[person.id])} onChange={() => setPicked({ ...picked, [person.id]: !picked[person.id] })} /> {person.name}</span>
              <span className="text-xs text-mute" dir="ltr">{person.email || person.phone || person.id}</span>
            </label>
          ))}
        </div>
        <button className="btn-primary mt-4 w-full" type="button" disabled={selected.length === 0} onClick={() => setOpen(true)}>
          إنشاء رسالة للمحددات ({selected.length})
        </button>
      </section>
      <section className="card p-5">
        <h2 className="mb-3 text-2xl font-extrabold">السجل</h2>
        <div className="space-y-3">
          {data.messages.length === 0 && <Empty text="لا توجد رسائل بعد." />}
          {data.messages.map((message) => (
            <article key={message.id} className="rounded-2xl border border-[var(--line)] p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <b>{message.title}</b>
                <span className="text-xs text-mute">{message.channel} · {formatBothDateTime(message.createdAt)}</span>
              </div>
              <p className="text-sm leading-7">{message.body}</p>
              {message.image && <img src={message.image} alt="" className="mt-2 max-h-36 rounded-xl" />}
              <p className="mt-2 text-xs text-mute">إلى: {(message.recipientLabels || []).slice(0, 6).join('، ') || '—'}</p>
              {canManage && <button className="btn-ghost mt-2" type="button" onClick={() => { const reason = window.prompt('سبب حذف الرسالة'); if (!reason?.trim()) return; deleteMessage(message.id, reason.trim()); }}>حذف</button>}
            </article>
          ))}
        </div>
      </section>
      {open && (
        <Composer
          title="رسالة داخلية"
          channels={['internal', 'email', 'sms']}
          recipients={selected.map((person) => ({ ...person, label: person.name }))}
          onClose={() => setOpen(false)}
          onSend={(draft) => { sendMessage(draft); setOpen(false); setPicked({}); }}
        />
      )}
    </div>
  );
}
