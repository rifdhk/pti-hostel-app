import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Bell, 
  MessageSquare, 
  User 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function BottomNav() {
  const { t } = useTranslation();
  const { isBoarder, isMealManager } = useAuth();

  const dashboardPath = isBoarder ? '/boarder' : isMealManager ? '/meal-manager' : '/';

  const navItems = [
    {
      name: t('nav.dashboard') || 'Dashboard',
      path: dashboardPath,
      icon: LayoutDashboard,
      end: true,
    },
    {
      name: t('nav.noticeBoard') || 'Notices',
      path: '/notices',
      icon: Bell,
      end: false,
    },
    {
      name: t('nav.communicationHub') || 'Chat',
      path: '/chat',
      icon: MessageSquare,
      end: false,
    },
    {
      name: t('nav.profile') || 'Profile',
      path: '/profile',
      icon: User,
      end: false,
    },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_16px_rgba(15,23,42,0.04)] px-3 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-h-[48px] min-w-[56px] px-2.5 py-1 rounded-2xl transition-all duration-150 group select-none ${
                  isActive
                    ? 'text-teal-600 font-bold'
                    : 'text-slate-400 hover:text-slate-600 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-full transition-all duration-150 ${
                    isActive ? 'bg-teal-50 text-teal-600 scale-105' : 'group-hover:bg-slate-50'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] mt-0.5 tracking-tight ${
                    isActive ? 'text-teal-600 font-bold' : 'text-slate-500 font-medium'
                  }`}>
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
