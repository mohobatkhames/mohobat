import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const PROJECT_ID = 'mohopat-khames';
const APP_NAME = 'mohopat-khames';
const SECONDARY_NAME = 'mohopat-khames-auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAwUnhggjPjBO7ueKT-nAIglXCA6UMvmuk',
  authDomain: 'mohopat-khames.firebaseapp.com',
  projectId: PROJECT_ID,
  storageBucket: 'mohopat-khames.firebasestorage.app',
  messagingSenderId: '516643270399',
  appId: '1:516643270399:web:2175dc649a2006a39426ca',
};

function openProjectApp(name) {
  const found = getApps().find((item) => item.name === name);
  if (found) {
    if (found.options?.projectId !== PROJECT_ID) {
      throw new Error('مشروع Firebase لا يطابق قاعدة موهوبات.');
    }
    return found;
  }
  return initializeApp(firebaseConfig, name);
}

const app = openProjectApp(APP_NAME);

export const db = getFirestore(app);
export const auth = getAuth(app);

export function databaseGuard() {
  const projectId = app?.options?.projectId;
  const authProject = auth?.app?.options?.projectId;
  const dbProject = db?.app?.options?.projectId;
  if (projectId === PROJECT_ID && authProject === PROJECT_ID && dbProject === PROJECT_ID) return '';
  return 'توقفت المزامنة لأن الاتصال ليس بقاعدة مشروع موهوبات.';
}

export function readFirebaseConfig() {
  return firebaseConfig;
}

export function isFirebaseConfigured() {
  return true;
}

export function ensureFirebase() {
  return app;
}

export function getSecondaryAuth() {
  return getAuth(openProjectApp(SECONDARY_NAME));
}

export function authEmail(nationalId, kind = 'staff') {
  const domain = kind === 'student' ? 'students.mohobat-khames.app' : 'mohobat-khames.app';
  return `${nationalId}@${domain}`;
}

export { firebaseConfig };
export default app;
