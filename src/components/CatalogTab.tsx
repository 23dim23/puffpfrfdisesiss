import React, { useState, useMemo } from 'react';
import { useStore } from '../services/store';
import { Product } from '../types';
import { Search, Plus, Filter, Flame, Sparkles, Check, X } from 'lucide-react';
import { hapticImpact } from '../services/telegram';

interface CatalogTabProps {
  initialCategory?: string;
  onSelectProduct: (product: Product) => void;
}

export const CatalogTab: React.FC<CatalogTabProps> = ({ initialCategory = 'all', onSelectProduct }) => {
  const { categories, brands, products, attributeValues, addToCart } = useStore();

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedStrength, setSelectedStrength] = useState<string>('all');
  const [selectedLine, setSelectedLine] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentlyAddedId, setRecentlyAddedId] = useState<number | null>(null);

  // Main category tabs
  const categoryTabs = useMemo(() => {
    return [
      { slug: 'all', name: 'Все товары', icon: '✨' },
      { slug: 'on-sale', name: '🔥 На акции', icon: '🏷️' },
      ...categories.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon || '📦' })),
    ];
  }, [categories]);

  // Dynamic brand list for current category
  const availableBrands = useMemo(() => {
    if (selectedCategory === 'all' || selectedCategory === 'on-sale') {
      return brands.filter((b) => b.is_active);
    }
    return brands.filter((b) => b.category_slug === selectedCategory && b.is_active);
  }, [brands, selectedCategory]);

  // Liquid / Snus lines
  const liquidLines = useMemo(() => {
    return attributeValues.filter((v) => v.attribute_group_slug === 'liquid_brand_line' && v.is_active);
  }, [attributeValues]);

  const snusLines = useMemo(() => {
    return attributeValues.filter((v) => v.attribute_group_slug === 'snus_line' && v.is_active);
  }, [attributeValues]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Hide out of stock / sold out items from customer catalog
      if (!product.in_stock || (product.stock_quantity !== undefined && product.stock_quantity <= 0)) {
        return false;
      }

      // Category filter
      if (selectedCategory === 'on-sale') {
        if (!product.discount_price || product.discount_price <= 0) return false;
      } else if (selectedCategory !== 'all') {
        if (product.category_slug !== selectedCategory) return false;
      }

      // Brand filter
      if (selectedBrand !== 'all') {
        if (product.brand_slug !== selectedBrand) return false;
      }

      // Strength filter
      if (selectedStrength !== 'all') {
        const text = `${product.name} ${product.description || ''}`.toLowerCase();
        if (selectedStrength === '0 мг' && !text.includes('0мг') && !text.includes('0 мг')) return false;
        if (
          selectedStrength === '20-50 мг' &&
          !text.includes('20мг') &&
          !text.includes('20-50') &&
          !text.includes('50мг') &&
          !text.includes('salt')
        )
          return false;
        if (
          selectedStrength === '60-70 мг' &&
          !text.includes('60мг') &&
          !text.includes('70мг') &&
          !text.includes('hard')
        )
          return false;
        if (
          selectedStrength === '80+ мг' &&
          !text.includes('80мг') &&
          !text.includes('80+') &&
          !text.includes('ultra') &&
          !text.includes('100мг')
        )
          return false;

        // Snus strengths
        if (selectedStrength === '75 мг' && !text.includes('75мг') && !text.includes('75 мг')) return false;
        if (selectedStrength === '150 мг' && !text.includes('150мг') && !text.includes('150 мг')) return false;
        if (selectedStrength === '200 мг' && !text.includes('200мг') && !text.includes('200 мг')) return false;
      }

      // Line filter
      if (selectedLine !== 'all') {
        const text = `${product.name} ${product.description || ''}`.toLowerCase();
        const lineVal = selectedLine.toLowerCase().split(' ')[0];
        if (!text.includes(lineVal)) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const brandObj = brands.find((b) => b.slug === product.brand_slug);
        const searchTarget = `${product.name} ${brandObj?.name || ''} ${product.description || ''} ${product.category_slug}`.toLowerCase();
        return searchTarget.includes(q);
      }

      return true;
    });
  }, [products, selectedCategory, selectedBrand, selectedStrength, selectedLine, searchQuery, brands]);

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (!product.in_stock || product.stock_quantity <= 0) return;

    hapticImpact('heavy');
    addToCart(product, 1);
    setRecentlyAddedId(product.id);
    setTimeout(() => setRecentlyAddedId(null), 1200);
  };

  const handleCategoryChange = (slug: string) => {
    hapticImpact('light');
    setSelectedCategory(slug);
    setSelectedBrand('all');
    setSelectedStrength('all');
    setSelectedLine('all');
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
          <Search className="w-4 h-4 text-purple-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Умный поиск: вкус, бренд, крепость..."
          className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white/[0.05] border border-purple-500/20 text-white placeholder-zinc-400 text-sm focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.08] transition-all shadow-inner"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Category Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
        {categoryTabs.map((cat) => {
          const isActive = selectedCategory === cat.slug;
          return (
            <button
              key={cat.slug}
              onClick={() => handleCategoryChange(cat.slug)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 tap-active-sm ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 to-orange-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.06] hover:bg-white/[0.08]'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Sub-Filters Container */}
      <div className="space-y-2.5 bg-white/[0.02] border border-white/5 rounded-2xl p-3">
        {/* Brand / Assortment Filter */}
        {availableBrands.length > 0 && (
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 px-1">
              Ассортимент / Бренды
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => {
                  setSelectedBrand('all');
                  hapticImpact('light');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tap-active-sm ${
                  selectedBrand === 'all'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-white/[0.03] text-zinc-400 border border-white/5 hover:bg-white/[0.06]'
                }`}
              >
                Весь ассортимент
              </button>
              {availableBrands.map((b) => {
                const isSelected = selectedBrand === b.slug;
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedBrand(b.slug);
                      hapticImpact('light');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tap-active-sm ${
                      isSelected
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-white/[0.03] text-zinc-400 border border-white/5 hover:bg-white/[0.06]'
                    }`}
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Liquid Specific Sub-Filters: Strength & Lines */}
        {selectedCategory === 'liquid' && (
          <>
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 px-1">
                Крепость жидкости
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {['all', '0 мг', '20-50 мг', '60-70 мг', '80+ мг'].map((str) => (
                  <button
                    key={str}
                    onClick={() => {
                      setSelectedStrength(str);
                      hapticImpact('light');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tap-active-sm ${
                      selectedStrength === str
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-white/[0.03] text-zinc-400 border border-white/5 hover:bg-white/[0.06]'
                    }`}
                  >
                    {str === 'all' ? 'Вся крепость' : str}
                  </button>
                ))}
              </div>
            </div>

            {liquidLines.length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 px-1">Линейки</div>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => {
                      setSelectedLine('all');
                      hapticImpact('light');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tap-active-sm ${
                      selectedLine === 'all'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-white/[0.03] text-zinc-400 border border-white/5 hover:bg-white/[0.06]'
                    }`}
                  >
                    Все линейки
                  </button>
                  {liquidLines.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedLine(v.value);
                        hapticImpact('light');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tap-active-sm ${
                        selectedLine === v.value
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-white/[0.03] text-zinc-400 border border-white/5 hover:bg-white/[0.06]'
                      }`}
                    >
                      {v.value}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Snus Specific Sub-Filters: Strength & Lines */}
        {selectedCategory === 'snus' && (
          <>
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 px-1">
                Крепость снюса
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {['all', '75 мг', '150 мг', '200 мг'].map((str) => (
                  <button
                    key={str}
                    onClick={() => {
                      setSelectedStrength(str);
                      hapticImpact('light');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tap-active-sm ${
                      selectedStrength === str
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-white/[0.03] text-zinc-400 border border-white/5 hover:bg-white/[0.06]'
                    }`}
                  >
                    {str === 'all' ? 'Вся крепость' : str}
                  </button>
                ))}
              </div>
            </div>

            {snusLines.length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 px-1">Линейки</div>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => {
                      setSelectedLine('all');
                      hapticImpact('light');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tap-active-sm ${
                      selectedLine === 'all'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-white/[0.03] text-zinc-400 border border-white/5 hover:bg-white/[0.06]'
                    }`}
                  >
                    Все линейки
                  </button>
                  {snusLines.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedLine(v.value);
                        hapticImpact('light');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tap-active-sm ${
                        selectedLine === v.value
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-white/[0.03] text-zinc-400 border border-white/5 hover:bg-white/[0.06]'
                      }`}
                    >
                      {v.value}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Catalog Items Header & Counter */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Список товаров
        </span>
        <span className="text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
          {filteredProducts.length} поз.
        </span>
      </div>

      {/* Infinite Product List (Strips like in reference Alpakaa) */}
      <div className="space-y-2.5">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const brand = brands.find((b) => b.slug === product.brand_slug);
            const isDiscount = product.discount_price && product.discount_price > 0;
            const effectivePrice = product.discount_price || product.price;
            const isJustAdded = recentlyAddedId === product.id;

            return (
              <div
                key={product.id}
                onClick={() => {
                  hapticImpact('light');
                  onSelectProduct(product);
                }}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-purple-500/30 transition-all cursor-pointer shadow-md shadow-black/30 tap-active"
              >
                {/* Thumbnail */}
                <div className="w-13 h-13 rounded-xl bg-gradient-to-b from-purple-950/30 to-black/40 border border-white/5 flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <span>{product.emoji || '📦'}</span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{product.name}</h4>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                    {brand?.name || 'Puff Paradise'}
                    {product.description ? ` · ${product.description.split('.')[0]}` : ''}
                  </p>

                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-xs font-extrabold text-purple-300">
                      {effectivePrice.toFixed(2)} BYN
                    </span>
                    {isDiscount && (
                      <span className="text-[10px] text-zinc-400 line-through">
                        {product.price.toFixed(2)} BYN
                      </span>
                    )}
                    {!product.in_stock && (
                      <span className="text-[9px] text-red-400 font-semibold ml-1">Нет в наличии</span>
                    )}
                  </div>
                </div>

                {/* Quick Add Button */}
                <button
                  onClick={(e) => handleQuickAdd(e, product)}
                  disabled={!product.in_stock || product.stock_quantity <= 0}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 transition-all tap-active-sm ${
                    isJustAdded
                      ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(34,197,94,0.5)]'
                      : 'bg-gradient-to-tr from-purple-600 to-orange-500 shadow-[0_0_12px_rgba(168,85,247,0.35)] hover:shadow-[0_0_18px_rgba(249,115,22,0.45)]'
                  } disabled:opacity-30 disabled:pointer-events-none`}
                >
                  {isJustAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 font-bold" />}
                </button>
              </div>
            );
          })
        ) : (
          <div className="py-12 px-4 text-center rounded-3xl bg-white/[0.02] border border-white/5">
            <span className="text-4xl block mb-2">🔍</span>
            <h4 className="text-sm font-bold text-white mb-1">Товары не найдены</h4>
            <p className="text-xs text-zinc-400 mb-4">
              Попробуйте сбросить фильтры или изменить поисковый запрос
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedBrand('all');
                setSelectedStrength('all');
                setSelectedLine('all');
                setSearchQuery('');
                hapticImpact('light');
              }}
              className="py-2 px-4 rounded-xl text-xs font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 tap-active"
            >
              Сбросить все фильтры
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
