import {
  STORAGE_KEYS,
  COLLECTIONS,
  activeBaasProvider,
  isBaasConfigured,
  isFirebaseConfigured,
  fetchCollectionFromCloud,
  queryFirebaseUserByField,
  upsertRecordToCloud,
  deleteRecordFromCloud,
  supabaseRequest,
  dbService
} from './db';
import {
  normalizeGender,
  getDefaultAvatarId,
  isValidAvatarId,
  isAvatarValidForGender
} from '../constants/avatars';
import { sanitizeUserRecord } from '../utils/displayName';
import { 
  SEED_PTIS,
  SEED_HOSTELS,
  SEED_USERS, 
  SEED_ROOMS, 
  SEED_ESTABLISHMENT_EXPENSES,
  SEED_DEPOSITS,
  SEED_BAZAR_EXPENSES,
  SEED_MEAL_SHEETS,
  USER_ROLES
} from './seedData';

export { STORAGE_KEYS };

/**
 * Normalizes PTI status values strictly to 'Active' | 'Paused' | 'Blocked'
 */
export function normalizePtiStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  if (s === 'paused') return 'Paused';
  if (s === 'blocked') return 'Blocked';
  return 'Active';
}

/**
 * Initializes and seeds foundational data into Local Storage and Firestore.
 * Supports Multi-Tenant SaaS architecture with pti_id scoping and Tier 0 Master Admin.
 */
export async function initializeSeedData(force = false) {
  const isAlreadySeededV8 = localStorage.getItem(STORAGE_KEYS.INITIALIZED_V8);
  const isAlreadySeededV9 = localStorage.getItem(STORAGE_KEYS.INITIALIZED_V9);
  const isAlreadySeededV10 = localStorage.getItem(STORAGE_KEYS.INITIALIZED_V10);
  const isAlreadySeededV11 = localStorage.getItem(STORAGE_KEYS.INITIALIZED_V11);

  // 1. Local Storage initialization for immediate full offline & sandbox readiness
  if (!isAlreadySeededV8 || !isAlreadySeededV9 || !isAlreadySeededV10 || !isAlreadySeededV11 || force) {
    // 1a. Registered Institutes (PTIs)
    const existingPtis = localStorage.getItem(STORAGE_KEYS.PTIS);
    if (!existingPtis || force) {
      localStorage.setItem(STORAGE_KEYS.PTIS, JSON.stringify(SEED_PTIS));
    } else {
      try {
        const parsedPtis = JSON.parse(existingPtis);
        const upgradedPtis = parsedPtis.map(p => ({
          ...p,
          status: normalizePtiStatus(p.status),
        }));
        localStorage.setItem(STORAGE_KEYS.PTIS, JSON.stringify(upgradedPtis));
      } catch {
        localStorage.setItem(STORAGE_KEYS.PTIS, JSON.stringify(SEED_PTIS));
      }
    }

    // 1b. Multi-tenant Users: Ensure all users carry pti_id, and include Master Admin (T0)
    const existingUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!existingUsers || force) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    } else {
      try {
        const parsed = JSON.parse(existingUsers);
        // Ensure Master Admin and cross-tenant seed users exist
        const mergedUsers = [...parsed];
        
        SEED_USERS.forEach(su => {
          const idx = mergedUsers.findIndex(u => 
            u.id === su.id || 
            u.loginId === su.loginId || 
            (su.role === USER_ROLES.MASTER_ADMIN && (u.role === USER_ROLES.MASTER_ADMIN || u.loginId === 'master' || u.loginId === 'master@pti.gov.bd'))
          );
          if (idx === -1) {
            mergedUsers.push(su);
          } else {
            mergedUsers[idx] = {
              ...su,
              ...mergedUsers[idx],
              password: su.role === USER_ROLES.MASTER_ADMIN ? su.password : (mergedUsers[idx].password || su.password),
              pti_id: su.role === USER_ROLES.MASTER_ADMIN ? 'GLOBAL' : (mergedUsers[idx].pti_id || su.pti_id || 'pti_dhaka'),
              name: su.role === USER_ROLES.MASTER_ADMIN ? 'Master Admin' : (mergedUsers[idx].name || su.name),
              designation: su.role === USER_ROLES.MASTER_ADMIN ? 'Master Admin' : (mergedUsers[idx].designation || su.designation),
              hostelName: su.role === USER_ROLES.MASTER_ADMIN ? 'Central Admin (67 PTIs)' : (mergedUsers[idx].hostelName || su.hostelName),
              loginId: su.role === USER_ROLES.MASTER_ADMIN ? 'master' : (mergedUsers[idx].loginId || su.loginId),
              username: su.role === USER_ROLES.MASTER_ADMIN ? 'master' : (mergedUsers[idx].username || mergedUsers[idx].loginId || su.username || su.loginId),
              email: su.role === USER_ROLES.MASTER_ADMIN ? 'master@pti.gov.bd' : (mergedUsers[idx].email || su.email),
            };
          }
        });

        // Ensure all legacy users have default fields, gender, avatar_id & username_changes_left
        const upgraded = mergedUsers.map((u, idx) => {
          const isSuper = u.role === USER_ROLES.SUPERINTENDENT || u.role === 'superintendent';
          const userGender = normalizeGender(u.gender);
          const { avatar_url: _legacyAvatarUrl, ...restUser } = u;
          const resolvedAvatarId = isValidAvatarId(restUser.avatar_id)
            ? restUser.avatar_id
            : getDefaultAvatarId(userGender, idx);
          return sanitizeUserRecord({
            ...restUser,
            pti_id: (restUser.role === USER_ROLES.MASTER_ADMIN || restUser.role === 'master_admin') ? 'GLOBAL' : (restUser.pti_id || 'pti_dhaka'),
            username: restUser.username || restUser.loginId,
            gender: userGender,
            avatar_id: resolvedAvatarId,
            ...(isSuper ? {
              username_changes_left: typeof restUser.username_changes_left === 'number' ? restUser.username_changes_left : 3,
            } : {}),
            phone_number: restUser.phone_number || restUser.phone || '+880 1712-345678',
            district: restUser.district || 'Dhaka',
            upazila: restUser.upazila || 'Sadar',
            union_ward: restUser.union_ward || 'Ward 01',
            blood_group: restUser.blood_group || 'B+',
            emergency_contact: restUser.emergency_contact || '+880 1819-998877',
          });
        });

        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(upgraded));
      } catch {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
      }
    }

    // 1c. Multi-tenant Hostels
    const existingHostels = localStorage.getItem(STORAGE_KEYS.HOSTELS);
    if (!existingHostels || force) {
      localStorage.setItem(STORAGE_KEYS.HOSTELS, JSON.stringify(SEED_HOSTELS));
    } else {
      try {
        const parsed = JSON.parse(existingHostels);
        const mergedHostels = [...parsed];
        SEED_HOSTELS.forEach(sh => {
          if (!mergedHostels.some(h => h.id === sh.id)) {
            mergedHostels.push(sh);
          }
        });
        const upgradedHostels = mergedHostels.map(h => ({
          ...h,
          pti_id: h.pti_id || 'pti_dhaka'
        }));
        localStorage.setItem(STORAGE_KEYS.HOSTELS, JSON.stringify(upgradedHostels));
      } catch {
        localStorage.setItem(STORAGE_KEYS.HOSTELS, JSON.stringify(SEED_HOSTELS));
      }
    }

    // 1d. Multi-tenant Rooms
    const existingRooms = localStorage.getItem(STORAGE_KEYS.ROOMS);
    if (!existingRooms || force) {
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(SEED_ROOMS));
    } else {
      try {
        const parsed = JSON.parse(existingRooms);
        const upgraded = parsed.map(r => ({ ...r, pti_id: r.pti_id || 'pti_dhaka' }));
        localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(upgraded));
      } catch {
        localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(SEED_ROOMS));
      }
    }

    // 1e. Multi-tenant Establishment Expenses
    const existingExp = localStorage.getItem(STORAGE_KEYS.EST_EXPENSES);
    if (!existingExp || force) {
      localStorage.setItem(STORAGE_KEYS.EST_EXPENSES, JSON.stringify(SEED_ESTABLISHMENT_EXPENSES));
    } else {
      try {
        const parsed = JSON.parse(existingExp);
        const upgraded = parsed.map(e => ({ ...e, pti_id: e.pti_id || 'pti_dhaka' }));
        localStorage.setItem(STORAGE_KEYS.EST_EXPENSES, JSON.stringify(upgraded));
      } catch {
        localStorage.setItem(STORAGE_KEYS.EST_EXPENSES, JSON.stringify(SEED_ESTABLISHMENT_EXPENSES));
      }
    }

    // 1f. Multi-tenant Deposits
    const existingDep = localStorage.getItem(STORAGE_KEYS.DEPOSITS);
    if (!existingDep || force) {
      localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(SEED_DEPOSITS));
    } else {
      try {
        const parsed = JSON.parse(existingDep);
        const upgraded = parsed.map(d => ({ ...d, pti_id: d.pti_id || 'pti_dhaka' }));
        localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(upgraded));
      } catch {
        localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(SEED_DEPOSITS));
      }
    }

    // 1g. Multi-tenant Bazar & Meal Sheets
    const existingBazar = localStorage.getItem(STORAGE_KEYS.BAZAR);
    if (!existingBazar || force) {
      localStorage.setItem(STORAGE_KEYS.BAZAR, JSON.stringify(SEED_BAZAR_EXPENSES));
    } else {
      try {
        const parsed = JSON.parse(existingBazar);
        const upgraded = parsed.map(b => ({ ...b, pti_id: b.pti_id || 'pti_dhaka' }));
        localStorage.setItem(STORAGE_KEYS.BAZAR, JSON.stringify(upgraded));
      } catch {
        localStorage.setItem(STORAGE_KEYS.BAZAR, JSON.stringify(SEED_BAZAR_EXPENSES));
      }
    }

    const existingMeals = localStorage.getItem(STORAGE_KEYS.MEAL_SHEETS);
    if (!existingMeals || force) {
      localStorage.setItem(STORAGE_KEYS.MEAL_SHEETS, JSON.stringify(SEED_MEAL_SHEETS));
    } else {
      try {
        const parsed = JSON.parse(existingMeals);
        const upgraded = parsed.map(m => ({ ...m, pti_id: m.pti_id || 'pti_dhaka' }));
        localStorage.setItem(STORAGE_KEYS.MEAL_SHEETS, JSON.stringify(upgraded));
      } catch {
        localStorage.setItem(STORAGE_KEYS.MEAL_SHEETS, JSON.stringify(SEED_MEAL_SHEETS));
      }
    }

    localStorage.setItem(STORAGE_KEYS.INITIALIZED_V3, 'true');
    localStorage.setItem(STORAGE_KEYS.INITIALIZED_V4, 'true');
    localStorage.setItem(STORAGE_KEYS.INITIALIZED_V5, 'true');
    localStorage.setItem(STORAGE_KEYS.INITIALIZED_V6, 'true');
    localStorage.setItem(STORAGE_KEYS.INITIALIZED_V7, 'true');
    localStorage.setItem(STORAGE_KEYS.INITIALIZED_V8, 'true');
    localStorage.setItem(STORAGE_KEYS.INITIALIZED_V9, 'true');
    localStorage.setItem(STORAGE_KEYS.INITIALIZED_V10, 'true');
    localStorage.setItem(STORAGE_KEYS.INITIALIZED_V11, 'true');
    console.info('✓ Multi-Tenant SaaS Architecture successfully seeded with pti_id isolation & Master Admin (T0).');
  }

  // 2. Cloud BaaS initialization / hydration (Firebase Firestore or Supabase PostgREST)
  if (isBaasConfigured) {
    try {
      const cloudUsers = await fetchCollectionFromCloud(COLLECTIONS.USERS);

      if (!cloudUsers || cloudUsers.length === 0 || force) {
        const seedBatches = [
          [COLLECTIONS.PTIS, SEED_PTIS],
          [COLLECTIONS.HOSTELS, SEED_HOSTELS],
          [COLLECTIONS.USERS, SEED_USERS],
          [COLLECTIONS.ROOMS, SEED_ROOMS],
          [COLLECTIONS.EST_EXPENSES, SEED_ESTABLISHMENT_EXPENSES],
          [COLLECTIONS.DEPOSITS, SEED_DEPOSITS],
          [COLLECTIONS.BAZAR, SEED_BAZAR_EXPENSES],
          [COLLECTIONS.MEAL_SHEETS, SEED_MEAL_SHEETS]
        ];
        for (const [colName, items] of seedBatches) {
          for (const item of items) {
            await upsertRecordToCloud(colName, item.id, item);
          }
        }
        console.info(`✓ Cloud BaaS (${activeBaasProvider}) collections seeded with multi-tenant SaaS data.`);
      } else {
        await dbService.hydrateAllFromCloud();
      }
    } catch (err) {
      console.warn(`Cloud BaaS (${activeBaasProvider}) seeding error (falling back to local storage):`, err);
    }
  }

  return true;
}

/**
 * Direct lookup for user by identifier (loginId, rollNumber, or email)
 * Supports Master Admin (master@pti.gov.bd / master) and scoped logins.
 */
export async function findUserByIdentifier(identifier) {
  const cleanedId = String(identifier).trim().toLowerCase();

  // Try Cloud BaaS query if configured
  if (isFirebaseConfigured) {
    try {
      const byLogin = await queryFirebaseUserByField('loginId', cleanedId);
      if (byLogin) return sanitizeUserRecord(byLogin);

      const byRoll = await queryFirebaseUserByField('rollNumber', cleanedId);
      if (byRoll) return sanitizeUserRecord(byRoll);
    } catch (err) {
      console.warn('Firestore query fallback to local database:', err);
    }
  } else if (activeBaasProvider === 'supabase') {
    try {
      const byLogin = await supabaseRequest(COLLECTIONS.USERS, {
        queryParams: `?loginId=eq.${encodeURIComponent(cleanedId)}&limit=1`
      });
      if (Array.isArray(byLogin) && byLogin.length > 0) {
        return sanitizeUserRecord(byLogin[0]);
      }

      const byRoll = await supabaseRequest(COLLECTIONS.USERS, {
        queryParams: `?rollNumber=eq.${encodeURIComponent(cleanedId)}&limit=1`
      });
      if (Array.isArray(byRoll) && byRoll.length > 0) {
        return sanitizeUserRecord(byRoll[0]);
      }
    } catch (err) {
      console.warn('Supabase query fallback to local database:', err);
    }
  }

  // Local / hydrated cache lookup
  const users = dbService.getUsers();

  const matchedUser = users.find(u => {
    const login = String(u.loginId || '').toLowerCase();
    const uname = String(u.username || '').toLowerCase();
    const roll = u.rollNumber != null ? String(u.rollNumber).toLowerCase() : '';
    const email = String(u.email || '').toLowerCase();
    const id = String(u.id || '').toLowerCase();

    // Check direct match
    if (login === cleanedId || uname === cleanedId || roll === cleanedId || email === cleanedId || id === cleanedId) {
      return true;
    }
    // Master admin aliases: 'master' or 'master@pti.gov.bd' matches Master Admin
    if ((cleanedId === 'master' || cleanedId === 'master@pti.gov.bd') && (u.role === USER_ROLES.MASTER_ADMIN || u.role === 'master_admin' || login === 'master' || email === 'master@pti.gov.bd')) {
      return true;
    }
    return false;
  });
  return matchedUser ? sanitizeUserRecord(matchedUser) : null;
}

/**
 * Updates a user's profile and administrative information in local storage and Firestore.
 */
export async function updateUserData(userIdOrRoll, updates) {
  const users = dbService.getUsers();
  const searchKey = String(userIdOrRoll).trim().toLowerCase();
  
  let targetUser = null;
  const updatedUsers = users.map(u => {
    const matchId = u.id && String(u.id).toLowerCase() === searchKey;
    const matchLogin = u.loginId && String(u.loginId).toLowerCase() === searchKey;
    const matchRoll = u.rollNumber && String(u.rollNumber).toLowerCase() === searchKey;

    if (matchId || matchLogin || matchRoll) {
      // If hostelId was changed, resolve hostelName if not provided
      let hostelName = u.hostelName;
      if (Object.prototype.hasOwnProperty.call(updates, 'hostelName')) {
        hostelName = updates.hostelName;
      } else if (updates.hostelId) {
        const hostels = dbService.getHostels();
        const matchedHostel = hostels.find(h => h.id === updates.hostelId);
        if (matchedHostel) {
          hostelName = matchedHostel.name;
        }
      } else if (updates.hostelId === null) {
        hostelName = null;
      }

      const nextGender = updates.gender ? normalizeGender(updates.gender) : normalizeGender(u.gender);
      const requestedAvatarId = isValidAvatarId(updates.avatar_id) ? updates.avatar_id : null;
      const existingAvatarId = isValidAvatarId(u.avatar_id) ? u.avatar_id : null;
      let nextAvatarId = requestedAvatarId || existingAvatarId;
      if (updates.gender && !requestedAvatarId) {
        if (!isAvatarValidForGender(nextAvatarId, nextGender)) {
          nextAvatarId = getDefaultAvatarId(nextGender);
        }
      } else if (!nextAvatarId) {
        nextAvatarId = getDefaultAvatarId(nextGender);
      }

      const { avatar_url: _legacyStoredUrl, ...cleanUser } = u;
      const { avatar_url: _legacyUpdateUrl, ...cleanUpdates } = updates;

      targetUser = {
        ...cleanUser,
        ...cleanUpdates,
        gender: nextGender,
        avatar_id: nextAvatarId,
        hostelName: hostelName,
        // Sync phone and phone_number
        phone: updates.phone_number || updates.phone || u.phone,
        phone_number: updates.phone_number || updates.phone || u.phone_number,
      };
      return targetUser;
    }
    return u;
  });

  if (targetUser) {
    dbService.saveUsers(updatedUsers, targetUser);

    // Sync Cloud BaaS (Firebase or Supabase) if configured
    if (isBaasConfigured && (targetUser.id || targetUser.loginId)) {
      try {
        await upsertRecordToCloud(COLLECTIONS.USERS, targetUser.id || targetUser.loginId, targetUser);
      } catch (err) {
        console.warn(`Cloud BaaS (${activeBaasProvider}) user update fallback:`, err);
      }
    }
  }

  return targetUser;
}

/**
 * Deletes a user record permanently from local cache and Cloud BaaS.
 * Also cleans up bed occupancy in the assigned room.
 */
export async function deleteUserData(userIdOrRoll) {
  const users = dbService.getUsers();
  const searchKey = String(userIdOrRoll).trim().toLowerCase();

  const userToDelete = users.find(u => 
    (u.id && String(u.id).toLowerCase() === searchKey) ||
    (u.loginId && String(u.loginId).toLowerCase() === searchKey) ||
    (u.rollNumber && String(u.rollNumber).toLowerCase() === searchKey)
  );

  if (!userToDelete) return false;

  const remainingUsers = users.filter(u => u !== userToDelete);

  // Release bed from room if assigned
  if (userToDelete.roomNumber && userToDelete.hostelId) {
    const rooms = dbService.getRooms();
    const updatedRooms = rooms.map(r => {
      if (r.hostelId === userToDelete.hostelId && String(r.roomNumber) === String(userToDelete.roomNumber)) {
        return {
          ...r,
          occupied: Math.max(0, (r.occupied || 1) - 1),
          residents: (r.residents || []).filter(name => 
            !name.includes(userToDelete.name) && 
            !name.includes(userToDelete.rollNumber || '')
          )
        };
      }
      return r;
    });
    dbService.saveRooms(updatedRooms);
  }

  // Persist user list & notify active views
  dbService.saveUsers(remainingUsers, { deletedId: userToDelete.id, user: userToDelete });

  // Delete from Cloud BaaS (Firebase or Supabase) if configured
  if (isBaasConfigured && userToDelete.id) {
    try {
      await deleteRecordFromCloud(COLLECTIONS.USERS, userToDelete.id);
    } catch (err) {
      console.warn(`Cloud BaaS (${activeBaasProvider}) user delete fallback:`, err);
    }
  }

  return true;
}

/**
 * Multi-Tenant SaaS Helper Functions
 */

export function getAllPtis() {
  return dbService.getPtis();
}

export function getPtiById(ptiId) {
  const ptis = getAllPtis();
  return ptis.find(p => p.id === ptiId || p.pti_id === ptiId) || null;
}

export function getPtiUserCount(ptiId) {
  return dbService.getUsers(u => u.pti_id === ptiId && u.role !== USER_ROLES.MASTER_ADMIN).length;
}

export function getPtiHostelCount(ptiId) {
  return dbService.getHostels(h => h.pti_id === ptiId).length;
}

export function registerNewPti({ name, shortName, district, division, code }) {
  const ptis = getAllPtis();
  const slug = (shortName || name || 'pti')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 15);
  const newPtiId = `pti_${slug}_${Date.now().toString().slice(-4)}`;
  
  const newPti = {
    id: newPtiId,
    pti_id: newPtiId,
    name: name || "New Primary Teachers' Training Institute",
    shortName: shortName || name?.split(' ')[0] || 'PTI',
    district: district || 'Dhaka',
    division: division || 'Dhaka',
    code: code || `PTI-${(district || 'GEN').toUpperCase().slice(0, 3)}-${(ptis.length + 1).toString().padStart(2, '0')}`,
    superintendentId: null,
    superintendentName: null,
    superintendentEmail: null,
    superintendentPhone: null,
    totalHostels: 0,
    status: 'Active',
    createdAt: new Date().toISOString().split('T')[0],
    settings: {
      instituteName: name || "New Primary Teachers' Training Institute",
      appTitle: `${shortName || 'PTI'} - Hostel Management System`,
      instituteShortName: shortName || 'PTI',
      fixedEstablishmentFee: 1200,
      cutOffTime: "20:00",
      mealCalculationsEnabled: true,
      establishmentCalculationsEnabled: true,
    }
  };

  const updatedPtis = [newPti, ...ptis];
  dbService.savePtis(updatedPtis, newPti);

  if (isBaasConfigured) {
    Promise.resolve()
      .then(() => upsertRecordToCloud(COLLECTIONS.PTIS, newPti.id, newPti))
      .catch((err) => console.warn(`Cloud BaaS (${activeBaasProvider}) registerNewPti sync:`, err));
  }

  return newPti;
}

export function appointSuperintendent(ptiId, { name, loginId, password, email, phone, gender, avatar_id }) {
  const ptis = getAllPtis();
  const targetPti = ptis.find(p => p.id === ptiId || p.pti_id === ptiId);
  if (!targetPti) throw new Error(`PTI with id ${ptiId} not found.`);

  const users = dbService.getUsers();

  const userId = `super_${ptiId}_${Date.now().toString().slice(-4)}`;
  const effectiveLoginId = (loginId || email || `super.${targetPti.code || ptiId}@pti.gov.bd`).toLowerCase().trim();
  const resolvedGender = normalizeGender(gender);

  // Check if user already exists
  const existingIdx = users.findIndex(u => 
    (u.loginId && u.loginId.toLowerCase() === effectiveLoginId) || 
    (u.email && u.email.toLowerCase() === (email || '').toLowerCase())
  );

  const superUser = {
    id: existingIdx >= 0 ? users[existingIdx].id : userId,
    pti_id: ptiId,
    name: name || 'Superintendent',
    loginId: effectiveLoginId,
    username: effectiveLoginId,
    username_changes_left: 3,
    password: password || 'super123',
    role: USER_ROLES.SUPERINTENDENT,
    gender: resolvedGender,
    avatar_id: isValidAvatarId(avatar_id) ? avatar_id : getDefaultAvatarId(resolvedGender),
    email: email || `${effectiveLoginId}@pti.gov.bd`,
    phone: phone || '+880 1711-000000',
    phone_number: phone || '+880 1711-000000',
    hostelId: null,
    hostelName: 'All Hostels (Institution-wide)',
    roomNumber: null,
    district: targetPti.district || 'Dhaka',
    upazila: 'Sadar',
    blood_group: 'A+',
    status: 'active',
    joinedDate: new Date().toISOString().split('T')[0]
  };

  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...superUser };
  } else {
    users.unshift(superUser);
  }

  // Update target PTI with appointed Superintendent
  const updatedPtis = ptis.map(p => {
    if (p.id === ptiId || p.pti_id === ptiId) {
      return {
        ...p,
        superintendentId: superUser.id,
        superintendentName: superUser.name,
        superintendentEmail: superUser.email,
        superintendentPhone: superUser.phone,
        status: normalizePtiStatus(p.status)
      };
    }
    return p;
  });

  dbService.savePtis(updatedPtis, { ptiId, superUser });
  dbService.saveUsers(users, superUser);

  if (isBaasConfigured) {
    const savedPti = updatedPtis.find(p => p.id === ptiId || p.pti_id === ptiId);
    Promise.resolve()
      .then(async () => {
        await upsertRecordToCloud(COLLECTIONS.USERS, superUser.id, superUser);
        if (savedPti) await upsertRecordToCloud(COLLECTIONS.PTIS, savedPti.id, savedPti);
      })
      .catch((err) => console.warn(`Cloud BaaS (${activeBaasProvider}) appointSuperintendent sync:`, err));
  }

  return { pti: updatedPtis.find(p => p.id === ptiId || p.pti_id === ptiId), superintendent: superUser };
}

/**
 * Updates the global status of a registered PTI ('Active' | 'Paused' | 'Blocked').
 */
export function updatePtiStatus(ptiId, newStatus) {
  const normalized = normalizePtiStatus(newStatus);
  const ptis = getAllPtis();
  let updatedPti = null;

  const nextPtis = ptis.map(p => {
    if (p.id === ptiId || p.pti_id === ptiId) {
      updatedPti = { ...p, status: normalized };
      return updatedPti;
    }
    return p;
  });

  if (!updatedPti) {
    throw new Error(`PTI with id "${ptiId}" not found.`);
  }

  dbService.savePtis(nextPtis, { ptiId, status: normalized, pti: updatedPti });

  if (isBaasConfigured) {
    Promise.resolve()
      .then(() => upsertRecordToCloud(COLLECTIONS.PTIS, updatedPti.id, updatedPti))
      .catch((err) => console.warn(`Cloud BaaS (${activeBaasProvider}) updatePtiStatus sync:`, err));
  }

  return updatedPti;
}

/**
 * Permanently deletes a PTI and cascades deletion to all associated users,
 * hostels, rooms, deposits, bazar expenses, establishment expenses, meal sheets, and settings.
 */
export function deletePtiCascade(ptiId) {
  const ptis = getAllPtis();
  const target = ptis.find(p => p.id === ptiId || p.pti_id === ptiId);
  if (!target) {
    throw new Error(`PTI with id "${ptiId}" not found.`);
  }

  const remainingPtis = ptis.filter(p => p.id !== ptiId && p.pti_id !== ptiId);
  dbService.savePtis(remainingPtis, { deletedPtiId: ptiId });

  const cloudRemovals = [[COLLECTIONS.PTIS, target.id || ptiId]];

  // Cascade deletion helper for tenant collections
  const cascadeFilter = (storageKey, collectionName) => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const toDelete = list.filter(item => item.pti_id === ptiId);
        toDelete.forEach(item => {
          if (item?.id) cloudRemovals.push([collectionName, item.id]);
        });
        const filtered = list.filter(item => item.pti_id !== ptiId);
        localStorage.setItem(storageKey, JSON.stringify(filtered));
      }
    } catch (err) {
      console.warn(`Cascade cleanup warning for ${storageKey}:`, err);
    }
  };

  cascadeFilter(STORAGE_KEYS.USERS, COLLECTIONS.USERS);
  cascadeFilter(STORAGE_KEYS.HOSTELS, COLLECTIONS.HOSTELS);
  cascadeFilter(STORAGE_KEYS.ROOMS, COLLECTIONS.ROOMS);
  cascadeFilter(STORAGE_KEYS.EST_EXPENSES, COLLECTIONS.EST_EXPENSES);
  cascadeFilter(STORAGE_KEYS.DEPOSITS, COLLECTIONS.DEPOSITS);
  cascadeFilter(STORAGE_KEYS.BAZAR, COLLECTIONS.BAZAR);
  cascadeFilter(STORAGE_KEYS.MEAL_SHEETS, COLLECTIONS.MEAL_SHEETS);

  try {
    localStorage.removeItem(`pti_settings_${ptiId}`);
    window.dispatchEvent(new CustomEvent('pti_users_changed', { detail: { deletedPtiId: ptiId } }));
  } catch {}

  if (isBaasConfigured) {
    Promise.resolve()
      .then(async () => {
        for (const [colName, recId] of cloudRemovals) {
          await deleteRecordFromCloud(colName, recId);
        }
      })
      .catch((err) => console.warn(`Cloud BaaS (${activeBaasProvider}) deletePtiCascade sync:`, err));
  }

  return { deletedPti: target, remainingCount: remainingPtis.length };
}

/**
 * Updates Superintendent username/loginId with strict change quota enforcement (max 3 changes).
 * Decrements username_changes_left by 1 upon successful save.
 */
export async function updateSuperintendentUsername(userIdOrLogin, newUsername) {
  const cleanedNew = String(newUsername || '').trim().toLowerCase();
  if (!cleanedNew || cleanedNew.length < 3) {
    throw new Error('Username must be at least 3 characters long.');
  }
  if (!/^[a-z0-9._@-]+$/.test(cleanedNew)) {
    throw new Error('Username may only contain letters, numbers, dots (.), underscores (_), @, or hyphens (-).');
  }

  const users = dbService.getUsers();
  const searchKey = String(userIdOrLogin).trim().toLowerCase();

  const targetIndex = users.findIndex(u =>
    (u.id && String(u.id).toLowerCase() === searchKey) ||
    (u.loginId && String(u.loginId).toLowerCase() === searchKey) ||
    (u.username && String(u.username).toLowerCase() === searchKey)
  );

  if (targetIndex === -1) {
    throw new Error('Superintendent account record not found.');
  }

  const currentUser = users[targetIndex];
  const currentUsername = String(currentUser.username || currentUser.loginId || '').toLowerCase();
  const changesLeft = typeof currentUser.username_changes_left === 'number'
    ? currentUser.username_changes_left
    : 3;

  if (changesLeft <= 0) {
    throw new Error('Maximum username change limit reached.');
  }

  if (cleanedNew === currentUsername) {
    throw new Error('Please enter a different username from your current one.');
  }

  // Ensure uniqueness across all users
  const collision = users.find((u, idx) =>
    idx !== targetIndex && (
      String(u.loginId || '').toLowerCase() === cleanedNew ||
      String(u.username || '').toLowerCase() === cleanedNew
    )
  );
  if (collision) {
    throw new Error(`Username "${cleanedNew}" is already in use by another account.`);
  }

  const nextChangesLeft = Math.max(0, changesLeft - 1);
  const updatedUser = {
    ...currentUser,
    username: cleanedNew,
    loginId: cleanedNew,
    username_changes_left: nextChangesLeft,
  };

  users[targetIndex] = updatedUser;
  dbService.saveUsers(users, updatedUser);

  // Sync Cloud BaaS if configured
  if (isBaasConfigured && updatedUser.id) {
    try {
      await upsertRecordToCloud(COLLECTIONS.USERS, updatedUser.id, updatedUser);
    } catch (err) {
      console.warn(`Cloud BaaS (${activeBaasProvider}) username update fallback:`, err);
    }
  }

  return updatedUser;
}

/**
 * Helper to keep parent PTI's totalHostels counter synchronized in STORAGE_KEYS.PTIS.
 */
function syncPtiHostelCounter(ptiId, hostelsList) {
  if (!ptiId) return;
  try {
    const ptis = dbService.getPtis();
    const count = hostelsList.filter(h => h.pti_id === ptiId).length;
    const updatedPtis = ptis.map(p => (p.id === ptiId || p.pti_id === ptiId) ? { ...p, totalHostels: count } : p);
    dbService.savePtis(updatedPtis, { ptiId, totalHostels: count });
    if (isBaasConfigured) {
      const updatedPti = updatedPtis.find(p => p.id === ptiId || p.pti_id === ptiId);
      if (updatedPti) {
        Promise.resolve()
          .then(() => upsertRecordToCloud(COLLECTIONS.PTIS, updatedPti.id, updatedPti))
          .catch(() => {});
      }
    }
  } catch (err) {
    console.warn('syncPtiHostelCounter warning:', err);
  }
}

/**
 * Creates a new Hostel Hall scoped to a specific tenant PTI.
 */
export async function createHostelHall(hostelData, tenantPtiId) {
  const effectivePti = tenantPtiId || hostelData?.pti_id || 'pti_dhaka';
  const name = String(hostelData?.name || '').trim();
  const code = String(hostelData?.code || '').trim().toUpperCase();
  const category = String(hostelData?.category || hostelData?.type || 'পুরুষ হোস্টেল (Male Hostel)').trim();
  const totalRooms = Math.max(1, Number(hostelData?.totalRooms) || 1);
  const totalBeds = Math.max(1, Number(hostelData?.totalBeds) || totalRooms * 3);

  if (!name || !code) {
    throw new Error('Hall Name and Hall Code are required.');
  }

  const created = {
    id: `hostel_${Date.now()}`,
    pti_id: effectivePti,
    name,
    code,
    type: category,
    category,
    totalRooms,
    totalBeds,
    occupiedBeds: 0,
    superintendentId: hostelData?.superintendentId || 'admin',
    hostelSuperId: hostelData?.hostelSuperId || null,
    status: 'active'
  };

  const allHostels = dbService.getHostels();
  const updatedHostels = [...allHostels, created];
  localStorage.setItem(STORAGE_KEYS.HOSTELS, JSON.stringify(updatedHostels));
  syncPtiHostelCounter(effectivePti, updatedHostels);

  if (isBaasConfigured) {
    try {
      await upsertRecordToCloud(COLLECTIONS.HOSTELS, created.id, created);
    } catch (err) {
      console.warn(`Cloud BaaS (${activeBaasProvider}) createHostelHall fallback:`, err);
    }
  }

  try {
    window.dispatchEvent(new CustomEvent('pti_hostels_changed', { detail: { created, ptiId: effectivePti } }));
  } catch {}

  return created;
}

/**
 * Updates an existing Hostel Hall within the specified PTI and propagates updated hostelName globally.
 */
export async function updateHostelHall(hostelId, updates, tenantPtiId) {
  const allHostels = dbService.getHostels();
  const target = allHostels.find(h => h.id === hostelId);

  if (!target) {
    throw new Error('Hostel hall not found.');
  }
  if (tenantPtiId && target.pti_id && target.pti_id !== tenantPtiId) {
    throw new Error('Access denied: cannot modify a hall belonging to another institute.');
  }

  const targetPti = tenantPtiId || target.pti_id || 'pti_dhaka';
  const nextName = String(updates?.name ?? target.name).trim();
  const nextCode = String(updates?.code ?? target.code).trim().toUpperCase();
  const nextCategory = String(updates?.category || updates?.type || target.type || target.category || 'পুরুষ হোস্টেল (Male Hostel)').trim();
  const nextTotalRooms = Math.max(1, Number(updates?.totalRooms ?? target.totalRooms) || 1);
  const nextTotalBeds = Math.max(1, Number(updates?.totalBeds ?? target.totalBeds) || target.totalBeds || nextTotalRooms * 3);

  if (!nextName || !nextCode) {
    throw new Error('Hall Name and Hall Code are required.');
  }

  const updatedHostel = {
    ...target,
    name: nextName,
    code: nextCode,
    type: nextCategory,
    category: nextCategory,
    totalRooms: nextTotalRooms,
    totalBeds: nextTotalBeds,
  };

  const nextHostels = allHostels.map(h => (h.id === hostelId ? updatedHostel : h));
  localStorage.setItem(STORAGE_KEYS.HOSTELS, JSON.stringify(nextHostels));

  // Propagate updated hall name across all users in this PTI assigned to this hall
  const changedUsers = [];
  try {
    const users = dbService.getUsers();
    const updatedUsers = users.map(u => {
      const sameTenant = !u.pti_id || u.pti_id === targetPti;
      const assignedToHall = u.hostelId === hostelId || u.hostel_id === hostelId;
      if (sameTenant && assignedToHall) {
        const nextUser = { ...u, hostelName: nextName };
        changedUsers.push(nextUser);
        return nextUser;
      }
      return u;
    });
    if (changedUsers.length > 0) {
      dbService.saveUsers(updatedUsers, { updatedHostelId: hostelId, hostelName: nextName, ptiId: targetPti });
    }
  } catch (err) {
    console.warn('Hostel name propagation warning (users):', err);
  }

  // Propagate cached hostelName on tenant rooms & financial ledgers if present
  const propagateCachedName = (storageKey) => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      let dirty = false;
      const mapped = list.map(item => {
        const sameTenant = !item.pti_id || item.pti_id === targetPti;
        if (sameTenant && (item.hostelId === hostelId || item.hostel_id === hostelId) && item.hostelName) {
          dirty = true;
          return { ...item, hostelName: nextName };
        }
        return item;
      });
      if (dirty) {
        localStorage.setItem(storageKey, JSON.stringify(mapped));
      }
    } catch {}
  };

  propagateCachedName(STORAGE_KEYS.ROOMS);
  propagateCachedName(STORAGE_KEYS.EST_EXPENSES);
  propagateCachedName(STORAGE_KEYS.DEPOSITS);
  propagateCachedName(STORAGE_KEYS.BAZAR);
  propagateCachedName(STORAGE_KEYS.MEAL_SHEETS);

  if (isBaasConfigured) {
    try {
      await upsertRecordToCloud(COLLECTIONS.HOSTELS, hostelId, updatedHostel);
      for (const u of changedUsers) {
        if (u.id) {
          await upsertRecordToCloud(COLLECTIONS.USERS, u.id, { ...u, hostelName: nextName });
        }
      }
    } catch (err) {
      console.warn(`Cloud BaaS (${activeBaasProvider}) updateHostelHall fallback:`, err);
    }
  }

  try {
    window.dispatchEvent(new CustomEvent('pti_hostels_changed', { detail: { updatedHostel, updatedHostelId: hostelId, ptiId: targetPti } }));
    window.dispatchEvent(new CustomEvent('pti_users_changed', { detail: { updatedHostelId: hostelId, hostelName: nextName, ptiId: targetPti } }));
    window.dispatchEvent(new CustomEvent('pti_rooms_changed', { detail: { updatedHostelId: hostelId, ptiId: targetPti } }));
  } catch {}

  return updatedHostel;
}

/**
 * Permanently deletes a Hostel Hall and cascades unassignment:
 * Any Boarder Student, Meal Manager, or Hostel Monitor assigned to the hall has
 * hostel_id / hostelId and room_no / roomNumber set to null and reverts to Non-Boarder Student.
 */
export async function deleteHostelCascade(hostelId, tenantPtiId) {
  const allHostels = dbService.getHostels();
  const target = allHostels.find(h => h.id === hostelId);

  if (!target) {
    throw new Error('Hostel hall not found.');
  }
  if (tenantPtiId && target.pti_id && target.pti_id !== tenantPtiId) {
    throw new Error('Access denied: cannot delete a hall belonging to another institute.');
  }

  const targetPti = tenantPtiId || target.pti_id || 'pti_dhaka';
  const remainingAllHostels = allHostels.filter(h => h.id !== hostelId);
  localStorage.setItem(STORAGE_KEYS.HOSTELS, JSON.stringify(remainingAllHostels));

  const REVERTIBLE_ROLES = new Set([
    USER_ROLES.BOARDER_STUDENT,
    USER_ROLES.MEAL_MANAGER,
    USER_ROLES.HOSTEL_MONITOR,
    'boarder_student',
    'meal_manager',
    'hostel_monitor',
    'boarder'
  ]);

  const affectedUsers = [];
  let revertedStudentsCount = 0;

  try {
    const users = dbService.getUsers();
    const updatedUsers = users.map(u => {
      const sameTenant = !u.pti_id || u.pti_id === targetPti;
      const assignedToHall = u.hostelId === hostelId || u.hostel_id === hostelId;
      if (sameTenant && assignedToHall) {
        if (REVERTIBLE_ROLES.has(u.role)) {
          revertedStudentsCount += 1;
          const reverted = {
            ...u,
            role: USER_ROLES.NON_BOARDER_STUDENT,
            hostelId: null,
            hostel_id: null,
            hostelName: null,
            roomNumber: null,
            room_no: null,
            bedNumber: null,
            wing: null,
          };
          affectedUsers.push(reverted);
          return reverted;
        }
        if (u.role === USER_ROLES.HOSTEL_SUPER || u.role === 'hostel_super') {
          const unassignedSuper = {
            ...u,
            hostelId: null,
            hostel_id: null,
            hostelName: null,
          };
          affectedUsers.push(unassignedSuper);
          return unassignedSuper;
        }
      }
      return u;
    });
    dbService.saveUsers(updatedUsers, { deletedHostelId: hostelId, ptiId: targetPti });
  } catch (err) {
    console.warn('Hostel delete cascade warning (users):', err);
  }

  // Clean up rooms belonging to the deleted hall
  const deletedRoomIds = [];
  try {
    const rooms = dbService.getRooms();
    const remainingRooms = rooms.filter(r => {
      const match = r.hostelId === hostelId && (!r.pti_id || r.pti_id === targetPti);
      if (match && r.id) deletedRoomIds.push(r.id);
      return !match;
    });
    dbService.saveRooms(remainingRooms);
  } catch (err) {
    console.warn('Hostel delete cascade warning (rooms):', err);
  }

  syncPtiHostelCounter(targetPti, remainingAllHostels);

  if (isBaasConfigured) {
    try {
      await deleteRecordFromCloud(COLLECTIONS.HOSTELS, hostelId);
      for (const roomId of deletedRoomIds) {
        await deleteRecordFromCloud(COLLECTIONS.ROOMS, roomId);
      }
      for (const u of affectedUsers) {
        if (u.id) {
          await upsertRecordToCloud(COLLECTIONS.USERS, u.id, u);
        }
      }
    } catch (err) {
      console.warn(`Cloud BaaS (${activeBaasProvider}) deleteHostelCascade fallback:`, err);
    }
  }

  const remainingForPti = remainingAllHostels.filter(h => !targetPti || h.pti_id === targetPti);

  try {
    window.dispatchEvent(new CustomEvent('pti_hostels_changed', { detail: { deletedHostelId: hostelId, ptiId: targetPti } }));
    window.dispatchEvent(new CustomEvent('pti_users_changed', { detail: { deletedHostelId: hostelId, ptiId: targetPti } }));
    window.dispatchEvent(new CustomEvent('pti_rooms_changed', { detail: { deletedHostelId: hostelId, ptiId: targetPti } }));
  } catch {}

  return {
    deletedHostel: target,
    revertedStudentsCount,
    remainingHostels: remainingForPti
  };
}

