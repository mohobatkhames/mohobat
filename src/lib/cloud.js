import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { auth, authEmail, db, ensureFirebase, getSecondaryAuth, isFirebaseConfigured } from '../firebase';
import { cloudSettings } from './gateway';

export function canSync() {
  ensureFirebase();
  return Boolean(isFirebaseConfigured() && db && auth?.currentUser);
}

function clean(record) {
  if (Array.isArray(record)) return record.map(clean);
  if (!record || typeof record !== 'object') return record;
  const copy = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === 'password' || key === 'pendingSync' || value === undefined) continue;
    copy[key] = clean(value);
  }
  return copy;
}

async function writeChunks(items, size, write) {
  for (let index = 0; index < items.length; index += size) {
    await Promise.all(items.slice(index, index + size).map(write));
  }
}

export async function signInCloud(nationalId, password, kind) {
  ensureFirebase();
  if (!isFirebaseConfigured() || !auth) return { ok: false, skipped: true, message: 'مفاتيح Firebase غير مكتملة في متغيرات البيئة.' };
  const email = authEmail(nationalId, kind);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { ok: true };
  } catch (error) {
    const missing = ['auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials'];
    if (!missing.includes(error.code)) {
      return { ok: false, message: `تعذر الاتصال بمصادقة Firebase. (${error.code || 'unknown'})` };
    }
    try {
      const secondary = getSecondaryAuth();
      await createUserWithEmailAndPassword(secondary, email, password);
      await signOut(secondary);
      await signInWithEmailAndPassword(auth, email, password);
      return { ok: true, created: true };
    } catch (createError) {
      if (createError.code === 'auth/email-already-in-use') {
        return { ok: false, message: 'الحساب السحابي بكلمة مرور مختلفة.' };
      }
      return { ok: false, message: 'تعذرت مزامنة الدخول مع Firebase.' };
    }
  }
}

export async function ensureProfile(profile) {
  if (!canSync()) return;
  const uid = auth.currentUser.uid;
  await setDoc(doc(db, 'users', uid), {
    ...clean(profile),
    uid,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function provisionAccount(nationalId, password, profile, kind = 'staff') {
  if (!canSync()) return;
  const secondary = getSecondaryAuth();
  let uid = null;
  try {
    const cred = await createUserWithEmailAndPassword(secondary, authEmail(nationalId, kind), password);
    uid = cred.user.uid;
    await signOut(secondary);
  } catch (error) {
    if (error.code !== 'auth/email-already-in-use') return;
  }
  if (!uid) return;
  await setDoc(doc(db, 'users', uid), { ...clean(profile), uid, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function writeCloud(collectionName, id, data) {
  ensureFirebase();
  if (!canSync()) return;
  const payload = clean(data);
  if (payload.image && String(payload.image).length > 700000) delete payload.image;
  await setDoc(doc(db, collectionName, String(id)), payload, { merge: true });
}

export async function removeCloud(collectionName, id) {
  if (!canSync()) return;
  await deleteDoc(doc(db, collectionName, String(id)));
}

export async function pushSnapshot(state) {
  if (!canSync()) return;
  const parts = cloudSettings(state.settings);
  await writeCloud('settings', 'general', parts.general);
  await writeCloud('settings', 'security', parts.security);
  await writeChunks(state.students, 40, (student) => writeCloud('students', student.nationalId, { ...student, id: student.nationalId }));
  await writeChunks(state.courses, 40, (course) => writeCloud('courses', course.id, course));
  await writeChunks(state.messages, 40, (message) => writeCloud('messages', message.id, message));
  await writeChunks(state.certificates, 40, (item) => writeCloud('certificates', item.id, item));
  await writeChunks(state.archive || [], 40, (item) => writeCloud('archive', item.id, item));
  await writeChunks(Object.entries(state.attendance), 40, ([date, absent]) => writeCloud('attendance', date, { date, absent, updatedAt: new Date().toISOString() }));
}

function revive(value) {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === 'object') {
    const next = {};
    for (const [key, item] of Object.entries(value)) next[key] = revive(item);
    return next;
  }
  return value;
}

function watch(ref, onData, onError) {
  return onSnapshot(ref, (snap) => {
    const rows = snap.docs
      ? snap.docs.map((item) => revive({ id: item.id, ...item.data() }))
      : snap.exists() ? [revive({ id: snap.id, ...snap.data() })] : [];
    onData(rows);
  }, onError);
}

export function subscribe(session, onData, onError) {
  ensureFirebase();
  if (!db || !session) return () => {};
  const stops = [];
  const student = session.role === 'student';

  if (session.role === 'trainer') {
    const uid = auth?.currentUser?.uid;
    if (uid) stops.push(watch(doc(db, 'users', uid), (rows) => onData({ users: rows }), onError));
    return () => stops.forEach((stop) => stop());
  }

  stops.push(watch(doc(db, 'settings', 'general'), (rows) => onData({ settings: rows[0] || null }), onError));
  if (!student) {
    stops.push(watch(doc(db, 'settings', 'security'), (rows) => onData({ security: rows[0] || null }), onError));
  }

  const studentsRef = student
    ? query(collection(db, 'students'), where('nationalId', '==', session.nationalId))
    : collection(db, 'students');
  stops.push(watch(studentsRef, (rows) => onData({ students: rows }), onError));

  const messagesRef = student
    ? query(collection(db, 'messages'), where('recipientIds', 'array-contains', session.nationalId))
    : collection(db, 'messages');
  stops.push(watch(messagesRef, (rows) => onData({ messages: rows }), onError));

  const certificatesRef = student
    ? query(collection(db, 'certificates'), where('nationalId', '==', session.nationalId))
    : collection(db, 'certificates');
  stops.push(watch(certificatesRef, (rows) => onData({ certificates: rows }), onError));

  if (!student) {
    stops.push(watch(collection(db, 'courses'), (rows) => onData({ courses: rows }), onError));
    stops.push(watch(collection(db, 'attendance'), (rows) => onData({ attendance: rows }), onError));
    stops.push(watch(collection(db, 'users'), (rows) => onData({ users: rows }), onError));
    stops.push(watch(collection(db, 'archive'), (rows) => onData({ archive: rows }), onError));
  } else {
    stops.push(watch(collection(db, 'courses'), (rows) => onData({ courses: rows }), onError));
    stops.push(watch(query(collection(db, 'users'), where('role', '==', 'trainer')), (rows) => onData({ users: rows }), onError));
  }

  return () => stops.forEach((stop) => stop());
}

export function watchAuth(callback) {
  ensureFirebase();
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export async function currentCloudUser() {
  ensureFirebase();
  if (!auth) return null;
  if (typeof auth.authStateReady === 'function') await auth.authStateReady();
  return auth.currentUser || null;
}

export async function cloudSignOut() {
  if (auth?.currentUser) await signOut(auth);
}
