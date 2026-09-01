import React from 'react';
import { useStore } from '../services/store';
import { OrderStatus } from '../types';
import { PackageCheck, MessageCircle, XCircle, Clock, CheckCircle2, Truck, AlertCircle, ShoppingBag } from 'lucide-react';
import { openTelegramOrWeb, hapticImpact } from '../services/telegram';
import { formatBrandSlug } from '../utils/brand';

interface OrdersTabProps {
  onGoToCatalog: () => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({ onGoToCatalog }) => {
  const { orders, currentUser, settings, cancelOrder, products, brands } = useStore();

  // User orders or all orders if dev
  const userOrders = currentUser
    ? orders.filter((o) => o.user_id === currentUser.id || o.username === currentUser.username)
    : orders;

  const handleManagerChat = () => {
    hapticImpact('medium');
    openTelegramOrWeb(`https://t.me/${settings.manager_username}`);
  };

  const handleCancel = async (orderId: number) => {
    const ok = window.confirm(`Отменить заказ #${orderId}?`);
    if (!ok) return;
    hapticImpact('medium');
    await cancelOrder(orderId);
  };

  const getStatusBadge = (status: OrderStatus, deliveryType?: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Новый / В обработке</span>
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-blue-400" />
            <span>Подтвержден</span>
          </span>
        );
      case 'ready_for_pickup':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 animate-pulse">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>📍 Менеджер на точке (ждет вас)</span>
          </span>
        );
      case 'courier_sent':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
            <Truck className="w-3 h-3 text-indigo-400" />
            <span>🚗 Курьер в пути</span>
          </span>
        );
      case 'courier_arrived':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 animate-pulse">
            <Truck className="w-3 h-3 text-emerald-400" />
            <span>📍 Курьер прибыл на адрес</span>
          </span>
        );
      case 'shipped':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
            <Truck className="w-3 h-3 text-purple-400" />
            <span>{deliveryType === 'pickup' ? 'Готов к выдаче' : 'Отправлен курьером'}</span>
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Выполнен 🎉</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-red-400" />
            <span>Отменен</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-500/20 text-zinc-300 border border-zinc-500/40">
            {status}
          </span>
        );
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('ru-RU')}, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {userOrders.length === 0 ? (
        <div className="py-16 px-4 text-center">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-4xl mb-4 shadow-[0_0_25px_rgba(168,85,247,0.2)]">
            📦
          </div>
          <h3 className="text-lg font-bold text-white mb-1.5">У вас пока нет заказов</h3>
          <p className="text-xs text-zinc-400 max-w-[260px] mx-auto mb-6 leading-relaxed">
            Перейдите в каталог, чтобы сделать свой первый заказ с быстрой доставкой!
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
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">История ваших заказов</span>
            <span className="text-xs font-semibold text-purple-400">{userOrders.length} заказов</span>
          </div>

          {userOrders.map((order) => {
            const isPending = order.status === 'pending';

            return (
              <div
                key={order.id}
                className="p-4 rounded-3xl bg-white/[0.03] border border-white/[0.08] shadow-lg space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-black text-white">
                      #{order.id}
                    </span>
                    <span className="text-xs text-zinc-400 ml-2">
                      · {formatDate(order.created_at)}
                    </span>
                    <div className="text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-orange-400 mt-0.5">
                      {order.total.toFixed(2)} BYN
                    </div>
                  </div>

                  <div>{getStatusBadge(order.status, order.delivery_type)}</div>
                </div>

                {/* Delivery & Payment info */}
                <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-xs text-zinc-300 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Способ:</span>
                    <span className="font-semibold text-white">
                      {order.delivery_type === 'pickup'
                        ? `Встреча (${order.pickup_point_name || 'Точка самовывоза'})`
                        : `Доставка (${order.delivery_address || 'Адрес указан'})`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Оплата:</span>
                    <span className="font-medium text-zinc-200">💵 Наличные / картой</span>
                  </div>
                  {order.promocode_code && (
                    <div className="flex items-center justify-between text-emerald-400 font-semibold">
                      <span>Промокод:</span>
                      <span>{order.promocode_code} (-{order.discount_amount.toFixed(2)} BYN)</span>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="space-y-1 text-xs">
                  <span className="font-semibold text-zinc-400 block text-[11px] uppercase tracking-wider">Товары:</span>
                  {order.items_json.map((item, idx) => {
                    const prod = products.find((p) => p.id === item.id);
                    const brand = prod && prod.brand_slug ? brands.find((b) => b.slug === prod.brand_slug) : null;
                    const brandName = item.brand_name || (brand ? brand.name : null) || (item.brand_slug ? formatBrandSlug(item.brand_slug) : (prod && prod.brand_slug ? formatBrandSlug(prod.brand_slug) : null));
                    return (
                      <div key={idx} className="flex items-center justify-between text-zinc-300 py-0.5">
                        <span className="truncate pr-2">
                          {item.emoji || '📦'} {brandName ? `[${brandName}] ` : ''}{item.name}
                          {item.color_name ? ` (${item.color_name})` : ''}
                        </span>
                        <span className="shrink-0 font-semibold text-white">×{item.quantity}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                  <button
                    onClick={handleManagerChat}
                    className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 hover:bg-purple-500/25 flex items-center justify-center gap-1.5 tap-active-sm"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Написать менеджеру</span>
                  </button>

                  {isPending && (
                    <button
                      onClick={() => handleCancel(order.id)}
                      className="py-2.5 px-3 rounded-xl text-xs font-bold text-red-400 bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 flex items-center justify-center gap-1 tap-active-sm"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Отменить</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
