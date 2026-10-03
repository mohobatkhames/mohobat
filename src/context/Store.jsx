import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { GRADES, OWNER_ID, OWNER_PASSWORD, activeTheme, feminineJob, isManager, jobRole } from '../lib/constants';
import { cloudSignOut, currentCloudUser, ensureProfile, provisionAccount, pushSnapshot, readOwnProfile, removeCloud, signInCloud, signInExisting, subscribe, syncBlockMessage, watchAuth, writeCloud } from '../lib/cloud';
import { databaseGuard } from '../firebase';
import { nowIso, todayISO, weekdayName, formatHijri } from '../lib/dates';
import { normalizeId, tempPassword, uid } from '../lib/ids';
import { cloudSettings, normalizeGateway } from '../lib/gateway';
import { loginWithDeviceFingerprint, registerFingerprint } from '../lib/webauthn';

const LOCAL_KEY = 'mohobat-khames-db-v1';
const SESSION_KEY = 'mohobat-khames-session';
const ATTEMPTS_KEY = 'mohobat-attempts';
const StoreContext = createContext(null);

function ownerRecord() {
  return {
    nationalId: OWNER_ID,
    name: 'عبدالله الشهراني - أبو نايف',
    role: 'owner',
    job: 'مالك',
    phone: '',
    email: '',
    joinDate: todayISO(),
    password: OWNER_PASSWORD,
    usesDefaultPassword: false,
    updatedAt: nowIso(),
  };
}

function defaultState() {
  return {
    settings: {
      administrationName: 'الإدارة العامة للتعليم بمنطقة عسير',
      centerName: 'مركز الموهوبات بخميس مشيط',
      semester: 'الفصل الدراسي الأول',
      academicYear: '1447 / 1448',
      defaultPassword: '123456',
      signature: '',
      showSignatureOnCertificates: false,
      showSignatureOnReports: false,
      whatsappNumber: '966559820932',
      gateway: {
        enabled: false,
        apiUrl: '',
        apiKey: '',
        senderId: '',
        sms: true,
        whatsapp: true,
      },
      updatedAt: nowIso(),
    },
    users: [ownerRecord()],
    students: [],
    attendance: {},
    courses: [],
    messages: [],
    certificates: [],
    archive: [],
    theme: 'navy',
    mode: 'day',
    privacyAccepted: false,
  };
}

function withOwner(state) {
  const users = state.users || [];
  const owner = users.find((user) => user.role === 'owner' || user.nationalId === OWNER_ID);
  if (!owner) return { ...state, users: [ownerRecord(), ...users] };
  if (owner.name === 'مالك النظام') {
    return {
      ...state,
      users: users.map((user) => (user.role === 'owner' || user.nationalId === OWNER_ID)
        ? { ...user, name: 'عبدالله الشهراني - أبو نايف' }
        : user),
    };
  }
  return state;
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
    if (!parsed) return defaultState();
    const base = defaultState();
    return withOwner({
      ...base,
      ...parsed,
      settings: {
        ...base.settings,
        ...(parsed.settings || {}),
        gateway: normalizeGateway({ ...base.settings.gateway, ...(parsed.settings?.gateway || {}) }),
      },
      users: (parsed.users || base.users).map((user) => ({ ...user, job: feminineJob(user.job) })),
      students: parsed.students || [],
      attendance: parsed.attendance || {},
      courses: parsed.courses || [],
      messages: parsed.messages || [],
      certificates: parsed.certificates || [],
      archive: parsed.archive || [],
    });
  } catch {
    return defaultState();
  }
}

function sessionFrom(user) {
  return {
    nationalId: user.nationalId,
    name: user.name,
    role: user.role,
    job: user.job || '',
    email: user.email || '',
  };
}

const UNREGISTERED = 'غير مصرح بالدخول. هذا السجل غير مسجل في النظام.';
const CLOUD_LOGIN_FAIL = 'تعذر الدخول من هذا الجهاز. يُقبل السجل إذا كان منشوراً في قاعدة المشروع، وبكلمة المرور المحفوظة عند إنشاء الحساب. كلمة المرور الافتراضية تعمل إلى أن تُغيَّر. إذا استمر الرفض، أعيدي حفظ الحساب من جهاز المالك بعد ظهور «تمت المزامنة مع Firestore».';

function expectedStaffPassword(user, settings) {
  const fallback = settings.defaultPassword || '123456';
  if (user?.usesDefaultPassword === false && user.password) return user.password;
  return fallback;
}

function markPublished(state, published = []) {
  if (!published.length) return state;
  const staffIds = new Set(published.filter((item) => item.kind === 'staff').map((item) => item.nationalId));
  const studentIds = new Set(published.filter((item) => item.kind === 'student').map((item) => item.nationalId));
  return {
    ...state,
    users: state.users.map((user) => (staffIds.has(user.nationalId) ? { ...user, authPublished: true } : user)),
    students: state.students.map((student) => (studentIds.has(student.nationalId) ? { ...student, authPublished: true } : student)),
  };
}

function registeredStaff(state, nationalId) {
  const id = normalizeId(nationalId);
  if (id.length !== 10) return null;
  return state.users.find((item) => normalizeId(item.nationalId) === id && item.role !== 'student') || null;
}

function registeredStudent(state, nationalId) {
  const id = normalizeId(nationalId);
  if (id.length !== 10) return null;
  return state.students.find((item) => normalizeId(item.nationalId) === id) || null;
}

function readAttempts() {
  try {
    return JSON.parse(sessionStorage.getItem(ATTEMPTS_KEY) || '{}');
  } catch {
    return {};
  }
}

function newer(item, prev) {
  return String(item?.updatedAt || '') >= String(prev?.updatedAt || '');
}

function mergeList(current = [], incoming = [], key, allowDelete) {
  const map = new Map(current.map((item) => [String(item[key]), item]));
  const seen = new Set();
  for (const item of incoming) {
    const id = String(item[key] || item.id || '');
    if (!id) continue;
    seen.add(id);
    const prev = map.get(id);
    if (!prev || newer(item, prev)) {
      const next = { ...prev, ...item, password: prev?.password ?? item.password };
      delete next.pendingSync;
      map.set(id, next);
    }
  }
  if (allowDelete) {
    for (const id of [...map.keys()]) {
      if (!seen.has(id) && !map.get(id)?.pendingSync) map.delete(id);
    }
  }
  return [...map.values()];
}

function mergeUsers(current, incoming, defaultPassword) {
  const map = new Map(current.map((item) => [item.nationalId, item]));
  for (const item of incoming) {
    if (!item.nationalId || item.role === 'student') continue;
    const prev = map.get(item.nationalId);
    if (!prev) {
      map.set(item.nationalId, {
        ...item,
        job: feminineJob(item.job),
        password: item.role === 'owner' ? OWNER_PASSWORD : defaultPassword,
        usesDefaultPassword: item.role !== 'owner',
      });
    } else if (newer(item, prev)) {
      map.set(item.nationalId, {
        ...prev,
        ...item,
        job: feminineJob(item.job || prev.job),
        password: prev.password,
        usesDefaultPassword: prev.usesDefaultPassword,
      });
    }
  }
  return [...map.values()];
}

export function StoreProvider({ children }) {
  const [data, setData] = useState(loadState);
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [savedAt, setSavedAt] = useState(null);
  const [cloud, setCloud] = useState(() => {
    const blocked = databaseGuard();
    if (blocked) return { mode: 'error', message: blocked };
    let signedIn = false;
    try {
      signedIn = Boolean(JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'));
    } catch {
      signedIn = false;
    }
    if (signedIn) return { mode: 'signing', message: 'جاري تسجيل الدخول' };
    return { mode: 'ready', message: 'Firestore جاهز. تبدأ المزامنة المباشرة بعد تسجيل الدخول.' };
  });
  const dataRef = useRef(data);
  const allowDeleteRef = useRef(false);
  dataRef.current = data;

  const commit = (next) => {
    dataRef.current = next;
    setData(next);
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      setSavedAt(new Date().toISOString());
    } catch {
      setCloud({ mode: 'error', message: 'تعذرت تهيئة البيانات في المتصفح.' });
    }
  };

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme(data.theme);
    document.documentElement.dataset.mode = data.mode === 'night' ? 'night' : 'day';
  }, [data.theme, data.mode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(dataRef.current));
        setSavedAt(new Date().toISOString());
      } catch {
        setCloud({ mode: 'error', message: 'تعذرت تهيئة البيانات في المتصفح.' });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  }, [session]);

  useEffect(() => {
    if (!session?.nationalId) return;
    const allowed = session.role === 'student'
      ? registeredStudent(data, session.nationalId)
      : registeredStaff(data, session.nationalId);
    if (allowed) return;
    setSession(null);
    cloudSignOut().catch(() => {});
  }, [session, data.students, data.users]);

  useEffect(() => {
    if (!session || databaseGuard()) return undefined;
    let cancelled = false;
    let stopListen = () => {};
    setCloud((current) => (current.mode === 'synced' ? current : { mode: 'signing', message: 'جاري تسجيل الدخول' }));
    const stopAuth = watchAuth((user) => {
      if (cancelled || !user) return;
      stopListen();
      stopListen = subscribe(session, (partial) => {
        setData((current) => {
          const allowDelete = allowDeleteRef.current && session.role !== 'student';
          const next = { ...current };
          if (partial.settings) {
            const { defaultPassword, gateway, ...general } = partial.settings;
            next.settings = {
              ...current.settings,
              ...general,
              defaultPassword: current.settings.defaultPassword,
              gateway: current.settings.gateway,
            };
            void gateway;
          }
          if (partial.security?.defaultPassword || partial.security?.gateway) {
            next.settings = {
              ...next.settings,
              defaultPassword: partial.security.defaultPassword || next.settings.defaultPassword,
              gateway: partial.security.gateway ? normalizeGateway(partial.security.gateway) : next.settings.gateway,
              updatedAt: partial.security.updatedAt || next.settings.updatedAt,
            };
          }
          if (partial.students) next.students = mergeList(current.students, partial.students, 'nationalId', allowDelete);
          if (partial.courses) next.courses = mergeList(current.courses, partial.courses, 'id', allowDelete);
          if (partial.messages) next.messages = mergeList(current.messages, partial.messages, 'id', allowDelete && session.role !== 'student');
          if (partial.certificates) next.certificates = mergeList(current.certificates, partial.certificates, 'id', allowDelete && session.role !== 'student');
          if (partial.archive) next.archive = mergeList(current.archive, partial.archive, 'id', allowDelete && session.role !== 'student');
          if (partial.users) next.users = mergeUsers(current.users, partial.users, next.settings.defaultPassword);
          if (partial.attendance) {
            const remoteMap = {};
            for (const row of partial.attendance) remoteMap[row.date || row.id] = row.absent || {};
            next.attendance = allowDelete ? remoteMap : { ...current.attendance, ...remoteMap };
          }
          dataRef.current = next;
          return next;
        });
      }, () => setCloud({ mode: 'error', message: 'تعذر الاشتراك اللحظي مع Firestore.' }));
      setCloud({ mode: 'synced', message: 'المزامنة اللحظية مع Firestore تعمل.' });
    });
    const resume = async () => {
      const existing = await currentCloudUser();
      if (cancelled || existing) return;
      const person = session.role === 'student'
        ? registeredStudent(dataRef.current, session.nationalId)
        : registeredStaff(dataRef.current, session.nationalId);
      if (!person) {
        setCloud({ mode: 'error', message: UNREGISTERED });
        return;
      }
      const password = session.role === 'student'
        ? person.nationalId
        : (person.usesDefaultPassword ? dataRef.current.settings.defaultPassword : person.password);
      const result = await signInCloud(person.nationalId, password, session.role === 'student' ? 'student' : 'staff');
      if (cancelled) return;
      if (!result.ok) {
        setCloud({ mode: 'error', message: result.message || 'تعذر إكمال تسجيل الدخول السحابي.' });
        return;
      }
      try {
        await ensureProfile({ ...person, role: session.role, job: session.job });
        if (session.role === 'owner') {
          const published = await pushSnapshot(dataRef.current);
          allowDeleteRef.current = true;
          const marked = markPublished(dataRef.current, published);
          if (marked !== dataRef.current) commit(marked);
        }
      } catch {
        if (!cancelled) setCloud({ mode: 'error', message: 'تم الدخول، وتعذرت مزامنة بعض البيانات مع Firestore.' });
      }
    };
    resume();
    return () => {
      cancelled = true;
      stopAuth();
      stopListen();
    };
  }, [session]);

  const cloudTask = async (task) => {
    const blocked = syncBlockMessage();
    if (blocked) {
      setCloud({ mode: 'error', message: blocked });
      return;
    }
    try {
      await task();
      setCloud({ mode: 'synced', message: 'تمت المزامنة مع Firestore.' });
    } catch (error) {
      const detail = error?.code || error?.message || '';
      setCloud({ mode: 'error', message: detail ? `تعذرت المزامنة مع Firestore: ${detail}` : 'تعذرت المزامنة مع Firestore.' });
    }
  };

  const connectCloud = async (person, password, kind) => {
    const allowed = kind === 'student'
      ? registeredStudent(dataRef.current, person.nationalId)
      : registeredStaff(dataRef.current, person.nationalId);
    if (!allowed) {
      setSession(null);
      setCloud({ mode: 'error', message: UNREGISTERED });
      return;
    }
    setCloud({ mode: 'signing', message: 'جاري تسجيل الدخول' });
    const result = await signInCloud(person.nationalId, password, kind);
    if (!result.ok) {
      if (result.message) setCloud({ mode: 'error', message: result.message });
      return;
    }
    try {
      await ensureProfile(person);
      if (person.role === 'owner') {
        const published = await pushSnapshot(dataRef.current);
        allowDeleteRef.current = true;
        const marked = markPublished(dataRef.current, published);
        if (marked !== dataRef.current) commit(marked);
      }
      setCloud({ mode: 'synced', message: 'تم الدخول ومزامنة البيانات مع Firestore.' });
    } catch {
      setCloud({ mode: 'error', message: 'تم الدخول، وتعذرت مزامنة بعض البيانات مع Firestore.' });
    }
  };

  const guardAttempt = (nationalId) => {
    const attempts = readAttempts();
    const record = attempts[nationalId] || { count: 0, until: 0 };
    if (record.until && Date.now() < record.until) {
      return 'تم إيقاف المحاولة مؤقتاً لمدة دقيقة بعد تكرار كلمة المرور.';
    }
    return '';
  };

  const markAttempt = (nationalId, ok) => {
    const attempts = readAttempts();
    if (ok) {
      delete attempts[nationalId];
    } else {
      const record = attempts[nationalId] || { count: 0, until: 0 };
      record.count += 1;
      if (record.count >= 5) {
        record.count = 0;
        record.until = Date.now() + 60000;
      }
      attempts[nationalId] = record;
    }
    sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  };

  const api = useMemo(() => {
    const verifyStaff = (nationalId, password) => {
      const id = normalizeId(nationalId);
      if (id.length !== 10) return { ok: false, message: 'السجل المدني يجب أن يتكون من 10 أرقام.' };
      const locked = guardAttempt(id);
      if (locked) return { ok: false, message: locked };
      const user = registeredStaff(dataRef.current, id);
      if (!user) return { ok: false, message: UNREGISTERED };
      const expected = expectedStaffPassword(user, dataRef.current.settings);
      if (String(password || '').trim() !== String(expected)) {
        markAttempt(id, false);
        return { ok: false, message: 'كلمة المرور غير صحيحة.' };
      }
      markAttempt(id, true);
      return { ok: true, user };
    };

    return {
      loginStaff: async (nationalId, password) => {
        const id = normalizeId(nationalId);
        const typed = String(password || '').trim();
        const local = verifyStaff(id, typed);
        if (local.ok) {
          setSession(sessionFrom(local.user));
          await connectCloud(local.user, typed, 'staff');
          return { ok: true };
        }
        if (local.message !== UNREGISTERED) return local;
        const cloud = await signInExisting(id, typed, 'staff');
        if (!cloud.ok) {
          markAttempt(id, false);
          return { ok: false, message: CLOUD_LOGIN_FAIL };
        }
        const profile = await readOwnProfile();
        if (!profile || normalizeId(profile.nationalId) !== id || profile.role === 'student') {
          await cloudSignOut();
          markAttempt(id, false);
          return { ok: false, message: 'دخل الحساب السحابي لكن سجل الموظفة غير مكتمل في قاعدة المشروع. أعيدي حفظه من جهاز المالك بعد اكتمال المزامنة.' };
        }
        const user = {
          ...profile,
          nationalId: id,
          job: feminineJob(profile.job),
          role: profile.role,
          password: profile.usesDefaultPassword === false ? typed : dataRef.current.settings.defaultPassword,
          usesDefaultPassword: profile.usesDefaultPassword !== false,
          authPublished: true,
        };
        const users = dataRef.current.users.some((item) => normalizeId(item.nationalId) === id)
          ? dataRef.current.users.map((item) => (normalizeId(item.nationalId) === id ? { ...item, ...user } : item))
          : [...dataRef.current.users, user];
        commit({ ...dataRef.current, users });
        setSession(sessionFrom(user));
        markAttempt(id, true);
        return { ok: true };
      },
      loginStudent: async (nationalId) => {
        const id = normalizeId(nationalId);
        if (id.length !== 10) return { ok: false, message: 'السجل المدني يجب أن يتكون من 10 أرقام.' };
        const student = registeredStudent(dataRef.current, id);
        if (student) {
          const person = { ...student, role: 'student', job: 'طالبة' };
          setSession(sessionFrom(person));
          await connectCloud(person, id, 'student');
          return { ok: true };
        }
        const cloud = await signInExisting(id, id, 'student');
        if (!cloud.ok) return { ok: false, message: CLOUD_LOGIN_FAIL };
        const profile = await readOwnProfile();
        if (!profile || normalizeId(profile.nationalId) !== id || profile.role !== 'student') {
          await cloudSignOut();
          return { ok: false, message: 'دخل الحساب السحابي لكن سجل الطالبة غير مكتمل في قاعدة المشروع. أعيدي حفظه بعد اكتمال المزامنة.' };
        }
        const person = { ...profile, nationalId: id, role: 'student', job: 'طالبة', authPublished: true };
        const students = dataRef.current.students.some((item) => normalizeId(item.nationalId) === id)
          ? dataRef.current.students
          : [...dataRef.current.students, person];
        commit({ ...dataRef.current, students });
        setSession(sessionFrom(person));
        return { ok: true };
      },
      loginWithFingerprint: async () => {
        try {
          const saved = await loginWithDeviceFingerprint();
          const user = registeredStaff(dataRef.current, saved.nationalId);
          const student = registeredStudent(dataRef.current, saved.nationalId);
          if (user) {
            setSession(sessionFrom(user));
            const password = expectedStaffPassword(user, dataRef.current.settings);
            await connectCloud(user, password, 'staff');
            return { ok: true };
          }
          if (student) {
            setSession(sessionFrom({ ...student, role: 'student', job: 'طالبة' }));
            await connectCloud({ ...student, role: 'student', job: 'طالبة' }, student.nationalId, 'student');
            return { ok: true };
          }
          return { ok: false, message: 'البصمة مسجلة لحساب لم يعد موجوداً.' };
        } catch (error) {
          return { ok: false, message: error.message || 'تعذر التحقق من البصمة.' };
        }
      },
      registerFingerprint: async () => {
        if (!session) return { ok: false, message: 'سجّلي الدخول أولاً.' };
        try {
          await registerFingerprint(session.nationalId, session.name);
          return { ok: true, message: 'تم تسجيل البصمة على هذا الجهاز.' };
        } catch (error) {
          return { ok: false, message: error.message || 'تعذر تسجيل البصمة.' };
        }
      },
      logout: async () => {
        allowDeleteRef.current = false;
        setSession(null);
        try {
          await cloudSignOut();
        } catch {
          /* يبقى الخروج المحلي */
        }
      },
      acceptPrivacy: () => commit({ ...dataRef.current, privacyAccepted: true }),
      setTheme: (theme) => commit({ ...dataRef.current, theme: activeTheme(theme) }),
      setMode: (mode) => commit({ ...dataRef.current, mode: mode === 'night' ? 'night' : 'day' }),
      updateSettings: (patch) => {
        const current = dataRef.current;
        const settings = { ...current.settings, updatedAt: nowIso() };
        Object.entries(patch || {}).forEach(([key, value]) => {
          if (value !== undefined) settings[key] = value;
        });
        let users = current.users;
        if (patch.defaultPassword && patch.defaultPassword !== current.settings.defaultPassword) {
          users = users.map((user) => user.usesDefaultPassword ? { ...user, password: patch.defaultPassword, updatedAt: nowIso() } : user);
        }
        commit({ ...current, settings, users });
        const parts = cloudSettings(settings);
        cloudTask(() => Promise.all([
          writeCloud('settings', 'general', parts.general),
          writeCloud('settings', 'security', parts.security),
        ]));
      },
      saveDirectorSignature: (patch) => {
        if (session?.role !== 'director') return { ok: false, message: 'إضافة التوقيع متاحة لمديرة المركز فقط.' };
        const next = {};
        if ('signature' in patch) next.signature = patch.signature || '';
        if ('showSignatureOnCertificates' in patch) next.showSignatureOnCertificates = Boolean(patch.showSignatureOnCertificates);
        if ('showSignatureOnReports' in patch) next.showSignatureOnReports = Boolean(patch.showSignatureOnReports);
        if (next.signature && String(next.signature).length > 700000) {
          return { ok: false, message: 'صورة التوقيع أكبر من المناسب. استخدمي صورة أصغر.' };
        }
        const current = dataRef.current;
        const settings = { ...current.settings, ...next, updatedAt: nowIso() };
        commit({ ...current, settings });
        cloudTask(() => writeCloud('settings', 'general', cloudSettings(settings).general));
        return { ok: true };
      },
      saveTrainerSignature: (signature) => {
        if (session?.role !== 'trainer') return { ok: false, message: 'التوقيع متاح لحساب المدرب أو المدربة فقط.' };
        const value = signature || '';
        if (value && String(value).length > 700000) {
          return { ok: false, message: 'صورة التوقيع أكبر من المناسب. استخدم صورة أصغر.' };
        }
        const current = dataRef.current;
        const mine = current.users.find((user) => user.nationalId === session.nationalId);
        if (!mine) return { ok: false, message: 'حساب المدرب غير موجود.' };
        const saved = { ...mine, signature: value, updatedAt: nowIso() };
        const users = current.users.map((user) => user.nationalId === saved.nationalId ? saved : user);
        commit({ ...current, users });
        cloudTask(() => ensureProfile(saved));
        return { ok: true };
      },
      saveOnWeb: async () => {
        if (session?.role !== 'owner') return { ok: false, web: false, message: 'الحفظ على الويب متاح للمالك فقط.' };
        commit(dataRef.current);
        const blocked = syncBlockMessage();
        if (blocked) return { ok: false, web: false, message: blocked };
        try {
          const published = await pushSnapshot(dataRef.current);
          allowDeleteRef.current = true;
          const marked = markPublished(dataRef.current, published);
          if (marked !== dataRef.current) commit(marked);
          setCloud({ mode: 'synced', message: 'تم حفظ التعديلات على الويب من هذا الجهاز.' });
          return { ok: true, web: true, message: 'تم حفظ التعديلات على الويب.' };
        } catch (error) {
          const detail = error?.code || error?.message || '';
          setCloud({ mode: 'error', message: detail ? `تعذر الحفظ على الويب: ${detail}` : 'تعذر الحفظ على الويب.' });
          return { ok: false, web: false, message: detail ? `تعذر الحفظ على الويب: ${detail}` : 'تعذر الحفظ على الويب.' };
        }
      },
      saveStudent: (student) => {
        const current = dataRef.current;
        const nationalId = normalizeId(student.nationalId);
        if (nationalId.length !== 10) return { ok: false, message: 'السجل المدني يجب أن يتكون من 10 أرقام.' };
        if (!student.name?.trim()) return { ok: false, message: 'اسم الطالبة مطلوب.' };
        if (!GRADES.includes(student.grade)) return { ok: false, message: 'اختاري صفاً من الرابع الابتدائي إلى الثالث الثانوي.' };
        const record = {
          ...student,
          nationalId,
          name: student.name.trim(),
          id: nationalId,
          score: student.score === '' || student.score == null || Number.isNaN(Number(student.score)) ? '' : Number(student.score),
          updatedAt: nowIso(),
          pendingSync: true,
        };
        const exists = current.students.some((item) => item.nationalId === nationalId);
        const students = exists
          ? current.students.map((item) => item.nationalId === nationalId ? { ...item, ...record } : item)
          : [...current.students, record];
        commit({ ...current, students });
        cloudTask(() => writeCloud('students', nationalId, record));
        return { ok: true };
      },
      deleteStudent: (nationalId, reason, kind = 'طالبة') => {
        const cause = String(reason || '').trim();
        if (!cause) return { ok: false, message: 'سبب الحذف مطلوب.' };
        const current = dataRef.current;
        const student = current.students.find((item) => item.nationalId === nationalId);
        if (!student) return { ok: false, message: 'السجل غير موجود.' };
        const entry = {
          id: uid('arch'),
          kind,
          title: student.name,
          detail: `${student.nationalId} · ${student.grade || 'بدون صف'} · جوال ولي الأمر ${student.guardianPhone || 'غير مسجل'}`,
          reason: cause,
          deletedAt: nowIso(),
          deletedBy: session?.name || 'النظام',
        };
        commit({
          ...current,
          students: current.students.filter((item) => item.nationalId !== nationalId),
          archive: [entry, ...(current.archive || [])],
        });
        cloudTask(() => Promise.all([
          removeCloud('students', nationalId),
          writeCloud('archive', entry.id, entry),
        ]));
        return { ok: true };
      },
      importStudents: (rows) => {
        const current = dataRef.current;
        const map = new Map(current.students.map((student) => [student.nationalId, student]));
        const imported = [];
        for (const row of rows) {
          const record = { ...map.get(row.nationalId), ...row, id: row.nationalId, updatedAt: nowIso(), pendingSync: true };
          map.set(row.nationalId, record);
          imported.push(record);
        }
        commit({ ...current, students: [...map.values()] });
        cloudTask(async () => {
          for (let index = 0; index < imported.length; index += 40) {
            await Promise.all(imported.slice(index, index + 40).map((student) => writeCloud('students', student.nationalId, student)));
          }
        });
        return imported.length;
      },
      saveStaff: (staff) => {
        const current = dataRef.current;
        const nationalId = normalizeId(staff.nationalId);
        if (nationalId.length !== 10) return { ok: false, message: 'السجل المدني يجب أن يتكون من 10 أرقام.' };
        if (nationalId === OWNER_ID) return { ok: false, message: 'لا يمكن تعديل سجل المالك من نموذج الموظفات.' };
        if (!staff.name?.trim()) return { ok: false, message: 'الاسم مطلوب.' };
        const prev = current.users.find((user) => user.nationalId === nationalId);
        const record = {
          nationalId,
          name: staff.name.trim(),
          job: feminineJob(staff.job),
          role: jobRole(staff.job),
          phone: staff.phone || '',
          email: (staff.email || '').trim(),
          joinDate: staff.joinDate || todayISO(),
          password: prev?.password || current.settings.defaultPassword,
          usesDefaultPassword: prev ? prev.usesDefaultPassword : true,
          signature: prev?.signature || '',
          updatedAt: nowIso(),
        };
        const users = prev
          ? current.users.map((user) => user.nationalId === nationalId ? record : user)
          : [...current.users, record];
        commit({ ...current, users });
        cloudTask(async () => {
          await provisionAccount(nationalId, record.usesDefaultPassword ? current.settings.defaultPassword : record.password, record, 'staff');
          const latest = dataRef.current;
          commit({
            ...latest,
            users: latest.users.map((user) => (user.nationalId === nationalId ? { ...user, authPublished: true } : user)),
          });
        });
        return { ok: true };
      },
      deleteStaff: (nationalId, reason) => {
        if (nationalId === OWNER_ID) return { ok: false, message: 'لا يمكن حذف المالك.' };
        const cause = String(reason || '').trim();
        if (!cause) return { ok: false, message: 'سبب الحذف مطلوب.' };
        const current = dataRef.current;
        const user = current.users.find((item) => item.nationalId === nationalId);
        if (!user) return { ok: false, message: 'السجل غير موجود.' };
        const entry = {
          id: uid('arch'),
          kind: 'موظفة',
          title: user.name,
          detail: `${user.nationalId} · ${user.job || user.role}`,
          reason: cause,
          deletedAt: nowIso(),
          deletedBy: session?.name || 'النظام',
        };
        commit({
          ...current,
          users: current.users.filter((item) => item.nationalId !== nationalId),
          archive: [entry, ...(current.archive || [])],
        });
        cloudTask(() => writeCloud('archive', entry.id, entry));
        return { ok: true };
      },
      resetStaffPassword: (nationalId) => {
        const current = dataRef.current;
        const users = current.users.map((user) => user.nationalId === nationalId ? {
          ...user,
          password: current.settings.defaultPassword,
          usesDefaultPassword: true,
          updatedAt: nowIso(),
        } : user);
        commit({ ...current, users });
        return { ok: true, message: 'أُعيدت كلمة المرور إلى الافتراضية على هذا الجهاز.' };
      },
      changePassword: (currentPassword, nextPassword) => {
        if (!session) return { ok: false, message: 'لا توجد جلسة.' };
        if (!nextPassword || nextPassword.length < 6) return { ok: false, message: 'كلمة المرور الجديدة لا تقل عن 6 خانات.' };
        const current = dataRef.current;
        const user = current.users.find((item) => item.nationalId === session.nationalId);
        if (!user) return { ok: false, message: 'الحساب غير موجود.' };
        const expected = user.usesDefaultPassword ? current.settings.defaultPassword : user.password;
        if (currentPassword !== expected) return { ok: false, message: 'كلمة المرور الحالية غير صحيحة.' };
        const users = current.users.map((item) => item.nationalId === user.nationalId ? {
          ...item,
          password: nextPassword,
          usesDefaultPassword: false,
          updatedAt: nowIso(),
        } : item);
        commit({ ...current, users });
        return { ok: true, message: 'تم تغيير كلمة المرور.' };
      },
      recoverPassword: (nationalId, email) => {
        const id = normalizeId(nationalId);
        const current = dataRef.current;
        const user = registeredStaff(current, id);
        if (!user?.email || user.email.toLowerCase() !== String(email || '').trim().toLowerCase()) {
          return { ok: false, message: 'السجل المدني والبريد غير متطابقين.' };
        }
        const password = tempPassword();
        const users = current.users.map((item) => item.nationalId === id ? {
          ...item,
          password,
          usesDefaultPassword: false,
          updatedAt: nowIso(),
        } : item);
        const message = {
          id: uid('msg'),
          channel: 'email',
          title: 'استعادة كلمة المرور',
          body: `كلمة المرور المؤقتة لحساب ${user.name} هي: ${password}`,
          recipientIds: [id],
          recipientLabels: [user.email],
          createdAt: nowIso(),
          senderName: 'النظام',
          status: 'queued',
        };
        commit({ ...current, users, messages: [message, ...current.messages] });
        cloudTask(() => writeCloud('messages', message.id, message));
        return { ok: true, password, email: user.email };
      },
      toggleAttendance: (date, student) => {
        const current = dataRef.current;
        const day = { ...(current.attendance[date] || {}) };
        if (day[student.nationalId] === false) delete day[student.nationalId];
        else day[student.nationalId] = false;
        const attendance = { ...current.attendance, [date]: day };
        commit({ ...current, attendance });
        cloudTask(() => writeCloud('attendance', date, { date, absent: day, updatedAt: nowIso() }));
      },
      saveCourse: (course) => {
        const current = dataRef.current;
        if (!course.name?.trim()) return { ok: false, message: 'اسم الدورة مطلوب.' };
        if (!course.date && !course.hijri) return { ok: false, message: 'تاريخ التنفيذ مطلوب.' };
        if (!GRADES.includes(course.grade)) return { ok: false, message: 'اختاري صفاً دراسياً.' };
        const date = course.date || todayISO();
        const invitees = { ...(course.invitees || {}) };
        current.students.filter((student) => student.grade === course.grade).forEach((student) => {
          if (invitees[student.nationalId] == null) invitees[student.nationalId] = true;
        });
        const record = {
          ...course,
          id: course.id || uid('course'),
          name: course.name.trim(),
          date,
          invitees,
          presence: course.presence || {},
          weekday: course.weekday || weekdayName(date),
          hijri: course.hijri || formatHijri(date),
          updatedAt: nowIso(),
        };
        const courses = current.courses.some((item) => item.id === record.id)
          ? current.courses.map((item) => item.id === record.id ? record : item)
          : [record, ...current.courses];
        commit({ ...current, courses });
        cloudTask(() => writeCloud('courses', record.id, record));
        return { ok: true, course: record };
      },
      deleteCourse: (id, reason) => {
        const cause = String(reason || '').trim();
        if (!cause) return { ok: false, message: 'سبب الحذف مطلوب.' };
        const current = dataRef.current;
        const course = current.courses.find((item) => item.id === id);
        if (!course) return { ok: false, message: 'البرنامج غير موجود.' };
        const entry = {
          id: uid('arch'),
          kind: 'برنامج',
          title: course.name,
          detail: course.grade || '',
          reason: cause,
          deletedAt: nowIso(),
          deletedBy: session?.name || 'النظام',
        };
        commit({
          ...current,
          courses: current.courses.filter((item) => item.id !== id),
          archive: [entry, ...(current.archive || [])],
        });
        cloudTask(() => Promise.all([
          removeCloud('courses', id),
          writeCloud('archive', entry.id, entry),
        ]));
        return { ok: true };
      },
      setCourseFlag: (courseId, nationalId, field) => {
        const current = dataRef.current;
        const courses = current.courses.map((course) => {
          if (course.id !== courseId) return course;
          const bucket = { ...(course[field] || {}) };
          bucket[nationalId] = bucket[nationalId] === false;
          return { ...course, [field]: bucket, updatedAt: nowIso() };
        });
        const course = courses.find((item) => item.id === courseId);
        commit({ ...current, courses });
        cloudTask(() => writeCloud('courses', courseId, course));
      },
      sendMessage: (draft) => {
        const current = dataRef.current;
        const message = {
          id: uid('msg'),
          channel: draft.channel,
          title: draft.title || 'رسالة',
          body: draft.body || '',
          image: draft.image || '',
          recipientIds: draft.recipientIds || [],
          recipientLabels: draft.recipientLabels || [],
          createdAt: nowIso(),
          senderName: session?.name || 'النظام',
          senderId: session?.nationalId || '',
          status: 'sent',
          courseId: draft.courseId || '',
        };
        commit({ ...current, messages: [message, ...current.messages] });
        cloudTask(() => writeCloud('messages', message.id, message));
        return message;
      },
      deleteMessage: (id, reason) => {
        const cause = String(reason || '').trim();
        if (!cause) return { ok: false, message: 'سبب الحذف مطلوب.' };
        const current = dataRef.current;
        const message = current.messages.find((item) => item.id === id);
        if (!message) return { ok: false, message: 'الرسالة غير موجودة.' };
        const entry = {
          id: uid('arch'),
          kind: 'رسالة',
          title: message.title || 'رسالة',
          detail: message.body || '',
          reason: cause,
          deletedAt: nowIso(),
          deletedBy: session?.name || 'النظام',
        };
        commit({
          ...current,
          messages: current.messages.filter((item) => item.id !== id),
          archive: [entry, ...(current.archive || [])],
        });
        cloudTask(() => Promise.all([
          removeCloud('messages', id),
          writeCloud('archive', entry.id, entry),
        ]));
        return { ok: true };
      },
      acknowledgeMessage: (messageId) => {
        if (session?.role !== 'student') return { ok: false, message: 'إشعار الاستلام متاح للطالبة فقط.' };
        const current = dataRef.current;
        const source = current.messages.find((item) => item.id === messageId);
        if (!source) return { ok: false, message: 'الرسالة غير موجودة.' };
        if (source.receivedAt) return { ok: true, message: 'تم إرسال إشعار الاستلام من قبل.' };
        const notice = {
          id: uid('msg'),
          channel: 'receipt-notice',
          title: 'إشعار استلام',
          body: `أكدت الطالبة ${session.name} استلام الرسالة: ${source.title}`,
          studentNationalId: session.nationalId,
          recipientIds: [],
          recipientLabels: ['النظام'],
          createdAt: nowIso(),
          senderName: session.name,
          status: 'sent',
          sourceMessageId: messageId,
        };
        const messages = [{ ...notice }, ...current.messages.map((item) => item.id === messageId ? { ...item, receivedAt: notice.createdAt, status: 'received' } : item)];
        commit({ ...current, messages });
        cloudTask(() => Promise.all([
          writeCloud('messages', notice.id, notice),
          writeCloud('messages', messageId, messages.find((item) => item.id === messageId)),
        ]));
        return { ok: true, message: 'أُرسل إشعار الاستلام إلى النظام.' };
      },
      issueCertificate: ({ student, action, byRole, kind = 'appreciation' }) => {
        const current = dataRef.current;
        const certificateKind = kind === 'completion' ? 'completion' : 'appreciation';
        const record = {
          id: uid('cert'),
          studentId: student.nationalId,
          nationalId: student.nationalId,
          studentName: student.name,
          grade: student.grade,
          kind: certificateKind,
          action,
          byRole: byRole || session?.role || 'staff',
          byName: session?.name || student.name,
          createdAt: nowIso(),
          status: action === 'emailed' ? 'sent' : 'printed',
        };
        let messages = current.messages;
        if (byRole === 'student' || session?.role === 'student') {
          messages = [{
            id: uid('msg'),
            channel: 'print-notice',
            title: 'طبع شهادة',
            body: `أتمّت الطالبة ${student.name} طباعة شهادتها.`,
            studentNationalId: student.nationalId,
            recipientIds: [],
            recipientLabels: ['النظام'],
            createdAt: nowIso(),
            senderName: student.name,
            status: 'sent',
          }, ...messages];
          cloudTask(() => writeCloud('messages', messages[0].id, messages[0]));
        }
        const students = current.students.map((item) => item.nationalId === student.nationalId ? {
          ...item,
          certificatePrinted: action === 'printed' ? true : item.certificatePrinted,
          certificateEmailed: action === 'emailed' ? true : item.certificateEmailed,
          certificateKind,
          lastPrintedAt: nowIso(),
        } : item);
        commit({ ...current, certificates: [record, ...current.certificates], messages, students });
        cloudTask(() => Promise.all([
          writeCloud('certificates', record.id, record),
          writeCloud('students', student.nationalId, students.find((item) => item.nationalId === student.nationalId)),
        ]));
        return record;
      },
      backup: () => {
        const blob = new Blob([JSON.stringify(dataRef.current, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'mohobat-backup.json';
        link.click();
        URL.revokeObjectURL(link.href);
      },
      restore: async (file) => {
        const text = await file.text();
        const parsed = JSON.parse(text);
        commit(withOwner({ ...defaultState(), ...parsed, settings: { ...defaultState().settings, ...(parsed.settings || {}) } }));
        return { ok: true };
      },
    };
  }, [session]);

  const value = {
    data,
    session,
    savedAt,
    cloud,
    privacyAccepted: data.privacyAccepted,
    canManage: isManager(session?.role),
    ...api,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore outside provider');
  return context;
}
