import { useMemo, useState } from 'react';
import { GRADES } from '../lib/constants';
import { isAttending, isInvited } from '../lib/course';
import { useStore } from '../context/Store';
import Certificate from './Certificate';
import { Empty, GradeSelect } from './ui';

const REPORTS = [
  ['comprehensive', 'البيانات الشاملة'],
  ['contact', 'بيانات الاتصال'],
  ['courses', 'البرامج المنفذة'],
  ['attendance', 'حضور البرامج'],
  ['grades', 'الدرجات تنازلياً'],
];

export default function ReportsAndCertificates() {
  const { data, issueCertificate } = useStore();
  const [tab, setTab] = useState('reports');
  const [grade, setGrade] = useState('الكل');
  const [report, setReport] = useState('comprehensive');
  const [active, setActive] = useState(null);

  const students = useMemo(() => {
    const list = data.students.filter((student) => grade === 'الكل' || student.grade === grade);
    if (report === 'grades') {
      return [...list].sort((a, b) => (Number(b.score) || -1) - (Number(a.score) || -1));
    }
    return list;
  }, [data.students, grade, report]);

  const known = new Set(GRADES);
  const extras = [...new Set(students.map((student) => student.grade).filter((item) => item && !known.has(item)))];
  const grades = grade === 'الكل'
    ? [...GRADES.filter((item) => students.some((student) => student.grade === item)), ...extras, ...(students.some((student) => !student.grade) ? [''] : [])]
    : [grade];
  const courses = data.courses.filter((course) => grade === 'الكل' || course.grade === grade);

  const emailCertificate = (student) => {
    issueCertificate({ student, action: 'emailed', byRole: 'staff' });
    if (student.email) {
      window.open(`mailto:${student.email}?subject=${encodeURIComponent('شهادة موهوبات')}&body=${encodeURIComponent(`شهادة ${student.name}\n${data.settings.centerName}\n${data.settings.administrationName}`)}`, '_blank');
    }
    setActive(student);
  };

  return (
    <div className="space-y-4">
      <section className="no-print card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-2xl font-extrabold">التقارير والشهادات</h2>
          <p className="text-sm text-mute">{data.settings.administrationName} · {data.settings.centerName}</p>
        </div>
        <div className="flex gap-2">
          <button className={tab === 'reports' ? 'btn-primary' : 'btn-soft'} type="button" onClick={() => setTab('reports')}>التقارير</button>
          <button className={tab === 'certificates' ? 'btn-primary' : 'btn-soft'} type="button" onClick={() => setTab('certificates')}>الشهادات</button>
        </div>
      </section>

      <section className="no-print card flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-52 flex-1"><span className="label">الصف</span><GradeSelect includeAll value={grade} onChange={setGrade} /></label>
        {tab === 'reports' && (
          <label className="min-w-52 flex-1">
            <span className="label">نوع التقرير</span>
            <select className="field" value={report} onChange={(event) => setReport(event.target.value)}>
              {REPORTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
        )}
        <button className="btn-primary" type="button" onClick={() => window.print()}>طباعة</button>
      </section>

      {tab === 'reports' && (
        <section className="card p-5">
          <header className="mb-4 text-center">
            <p className="font-bold">{data.settings.administrationName}</p>
            <p>{data.settings.centerName}</p>
            <h3 className="mt-2 text-xl font-extrabold">{REPORTS.find((item) => item[0] === report)?.[1]}</h3>
            <p className="text-sm text-mute">{data.settings.semester} · {data.settings.academicYear} · {grade}</p>
          </header>

          {report === 'courses' && (courses.length === 0 ? <Empty text="لا توجد برامج مطابقة." /> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>البرنامج</th><th>المكان</th><th>الساعات</th><th>اليوم</th><th>التاريخ</th><th>الهجري</th><th>المدربة</th><th>الصف</th></tr></thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id}>
                      <td>{course.name}</td><td>{course.place}</td><td>{course.hours || '—'}</td><td>{course.weekday}</td><td dir="ltr">{course.date}</td><td>{course.hijri}</td><td>{course.trainer || '—'}</td><td>{course.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {report === 'attendance' && (courses.length === 0 ? <Empty text="لا يوجد حضور برامج للعرض." /> : courses.map((course) => (
            <div key={course.id} className="mb-6">
              <h4 className="mb-2 font-extrabold">{course.name} · {course.grade}</h4>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th>الطالبة</th><th>الدعوة</th><th>الحضور</th></tr></thead>
                  <tbody>
                    {data.students.filter((student) => student.grade === course.grade).map((student) => (
                      <tr key={student.nationalId}>
                        <td>{student.name}</td>
                        <td>{isInvited(course, student.nationalId) ? '✓' : 'X'}</td>
                        <td>{isAttending(course, student.nationalId) ? 'حضور' : 'غياب / استثناء'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )))}

          {report !== 'courses' && report !== 'attendance' && students.length === 0 && <Empty text="لا توجد بيانات مطابقة." />}

          {report !== 'courses' && report !== 'attendance' && (report === 'grades' ? (
            <StudentTable students={students} report={report} />
          ) : grades.map((item) => {
            const group = students.filter((student) => (student.grade || '') === item);
            if (group.length === 0) return null;
            return (
              <div key={item || 'none'} className="mb-6">
                <h4 className="mb-2 font-extrabold">{item || 'صف غير محدد'}</h4>
                <StudentTable students={group} report={report} />
              </div>
            );
          }))}
        </section>
      )}

      {tab === 'certificates' && (
        <section className="space-y-4">
          <div className="no-print grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {students.length === 0 && <Empty text="لا توجد طالبات لإصدار الشهادات. الحضور الافتراضي للشهادة هو كل الطالبات المسجلات." />}
            {students.map((student) => (
              <article key={student.nationalId} className="card p-4">
                <p className="text-xs text-[var(--accent)]">{student.grade || 'صف غير محدد'} · حضور افتراضي</p>
                <h3 className="mt-1 font-extrabold">{student.name}</h3>
                <p className="text-sm text-mute" dir="ltr">{student.nationalId}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-primary" type="button" onClick={() => setActive(student)}>عرض الشهادة</button>
                  <button className="btn-soft" type="button" onClick={() => emailCertificate(student)}>إرسال للإيميل</button>
                </div>
              </article>
            ))}
          </div>
          {active && (
            <div className="space-y-3">
              <div className="no-print flex gap-2">
                <button className="btn-primary" type="button" onClick={() => { issueCertificate({ student: active, action: 'printed', byRole: 'staff' }); window.print(); }}>طباعة وتوثيق</button>
                <button className="btn-ghost" type="button" onClick={() => setActive(null)}>إغلاق المعاينة</button>
              </div>
              <Certificate settings={data.settings} student={active} courses={data.courses} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function StudentTable({ students, report }) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>م</th><th>الاسم</th><th>السجل</th><th>الصف</th><th>المدرسة</th>
            {report === 'contact' && <><th>الجوال</th><th>البريد</th><th>ولي الأمر</th><th>جوال ولي الأمر</th></>}
            {report !== 'contact' && <th>الدرجة</th>}
          </tr>
        </thead>
        <tbody>
          {students.map((student, index) => (
            <tr key={student.nationalId}>
              <td>{index + 1}</td>
              <td>{student.name}</td>
              <td dir="ltr">{student.nationalId}</td>
              <td>{student.grade || '—'}</td>
              <td>{student.school || '—'}</td>
              {report === 'contact' ? (
                <>
                  <td dir="ltr">{student.phone || '—'}</td>
                  <td>{student.email || '—'}</td>
                  <td>{student.guardian || '—'}</td>
                  <td dir="ltr">{student.guardianPhone || '—'}</td>
                </>
              ) : <td>{student.score === '' || student.score == null ? '—' : student.score}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
