import React, { useState, useMemo } from 'react';
import { useStore } from '../services/store';
import { Order, Product } from '../types';
import {
  X,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingBag,
  Truck,
  Users,
  Bot,
  Smartphone,
  Award,
  AlertTriangle,
  Calendar,
  Layers,
  Percent,
} from 'lucide-react';
import { hapticImpact } from '../services/telegram';

interface DetailedStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPeriod?: 'today' | 'week' | 'month' | 'total';
}

export const DetailedStatsModal: React.FC<DetailedStatsModalProps> = ({
  isOpen,
  onClose,
  initialPeriod = 'today',
}) => {
  const { orders, products, users, isAdmin } = useStore();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'total'>(initialPeriod);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'users'>('overview');

  // Sync period with initialPeriod when changed
  React.useEffect(() => {
    if (isOpen) {
      setPeriod(initialPeriod);
    }
  }, [isOpen, initialPeriod]);

  // Filter orders by period
  const filteredOrders = useMemo(() => {
    if (!isOpen) return [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    return orders.filter((o) => {
      // Exclude cancelled orders from financial stats
      if (o.status === 'cancelled') return false;
      const orderTime = o.created_at ? new Date(o.created_at).getTime() : now.getTime();

      if (period === 'today') return orderTime >= startOfToday;
      if (period === 'week') return orderTime >= sevenDaysAgo;
      if (period === 'month') return orderTime >= thirtyDaysAgo;
      return true;
    });
  }, [orders, period]);

  // Financial Metrics
  const metrics = useMemo(() => {
    let revenue = 0;
    let profit = 0;
    let itemsSold = 0;
    let deliveryRevenue = 0;
    let discountSum = 0;
    let pickupCount = 0;
    let deliveryCount = 0;
    const productSalesMap: Record<number, { name: string; quantity: number; revenue: number; profit: number; category: string }> = {};

    for (const order of filteredOrders) {
      revenue += order.total;
      profit += order.total_margin ?? (order.total * 0.6);
      deliveryRevenue += order.delivery_price || 0;
      discountSum += order.discount_amount || 0;

      if (order.delivery_type === 'pickup') {
        pickupCount++;
      } else {
        deliveryCount++;
      }

      for (const item of order.items_json) {
        itemsSold += item.quantity;
        const itemRev = item.price * item.quantity;
        const itemMargin = (item.margin_profit ?? (item.cost_price ? item.price - item.cost_price : item.price * 0.6)) * item.quantity;

        if (!productSalesMap[item.id]) {
          const pObj = products.find((p) => p.id === item.id);
          productSalesMap[item.id] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
            profit: 0,
            category: pObj?.category_slug || 'other',
          };
        }
        productSalesMap[item.id].quantity += item.quantity;
        productSalesMap[item.id].revenue += item.revenue ? item.revenue : itemRev;
        productSalesMap[item.id].profit += itemMargin;
      }
    }

    const avgCheck = filteredOrders.length > 0 ? revenue / filteredOrders.length : 0;
    const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Top selling products
    const sortedProductSales = Object.entries(productSalesMap)
      .map(([id, data]) => ({ id: Number(id), ...data }))
      .sort((a, b) => b.quantity - a.quantity);

    // Unsold or least selling products
    const unsoldProducts = products
      .map((p) => {
        const sold = productSalesMap[p.id]?.quantity || 0;
        return {
          id: p.id,
          name: p.name,
          category: p.category_slug,
          stock: p.stock_quantity,
          price: p.price,
          sold,
        };
      })
      .filter((p) => p.sold === 0)
      .sort((a, b) => b.stock - a.stock);

    return {
      ordersCount: filteredOrders.length,
      revenue,
      profit,
      marginPercent,
      itemsSold,
      deliveryRevenue,
      discountSum,
      pickupCount,
      deliveryCount,
      avgCheck,
      sortedProductSales,
      unsoldProducts,
    };
  }, [filteredOrders, products]);

  // Inventory Value Metrics (total stock value)
  const inventoryMetrics = useMemo(() => {
    let totalCostValue = 0;
    let totalRetailValue = 0;
    for (const p of products) {
      const stock = p.stock_quantity || 0;
      if (stock > 0) {
        const cost = p.cost_price !== undefined && p.cost_price !== null ? p.cost_price : (p.price * 0.4);
        totalCostValue += cost * stock;
        totalRetailValue += p.price * stock;
      }
    }
    return {
      totalCostValue,
      totalRetailValue,
    };
  }, [products]);

  // User Traffic & Audience Metrics
  const userMetrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    const totalBot = users.filter((u) => u.source === 'bot').length;
    const totalMiniapp = users.filter((u) => u.source === 'miniapp' || !u.source).length;

    let periodFilterTime = 0;
    if (period === 'today') periodFilterTime = startOfToday;
    else if (period === 'week') periodFilterTime = sevenDaysAgo;
    else if (period === 'month') periodFilterTime = thirtyDaysAgo;

    const newUsersPeriod = users.filter((u) => {
      const created = u.created_at ? new Date(u.created_at).getTime() : now.getTime();
      return created >= periodFilterTime;
    });

    const newBot = newUsersPeriod.filter((u) => u.source === 'bot').length;
    const newMiniapp = newUsersPeriod.filter((u) => u.source === 'miniapp' || !u.source).length;

    return {
      totalUsers: users.length,
      totalBot,
      totalMiniapp,
      newTotal: newUsersPeriod.length,
      newBot,
      newMiniapp,
    };
  }, [users, period]);

  const periodLabels = {
    today: 'Сегодня',
    week: '7 дней',
    month: '30 дней',
    total: 'Все время',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] bg-[#141221] border border-purple-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">Статистика и аналитика</h3>
              <p className="text-[11px] text-zinc-400">
                Период: <span className="text-purple-300 font-semibold">{periodLabels[period]}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              hapticImpact('light');
              onClose();
            }}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Period Selector Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/5 my-3 shrink-0">
          {(['today', 'week', 'month', 'total'] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                hapticImpact('light');
                setPeriod(p);
              }}
              className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === p
                  ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex gap-2 border-b border-white/5 pb-2 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-1 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            💰 Финансы & Заказы
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-1 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'products'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🏆 Товары & Хиты
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-1 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'users'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            👥 Пользователи & Трафик
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto pt-3 space-y-4 no-scrollbar pr-0.5">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {/* Main Financial Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-purple-500/20 space-y-1">
                  <span className="text-[11px] text-zinc-400 block">Оборот (выручка)</span>
                  <div className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-orange-400">
                    {metrics.revenue.toFixed(2)} BYN
                  </div>
                  <span className="text-[10px] text-purple-300 font-medium block">
                    {metrics.ordersCount} {metrics.ordersCount === 1 ? 'заказ' : 'заказов'}
                  </span>
                </div>

                {isAdmin ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                    <span className="text-[11px] text-emerald-300/80 block">Чистая прибыль (Маржа)</span>
                    <div className="text-lg font-black text-emerald-300">
                      +{metrics.profit.toFixed(2)} BYN
                    </div>
                    <span className="text-[10px] text-emerald-400/90 font-semibold block">
                      Рентабельность: {metrics.marginPercent.toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                    <span className="text-[11px] text-zinc-400 block">Средний чек</span>
                    <div className="text-lg font-black text-white">
                      {metrics.avgCheck.toFixed(2)} BYN
                    </div>
                    <span className="text-[10px] text-zinc-400 block">На 1 заказ</span>
                  </div>
                )}
              </div>

              {/* Inventory Value Cards */}
              {isAdmin && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-1">
                    <span className="text-[11px] text-blue-300/80 block">Остатки по себестоимости</span>
                    <div className="text-lg font-black text-blue-300">
                      {inventoryMetrics.totalCostValue.toFixed(2)} BYN
                    </div>
                    <span className="text-[10px] text-blue-400 block">Всего на складе (закуп)</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                    <span className="text-[11px] text-amber-300/80 block">Остатки в рознице</span>
                    <div className="text-lg font-black text-amber-300">
                      {inventoryMetrics.totalRetailValue.toFixed(2)} BYN
                    </div>
                    <span className="text-[10px] text-amber-400 block">Ожидаемая выручка</span>
                  </div>
                </div>
              )}

              {/* Detailed Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-zinc-400 block">Продано товара</span>
                  <span className="text-sm font-bold text-white">{metrics.itemsSold} шт.</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-zinc-400 block">Средний чек</span>
                  <span className="text-sm font-bold text-white">{metrics.avgCheck.toFixed(2)} BYN</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-zinc-400 block">Выручка доставки</span>
                  <span className="text-sm font-bold text-purple-300">+{metrics.deliveryRevenue} BYN</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-zinc-400 block">Скидки & Промокоды</span>
                  <span className="text-sm font-bold text-red-400">-{metrics.discountSum} BYN</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-zinc-400 block">Самовывоз (Встреча)</span>
                  <span className="text-sm font-bold text-blue-300">{metrics.pickupCount} зак.</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-zinc-400 block">Доставка курьером</span>
                  <span className="text-sm font-bold text-indigo-300">{metrics.deliveryCount} зак.</span>
                </div>
              </div>

              {/* Order Status Breakdown */}
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                  Распределение по статусам
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded-xl bg-black/30">
                    <span className="text-emerald-400 font-semibold">✅ Выполнен</span>
                    <span className="font-bold text-white">
                      {filteredOrders.filter((o) => o.status === 'completed').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-xl bg-black/30">
                    <span className="text-blue-400 font-semibold">📍 В процессе</span>
                    <span className="font-bold text-white">
                      {filteredOrders.filter((o) => ['confirmed', 'ready_for_pickup', 'courier_sent', 'courier_arrived', 'shipped'].includes(o.status)).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-xl bg-black/30">
                    <span className="text-amber-400 font-semibold">⏳ В обработке</span>
                    <span className="font-bold text-white">
                      {filteredOrders.filter((o) => o.status === 'pending').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-xl bg-black/30">
                    <span className="text-red-400 font-semibold">❌ Отменен</span>
                    <span className="font-bold text-white">
                      {orders.filter((o) => o.status === 'cancelled').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS (BEST & WORST SELLERS) */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              {/* Top Selling Products */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider px-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>Топ продаваемых товаров (Хиты)</span>
                </div>

                {metrics.sortedProductSales.length === 0 ? (
                  <p className="text-xs text-zinc-500 p-3 rounded-xl bg-white/[0.02]">
                    За выбранный период продаж не зафиксировано
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto no-scrollbar">
                    {metrics.sortedProductSales.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                          <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            idx === 0 ? 'bg-amber-500/20 text-amber-300' : idx === 1 ? 'bg-zinc-400/20 text-zinc-200' : idx === 2 ? 'bg-amber-700/20 text-amber-400' : 'bg-white/5 text-zinc-400'
                          }`}>
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-white truncate block">{item.name}</span>
                            <span className="text-[10px] text-zinc-400">Категория: {item.category}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold text-white">{item.quantity} шт.</div>
                          <div className="text-[10px] text-purple-300 font-semibold">{item.revenue.toFixed(1)} BYN</div>
                          {isAdmin && (
                            <div className="text-[9px] text-emerald-400 font-semibold">маржа: +{item.profit.toFixed(1)} BYN</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Unsold & Low Demand Products */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider px-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Неходовые товары (0 продаж за период)</span>
                </div>

                {metrics.unsoldProducts.length === 0 ? (
                  <p className="text-xs text-zinc-500 p-3 rounded-xl bg-white/[0.02]">
                    Все товары в каталоге продаются!
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto no-scrollbar">
                    {metrics.unsoldProducts.slice(0, 15).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/10 text-xs"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="font-semibold text-zinc-200 truncate block">{p.name}</span>
                          <span className="text-[10px] text-zinc-400">Цена: {p.price} BYN</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                            Остаток: {p.stock} шт.
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: USERS & TRAFFIC (BOT VS WEBAPP) */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              {/* User Overview Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                  <div className="flex items-center gap-1 text-[11px] text-purple-300 font-semibold">
                    <Users className="w-3.5 h-3.5" />
                    <span>Всего пользователей</span>
                  </div>
                  <div className="text-xl font-black text-white">{userMetrics.totalUsers}</div>
                  <span className="text-[10px] text-purple-400 block">
                    Новых за {periodLabels[period].toLowerCase()}: +{userMetrics.newTotal}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1">
                  <div className="flex items-center gap-1 text-[11px] text-blue-300 font-semibold">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>MiniApp (WebApp)</span>
                  </div>
                  <div className="text-xl font-black text-white">{userMetrics.totalMiniapp}</div>
                  <span className="text-[10px] text-blue-400 block">
                    Новых: +{userMetrics.newMiniapp}
                  </span>
                </div>
              </div>

              {/* Bot vs WebApp Comparison */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Канал привлечения клиентов
                </h4>

                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-zinc-300 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                        <span>Telegram MiniApp (Магазин)</span>
                      </span>
                      <span className="font-bold text-white">
                        {userMetrics.totalMiniapp} ({userMetrics.totalUsers > 0 ? Math.round((userMetrics.totalMiniapp / userMetrics.totalUsers) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                        style={{
                          width: `${userMetrics.totalUsers > 0 ? (userMetrics.totalMiniapp / userMetrics.totalUsers) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-zinc-300 flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-purple-400" />
                        <span>Telegram Бот (Диалог)</span>
                      </span>
                      <span className="font-bold text-white">
                        {userMetrics.totalBot} ({userMetrics.totalUsers > 0 ? Math.round((userMetrics.totalBot / userMetrics.totalUsers) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full"
                        style={{
                          width: `${userMetrics.totalUsers > 0 ? (userMetrics.totalBot / userMetrics.totalUsers) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* User List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block px-1">
                  Последние активные клиенты
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                  {users.slice(0, 10).map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-[10px]">
                          {u.first_name ? u.first_name[0] : 'U'}
                        </div>
                        <div>
                          <span className="font-bold text-white block leading-tight">
                            {u.first_name || 'Пользователь'} {u.username ? `(@${u.username})` : ''}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">ID: {u.id}</span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-zinc-300">
                        {u.source === 'bot' ? '🤖 Бот' : '📱 WebApp'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 shrink-0">
          <button
            onClick={() => {
              hapticImpact('light');
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all"
          >
            Закрыть окно
          </button>
        </div>
      </div>
    </div>
  );
};
