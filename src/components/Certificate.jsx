import { useEffect, useState } from 'react';
import { isTrainer } from '../lib/constants';
import { isAttending } from '../lib/course';
import { trimSignatureUrl } from '../lib/signature';

function CenteredSignature({ src }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let alive = true;
    trimSignatureUrl(src).then((next) => {
      if (alive) setUrl(next || src);
    }).catch(() => {
      if (alive) setUrl(src);
    });
    return () => {
      alive = false;
    };
  }, [src]);
  if (!url) return null;
  return <img className="signature-image" src={url} alt="" />;
}

export function directorOf(users = []) {
  return users.find((user) => user.role === 'director' || user.job === 'مديرة');
}

export default function Certificate({ settings, student, courses = [], users = [], kind = 'appreciation' }) {
  const attended = courses.filter((course) => isAttending(course, student.nationalId));
  const director = directorOf(users);
  const completion = kind === 'completion';
  const trainers = [...new Set(attended.map((course) => String(course.trainer || '').trim()).filter(Boolean))].map((name) => {
    const person = users.find((user) => isTrainer(user) && String(user.name || '').trim() === name);
    return { name, signature: person?.signature || '' };
  });
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
      <h2 className="mt-8 text-4xl font-extrabold text-[var(--primary-2)]">{completion ? 'شهادة إنجاز' : 'شهادة تقدير'}</h2>
      <p className="mt-6 text-sm">يتشرف {settings.centerName} بمنح هذه الشهادة للطالبة</p>
      <div className="my-4 flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1">
        <h3 className="text-3xl font-extrabold text-[var(--accent)]">{student.name}</h3>
        <p className="text-base font-bold">السجل المدني: <span dir="ltr">{student.nationalId}</span></p>
      </div>
      <p className="mx-auto max-w-xl text-sm leading-8">
        {completion
          ? `وذلك لإتمامها البرنامج التدريبي${student.grade ? ` وهي في ${student.grade}` : ''}.`
          : `وذلك لتفوقها ومشاركتها في أنشطة المركز${student.grade ? ` وهي في ${student.grade}` : ''}${student.school ? ` ب${student.school}` : ''}. مع تمنياتنا لها بدوام التميز.`}
      </p>
      {completion && attended.length > 0 && (
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7">البرامج التي أتمتها: {attended.map((course) => course.name).join('، ')}</p>
      )}
      <div className="certificate-signoff" dir="ltr">
        <div className="certificate-sign">
          {settings.showSignatureOnCertificates && settings.signature && (
            <CenteredSignature src={settings.signature} />
          )}
        </div>
        <div className="certificate-sign-trainer">
          {trainers.filter((person) => person.signature).map((person) => (
            <CenteredSignature key={person.name} src={person.signature} />
          ))}
        </div>
        <p className="certificate-role certificate-role-director">مديرة المركز</p>
        <p className="certificate-role certificate-role-trainer">المدرب / المدربة</p>
        <p className="certificate-person certificate-person-director">{director?.name || ''}</p>
        <div className="certificate-person certificate-person-trainer">
          {trainers.length === 0 ? <p>—</p> : trainers.map((person) => <p key={person.name}>{person.name}</p>)}
        </div>
      </div>
    </article>
  );
}
