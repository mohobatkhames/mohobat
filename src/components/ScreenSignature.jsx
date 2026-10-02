import { useEffect, useRef, useState } from 'react';
import { signatureFromFile, trimSignatureUrl } from '../lib/signature';
import { Banner } from './ui';

export default function ScreenSignature({
  title,
  signature = '',
  previewAlt = 'التوقيع',
  emptyMessage = 'التوقيع على اللوحة مطلوب قبل الحفظ.',
  savedMessage = 'حُفظ التوقيع المرسوم على الشاشة.',
  uploadedMessage = 'أُضيفت صورة التوقيع بعد إزالة الخلفية.',
  deletedMessage = 'حُذف التوقيع.',
  onSave,
  onDelete,
  children,
}) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [note, setNote] = useState('');
  const [tone, setTone] = useState('ok');

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.lineWidth = 2.6;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#1c1917';
  }, []);

  const point = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const start = (event) => {
    const canvas = canvasRef.current;
    canvas.setPointerCapture(event.pointerId);
    drawing.current = true;
    const context = canvas.getContext('2d');
    const place = point(event);
    context.beginPath();
    context.moveTo(place.x, place.y);
  };

  const move = (event) => {
    if (!drawing.current) return;
    const place = point(event);
    const context = canvasRef.current.getContext('2d');
    context.lineTo(place.x, place.y);
    context.stroke();
    context.beginPath();
    context.moveTo(place.x, place.y);
  };

  const stop = () => {
    drawing.current = false;
  };

  const inked = () => {
    const canvas = canvasRef.current;
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 3; index < pixels.length; index += 16) {
      if (pixels[index] > 0) return true;
    }
    return false;
  };

  const finish = (result, successText) => {
    const ok = result?.ok !== false;
    setTone(ok ? 'ok' : 'bad');
    setNote(ok ? successText : (result?.message || 'تعذر حفظ التوقيع.'));
  };

  const saveDrawing = async () => {
    if (!inked()) {
      setTone('bad');
      setNote(emptyMessage);
      return;
    }
    const trimmed = await trimSignatureUrl(canvasRef.current.toDataURL('image/png'));
    if (!trimmed) {
      setTone('bad');
      setNote(emptyMessage);
      return;
    }
    finish(onSave(trimmed), savedMessage);
  };

  const clearPad = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setTone('bad');
      setNote('اختاري ملف صورة للتوقيع.');
      return;
    }
    try {
      const next = await signatureFromFile(file);
      finish(onSave(next), uploadedMessage);
    } catch (error) {
      setTone('bad');
      setNote(error.message || 'تعذرت معالجة الصورة.');
    }
  };

  return (
    <section className="space-y-3 border-t border-[var(--line)] pt-4">
      <h4 className="text-lg font-extrabold">{title}</h4>
      {note && <Banner tone={tone}>{note}</Banner>}
      <canvas
        ref={canvasRef}
        className="signature-pad"
        width="720"
        height="220"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
      />
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" type="button" onClick={saveDrawing}>حفظ التوقيع من الشاشة</button>
        <button className="btn-ghost" type="button" onClick={clearPad}>مسح اللوحة</button>
      </div>
      <label className="btn-soft inline-flex cursor-pointer">
        إضافة صورة للتوقيع
        <input className="hidden" type="file" accept="image/*" onChange={upload} />
      </label>
      <p className="text-xs leading-6 text-mute">تُزال خلفية الصورة ويبقى حبر التوقيع فقط، ويظهر في مكانه على الشهادة.</p>
      {signature && (
        <div className="rounded-2xl bg-[var(--soft)] p-3 text-center">
          <img className="signature-image mx-auto" src={signature} alt={previewAlt} />
          <button className="btn-danger mt-3" type="button" onClick={() => finish(onDelete(), deletedMessage)}>حذف التوقيع</button>
        </div>
      )}
      {children}
    </section>
  );
}
