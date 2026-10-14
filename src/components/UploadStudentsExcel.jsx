import { useState } from 'react';
import { downloadStudentsTemplate, parseStudentsWorkbook } from '../lib/excel';
import { useStore } from '../context/Store';
import { Banner } from './ui';

export default function UploadStudentsExcel() {
  const { importStudents, canManage } = useStore();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('replace');

  if (!canManage) return <Banner tone="warn">استيراد الملف متاح للمالك ومديرة المركز ومسؤولات النظام.</Banner>;

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setSummary('');
    try {
      const buffer = await file.arrayBuffer();
      const result = parseStudentsWorkbook(new Uint8Array(buffer));
      if (result.emptyGender) {
        setRows([]);
        setError('وُجد عمود الجنس لكن لا توجد سجلات للإناث.');
        return;
      }
      setRows(result.students);
      const parts = [`تم استخلاص ${result.students.length} طالبة`];
      if (result.ignoredMales) parts.push(`وتجاهل ${result.ignoredMales} من الطلاب`);
      if (result.assumedFemaleFile) parts.push('لم يُعثر على عمود جنس فاعتُمد الملف كطالبات مع استبعاد أي وصف ذكوري إن وُجد');
      if (result.skipped.length) parts.push(`وتُرك ${result.skipped.length} سجل ناقص`);
      setSummary(`${parts.join('، ')}.`);
    } catch {
      setError('تعذرت قراءة الملف. استخدم صيغة xlsx أو csv بعناوين عربية واضحة.');
    }
  };

  const runImport = async (selected) => {
    if (selected === 'replace') {
      const confirmed = window.confirm('سيتم حذف جميع البيانات السابقة ولن تتمكن من استعادتها. هل توافق على المسح والاستيراد؟');
      if (!confirmed) return;
    }
    const result = await importStudents(rows, selected);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRows([]);
    setSummary(result.message);
  };

  return (
    <div className="space-y-4">
      <div className="import-choices">
        <button className={mode === 'replace' ? 'btn-danger' : 'btn-ghost'} type="button" aria-pressed={mode === 'replace'} onClick={() => setMode('replace')}>الاستيراد الكامل</button>
        <p>يمسح بيانات الطالبات السابقة ولن تُستعاد، ثم يعتمد الملف الجديد.</p>
        <button className={mode === 'add' ? 'btn-primary' : 'btn-ghost'} type="button" aria-pressed={mode === 'add'} onClick={() => setMode('add')}>الاستيراد الإضافي</button>
        <p>يضيف السجلات إلى البيانات الحالية. إذا تكرر السجل المدني تُعتمد البيانات الجديدة.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="btn-primary cursor-pointer">
          اختيار ملف Excel
          <input className="hidden" type="file" accept=".xlsx,.xls,.xlsm,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onFile} />
        </label>
        <button className="btn-ghost" type="button" onClick={downloadStudentsTemplate}>تنزيل نموذج الأعمدة</button>
      </div>
      {summary && <Banner>{summary}</Banner>}
      {error && <Banner tone="bad">{error}</Banner>}
      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-extrabold">معاينة الطالبات ({rows.length})</h3>
            <div className="flex flex-wrap gap-2">
              <button className="btn-danger" type="button" onClick={() => runImport('replace')}>الاستيراد الكامل</button>
              <button className="btn-primary" type="button" onClick={() => runImport('add')}>الاستيراد الإضافي</button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>الاسم</th><th>السجل</th><th>الصف</th><th>المدرسة</th><th>الجوال</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 80).map((student) => (
                  <tr key={student.nationalId}>
                    <td>{student.name}</td>
                    <td dir="ltr">{student.nationalId}</td>
                    <td>{student.grade || '—'}</td>
                    <td>{student.school || '—'}</td>
                    <td dir="ltr">{student.phone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
