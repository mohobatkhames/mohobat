import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { GRADES, OWNER_ID, OWNER_PASSWORD, isManager, jobRole } from '../lib/constants';
import { canSync, cloudSignOut, ensureProfile, provisionAccount, pushSnapshot, removeCloud, signInCloud, subscribe, watchAuth, writeCloud } from '../lib/cloud';
import { isFirebaseConfigured } from '../firebase';
import { nowIso, todayISO, weekdayName, formatHijri } from '../lib/dates';
import { normalizeId, tempPassword, uid } from '../lib/ids';
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
      updatedAt: nowIso(),
    },
    users: [ownerRecord()],
    students: [],
    attendance: {},
    courses: [],
    messages: [],
    certificates: [],
    theme: 'orchid',
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
      settings: { ...base.settings, ...(parsed.settings || {}) },
      users: parsed.users || base.users,
      students: parsed.students || [],
      attendance: parsed.attendance || {},
      courses: parsed.courses || [],
      messages: parsed.messages || [],
      certificates: parsed.certificates || [],
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
        password: item.role === 'owner' ? OWNER_PASSWORD : defaultPassword,
        usesDefaultPassword: item.role !== 'owner',
      });
    } else if (newer(item, prev)) {
      map.set(item.nationalId, {
        ...prev,
        ...item,
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
  const [cloud, setCloud] = useState({
    mode: isFirebaseConfigured() ? 'ready' : 'local',
    message: isFirebaseConfigured()
      ? 'Firebase جاهز وستبدأ المزامنة بعد الدخول.'
      : 'الحفظ المحلي يعمل. أضيفي مفاتيح Firebase الحقيقية لتفعيل المزامنة السحابية.',
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
      setCloud({ mode: 'error', message: 'تعذر الحفظ المحلي. قد تكون مساحة المتصفح ممتلئة.' });
    }
  };

  useEffect(() => {
    document.documentElement.dataset.theme = data.theme || 'orchid';
  }, [data.theme]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(dataRef.current));
        setSavedAt(new Date().toISOString());
      } catch {
        setCloud({ mode: 'error', message: 'تعذر الحفظ المحلي. قد تكون مساحة المتصفح ممتلئة.' });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  }, [session]);

  useEffect(() => {
    if (!session || !isFirebaseConfigured()) return undefined;
    let stopListen = () => {};
    const stopAuth = watchAuth((user) => {
      stopListen();
      stopListen = () => {};
      if (!user) return;
      stopListen = subscribe(session, (partial) => {
        setData((current) => {
          const allowDelete = allowDeleteRef.current && session.role !== 'student';
          const next = { ...current };
          if (partial.settings) {
            const { defaultPassword, ...general } = partial.settings;
            next.settings = { ...current.settings, ...general, defaultPassword: current.settings.defaultPassword };
          }
          if (partial.security?.defaultPassword) {
            next.settings = { ...next.settings, defaultPassword: partial.security.defaultPassword, updatedAt: partial.security.updatedAt || next.settings.updatedAt };
          }
          if (partial.students) next.students = mergeList(current.students, partial.students, 'nationalId', allowDelete);
          if (partial.courses) next.courses = mergeList(current.courses, partial.courses, 'id', allowDelete);
          if (partial.messages) next.messages = mergeList(current.messages, partial.messages, 'id', allowDelete && session.role !== 'student');
          if (partial.certificates) next.certificates = mergeList(current.certificates, partial.certificates, 'id', allowDelete && session.role !== 'student');
          if (partial.users) next.users = mergeUsers(current.users, partial.users, next.settings.defaultPassword);
          if (partial.attendance) {
            const remoteMap = {};
            for (const row of partial.attendance) remoteMap[row.date || row.id] = row.absent || {};
            next.attendance = allowDelete ? remoteMap : { ...current.attendance, ...remoteMap };
          }
          dataRef.current = next;
          return next;
        });
      }, () => setCloud({ mode: 'error', message: 'تعذر الاشتراك اللحظي. الحفظ المحلي مستمر.' }));
      setCloud({ mode: 'synced', message: 'المزامنة اللحظية مع Firestore تعمل، والحفظ المحلي مستمر.' });
    });
    return () => {
      stopAuth();
      stopListen();
    };
  }, [session]);

  const cloudTask = async (task) => {
    if (!canSync()) return;
    try {
      await task();
      setCloud({ mode: 'synced', message: 'تم الحفظ محلياً ومزامنته مع Firestore.' });
    } catch (error) {
      const detail = error?.code || error?.message || '';
      setCloud({ mode: 'error', message: detail ? `تم الحفظ محلياً، وتعذرت المزامنة السحابية: ${detail}` : 'تم الحفظ محلياً، وتعذرت المزامنة السحابية.' });
    }
  };

  const connectCloud = async (person, password, kind) => {
    const result = await signInCloud(person.nationalId, password, kind);
    if (!result.ok) {
      if (!result.skipped && result.message) setCloud({ mode: 'local', message: result.message });
      return;
    }
    try {
      await ensureProfile(person);
      if (kind !== 'student') {
        await pushSnapshot(dataRef.current);
        allowDeleteRef.current = true;
      }
      setCloud({ mode: 'synced', message: 'تم الدخول ومزامنة البيانات مع Firestore.' });
    } catch {
      setCloud({ mode: 'error', message: 'تم الدخول. الحفظ المحلي يعمل وتعذرت مزامنة بعض البيانات.' });
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
      const user = dataRef.current.users.find((item) => item.nationalId === id && item.role !== 'student');
      if (!user) {
        markAttempt(id, false);
        return { ok: false, message: 'غير مصرح بالدخول. هذا السجل غير مسجل في النظام.' };
      }
      const expected = user.usesDefaultPassword ? dataRef.current.settings.defaultPassword : user.password;
      if (password !== expected) {
        markAttempt(id, false);
        return { ok: false, message: 'كلمة المرور غير صحيحة.' };
      }
      markAttempt(id, true);
      return { ok: true, user };
    };

    return {
      loginStaff: async (nationalId, password) => {
        const result = verifyStaff(nationalId, password);
        if (!result.ok) return result;
        setSession(sessionFrom(result.user));
        await connectCloud(result.user, password, 'staff');
        return { ok: true };
      },
      loginStudent: async (nationalId) => {
        const id = normalizeId(nationalId);
        if (id.length !== 10) return { ok: false, message: 'السجل المدني يجب أن يتكون من 10 أرقام.' };
        const student = dataRef.current.students.find((item) => item.nationalId === id);
        if (!student) return { ok: false, message: 'غير مصرح. السجل غير موجود ضمن الطالبات.' };
        const person = { ...student, role: 'student', job: 'طالبة' };
        setSession(sessionFrom(person));
        await connectCloud(person, id, 'student');
        return { ok: true };
      },
      loginWithFingerprint: async () => {
        try {
          const saved = await loginWithDeviceFingerprint();
          const user = dataRef.current.users.find((item) => item.nationalId === saved.nationalId);
          const student = dataRef.current.students.find((item) => item.nationalId === saved.nationalId);
          if (user) {
            setSession(sessionFrom(user));
            const password = user.usesDefaultPassword ? dataRef.current.settings.defaultPassword : user.password;
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
      setTheme: (theme) => commit({ ...dataRef.current, theme }),
      updateSettings: (patch) => {
        const current = dataRef.current;
        const settings = { ...current.settings, ...patch, updatedAt: nowIso() };
        let users = current.users;
        if (patch.defaultPassword && patch.defaultPassword !== current.settings.defaultPassword) {
          users = users.map((user) => user.usesDefaultPassword ? { ...user, password: patch.defaultPassword, updatedAt: nowIso() } : user);
        }
        commit({ ...current, settings, users });
        const { defaultPassword, ...general } = settings;
        cloudTask(() => Promise.all([
          writeCloud('settings', 'general', general),
          writeCloud('settings', 'security', { defaultPassword, updatedAt: settings.updatedAt }),
        ]));
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
      deleteStudent: (nationalId) => {
        const current = dataRef.current;
        commit({ ...current, students: current.students.filter((item) => item.nationalId !== nationalId) });
        cloudTask(() => removeCloud('students', nationalId));
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
          job: staff.job,
          role: jobRole(staff.job),
          phone: staff.phone || '',
          email: (staff.email || '').trim(),
          joinDate: staff.joinDate || todayISO(),
          password: prev?.password || current.settings.defaultPassword,
          usesDefaultPassword: prev ? prev.usesDefaultPassword : true,
          updatedAt: nowIso(),
        };
        const users = prev
          ? current.users.map((user) => user.nationalId === nationalId ? record : user)
          : [...current.users, record];
        commit({ ...current, users });
        cloudTask(() => provisionAccount(nationalId, record.usesDefaultPassword ? current.settings.defaultPassword : record.password, record, 'staff'));
        return { ok: true };
      },
      deleteStaff: (nationalId) => {
        if (nationalId === OWNER_ID) return { ok: false, message: 'لا يمكن حذف المالك.' };
        const current = dataRef.current;
        commit({ ...current, users: current.users.filter((user) => user.nationalId !== nationalId) });
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
        const user = current.users.find((item) => item.nationalId === id && item.role !== 'student');
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
      deleteCourse: (id) => {
        const current = dataRef.current;
        commit({ ...current, courses: current.courses.filter((course) => course.id !== id) });
        cloudTask(() => removeCloud('courses', id));
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
      deleteMessage: (id) => {
        const current = dataRef.current;
        commit({ ...current, messages: current.messages.filter((message) => message.id !== id) });
        cloudTask(() => removeCloud('messages', id));
      },
      issueCertificate: ({ student, action, byRole }) => {
        const current = dataRef.current;
        const record = {
          id: uid('cert'),
          studentId: student.nationalId,
          nationalId: student.nationalId,
          studentName: student.name,
          grade: student.grade,
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
