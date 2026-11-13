import { 
  signInWithEmailAndPassword, 
  signOut, 
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase';
import { findUserByIdentifier, getPtiById } from './seedService';
import { USER_ROLES } from './seedData';

export { USER_ROLES };

/**
 * Verifies whether a non-Master-Admin user's institute (pti_id) is currently Active.
 * Throws the Central Admin suspension error if Paused, Blocked, or missing.
 */
export function assertPtiAccessAllowed(userRecord) {
  if (!userRecord) return;
  const isMaster = userRecord.role === USER_ROLES.MASTER_ADMIN || userRecord.role === 'master_admin';
  if (isMaster) return;

  const userPtiId = userRecord.pti_id || 'pti_dhaka';
  const ptiRecord = getPtiById(userPtiId);
  const ptiStatus = String(ptiRecord?.status || '').trim().toLowerCase();

  if (!ptiRecord || ptiStatus === 'paused' || ptiStatus === 'blocked') {
    throw new Error("Access Denied: Your institute's account has been suspended by the Central Admin.");
  }
}

export const authService = {
  /**
   * Unified Authentication:
   * Accepts Class Roll Number (for students/trainees) or Admin ID (for superintendent, hostel super, monitors, managers)
   */
  loginWithIdentifier: async (identifier, password) => {
    if (!identifier || !password) {
      throw new Error('Please enter both your User ID / Roll Number and Password.');
    }

    const trimmedId = String(identifier).trim();
    const userRecord = await findUserByIdentifier(trimmedId);

    if (!userRecord) {
      throw new Error(`No account found matching "${trimmedId}". Verify your ID or Class Roll Number.`);
    }

    if (userRecord.status !== 'active') {
      throw new Error('This account is suspended. Please contact the Superintendent office.');
    }

    // For master_admin, accept '123456' as standard password, or 'master123' or stored password
    const isMaster = userRecord.role === USER_ROLES.MASTER_ADMIN || userRecord.role === 'master_admin';
    const isPasswordValid = isMaster 
      ? (password === '123456' || password === 'master123' || userRecord.password === password)
      : (userRecord.password === password);

    if (!isPasswordValid) {
      throw new Error('Incorrect password. Please verify and try again.');
    }

    // Global SaaS Login Interceptor: enforce PTI Active status for all T1-T6 users
    assertPtiAccessAllowed(userRecord);

    // Strict Role-specific routing destination:
    let redirectPath = '/';
    const role = userRecord.role;
    if (role === USER_ROLES.MASTER_ADMIN || role === 'master_admin') {
      redirectPath = '/master-admin';
    } else if (role === USER_ROLES.BOARDER_STUDENT || role === 'boarder' || role === 'boarder_student') {
      redirectPath = '/boarder';
    } else if (role === USER_ROLES.MEAL_MANAGER || role === 'meal_manager') {
      redirectPath = '/meal-manager';
    }

    const effectivePtiId = isMaster ? 'GLOBAL' : (userRecord.pti_id || null);

    return {
      user: {
        ...userRecord,
        pti_id: effectivePtiId
      },
      redirectPath,
      role: userRecord.role,
      hostelId: userRecord.hostelId || null,
      pti_id: effectivePtiId
    };
  },

  // Get user profile
  getUserProfile: async (id) => {
    const user = await findUserByIdentifier(id);
    return user;
  },

  // Sign out
  logout: async () => {
    if (isFirebaseConfigured) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn('Firebase signOut error:', e);
      }
    }
    sessionStorage.removeItem('pti_active_session');
    return true;
  }
};
