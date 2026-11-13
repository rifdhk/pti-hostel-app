import React from 'react';

export default function Badge({ 
  children, 
  variant = 'neutral', // 'teal' | 'success' | 'warning' | 'danger' | 'neutral' | 'info'
  size = 'md',
  className = '' 
}) {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-semibold',
    md: 'text-xs px-2.5 py-0.5 font-semibold',
  };

  const variantStyles = {
    // Deep Teal Accent based badge
    teal: 'bg-teal-50 text-teal-700 border border-teal-200/80',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/80',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200/80',
    info: 'bg-sky-50 text-sky-700 border border-sky-200/80',
  };

  return (
    <span className={`inline-flex items-center rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
