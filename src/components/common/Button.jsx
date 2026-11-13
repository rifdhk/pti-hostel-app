import React from 'react';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size = 'md',         // 'sm' | 'md' | 'lg'
  icon: Icon,
  className = '',
  disabled = false,
  loading = false,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-2 min-h-[38px] gap-1.5',
    md: 'text-sm px-4 py-2.5 min-h-[44px] gap-2',
    lg: 'text-base px-5 py-3 min-h-[48px] gap-2.5',
  };

  const variantStyles = {
    // Warm Golden/Orange Accent matching new logo palette
    primary: 'bg-brand-gold text-white hover:bg-yellow-600 shadow-sm focus:ring-amber-500/30',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-sm focus:ring-slate-300',
    outline: 'border border-brand-teal text-brand-teal hover:bg-teal-50 focus:ring-teal-500/30',
    teal: 'bg-brand-teal text-white hover:bg-teal-700 shadow-sm focus:ring-teal-500/30',
    navy: 'bg-brand-navy text-white hover:bg-slate-800 shadow-sm focus:ring-slate-700/30',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500/30',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 focus:ring-slate-200',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : Icon ? (
        <Icon className={size === 'sm' ? 'w-4 h-4' : 'w-4 h-4'} />
      ) : null}
      {children}
    </button>
  );
}
