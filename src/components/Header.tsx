import React from 'react';
import { useStore } from '../services/store';
import { Shield, ShieldCheck, User } from 'lucide-react';
import { hapticImpact } from '../services/telegram';

interface HeaderProps {
  subtitle?: string;
  activeTab?: string;
  onTabChange?: (tab: any) => void;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ subtitle }) => {
  const { currentUser, settings, isAuthorizedAdmin, isAdminMode, toggleAdminMode } = useStore();

  return (
    <header className="mb-3 pt-1">
      {/* Dev / Admin Indicator & Switcher bar in top right */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <img
            src={settings.logo_url || '/logo.png'}
            alt="Puff Paradise"
            className="w-9 h-9 rounded-full object-cover border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // fallback if not found
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />

          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-fuchsia-300 to-orange-400 bg-clip-text text-transparent leading-none">
              Puff Paradise
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Admin toggle: STRICTLY visible/interactive ONLY for verified Admins (IDs 5659638424, 8161417737 or DB admins) */}
          {isAuthorizedAdmin && (
            <button
              onClick={() => {
                toggleAdminMode();
                hapticImpact('medium');
              }}
              title={isAdminMode ? 'Режим: Админ (нажмите для переключения в режим клиента)' : 'Режим: Клиент (нажмите для переключения в режим админа)'}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all tap-active ${
                isAdminMode
                  ? 'bg-gradient-to-r from-purple-600/30 to-orange-500/30 text-orange-300 border border-orange-500/50 shadow-[0_0_12px_rgba(249,115,22,0.3)]'
                  : 'bg-zinc-800/90 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
              }`}
            >
              {isAdminMode ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                  <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">Админ</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Клиент</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Greeting and page subtitle */}
      <div className="flex items-center justify-between px-0.5">
        <p className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
          <span className="text-purple-400">👋</span>
          <span>
            Привет,{' '}
            <span className="font-semibold text-white">
              {currentUser?.first_name || currentUser?.username || 'Гость'}
            </span>
            !
          </span>
        </p>

        {subtitle && (
          <span className="text-xs font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
            {subtitle}
          </span>
        )}
      </div>
    </header>
  );
};
