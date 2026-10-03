import { useState } from 'react';
import { DEFAULT_WHATSAPP_NUMBER, whatsappLabel, whatsappPhone } from '../lib/whatsapp';
import { emptyGateway, normalizeGateway } from '../lib/gateway';
import { useStore } from '../context/Store';
import { Banner, Field, PasswordField } from './ui';

export default function SettingsPanel() {
  const { data, updateSettings, backup, restore, canManage } = useStore();
  const [form, setForm] = useState({
    ...data.settings,
    whatsappNumber: data.settings.whatsappNumber || DEFAULT_WHATSAPP_NUMBER,
    gateway: normalizeGateway({ ...emptyGateway(), ...data.settings.gateway }),
  });
  const [message, setMessage] = useState('');
  const currentNumber = whatsappLabel(data.settings.whatsappNumber);
  if (!canManage) return <Banner tone="bad">هذه الصفحة متاحة للمالك ومديرة المركز ومسؤولات النظام.</Banner>;

  const save = (event) => {
    event.preventDefault();
    if (!form.defaultPassword || form.defaultPassword.length < 6) {
      setMessage('كلمة المرور الافتراضية لا تقل عن 6 خانات.');
      return;
    }
    const typed = String(form.whatsappNumber || '').trim();
    const whatsappNumber = typed ? whatsappPhone(typed) : DEFAULT_WHATSAPP_NUMBER;
    if (typed && !whatsappNumber) {
      setMessage('رقم واتساب المركز غير مكتمل. مثال: 0559820932 أو 966559820932');
      return;
    }
    const gateway = normalizeGateway(form.gateway);
    if (gateway.enabled) {
      if (!/^https:\/\/.+/i.test(gateway.apiUrl)) {
        setMessage('رابط مزود الخدمة يجب أن يبدأ بـ https://');
        return;
      }
      if (!gateway.apiKey || !gateway.senderId) {
        setMessage('أدخل مفتاح الربط ومعرّف المرسل قبل تفعيل المزود.');
        return;
      }
      if (!gateway.sms && !gateway.whatsapp) {
        setMessage('اختر SMS أو واتساب أو كليهما لاستخدام المزود.');
        return;
      }
    }
    updateSettings({ ...form, whatsappNumber, gateway });
    setForm({ ...form, whatsappNumber, gateway });
    setMessage('تم حفظ الإعدادات، بما فيها رقم واتساب المركز ومزود الرسائل.');
  };

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const gateway = normalizeGateway(form.gateway);
  const setGateway = (key, value) => setForm({ ...form, gateway: { ...gateway, [key]: value } });

  return (
    <div className="space-y-4">
      {message && <Banner>{message}</Banner>}
      <form className="space-y-4" onSubmit={save}>
        <section className="card p-6">
          <h2 className="mb-4 text-2xl font-extrabold">الإعدادات العامة</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="الإدارة العامة">
              <input className="field" value={form.administrationName} onChange={set('administrationName')} />
            </Field>
            <Field label="القسم">
              <input className="field" value={form.departmentName || ''} onChange={set('departmentName')} />
            </Field>
            <Field label="اسم المركز">
              <input className="field" value={form.centerName} onChange={set('centerName')} />
            </Field>
            <Field label="الفصل الدراسي">
              <select className="field" value={form.semester} onChange={set('semester')}>
                <option>الفصل الدراسي الأول</option>
                <option>الفصل الدراسي الثاني</option>
                <option>الفصل الدراسي الثالث</option>
              </select>
            </Field>
            <Field label="العام الدراسي">
              <input className="field" value={form.academicYear} onChange={set('academicYear')} />
            </Field>
            <Field label="كلمة المرور الافتراضية للمسؤولات">
              <input className="field" dir="ltr" value={form.defaultPassword} onChange={set('defaultPassword')} />
            </Field>
            <Field label="رقم واتساب المركز">
              <input className="field" dir="ltr" inputMode="tel" placeholder="0559820932" value={form.whatsappNumber || ''} onChange={set('whatsappNumber')} />
            </Field>
          </div>
          <p className="mt-3 text-sm leading-7 text-mute">تُزامَن الإعدادات مباشرة مع Firestore. رقم واتساب الافتراضي <span dir="ltr">{currentNumber.local}</span> (<span dir="ltr">{currentNumber.international}</span>)، ويمكن تغييره من هذه الصفحة ثم حفظ الإعدادات. مفتاح المزود يُحفظ في إعدادات الأمان ولا يُعرض للطالبات.</p>
        </section>
        <section className="card p-6">
          <h2 className="mb-2 text-2xl font-extrabold">مزود الرسائل</h2>
          <p className="mb-4 text-sm leading-7 text-mute">أدخل بيانات أي مزود خارجي. عند التفعيل تُرسل رسائل SMS وواتساب عبر هذا الاشتراك، وتبديل المزود يتم من هنا دون تعديل الكود. إذا تُرك التعطيل، يبقى إرسال واتساب المجاني ورسائل الجوال من الجهاز.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl bg-[var(--soft)] px-4 py-3 md:col-span-2">
              <input type="checkbox" checked={gateway.enabled} onChange={(event) => setGateway('enabled', event.target.checked)} />
              <span className="font-bold">تفعيل مزود الخدمة</span>
            </label>
            <Field label="رابط واجهة المزود (API URL)">
              <input className="field" dir="ltr" placeholder="https://example.com/messages" value={gateway.apiUrl} onChange={(event) => setGateway('apiUrl', event.target.value)} />
            </Field>
            <Field label="مفتاح الربط (API Key)">
              <PasswordField autoComplete="off" placeholder="مفتاح الربط" value={gateway.apiKey} onChange={(event) => setGateway('apiKey', event.target.value)} />
            </Field>
            <Field label="معرّف المرسل أو رقمه">
              <input className="field" dir="ltr" placeholder="MOHOBAT أو 0559820932" value={gateway.senderId} onChange={(event) => setGateway('senderId', event.target.value)} />
            </Field>
            <div className="flex flex-col justify-end gap-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={gateway.sms} onChange={(event) => setGateway('sms', event.target.checked)} />
                <span>استخدام المزود لرسائل SMS</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={gateway.whatsapp} onChange={(event) => setGateway('whatsapp', event.target.checked)} />
                <span>استخدام المزود لرسائل واتساب</span>
              </label>
            </div>
          </div>
          <p className="mt-3 text-sm leading-7 text-mute">يرسل النظام طلباً مشفراً إلى الرابط، ويضع المفتاح في الترويسة، ويرسل الحقول: to و message و sender و channel.</p>
          <button className="btn-primary mt-4" type="submit">حفظ الإعدادات</button>
        </section>
      </form>
      <section className="card flex flex-wrap gap-3 p-6">
        <button className="btn-soft" type="button" onClick={backup}>تنزيل نسخة احتياطية</button>
        <label className="btn-ghost cursor-pointer">
          استعادة نسخة
          <input className="hidden" type="file" accept="application/json" onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await restore(file);
            setMessage('تمت استعادة النسخة على هذا الجهاز.');
          }} />
        </label>
      </section>
    </div>
  );
}
