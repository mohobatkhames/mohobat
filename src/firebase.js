import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

function readEnv(name) {
  const runtime = typeof window !== 'undefined' ? window.__MOHOBAT_ENV__?.[name] : '';
  const bundled = import.meta.env?.[name] || '';
  const fromProcess = typeof process !== 'undefined' && process.env ? process.env[name] : '';
  return runtime || bundled || fromProcess || '';
}

const PLACEHOLDERS = new Set([
  'your_api_key',
  'your_app_id',
  'your_sender_id',
  'AIzaSyYourApiKeyHere',
  '1234567890',
  '1:1234567890:web:abcdef',
]);

// إعدادات مشروع Firebase. القيم الافتراضية تُستبدل بمتغيرات البيئة عند توفرها.
export const firebaseConfig = {
  apiKey: readEnv('REACT_APP_FIREBASE_API_KEY') || 'AIzaSyYourApiKeyHere',
  authDomain: readEnv('REACT_APP_FIREBASE_AUTH_DOMAIN') || 'mohobat-khames.firebaseapp.com',
  projectId: readEnv('REACT_APP_FIREBASE_PROJECT_ID') || 'mohobat-khames',
  storageBucket: readEnv('REACT_APP_FIREBASE_STORAGE_BUCKET') || 'mohobat-khames.appspot.com',
  messagingSenderId: readEnv('REACT_APP_FIREBASE_MESSAGING_SENDER_ID') || '1234567890',
  appId: readEnv('REACT_APP_FIREBASE_APP_ID') || '1:1234567890:web:abcdef',
};

export function isFirebaseConfigured() {
  const { apiKey, projectId, appId } = firebaseConfig;
  if (!apiKey || !projectId || !appId) return false;
  return ![apiKey, appId, firebaseConfig.messagingSenderId].some((value) => PLACEHOLDERS.has(String(value)));
}

let auth = null;
let db = null;
let app = null;

if (isFirebaseConfigured()) {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

export function getSecondaryAuth() {
  if (!isFirebaseConfigured()) return null;
  const existing = getApps().find((item) => item.name === 'secondary');
  const secondary = existing || initializeApp(firebaseConfig, 'secondary');
  return getAuth(secondary);
}

export function authEmail(nationalId, kind = 'staff') {
  const domain = kind === 'student' ? 'students.mohobat-khames.app' : 'mohobat-khames.app';
  return `${nationalId}@${domain}`;
}

export { auth, db };
export default app;
