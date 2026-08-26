import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './services/store';
import { TabType, Product, Promotion } from './types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeTab } from './components/HomeTab';
import { CatalogTab } from './components/CatalogTab';
import { CartTab } from './components/CartTab';
import { PrizesTab } from './components/PrizesTab';
import { OrdersTab } from './components/OrdersTab';
import { AdminPanel } from './components/AdminPanel';
import { ProductDetailModal } from './components/ProductDetailModal';
import { PromotionDetailModal } from './components/PromotionDetailModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { initTelegramApp, hapticImpact } from './services/telegram';

const MainContent: React.FC = () => {
  const { isStaff, isAdmin } = useStore();

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [catalogInitialCategory, setCatalogInitialCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [successOrderInfo, setSuccessOrderInfo] = useState<{ id: number; total: number } | null>(null);

  useEffect(() => {
    initTelegramApp();
  }, []);

  const handleNavigateToCatalog = (categorySlug: string = 'all') => {
    setCatalogInitialCategory(categorySlug);
    setActiveTab('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderCompleted = (orderId: number, total: number) => {
    setSuccessOrderInfo({ id: orderId, total });
  };

  return (
    <div className="min-h-screen bg-[#07060c] text-zinc-100 flex justify-center selection:bg-purple-500 selection:text-white relative overflow-hidden">
      {/* Background Dynamic Violet & Deep Purple Eclipses */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Deep Violet Eclipse Orb 1 */}
        <div className="absolute top-[-80px] left-[-60px] w-[340px] h-[340px] rounded-full bg-gradient-to-br from-purple-600/35 via-violet-800/25 to-transparent blur-[85px] animate-eclipse-1" />
        
        {/* Dark Purple Eclipse Orb 2 */}
        <div className="absolute bottom-[10%] right-[-70px] w-[380px] h-[380px] rounded-full bg-gradient-to-tl from-fuchsia-700/25 via-purple-950/40 to-transparent blur-[100px] animate-eclipse-2" />
        
        {/* Midnight Violet Center Eclipse Orb 3 */}
        <div className="absolute top-[42%] left-[15%] w-[320px] h-[320px] rounded-full bg-gradient-to-tr from-indigo-900/30 via-purple-900/20 to-transparent blur-[90px] animate-eclipse-3" />

        {/* Ambient Dark Overlay Mesh */}
        <div className="absolute inset-0 bg-radial-vignette opacity-80" />
      </div>

      {/* Maximum mobile-width frame */}
      <div className="w-full max-w-[480px] min-h-screen flex flex-col relative px-4 pt-3 pb-24 shadow-2xl z-10">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onOpenAdmin={() => {
            hapticImpact('medium');
            setActiveTab('admin');
          }}
        />

        {/* Dynamic Tab Content */}
        <main className="flex-1 mt-4">
          {activeTab === 'home' && (
            <HomeTab
              onNavigateToCatalog={handleNavigateToCatalog}
              onNavigateToPrizes={() => setActiveTab('prizes')}
              onSelectProduct={(p) => setSelectedProduct(p)}
              onSelectPromotion={(promo) => setSelectedPromotion(promo)}
            />
          )}

          {activeTab === 'catalog' && (
            <CatalogTab
              initialCategory={catalogInitialCategory}
              onSelectProduct={(p) => setSelectedProduct(p)}
            />
          )}

          {activeTab === 'cart' && (
            <CartTab
              onGoToCatalog={() => handleNavigateToCatalog('all')}
              onOrderCompleted={handleOrderCompleted}
            />
          )}

          {activeTab === 'prizes' && (
            <PrizesTab onSelectPromotion={(promo) => setSelectedPromotion(promo)} />
          )}

          {activeTab === 'orders' && (
            <OrdersTab onGoToCatalog={() => handleNavigateToCatalog('all')} />
          )}

          {activeTab === 'admin' && (
            <AdminPanel onBackToHome={() => setActiveTab('home')} />
          )}
        </main>

        {/* Bottom Floating Navigation (hide on admin panel if desired, or keep accessible) */}
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Modals */}
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />

        <PromotionDetailModal
          promotion={selectedPromotion}
          onClose={() => setSelectedPromotion(null)}
          onGoToCatalog={() => handleNavigateToCatalog('all')}
        />

        {successOrderInfo && (
          <OrderSuccessModal
            orderId={successOrderInfo.id}
            total={successOrderInfo.total}
            onClose={() => setSuccessOrderInfo(null)}
            onGoToOrders={() => {
              setSuccessOrderInfo(null);
              setActiveTab('orders');
            }}
          />
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainContent />
    </StoreProvider>
  );
}
