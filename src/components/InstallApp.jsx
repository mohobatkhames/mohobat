import { useEffect, useState } from 'react';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function InstallApp({ compact = false }) {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIos());
    const onPrompt = (event) => {
      event.preventDefault();
      setPrompt(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') setPrompt(null);
  };

  if (compact) {
    if (!prompt) return null;
    return (
      <button className="btn-soft" type="button" onClick={install}>تثبيت التطبيق</button>
    );
  }

  return (
    <section className="install-card" aria-label="تثبيت التطبيق">
      <h2>تثبيت التطبيق</h2>
      <p>يمكن تثبيت النظام على الكمبيوتر وعلى أجهزة أندرويد وآيفون، ويعمل من أيقونته الخاصة.</p>
      {prompt && (
        <button className="btn-primary mt-3 w-full" type="button" onClick={install}>تثبيت على هذا الجهاز</button>
      )}
      {ios && (
        <p className="mt-2">على الآيفون: اضغطي زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».</p>
      )}
      {!ios && !prompt && (
        <p className="mt-2">من قائمة المتصفح اختاري «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</p>
      )}
    </section>
  );
}
