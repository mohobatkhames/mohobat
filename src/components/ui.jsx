import { useState } from 'react';

function LensIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10" cy="10" r="5.2" fill={open ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" />
      <path d="M14.2 14.2 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {open && <circle cx="10" cy="10" r="1.7" fill="white" />}
    </svg>
  );
}

export function PasswordField({ value, onChange, required = false, placeholder = '••••••', autoComplete = 'current-password' }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field" dir="ltr">
      <input
        className="field"
        type={visible ? 'text' : 'password'}
        required={required}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={onChange}
      />
      <button
        className="password-lens"
        type="button"
        aria-label={visible ? 'إخفاء كلمة المرور' : 'معاينة كلمة المرور'}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        <LensIcon open={visible} />
      </button>
    </div>
  );
}

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
    <label className="box-border block min-w-0 w-full max-w-full">
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
      {!includeAll && <option value="">اختر الصف</option>}
      {grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
    </select>
  );
}
