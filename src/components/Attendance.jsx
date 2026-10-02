import { useMemo, useState } from 'react';
import { formatBoth, todayISO } from '../lib/dates';
import { useStore } from '../context/Store';
import WhatsAppSend from './WhatsAppSend';
import { Empty, GradeSelect } from './ui';

export default function Attendance() {
  const { data, toggleAttendance } = useStore();
  const [date, setDate] = useState(todayISO());
  const [grade, setGrade] = useState('الكل');
  const students = useMemo(() => data.students.filter((student) => grade === 'الكل' || student.grade === grade), [data.students, grade]);
  const absentMap = data.attendance[date] || {};

  return (
    <div className="space-y-4">
      <section className="card flex flex-wrap items-end gap-3 p-5">
        <label className="block min-w-40 flex-1">
          <span className="label">التاريخ</span>
          <input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="block min-w-52 flex-1">
          <span className="label">الصف</span>
          <GradeSelect includeAll value={grade} onChange={setGrade} />
        </label>
        <p className="pb-3 text-sm text-mute">{formatBoth(date)} · الغياب بالضغط على الاسم</p>
      </section>
      <WhatsAppSend
        students={students}
        title="واتساب الحضور والغياب"
        preset={`بيان الحضور والغياب لتاريخ ${formatBoth(date)}${grade === 'الكل' ? '' : ` · ${grade}`}`}
      />
      {students.length === 0 ? <Empty text="لا توجد طالبات في هذا الصف." /> : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => {
            const absent = absentMap[student.nationalId] === false;
            return (
              <button
                key={student.nationalId}
                type="button"
                className={`rounded-3xl px-4 py-4 text-right shadow-soft ${absent ? 'absent' : 'present'}`}
                onClick={() => toggleAttendance(date, student)}
              >
                <span className="mb-2 flex items-center justify-between font-extrabold">
                  <span>{student.name}</span>
                  <span className="text-xl">{absent ? 'X' : '✓'}</span>
                </span>
                <span className="block text-sm">{student.grade || 'صف غير محدد'} · {absent ? 'غياب' : 'حضور'}</span>
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}
