import { useState } from 'react';
import { applyFirebaseProject, isValidProjectId, normalizeProjectId, saveProjectSetup } from '../firebase';

export default function SetupWizard({ onDone }) {
  const [projectId, setProjectId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [administrationName, setAdministrationName] = useState('الإدارة التعليمية');
  const [departmentName, setDepartmentName] = useState('قسم الموهوبين');
  const [centerName, setCenterName] = useState('مركز الموهوبين');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const id = normalizeProjectId(projectId);
    if (!isValidProjectId(id)) {
      setError('معرف المشروع يكون بالأحرف الإنجليزية الصغيرة والأرقام والشرطة، مثل center-name.');
      return;
    }
    try {
      const setup = saveProjectSetup({
        projectId: id,
        apiKey,
        messagingSenderId,
        appId,
        ownerId,
        ownerName,
        ownerPassword,
        administrationName,
        departmentName,
        centerName,
      });
      applyFirebaseProject(setup);
      onDone(setup);
    } catch (err) {
      setError(err.message || 'تعذر حفظ إعداد القاعدة.');
    }
  };

  return (
    <div className="login-screen bg-app" dir="rtl">
      <form className="card login-card" onSubmit={submit}>
        <div className="mb-5 text-center">
          <h1 className="text-xl font-extrabold leading-snug sm:text-2xl">ربط قاعدة هذا المركز</h1>
          <p className="mt-2 text-sm leading-7 text-mute">
            هذه نسخة عامة. أدخل قاعدة Firebase الخاصة بهذا المركز، ثم اسم المركز ومالك النظام. يُحفظ الإعداد على هذا الجهاز، وتبقى النسخة على قاعدتها دون الانتقال إلى قاعدة مركز آخر.
          </p>
        </div>
        <label className="block">
          <span className="label">معرف مشروع Firebase</span>
          <input className="field" dir="ltr" required autoFocus value={projectId} onChange={(event) => setProjectId(event.target.value)} placeholder="center-project-id" />
        </label>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="label">مفتاح API</span>
            <input className="field" dir="ltr" required value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="apiKey" />
          </label>
          <label className="block">
            <span className="label">رقم المرسل</span>
            <input className="field" dir="ltr" required value={messagingSenderId} onChange={(event) => setMessagingSenderId(event.target.value)} placeholder="messagingSenderId" />
          </label>
          <label className="block">
            <span className="label">معرف التطبيق</span>
            <input className="field" dir="ltr" required value={appId} onChange={(event) => setAppId(event.target.value)} placeholder="appId" />
          </label>
          <p className="text-xs leading-6 text-mute">انسخ المفاتيح من إعدادات تطبيق الويب في مشروع Firebase الخاص بالمركز. كل نسخة تبدأ ببيانات فارغة خاصة بمشروعها.</p>
        </div>
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="label">الإدارة التعليمية</span>
            <input className="field" required value={administrationName} onChange={(event) => setAdministrationName(event.target.value)} />
          </label>
          <label className="block">
            <span className="label">القسم</span>
            <input className="field" required value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} />
          </label>
          <label className="block">
            <span className="label">اسم المركز</span>
            <input className="field" required value={centerName} onChange={(event) => setCenterName(event.target.value)} />
          </label>
        </div>
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="label">اسم مالك النظام</span>
            <input className="field" required value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="اسم المالك" />
          </label>
          <label className="block">
            <span className="label">السجل المدني للمالك</span>
            <input className="field" dir="ltr" inputMode="numeric" required value={ownerId} onChange={(event) => setOwnerId(event.target.value)} placeholder="10 أرقام" />
          </label>
          <label className="block">
            <span className="label">كلمة مرور المالك</span>
            <input className="field" dir="ltr" type="password" required value={ownerPassword} onChange={(event) => setOwnerPassword(event.target.value)} placeholder="6 خانات على الأقل" />
          </label>
        </div>
        {error && <p className="mt-3 text-sm font-bold text-[var(--danger)]">{error}</p>}
        <button className="btn-primary mt-4 w-full" type="submit">حفظ وربط هذه النسخة</button>
      </form>
    </div>
  );
}
