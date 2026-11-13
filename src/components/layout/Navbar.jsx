import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Bell, 
  Search, 
  Building2, 
  User, 
  KeyRound, 
  LogOut, 
  ChevronDown 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../services/db';
import Badge from '../common/Badge';
import ChangePasswordModal from '../common/ChangePasswordModal';
import LanguageSwitcher from '../common/LanguageSwitcher';
import AvatarRenderer from '../Avatars/AvatarRenderer';
import { normalizeGender } from '../../constants/avatars';
import { sanitizeDisplayName } from '../../utils/displayName';

export default function Navbar() {
  const { t } = useTranslation();
  const { 
    currentUser,
    userProfile, 
    isMasterAdmin,
    isSuperintendent, 
    effectiveHostelId, 
    effectivePtiId,
    setSuperintendentHostel, 
    logout,
    instituteName
  } = useAuth();
  
  const [hostels, setHostels] = useState([]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadHostels = () => {
      const parsed = dbService.getHostels();
      const filtered = effectivePtiId ? parsed.filter(h => h.pti_id === effectivePtiId) : parsed;
      setHostels(filtered);
      if (isSuperintendent && filtered.length > 0 && !filtered.some(h => h.id === effectiveHostelId)) {
        setSuperintendentHostel(filtered[0].id);
      }
    };

    loadHostels();
    window.addEventListener('pti_hostels_changed', loadHostels);
    return () => window.removeEventListener('pti_hostels_changed', loadHostels);
  }, [effectivePtiId, isSuperintendent, effectiveHostelId]);

  const currentHostelName = hostels.find(h => h.id === effectiveHostelId)?.name || hostels[0]?.name || 'No Hall Assigned';

  return (
    <header className="h-16 bg-white border-b border-slate-100 sticky top-0 z-20 w-full shrink-0">
      {/* Standardized max-width container perfectly matching main content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-3 sm:gap-4">
        
        {/* Left Side: Brand, Flexible Search Bar & Hostel Selector */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          {/* Dynamic Institute Name Header Display (Desktop) */}
          <div 
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-50 to-slate-50 border border-teal-200/80 rounded-xl text-teal-950 text-xs font-bold shadow-2xs shrink-0"
            title={instituteName}
          >
            <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="truncate max-w-[190px] xl:max-w-[240px] font-semibold">{instituteName}</span>
          </div>

          {/* Dynamic Mobile Brand Icon */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs text-slate-800 truncate max-w-[110px] sm:max-w-[160px]" title={instituteName}>
              {instituteName}
            </span>
          </div>

          {/* Flexible Responsive Search Bar (shrinks gracefully without pushing buttons off-screen) */}
          <div className="hidden sm:block relative flex-1 max-w-md min-w-[150px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('common.search') + '...'}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition-all"
            />
          </div>

          {/* Master Admin / Superintendent Hostel Switcher vs Isolated Hall Badge */}
          {isMasterAdmin ? (
            <div className="hidden md:flex items-center gap-1.5 text-xs bg-slate-900 border border-slate-800 text-teal-300 px-3 py-1 rounded-xl shrink-0 font-medium shadow-xs">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              <span className="text-[11px] font-bold">Central Master Admin</span>
            </div>
          ) : isSuperintendent ? (
            <div className="hidden md:flex items-center gap-1.5 text-xs bg-teal-50 border border-teal-200/80 text-teal-900 px-2.5 py-1 rounded-xl shrink-0">
              <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="font-semibold text-[11px] shrink-0">Managing Hall:</span>
              <select
                value={effectiveHostelId}
                onChange={(e) => setSuperintendentHostel(e.target.value)}
                className="bg-transparent text-teal-900 font-bold text-xs focus:outline-none cursor-pointer"
              >
                {hostels.map(h => (
                  <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-200/80 text-slate-700 px-2.5 py-1 rounded-xl shrink-0">
              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="font-semibold text-[11px] truncate max-w-[170px]">{currentHostelName}</span>
            </div>
          )}
        </div>

        {/* Right Side Controls: Language Switcher, Notifications & Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          
          {/* Global Bilingual Language Switcher */}
          <LanguageSwitcher />

          {/* Notifications Icon linking to Notice Board */}
          <Link
            to="/notices"
            title="Hostel Notices"
            className="relative min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-teal-700 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-teal-600 ring-2 ring-white"></span>
          </Link>

          {/* User Profile Dropdown Menu */}
          {(() => {
            const activeUser = currentUser || userProfile;
            const displayName = sanitizeDisplayName(activeUser?.name, 'User').replace(/Director General/g, 'Master Admin');
            return (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              title="Account Options & Profile"
              className="flex items-center gap-2 pl-1.5 pr-3 py-1 min-h-[44px] text-slate-700 hover:text-teal-700 hover:bg-slate-50 rounded-xl transition-all border border-slate-200/80 bg-white cursor-pointer shadow-2xs"
            >
              <AvatarRenderer
                avatarId={activeUser?.avatar_id}
                gender={activeUser?.gender}
                className="w-9 h-9 rounded-full border border-slate-200"
              />
              <span className="text-xs font-semibold hidden md:inline max-w-[110px] truncate">
                {activeUser?.name ? displayName.split(' ')[0] : t('nav.profile')}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${profileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Popup */}
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-dropdown border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                
                {/* User Header Info */}
                <div className="px-3.5 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {activeUser?.rollNumber ? `Roll: ${activeUser.rollNumber}` : `ID: ${activeUser?.loginId}`}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="teal" size="sm">
                      {activeUser?.role?.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge variant={normalizeGender(activeUser?.gender) === 'Female' ? 'warning' : 'info'} size="sm">
                      {normalizeGender(activeUser?.gender)}
                    </Badge>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1 text-xs">
                  <Link
                    to="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-teal-700 font-medium transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>{t('profile.title')}</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setPasswordModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-teal-700 font-medium transition-colors cursor-pointer text-left"
                  >
                    <KeyRound className="w-4 h-4 text-teal-600" />
                    <span className="font-semibold text-teal-800">{t('nav.changePassword')}</span>
                  </button>
                </div>

                {/* Sign Out Option */}
                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>{t('nav.logout')}</span>
                  </button>
                </div>

              </div>
            )}
          </div>
            );
          })()}

        </div>

      </div>

      {/* Universal Change Password Modal */}
      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />

    </header>
  );
}
