import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

function readEnv(name) {
  const runtime = typeof window !== 'undefined' ? window.__MOHOBAT_ENV__?.[name] : '';
  const bundled = import.meta.env?.[name] || '';
  const fromProcess = typeof process !== 'undefined' && process.env ? process.env[name] : '';
  return String(runtime || bundled || fromProcess || '').trim();
}

const PLACEHOLDERS = new Set([
  'your_api_key',
  'your_app_id',
  'your_sender_id',
  'AIzaSyYourApiKeyHere',
  '1234567890',
  '1:1234567890:web:abcdef',
]);

export function readFirebaseConfig() {
  return {
    apiKey: readEnv('REACT_APP_FIREBASE_API_KEY'),
    authDomain: readEnv('REACT_APP_FIREBASE_AUTH_DOMAIN') || 'mohobat-khames.firebaseapp.com',
    projectId: readEnv('REACT_APP_FIREBASE_PROJECT_ID') || 'mohobat-khames',
    storageBucket: readEnv('REACT_APP_FIREBASE_STORAGE_BUCKET') || 'mohobat-khames.appspot.com',
    messagingSenderId: readEnv('REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readEnv('REACT_APP_FIREBASE_APP_ID'),
  };
}

export const firebaseConfig = readFirebaseConfig();

export function isFirebaseConfigured() {
  const config = readFirebaseConfig();
  if (!config.apiKey || !config.projectId || !config.appId || !config.messagingSenderId) return false;
  return ![config.apiKey, config.appId, config.messagingSenderId].some((value) => PLACEHOLDERS.has(String(value)));
}

let auth = null;
let db = null;
let app = null;

export function ensureFirebase() {
  if (!isFirebaseConfigured()) return null;
  if (app && auth && db) return app;
  const config = readFirebaseConfig();
  const existing = getApps().find((item) => item.name === '[DEFAULT]');
  app = existing || initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  return app;
}

export function getSecondaryAuth() {
  if (!ensureFirebase()) return null;
  const config = readFirebaseConfig();
  const existing = getApps().find((item) => item.name === 'secondary');
  const secondary = existing || initializeApp(config, 'secondary');
  return getAuth(secondary);
}

export function authEmail(nationalId, kind = 'staff') {
  const domain = kind === 'student' ? 'students.mohobat-khames.app' : 'mohobat-khames.app';
  return `${nationalId}@${domain}`;
}

ensureFirebase();

export { auth, db };
export default app;
