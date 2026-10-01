import { isAttending } from '../lib/course';

export default function Certificate({ settings, student, courses = [] }) {
  const attended = courses.filter((course) => isAttending(course, student.nationalId));
  return (
    <article className="certificate-sheet mx-auto max-w-3xl text-center">
      <div className="flex items-start justify-between gap-4 text-xs font-bold leading-6">
        <div className="text-right">
          <p>{settings.administrationName}</p>
          <p>{settings.centerName}</p>
        </div>
        <div className="text-left">
          <p>{settings.semester}</p>
          <p>العام الدراسي {settings.academicYear}</p>
        </div>
      </div>
      <p className="mt-8 text-sm tracking-[.35em] text-[var(--accent)]">شهادة تقدير</p>
      <h2 className="mt-2 text-4xl font-extrabold text-[var(--primary-2)]">شهادة إنجاز</h2>
      <p className="mt-6 text-sm">يتشرف {settings.centerName} بمنح هذه الشهادة للطالبة</p>
      <h3 className="my-4 text-3xl font-extrabold text-[var(--accent)]">{student.name}</h3>
      <p className="mx-auto max-w-xl text-sm leading-8">
        وذلك لتفوقها ومشاركتها في برامج المركز{student.grade ? ` وهي في ${student.grade}` : ''}{student.school ? ` ب${student.school}` : ''}.
        مع تمنياتنا لها بدوام التميز.
      </p>
      {attended.length > 0 && (
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7">البرامج التي حضرتها: {attended.map((course) => course.name).join('، ')}</p>
      )}
      <div className="mt-12 flex items-end justify-between text-sm">
        <div>
          <p className="font-extrabold">مديرة المركز</p>
          <p className="mt-6 text-mute">التوقيع والختم</p>
        </div>
        <div>
          <p className="font-extrabold">السجل المدني</p>
          <p dir="ltr" className="mt-2">{student.nationalId}</p>
        </div>
      </div>
    </article>
  );
}
