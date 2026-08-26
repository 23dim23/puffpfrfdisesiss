import React, { useState } from 'react';
import { Product, ProductColor } from '../types';
import { useStore } from '../services/store';
import { X, ShoppingBag, Check, Flame, Sparkles, ShieldAlert } from 'lucide-react';
import { hapticImpact } from '../services/telegram';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddedToCart?: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose, onAddedToCart }) => {
  const { brands, models, productColors, addToCart } = useStore();
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);

  if (!product) return null;

  const brand = brands.find((b) => b.slug === product.brand_slug);
  const model = models.find((m) => m.slug === product.model_slug);
  const availableColors = productColors.filter((c) => c.product_id === product.id && c.stock_quantity > 0);

  const discountPercent = product.discount_price
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;

  const savingsAmount = product.discount_price ? (product.price - product.discount_price).toFixed(2) : '0';
  const effectivePrice = product.discount_price || product.price;
  const totalPrice = (effectivePrice * quantity).toFixed(2);

  const handleAddToCart = () => {
    if (!product.in_stock || product.stock_quantity <= 0) return;
    hapticImpact('heavy');
    const selColor = availableColors.find((c) => c.id === selectedColorId);
    addToCart(product, quantity, selectedColorId, selColor?.color_name);
    if (onAddedToCart) onAddedToCart();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose} />

      {/* Content Card */}
      <div className="relative w-full max-w-[390px] max-h-[88vh] overflow-y-auto bg-[#13121d] border border-purple-500/20 rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(168,85,247,0.15)] no-scrollbar z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all tap-active-sm z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Product Image / Emoji Banner */}
        <div className="relative w-full h-44 rounded-2xl bg-gradient-to-b from-purple-950/40 via-purple-900/10 to-zinc-900/40 border border-white/5 flex items-center justify-center overflow-hidden mb-4">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-3" />
          ) : (
            <span className="text-7xl filter drop-shadow-[0_10px_25px_rgba(168,85,247,0.3)] animate-pulse">
              {product.emoji || '📦'}
            </span>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {discountPercent > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md shadow-red-500/20">
                -{discountPercent}% СКИДКА
              </span>
            )}
            {product.is_hit && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" /> ХИТ ПРОДАЖ
              </span>
            )}
            {product.is_new && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" /> НОВИНКА
              </span>
            )}
          </div>
        </div>

        {/* Title and brand */}
        <div className="mb-3">
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
            {brand?.name || 'Puff Paradise'} {model ? `· ${model.name}` : ''}
          </div>
          <h2 className="text-lg font-bold text-white leading-snug">{product.name}</h2>
        </div>

        {/* Price & Savings */}
        <div className="flex items-baseline justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-orange-400">
                {effectivePrice.toFixed(2)} BYN
              </span>
              {product.discount_price && (
                <span className="text-sm font-semibold text-zinc-400 line-through">
                  {product.price.toFixed(2)} BYN
                </span>
              )}
            </div>
            {product.discount_price && (
              <p className="text-[11px] font-medium text-emerald-400 mt-0.5">
                🔥 Вы экономите: <span className="font-bold">{savingsAmount} BYN</span>
              </p>
            )}
          </div>

          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                product.in_stock && product.stock_quantity > 0
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-red-500/15 text-red-300 border border-red-500/30'
              }`}
            >
              {product.in_stock && product.stock_quantity > 0
                ? `В наличии: ${product.stock_quantity} шт.`
                : 'Нет в наличии'}
            </span>
          </div>
        </div>

        {/* Color Picker (for PODs / Devices if available) */}
        {availableColors.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-zinc-300 mb-2">Выберите цвет:</label>
            <div className="grid grid-cols-2 gap-2">
              {availableColors.map((color) => {
                const isSelected = selectedColorId === color.id;
                return (
                  <button
                    key={color.id}
                    onClick={() => {
                      setSelectedColorId(color.id);
                      hapticImpact('light');
                    }}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border text-left transition-all ${
                      isSelected
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                        : 'bg-white/[0.03] border-white/5 text-zinc-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: color.color_hex || '#a855f7' }}
                    />
                    <span className="truncate">{color.color_name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-auto text-purple-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Description / Flavor details */}
        {product.description && (
          <div className="mb-4 text-xs text-zinc-300 leading-relaxed bg-white/[0.02] p-3 rounded-2xl border border-white/5">
            <span className="font-semibold text-zinc-200 block mb-1">Информация о товаре:</span>
            {product.description}
          </div>
        )}

        {/* Quantity Controls */}
        <div className="flex items-center justify-between py-2 px-1 mb-4">
          <span className="text-xs font-semibold text-zinc-300">Количество:</span>
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-1">
            <button
              onClick={() => {
                if (quantity > 1) {
                  setQuantity((q) => q - 1);
                  hapticImpact('light');
                }
              }}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-sm font-bold text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none tap-active-sm"
            >
              −
            </button>
            <span className="text-sm font-bold text-white min-w-[20px] text-center">{quantity}</span>
            <button
              onClick={() => {
                if (quantity < product.stock_quantity) {
                  setQuantity((q) => q + 1);
                  hapticImpact('light');
                }
              }}
              disabled={quantity >= product.stock_quantity}
              className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-sm font-bold text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none tap-active-sm"
            >
              +
            </button>
          </div>
        </div>

        {/* Add to cart Glowing Button */}
        <button
          onClick={handleAddToCart}
          disabled={!product.in_stock || product.stock_quantity <= 0}
          className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-orange-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all flex items-center justify-center gap-2 tap-active disabled:opacity-40 disabled:cursor-not-allowed pulse-glow"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>
            {product.in_stock && product.stock_quantity > 0
              ? `В корзину · ${totalPrice} BYN`
              : 'Товар закончился'}
          </span>
        </button>

        <p className="text-[10px] text-zinc-400 text-center mt-2.5">
          🔒 Быстрый заказ и выдача в Минске / доставка по Беларуси
        </p>
      </div>
    </div>
  );
};
