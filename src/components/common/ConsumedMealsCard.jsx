import React, { useState, useEffect } from 'react';
import { Utensils, Coffee, Sun, Moon, Info } from 'lucide-react';
import { mealAutomationService } from '../../services/mealAutomationService';

/**
 * Reusable Consumed Meals Breakdown Card for all user tiers (T1 to T6).
 * Shows overall fractional meal total alongside exact attendance counts
 * and calculated fractional meal values for Breakfast, Lunch, and Dinner.
 */
export default function ConsumedMealsCard({
  userProfile,
  hostelId = null,
  title = "My Consumed Meals",
  subtitle = "Personal dining attendance",
  className = ""
}) {
  const [breakdown, setBreakdown] = useState(() => 
    mealAutomationService.getUserPersonalConsumedMealsBreakdown(userProfile, hostelId)
  );

  const refreshBreakdown = () => {
    if (!userProfile) return;
    const b = mealAutomationService.getUserPersonalConsumedMealsBreakdown(userProfile, hostelId);
    setBreakdown(b);
  };

  useEffect(() => {
    refreshBreakdown();

    const handleUpdate = () => refreshBreakdown();
    window.addEventListener('pti_meals_changed', handleUpdate);
    window.addEventListener('pti_meal_values_changed', handleUpdate);
    window.addEventListener('pti_users_changed', handleUpdate);

    return () => {
      window.removeEventListener('pti_meals_changed', handleUpdate);
      window.removeEventListener('pti_meal_values_changed', handleUpdate);
      window.removeEventListener('pti_users_changed', handleUpdate);
    };
  }, [userProfile, hostelId]);

  const formatVal = (v) => {
    const num = Number(v) || 0;
    return num % 1 === 0 ? String(num) : num.toFixed(1);
  };

  return (
    <div className={`bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between ${className}`}>
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
            <div className="mt-2 flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800 font-mono">
                {formatVal(breakdown.totalMeals)}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                Meals
              </span>
            </div>
          </div>
          <div className="p-2.5 rounded-full bg-teal-50 text-teal-600 shrink-0">
            <Utensils className="w-5 h-5" />
          </div>
        </div>

        {/* Detailed Breakdown List */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
          {/* Breakfast */}
          <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50/80">
            <div className="flex items-center gap-1.5 font-medium text-slate-600">
              <Coffee className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Breakfast:</span>
            </div>
            <span className="font-semibold text-slate-800 text-right">
              <span className="text-slate-600 font-normal">{breakdown.breakfastCount} times</span>
              <span className="text-slate-400 font-normal mx-1">=</span>
              <span className="text-teal-700 font-bold font-mono">{formatVal(breakdown.breakfastMeals)} meals</span>
            </span>
          </div>

          {/* Lunch */}
          <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50/80">
            <div className="flex items-center gap-1.5 font-medium text-slate-600">
              <Sun className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span>Lunch:</span>
            </div>
            <span className="font-semibold text-slate-800 text-right">
              <span className="text-slate-600 font-normal">{breakdown.lunchCount} times</span>
              <span className="text-slate-400 font-normal mx-1">=</span>
              <span className="text-teal-700 font-bold font-mono">{formatVal(breakdown.lunchMeals)} meals</span>
              <span className="text-[10px] text-slate-400 font-normal ml-1">(always 1.0)</span>
            </span>
          </div>

          {/* Dinner */}
          <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50/80">
            <div className="flex items-center gap-1.5 font-medium text-slate-600">
              <Moon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Dinner:</span>
            </div>
            <span className="font-semibold text-slate-800 text-right">
              <span className="text-slate-600 font-normal">{breakdown.dinnerCount} times</span>
              <span className="text-slate-400 font-normal mx-1">=</span>
              <span className="text-teal-700 font-bold font-mono">{formatVal(breakdown.dinnerMeals)} meals</span>
            </span>
          </div>
        </div>
      </div>

      {/* Footer Total */}
      <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200 flex items-center justify-between text-xs">
        <span className="font-bold text-slate-600">Total Meals:</span>
        <span className="font-extrabold text-teal-900 bg-teal-50 border border-teal-200/60 px-2.5 py-0.5 rounded-md font-mono">
          {formatVal(breakdown.totalMeals)} Meals
        </span>
      </div>
    </div>
  );
}
