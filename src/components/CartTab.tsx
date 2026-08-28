import React, { useState } from 'react';
import { useStore } from '../services/store';
import { ShoppingBag, Trash2, Plus, Minus, AlertTriangle, Truck, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { DeliveryType } from '../types';
import { hapticImpact } from '../services/telegram';
import { ProductImage } from './ProductImage';

interface CartTabProps {
  onGoToCatalog: () => void;
  onOrderCompleted: (orderId: number, total: number) => void;
}

export const CartTab: React.FC<CartTabProps> = ({ onGoToCatalog, onOrderCompleted }) => {
  const {
    cart,
    pickupPoints,
    settings,
    appliedPromocode,
    updateCartQuantity,
    removeFromCart,
    applyPromocode,
    removePromocode,
    placeOrder,
  } = useStore();

  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup');
  const [selectedPickupId, setSelectedPickupId] = useState<number | null>(() => {
    return pickupPoints.length > 0 ? pickupPoints[0].id : null;
  });
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [promocodeInput, setPromocodeInput] = useState<string>('');
  const [promocodeMsg, setPromocodeMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const totalItemsCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const subtotal = cart.reduce((sum, item) => {
    const price = item.discount_price && item.discount_price > 0 ? item.discount_price : item.price;
    return sum + (price || 0) * (item.quantity || 1);
  }, 0);

  let deliveryCost = 0;
  if (deliveryType === 'delivery') {
    deliveryCost = totalItemsCount >= (settings.free_delivery_min_items || 4) ? 0 : (settings.delivery_price || 5);
  }

  let discountAmount = 0;
  if (appliedPromocode) {
    if (appliedPromocode.discount_type === 'percent') {
      discountAmount = (subtotal * appliedPromocode.discount_value) / 100;
    } else {
      discountAmount = Math.min(appliedPromocode.discount_value, subtotal);
    }
  }

  const grandTotal = Math.max(0, subtotal - discountAmount + deliveryCost);

  const handleApplyPromo = () => {
    if (!promocodeInput.trim()) return;
    const result = applyPromocode(promocodeInput);
    setPromocodeMsg({ text: result.message, isError: !result.success });
    if (result.success) setPromocodeInput('');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (deliveryType === 'pickup' && !selectedPickupId && pickupPoints.length > 0) {
      alert('Пожалуйста, выберите точку самовывоза в Могилеве');
      return;
    }

    if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
      alert('Пожалуйста, введите адрес доставки в Могилеве');
      return;
    }

    setIsSubmitting(true);
    hapticImpact('heavy');

    try {
      const result = await placeOrder({
        deliveryType,
        pickupPointId: deliveryType === 'pickup' ? (selectedPickupId || pickupPoints[0]?.id || null) : null,
        deliveryAddress: deliveryType === 'delivery' ? deliveryAddress : null,
        comment,
      });

      if (result.success && result.orderId !== undefined && result.total !== undefined) {
        onOrderCompleted(result.orderId, result.total);
      } else {
        alert(result.error || 'Ошибка оформления заказа');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert('Произошла ошибка при создании заказа. Пожалуйста, попробуйте еще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="py-16 px-4 text-center pb-28">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-4xl mb-4 shadow-[0_0_25px_rgba(168,85,247,0.2)]">
          🛒
        </div>
        <h3 className="text-lg font-bold text-white mb-1.5">Корзина пуста</h3>
        <p className="text-xs text-zinc-400 max-w-[280px] mx-auto mb-6 leading-relaxed">
          В каталоге представлен полный ассортимент оригинальных жидкостей, подов Vaporesso, картриджей и снюса в Могилеве.
        </p>
        <button
          onClick={() => {
            hapticImpact('medium');
            onGoToCatalog();
          }}
          className="py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-orange-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] tap-active inline-flex items-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Перейти в каталог</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28">
      {/* Cart items list */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Выбранные товары</span>
          <span className="text-xs font-semibold text-purple-400">{totalItemsCount} шт. в заказе</span>
        </div>

        {cart.map((item, index) => {
          const effectivePrice = item.discount_price && item.discount_price > 0 ? item.discount_price : item.price;
          const lineTotal = ((effectivePrice || 0) * (item.quantity || 1)).toFixed(2);
          const maxStock = item.stock_quantity !== undefined ? item.stock_quantity : 999;
          const isAtMaxStock = item.quantity >= maxStock;

          return (
            <div
              key={`${item.id}-${item.color_id || 'default'}-${index}`}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] shadow-sm"
            >
              {/* Item Thumbnail */}
              <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden">
                <ProductImage
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full"
                  imageClassName="w-full h-full object-contain p-1"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                <p className="text-[11px] text-zinc-400 truncate">
                  {item.selected_color_name ? `Цвет: ${item.selected_color_name}` : `${(effectivePrice || 0).toFixed(2)} BYN / шт.`}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-extrabold text-purple-300">{lineTotal} BYN</span>
                  {item.stock_quantity !== undefined && (
                    <span className="text-[10px] text-zinc-500">
                      (в наличии: {item.stock_quantity} шт.)
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Adjusters */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-0.5">
                <button
                  onClick={() => updateCartQuantity(index, -1)}
                  className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-zinc-300 hover:text-white tap-active-sm"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-bold text-white min-w-[16px] text-center">{item.quantity}</span>
                <button
                  disabled={isAtMaxStock}
                  onClick={() => {
                    if (isAtMaxStock) {
                      alert(`К сожалению, в наличии доступно только ${maxStock} шт.`);
                      return;
                    }
                    updateCartQuantity(index, 1);
                  }}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all tap-active-sm ${
                    isAtMaxStock
                      ? 'bg-white/5 text-zinc-600 cursor-not-allowed opacity-40'
                      : 'bg-white/5 text-zinc-300 hover:text-white'
                  }`}
                  title={isAtMaxStock ? 'Достигнут лимит наличия товара' : 'Увеличить количество'}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => removeFromCart(index)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors tap-active-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Checkout Method Selection */}
      <div className="bg-white/[0.03] border border-purple-500/20 rounded-3xl p-4 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <span>Способ получения заказа</span>
        </h3>

        {/* Method Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
          <button
            onClick={() => {
              setDeliveryType('pickup');
              hapticImpact('light');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all tap-active-sm ${
              deliveryType === 'pickup'
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Самовывоз (Могилев)</span>
          </button>

          <button
            onClick={() => {
              setDeliveryType('delivery');
              hapticImpact('light');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all tap-active-sm ${
              deliveryType === 'delivery'
                ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Доставка курьером</span>
          </button>
        </div>

        {/* Pickup Details */}
        {deliveryType === 'pickup' && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-300">Выберите точку самовывоза в Могилеве:</label>
            <select
              value={selectedPickupId || (pickupPoints[0]?.id ?? '')}
              onChange={(e) => setSelectedPickupId(Number(e.target.value))}
              className="w-full py-2.5 px-3 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
            >
              {pickupPoints.map((point) => (
                <option key={point.id} value={point.id} className="bg-[#181628] text-white">
                  📍 {point.name} — {point.address}
                </option>
              ))}
            </select>

            {(selectedPickupId || pickupPoints[0]) && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-zinc-300">
                {(() => {
                  const p = pickupPoints.find((item) => item.id === (selectedPickupId || pickupPoints[0]?.id));
                  if (!p) return null;
                  return (
                    <>
                      <div className="font-semibold text-purple-300 mb-0.5">Адрес: {p.address}</div>
                      <div className="text-[11px] text-zinc-300">Время работы: {p.working_hours}</div>
                      {p.comment && <div className="text-[11px] text-zinc-400 mt-1">{p.comment}</div>}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Delivery Details */}
        {deliveryType === 'delivery' && (
          <div className="space-y-3">
            {/* Courier policy text (Fully customizable via Admin Panel) */}
            <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-200 leading-relaxed shadow-sm">
              <p className="font-bold text-white mb-1 flex items-center gap-1.5 text-xs">
                <Truck className="w-4 h-4 text-orange-400 shrink-0" />
                <span>{settings.delivery_card_title || 'Доставка курьером по Могилеву и области'}</span>
              </p>
              <p className="text-[11px] text-zinc-300 mb-1 font-medium">
                {settings.delivery_card_subtitle || 'По будням и выходным с 13:00.'}
              </p>
              <div className="text-[11px] font-semibold text-orange-300">
                {settings.delivery_card_conditions ||
                  `Стоимость ${settings.delivery_price || 5.0} BYN • от ${settings.free_delivery_min_items || 4} позиций в заказе — бесплатно`}
              </div>
            </div>

            {/* Warning card (Fully customizable via Admin Panel) */}
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-[11px] text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                {settings.delivery_card_note ||
                  'Итоговая стоимость доставки может измениться в зависимости от района Могилева.'}
              </span>
            </div>

            {/* Address input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Адрес доставки в Могилеве:</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="г. Могилев, улица, дом, кв./подъезд"
                className="w-full py-2.5 px-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-zinc-400 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        )}

        {/* Order Comment */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">Комментарий к заказу (необязательно):</label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Удобное время встречи в Могилеве, пожелания..."
            className="w-full py-2.5 px-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-zinc-400 text-xs focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Promocode Input */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">Промокод на скидку:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={promocodeInput}
              onChange={(e) => setPromocodeInput(e.target.value.toUpperCase())}
              placeholder="Например: PUFF2026 или MOGILEV5"
              className="flex-1 py-2.5 px-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-zinc-400 text-xs uppercase font-mono tracking-wider focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleApplyPromo}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-purple-300 bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 tap-active-sm"
            >
              Применить
            </button>
          </div>

          {appliedPromocode && (
            <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Промокод {appliedPromocode.code} активен (-{appliedPromocode.discount_value}
                {appliedPromocode.discount_type === 'percent' ? '%' : ' BYN'})
              </span>
              <button onClick={removePromocode} className="text-zinc-400 hover:text-white underline text-[10px]">
                Отменить
              </button>
            </div>
          )}

          {promocodeMsg && !appliedPromocode && (
            <p className={`text-xs mt-1.5 ${promocodeMsg.isError ? 'text-red-400' : 'text-emerald-400'}`}>
              {promocodeMsg.text}
            </p>
          )}
        </div>

        {/* Summary Card */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Товары ({totalItemsCount} шт.)</span>
            <span className="font-semibold text-white">{subtotal.toFixed(2)} BYN</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-xs text-emerald-400 font-semibold">
              <span>Скидка по промокоду</span>
              <span>−{discountAmount.toFixed(2)} BYN</span>
            </div>
          )}

          <div className="flex justify-between text-xs text-zinc-400">
            <span>Доставка</span>
            <span className="font-semibold text-white">
              {deliveryCost === 0 ? (
                <span className="text-emerald-400 font-bold">Бесплатно</span>
              ) : (
                `${deliveryCost.toFixed(2)} BYN`
              )}
            </span>
          </div>

          <div className="w-full h-px bg-white/10 my-2" />

          <div className="flex justify-between text-base font-extrabold text-white">
            <span>Итого к оплате</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-orange-400">
              {grandTotal.toFixed(2)} BYN
            </span>
          </div>

          {/* Free delivery helper indicator */}
          {deliveryType === 'delivery' && (
            <div className="pt-2 text-[11px] text-zinc-400 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>
                Бесплатная доставка по Могилеву от {settings.free_delivery_min_items || 4} позиций в заказе · сейчас {totalItemsCount}
              </span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleCheckout}
          disabled={isSubmitting}
          className="w-full py-4 px-4 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-orange-500 shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:shadow-[0_0_35px_rgba(249,115,22,0.6)] transition-all flex items-center justify-center gap-2 tap-active disabled:opacity-50 pulse-glow"
        >
          {isSubmitting ? (
            <span>Оформление заказа...</span>
          ) : (
            <>
              <span>Оформить заказ · {grandTotal.toFixed(2)} BYN</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
