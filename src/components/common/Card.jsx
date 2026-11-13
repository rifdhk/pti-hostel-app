import React from 'react';

export default function Card({ 
  children, 
  title, 
  subtitle, 
  action, 
  className = '', 
  padding = 'p-6 sm:p-7',
  hover = false 
}) {
  return (
    <div 
      className={`bg-white border border-slate-100 rounded-2xl sm:rounded-3xl shadow-sm transition-all duration-200 ${
        hover ? 'hover:shadow-md hover:border-slate-200/80' : ''
      } ${className}`}
    >
      {(title || action || subtitle) && (
        <div className="px-6 sm:px-7 py-5 border-b border-slate-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            {title && <h3 className="font-bold text-slate-800 tracking-tight text-base sm:text-lg">{title}</h3>}
            {subtitle && <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
        </div>
      )}
      <div className={padding}>
        {children}
      </div>
    </div>
  );
}
