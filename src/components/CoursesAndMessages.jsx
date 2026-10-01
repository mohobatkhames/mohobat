import { useEffect, useMemo, useState } from 'react';
import { GRADES } from '../lib/constants';
import { todayISO } from '../lib/dates';
import { navigate, pageFromPath } from '../lib/routes';
import { useStore } from '../context/Store';
import { Banner, Empty } from './ui';

const blankCourse = {
  name: '',
  locationType: 'حضوري',
  locationName: '',
  hours: '',
  hijriDate: '',
  trainer: '',
  selectedGrade: 'الرابع الابتدائي',
  invitedStudents: {},
};

const blankMessage = {
  recipientType: 'all',
  targetGrade: 'الرابع الابتدائي',
  selectedStudent: '',
  text: '',
  image: '',
};

const blankSms = {
  targetGrade: 'الرابع الابتدائي',
  messageText: '',
};

function GradeOptions() {
  return GRADES.map((grade) => <option key={grade} value={grade}>{grade}</option>);
}

export default function CoursesAndMessages({ initialTab = 'courses' }) {
  const { data, saveCourse, deleteCourse, sendMessage } = useStore();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [courseForm, setCourseForm] = useState(blankCourse);
  const [messageForm, setMessageForm] = useState(blankMessage);
  const [smsForm, setSmsForm] = useState(blankSms);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const sync = () => {
      const page = pageFromPath(window.location.pathname);
      if (page === 'messages') setActiveTab('messages');
      if (page === 'courses') setActiveTab('courses');
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const students = data.students;
  const gradeStudents = useMemo(
    () => students.filter((student) => student.grade === courseForm.selectedGrade),
    [students, courseForm.selectedGrade],
  );

  const chooseTab = (tab) => {
    setActiveTab(tab);
    setSuccessMsg('');
    setErrorMsg('');
    if (tab === 'messages') navigate('/messages');
    if (tab === 'courses') navigate('/courses');
  };

  const toggleInviteStatus = (nationalId) => {
    setCourseForm((prev) => ({
      ...prev,
      invitedStudents: {
        ...prev.invitedStudents,
        [nationalId]: prev.invitedStudents[nationalId] === false,
      },
    }));
  };

  const handleSaveCourse = (event) => {
    event.preventDefault();
    setErrorMsg('');
    const invitees = {};
    gradeStudents.forEach((student) => {
      invitees[student.nationalId] = courseForm.invitedStudents[student.nationalId] !== false;
    });
    setLoading(true);
    const result = saveCourse({
      name: courseForm.name,
      place: courseForm.locationType,
      locationType: courseForm.locationType,
      locationName: courseForm.locationName,
      hours: courseForm.hours,
      date: todayISO(),
      hijri: courseForm.hijriDate,
      trainer: courseForm.trainer,
      grade: courseForm.selectedGrade,
      invitees,
    });
    setLoading(false);
    if (!result.ok) {
      setErrorMsg(result.message);
      return;
    }
    setSuccessMsg('تم حفظ الدورة التدريبية وتحديد المدعوات بنجاح.');
    setCourseForm((prev) => ({ ...prev, name: '', hours: '', trainer: '', locationName: '', hijriDate: '' }));
  };

  const messageRecipients = () => {
    if (messageForm.recipientType === 'grade') {
      return students.filter((student) => student.grade === messageForm.targetGrade);
    }
    if (messageForm.recipientType === 'individual') {
      return students.filter((student) => student.nationalId === messageForm.selectedStudent);
    }
    if (messageForm.recipientType === 'teachers') {
      return data.users.filter((user) => user.role === 'teacher').map((user) => ({ ...user, nationalId: user.nationalId, name: user.name }));
    }
    if (messageForm.recipientType === 'employees') {
      return data.users.filter((user) => user.role === 'employee' || user.role === 'director');
    }
    return students;
  };

  const readImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('المرفق يجب أن يكون صورة.');
      return;
    }
    if (file.size > 300 * 1024) {
      setErrorMsg('حجم الصورة أكبر من 300 كيلوبايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setMessageForm((prev) => ({ ...prev, image: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };

  const handleSendMessage = (event) => {
    event.preventDefault();
    setErrorMsg('');
    const recipients = messageRecipients();
    if (!messageForm.text.trim()) {
      setErrorMsg('يرجى كتابة نص الرسالة.');
      return;
    }
    if (recipients.length === 0) {
      setErrorMsg('لا توجد مستقبلات مطابقة.');
      return;
    }
    const confirmed = window.confirm('مطلوب تأكيد: هل أنت متأكدة من إرسال الرسالة للمستهدفات على النظام والبريد الإلكتروني؟');
    if (!confirmed) return;
    const payload = {
      title: 'رسالة من مركز الموهوبات',
      body: messageForm.text.trim(),
      image: messageForm.image,
      recipientIds: recipients.map((person) => person.nationalId),
      recipientLabels: recipients.map((person) => person.name),
    };
    sendMessage({ ...payload, channel: 'internal' });
    const emails = recipients.map((person) => person.email).filter(Boolean);
    if (emails.length) {
      sendMessage({ ...payload, channel: 'email', recipientLabels: emails });
      window.open(`mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(payload.body)}`, '_blank');
    }
    setSuccessMsg(`تم إرسال الرسالة إلى ${recipients.length} وتوثيقها في النظام.`);
    setMessageForm(blankMessage);
  };

  const handleSendSms = (event) => {
    event.preventDefault();
    setErrorMsg('');
    if (!smsForm.messageText.trim()) {
      setErrorMsg('يرجى كتابة نص رسالة SMS.');
      return;
    }
    const targets = students.filter((student) => student.grade === smsForm.targetGrade);
    const phones = targets.map((student) => student.guardianPhone || student.phone).filter(Boolean);
    if (phones.length === 0) {
      setErrorMsg('لا توجد أرقام لأولياء أمور هذا الصف.');
      return;
    }
    const confirmed = window.confirm(`تأكيد إرسال SMS إلى أولياء أمور صف ${smsForm.targetGrade}؟`);
    if (!confirmed) return;
    sendMessage({
      channel: 'sms',
      title: 'رسالة لولي الأمر',
      body: smsForm.messageText.trim(),
      recipientIds: targets.map((student) => student.nationalId),
      recipientLabels: phones,
    });
    window.open(`sms:${phones.join(',')}?&body=${encodeURIComponent(smsForm.messageText.trim())}`, '_blank');
    setSuccessMsg(`تم حفظ رسالة SMS لأولياء أمور صف ${smsForm.targetGrade}.`);
    setSmsForm(blankSms);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <section className="card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold">إدارة البرامج والدورات والرسائل</h2>
          <p className="mt-1 text-sm text-mute">{data.settings.centerName} | {data.settings.administrationName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ['courses', 'البرامج والدورات'],
            ['messages', 'إنشاء وإرسال الرسائل'],
            ['sms', 'إرسال SMS لولي الأمر'],
          ].map(([id, label]) => (
            <button key={id} type="button" className={activeTab === id ? 'btn-primary' : 'btn-soft'} onClick={() => chooseTab(id)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {successMsg && <Banner>{successMsg}</Banner>}
      {errorMsg && <Banner tone="bad">{errorMsg}</Banner>}

      {activeTab === 'courses' && (
        <div className="space-y-4">
          <section className="card p-5">
            <h3 className="mb-4 text-lg font-extrabold">إضافة دورة أو برنامج تدريبي</h3>
            <form onSubmit={handleSaveCourse} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="block">
                <span className="label">اسم الدورة</span>
                <input className="field" value={courseForm.name} required onChange={(event) => setCourseForm({ ...courseForm, name: event.target.value })} placeholder="مثال: أساسيات التفكير الناقد" />
              </label>
              <label className="block">
                <span className="label">مكان الانعقاد</span>
                <div className="flex gap-2">
                  <select className="field" value={courseForm.locationType} onChange={(event) => setCourseForm({ ...courseForm, locationType: event.target.value })}>
                    <option value="حضوري">حضوري</option>
                    <option value="عن بعد">عن بعد</option>
                  </select>
                  <input className="field" value={courseForm.locationName} onChange={(event) => setCourseForm({ ...courseForm, locationName: event.target.value })} placeholder="اسم المكان أو الرابط" />
                </div>
              </label>
              <label className="block">
                <span className="label">ساعات التدريب</span>
                <input className="field" dir="ltr" type="number" min="1" value={courseForm.hours} onChange={(event) => setCourseForm({ ...courseForm, hours: event.target.value })} />
              </label>
              <label className="block">
                <span className="label">تاريخ التنفيذ باليوم والهجري</span>
                <input className="field" value={courseForm.hijriDate} onChange={(event) => setCourseForm({ ...courseForm, hijriDate: event.target.value })} placeholder="الأحد 10 / 4 / 1448 هـ" />
              </label>
              <label className="block">
                <span className="label">المدرب / المدربة</span>
                <input className="field" required value={courseForm.trainer} onChange={(event) => setCourseForm({ ...courseForm, trainer: event.target.value })} />
              </label>
              <label className="block">
                <span className="label">الصف لتحديد المدعوات</span>
                <select className="field" value={courseForm.selectedGrade} onChange={(event) => setCourseForm({ ...courseForm, selectedGrade: event.target.value })}>
                  <GradeOptions />
                </select>
              </label>
              <div className="md:col-span-2 xl:col-span-3">
                <h4 className="mb-2 font-extrabold">المدعوات (الافتراضي ✓، والضغط يحوّله إلى X)</h4>
                {gradeStudents.length === 0 ? <Empty text="لا توجد طالبات مسجلات في هذا الصف." /> : (
                  <div className="grid max-h-64 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2 xl:grid-cols-3">
                    {gradeStudents.map((student) => {
                      const invited = courseForm.invitedStudents[student.nationalId] !== false;
                      return (
                        <button
                          key={student.nationalId}
                          type="button"
                          onClick={() => toggleInviteStatus(student.nationalId)}
                          className={`flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-bold ${invited ? 'present' : 'absent'}`}
                        >
                          <span className={invited ? '' : 'line-through'}>{student.name}</span>
                          <span>{invited ? '✓' : 'X'}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <button className="btn-primary md:col-span-2 xl:col-span-3" disabled={loading} type="submit">
                {loading ? 'جاري الحفظ...' : 'حفظ الدورة التدريبية والمدعوات'}
              </button>
            </form>
          </section>

          <section className="card p-5">
            <h3 className="mb-3 text-lg font-extrabold">البرامج والدورات المسجلة</h3>
            {data.courses.length === 0 ? <Empty text="لا توجد دورات مسجلة حتى الآن." /> : (
              <div className="space-y-3">
                {data.courses.map((course) => (
                  <article key={course.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--soft)] px-4 py-3">
                    <div>
                      <h4 className="font-extrabold">{course.name}</h4>
                      <p className="mt-1 text-sm text-mute">
                        المدربة: {course.trainer || '—'} | المكان: {course.locationType || course.place} {course.locationName ? `(${course.locationName})` : ''} | التاريخ: {course.hijri || course.hijriDate || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-bold">{course.hours ? `${course.hours} ساعات` : 'برنامج تدريبي'}</span>
                      <button className="btn-danger" type="button" onClick={() => { if (window.confirm('حذف هذه الدورة؟')) deleteCourse(course.id); }}>حذف</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'messages' && (
        <section className="card mx-auto max-w-3xl p-5">
          <h3 className="text-lg font-extrabold">إنشاء رسالة جديدة</h3>
          <p className="mb-4 text-sm text-mute">تُرسل داخل النظام، وإلى البريد عند توفره، مع إمكانية إرفاق صورة.</p>
          <form onSubmit={handleSendMessage} className="space-y-3">
            <label className="block">
              <span className="label">المستهدفات</span>
              <select className="field" value={messageForm.recipientType} onChange={(event) => setMessageForm({ ...messageForm, recipientType: event.target.value })}>
                <option value="all">جميع الطالبات</option>
                <option value="grade">طالبات صف معين</option>
                <option value="individual">طالبة محددة</option>
                <option value="teachers">المعلمات</option>
                <option value="employees">الموظفات والمديرة</option>
              </select>
            </label>
            {messageForm.recipientType === 'grade' && (
              <label className="block">
                <span className="label">الصف</span>
                <select className="field" value={messageForm.targetGrade} onChange={(event) => setMessageForm({ ...messageForm, targetGrade: event.target.value })}>
                  <GradeOptions />
                </select>
              </label>
            )}
            {messageForm.recipientType === 'individual' && (
              <label className="block">
                <span className="label">الطالبة</span>
                <select className="field" value={messageForm.selectedStudent} onChange={(event) => setMessageForm({ ...messageForm, selectedStudent: event.target.value })}>
                  <option value="">اختاري الطالبة</option>
                  {students.map((student) => <option key={student.nationalId} value={student.nationalId}>{student.name} — {student.grade}</option>)}
                </select>
              </label>
            )}
            <label className="block">
              <span className="label">نص الرسالة</span>
              <textarea className="field min-h-32" required value={messageForm.text} onChange={(event) => setMessageForm({ ...messageForm, text: event.target.value })} />
            </label>
            <label className="block">
              <span className="label">إرفاق صورة</span>
              <input className="field" type="file" accept="image/*" onChange={readImage} />
            </label>
            {messageForm.image && <img src={messageForm.image} alt="مرفق الرسالة" className="max-h-40 rounded-2xl" />}
            <button className="btn-primary w-full" type="submit">إرسال الرسالة مع التأكيد</button>
          </form>
        </section>
      )}

      {activeTab === 'sms' && (
        <section className="card mx-auto max-w-3xl p-5">
          <h3 className="text-lg font-extrabold">إرسال رسائل SMS لولي الأمر</h3>
          <p className="mb-4 text-sm text-mute">تُحفظ الرسالة في النظام وتُفتح شاشة الإرسال إلى أرقام أولياء الأمور.</p>
          <form onSubmit={handleSendSms} className="space-y-3">
            <label className="block">
              <span className="label">الصف</span>
              <select className="field" value={smsForm.targetGrade} onChange={(event) => setSmsForm({ ...smsForm, targetGrade: event.target.value })}>
                <GradeOptions />
              </select>
            </label>
            <label className="block">
              <span className="label">نص الرسالة</span>
              <textarea className="field min-h-28" required value={smsForm.messageText} onChange={(event) => setSmsForm({ ...smsForm, messageText: event.target.value })} placeholder="عزيزي ولي الأمر، نود إفادتكم بمشاركة ابنتكم في..." />
            </label>
            <button className="btn-primary w-full" type="submit">إرسال رسائل SMS لأولياء الأمور</button>
          </form>
        </section>
      )}
    </div>
  );
}
