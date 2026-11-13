import React, { useState, useEffect } from 'react';
import { Utensils, Clock, Lock, CheckCircle2, RefreshCw, Building2, Send } from 'lucide-react';
import Badge from './Badge';
import { useAuth } from '../../contexts/AuthContext';
import { mealAutomationService } from '../../services/mealAutomationService';
import { dbService } from '../../services/db';

export default function NextDayMealToggle({
  hostelId: initialHostelId,
  rollNumber = '103',
  userName,
  userRole,
  isSuperintendent = false,
  onUpdate
}) {
  const { effectivePtiId, userProfile } = useAuth();
  const isSuper = isSuperintendent || userRole === 'superintendent' || userRole === 'hostel_super';
  const currentMonth = mealAutomationService.getCurrentMonth();
  const [isOptedIn, setIsOptedIn] = useState(() => mealAutomationService.hasSuperOptedInToMeals(userProfile, currentMonth));

  // If super, allow selecting which hostel they are dining in
  const [selectedHostelId, setSelectedHostelId] = useState(() => {
    if (isSuper) {
      return localStorage.getItem('pti_superintendent_chosen_hostel') || initialHostelId || 'hostel_01';
    }
    return initialHostelId || 'hostel_01';
  });

  const [hostelsList, setHostelsList] = useState([]);
  const [mealData, setMealData] = useState(null);
  const [cutOffStatus, setCutOffStatus] = useState({ expired: false, reason: '' });
  const [toastMessage, setToastMessage] = useState('');

  const targetDate = mealAutomationService.getNextDayDate();
  const effectiveHostel = isSuper ? selectedHostelId : (initialHostelId || 'hostel_01');

  // Load hostels for super dropdown (tenant-scoped & reactive)
  useEffect(() => {
    const loadHostels = () => {
      const allList = dbService.getHostels();
      const scoped = effectivePtiId && effectivePtiId !== 'GLOBAL'
        ? allList.filter(h => !h.pti_id || h.pti_id === effectivePtiId)
        : allList;
      setHostelsList(scoped);
      if (isSuper && scoped.length > 0 && !scoped.some(h => h.id === selectedHostelId)) {
        setSelectedHostelId(scoped[0].id);
      }
    };
    loadHostels();
    window.addEventListener('pti_hostels_changed', loadHostels);
    return () => window.removeEventListener('pti_hostels_changed', loadHostels);
  }, [effectivePtiId, isSuper, selectedHostelId]);

  useEffect(() => {
    const handleOptInChange = () => {
      setIsOptedIn(mealAutomationService.hasSuperOptedInToMeals(userProfile, currentMonth));
    };
    window.addEventListener('pti_super_opt_in_changed', handleOptInChange);
    window.addEventListener('pti_meals_changed', handleOptInChange);
    return () => {
      window.removeEventListener('pti_super_opt_in_changed', handleOptInChange);
      window.removeEventListener('pti_meals_changed', handleOptInChange);
    };
  }, [userProfile, currentMonth]);

  useEffect(() => {
    loadMealState();

    const handleSettingsChange = () => loadMealState();
    const handleMealsChange = () => loadMealState();

    window.addEventListener('pti_settings_changed', handleSettingsChange);
    window.addEventListener('pti_meals_changed', handleMealsChange);
    return () => {
      window.removeEventListener('pti_settings_changed', handleSettingsChange);
      window.removeEventListener('pti_meals_changed', handleMealsChange);
    };
  }, [effectiveHostel, rollNumber]);

  const loadMealState = () => {
    const data = mealAutomationService.getOrAutoCarryNextDayMeal(effectiveHostel, rollNumber);
    setMealData(data);
    const cutOff = mealAutomationService.isCutOffExpired(effectiveHostel, targetDate);
    setCutOffStatus(cutOff);
  };

  const handleHostelChange = (newHostelId) => {
    setSelectedHostelId(newHostelId);
    if (isSuper) {
      localStorage.setItem('pti_superintendent_chosen_hostel', newHostelId);
    }
    const chosenHostelObj = hostelsList.find(h => h.id === newHostelId);
    const hostelName = chosenHostelObj ? chosenHostelObj.name : newHostelId;
    setToastMessage(`Switched dining hall to ${hostelName}`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleToggleSuperOptIn = () => {
    const next = !isOptedIn;
    mealAutomationService.setSuperMealOptIn(userProfile, next, currentMonth);
    setIsOptedIn(next);
    setToastMessage(next 
      ? `Dining activated for ${mealAutomationService.getMonthDisplayName(currentMonth)}. "Submit Fee Deposit" button is now active.`
      : `Dining paused for ${mealAutomationService.getMonthDisplayName(currentMonth)}. "Submit Fee Deposit" button is now disabled.`
    );
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleToggle = (mealType) => {
    if (cutOffStatus.expired) {
      setToastMessage('Cannot modify meals: ' + cutOffStatus.reason);
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    try {
      const isNowTurningOn = !mealData[mealType];
      if (isSuper && isNowTurningOn && !isOptedIn) {
        mealAutomationService.setSuperMealOptIn(userProfile, true, currentMonth);
        setIsOptedIn(true);
      }

      const extraInfo = {
        name: userName || (isSuperintendent ? 'Dr. Anwar Hossain (Superintendent)' : 'Resident User'),
        role: userRole || (isSuperintendent ? 'superintendent' : 'boarder_student'),
        isSuperintendent: Boolean(isSuperintendent),
        id: rollNumber
      };

      const updated = mealAutomationService.saveManualNextDayMeal(
        effectiveHostel,
        rollNumber,
        { [mealType]: !mealData[mealType] },
        extraInfo
      );

      setMealData(updated);

      const chosenHostelObj = hostelsList.find(h => h.id === effectiveHostel);
      const hostelName = chosenHostelObj ? chosenHostelObj.name : 'Hostel';

      if (isSuper) {
        setToastMessage(`${userRole === 'hostel_super' ? 'Hostel Super' : 'Superintendent'} choice for ${mealType.toUpperCase()} routed to ${hostelName} Meal Manager.`);
      } else {
        setToastMessage(`${mealType.toUpperCase()} meal updated for tomorrow.`);
      }

      if (onUpdate) onUpdate(updated);
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err) {
      setToastMessage(err.message);
      setTimeout(() => setToastMessage(''), 3500);
    }
  };

  if (!mealData) return null;

  const totalTomorrowMeals = (mealData.breakfast ? 1 : 0) + (mealData.lunch ? 1 : 0) + (mealData.dinner ? 1 : 0);
  const activeHostelName = hostelsList.find(h => h.id === effectiveHostel)?.name || 'Assigned Hostel';

  return (
    <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
      
      {/* Header with Cut-off Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <Utensils className="w-4 h-4 text-teal-600" />
              Daily Meal Choice
            </h3>
            <Badge variant="teal" size="sm">
              Date: {targetDate}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Set breakfast, lunch, and dinner intentions for tomorrow before cut-off.
          </p>
        </div>

        {/* Cut-off Status Badge */}
        <div>
          {cutOffStatus.expired ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>Cut-Off Expired (Locked)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Cut-Off: 08:00 PM (Active)</span>
            </div>
          )}
        </div>
      </div>

      {/* Super Dining Controls: Hostel Hall Selector & Monthly Opt-In Status */}
      {isSuper && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-teal-700 shrink-0" />
              <div>
                <p className="text-xs font-bold text-teal-900">Select Hostel Hall for Dining</p>
                <p className="text-[11px] text-teal-700">Your meal selections will route to that hostel's Meal Manager roster.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={effectiveHostel}
                onChange={(e) => handleHostelChange(e.target.value)}
                className="px-3 py-2 min-h-[44px] text-xs font-bold bg-white text-teal-900 border border-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs cursor-pointer font-heading"
              >
                {hostelsList.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.type || 'Hall'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Monthly Dining Status Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Utensils className="w-5 h-5 text-brand-teal shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800 font-heading">
                  Monthly Mess Status ({mealAutomationService.getMonthDisplayName(currentMonth)}):{' '}
                  <span className={isOptedIn ? 'text-emerald-700 font-bold' : 'text-amber-700 font-semibold'}>
                    {isOptedIn ? 'Opted In (Active)' : 'Not Started (Paused)'}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">
                  {isOptedIn
                    ? 'Fee deposit button is active. You may submit fee deposit slips for this month.'
                    : 'Fee deposit button remains disabled until meals are started for this month.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSuperOptIn}
              className={`px-3.5 py-2 text-xs font-medium rounded-md font-heading transition-all shadow-xs ${
                isOptedIn
                  ? 'bg-white border border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                  : 'bg-brand-gold hover:bg-yellow-600 text-white'
              }`}
            >
              {isOptedIn ? 'Pause Meals / Opt Out' : 'Start Meals / Opt In'}
            </button>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3 Meal Toggle Switches (Breakfast, Lunch, Dinner) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Breakfast Switch */}
        <div className={`p-4 rounded-2xl border transition-all ${
          mealData.breakfast 
            ? 'bg-teal-50/70 border-teal-200 shadow-2xs' 
            : 'bg-slate-50 border-slate-200/80 opacity-75'
        }`}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-800">Breakfast</span>
            <span className="text-[10px] text-slate-400 font-mono">07:30 - 08:30</span>
          </div>

          <div className="flex items-center justify-between w-full pt-0.5">
            <span className={`text-xs font-semibold select-none ${mealData.breakfast ? 'text-teal-700' : 'text-slate-400'}`}>
              {mealData.breakfast ? 'Taking Meal' : 'Skipping'}
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={mealData.breakfast}
              onClick={() => handleToggle('breakfast')}
              disabled={cutOffStatus.expired}
              aria-label="Toggle Breakfast"
              className={`relative inline-flex items-center shrink-0 w-11 h-6 p-0.5 rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                cutOffStatus.expired ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              } ${mealData.breakfast ? 'bg-teal-600' : 'bg-slate-300'}`}
            >
              <span
                className={`inline-block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ease-in-out pointer-events-none ${
                  mealData.breakfast ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Lunch Switch */}
        <div className={`p-4 rounded-2xl border transition-all ${
          mealData.lunch 
            ? 'bg-teal-50/70 border-teal-200 shadow-2xs' 
            : 'bg-slate-50 border-slate-200/80 opacity-75'
        }`}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-800">Lunch</span>
            <span className="text-[10px] text-slate-400 font-mono">13:00 - 14:15</span>
          </div>

          <div className="flex items-center justify-between w-full pt-0.5">
            <span className={`text-xs font-semibold select-none ${mealData.lunch ? 'text-teal-700' : 'text-slate-400'}`}>
              {mealData.lunch ? 'Taking Meal' : 'Skipping'}
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={mealData.lunch}
              onClick={() => handleToggle('lunch')}
              disabled={cutOffStatus.expired}
              aria-label="Toggle Lunch"
              className={`relative inline-flex items-center shrink-0 w-11 h-6 p-0.5 rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                cutOffStatus.expired ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              } ${mealData.lunch ? 'bg-teal-600' : 'bg-slate-300'}`}
            >
              <span
                className={`inline-block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ease-in-out pointer-events-none ${
                  mealData.lunch ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Dinner Switch */}
        <div className={`p-4 rounded-2xl border transition-all ${
          mealData.dinner 
            ? 'bg-teal-50/70 border-teal-200 shadow-2xs' 
            : 'bg-slate-50 border-slate-200/80 opacity-75'
        }`}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-800">Dinner</span>
            <span className="text-[10px] text-slate-400 font-mono">20:30 - 21:30</span>
          </div>

          <div className="flex items-center justify-between w-full pt-0.5">
            <span className={`text-xs font-semibold select-none ${mealData.dinner ? 'text-teal-700' : 'text-slate-400'}`}>
              {mealData.dinner ? 'Taking Meal' : 'Skipping'}
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={mealData.dinner}
              onClick={() => handleToggle('dinner')}
              disabled={cutOffStatus.expired}
              aria-label="Toggle Dinner"
              className={`relative inline-flex items-center shrink-0 w-11 h-6 p-0.5 rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                cutOffStatus.expired ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              } ${mealData.dinner ? 'bg-teal-600' : 'bg-slate-300'}`}
            >
              <span
                className={`inline-block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ease-in-out pointer-events-none ${
                  mealData.dinner ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

      </div>

      {/* Auto-Carry Forward Audit Footer */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {mealData.source === 'auto_carried' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
              Auto-Carried Forward Rule: Previous day's configuration applied
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Manually Updated ({mealData.updatedAt})
            </span>
          )}
        </div>

        <div className="text-slate-600 font-medium flex items-center gap-2">
          <span>Target Hall: <strong className="text-teal-800">{activeHostelName}</strong></span>
          <span>•</span>
          <span>Tomorrow's Meals: <strong className="text-slate-900 font-mono text-sm">{totalTomorrowMeals}</strong></span>
        </div>
      </div>

    </div>
  );
}
