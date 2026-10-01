export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-xl font-extrabold">{title}</h3>
          <button className="btn-ghost" onClick={onClose} type="button">إغلاق</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Banner({ tone = 'ok', children }) {
  const styles = tone === 'bad'
    ? 'bg-rose-50 text-rose-700 border-rose-100'
    : tone === 'warn'
      ? 'bg-amber-50 text-amber-800 border-amber-100'
      : 'bg-emerald-50 text-emerald-800 border-emerald-100';
  return <div className={`rounded-2xl border px-4 py-3 text-sm leading-7 ${styles}`}>{children}</div>;
}

export function Empty({ text }) {
  return <div className="rounded-2xl bg-[var(--soft)] px-4 py-10 text-center text-mute">{text}</div>;
}

export function GradeSelect({ value, onChange, includeAll = false }) {
  const grades = ['الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي', 'الأول المتوسط', 'الثاني المتوسط', 'الثالث المتوسط', 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'];
  return (
    <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
      {includeAll && <option value="الكل">جميع الصفوف</option>}
      {!includeAll && <option value="">اختاري الصف</option>}
      {grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
    </select>
  );
}
