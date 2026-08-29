import React from 'react';
import { useStore } from '../services/store';
import { Product, Promotion } from '../types';
import { Sparkles, Tag, MessageCircle, ArrowRight, Flame, Percent, ChevronRight } from 'lucide-react';
import { openTelegramOrWeb, hapticImpact } from '../services/telegram';
import { ProductImage } from './ProductImage';
import { useHorizontalScroll } from '../hooks/useHorizontalScroll';

interface HomeTabProps {
  onNavigateToCatalog: (categorySlug?: string) => void;
  onNavigateToPrizes: () => void;
  onSelectProduct: (product: Product) => void;
  onSelectPromotion: (promo: Promotion) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  onNavigateToCatalog,
  onNavigateToPrizes,
  onSelectProduct,
  onSelectPromotion,
}) => {
  const { settings, categories, catalogProducts, promotions, brands } = useStore();

  const promoScrollRef = useHorizontalScroll();
  const categoryScrollRef = useHorizontalScroll();
  const discountScrollRef = useHorizontalScroll();
  const popularScrollRef = useHorizontalScroll();

  // Discount products (only in-stock items)
  const discountProducts = catalogProducts.filter(
    (p) => p.in_stock && (p.stock_quantity === undefined || p.stock_quantity > 0) && p.discount_price && p.discount_price > 0
  );

  // Popular products (sorted by is_hit first to help sell specified items, then sold_count, only in-stock items)
  const popularProducts = [...catalogProducts]
    .filter((p) => p.in_stock && (p.stock_quantity === undefined || p.stock_quantity > 0))
    .sort((a, b) => {
      const aHit = a.is_hit ? 1 : 0;
      const bHit = b.is_hit ? 1 : 0;
      if (bHit !== aHit) return bHit - aHit;
      return (b.sold_count || 0) - (a.sold_count || 0);
    });

  const handleManagerClick = () => {
    hapticImpact('medium');
    openTelegramOrWeb(`https://t.me/${settings.manager_username}`);
  };

  const getCategoryClass = (slug: string) => {
    switch (slug) {
      case 'liquid':
        return 'liquid-card-liquid';
      case 'accessories':
        return 'liquid-card-accessories';
      case 'pod':
        return 'liquid-card-pod';
      case 'disposable':
        return 'liquid-card-disposable';
      case 'snus':
        return 'liquid-card-snus';
      case 'nicboosters':
        return 'liquid-card-liquid'; // Use the beautiful liquid gradient or standard glass panel
      default:
        return 'glass-panel border-purple-500/20';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-purple-950/70 via-[#161224] to-[#1a1020] border border-purple-500/30 shadow-[0_10px_35px_rgba(0,0,0,0.5),0_0_20px_rgba(168,85,247,0.15)]">
        {/* Ambient background blob */}
        <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-gradient-to-br from-purple-600/30 to-orange-500/20 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3.5 mb-3">
            <img
              src={settings.logo_url || '/logo.png'}
              alt="Puff Paradise Logo"
              className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.4)] shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-[10px] font-bold text-purple-300 mb-1 shadow-sm">
                <Sparkles className="w-3 h-3 text-orange-400" />
                <span>Премиум сервис & быстрая доставка</span>
              </div>
              <h2 className="text-lg font-black text-white tracking-tight leading-tight">
                {settings.welcome_title || 'Добро пожаловать в Puff Paradise Shop'}
              </h2>
            </div>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed mb-4">
            {settings.welcome_description ||
              'Официальный каталог Puff Paradise в Могилеве: оригинальные жидкости, POD-системы Vaporesso, испарители, картриджи, одноразки и снюс.'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {/* Glowing Catalog Button */}
            <button
              onClick={() => {
                hapticImpact('medium');
                onNavigateToCatalog('all');
              }}
              className="w-full py-3 px-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-orange-500 shadow-[0_0_20px_rgba(168,85,247,0.45)] hover:shadow-[0_0_30px_rgba(249,115,22,0.55)] transition-all flex items-center justify-center gap-2 tap-active glow-catalog-btn"
            >
              <span>📋 Перейти в Каталог</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  hapticImpact('light');
                  onNavigateToCatalog('on-sale');
                }}
                className="py-2.5 px-3 rounded-xl text-xs font-bold text-orange-300 bg-orange-500/15 border border-orange-500/30 hover:bg-orange-500/25 transition-all flex items-center justify-center gap-1.5 tap-active"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>🔥 Скидки</span>
              </button>

              <button
                onClick={handleManagerClick}
                className="py-2.5 px-3 rounded-xl text-xs font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 hover:bg-purple-500/25 transition-all flex items-center justify-center gap-1.5 tap-active"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Менеджер @{settings.manager_username}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Акции */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-base">🎁</span>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Акции и бонусы</h3>
          </div>
          <button
            onClick={() => {
              hapticImpact('light');
              onNavigateToPrizes();
            }}
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
          >
            <span>Все акции</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div ref={promoScrollRef} className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-4 px-4 snap-x">
          {promotions.length > 0 ? (
            promotions.map((promo) => (
              <div
                key={promo.id}
                onClick={() => {
                  hapticImpact('light');
                  onSelectPromotion(promo);
                }}
                className="min-w-[260px] max-w-[280px] p-4 rounded-2xl bg-gradient-to-br from-purple-900/30 via-white/[0.03] to-orange-950/20 border border-purple-500/20 backdrop-blur-md shadow-lg shadow-black/40 shrink-0 snap-start cursor-pointer hover:border-purple-500/40 transition-all tap-active"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl filter drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                    {promo.image_emoji || '🎉'}
                  </span>
                  {promo.condition_text && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {promo.condition_text}
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-white line-clamp-1 mb-1">{promo.title}</h4>
                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                  {promo.short_description || promo.description}
                </p>
              </div>
            ))
          ) : (
            <div className="min-w-[280px] p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
              <span className="text-2xl mb-1 block">🎁</span>
              <p className="text-xs text-zinc-400">Скоро новые акции!</p>
            </div>
          )}
        </div>
      </section>

      {/* Section: Категории (Liquid Glass Effect Cards) */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-base">📂</span>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Категории каталога</h3>
          </div>
          <span className="text-[11px] text-zinc-400 font-medium">Свайп вправо →</span>
        </div>

        <div ref={categoryScrollRef} className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 snap-x">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                hapticImpact('light');
                onNavigateToCatalog(cat.slug);
              }}
              className={`min-w-[125px] p-3.5 rounded-2xl flex flex-col items-center justify-center text-center shrink-0 snap-start transition-all tap-active ${getCategoryClass(
                cat.slug
              )}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-black/20 backdrop-blur-md flex items-center justify-center text-2xl mb-2 shadow-inner">
                {cat.icon || '📦'}
              </div>
              <span className="text-xs font-bold text-white tracking-tight">{cat.name}</span>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Перейти →</span>
            </button>
          ))}
        </div>
      </section>

      {/* Section: Сейчас со скидкой */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-base">🔥</span>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Сейчас со скидкой</h3>
          </div>
          <button
            onClick={() => {
              hapticImpact('light');
              onNavigateToCatalog('on-sale');
            }}
            className="text-xs font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-0.5"
          >
            <span>Все скидки</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div ref={discountScrollRef} className="flex gap-3 overflow-x-auto no-scrollbar pb-3 pt-1 -mx-4 px-4 snap-x">
          {discountProducts.length > 0 ? (
            discountProducts.map((product) => {
              const brand = brands.find((b) => b.slug === product.brand_slug || b.name.toLowerCase() === product.brand_slug?.toLowerCase());
              const discountPercent = product.discount_price
                ? Math.round(((product.price - product.discount_price) / product.price) * 100)
                : 0;

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    hapticImpact('light');
                    onSelectProduct(product);
                  }}
                  className="min-w-[160px] max-w-[160px] p-3 rounded-2xl bg-white/[0.04] border border-purple-500/20 backdrop-blur-md shadow-lg shadow-black/40 shrink-0 snap-start cursor-pointer hover:border-purple-500/40 transition-all flex flex-col justify-between tap-active"
                >
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2.5 border border-white/5">
                    <ProductImage
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full"
                      imageClassName="w-full h-full object-contain p-2"
                    />
                    {discountPercent > 0 && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-red-500 text-white shadow-sm z-10">
                        -{discountPercent}%
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold text-purple-400 uppercase truncate mb-0.5">
                      {brand?.name || product.brand_slug || ''}
                    </div>
                    <h4 className="text-xs font-bold text-white truncate mb-1.5">{product.name}</h4>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-extrabold text-orange-400">
                        {product.discount_price?.toFixed(2)} BYN
                      </span>
                      <span className="text-[11px] font-medium text-zinc-400 line-through">
                        {product.price.toFixed(2)} BYN
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="min-w-[280px] p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
              <span className="text-2xl mb-1 block">🏷️</span>
              <p className="text-xs text-zinc-400">Скидочные позиции обновляются</p>
            </div>
          )}
        </div>
      </section>

      {/* Section: Популярное */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-base">⭐</span>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Популярное</h3>
          </div>
          <button
            onClick={() => {
              hapticImpact('light');
              onNavigateToCatalog('all');
            }}
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
          >
            <span>Весь каталог</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div ref={popularScrollRef} className="flex gap-3 overflow-x-auto no-scrollbar pb-3 pt-1 -mx-4 px-4 snap-x">
          {popularProducts.slice(0, 10).map((product) => {
            const brand = brands.find((b) => b.slug === product.brand_slug || b.name.toLowerCase() === product.brand_slug?.toLowerCase());

            return (
              <div
                key={product.id}
                onClick={() => {
                  hapticImpact('light');
                  onSelectProduct(product);
                }}
                className="min-w-[155px] max-w-[155px] p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md shadow-lg shadow-black/40 shrink-0 snap-start cursor-pointer hover:border-purple-500/30 transition-all flex flex-col justify-between tap-active"
              >
                <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2.5 border border-white/5">
                  <ProductImage
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full"
                    imageClassName="w-full h-full object-contain p-2"
                  />
                  {product.is_hit && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/30 text-amber-300 border border-amber-500/40 z-10">
                      Хит
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-zinc-400 uppercase truncate mb-0.5">
                    {brand?.name || product.brand_slug || ''}
                  </div>
                  <h4 className="text-xs font-bold text-white truncate mb-1.5">{product.name}</h4>

                  <div className="text-sm font-extrabold text-purple-300">
                    {(product.discount_price || product.price).toFixed(2)} BYN
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
