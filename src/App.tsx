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
    <div className="min-h-screen bg-[#0d0c14] text-zinc-100 flex justify-center selection:bg-purple-500 selection:text-white">
      {/* Maximum mobile-width frame */}
      <div className="w-full max-w-[480px] min-h-screen flex flex-col relative px-4 pt-3 pb-24 shadow-2xl">
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
