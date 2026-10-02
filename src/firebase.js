import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAwUnhggjPjBO7ueKT-nAIglXCA6UMvmuk',
  authDomain: 'mohopat-khames.firebaseapp.com',
  projectId: 'mohopat-khames',
  storageBucket: 'mohopat-khames.firebasestorage.app',
  messagingSenderId: '516643270399',
  appId: '1:516643270399:web:2175dc649a2006a39426ca',
};

const existing = getApps().find((item) => item.name === '[DEFAULT]');
const app = existing || initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

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
  const named = getApps().find((item) => item.name === 'secondary');
  const secondary = named || initializeApp(firebaseConfig, 'secondary');
  return getAuth(secondary);
}

export function authEmail(nationalId, kind = 'staff') {
  const domain = kind === 'student' ? 'students.mohobat-khames.app' : 'mohobat-khames.app';
  return `${nationalId}@${domain}`;
}

export { firebaseConfig };
export default app;
