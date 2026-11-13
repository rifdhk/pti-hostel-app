import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Building2, 
  CheckSquare, 
  Utensils, 
  Wrench, 
  Receipt, 
  Users, 
  Bed, 
  DollarSign, 
  LogOut, 
  ShieldCheck, 
  GraduationCap,
  Bell,
  MessageSquare,
  LifeBuoy,
  User,
  Sliders
} from 'lucide-react';
import { useAuth, USER_ROLES } from '../../contexts/AuthContext';
import AvatarRenderer from '../Avatars/AvatarRenderer';
import { normalizeGender } from '../../constants/avatars';
import { sanitizeDisplayName } from '../../utils/displayName';

export default function Sidebar() {
  const { t } = useTranslation();
  const { 
    currentUser,
    userProfile, 
    role, 
    logout, 
    isMasterAdmin,
    isSuperintendent, 
    isHostelSuper, 
    isHostelMonitor, 
    isMealManager, 
    isBoarder, 
    isNonBoarder,
    instituteName,
    appTitle
  } = useAuth();

  const getLinks = () => {
    // Common communication links for all tiers
    const commLinks = [
      { name: t('nav.noticeBoard'), path: '/notices', icon: Bell },
      { name: t('nav.communicationHub'), path: '/chat', icon: MessageSquare },
      { name: t('nav.ticketSupport'), path: '/tickets', icon: LifeBuoy },
      { name: t('nav.profile'), path: '/profile', icon: User },
    ];

    if (isMasterAdmin || role === USER_ROLES.MASTER_ADMIN || role === 'master_admin') {
      return [
        { name: 'Master Admin (T0)', path: '/master-admin', icon: LayoutDashboard },
        ...commLinks
      ];
    }

    if (isSuperintendent) {
      return [
        { name: `${t('nav.dashboard')} (T1)`, path: '/', icon: LayoutDashboard },
        { name: t('nav.hostelManagement'), path: '/hostel', icon: Building2 },
        { name: t('nav.residents'), path: '/residents', icon: Users },
        { name: t('nav.globalSettings'), path: '/settings', icon: Sliders },
        ...commLinks
      ];
    }

    if (isHostelSuper) {
      return [
        { name: `${t('nav.dashboard')} (T2)`, path: '/', icon: LayoutDashboard },
        { name: t('hostels.rooms'), path: '/hostel', icon: Bed },
        { name: t('nav.residents'), path: '/residents', icon: Users },
        ...commLinks
      ];
    }

    if (isHostelMonitor) {
      return [
        { name: `${t('nav.dashboard')} (T3)`, path: '/', icon: LayoutDashboard },
        { name: t('hostels.rooms'), path: '/hostel', icon: Bed },
        ...commLinks
      ];
    }

    if (isMealManager) {
      return [
        { name: `${t('nav.dashboard')} (T4)`, path: '/meal-manager', icon: LayoutDashboard },
        ...commLinks
      ];
    }

    if (isBoarder) {
      return [
        { name: `${t('nav.dashboard')} (T5)`, path: '/boarder', icon: LayoutDashboard },
        { name: t('hostels.rooms'), path: '/hostel', icon: Bed },
        ...commLinks
      ];
    }

    if (isNonBoarder) {
      return [
        { name: `${t('nav.dashboard')} (T6)`, path: '/', icon: LayoutDashboard },
        ...commLinks
      ];
    }

    return [
      { name: t('nav.dashboard'), path: '/', icon: LayoutDashboard },
      ...commLinks
    ];
  };

  const links = getLinks();

  const getTierLabel = () => {
    switch (role) {
      case USER_ROLES.MASTER_ADMIN:
      case 'master_admin':
        return 'Tier 0 • Master Admin (Central Admin)';
      case USER_ROLES.SUPERINTENDENT:
        return `Tier 1 • ${t('roles.superintendent')}`;
      case USER_ROLES.HOSTEL_SUPER:
        return `Tier 2 • ${t('roles.hostel_super')}`;
      case USER_ROLES.HOSTEL_MONITOR:
        return `Tier 3 • ${t('roles.hostel_monitor')}`;
      case USER_ROLES.MEAL_MANAGER:
        return `Tier 4 • ${t('roles.meal_manager')}`;
      case USER_ROLES.BOARDER_STUDENT:
        return `Tier 5 • ${t('roles.boarder_student')}`;
      case USER_ROLES.NON_BOARDER_STUDENT:
        return `Tier 6 • ${t('roles.non_boarder_student')}`;
      default:
        return 'Authorized Staff';
    }
  };

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-slate-100 flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-slate-900 text-xs tracking-tight leading-tight truncate" title={instituteName}>
              {instituteName}
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-wider text-teal-600 truncate">{appTitle}</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Navigation Menu
          </p>
        </div>

        {links.map((link, idx) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={idx}
              to={link.path}
              end={link.path === '/'}
              className={({ isActive }) =>
                `group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`} />
                    <span>{link.name}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-600"></span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* User / Session Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60">
        {(() => {
          const displayName = sanitizeDisplayName(
            userProfile?.name || currentUser?.name,
            'User'
          ).replace(/Director General/g, 'Master Admin');
          return (
        <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <NavLink to="/profile" className="min-w-0 flex-1 mr-2 group flex items-center gap-2.5" title="View & Edit My Profile">
            <AvatarRenderer
              avatarId={(userProfile || currentUser)?.avatar_id}
              gender={(userProfile || currentUser)?.gender}
              className="w-8 h-8 rounded-full border border-slate-200 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-brand-600 transition-colors">
                {displayName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0"></span>
                <p className="text-[11px] text-brand-700 font-medium truncate">
                  {getTierLabel()} • {normalizeGender((userProfile || currentUser)?.gender)}
                </p>
              </div>
            </div>
          </NavLink>
          <button
            onClick={logout}
            title={t('nav.logout')}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
          );
        })()}
      </div>
    </aside>
  );
}
