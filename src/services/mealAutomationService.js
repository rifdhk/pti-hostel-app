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
  appTitle: 'PTI Hostel Management App',                // Dynamic white-label application title
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
   * ---------------- MEAL VALUE CONFIGURATION (FRACTIONAL MEAL VALUE SYSTEM) ----------------
   * Allows Meal Managers to set breakfastValue (0.5 or 1.0) and dinnerValue (0.5 or 1.0)
   * while lunch remains strictly 1.0.
   *
   * Carry-On Logic: If a date has no explicitly configured value in the database,
   * the system automatically inherits the value from the most recently configured
   * past date (or defaults to 1.0 if no past config exists).
   */
  getMealValueConfigs: (hostelId = null) => {
    const all = dbService.getMealValueConfigs();
    if (!hostelId) return all;
    return all.filter(c => !c.hostelId || c.hostelId === hostelId);
  },

  getEffectiveMealValues: (targetDate = null, hostelId = null) => {
    const dateStr = targetDate 
      ? String(targetDate).split('T')[0] 
      : new Date().toISOString().split('T')[0];

    const allConfigs = dbService.getMealValueConfigs();
    const relevant = allConfigs.filter(c => !hostelId || !c.hostelId || c.hostelId === hostelId);

    // 1. Explicit config for this exact date
    const explicit = relevant.find(c => c.date === dateStr);
    if (explicit) {
      const bVal = Number(explicit.breakfastValue) === 0.5 ? 0.5 : 1.0;
      const dVal = Number(explicit.dinnerValue) === 0.5 ? 0.5 : 1.0;
      return {
        date: dateStr,
        breakfastValue: bVal,
        lunchValue: 1.0, // Strictly 1.0
        dinnerValue: dVal,
        isExplicit: true,
        inheritedFromDate: null,
        sourceDate: dateStr,
        config: explicit
      };
    }

    // 2. Carry-on logic: find the most recently configured past date (date < dateStr)
    const pastConfigs = relevant
      .filter(c => c.date && c.date < dateStr)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (pastConfigs.length > 0) {
      const mostRecentPast = pastConfigs[0];
      const bVal = Number(mostRecentPast.breakfastValue) === 0.5 ? 0.5 : 1.0;
      const dVal = Number(mostRecentPast.dinnerValue) === 0.5 ? 0.5 : 1.0;
      return {
        date: dateStr,
        breakfastValue: bVal,
        lunchValue: 1.0,
        dinnerValue: dVal,
        isExplicit: false,
        inheritedFromDate: mostRecentPast.date,
        sourceDate: mostRecentPast.date,
        config: mostRecentPast
      };
    }

    // 3. Baseline default: 1.0 for all meals
    return {
      date: dateStr,
      breakfastValue: 1.0,
      lunchValue: 1.0,
      dinnerValue: 1.0,
      isExplicit: false,
      inheritedFromDate: null,
      sourceDate: 'default',
      config: null
    };
  },

  setMealValueConfig: (hostelId, targetDate, values, updatedBy = 'Meal Manager') => {
    const dateStr = String(targetDate).split('T')[0];
    const bVal = Number(values.breakfastValue) === 0.5 ? 0.5 : 1.0;
    const dVal = Number(values.dinnerValue) === 0.5 ? 0.5 : 1.0;

    const configRecord = {
      id: `${hostelId || 'hostel_01'}_${dateStr}`,
      hostelId: hostelId || 'hostel_01',
      date: dateStr,
      breakfastValue: bVal,
      lunchValue: 1.0,
      dinnerValue: dVal,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'Meal Manager'
    };

    dbService.saveMealValueConfig(configRecord);

    // Synchronize all existing meal sheets so cached record totals reflect dynamic fractional values
    try {
      const allSheets = dbService.getMealSheets();
      let modifiedAny = false;
      const updatedSheets = allSheets.map(sheet => {
        if (hostelId && sheet.hostelId && sheet.hostelId !== hostelId) return sheet;
        const effective = mealAutomationService.getEffectiveMealValues(sheet.date, sheet.hostelId);
        if (sheet.records && Array.isArray(sheet.records)) {
          let sheetTotal = 0;
          const nextRecords = sheet.records.map(r => {
            const b = r.breakfast ? effective.breakfastValue : 0;
            const l = r.lunch ? 1.0 : 0;
            const d = r.dinner ? effective.dinnerValue : 0;
            const recTotal = parseFloat((b + l + d).toFixed(2));
            sheetTotal += recTotal;
            return { ...r, total: recTotal };
          });
          modifiedAny = true;
          return {
            ...sheet,
            records: nextRecords,
            totalMealsCount: parseFloat(sheetTotal.toFixed(2))
          };
        }
        return sheet;
      });

      if (modifiedAny) {
        dbService.saveMealSheets(updatedSheets);
      }
    } catch (e) {
      console.error('Failed to sync sheet meal totals with updated meal values:', e);
    }

    // Trigger events to update all UI dashboards and recalculate immediately
    window.dispatchEvent(new CustomEvent('pti_meal_values_changed', { detail: { hostelId, date: dateStr, config: configRecord } }));
    window.dispatchEvent(new CustomEvent('pti_meals_changed'));
    return configRecord;
  },

  /**
   * Detailed personal consumed meals breakdown with fractional math
   */
  getUserPersonalConsumedMealsBreakdown: (userProfile, hostelId = null) => {
    if (!userProfile) {
      return {
        breakfastCount: 0,
        breakfastMeals: 0,
        lunchCount: 0,
        lunchMeals: 0,
        dinnerCount: 0,
        dinnerMeals: 0,
        totalMeals: 0
      };
    }

    const roll = userProfile.rollNumber;
    const loginId = userProfile.loginId;
    const userId = userProfile.id;
    const userName = (userProfile.name || '').toLowerCase();

    const allSheets = dbService.getMealSheets();

    let breakfastCount = 0;
    let breakfastMeals = 0;
    let lunchCount = 0;
    let lunchMeals = 0;
    let dinnerCount = 0;
    let dinnerMeals = 0;
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
        const effective = mealAutomationService.getEffectiveMealValues(sheet.date, sheet.hostelId);
        if (rec.breakfast) {
          breakfastCount += 1;
          breakfastMeals += effective.breakfastValue;
        }
        if (rec.lunch) {
          lunchCount += 1;
          lunchMeals += 1.0;
        }
        if (rec.dinner) {
          dinnerCount += 1;
          dinnerMeals += effective.dinnerValue;
        }
      }
    });

    if (foundInSheets && (breakfastCount + lunchCount + dinnerCount) > 0) {
      breakfastMeals = parseFloat(breakfastMeals.toFixed(2));
      lunchMeals = parseFloat(lunchMeals.toFixed(2));
      dinnerMeals = parseFloat(dinnerMeals.toFixed(2));
      const totalMeals = parseFloat((breakfastMeals + lunchMeals + dinnerMeals).toFixed(2));
      return {
        breakfastCount,
        breakfastMeals,
        lunchCount,
        lunchMeals,
        dinnerCount,
        dinnerMeals,
        totalMeals
      };
    }

    // Role-based authentic baseline breakdown if initial seed session
    const role = (userProfile.role || '').toLowerCase();
    let baselineTotal = 24;
    if (role.includes('boarder') || role === 'boarder_student') baselineTotal = 42;
    else if (role.includes('manager') || role === 'meal_manager') baselineTotal = 48;
    else if (role.includes('monitor') || role === 'hostel_monitor') baselineTotal = 45;
    else if (role.includes('hostel_super')) baselineTotal = 28;
    else if (role.includes('superintendent')) baselineTotal = 18;
    else if (role.includes('non_boarder')) baselineTotal = 6;

    const basePerMeal = Math.floor(baselineTotal / 3);
    const rem = baselineTotal - (basePerMeal * 2);

    return {
      breakfastCount: basePerMeal,
      breakfastMeals: basePerMeal,
      lunchCount: basePerMeal,
      lunchMeals: basePerMeal,
      dinnerCount: rem,
      dinnerMeals: rem,
      totalMeals: baselineTotal
    };
  },

  /**
   * Universal Personal Consumed Meals Calculation for ANY tier (T1 through T6)
   */
  getUserPersonalConsumedMeals: (userProfile, hostelId = null) => {
    const breakdown = mealAutomationService.getUserPersonalConsumedMealsBreakdown(userProfile, hostelId);
    return breakdown.totalMeals;
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

    // 2. Total consumed meals for this hostel (with fractional values)
    const allSheets = dbService.getMealSheets();
    const hostelSheets = allSheets.filter(s => s.hostelId === hostelId && (!ptiId || s.pti_id === ptiId));

    let totalConsumedMeals = 0;
    hostelSheets.forEach(sheet => {
      const effective = mealAutomationService.getEffectiveMealValues(sheet.date, sheet.hostelId);
      if (sheet.records && Array.isArray(sheet.records)) {
        sheet.records.forEach(r => {
          const bVal = r.breakfast ? effective.breakfastValue : 0;
          const lVal = r.lunch ? 1.0 : 0;
          const dVal = r.dinner ? effective.dinnerValue : 0;
          totalConsumedMeals += (bVal + lVal + dVal);
        });
      } else {
        totalConsumedMeals += Number(sheet.totalMealsCount || 0);
      }
    });

    totalConsumedMeals = parseFloat(totalConsumedMeals.toFixed(2));
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

    // 2. Student consumed meals with fractional breakdown
    const breakdown = mealAutomationService.getUserPersonalConsumedMealsBreakdown(
      { rollNumber, role: userType },
      hostelId
    );
    const studentMealsCount = breakdown.totalMeals;

    const calculatedMealCost = Math.round(studentMealsCount * rateData.mealRate);
    const netMessBalance = totalMessDeposits - calculatedMealCost;

    // Establishment calculation
    const fixedEstFee = settings.fixedEstablishmentFee || 1200;
    const netEstablishmentBalance = totalEstDeposits - fixedEstFee;

    return {
      mealCalculationsEnabled: settings.mealCalculationsEnabled,
      establishmentCalculationsEnabled: settings.establishmentCalculationsEnabled,
      studentMealsCount,
      mealBreakdown: breakdown,
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
  },

  /**
   * Current academic / calendar month string in YYYY-MM format
   */
  getCurrentMonth: () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  },

  /**
   * Human readable month and year (e.g., "November 2026")
   */
  getMonthDisplayName: (monthStr = null) => {
    const m = monthStr || mealAutomationService.getCurrentMonth();
    const parts = m.split('-');
    const year = parseInt(parts[0], 10) || new Date().getFullYear();
    const monthNum = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
    const date = new Date(year, monthNum - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  },

  /**
   * Checks whether a Superintendent or Hostel Super has explicitly opted in to eat meals
   * in a given month. Non-super users (boarders, monitors, managers) return true by default.
   */
  hasSuperOptedInToMeals: (userProfile, targetMonth = null) => {
    if (!userProfile) return false;
    const role = (userProfile.role || '').toLowerCase();
    const isSuper = role.includes('superintendent') || role.includes('hostel_super') || role === 'admin';
    if (!isSuper) return true; // Boarders, monitors, and managers are regular mess diners

    const month = targetMonth || mealAutomationService.getCurrentMonth();
    const userId = userProfile.id || userProfile.loginId || userProfile.rollNumber || 'super';
    const userRoll = String(userProfile.rollNumber || userProfile.loginId || '');

    // 1. Explicit local storage preference takes top precedence
    const explicitKey = `pti_super_meal_opt_in_${userId}_${month}`;
    const explicitPref = localStorage.getItem(explicitKey);
    if (explicitPref === 'true') return true;
    if (explicitPref === 'false') return false;

    // Generic key without userId fallback
    const genericKey = `pti_super_meal_opt_in_${month}`;
    const genericPref = localStorage.getItem(genericKey);
    if (genericPref === 'true') return true;
    if (genericPref === 'false') return false;

    // 2. Check if user has active next-day meal intentions in that month
    const nextMeals = dbService.getNextDayMealsMap();
    const nextDate = mealAutomationService.getNextDayDate();
    if (nextDate.startsWith(month)) {
      for (const [key, item] of Object.entries(nextMeals)) {
        if (
          key.includes(userRoll) || 
          key.includes('STAFF-T1') || 
          key.includes('admin') || 
          key.includes('hostel_super') ||
          (userProfile.id && key.includes(userProfile.id))
        ) {
          if (item && (item.breakfast || item.lunch || item.dinner)) {
            return true;
          }
        }
      }
    }

    // 3. Check if user has meal sheet entries in that month with meals taken
    const sheets = dbService.getMealSheets();
    const monthSheets = sheets.filter(s => s.date && s.date.startsWith(month));
    for (const sheet of monthSheets) {
      if (Array.isArray(sheet.records)) {
        const rec = sheet.records.find(r =>
          (userRoll && String(r.rollNumber) === userRoll) ||
          (r.studentId && (r.studentId === userId || r.studentId === userProfile.id)) ||
          (role.includes('superintendent') && (r.rollNumber === 'STAFF-T1' || r.studentId === 'admin')) ||
          (role.includes('hostel_super') && (r.rollNumber === 'hostel_super' || r.studentId === 'hostel_super'))
        );
        if (rec && (rec.breakfast || rec.lunch || rec.dinner || Number(rec.total || 0) > 0)) {
          return true;
        }
      }
    }

    return false;
  },

  /**
   * Sets the explicit opt-in preference for a Superintendent or Hostel Super for a given month.
   */
  setSuperMealOptIn: (userProfile, optedIn = true, targetMonth = null) => {
    if (!userProfile) return false;
    const month = targetMonth || mealAutomationService.getCurrentMonth();
    const userId = userProfile.id || userProfile.loginId || userProfile.rollNumber || 'super';
    const explicitKey = `pti_super_meal_opt_in_${userId}_${month}`;
    localStorage.setItem(explicitKey, optedIn ? 'true' : 'false');
    localStorage.setItem(`pti_super_meal_opt_in_${month}`, optedIn ? 'true' : 'false');

    const role = (userProfile.role || '').toLowerCase();
    const isSuperintendent = role.includes('superintendent') || role === 'admin';
    const rollNumber = userProfile.rollNumber || (isSuperintendent ? 'STAFF-T1' : 'hostel_super');
    const hostelId = localStorage.getItem('pti_superintendent_chosen_hostel') || userProfile.hostelId || 'hostel_01';

    try {
      mealAutomationService.saveManualNextDayMeal(
        hostelId,
        rollNumber,
        { breakfast: optedIn, lunch: optedIn, dinner: optedIn },
        {
          name: userProfile.name,
          role: userProfile.role,
          isSuperintendent,
          id: userProfile.id || rollNumber
        }
      );
    } catch {}

    window.dispatchEvent(new CustomEvent('pti_super_opt_in_changed', { detail: { userId, month, optedIn } }));
    window.dispatchEvent(new CustomEvent('pti_meals_changed'));
    window.dispatchEvent(new CustomEvent('pti_deposits_changed'));
    return optedIn;
  }
};
