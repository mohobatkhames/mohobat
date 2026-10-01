import { useState } from 'react';
import { Banner, Field, Modal } from './ui';

export default function Composer({ title, recipients, channels, onClose, onSend }) {
  const [channel, setChannel] = useState(channels[0]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const ready = recipients.filter((person) => {
    if (channel === 'email') return person.email;
    if (channel === 'sms') return person.phone;
    return true;
  });

  const pickImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('المرفق يجب أن يكون صورة.');
      return;
    }
    if (file.size > 300 * 1024) {
      setError('حجم الصورة أكبر من 300 كيلوبايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const send = () => {
    if (!body.trim()) {
      setError('نص الرسالة مطلوب.');
      return;
    }
    if (ready.length === 0) {
      setError('لا توجد مستقبلات مكتملة البيانات لهذه القناة.');
      return;
    }
    onSend({
      channel,
      title: subject || title,
      body,
      image,
      recipientIds: ready.map((person) => person.id),
      recipientLabels: ready.map((person) => person.label || person.name),
    });
    if (channel === 'email') {
      const bcc = ready.map((person) => person.email).join(',');
      window.open(`mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject || title)}&body=${encodeURIComponent(body)}`, '_blank');
    }
    if (channel === 'sms') {
      const phones = ready.map((person) => person.phone).join(',');
      window.open(`sms:${phones}?&body=${encodeURIComponent(body)}`, '_blank');
    }
    onClose();
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {channels.map((item) => (
            <button key={item} className={channel === item ? 'btn-primary' : 'btn-ghost'} type="button" onClick={() => setChannel(item)}>
              {item === 'internal' ? 'رسالة داخلية' : item === 'email' ? 'بريد إلكتروني' : 'SMS لأولياء الأمور'}
            </button>
          ))}
        </div>
        <Field label="عنوان الرسالة"><input className="field" value={subject} onChange={(event) => setSubject(event.target.value)} /></Field>
        <Field label="النص"><textarea className="field min-h-32" value={body} onChange={(event) => setBody(event.target.value)} /></Field>
        {channel !== 'sms' && (
          <Field label="إرفاق صورة">
            <input className="field" type="file" accept="image/*" onChange={pickImage} />
          </Field>
        )}
        {image && <img src={image} alt="مرفق الرسالة" className="max-h-40 rounded-2xl" />}
        <p className="text-sm text-mute">المستلمات الجاهزات: {ready.length} من {recipients.length}</p>
        {error && <Banner tone="bad">{error}</Banner>}
        {!confirming ? (
          <button className="btn-primary w-full" type="button" onClick={() => setConfirming(true)}>مراجعة الإرسال</button>
        ) : (
          <div className="rounded-2xl bg-[var(--soft)] p-4">
            <p className="mb-3 font-bold">تأكيد إرسال الرسالة إلى {ready.length}؟</p>
            <div className="flex gap-2">
              <button className="btn-primary" type="button" onClick={send}>تأكيد الإرسال</button>
              <button className="btn-ghost" type="button" onClick={() => setConfirming(false)}>رجوع</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
