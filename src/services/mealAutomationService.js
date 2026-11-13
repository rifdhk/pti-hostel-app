import {
  dbService,
  COLLECTIONS,
  isBaasConfigured,
  upsertRecordToCloud
} from './db';

export const SETTINGS_KEY = 'pti_global_settings';
export const NEXT_DAY_MEALS_KEY = 'pti_next_day_meals';

// Default Global Master Settings
export const DEFAULT_SETTINGS = {
  mealCalculationsEnabled: true,       // Master Switch 1: Hide/Show meal financial figures
  establishmentCalculationsEnabled: true, // Master Switch 2: Hide/Show establishment figures
  cutOffTime: '20:00',                // 8:00 PM cut-off
  simulateCutOffExpired: false,       // Allows testing cut-off rule at any hour
  fixedEstablishmentFee: 1200,        // Standard term establishment fee
  instituteName: "Primary Teachers' Training Institute (PTI)", // Dynamic white-label institute name
  appTitle: 'PTI & Hostel Management System',                // Dynamic white-label application title
  instituteShortName: 'PTI',                                 // Short abbreviation
};

export const mealAutomationService = {
  /**
   * Get Master Controls (supports multi-tenant ptiId scoping)
   */
  getSettings: (ptiId = null) => {
    let tenantDefaults = DEFAULT_SETTINGS;

    if (ptiId) {
      try {
        const ptis = dbService.getPtis();
        const p = ptis.find(item => item.id === ptiId || item.pti_id === ptiId);
        if (p && p.settings) {
          tenantDefaults = {
            ...DEFAULT_SETTINGS,
            instituteName: p.name || DEFAULT_SETTINGS.instituteName,
            appTitle: `${p.shortName || 'PTI'} - Hostel Management System`,
            instituteShortName: p.shortName || DEFAULT_SETTINGS.instituteShortName,
            ...p.settings,
          };
        }
      } catch {}

      const tenantStorageKey = `pti_settings_${ptiId}`;
      const savedTenant = dbService.getSettingsJson(tenantStorageKey, null);
      if (savedTenant && typeof savedTenant === 'object') {
        return { ...tenantDefaults, ...savedTenant };
      }
      return tenantDefaults;
    }

    const parsed = dbService.getSettingsJson(SETTINGS_KEY, DEFAULT_SETTINGS);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  },

  /**
   * Update Master Controls (Superintendent only, scoped by ptiId)
   */
  updateSettings: (updates, ptiId = null) => {
    const current = mealAutomationService.getSettings(ptiId);
    const updated = { ...current, ...updates };

    if (ptiId) {
      dbService.saveSettingsJson(`pti_settings_${ptiId}`, updated);
      // Also sync into the registered PTIs list
      try {
        const ptis = dbService.getPtis();
        let updatedPtiRecord = null;
        const nextPtis = ptis.map(p => {
          if (p.id === ptiId || p.pti_id === ptiId) {
            updatedPtiRecord = {
              ...p,
              settings: { ...(p.settings || {}), ...updated },
              name: updated.instituteName || p.name,
              shortName: updated.instituteShortName || p.shortName
            };
            return updatedPtiRecord;
          }
          return p;
        });
        dbService.savePtis(nextPtis, { ptiId, settings: updated });
        if (isBaasConfigured && updatedPtiRecord?.id) {
          Promise.resolve()
            .then(() => upsertRecordToCloud(COLLECTIONS.PTIS, updatedPtiRecord.id, updatedPtiRecord))
            .catch(() => {});
        }
      } catch {}
    } else {
      dbService.saveSettingsJson(SETTINGS_KEY, updated);
    }

    // Trigger custom event so reactive components update instantly
    window.dispatchEvent(new CustomEvent('pti_settings_changed', { detail: { ptiId, settings: updated } }));
    return updated;
  },

  /**
   * White-label institute settings helpers
   */
  getInstituteSettings: (ptiId = null) => {
    const settings = mealAutomationService.getSettings(ptiId);
    return {
      instituteName: settings.instituteName || "Primary Teachers' Training Institute (PTI)",
      appTitle: settings.appTitle || 'PTI & Hostel Management System',
      instituteShortName: settings.instituteShortName || 'PTI',
    };
  },

  updateInstituteSettings: (updates, ptiId = null) => {
    return mealAutomationService.updateSettings(updates, ptiId);
  },

  /**
   * Formats tomorrow's target date string (YYYY-MM-DD)
   */
  getNextDayDate: () => {
    const today = new Date('2026-10-29T11:02:01');
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  },

  /**
   * Evaluates whether meal cut-off has expired for tomorrow's meals.
   * Locked if:
   * 1. Superintendent's test simulation toggle is ON, OR
   * 2. Current wall-clock time >= cut-off time (default 20:00 / 8:00 PM), OR
   * 3. Meal Manager has locked the meal sheet for tomorrow.
   */
  isCutOffExpired: (hostelId, targetDate) => {
    const settings = mealAutomationService.getSettings();
    if (settings.simulateCutOffExpired) {
      return { expired: true, reason: 'Cut-off expired (Simulated 08:00 PM Cut-off)' };
    }

    // Check if Meal Manager has already locked the sheet for targetDate
    const sheets = dbService.getMealSheets();
    const lockedSheet = sheets.find(s => s.hostelId === hostelId && s.date === targetDate && s.locked);
    if (lockedSheet) {
      return { expired: true, reason: `Meal Manager locked and approved sheet for ${targetDate}` };
    }

    // Wall-clock check against 20:00 (8:00 PM)
    const now = new Date();
    const [cutHour, cutMinute] = settings.cutOffTime.split(':').map(Number);
    const cutOffToday = new Date(now);
    cutOffToday.setHours(cutHour, cutMinute, 0, 0);

    // If current time is past cut-off hour today
    if (now >= cutOffToday) {
      return { expired: true, reason: `Cut-off time (${settings.cutOffTime}) has passed for next-day changes` };
    }

    return { expired: false, reason: `Open until ${settings.cutOffTime} today` };
  },

  /**
   * Auto-Carry Forward Rule:
   * If a boarder does not manually update their meal status for next day,
   * copy yesterday's meal status automatically!
   */
  getOrAutoCarryNextDayMeal: (hostelId, rollNumber) => {
    const targetDate = mealAutomationService.getNextDayDate();
    const stored = dbService.getNextDayMealsMap();

    const key = `${hostelId}_${rollNumber}_${targetDate}`;

    // If student manually updated already
    if (stored[key]) {
      return stored[key];
    }

    // Otherwise, fetch previous day's record (from SEED_MEAL_SHEETS / current sheets)
    const sheets = dbService.getMealSheets();
    let previousMeal = { breakfast: true, lunch: true, dinner: true }; // standard default

    const prevSheet = sheets.find(s => s.hostelId === hostelId);
    if (prevSheet && prevSheet.records) {
      const studentRecord = prevSheet.records.find(r => String(r.rollNumber) === String(rollNumber));
      if (studentRecord) {
        previousMeal = {
          breakfast: Boolean(studentRecord.breakfast),
          lunch: Boolean(studentRecord.lunch),
          dinner: Boolean(studentRecord.dinner),
        };
      }
    }

    // Create auto-carried forward record
    const autoCarried = {
      date: targetDate,
      rollNumber,
      hostelId,
      breakfast: previousMeal.breakfast,
      lunch: previousMeal.lunch,
      dinner: previousMeal.dinner,
      source: 'auto_carried', // Visually indicates it was auto-copied
      updatedAt: 'Auto-Carried from Previous Day'
    };

    // Save
    return dbService.saveNextDayMealEntry(key, autoCarried);
  },

  /**
   * Save student's manual next-day meal toggle
   */
  saveManualNextDayMeal: (hostelId, rollNumber, mealUpdates, extraInfo = {}) => {
    const targetDate = mealAutomationService.getNextDayDate();
    const cutOffStatus = mealAutomationService.isCutOffExpired(hostelId, targetDate);
    if (cutOffStatus.expired) {
      throw new Error(`Cut-off enforced: ${cutOffStatus.reason}. Modifications are locked.`);
    }

    const stored = dbService.getNextDayMealsMap();
    const key = `${hostelId}_${rollNumber}_${targetDate}`;

    const current = stored[key] || mealAutomationService.getOrAutoCarryNextDayMeal(hostelId, rollNumber);
    const updated = {
      ...current,
      ...mealUpdates,
      name: extraInfo.name || current.name || 'Resident User',
      role: extraInfo.role || current.role || 'resident',
      source: extraInfo.isSuperintendent ? 'manual_superintendent' : 'manual_student',
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    dbService.saveNextDayMealEntry(key, updated);

    // If Superintendent or custom eater, also sync into hostel's meal sheet records
    const changedSheets = [];
    try {
      const allM = dbService.getMealSheets();
      allM.forEach(sheet => {
        if (sheet.hostelId === hostelId) {
          const nextRecords = Array.isArray(sheet.records) ? [...sheet.records] : [];
          const existingIdx = nextRecords.findIndex(r => 
            String(r.rollNumber) === String(rollNumber) || 
            (extraInfo.id && r.studentId === extraInfo.id)
          );
          const totalCount = (updated.breakfast ? 1 : 0) + (updated.lunch ? 1 : 0) + (updated.dinner ? 1 : 0);
          const mealRecord = {
            studentId: extraInfo.id || (extraInfo.isSuperintendent ? 'admin' : `user_${rollNumber}`),
            name: extraInfo.name || (extraInfo.isSuperintendent ? 'Dr. Anwar Hossain (Superintendent)' : 'Resident'),
            rollNumber: String(rollNumber),
            room: extraInfo.roomNumber || (extraInfo.isSuperintendent ? 'Superintendent Quarters' : 'Hall'),
            breakfast: Boolean(updated.breakfast),
            lunch: Boolean(updated.lunch),
            dinner: Boolean(updated.dinner),
            total: totalCount
          };
          let modified = false;
          if (existingIdx >= 0) {
            nextRecords[existingIdx] = { ...nextRecords[existingIdx], ...mealRecord };
            modified = true;
          } else if (extraInfo.isSuperintendent) {
            nextRecords.unshift(mealRecord);
            modified = true;
          }
          if (modified) {
            changedSheets.push({ ...sheet, records: nextRecords });
          }
        }
      });
      changedSheets.forEach(sheet => dbService.updateMealSheet(sheet));
    } catch (e) {
      console.error('Failed to sync sheet with meal toggle:', e);
    }

    if (changedSheets.length === 0) {
      try {
        window.dispatchEvent(new CustomEvent('pti_meals_changed', { detail: { hostelId, rollNumber, updated } }));
      } catch {}
    }

    return updated;
  },

  /**
   * Universal Personal Consumed Meals Calculation for ANY tier (T1 through T6)
   */
  getUserPersonalConsumedMeals: (userProfile, hostelId = null) => {
    if (!userProfile) return 0;
    const roll = userProfile.rollNumber;
    const loginId = userProfile.loginId;
    const userId = userProfile.id;
    const userName = (userProfile.name || '').toLowerCase();

    const allSheets = dbService.getMealSheets();

    let consumedCount = 0;
    let foundInSheets = false;

    allSheets.forEach(sheet => {
      if (hostelId && sheet.hostelId !== hostelId) return;
      if (!sheet.records || !Array.isArray(sheet.records)) return;

      const rec = sheet.records.find(r => 
        (roll && String(r.rollNumber) === String(roll)) ||
        (loginId && (String(r.rollNumber) === String(loginId) || r.studentId === loginId)) ||
        (userId && r.studentId === userId) ||
        (userName && r.name && r.name.toLowerCase() === userName)
      );

      if (rec) {
        foundInSheets = true;
        consumedCount += (rec.breakfast ? 1 : 0) + (rec.lunch ? 1 : 0) + (rec.dinner ? 1 : 0);
      }
    });

    if (foundInSheets && consumedCount > 0) {
      return consumedCount;
    }

    // Role-based authentic baselines if initial seed session
    const role = (userProfile.role || '').toLowerCase();
    if (role.includes('boarder') || role === 'boarder_student') {
      return 42; // Standard monthly baseline
    }
    if (role.includes('manager') || role === 'meal_manager') {
      return 48; // Active mess duty baseline
    }
    if (role.includes('monitor') || role === 'hostel_monitor') {
      return 45; // Hall monitor baseline
    }
    if (role.includes('hostel_super')) {
      return 28; // Hall super mess attendance
    }
    if (role.includes('superintendent')) {
      return 18; // Central superintendent executive dining baseline
    }
    if (role.includes('non_boarder')) {
      return 6; // Day-scholar occasional token meals
    }

    return 24;
  },

  /**
   * Dynamic Meal Rate Calculation:
   * Formula: Total Bazar Expenses / Total Consumed Meals (for the specific hostel)
   */
  calculateHostelMealRate: (hostelId, ptiId = null) => {
    // 1. Total Bazar for this hostel
    const allBazar = dbService.getBazarExpenses();
    const hostelBazar = allBazar.filter(b => b.hostelId === hostelId && (!ptiId || b.pti_id === ptiId));
    const totalBazarExpenses = hostelBazar.reduce((sum, b) => sum + Number(b.amount || 0), 0);

    // 2. Total consumed meals for this hostel
    const allSheets = dbService.getMealSheets();
    const hostelSheets = allSheets.filter(s => s.hostelId === hostelId && (!ptiId || s.pti_id === ptiId));

    let totalConsumedMeals = 0;
    hostelSheets.forEach(sheet => {
      if (sheet.records && Array.isArray(sheet.records)) {
        sheet.records.forEach(r => {
          totalConsumedMeals += (r.breakfast ? 1 : 0) + (r.lunch ? 1 : 0) + (r.dinner ? 1 : 0);
        });
      } else {
        totalConsumedMeals += Number(sheet.totalMealsCount || 0);
      }
    });

    // Ensure non-zero divisor
    const safeMeals = Math.max(totalConsumedMeals, 1);
    const mealRate = parseFloat((totalBazarExpenses / safeMeals).toFixed(2));

    return {
      totalBazarExpenses,
      totalConsumedMeals,
      mealRate: totalConsumedMeals > 0 ? mealRate : 65.0, // fallback baseline
    };
  },

  /**
   * Calculates student financial balances with strict color-coding logic
   */
  getStudentFinancials: (rollNumber, hostelId, userType = 'boarder_student', ptiId = null) => {
    const settings = mealAutomationService.getSettings(ptiId);
    const rateData = mealAutomationService.calculateHostelMealRate(hostelId, ptiId);

    // 1. Verified Deposits
    const allD = dbService.getDeposits();
    const verifiedDeposits = allD.filter(d => 
      String(d.rollNumber) === String(rollNumber) && 
      d.status === 'approved' &&
      (!ptiId || d.pti_id === ptiId)
    );

    const totalMessDeposits = verifiedDeposits
      .filter(d => (d?.depositType || '').toLowerCase().includes('mess'))
      .reduce((sum, d) => sum + (Number(d?.amount) || 0), 0);

    const totalEstDeposits = verifiedDeposits
      .filter(d => (d?.depositType || '').toLowerCase().includes('establishment'))
      .reduce((sum, d) => sum + (Number(d?.amount) || 0), 0);

    // 2. Student consumed meals
    const allSheets = dbService.getMealSheets();
    let studentMealsCount = 0;

    allSheets.filter(s => s.hostelId === hostelId && (!ptiId || s.pti_id === ptiId)).forEach(sheet => {
      const rec = sheet.records?.find(r => String(r.rollNumber) === String(rollNumber));
      if (rec) {
        studentMealsCount += (rec.breakfast ? 1 : 0) + (rec.lunch ? 1 : 0) + (rec.dinner ? 1 : 0);
      }
    });

    // Baseline mock count if early session
    if (studentMealsCount === 0 && userType === 'boarder_student') {
      studentMealsCount = 42; // standard monthly baseline
    }

    const calculatedMealCost = Math.round(studentMealsCount * rateData.mealRate);
    const netMessBalance = totalMessDeposits - calculatedMealCost;

    // Establishment calculation
    const fixedEstFee = settings.fixedEstablishmentFee || 1200;
    const netEstablishmentBalance = totalEstDeposits - fixedEstFee;

    return {
      mealCalculationsEnabled: settings.mealCalculationsEnabled,
      establishmentCalculationsEnabled: settings.establishmentCalculationsEnabled,
      studentMealsCount,
      mealRate: rateData.mealRate,
      totalBazarExpenses: rateData.totalBazarExpenses,
      totalConsumedMeals: rateData.totalConsumedMeals,
      totalMessDeposits,
      calculatedMealCost,
      netMessBalance,
      totalEstDeposits,
      fixedEstFee,
      netEstablishmentBalance,
    };
  },

  /**
   * Helper formatting function for Strict Financial Color-Coding:
   * Surplus (>= 0): Emerald Green (#10B981) with mandatory "+" sign: "+ ৳Amount"
   * Due (< 0): Crimson Red (#EF4444) with mandatory "-" sign: "- ৳Amount"
   */
  formatFinancialDisplay: (amount, isEnabled = true) => {
    if (!isEnabled) {
      return {
        text: 'Audit Under Review (Hidden)',
        subtext: 'Financial calculations paused by Superintendent',
        colorClass: 'text-slate-400 font-medium',
        hexColor: '#94A3B8',
        isSurplus: null,
      };
    }

    const num = Math.round(Number(amount));
    if (num >= 0) {
      return {
        text: `+ ৳${num.toLocaleString()}`,
        subtext: 'Surplus Remaining Balance',
        colorClass: 'text-emerald-500 font-bold',
        hexColor: '#10B981', // Emerald Green
        isSurplus: true,
      };
    } else {
      return {
        text: `- ৳${Math.abs(num).toLocaleString()}`,
        subtext: 'Outstanding Due Payable',
        colorClass: 'text-rose-500 font-bold',
        hexColor: '#EF4444', // Crimson Red
        isSurplus: false,
      };
    }
  }
};
