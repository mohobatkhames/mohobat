import { useState } from 'react';
import { THEMES } from '../lib/constants';
import { formatBothDateTime } from '../lib/dates';
import { useStore } from '../context/Store';
import Certificate from './Certificate';
import InstallApp from './InstallApp';
import { Banner, Empty } from './ui';

export default function StudentPortal() {
  const store = useStore();
  const student = store.data.students.find((item) => item.nationalId === store.session.nationalId) || {
    nationalId: store.session.nationalId,
    name: store.session.name,
  };
  const messages = store.data.messages.filter((message) => (message.recipientIds || []).includes(student.nationalId));
  const [notice, setNotice] = useState('');

  const printCertificate = () => {
    const finish = () => {
      store.issueCertificate({ student, action: 'printed', byRole: 'student' });
      setNotice('تم إرسال إشعار الطباعة إلى النظام.');
      window.removeEventListener('afterprint', finish);
    };
    window.addEventListener('afterprint', finish);
    window.print();
  };

  return (
    <div className="bg-app min-h-screen" dir="rtl">
      <header className="no-print mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-5">
        <div className="w-full sm:min-w-0 sm:flex-1">
          <p className="text-sm leading-6 text-[var(--accent)]">{store.data.settings.centerName}</p>
          <h1 className="text-2xl font-extrabold leading-snug">بوابة الطالبة الموهوبة</h1>
          <p className="break-words text-sm leading-6 text-mute">مرحباً بك {student.name}</p>
        </div>
        <div className="flex gap-2">
          {THEMES.map((theme) => (
            <button key={theme.id} className="h-7 w-7 rounded-full border-2 border-white" type="button" aria-label={theme.label} style={{ background: theme.id === 'rose' ? '#e11d48' : theme.id === 'lilac' ? '#6d5efc' : theme.id === 'blossom' ? '#f472b6' : theme.id === 'dusk' ? '#6b21a8' : '#7c3aed' }} onClick={() => store.setTheme(theme.id)} />
          ))}
        </div>
        <button className="btn-ghost" type="button" onClick={store.logout}>خروج</button>
      </header>
      <div className="no-print mx-auto max-w-5xl px-4"><InstallApp /></div>
      <main className="mx-auto grid max-w-5xl gap-4 px-4 pb-10 lg:grid-cols-[.9fr_1.1fr]">
        <section className="no-print card p-5">
          <h2 className="mb-3 text-xl font-extrabold">الرسائل</h2>
          {notice && <div className="mb-3"><Banner>{notice}</Banner></div>}
          <div className="mb-3"><Banner>{store.cloud.message}</Banner></div>
          {messages.length === 0 ? <Empty text="لا توجد رسائل موجهة إليك حالياً." /> : (
            <div className="space-y-3">
              {messages.map((message) => (
                <article key={message.id} className="rounded-2xl bg-[var(--soft)] p-3">
                  <div className="mb-1 flex justify-between gap-2 text-sm"><b>{message.title}</b><span>{formatBothDateTime(message.createdAt)}</span></div>
                  <p className="text-sm leading-7">{message.body}</p>
                  {message.image && <img src={message.image} alt="" className="mt-2 max-h-40 rounded-xl" />}
                  {message.channel !== 'print-notice' && message.channel !== 'receipt-notice' && (
                    <button
                      className="btn-soft mt-3"
                      type="button"
                      disabled={Boolean(message.receivedAt)}
                      onClick={() => setNotice(store.acknowledgeMessage(message.id).message)}
                    >
                      {message.receivedAt ? 'تم إرسال إشعار الاستلام' : 'إرسال إشعار الاستلام'}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="space-y-3">
          <div className="no-print card p-4">
            <h2 className="font-extrabold">شهادتك</h2>
            <p className="mt-1 text-sm leading-7 text-mute">يمكنك طباعتها مباشرة، ويصل إشعار للنظام عند إغلاق نافذة الطباعة.</p>
            <button className="btn-primary mt-3" type="button" onClick={printCertificate}>طباعة الشهادة</button>
          </div>
          <Certificate settings={store.data.settings} student={student} courses={store.data.courses} users={store.data.users} />
        </section>
      </main>
    </div>
  );
}
