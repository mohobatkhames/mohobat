import { isAttending } from '../lib/course';

function directorOf(users = []) {
  return users.find((user) => user.role === 'director' || user.job === 'مديرة');
}

export default function Certificate({ settings, student, courses = [], users = [] }) {
  const attended = courses.filter((course) => isAttending(course, student.nationalId));
  const director = directorOf(users);
  return (
    <article className="certificate-sheet mx-auto max-w-3xl text-center">
      <div className="flex items-center justify-between gap-3 text-xs font-bold leading-6">
        <div className="min-w-0 flex-1 text-right">
          <p>{settings.administrationName}</p>
          <p>{settings.centerName}</p>
        </div>
        <img src="/ministry-of-education.png" alt="وزارة التعليم" className="h-16 w-auto shrink-0 object-contain sm:h-20" />
        <div className="min-w-0 flex-1 text-left">
          <p>{settings.semester}</p>
          <p>العام الدراسي {settings.academicYear}</p>
        </div>
      </div>
      <p className="mt-8 text-sm tracking-[.35em] text-[var(--accent)]">شهادة تقدير</p>
      <h2 className="mt-2 text-4xl font-extrabold text-[var(--primary-2)]">شهادة إنجاز</h2>
      <p className="mt-6 text-sm">يتشرف {settings.centerName} بمنح هذه الشهادة للطالبة</p>
      <div className="my-4 flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1">
        <h3 className="text-3xl font-extrabold text-[var(--accent)]">{student.name}</h3>
        <p className="text-base font-bold">السجل المدني: <span dir="ltr">{student.nationalId}</span></p>
      </div>
      <p className="mx-auto max-w-xl text-sm leading-8">
        وذلك لتفوقها ومشاركتها في برامج المركز{student.grade ? ` وهي في ${student.grade}` : ''}{student.school ? ` ب${student.school}` : ''}.
        مع تمنياتنا لها بدوام التميز.
      </p>
      {attended.length > 0 && (
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7">البرامج التي حضرتها: {attended.map((course) => course.name).join('، ')}</p>
      )}
      <div className="mt-12 text-sm">
        <p className="font-extrabold">مديرة المركز</p>
        <p className="mt-2 text-lg font-extrabold">{director?.name || '—'}</p>
        <p className="mt-6 text-mute">التوقيع والختم</p>
      </div>
    </article>
  );
}
