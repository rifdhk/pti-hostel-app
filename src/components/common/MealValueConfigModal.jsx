import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Sliders,
  CheckCircle2,
  Clock,
  Info,
  Lock,
  Coffee,
  Sun,
  Moon,
  X,
  RotateCcw,
  Save,
  Check
} from 'lucide-react';
import { mealAutomationService } from '../../services/mealAutomationService';
import Badge from './Badge';

export default function MealValueConfigModal({
  isOpen,
  onClose,
  hostelId = 'hostel_01',
  hostelName = 'Kazi Nazrul Hall',
  userProfile,
  onConfigSaved
}) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [breakfastValue, setBreakfastValue] = useState(1.0);
  const [dinnerValue, setDinnerValue] = useState(1.0);
  const [effectiveInfo, setEffectiveInfo] = useState({
    isExplicit: false,
    inheritedFromDate: null,
    sourceDate: 'default'
  });
  const [allConfigs, setAllConfigs] = useState([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Load effective values for selected date
  const loadDateConfig = (targetDate) => {
    const effective = mealAutomationService.getEffectiveMealValues(targetDate, hostelId);
    setBreakfastValue(effective.breakfastValue);
    setDinnerValue(effective.dinnerValue);
    setEffectiveInfo({
      isExplicit: effective.isExplicit,
      inheritedFromDate: effective.inheritedFromDate,
      sourceDate: effective.sourceDate
    });
  };

  const loadAllConfigs = () => {
    const list = mealAutomationService.getMealValueConfigs(hostelId);
    // Sort descending by date
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    setAllConfigs(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadDateConfig(selectedDate);
      loadAllConfigs();
      setSaveSuccessMsg('');
    }
  }, [isOpen, selectedDate, hostelId]);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      const updated = mealAutomationService.setMealValueConfig(
        hostelId,
        selectedDate,
        { breakfastValue, dinnerValue },
        userProfile?.name || 'Meal Manager'
      );
      setSaveSuccessMsg(`Meal values saved for ${selectedDate}! Breakfast: ${breakfastValue}, Dinner: ${dinnerValue}. Recalculated all affected meal sheets.`);
      loadDateConfig(selectedDate);
      loadAllConfigs();
      if (typeof onConfigSaved === 'function') {
        onConfigSaved(updated);
      }
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to save meal value config:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-teal-50 text-teal-700">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-800 font-heading">
                  Meal Value Configuration
                </h2>
                <Badge variant="teal" size="sm">Tier 4 Manager</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Set fractional meal values (0.5 or 1.0) with automatic past-date carry-on logic • <strong>{hostelName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {saveSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Date Picker & Inheritance Status Card */}
          <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  Select Target Date:
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pick any past, present, or upcoming date to review or override its meal values
                </p>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* Carry-On Status Indicator */}
            {effectiveInfo.isExplicit ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Explicit Configuration:</strong> This date ({selectedDate}) has custom meal values explicitly saved in the database.
                </span>
              </div>
            ) : effectiveInfo.inheritedFromDate ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Auto-Carried (Inherited):</strong> No explicit config for {selectedDate}. Automatically inheriting values from the most recently configured past date: <strong>{effectiveInfo.inheritedFromDate}</strong>.
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  <strong>Default Baseline:</strong> No past date configuration exists in the database. Defaulting to standard 1.0 (full meal) across all meals.
                </span>
              </div>
            )}
          </div>

          {/* Three Meals Value Controls */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 font-heading">
              Configure Meal Values for {selectedDate}:
            </h3>

            {/* Breakfast Control */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 font-heading">
                      Breakfast (সকালের নাস্তা)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Toggle whether breakfast counts as 0.5 (Half) or 1.0 (Full) meal
                    </p>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setBreakfastValue(0.5)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      breakfastValue === 0.5
                        ? 'bg-brand-teal text-white border-brand-teal shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    0.5 (Half Meal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBreakfastValue(1.0)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      breakfastValue === 1.0
                        ? 'bg-brand-teal text-white border-brand-teal shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    1.0 (Full Meal)
                  </button>
                </div>
              </div>
            </div>

            {/* Lunch Control (Locked Strictly 1.0) */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-800 font-heading">
                        Lunch (দুপুরের খাবার)
                      </h4>
                      <Badge variant="neutral" size="sm">Policy Locked</Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Institutional core policy: Lunch meal value is strictly 1.0 (Full Meal)
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200/80 text-slate-700 text-xs font-bold font-mono">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Strictly 1.0</span>
                </div>
              </div>
            </div>

            {/* Dinner Control */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 font-heading">
                      Dinner (রাতের খাবার)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Toggle whether dinner counts as 0.5 (Half) or 1.0 (Full) meal
                    </p>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDinnerValue(0.5)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      dinnerValue === 0.5
                        ? 'bg-brand-teal text-white border-brand-teal shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    0.5 (Half Meal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDinnerValue(1.0)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      dinnerValue === 1.0
                        ? 'bg-brand-teal text-white border-brand-teal shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    1.0 (Full Meal)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button: Save & Apply */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Saving overrides previous values and immediately recalculates all attendee meals and reports.
            </p>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-gold hover:bg-yellow-600 text-white transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0 font-heading"
            >
              <Save className="w-4 h-4" />
              <span>Save &amp; Apply for {selectedDate}</span>
            </button>
          </div>

          {/* Saved Configurations Audit History */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              Explicitly Configured Dates History ({allConfigs.length})
            </h4>

            {allConfigs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No explicitly configured dates yet. System is currently running on standard baseline (1.0).
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {allConfigs.map((cfg) => (
                  <div key={cfg.id || cfg.date} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-800">{cfg.date}</span>
                      <span className="text-slate-600">
                        Breakfast: <strong className="text-teal-700">{cfg.breakfastValue}</strong> • Lunch: <strong>1.0</strong> • Dinner: <strong className="text-teal-700">{cfg.dinnerValue}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(cfg.date)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                    >
                      Load &amp; Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
