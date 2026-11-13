import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, USER_ROLES, assertPtiAccessAllowed } from '../services/authService';
import { 
  STORAGE_KEYS,
  initializeSeedData, 
  findUserByIdentifier, 
  updateUserData, 
  deleteUserData,
  updateSuperintendentUsername as updateSuperUsernameService 
} from '../services/seedService';
import { dbService, isBaasConfigured, activeBaasProvider } from '../services/db';
import { mealAutomationService } from '../services/mealAutomationService';
import { isFirebaseConfigured } from '../firebase';
import { sanitizeUserRecord } from '../utils/displayName';

const LEGACY_STORAGE_PATTERN = /Director\s*General|National(\s+PTI)?\s+Directorate|Master\s+Directorate|SaaS\s+Directorate/i;
const FORCED_REAUTH_KEY = 'pti_forced_reauth_v11';

function storageHasLegacyText(storage) {
  if (!storage) return false;
  try {
    const knownKeys = [
      ...Object.values(STORAGE_KEYS),
      'pti_active_session',
      'user',
      'auth_user',
      'currentUser',
    ];
    for (const k of knownKeys) {
      const val = storage.getItem(k);
      if (typeof val === 'string' && LEGACY_STORAGE_PATTERN.test(val)) {
        return true;
      }
    }
    if (typeof storage.length === 'number' && typeof storage.key === 'function') {
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        const val = key ? storage.getItem(key) : null;
        if (typeof val === 'string' && LEGACY_STORAGE_PATTERN.test(val)) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

function purgeLegacyStorageAndSession() {
  try {
    localStorage.clear();
  } catch {}
  try {
    sessionStorage.removeItem('pti_active_session');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('auth_user');
    sessionStorage.removeItem('currentUser');
    if (typeof sessionStorage.length === 'number' && typeof sessionStorage.key === 'function') {
      const toRemove = [];
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const key = sessionStorage.key(i);
        const val = key ? sessionStorage.getItem(key) : null;
        if (typeof val === 'string' && LEGACY_STORAGE_PATTERN.test(val)) {
          toRemove.push(key);
        }
      }
      toRemove.forEach((k) => sessionStorage.removeItem(k));
    }
    sessionStorage.setItem(FORCED_REAUTH_KEY, 'pending');
  } catch {}
}

const AuthContext = createContext(null);

export { USER_ROLES };

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // For Superintendent to switch inspected hostel. For other tiers, locked to their hostelId.
  const [selectedHostelId, setSelectedHostelId] = useState('hostel_01');

  const role = userProfile?.role || null;
  const isMasterAdmin = role === USER_ROLES.MASTER_ADMIN || role === 'master_admin';
  const effectivePtiId = userProfile?.pti_id || (isMasterAdmin ? 'GLOBAL' : 'pti_dhaka');

  // Dynamic White-label Institute Settings (tenant-scoped)
  const [instituteSettings, setInstituteSettings] = useState(() => 
    mealAutomationService.getInstituteSettings(effectivePtiId)
  );

  useEffect(() => {
    const handleSettingsChanged = (e) => {
      const eventPtiId = e?.detail?.ptiId;
      if (!eventPtiId || eventPtiId === effectivePtiId) {
        const fresh = mealAutomationService.getInstituteSettings(effectivePtiId);
        setInstituteSettings(fresh);
        document.title = fresh.appTitle || "PTI & Hostel Management System";
      }
    };

    const current = mealAutomationService.getInstituteSettings(effectivePtiId);
    setInstituteSettings(current);
    document.title = isMasterAdmin ? "Central Master Admin | PTI Hostel System" : (current.appTitle || "PTI & Hostel Management System");

    window.addEventListener('pti_settings_changed', handleSettingsChanged);
    return () => window.removeEventListener('pti_settings_changed', handleSettingsChanged);
  }, [effectivePtiId, isMasterAdmin]);

  const updateInstituteSettings = (updates) => {
    const updated = mealAutomationService.updateInstituteSettings(updates, effectivePtiId);
    const fresh = mealAutomationService.getInstituteSettings(effectivePtiId);
    setInstituteSettings(fresh);
    document.title = fresh.appTitle || "PTI & Hostel Management System";
    return updated;
  };

  // Initialize DB & Seed Data on application load (+ purge any cached legacy "Director General" session/storage)
  useEffect(() => {
    async function setup() {
      try {
        const hadPreV11Storage =
          Boolean(localStorage.getItem(STORAGE_KEYS.USERS)) &&
          !localStorage.getItem(STORAGE_KEYS.INITIALIZED_V11);
        const hasLegacyText =
          storageHasLegacyText(localStorage) || storageHasLegacyText(sessionStorage);

        let mustForceLogout = sessionStorage.getItem(FORCED_REAUTH_KEY) === 'pending';

        if (hasLegacyText || hadPreV11Storage) {
          purgeLegacyStorageAndSession();
          setCurrentUser(null);
          setUserProfile(null);
          mustForceLogout = true;
        }

        await initializeSeedData(mustForceLogout && hasLegacyText);

        // Enforce re-login after purging legacy cache/session so fresh Master Admin data loads cleanly
        if (mustForceLogout) {
          setCurrentUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        // Check if there is an active session stored
        const storedSession = sessionStorage.getItem('pti_active_session');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          const freshUser = await findUserByIdentifier(parsed.loginId || parsed.username || parsed.rollNumber);
          if (freshUser) {
            const sanitizedUser = sanitizeUserRecord(freshUser);
            try {
              assertPtiAccessAllowed(sanitizedUser);
              setCurrentUser(sanitizedUser);
              setUserProfile(sanitizedUser);
              sessionStorage.setItem('pti_active_session', JSON.stringify(sanitizedUser));
              if (sanitizedUser.hostelId) {
                setSelectedHostelId(sanitizedUser.hostelId);
              }
              setLoading(false);
              return;
            } catch (accessErr) {
              sessionStorage.removeItem('pti_active_session');
              sessionStorage.setItem('pti_login_notice', accessErr.message);
            }
          }
        }

        // Default to Superintendent ('admin') for instant live inspection if no active session
        const defaultAdmin = await findUserByIdentifier('admin');
        if (defaultAdmin) {
          const sanitizedDefault = sanitizeUserRecord(defaultAdmin);
          try {
            assertPtiAccessAllowed(sanitizedDefault);
            setCurrentUser(sanitizedDefault);
            setUserProfile(sanitizedDefault);
          } catch {
            // Do not auto-authenticate a suspended/blocked institute account
          }
        }
      } catch (err) {
        console.error('Initialization error in AuthProvider:', err);
      } finally {
        setLoading(false);
      }
    }

    setup();
  }, []);

  // Reactive guard: if React state (e.g. Fast Refresh) retains "Director General", purge storage and force logout
  useEffect(() => {
    const activeName = `${currentUser?.name || ''} ${userProfile?.name || ''}`;
    if (LEGACY_STORAGE_PATTERN.test(activeName)) {
      purgeLegacyStorageAndSession();
      setCurrentUser(null);
      setUserProfile(null);
      initializeSeedData(true).catch(() => {});
    }
  }, [currentUser, userProfile]);

  /**
   * Unified Login by Class Roll Number or Admin ID
   */
  const loginWithIdentifier = async (identifier, password) => {
    setLoading(true);
    try {
      const result = await authService.loginWithIdentifier(identifier, password);
      const cleanUser = sanitizeUserRecord(result.user);
      sessionStorage.removeItem(FORCED_REAUTH_KEY);
      setCurrentUser(cleanUser);
      setUserProfile(cleanUser);
      if (cleanUser.hostelId) {
        setSelectedHostelId(cleanUser.hostelId);
      }
      sessionStorage.setItem('pti_active_session', JSON.stringify(cleanUser));
      return { ...result, user: cleanUser };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Quick Switch / Demo Login Helper
   */
  const switchDemoUser = async (idOrRoll) => {
    const user = await findUserByIdentifier(idOrRoll);
    if (user) {
      const cleanUser = sanitizeUserRecord(user);
      sessionStorage.removeItem(FORCED_REAUTH_KEY);
      setCurrentUser(cleanUser);
      setUserProfile(cleanUser);
      if (cleanUser.hostelId) {
        setSelectedHostelId(cleanUser.hostelId);
      }
      sessionStorage.setItem('pti_active_session', JSON.stringify(cleanUser));
    }
  };

  /**
   * Update Self-Profile Details
   */
  const updateUserProfile = async (updates) => {
    if (!currentUser) return null;
    const identifier = currentUser.id || currentUser.loginId || currentUser.rollNumber;
    const updated = await updateUserData(identifier, updates);
    if (updated) {
      setCurrentUser(updated);
      setUserProfile(updated);
      sessionStorage.setItem('pti_active_session', JSON.stringify(updated));
    }
    return updated;
  };

  /**
   * Administrator User Update (allows Superintendent & Hostel Super to edit any user)
   */
  const adminUpdateUser = async (userIdOrIdentifier, updates) => {
    const updated = await updateUserData(userIdOrIdentifier, updates);
    if (updated && currentUser && (
      currentUser.id === updated.id || 
      currentUser.loginId === updated.loginId ||
      (currentUser.rollNumber && updated.rollNumber && String(currentUser.rollNumber) === String(updated.rollNumber))
    )) {
      setCurrentUser(updated);
      setUserProfile(updated);
      sessionStorage.setItem('pti_active_session', JSON.stringify(updated));
    }
    return updated;
  };

  /**
   * Administrator User Deletion (allows Superintendent & Hostel Super to delete authorized users)
   */
  const adminDeleteUser = async (userIdOrIdentifier) => {
    return await deleteUserData(userIdOrIdentifier);
  };

  /**
   * Universal Password Change (for all 6 tiers)
   */
  const changePassword = async (currentPassword, newPassword) => {
    if (!currentUser) {
      throw new Error('No user is currently signed in.');
    }
    if (!currentPassword || !newPassword) {
      throw new Error('Please fill in both current and new password fields.');
    }
    if (String(currentUser.password) !== String(currentPassword)) {
      throw new Error('The current password you entered is incorrect.');
    }
    if (String(newPassword).length < 4) {
      throw new Error('New password must contain at least 4 characters.');
    }
    if (String(currentPassword) === String(newPassword)) {
      throw new Error('New password must be different from your current password.');
    }

    const identifier = currentUser.id || currentUser.loginId || currentUser.rollNumber;
    const updated = await updateUserData(identifier, { password: String(newPassword) });
    if (updated) {
      setCurrentUser(updated);
      setUserProfile(updated);
      sessionStorage.setItem('pti_active_session', JSON.stringify(updated));
    }
    return updated;
  };

  /**
   * Superintendent Username Update with strict quota enforcement (max 3 changes)
   */
  const updateSuperintendentUsername = async (newUsername) => {
    if (!currentUser) {
      throw new Error('No user is currently signed in.');
    }
    const identifier = currentUser.id || currentUser.loginId || currentUser.username || currentUser.rollNumber;
    const updated = await updateSuperUsernameService(identifier, newUsername);
    if (updated) {
      setCurrentUser(updated);
      setUserProfile(updated);
      sessionStorage.setItem('pti_active_session', JSON.stringify(updated));
    }
    return updated;
  };

  // Sync session if any user, hostel, or institute change event was fired for the logged-in user
  useEffect(() => {
    const handleUsersChanged = (e) => {
      const detail = e?.detail;
      if (!currentUser) return;

      // Refresh current user if a hostel edit/deletion updated their role or hostelName
      if (detail && (detail.updatedHostelId || detail.deletedHostelId)) {
        try {
          const list = dbService.getUsers();
          const fresh = list.find(u =>
            (currentUser.id && u.id === currentUser.id) ||
            (currentUser.loginId && u.loginId === currentUser.loginId)
          );
          if (fresh) {
            const sanitizedFresh = sanitizeUserRecord(fresh);
            setCurrentUser(sanitizedFresh);
            setUserProfile(sanitizedFresh);
            sessionStorage.setItem('pti_active_session', JSON.stringify(sanitizedFresh));
          }
        } catch {}
        return;
      }

      if (detail && (
        (detail.id && currentUser.id === detail.id) || 
        (detail.loginId && currentUser.loginId === detail.loginId) ||
        (currentUser.rollNumber && detail.rollNumber && String(currentUser.rollNumber) === String(detail.rollNumber))
      )) {
        const sanitizedDetail = sanitizeUserRecord(detail);
        setCurrentUser(sanitizedDetail);
        setUserProfile(sanitizedDetail);
        sessionStorage.setItem('pti_active_session', JSON.stringify(sanitizedDetail));
      }
    };

    const handleHostelsChanged = (e) => {
      const deletedId = e?.detail?.deletedHostelId;
      if (deletedId && selectedHostelId === deletedId) {
        try {
          const all = dbService.getHostels();
          const scoped = effectivePtiId && effectivePtiId !== 'GLOBAL'
            ? all.filter(h => h.pti_id === effectivePtiId)
            : all;
          setSelectedHostelId(scoped[0]?.id || '');
        } catch {}
      }
    };

    const handleInstitutesChanged = () => {
      if (!currentUser) return;
      try {
        assertPtiAccessAllowed(currentUser);
      } catch (err) {
        sessionStorage.removeItem('pti_active_session');
        sessionStorage.setItem('pti_login_notice', err.message);
        setCurrentUser(null);
        setUserProfile(null);
      }
    };

    window.addEventListener('pti_users_changed', handleUsersChanged);
    window.addEventListener('pti_hostels_changed', handleHostelsChanged);
    window.addEventListener('pti_institutes_changed', handleInstitutesChanged);
    return () => {
      window.removeEventListener('pti_users_changed', handleUsersChanged);
      window.removeEventListener('pti_hostels_changed', handleHostelsChanged);
      window.removeEventListener('pti_institutes_changed', handleInstitutesChanged);
    };
  }, [currentUser, selectedHostelId, effectivePtiId]);

  /**
   * Sign Out
   */
  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setUserProfile(null);
    sessionStorage.removeItem('pti_active_session');
  };

  // Strict Hostel Data Isolation rule:
  // If user is not Superintendent, their active hostel is strictly enforced to their assigned hostelId.
  const effectiveHostelId = role === USER_ROLES.SUPERINTENDENT 
    ? selectedHostelId 
    : userProfile?.hostelId || 'hostel_01';

  const value = {
    currentUser,
    userProfile,
    role,
    isMasterAdmin,
    isSuperintendent: role === USER_ROLES.SUPERINTENDENT || role === 'superintendent' || role === 'admin',
    isHostelSuper: role === USER_ROLES.HOSTEL_SUPER || role === 'hostel_super',
    isHostelMonitor: role === USER_ROLES.HOSTEL_MONITOR || role === 'hostel_monitor',
    isMealManager: role === USER_ROLES.MEAL_MANAGER || role === 'meal_manager',
    isBoarder: role === USER_ROLES.BOARDER_STUDENT || role === 'boarder_student' || role === 'boarder',
    isNonBoarder: role === USER_ROLES.NON_BOARDER_STUDENT || role === 'non_boarder_student' || role === 'non_boarder',
    effectiveHostelId,
    effectivePtiId,
    setSuperintendentHostel: setSelectedHostelId,
    loading,
    loginWithIdentifier,
    logout,
    switchDemoUser,
    updateUserProfile,
    adminUpdateUser,
    adminDeleteUser,
    changePassword,
    updateSuperintendentUsername,
    instituteSettings,
    instituteName: instituteSettings.instituteName,
    appTitle: instituteSettings.appTitle,
    updateInstituteSettings,
    isFirebaseConfigured,
    isBaasConfigured,
    baasProvider: activeBaasProvider,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
