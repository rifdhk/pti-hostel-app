/**
 * Unified BaaS & Data Access Abstraction Layer (Zero-Cost Production Prep)
 *
 * Connects the application to either Firebase (Spark Free Tier) or Supabase
 * (Free Tier REST API) via Vite environment variables, while maintaining an
 * offline-capable localStorage mirror so single-institute pilots work cleanly
 * online or offline with zero code changes in UI components.
 */
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import app, {
  auth as firebaseAuth,
  db as firestoreDb,
  storage as firebaseStorage,
  isFirebaseConfigured
} from '../firebase';
import {
  SEED_PTIS,
  SEED_HOSTELS,
  SEED_USERS,
  SEED_ROOMS,
  SEED_ESTABLISHMENT_EXPENSES,
  SEED_DEPOSITS,
  SEED_BAZAR_EXPENSES,
  SEED_MEAL_SHEETS
} from './seedData';
import { sanitizeUserRecord } from '../utils/displayName';

export const STORAGE_KEYS = {
  PTIS: 'pti_db_registered_institutes',
  HOSTELS: 'pti_db_hostels',
  USERS: 'pti_db_users',
  ROOMS: 'pti_db_rooms',
  EST_EXPENSES: 'pti_db_est_expenses',
  DEPOSITS: 'pti_db_deposits',
  BAZAR: 'pti_db_bazar',
  MEAL_SHEETS: 'pti_db_meal_sheets',
  NEXT_DAY_MEALS: 'pti_next_day_meals',
  GLOBAL_SETTINGS: 'pti_global_settings',
  INITIALIZED_V3: 'pti_db_init_v3_multitier',
  INITIALIZED_V4: 'pti_db_init_v4_profiles',
  INITIALIZED_V5: 'pti_db_init_v5_approval_workflows',
  INITIALIZED_V6: 'pti_db_init_v6_multitenant_saas',
  INITIALIZED_V7: 'pti_db_init_v7_master_admin_global',
  INITIALIZED_V8: 'pti_db_init_v8_status_username_limits',
  INITIALIZED_V9: 'pti_db_init_v9_gender_avatars',
  INITIALIZED_V10: 'pti_db_init_v10_local_formal_avatars',
  INITIALIZED_V11: 'pti_db_init_v11_master_admin_rename'
};

export const COLLECTIONS = {
  PTIS: 'institutes',
  HOSTELS: 'hostels',
  USERS: 'app_users',
  ROOMS: 'rooms',
  EST_EXPENSES: 'establishment_expenses',
  DEPOSITS: 'deposits',
  BAZAR: 'bazar_expenses',
  MEAL_SHEETS: 'daily_meal_sheets',
  NEXT_DAY_MEALS: 'next_day_meals',
  SETTINGS: 'settings'
};

// Optional Supabase configuration from Vite environment
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

export const supabaseConfig = {
  url: (env.VITE_SUPABASE_URL || '').replace(/\/+$/, ''),
  anonKey: env.VITE_SUPABASE_ANON_KEY || ''
};

export const isSupabaseConfigured = Boolean(
  supabaseConfig.url &&
  supabaseConfig.anonKey &&
  !supabaseConfig.url.includes('your_project_ref')
);

const requestedProvider = String(env.VITE_BAAS_PROVIDER || '').trim().toLowerCase();

export const activeBaasProvider =
  requestedProvider === 'supabase' && isSupabaseConfigured
    ? 'supabase'
    : requestedProvider === 'firebase' && isFirebaseConfigured
      ? 'firebase'
      : isFirebaseConfigured
        ? 'firebase'
        : isSupabaseConfigured
          ? 'supabase'
          : 'local';

export const isBaasConfigured = activeBaasProvider !== 'local';

export { app, firebaseAuth, firestoreDb, firebaseStorage, isFirebaseConfigured };

/**
 * Lightweight zero-dependency Supabase PostgREST client helper
 */
export async function supabaseRequest(tableOrEndpoint, { method = 'GET', body, queryParams = '', headers = {} } = {}) {
  if (!isSupabaseConfigured || typeof fetch !== 'function') return null;

  const cleanPath = tableOrEndpoint.replace(/^\/+/, '');
  const url = `${supabaseConfig.url}/rest/v1/${cleanPath}${queryParams}`;

  const response = await fetch(url, {
    method,
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'resolution=merge-duplicates,return=representation' : 'return=representation',
      ...headers
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Supabase REST error (${response.status}): ${errText}`);
  }

  if (response.status === 204) return [];
  return response.json().catch(() => []);
}

export async function fetchCollectionFromCloud(collectionName) {
  if (!isBaasConfigured) return null;

  if (activeBaasProvider === 'firebase') {
    const snap = await getDocs(collection(firestoreDb, collectionName));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  if (activeBaasProvider === 'supabase') {
    const rows = await supabaseRequest(collectionName, { method: 'GET', queryParams: '?select=*' });
    return Array.isArray(rows) ? rows : null;
  }

  return null;
}

export async function queryFirebaseUserByField(fieldName, value) {
  if (activeBaasProvider !== 'firebase') return null;
  const q = query(collection(firestoreDb, COLLECTIONS.USERS), where(fieldName, '==', value));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function upsertRecordToCloud(collectionName, recordId, payload) {
  if (!isBaasConfigured || !recordId) return;

  if (activeBaasProvider === 'firebase') {
    await setDoc(doc(firestoreDb, collectionName, String(recordId)), payload, { merge: true });
    return;
  }

  if (activeBaasProvider === 'supabase') {
    await supabaseRequest(collectionName, {
      method: 'POST',
      body: { id: String(recordId), ...payload }
    });
  }
}

export async function deleteRecordFromCloud(collectionName, recordId) {
  if (!isBaasConfigured || !recordId) return;

  if (activeBaasProvider === 'firebase') {
    await deleteDoc(doc(firestoreDb, collectionName, String(recordId)));
    return;
  }

  if (activeBaasProvider === 'supabase') {
    await supabaseRequest(collectionName, {
      method: 'DELETE',
      queryParams: `?id=eq.${encodeURIComponent(String(recordId))}`
    });
  }
}

function fireCloudSync(taskFn, label) {
  if (!isBaasConfigured) return;
  Promise.resolve()
    .then(taskFn)
    .catch((err) => {
      console.warn(`[db:${activeBaasProvider}] ${label} sync warning (local copy retained):`, err);
    });
}

function readLocalCollection(storageKey, fallback = []) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return Array.isArray(fallback) ? [...fallback] : fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return Array.isArray(fallback) ? [...fallback] : fallback;
  }
}

function writeLocalCollection(storageKey, data, eventName = null, eventDetail = null) {
  localStorage.setItem(storageKey, JSON.stringify(data));
  if (eventName) {
    try {
      window.dispatchEvent(new CustomEvent(eventName, { detail: eventDetail }));
    } catch {}
  }
  return data;
}

const COLLECTION_REGISTRY = [
  { storageKey: STORAGE_KEYS.PTIS, cloudName: COLLECTIONS.PTIS, seed: SEED_PTIS },
  { storageKey: STORAGE_KEYS.HOSTELS, cloudName: COLLECTIONS.HOSTELS, seed: SEED_HOSTELS },
  { storageKey: STORAGE_KEYS.USERS, cloudName: COLLECTIONS.USERS, seed: SEED_USERS },
  { storageKey: STORAGE_KEYS.ROOMS, cloudName: COLLECTIONS.ROOMS, seed: SEED_ROOMS },
  { storageKey: STORAGE_KEYS.EST_EXPENSES, cloudName: COLLECTIONS.EST_EXPENSES, seed: SEED_ESTABLISHMENT_EXPENSES },
  { storageKey: STORAGE_KEYS.DEPOSITS, cloudName: COLLECTIONS.DEPOSITS, seed: SEED_DEPOSITS },
  { storageKey: STORAGE_KEYS.BAZAR, cloudName: COLLECTIONS.BAZAR, seed: SEED_BAZAR_EXPENSES },
  { storageKey: STORAGE_KEYS.MEAL_SHEETS, cloudName: COLLECTIONS.MEAL_SHEETS, seed: SEED_MEAL_SHEETS }
];

/**
 * Abstracted Repository API used across UI views and services.
 * All operations immediately update the responsive client cache and replicate to
 * Firebase/Supabase when BaaS credentials are configured.
 */
export const dbService = {
  getProviderStatus() {
    return {
      provider: activeBaasProvider,
      configured: isBaasConfigured,
      firebaseConfigured: isFirebaseConfigured,
      supabaseConfigured: isSupabaseConfigured
    };
  },

  async hydrateAllFromCloud() {
    if (!isBaasConfigured) return { hydrated: false, provider: 'local' };

    for (const entry of COLLECTION_REGISTRY) {
      try {
        const cloudItems = await fetchCollectionFromCloud(entry.cloudName);
        if (Array.isArray(cloudItems) && cloudItems.length > 0) {
          const normalized =
            entry.cloudName === COLLECTIONS.USERS
              ? cloudItems.map((u) => sanitizeUserRecord(u))
              : cloudItems;
          localStorage.setItem(entry.storageKey, JSON.stringify(normalized));
        }
      } catch (err) {
        console.warn(`[db:${activeBaasProvider}] Failed hydrating ${entry.cloudName}:`, err);
      }
    }

    return { hydrated: true, provider: activeBaasProvider };
  },

  // ---------------- USERS ----------------
  getUsers(filterFn = null) {
    const users = readLocalCollection(STORAGE_KEYS.USERS, SEED_USERS).map((u) => sanitizeUserRecord(u));
    return typeof filterFn === 'function' ? users.filter(filterFn) : users;
  },

  saveUsers(usersList, eventDetail = null) {
    const sanitized = usersList.map((u) => sanitizeUserRecord(u));
    return writeLocalCollection(STORAGE_KEYS.USERS, sanitized, 'pti_users_changed', eventDetail);
  },

  insertUser(user) {
    const clean = sanitizeUserRecord(user);
    const users = dbService.getUsers();
    const updated = [...users, clean];
    writeLocalCollection(STORAGE_KEYS.USERS, updated, 'pti_users_changed', clean);
    fireCloudSync(() => upsertRecordToCloud(COLLECTIONS.USERS, clean.id || clean.loginId, clean), 'insertUser');
    return clean;
  },

  // ---------------- DEPOSITS ----------------
  getDeposits(filterFn = null) {
    const deposits = readLocalCollection(STORAGE_KEYS.DEPOSITS, SEED_DEPOSITS);
    return typeof filterFn === 'function' ? deposits.filter(filterFn) : deposits;
  },

  insertDeposit(entry) {
    const deposits = dbService.getDeposits();
    const updated = [entry, ...deposits];
    writeLocalCollection(STORAGE_KEYS.DEPOSITS, updated, 'pti_deposits_changed', entry);
    fireCloudSync(() => upsertRecordToCloud(COLLECTIONS.DEPOSITS, entry.id, entry), 'insertDeposit');
    return updated;
  },

  updateDepositDecision(id, decision, approver = {}) {
    const deposits = dbService.getDeposits();
    const approverName = approver.name || 'Authorized Reviewer';
    const approverRole = approver.role || 'Reviewer';
    const approverId = approver.id || null;
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);

    let updatedRecord = null;
    const updated = deposits.map((d) => {
      if (d.id === id) {
        updatedRecord = {
          ...d,
          status: decision,
          approvedBy: `${decision === 'approved' ? 'Approved' : 'Rejected'} by: ${approverName} (${approverRole})`,
          approvedBy_id: approverId,
          approvedBy_name: approverName,
          approvedBy_role: approverRole,
          approvedAt: timestamp
        };
        return updatedRecord;
      }
      return d;
    });

    writeLocalCollection(STORAGE_KEYS.DEPOSITS, updated, 'pti_deposits_changed', { id, decision });
    if (updatedRecord) {
      fireCloudSync(() => upsertRecordToCloud(COLLECTIONS.DEPOSITS, updatedRecord.id, updatedRecord), 'updateDepositDecision');
    }
    return { updated, record: updatedRecord };
  },

  // ---------------- MEALS & MEAL SHEETS ----------------
  getMealSheets(filterFn = null) {
    const sheets = readLocalCollection(STORAGE_KEYS.MEAL_SHEETS, SEED_MEAL_SHEETS);
    return typeof filterFn === 'function' ? sheets.filter(filterFn) : sheets;
  },

  saveMealSheets(sheets, detail = null) {
    return writeLocalCollection(STORAGE_KEYS.MEAL_SHEETS, sheets, 'pti_meals_changed', detail);
  },

  updateMealSheet(sheet) {
    if (!sheet) return [];
    const allSheets = dbService.getMealSheets();
    const exists = allSheets.some((m) => m.id === sheet.id);
    const updated = exists
      ? allSheets.map((m) => (m.id === sheet.id ? sheet : m))
      : [sheet, ...allSheets];

    writeLocalCollection(STORAGE_KEYS.MEAL_SHEETS, updated, 'pti_meals_changed', { sheetId: sheet.id });
    fireCloudSync(() => upsertRecordToCloud(COLLECTIONS.MEAL_SHEETS, sheet.id, sheet), 'updateMealSheet');
    return updated;
  },

  getNextDayMealsMap() {
    return readLocalCollection(STORAGE_KEYS.NEXT_DAY_MEALS, {});
  },

  saveNextDayMealEntry(key, entry) {
    const stored = dbService.getNextDayMealsMap();
    const updatedMap = { ...stored, [key]: entry };
    localStorage.setItem(STORAGE_KEYS.NEXT_DAY_MEALS, JSON.stringify(updatedMap));
    fireCloudSync(() => upsertRecordToCloud(COLLECTIONS.NEXT_DAY_MEALS, key, entry), 'saveNextDayMealEntry');
    return entry;
  },

  // ---------------- ESTABLISHMENT & BAZAR EXPENSES ----------------
  getEstablishmentExpenses(filterFn = null) {
    const expenses = readLocalCollection(STORAGE_KEYS.EST_EXPENSES, SEED_ESTABLISHMENT_EXPENSES);
    return typeof filterFn === 'function' ? expenses.filter(filterFn) : expenses;
  },

  insertEstablishmentExpense(entry) {
    const expenses = dbService.getEstablishmentExpenses();
    const updated = [entry, ...expenses];
    writeLocalCollection(STORAGE_KEYS.EST_EXPENSES, updated);
    fireCloudSync(() => upsertRecordToCloud(COLLECTIONS.EST_EXPENSES, entry.id, entry), 'insertEstablishmentExpense');
    return updated;
  },

  updateEstablishmentExpenseDecision(id, decision, approverLabel) {
    const expenses = dbService.getEstablishmentExpenses();
    let updatedRecord = null;
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updated = expenses.map((exp) => {
      if (exp.id === id) {
        updatedRecord = {
          ...exp,
          status: decision,
          approvedBy: approverLabel,
          approvedAt: timestamp
        };
        return updatedRecord;
      }
      return exp;
    });

    writeLocalCollection(STORAGE_KEYS.EST_EXPENSES, updated);
    if (updatedRecord) {
      fireCloudSync(
        () => upsertRecordToCloud(COLLECTIONS.EST_EXPENSES, updatedRecord.id, updatedRecord),
        'updateEstablishmentExpenseDecision'
      );
    }
    return { updated, record: updatedRecord };
  },

  getBazarExpenses(filterFn = null) {
    const bazar = readLocalCollection(STORAGE_KEYS.BAZAR, SEED_BAZAR_EXPENSES);
    return typeof filterFn === 'function' ? bazar.filter(filterFn) : bazar;
  },

  insertBazarExpense(entry) {
    const bazar = dbService.getBazarExpenses();
    const updated = [entry, ...bazar];
    writeLocalCollection(STORAGE_KEYS.BAZAR, updated);
    fireCloudSync(() => upsertRecordToCloud(COLLECTIONS.BAZAR, entry.id, entry), 'insertBazarExpense');
    return updated;
  },

  // ---------------- HOSTELS, ROOMS & INSTITUTES ----------------
  getHostels(filterFn = null) {
    const hostels = readLocalCollection(STORAGE_KEYS.HOSTELS, SEED_HOSTELS);
    return typeof filterFn === 'function' ? hostels.filter(filterFn) : hostels;
  },

  getRooms(filterFn = null) {
    const rooms = readLocalCollection(STORAGE_KEYS.ROOMS, SEED_ROOMS);
    return typeof filterFn === 'function' ? rooms.filter(filterFn) : rooms;
  },

  saveRooms(rooms) {
    return writeLocalCollection(STORAGE_KEYS.ROOMS, rooms, 'pti_rooms_changed');
  },

  getPtis() {
    return readLocalCollection(STORAGE_KEYS.PTIS, SEED_PTIS);
  },

  savePtis(ptis, eventDetail = null) {
    return writeLocalCollection(STORAGE_KEYS.PTIS, ptis, 'pti_institutes_changed', eventDetail);
  },

  getSettingsJson(key, defaultValue = {}) {
    return readLocalCollection(key, defaultValue);
  },

  saveSettingsJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    fireCloudSync(() => upsertRecordToCloud(COLLECTIONS.SETTINGS, key, value), 'saveSettingsJson');
    return value;
  }
};

export default dbService;
