import React from 'react';

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  change, 
  changeType = 'neutral', // 'positive' | 'negative' | 'neutral'
  icon: Icon,
  accentColor = 'teal'    // 'teal' | 'emerald' | 'rose' | 'amber' | 'blue' | 'violet'
}) {
  // Determine soft circular icon background and icon color
  const getIconStyles = () => {
    if (accentColor === 'emerald' || (changeType === 'positive' && accentColor !== 'teal')) {
      return 'bg-emerald-50 text-emerald-600';
    }
    if (accentColor === 'rose' || accentColor === 'red' || changeType === 'negative') {
      return 'bg-red-50 text-red-600';
    }
    if (accentColor === 'amber') {
      return 'bg-amber-50 text-amber-600';
    }
    if (accentColor === 'blue') {
      return 'bg-blue-50 text-blue-600';
    }
    if (accentColor === 'violet') {
      return 'bg-violet-50 text-violet-600';
    }
    // Default primary stats: Soft Teal
    return 'bg-teal-50 text-teal-600';
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
          <div className="mt-2.5 flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl font-bold tracking-tight text-slate-800">{value}</span>
            {change && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center ${
                changeType === 'positive' ? 'bg-emerald-50 text-emerald-700' :
                changeType === 'negative' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {change}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-xs text-slate-400 font-normal leading-relaxed">{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div className={`p-3 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105 ${getIconStyles()}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
