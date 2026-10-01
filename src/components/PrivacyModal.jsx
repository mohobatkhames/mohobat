import { useState } from 'react';
import { useStore } from '../context/Store';

export default function PrivacyModal() {
  const { acceptPrivacy, data } = useStore();
  const [checked, setChecked] = useState(false);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card max-w-2xl">
        <p className="mb-2 text-sm font-bold text-[var(--accent)]">{data.settings.administrationName}</p>
        <h2 className="mb-3 text-2xl font-extrabold">سياسة الخصوصية</h2>
        <div className="space-y-3 text-sm leading-8 text-mute">
          <p>
            يجمع نظام موهوبات بيانات الطالبات والموظفات، ومنها الاسم والسجل المدني ووسائل التواصل والصف والدرجة،
            لاستخدامها داخل {data.settings.centerName} التابع لـ{data.settings.administrationName}.
          </p>
          <p>
            تُحفظ البيانات على هذا الجهاز تلقائياً، وتُزامَن مع قاعدة Firestore عند توفر إعداد Firebase وصلاحية الدخول.
            لا تُستخدم البيانات لأغراض تجارية، ولا يُسمح بالدخول إلا للمالك ومسؤولات النظام والطالبات المسجلات.
          </p>
          <p>بالموافقة يمكنك استخدام النظام. تظهر هذه النافذة عند أول استخدام فقط.</p>
        </div>
        <label className="mt-5 flex items-center gap-3 font-bold">
          <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
          أوافق على سياسة الخصوصية
        </label>
        <button className="btn-primary mt-4 w-full" disabled={!checked} onClick={acceptPrivacy} type="button">
          متابعة إلى النظام
        </button>
      </div>
    </div>
  );
}
