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
            <p className="text-sm font-medium text-slate-500 leading-snug">{title}</p>
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

        {/* Detailed Breakdown List (Minimal Icons & Exact Format) */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2 text-xs">
          {/* Breakfast */}
          <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-50/90 border border-slate-100/60">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <span>☕</span>
              <span>Breakfast:</span>
            </span>
            <span className="font-semibold text-slate-800 font-mono text-right">
              {breakdown.breakfastCount} Times <span className="text-slate-500 font-normal">(Charge: <strong className="text-teal-700 font-bold">{formatVal(breakdown.breakfastMeals)}</strong>)</span>
            </span>
          </div>

          {/* Lunch */}
          <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-50/90 border border-slate-100/60">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <span>🍛</span>
              <span>Lunch:</span>
            </span>
            <span className="font-semibold text-slate-800 font-mono text-right">
              {breakdown.lunchCount} Times <span className="text-slate-500 font-normal">(Charge: <strong className="text-teal-700 font-bold">{formatVal(breakdown.lunchMeals)}</strong>)</span>
            </span>
          </div>

          {/* Dinner */}
          <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-50/90 border border-slate-100/60">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <span>🌙</span>
              <span>Dinner:</span>
            </span>
            <span className="font-semibold text-slate-800 font-mono text-right">
              {breakdown.dinnerCount} Times <span className="text-slate-500 font-normal">(Charge: <strong className="text-teal-700 font-bold">{formatVal(breakdown.dinnerMeals)}</strong>)</span>
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
