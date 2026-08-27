import React, { useState } from 'react';
import { useStore } from '../services/store';
import { Shield, ShieldCheck, User, KeyRound, LogOut, X } from 'lucide-react';
import { hapticImpact } from '../services/telegram';

interface HeaderProps {
  subtitle?: string;
  activeTab?: string;
  onTabChange?: (tab: any) => void;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ subtitle }) => {
  const {
    currentUser,
    settings,
    isAuthorizedAdmin,
    isAdminMode,
    toggleAdminMode,
    loginAsAdmin,
    logoutUser,
  } = useStore();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInput, setAuthInput] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authInput.trim()) return;

    const ok = loginAsAdmin(authInput.trim());
    if (ok) {
      setIsAuthModalOpen(false);
      setAuthInput('');
      hapticImpact('medium');
    } else {
      setAuthError('Доступ не найден. Укажите ID администратора (5659638424) или ник модератора.');
    }
  };

  return (
    <header className="mb-3 pt-1">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <img
            src={settings.logo_url || '/logo.png'}
            alt="Puff Paradise"
            className="w-9 h-9 rounded-full object-cover border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
            referrerPolicy="no-referrer"
            onError={(e) => {
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
          {/* Admin toggle: visible for verified Admins */}
          {isAuthorizedAdmin ? (
            <button
              onClick={() => {
                toggleAdminMode();
                hapticImpact('medium');
              }}
              title={
                isAdminMode
                  ? 'Режим: Админ (нажмите для переключения в режим клиента)'
                  : 'Режим: Клиент (нажмите для переключения в режим админа)'
              }
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all tap-active ${
                isAdminMode
                  ? 'bg-gradient-to-r from-purple-600/30 to-orange-500/30 text-orange-300 border border-orange-500/50 shadow-[0_0_12px_rgba(249,115,22,0.3)]'
                  : 'bg-zinc-800/90 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
              }`}
            >
              {isAdminMode ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                  <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                    Админ
                  </span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Клиент</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              title="Вход для администраторов и модераторов"
              className="px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 border border-white/10 text-[11px] font-medium flex items-center gap-1 tap-active"
            >
              <KeyRound className="w-3 h-3 text-purple-400" />
              <span>Сотрудник</span>
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
          {isAuthorizedAdmin && (
            <button
              onClick={logoutUser}
              title="Выйти из аккаунта администратора"
              className="text-[10px] text-zinc-500 hover:text-red-400 ml-1"
            >
              (выйти)
            </button>
          )}
        </p>

        {subtitle && (
          <span className="text-xs font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
            {subtitle}
          </span>
        )}
      </div>

      {/* Employee Quick Login Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm p-5 rounded-3xl bg-[#171526] border border-purple-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Авторизация сотрудника</h3>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Введите ваш <b>Telegram ID</b> (напр. <code>5659638424</code>) или <b>@username</b> модератора, чтобы открыть панель управления.
            </p>

            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="text"
                value={authInput}
                onChange={(e) => {
                  setAuthInput(e.target.value);
                  setAuthError('');
                }}
                placeholder="Telegram ID или @username"
                className="w-full py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                autoFocus
              />

              {authError && (
                <p className="text-[11px] text-red-400 leading-tight">{authError}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Fast login with Master Admin ID
                    loginAsAdmin('5659638424');
                    setIsAuthModalOpen(false);
                  }}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-purple-300 border border-purple-500/20"
                >
                  👑 Главный админ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 text-white text-xs font-bold shadow-md"
                >
                  Войти
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
