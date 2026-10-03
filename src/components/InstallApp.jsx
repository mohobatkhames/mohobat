import { useEffect, useState } from 'react';
import { INSTALL_KEY, shouldOfferInstall } from '../lib/installState';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function rememberedInstall() {
  try {
    return localStorage.getItem(INSTALL_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberInstall() {
  try {
    localStorage.setItem(INSTALL_KEY, '1');
  } catch {
    /* يبقى الإخفاء لهذه الجلسة */
  }
}

function forgetInstall() {
  try {
    localStorage.removeItem(INSTALL_KEY);
  } catch {
    /* لا يوجد تخزين محلي */
  }
}

async function relatedInstallState() {
  if (typeof navigator.getInstalledRelatedApps !== 'function') return null;
  try {
    const manifestUrl = new URL('/manifest.webmanifest', window.location.origin).href;
    const manifest = await fetch(manifestUrl, { cache: 'no-store' }).then((response) => response.json());
    const listed = (manifest.related_applications || []).some((app) => app.platform === 'webapp' && app.url === manifestUrl);
    if (!listed) return null;
    const apps = await navigator.getInstalledRelatedApps();
    return apps.some((app) => app.platform === 'webapp');
  } catch {
    return null;
  }
}

export default function InstallApp({ compact = false }) {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone() || rememberedInstall());
  const [ios, setIos] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIos(isIos());

    const markInstalled = () => {
      rememberInstall();
      setInstalled(true);
      setPrompt(null);
    };

    const refresh = async () => {
      const standalone = isStandalone();
      const related = await relatedInstallState();
      if (cancelled) return;
      if (standalone || related === true) markInstalled();
      else if (related === false) {
        forgetInstall();
        setInstalled(false);
      } else {
        setInstalled(rememberedInstall());
      }
    };

    const onPrompt = (event) => {
      event.preventDefault();
      if (isStandalone() || rememberedInstall()) return;
      setPrompt(event);
    };
    const onInstalled = () => markInstalled();
    const media = window.matchMedia('(display-mode: standalone)');
    const onMode = () => {
      if (media.matches) markInstalled();
    };

    refresh();
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    media.addEventListener?.('change', onMode);
    return () => {
      cancelled = true;
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener?.('change', onMode);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') {
      rememberInstall();
      setInstalled(true);
      setPrompt(null);
    }
  };

  if (!shouldOfferInstall({ standalone: isStandalone(), related: installed ? true : null, remembered: installed })) return null;

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
        <p className="mt-2">على الآيفون: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».</p>
      )}
      {!ios && !prompt && (
        <p className="mt-2">من قائمة المتصفح اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</p>
      )}
    </section>
  );
}
