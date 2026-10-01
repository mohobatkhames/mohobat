export const OWNER_ID = "1025774389";
export const OWNER_PASSWORD = "Aa9834775201";
export const LS_KEY = "mawhubat-db-v1";
export const SESSION_KEY = "mawhubat-session";
export const PRIVACY_KEY = "mawhubat-privacy-v1";
export const LOCK_KEY = "mawhubat-lock";

export const GRADES = [
  "الرابع الابتدائي",
  "الخامس الابتدائي",
  "السادس الابتدائي",
  "الأول المتوسط",
  "الثاني المتوسط",
  "الثالث المتوسط",
  "الأول الثانوي",
  "الثاني الثانوي",
  "الثالث الثانوي",
];

export const ALL_GRADES = "جميع الصفوف";

export const ROLES = ["مديرة", "معلمة", "موظفة"];

export const THEMES = [
  { id: "lavender", name: "بنفسجي هادئ", swatch: "#7c3aed" },
  { id: "rose", name: "وردي ناعم", swatch: "#e11d63" },
  { id: "peach", name: "خوخي دافئ", swatch: "#c026d3" },
  { id: "royal", name: "ليلكي ملكي", swatch: "#5b21b6" },
];

export const NAV = [
  { id: "home", label: "الرئيسية", icon: "home" },
  { id: "settings", label: "الإعدادات العامة", icon: "settings" },
  { id: "students", label: "الطالبات", icon: "users" },
  { id: "staff", label: "الموظفات والمعلمات", icon: "staff" },
  { id: "attendance", label: "الحضور والغياب", icon: "check" },
  { id: "programs", label: "البرامج والدورات", icon: "book" },
  { id: "messages", label: "الرسائل", icon: "mail" },
  { id: "reports", label: "التقارير", icon: "report" },
  { id: "certificates", label: "الشهادات", icon: "certificate" },
];

export const INITIAL_STATE = {
  updatedAt: 0,
  theme: "lavender",
  settings: {
    countryName: "المملكة العربية السعودية",
    ministryName: "وزارة التعليم",
    administrationName: "الإدارة العامة للتعليم بمنطقة عسير",
    centerName: "مركز الموهوبات بخميس مشيط",
    semester: "الفصل الدراسي الأول",
    academicYear: "1448 هـ",
    defaultPassword: "123456",
    directorName: "",
  },
  owner: {
    nationalId: OWNER_ID,
    password: OWNER_PASSWORD,
    name: "المالك",
    email: "",
  },
  staff: [],
  students: [],
  dailyAttendance: {},
  programs: [],
  messages: [],
  notifications: [],
  emailOutbox: [],
  smsOutbox: [],
  fingerprints: {},
};

export function normalizeState(raw) {
  const base = INITIAL_STATE;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ...base,
      staff: [],
      students: [],
      programs: [],
      messages: [],
      notifications: [],
      emailOutbox: [],
      smsOutbox: [],
      fingerprints: {},
      dailyAttendance: {},
      updatedAt: Date.now(),
    };
  }
  return {
    ...base,
    ...raw,
    settings: { ...base.settings, ...(raw.settings || {}) },
    owner: {
      ...base.owner,
      ...(raw.owner || {}),
      nationalId: OWNER_ID,
    },
    staff: Array.isArray(raw.staff) ? raw.staff : [],
    students: Array.isArray(raw.students) ? raw.students : [],
    programs: Array.isArray(raw.programs) ? raw.programs : [],
    messages: Array.isArray(raw.messages) ? raw.messages : [],
    notifications: Array.isArray(raw.notifications) ? raw.notifications : [],
    emailOutbox: Array.isArray(raw.emailOutbox) ? raw.emailOutbox : [],
    smsOutbox: Array.isArray(raw.smsOutbox) ? raw.smsOutbox : [],
    fingerprints: raw.fingerprints && typeof raw.fingerprints === "object" ? raw.fingerprints : {},
    dailyAttendance: raw.dailyAttendance && typeof raw.dailyAttendance === "object" ? raw.dailyAttendance : {},
    theme: THEMES.some((t) => t.id === raw.theme) ? raw.theme : base.theme,
    updatedAt: Number(raw.updatedAt) || 0,
  };
}

export function mergeStates(local, remote) {
  if (!local && !remote) return null;
  if (!local) return remote;
  if (!remote) return local;
  const newer = (local.updatedAt || 0) >= (remote.updatedAt || 0) ? local : remote;
  const images = new Map();
  for (const source of [local, remote]) {
    for (const message of source.messages || []) {
      if (message?.image) images.set(message.id, message.image);
    }
  }
  return {
    ...newer,
    messages: (newer.messages || []).map((message) => ({
      ...message,
      image: message.image || images.get(message.id) || "",
    })),
  };
}
