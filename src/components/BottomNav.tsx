import React from 'react';
import { useStore } from '../services/store';
import { Home, ListOrdered, ShoppingBag, Gift, PackageCheck, Settings } from 'lucide-react';
import { hapticSelection } from '../services/telegram';

export type TabType = 'home' | 'catalog' | 'cart' | 'prizes' | 'orders' | 'admin';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const { cart, isAdmin, isModerator } = useStore();

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSelect = (tab: TabType) => {
    hapticSelection();
    onTabChange(tab);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c14]/90 backdrop-blur-2xl border-t border-white/[0.08] shadow-[0_-10px_35px_rgba(0,0,0,0.6)] px-2 py-1.5 max-w-[440px] mx-auto">
      <div className="flex items-center justify-around">
        {/* Главная */}
        <button
          onClick={() => handleSelect('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all tap-active-sm ${
            activeTab === 'home'
              ? 'text-purple-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg transition-transform ${activeTab === 'home' ? 'scale-110 bg-purple-500/15' : ''}`}>
            <Home className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Главная</span>
        </button>

        {/* Каталог */}
        <button
          onClick={() => handleSelect('catalog')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all tap-active-sm ${
            activeTab === 'catalog'
              ? 'text-purple-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg transition-transform ${activeTab === 'catalog' ? 'scale-110 bg-purple-500/15' : ''}`}>
            <ListOrdered className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Каталог</span>
        </button>

        {/* Корзина */}
        <button
          onClick={() => handleSelect('cart')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all relative tap-active-sm ${
            activeTab === 'cart'
              ? 'text-purple-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg transition-transform relative ${activeTab === 'cart' ? 'scale-110 bg-purple-500/15' : ''}`}>
            <ShoppingBag className="w-5 h-5" />
            {totalCartItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-500 to-orange-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse">
                {totalCartItems > 99 ? '99+' : totalCartItems}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Корзина</span>
        </button>

        {/* Акции */}
        <button
          onClick={() => handleSelect('prizes')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all tap-active-sm ${
            activeTab === 'prizes'
              ? 'text-purple-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg transition-transform ${activeTab === 'prizes' ? 'scale-110 bg-purple-500/15' : ''}`}>
            <Gift className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Акции</span>
        </button>

        {/* Заказы */}
        <button
          onClick={() => handleSelect('orders')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all tap-active-sm ${
            activeTab === 'orders'
              ? 'text-purple-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg transition-transform ${activeTab === 'orders' ? 'scale-110 bg-purple-500/15' : ''}`}>
            <PackageCheck className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Заказы</span>
        </button>

        {/* Админка (если админ/модератор) */}
        {(isAdmin || isModerator) && (
          <button
            onClick={() => handleSelect('admin')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all tap-active-sm ${
              activeTab === 'admin'
                ? 'text-orange-400 font-semibold'
                : 'text-orange-400/70 hover:text-orange-300 font-medium'
            }`}
          >
            <div className={`p-1 rounded-lg transition-transform ${activeTab === 'admin' ? 'scale-110 bg-orange-500/15' : ''}`}>
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Админка</span>
          </button>
        )}
      </div>
    </nav>
  );
};
