import React from 'react';
import { useStore } from '../services/store';
import { Sparkles, Shield, User } from 'lucide-react';
import { openTelegramOrWeb, hapticImpact } from '../services/telegram';

interface HeaderProps {
  subtitle?: string;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ subtitle, onOpenAdmin }) => {
  const { currentUser, settings, isAdmin, isModerator, toggleTestAdmin } = useStore();

  return (
    <header className="mb-4 pt-1">
      {/* Dev / Admin Indicator & Switcher bar in top right */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          {settings.logo_url ? (
            <img
              src={settings.logo_url}
              alt="Puff Paradise"
              className="w-9 h-9 rounded-full object-cover border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 via-purple-500 to-orange-500 flex items-center justify-center text-lg shadow-[0_0_14px_rgba(168,85,247,0.4)]">
              💨
            </div>
          )}

          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-fuchsia-300 to-orange-400 bg-clip-text text-transparent leading-none">
              Puff Paradise Shop
            </h1>
            <p className="text-[11px] text-zinc-400 font-medium tracking-wide uppercase mt-0.5 flex items-center gap-1">
              <span>🇧🇾 Вейп Шоп Беларусь</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Admin toggle for testing in browser / dev */}
          <button
            onClick={() => {
              toggleTestAdmin();
              hapticImpact('medium');
            }}
            title={isAdmin ? 'Режим: Админ (нажмите для переключения)' : 'Режим: Клиент (нажмите для переключения)'}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
              isAdmin
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800'
            }`}
          >
            <Shield className="w-3 h-3" />
            <span>{isAdmin ? 'Админ' : isModerator ? 'Модер' : 'Клиент'}</span>
          </button>
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
