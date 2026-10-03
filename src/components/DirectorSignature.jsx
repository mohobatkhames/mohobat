import { useState } from 'react';
import { useStore } from '../context/Store';
import { Banner } from './ui';
import ScreenSignature from './ScreenSignature';

export default function DirectorSignature() {
  const { data, saveDirectorSignature } = useStore();
  const [note, setNote] = useState('');
  const [tone, setTone] = useState('ok');
  const settings = data.settings;

  const apply = (patch, message) => {
    const result = saveDirectorSignature(patch);
    setTone(result.ok ? 'ok' : 'bad');
    setNote(result.ok ? message : result.message);
    return result;
  };

  return (
    <>
      <ScreenSignature
        title="توقيع المديرة"
        signature={settings.signature}
        previewAlt="توقيع المديرة"
        emptyMessage="وقّع على اللوحة أولًا."
        onSave={(signature) => saveDirectorSignature({ signature })}
        onDelete={() => saveDirectorSignature({ signature: '', showSignatureOnCertificates: false, showSignatureOnReports: false })}
      />
      <div className="space-y-3">
        {note && <Banner tone={tone}>{note}</Banner>}
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={Boolean(settings.showSignatureOnCertificates)}
            onChange={(event) => apply({ showSignatureOnCertificates: event.target.checked }, event.target.checked ? 'سيظهر التوقيع في الشهادات.' : 'أُخفي التوقيع من الشهادات.')}
          />
          إظهار التوقيع في الشهادات
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={Boolean(settings.showSignatureOnReports)}
            onChange={(event) => apply({ showSignatureOnReports: event.target.checked }, event.target.checked ? 'سيظهر التوقيع في التقارير.' : 'أُخفي التوقيع من التقارير.')}
          />
          إظهار التوقيع في التقارير
        </label>
      </div>
    </>
  );
}
