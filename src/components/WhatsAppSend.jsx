import { useMemo, useState } from 'react';
import { DEFAULT_WHATSAPP_NUMBER, openWhatsAppChats, whatsappRecipients } from '../lib/whatsapp';
import { useStore } from '../context/Store';
import { Banner } from './ui';

const AUDIENCES = [
  ['all', 'الجميع'],
  ['students', 'الطالبات فقط'],
  ['staff', 'منسوبات المركز'],
];

export default function WhatsAppSend({ students = [], title = 'إرسال واتساب', preset = '' }) {
  const { data, sendMessage } = useStore();
  const [audience, setAudience] = useState('all');
  const [text, setText] = useState(preset);
  const [note, setNote] = useState('');
  const [tone, setTone] = useState('ok');
  const sender = data.settings.whatsappNumber || DEFAULT_WHATSAPP_NUMBER;
  const recipients = useMemo(
    () => whatsappRecipients(audience, students, data.users),
    [audience, students, data.users],
  );

  const send = (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body) {
      setTone('bad');
      setNote('اكتبي نص رسالة الواتساب.');
      return;
    }
    if (recipients.length === 0) {
      setTone('bad');
      setNote('لا توجد أرقام واتساب مسجلة لهذه الفئة.');
      return;
    }
    const message = `${body}\n\nمن واتساب المركز: ${sender}`;
    const result = openWhatsAppChats(recipients, message);
    sendMessage({
      channel: 'whatsapp',
      title: 'رسالة واتساب',
      body: message,
      recipientIds: recipients.map((person) => person.id),
      recipientLabels: recipients.map((person) => `${person.name} · ${person.phone}`),
    });
    setTone(result.opened ? 'ok' : 'bad');
    setNote(result.opened
      ? `فُتحت محادثات واتساب لـ ${result.opened} من ${result.total} رقماً مسجلاً.`
      : 'منع المتصفح فتح واتساب. اسمحي بالنوافذ المنبثقة ثم أعيدي الإرسال.');
  };

  return (
    <form className="no-print card space-y-3 p-5" onSubmit={send}>
      <div>
        <h3 className="text-lg font-extrabold">{title}</h3>
        <p className="mt-1 text-sm leading-7 text-mute">يُفتح واتساب لكل رقم مسجل في الفئة المختارة. رقم المركز المعتمد: <span dir="ltr">{sender}</span></p>
      </div>
      {note && <Banner tone={tone}>{note}</Banner>}
      <label className="block">
        <span className="label">المستهدفون</span>
        <select className="field" value={audience} onChange={(event) => setAudience(event.target.value)}>
          {AUDIENCES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <p className="text-xs leading-6 text-mute">
        منسوبات المركز: المديرة، المعلمات، والموظفات. العدد الجاهز الآن: {recipients.length}
      </p>
      <label className="block">
        <span className="label">نص الرسالة</span>
        <textarea className="field min-h-28" value={text} onChange={(event) => setText(event.target.value)} placeholder="اكتبي رسالة الواتساب" />
      </label>
      <button className="btn-primary" type="submit">إرسال عبر واتساب</button>
    </form>
  );
}
