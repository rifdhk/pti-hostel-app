import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  Building2, 
  Utensils, 
  Wrench, 
  GraduationCap, 
  KeyRound,
  Users,
  Sparkles,
  X
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import { useAuth } from '../contexts/AuthContext';
import { USER_ROLES } from '../services/seedData';

export default function Login() {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [toastError, setToastError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { loginWithIdentifier, isFirebaseConfigured } = useAuth();
  const navigate = useNavigate();

  // Check for redirected suspension/revocation notices
  useEffect(() => {
    const notice = sessionStorage.getItem('pti_login_notice');
    if (notice) {
      setError(notice);
      setToastError(notice);
      sessionStorage.removeItem('pti_login_notice');
    }
  }, []);

  useEffect(() => {
    if (!toastError) return;
    const timer = setTimeout(() => setToastError(''), 7000);
    return () => clearTimeout(timer);
  }, [toastError]);

  // Helper to detect role of identifier typed
  const getIdentifierHint = (val) => {
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) return null;
    if (trimmed === 'master' || trimmed === 'master@pti.gov.bd') {
      return { label: 'Tier 0 • Master Admin (Central Admin)', variant: 'teal', icon: Sparkles };
    }
    if (trimmed === 'admin' || trimmed === 'superintendent@institution.edu') {
      return { label: 'Tier 1 • Superintendent Account', variant: 'teal', icon: ShieldCheck };
    }
    if (trimmed === 'hostel_super') {
      return { label: 'Tier 2 • Hostel Super (Chief Warden)', variant: 'info', icon: Building2 };
    }
    if (trimmed === 'monitor_101' || trimmed === '101') {
      return { label: 'Tier 3 • Hostel Monitor (Roll: 101)', variant: 'warning', icon: Wrench };
    }
    if (trimmed === 'manager_102' || trimmed === '102') {
      return { label: 'Tier 4 • Meal Manager (Roll: 102)', variant: 'success', icon: Utensils };
    }
    if (trimmed === '103' || trimmed === 'boarder_103') {
      return { label: 'Tier 5 • Boarder Student (Roll: 103)', variant: 'teal', icon: GraduationCap };
    }
    if (trimmed === '201' || trimmed === 'student_201') {
      return { label: 'Tier 6 • Non-Boarder Trainee (Roll: 201)', variant: 'neutral', icon: Users };
    }
    return { label: 'Institutional Credential', variant: 'neutral', icon: User };
  };

  const isMasterLogin = identifier.trim().toLowerCase() === 'master' || identifier.trim().toLowerCase() === 'master@pti.gov.bd';
  const detectedRole = getIdentifierHint(identifier);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setToastError('');
    setSubmitting(true);

    try {
      const result = await loginWithIdentifier(identifier, password);
      navigate(result.redirectPath, { replace: true });
    } catch (err) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setError(msg);
      setToastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const quickFill = (id, pwd) => {
    setIdentifier(id);
    setPassword(pwd);
    setError('');
    setToastError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 selection:bg-teal-100 selection:text-teal-900 relative">
      {/* Floating Error Toast */}
      {toastError && (
        <div
          role="alert"
          className="fixed top-5 right-5 left-5 sm:left-auto sm:max-w-md z-50 bg-rose-600 text-white px-4 py-3.5 rounded-2xl shadow-xl border border-rose-500 flex items-start gap-3 animate-in fade-in slide-in-from-top-3 duration-200"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-100" />
          <div className="flex-1 text-xs font-semibold leading-relaxed">
            {toastError}
          </div>
          <button
            type="button"
            onClick={() => setToastError('')}
            className="text-rose-100 hover:text-white p-0.5 rounded-lg hover:bg-rose-700/60 transition-colors shrink-0"
            aria-label="Dismiss error toast"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="w-full max-w-lg space-y-6">
        
        {/* Emblem & Portal Title */}
        <div className="text-center">
          <div className="w-14 h-14 bg-brand-navy rounded-2xl mx-auto flex items-center justify-center text-white shadow-sm mb-3.5 transition-all hover:scale-105">
            {isMasterLogin ? (
              <Sparkles className="w-8 h-8 text-brand-gold" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-brand-gold" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            {isMasterLogin ? "Central Master Admin" : "Primary Teachers Training Institutes"}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {isMasterLogin ? "Central Admin Control Portal (Tier 0)" : "Hostel Management App"}
          </p>
        </div>

        {/* Authentication Card */}
        <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-7 sm:p-8 shadow-sm">
          
          <div className="mb-5 pb-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Contact your Superintendent or Hostel Super for your user account and password.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <LanguageSwitcher />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Role / Tier Selector Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Select Role / Tier
                </label>
                {isMasterLogin && (
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-teal-600" /> Master Admin Mode
                  </span>
                )}
              </div>
              <select
                value={
                  isMasterLogin ? 'master' :
                  identifier === 'admin' ? 'admin' :
                  identifier === 'hostel_super' ? 'hostel_super' :
                  identifier === 'monitor_101' || identifier === '101' ? 'monitor_101' :
                  identifier === 'manager_102' || identifier === '102' ? 'manager_102' :
                  identifier === '103' || identifier === 'boarder_103' ? '103' :
                  identifier === '201' || identifier === 'student_201' ? '201' : 'custom'
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'master') quickFill('master', '123456');
                  else if (val === 'admin') quickFill('admin', '123456');
                  else if (val === 'hostel_super') quickFill('hostel_super', '123456');
                  else if (val === 'monitor_101') quickFill('monitor_101', '123456');
                  else if (val === 'manager_102') quickFill('manager_102', '123456');
                  else if (val === '103') quickFill('103', '123456');
                  else if (val === '201') quickFill('201', '123456');
                }}
                className="w-full px-3 py-2.5 min-h-[44px] text-xs bg-slate-50 border border-slate-200/80 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-teal-600 focus:bg-white transition-all cursor-pointer"
              >
                <option value="master">Master Admin Login</option>
                <option value="admin">1. Superintendent (Tier 1)</option>
                <option value="hostel_super">2. Hostel Super (Tier 2)</option>
                <option value="monitor_101">3. Hostel Monitor (Tier 3)</option>
                <option value="manager_102">4. Meal Manager (Tier 4)</option>
                <option value="103">5. Boarder Student (Tier 5)</option>
                <option value="201">6. Non-Boarder Trainee (Tier 6)</option>
                <option value="custom" disabled hidden>Custom Identifier...</option>
              </select>
            </div>

            {/* User ID */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  USER ID
                </label>
                {detectedRole && (
                  <span className="text-[11px] font-medium text-teal-600 flex items-center gap-1">
                    <detectedRole.icon className="w-3.5 h-3.5" />
                    {detectedRole.label}
                  </span>
                )}
              </div>
              
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t('login.loginIdPlaceholder')}
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 min-h-[44px] text-sm bg-white border border-slate-200/80 rounded-xl text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  {t('login.password')}
                </label>
                <span className="text-[11px] text-slate-400">
                  Default: <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">123456</code>
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 min-h-[44px] text-sm bg-white border border-slate-200/80 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 transition-all"
                />
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              className="w-full mt-2 text-sm font-semibold min-h-[44px]"
              icon={ArrowRight}
            >
              {submitting ? t('login.signingIn') : t('login.signIn')}
            </Button>
          </form>

          {/* Quick 6-Tier Test Account Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>{t('login.demoAccountsTitle')}</span>
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">
              
              {/* T0: Master Admin */}
              <button
                type="button"
                onClick={() => quickFill('master', '123456')}
                className={`col-span-2 sm:col-span-3 p-2.5 rounded-xl border text-xs min-h-[44px] transition-all cursor-pointer flex items-center justify-between ${
                  isMasterLogin
                    ? 'bg-slate-900 border-teal-500 text-teal-300 font-semibold shadow-xs'
                    : 'bg-slate-900/95 border-slate-800 text-slate-200 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 text-teal-400 font-bold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  0. Master Admin (Central Admin)
                </div>
                <div className="text-[10px] text-slate-400 font-mono">master • 123456</div>
              </button>

              {/* T1: Superintendent */}
              <button
                type="button"
                onClick={() => quickFill('admin', '123456')}
                className={`p-2.5 rounded-xl border text-xs min-h-[44px] transition-all cursor-pointer ${
                  identifier === 'admin'
                    ? 'bg-teal-50 border-teal-300 text-teal-900 font-semibold shadow-xs'
                    : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-teal-700 font-semibold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  1. Superint.
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">admin</div>
              </button>

              {/* T2: Hostel Super */}
              <button
                type="button"
                onClick={() => quickFill('hostel_super', '123456')}
                className={`p-2.5 rounded-xl border text-xs min-h-[44px] transition-all cursor-pointer ${
                  identifier === 'hostel_super'
                    ? 'bg-teal-50 border-teal-300 text-teal-900 font-semibold shadow-xs'
                    : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-sky-700 font-semibold text-[11px]">
                  <Building2 className="w-3.5 h-3.5" />
                  2. Hostel Super
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">hostel_super</div>
              </button>

              {/* T3: Hostel Monitor */}
              <button
                type="button"
                onClick={() => quickFill('monitor_101', '123456')}
                className={`p-2.5 rounded-xl border text-xs min-h-[44px] transition-all cursor-pointer ${
                  identifier === 'monitor_101'
                    ? 'bg-teal-50 border-teal-300 text-teal-900 font-semibold shadow-xs'
                    : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-amber-700 font-semibold text-[11px]">
                  <Wrench className="w-3.5 h-3.5" />
                  3. Monitor
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Roll: 101</div>
              </button>

              {/* T4: Meal Manager */}
              <button
                type="button"
                onClick={() => quickFill('manager_102', '123456')}
                className={`p-2.5 rounded-xl border text-xs min-h-[44px] transition-all cursor-pointer ${
                  identifier === 'manager_102'
                    ? 'bg-teal-50 border-teal-300 text-teal-900 font-semibold shadow-xs'
                    : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                  <Utensils className="w-3.5 h-3.5" />
                  4. Meal Mgr
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Roll: 102</div>
              </button>

              {/* T5: Boarder Student */}
              <button
                type="button"
                onClick={() => quickFill('103', '123456')}
                className={`p-2.5 rounded-xl border text-xs min-h-[44px] transition-all cursor-pointer ${
                  identifier === '103'
                    ? 'bg-teal-50 border-teal-300 text-teal-900 font-semibold shadow-xs'
                    : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-teal-700 font-semibold text-[11px]">
                  <GraduationCap className="w-3.5 h-3.5" />
                  5. Boarder
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Roll: 103</div>
              </button>

              {/* T6: Non-Boarder */}
              <button
                type="button"
                onClick={() => quickFill('201', '123456')}
                className={`p-2.5 rounded-xl border text-xs min-h-[44px] transition-all cursor-pointer ${
                  identifier === '201'
                    ? 'bg-teal-50 border-teal-300 text-teal-900 font-semibold shadow-xs'
                    : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                  <Users className="w-3.5 h-3.5" />
                  6. Non-Boarder
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-mono">Roll: 201</div>
              </button>

            </div>
          </div>

          {/* Master Admin Login Subtle Text Link */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                if (isMasterLogin) {
                  quickFill('admin', '123456');
                } else {
                  quickFill('master', '123456');
                }
              }}
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-700 transition-colors py-1.5 px-3 rounded-xl hover:bg-teal-50/70 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600 group-hover:scale-110 transition-transform" />
              <span>
                {isMasterLogin 
                  ? '← Switch to Institutional / Student Login' 
                  : 'Master Admin Login'}
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400">
          <span>PTI Hostel Management App: <a href="https://www.facebook.com/xpertsuddin" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">@Sharif Uddin</a></span>
        </p>
      </div>
    </div>
  );
}
