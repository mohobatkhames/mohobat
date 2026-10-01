import { formatGregorian, formatHijri, todayISO } from '../lib/dates';
import { useStore } from '../context/Store';

export default function Dashboard() {
  const { data } = useStore();
  const today = todayISO();
  const absentToday = Object.values(data.attendance[today] || {}).filter((value) => value === false).length;
  const notices = data.messages.filter((message) => message.channel === 'print-notice').slice(0, 5);
  const cards = [
    ['الطالبات', data.students.length],
    ['الموظفات', data.users.filter((user) => user.role !== 'owner').length],
    ['البرامج', data.courses.length],
    ['غياب اليوم', absentToday],
  ];

  return (
    <div className="space-y-4">
      <section className="card p-6">
        <p className="text-sm font-bold text-[var(--accent)]">{formatGregorian(today)}</p>
        <h2 className="mt-1 text-3xl font-extrabold">أهلاً بك في لوحة موهوبات</h2>
        <p className="mt-2 text-mute">{formatHijri(today)} · {data.settings.semester} · {data.settings.academicYear}</p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={label} className="card p-5">
            <p className="text-sm text-mute">{label}</p>
            <p className="mt-2 text-3xl font-extrabold text-[var(--primary)]">{value}</p>
          </article>
        ))}
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
    </div>
  );
}
