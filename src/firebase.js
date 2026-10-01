import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

function readEnv(name) {
  const runtime = typeof window !== 'undefined' ? window.__MOHOBAT_ENV__?.[name] : '';
  const bundled = import.meta.env[name] || '';
  const value = runtime && !String(runtime).includes('your_') ? runtime : bundled;
  return value || '';
}

export const firebaseConfig = {
  apiKey: readEnv('REACT_APP_FIREBASE_API_KEY'),
  authDomain: readEnv('REACT_APP_FIREBASE_AUTH_DOMAIN'),
  projectId: readEnv('REACT_APP_FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('REACT_APP_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('REACT_APP_FIREBASE_APP_ID'),
};

export function isFirebaseConfigured() {
  const { apiKey, projectId, appId } = firebaseConfig;
  if (!apiKey || !projectId || !appId) return false;
  const placeholders = ['your_api_key', 'your_app_id', 'your_sender_id'];
  return ![apiKey, appId].some((value) => placeholders.includes(String(value)));
}

let auth = null;
let db = null;

if (isFirebaseConfigured()) {
  try {
    const app = getApps().find((item) => item.name === '[DEFAULT]') || initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (error) {
    console.warn('Firebase init failed', error);
    auth = null;
    db = null;
  }
}

export function getSecondaryAuth() {
  if (!isFirebaseConfigured()) return null;
  const existing = getApps().find((app) => app.name === 'secondary');
  const app = existing || initializeApp(firebaseConfig, 'secondary');
  return getAuth(app);
}

export function authEmail(nationalId, kind = 'staff') {
  const domain = kind === 'student' ? 'students.mohobat-khames.app' : 'mohobat-khames.app';
  return `${nationalId}@${domain}`;
}

export { auth, db };
