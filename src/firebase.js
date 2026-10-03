import { deleteApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const SETUP_KEY = 'mohobat-firebase-project';
export const HOME_PROJECT_ID = 'mohopat-khames';
const LEGACY_DATA_KEY = 'mohobat-khames-db-v1';
const LEGACY_SESSION_KEY = 'mohobat-khames-session';

const webKeys = {
  apiKey: 'AIzaSyAwUnhggjPjBO7ueKT-nAIglXCA6UMvmuk',
  messagingSenderId: '516643270399',
  appId: '1:516643270399:web:2175dc649a2006a39426ca',
};

export let db = null;
export let auth = null;

let activeConfig = null;
let activeApp = null;

export function normalizeProjectId(value) {
  return String(value || '').trim().toLowerCase();
}

export function isValidProjectId(value) {
  return /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(normalizeProjectId(value));
}

function ownerFields(setup) {
  return {
    ownerId: String(setup?.ownerId || '').replace(/\D/g, ''),
    ownerName: String(setup?.ownerName || '').trim(),
    ownerPassword: String(setup?.ownerPassword || ''),
  };
}

const WEB_PROFILE = {
  administrationName: 'الإدارة العامة للتعليم بمنطقة عسير',
  departmentName: 'إدارة تنمية القدرات-قسم الموهوبين',
  centerName: 'مركز الموهوبات بخميس مشيط',
};

export function isDevelopmentMode() {
  return Boolean(import.meta.env?.DEV);
}

export function isManualSetupMode() {
  if (typeof window === 'undefined') return false;
  return window.__MOHOBAT_ENV__?.setupMode === true;
}

export function centerProfile(setup) {
  if (setup === undefined && !isManualSetupMode()) return { ...WEB_PROFILE };
  const source = setup === undefined ? readProjectSetup() : setup;
  return {
    administrationName: String(source?.administrationName || 'الإدارة التعليمية').trim() || 'الإدارة التعليمية',
    departmentName: String(source?.departmentName || 'قسم الموهوبين').trim() || 'قسم الموهوبين',
    centerName: String(source?.centerName || 'مركز الموهوبين').trim() || 'مركز الموهوبين',
  };
}

function assertSetup(projectId, keys, owner) {
  if (!isValidProjectId(projectId)) throw new Error('معرف مشروع Firebase غير صالح.');
  if (!keys.apiKey || !keys.messagingSenderId || !keys.appId) {
    throw new Error('أدخل مفتاح API ورقم المرسل ومعرف التطبيق من مشروع Firebase الخاص بهذا المركز.');
  }
  if (!/^\d{10}$/.test(owner.ownerId)) throw new Error('السجل المدني للمالك يجب أن يتكون من 10 أرقام.');
  if (!owner.ownerName) throw new Error('أدخل اسم مالك النظام.');
  if (owner.ownerPassword.length < 6) throw new Error('كلمة مرور المالك لا تقل عن 6 خانات.');
}

export function readProjectSetup() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETUP_KEY) || 'null');
    const projectId = normalizeProjectId(parsed?.projectId);
    const setup = { projectId, ...ownKeys(parsed), ...ownerFields(parsed), ...centerProfile(parsed) };
    assertSetup(projectId, setup, setup);
    return setup;
  } catch {
    return null;
  }
}

export function saveProjectSetup(setup) {
  const projectId = normalizeProjectId(setup.projectId);
  const keys = ownKeys(setup);
  const owner = ownerFields(setup);
  assertSetup(projectId, keys, owner);
  const stored = { projectId, ...keys, ...owner, ...centerProfile(setup) };
  localStorage.setItem(SETUP_KEY, JSON.stringify(stored));
  return stored;
}

function ownKeys(setup) {
  return {
    apiKey: String(setup.apiKey || '').trim(),
    messagingSenderId: String(setup.messagingSenderId || '').trim(),
    appId: String(setup.appId || '').trim(),
  };
}

function buildConfig(setup) {
  const projectId = normalizeProjectId(setup.projectId);
  const keys = ownKeys(setup);
  if (!keys.apiKey || !keys.messagingSenderId || !keys.appId) {
    throw new Error('أدخل مفتاح API ورقم المرسل ومعرف التطبيق من مشروع Firebase الخاص بهذا المركز.');
  }
  return {
    apiKey: keys.apiKey,
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: `${projectId}.firebasestorage.app`,
    messagingSenderId: keys.messagingSenderId,
    appId: keys.appId,
  };
}

function webConfig() {
  return {
    apiKey: webKeys.apiKey,
    authDomain: `${HOME_PROJECT_ID}.firebaseapp.com`,
    projectId: HOME_PROJECT_ID,
    storageBucket: `${HOME_PROJECT_ID}.firebasestorage.app`,
    messagingSenderId: webKeys.messagingSenderId,
    appId: webKeys.appId,
  };
}

function envFirebaseConfig() {
  const raw = typeof window !== 'undefined' ? window.__MOHOBAT_ENV__?.firebase : null;
  if (!raw) return null;
  const projectId = normalizeProjectId(raw.projectId);
  const apiKey = String(raw.apiKey || '').trim();
  const appId = String(raw.appId || '').trim();
  if (!isValidProjectId(projectId) || !apiKey || !appId) return null;
  return {
    apiKey,
    authDomain: String(raw.authDomain || `${projectId}.firebaseapp.com`).trim(),
    projectId,
    storageBucket: String(raw.storageBucket || `${projectId}.firebasestorage.app`).trim(),
    messagingSenderId: String(raw.messagingSenderId || '').trim(),
    appId,
  };
}

function savedConnection() {
  const saved = readProjectSetup();
  if (!saved?.apiKey || !saved?.projectId || !saved?.appId) return null;
  return buildConfig(saved);
}

export function resolveFirebaseConnection() {
  const fromEnv = envFirebaseConfig();
  if (fromEnv) return fromEnv;
  if (isManualSetupMode()) return savedConnection();
  if (isDevelopmentMode() && !webKeys.apiKey) return savedConnection();
  return webConfig();
}

function appName(projectId, secondary = false) {
  return `mohobat-${projectId}${secondary ? '-auth' : ''}`;
}

function openNamed(config, name) {
  const found = getApps().find((item) => item.name === name);
  if (found) {
    if (found.options?.projectId !== config.projectId) {
      throw new Error('معرّف القاعدة لا يطابق الاتصال المفتوح. أعد تحميل الصفحة.');
    }
    return found;
  }
  return initializeApp(config, name);
}

function applyConfig(config) {
  if (!isValidProjectId(config.projectId) || !config.apiKey) {
    throw new Error('معرف مشروع Firebase غير صالح.');
  }
  activeApp = openNamed(config, appName(config.projectId));
  activeConfig = config;
  db = getFirestore(activeApp);
  auth = getAuth(activeApp);
  return config;
}

export function applyFirebaseProject(setup) {
  return applyConfig(buildConfig(setup));
}

export function bootstrapProject() {
  try {
    const config = resolveFirebaseConnection();
    if (!config) {
      if (isManualSetupMode() || isDevelopmentMode()) return 'wizard';
      applyConfig(webConfig());
      return 'ready';
    }
    applyConfig(config);
    return 'ready';
  } catch {
    if (isManualSetupMode() || isDevelopmentMode()) return 'wizard';
    try {
      applyConfig(webConfig());
    } catch {
      /* Login stays available even if the official project cannot be opened. */
    }
    return 'ready';
  }
}

export function centerDataKey(projectId = activeProjectId()) {
  return `mohobat-center::${projectId}::db`;
}

export function centerSessionKey(projectId = activeProjectId()) {
  return `mohobat-center::${projectId}::session`;
}

export function centerAttemptsKey(projectId = activeProjectId()) {
  return `mohobat-center::${projectId}::attempts`;
}

export async function resetFirebaseProject() {
  const projectId = activeConfig?.projectId;
  const names = projectId ? [appName(projectId), appName(projectId, true)] : [];
  const apps = getApps().filter((item) => names.includes(item.name));
  await Promise.all(apps.map((item) => deleteApp(item)));
  localStorage.removeItem(SETUP_KEY);
  activeApp = null;
  activeConfig = null;
  db = null;
  auth = null;
}

export function readCenterValue(storage, key, legacyKey = '') {
  const current = storage.getItem(key);
  if (current) return current;
  if (activeProjectId() === HOME_PROJECT_ID && legacyKey) return storage.getItem(legacyKey);
  return null;
}

export const legacyDataKey = LEGACY_DATA_KEY;
export const legacySessionKey = LEGACY_SESSION_KEY;

export function databaseGuard() {
  const projectId = activeConfig?.projectId;
  if (!projectId || !auth || !db) return 'لم يُحدَّد معرف قاعدة Firebase بعد.';
  const fromEnv = envFirebaseConfig()?.projectId;
  const saved = isManualSetupMode() ? readProjectSetup() : null;
  const expected = fromEnv || saved?.projectId || HOME_PROJECT_ID;
  if (projectId !== expected) {
    return saved
      ? 'توقفت المزامنة لأن معرف القاعدة المحفوظ لا يطابق الاتصال الحالي.'
      : 'توقفت المزامنة لأن موقع الويب ليس على قاعدة المشروع.';
  }
  if (auth.app?.options?.projectId !== projectId || db.app?.options?.projectId !== projectId) {
    return 'توقفت المزامنة لأن الاتصال ليس بقاعدة هذا المركز.';
  }
  return '';
}

export function readFirebaseConfig() {
  return activeConfig ? { ...activeConfig } : null;
}

export function activeProjectId() {
  return activeConfig?.projectId || '';
}

export function isFirebaseConfigured() {
  return Boolean(activeConfig?.projectId && activeConfig?.apiKey);
}

export function ensureFirebase() {
  if (!activeApp) throw new Error('لم يُحدَّد معرف قاعدة Firebase بعد.');
  return activeApp;
}

export function getSecondaryAuth() {
  if (!activeConfig) throw new Error('لم يُحدَّد معرف قاعدة Firebase بعد.');
  return getAuth(openNamed(activeConfig, appName(activeConfig.projectId, true)));
}

export function authEmail(nationalId, kind = 'staff') {
  if (activeProjectId() === HOME_PROJECT_ID) {
    const domain = kind === 'student' ? 'students.mohobat-khames.app' : 'mohobat-khames.app';
    return `${nationalId}@${domain}`;
  }
  const role = kind === 'student' ? 'students' : 'staff';
  return `${nationalId}@${role}.${activeProjectId()}.mohobat.app`;
}
