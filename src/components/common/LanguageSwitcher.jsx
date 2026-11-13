import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'en';
  const isBengali = currentLang.startsWith('bn');

  const toggleLanguage = () => {
    const nextLang = isBengali ? 'en' : 'bn';
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      title={isBengali ? 'Switch language to English' : 'ভাষা পরিবর্তন করুন (বাংলা)'}
      className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-slate-700 shadow-2xs transition-all cursor-pointer select-none active:scale-95 ${className}`}
    >
      <Globe className="w-3.5 h-3.5 text-brand-600 shrink-0" />
      <div className="flex items-center gap-1">
        <span className={!isBengali ? 'font-bold text-brand-700' : 'text-slate-400'}>
          EN
        </span>
        <span className="text-slate-300">/</span>
        <span className={isBengali ? 'font-bold text-brand-700' : 'text-slate-400'}>
          বাং
        </span>
      </div>
    </button>
  );
}
