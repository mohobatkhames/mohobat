import { useMemo, useState } from 'react';
import { DEFAULT_WHATSAPP_NUMBER, openWhatsAppChats, whatsappLabel, whatsappLink, whatsappRecipients } from '../lib/whatsapp';
import { useStore } from '../context/Store';
import { Banner } from './ui';

const AUDIENCES = [
  ['all', 'الجميع', 'الطالبات ومنسوبات المركز'],
  ['students', 'الطالبات', 'أرقام الطالبات أو أولياء الأمور'],
  ['staff', 'منسوبات المركز', 'المديرة والمعلمات والموظفات'],
];

export default function WhatsAppSend({ students = [], title = 'إرسال واتساب', preset = '' }) {
  const { data, sendMessage } = useStore();
  const [audience, setAudience] = useState('all');
  const [text, setText] = useState(preset);
  const [note, setNote] = useState('');
  const [tone, setTone] = useState('ok');
  const [prepared, setPrepared] = useState([]);
  const sender = data.settings.whatsappNumber || DEFAULT_WHATSAPP_NUMBER;
  const label = whatsappLabel(sender);
  const recipients = useMemo(
    () => whatsappRecipients(audience, students, data.users),
    [audience, students, data.users],
  );

  const send = (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body) {
      setTone('bad');
      setNote('اكتب نص رسالة الواتساب.');
      setPrepared([]);
      return;
    }
    if (recipients.length === 0) {
      setTone('bad');
      setNote('لا توجد أرقام واتساب مسجلة لهذه الفئة.');
      setPrepared([]);
      return;
    }
    const message = `${body}\n\nمن واتساب المركز: ${label.international}`;
    const chats = recipients.map((person) => ({
      ...person,
      href: whatsappLink(person.phone, message),
    }));
    const result = openWhatsAppChats(chats.slice(0, 1), message);
    sendMessage({
      channel: 'whatsapp',
      title: 'رسالة واتساب',
      body: message,
      recipientIds: recipients.map((person) => person.id),
      recipientLabels: recipients.map((person) => `${person.name} · ${person.phone}`),
    });
    setPrepared(chats);
    setTone(result.opened ? 'ok' : 'bad');
    setNote(result.opened
      ? `فُتحت محادثة واتساب لـ ${chats[0].name}. أكمل الإرسال بالضغط على إرسال داخل واتساب.`
      : 'منع النوافذ لم يفتح واتساب. استخدم زر فتح المحادثة أمام الاسم.');
  };

  return (
    <form className="no-print card space-y-4 p-5" onSubmit={send}>
      <div>
        <h3 className="text-lg font-extrabold">{title}</h3>
        <p className="mt-1 text-sm leading-7 text-mute">
          إرسال مجاني من رقم المركز المعتمد
          {' '}
          <span dir="ltr">{label.local}</span>
          {' '}
          (<span dir="ltr">{label.international}</span>).
          تُفتح المحادثة جاهزة، ثم يُضغط إرسال داخل واتساب.
        </p>
      </div>
      {note && <Banner tone={tone}>{note}</Banner>}
      <div>
        <span className="label">الفئة المستهدفة</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {AUDIENCES.map(([id, name, detail]) => (
            <button
              key={id}
              type="button"
              className={audience === id ? 'btn-primary text-right' : 'btn-soft text-right'}
              aria-pressed={audience === id}
              onClick={() => { setAudience(id); setPrepared([]); }}
            >
              <span className="block">{name}</span>
              <span className="mt-1 block text-xs font-semibold leading-5 opacity-80">{detail}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm leading-7 text-mute">العدد الجاهز للإرسال: {recipients.length}</p>
      <ul className="max-h-48 space-y-2 overflow-auto">
        {recipients.length === 0 && <li className="text-sm text-mute">لا توجد أرقام في هذه الفئة.</li>}
        {recipients.map((person) => (
          <li key={person.phone} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--soft)] px-3 py-2 text-sm">
            <span>{person.name}</span>
            <span dir="ltr">{person.phone}</span>
          </li>
        ))}
      </ul>
      <label className="block">
        <span className="label">نص الرسالة</span>
        <textarea className="field min-h-28" value={text} onChange={(event) => setText(event.target.value)} placeholder="اكتب رسالة الواتساب" />
      </label>
      <button className="btn-primary" type="submit">إرسال عبر واتساب</button>
      {prepared.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm font-bold">بقية المحادثات، محادثة في كل ضغطة:</p>
          {prepared.slice(1).map((person) => (
            <a key={person.phone} className="btn-soft inline-flex" href={person.href} target="_blank" rel="noopener noreferrer">
              فتح واتساب: {person.name}
            </a>
          ))}
        </div>
      )}
      {prepared.length === 1 && tone === 'bad' && (
        <a className="btn-soft inline-flex" href={prepared[0].href} target="_blank" rel="noopener noreferrer">
          فتح واتساب: {prepared[0].name}
        </a>
      )}
    </form>
  );
}
