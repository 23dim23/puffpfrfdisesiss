import React, { useState, useMemo } from 'react';
import { useStore } from '../services/store';
import {
  BarChart3,
  Package,
  ShoppingBag,
  FolderTree,
  Tag,
  Boxes,
  Sliders,
  Gift,
  Ticket,
  MapPin,
  Users,
  FileSpreadsheet,
  Settings as SettingsIcon,
  ChevronRight,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Download,
  Truck,
  DollarSign,
  TrendingUp,
  Clock,
  Sparkles,
  Shield,
  Search,
} from 'lucide-react';
import { OrderStatus, DeliveryType, Product, Category, Brand, ProductModel, Promotion, Promocode, PickupPoint } from '../types';
import { hapticImpact, hapticNotification } from '../services/telegram';

type AdminSubpage =
  | 'menu'
  | 'stats'
  | 'orders'
  | 'products'
  | 'categories'
  | 'brands'
  | 'models'
  | 'attributes'
  | 'promotions'
  | 'promocodes'
  | 'pickup'
  | 'moderators'
  | 'import'
  | 'settings';

export const AdminPanel: React.FC<{ onBackToHome: () => void }> = ({ onBackToHome }) => {
  const {
    isAdmin,
    isModerator,
    orders,
    products,
    categories,
    brands,
    models,
    attributeGroups,
    attributeValues,
    promotions,
    promocodes,
    pickupPoints,
    admins,
    settings,
    updateOrderStatus,
    saveSettings,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    deleteCategory,
    addBrand,
    deleteBrand,
    addBrandLine,
    deleteBrandLine,
    addModel,
    deleteModel,
    addPromotion,
    deletePromotion,
    addPromocode,
    deletePromocode,
    addPickupPoint,
    deletePickupPoint,
    addAdminUser,
    deleteAdminUser,
    importProducts,
  } = useStore();

  const [activeSubpage, setActiveSubpage] = useState<AdminSubpage>('menu');

  // Orders filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderDeliveryFilter, setOrderDeliveryFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');

  // Brand & Model forms
  const [brandForm, setBrandForm] = useState({
    name: '',
    category_slug: 'liquid',
  });
  const [brandLineForm, setBrandLineForm] = useState({
    group_slug: 'liquid_brand_line',
    line_name: '',
  });
  const [modelForm, setModelForm] = useState({
    name: '',
    brand_slug: 'vaporesso',
  });

  // Product form modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    discount_price: '',
    category_slug: 'liquid',
    brand_slug: '',
    model_slug: '',
    stock_quantity: '10',
    emoji: '📦',
    description: '',
    is_hit: false,
    is_new: false,
  });

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    welcome_title: settings.welcome_title,
    welcome_description: settings.welcome_description,
    logo_url: settings.logo_url,
    delivery_price: settings.delivery_price.toString(),
    free_delivery_min_items: settings.free_delivery_min_items.toString(),
    manager_username: settings.manager_username,
  });

  // Promocode form state
  const [promoForm, setPromoForm] = useState({
    code: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: '10',
    min_order_amount: '20',
    max_uses: '100',
    valid_until: '2026-12-31',
  });

  // Pickup form state
  const [pickupForm, setPickupForm] = useState({
    name: '',
    address: '',
    working_hours: '11:00 - 21:00',
    comment: '',
  });

  // Promotion form state
  const [promotionForm, setPromotionForm] = useState({
    title: '',
    short_description: '',
    description: '',
    condition_text: '',
    image_emoji: '🎉',
    button_text: 'Написать менеджеру',
    button_url: `https://t.me/${settings.manager_username}`,
  });

  // Moderator form state
  const [moderatorForm, setModeratorForm] = useState({
    user_id: '',
    username: '',
    role: 'moderator' as 'admin' | 'moderator',
  });

  // Import textarea
  const [importText, setImportText] = useState<string>('');
  const [importReport, setImportReport] = useState<string | null>(null);

  // Statistics calculation
  const stats = useMemo(() => {
    const completedOrders = orders.filter((o) => o.status === 'completed');
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = todayStart - 30 * 24 * 60 * 60 * 1000;

    let revenueToday = 0;
    let revenueWeek = 0;
    let revenueMonth = 0;
    let revenueTotal = 0;
    let deliveryRevenue = 0;
    let deliveryCount = 0;
    let pickupCount = 0;

    const productSalesMap: Record<number, { name: string; emoji: string; count: number; revenue: number }> = {};
    const categorySalesMap: Record<string, { name: string; count: number; revenue: number }> = {};

    categories.forEach((c) => {
      categorySalesMap[c.slug] = { name: c.name, count: 0, revenue: 0 };
    });

    completedOrders.forEach((order) => {
      const time = new Date(order.created_at).getTime();
      revenueTotal += order.total;
      deliveryRevenue += order.delivery_price || 0;

      if (order.delivery_type === 'delivery') deliveryCount++;
      else pickupCount++;

      if (time >= todayStart) revenueToday += order.total;
      if (time >= weekAgo) revenueWeek += order.total;
      if (time >= monthAgo) revenueMonth += order.total;

      order.items_json.forEach((item) => {
        if (!productSalesMap[item.id]) {
          productSalesMap[item.id] = {
            name: item.name,
            emoji: item.emoji || '📦',
            count: 0,
            revenue: 0,
          };
        }
        productSalesMap[item.id].count += item.quantity;
        productSalesMap[item.id].revenue += item.price * item.quantity;

        const prod = products.find((p) => p.id === item.id);
        if (prod && categorySalesMap[prod.category_slug]) {
          categorySalesMap[prod.category_slug].count += item.quantity;
          categorySalesMap[prod.category_slug].revenue += item.price * item.quantity;
        }
      });
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      revenueToday,
      revenueWeek,
      revenueMonth,
      revenueTotal,
      deliveryRevenue,
      deliveryCount,
      pickupCount,
      totalOrders: orders.length,
      pendingOrdersCount: orders.filter((o) => o.status === 'pending').length,
      topProducts,
      categorySalesMap,
    };
  }, [orders, products, categories]);

  // Export CSV
  const handleExportCSV = () => {
    hapticImpact('medium');
    const headers = ['ID', 'Дата', 'Пользователь', 'Телефон', 'Тип', 'Адрес/Точка', 'Сумма (BYN)', 'Статус', 'Товары'];
    const rows = orders.map((o) => [
      o.id,
      new Date(o.created_at).toLocaleString('ru-RU'),
      o.username || o.first_name || 'Гость',
      o.phone || '-',
      o.delivery_type === 'pickup' ? 'Самовывоз' : 'Доставка',
      o.pickup_point_name || o.delivery_address || '-',
      o.total.toFixed(2),
      o.status,
      o.items_json.map((i) => `${i.name} (${i.quantity} шт)`).join('; '),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orders_puff_paradise_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Product Modal for Add/Edit
  const handleOpenProductModal = (product?: Product) => {
    hapticImpact('light');
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        price: product.price.toString(),
        discount_price: product.discount_price ? product.discount_price.toString() : '',
        category_slug: product.category_slug,
        brand_slug: product.brand_slug || '',
        model_slug: product.model_slug || '',
        stock_quantity: product.stock_quantity.toString(),
        emoji: product.emoji || '📦',
        description: product.description || '',
        is_hit: !!product.is_hit,
        is_new: !!product.is_new,
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        price: '',
        discount_price: '',
        category_slug: 'liquid',
        brand_slug: '',
        model_slug: '',
        stock_quantity: '10',
        emoji: '📦',
        description: '',
        is_hit: false,
        is_new: false,
      });
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.price) return;

    const payload = {
      name: productForm.name.trim(),
      price: parseFloat(productForm.price) || 0,
      discount_price: productForm.discount_price ? parseFloat(productForm.discount_price) : null,
      category_slug: productForm.category_slug,
      brand_slug: productForm.brand_slug || null,
      model_slug: productForm.model_slug || null,
      stock_quantity: parseInt(productForm.stock_quantity) || 0,
      in_stock: (parseInt(productForm.stock_quantity) || 0) > 0,
      emoji: productForm.emoji || '📦',
      description: productForm.description.trim(),
      is_hit: productForm.is_hit,
      is_new: productForm.is_new,
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, payload);
    } else {
      await addProduct(payload);
    }

    setIsProductModalOpen(false);
  };

  // Generate random promo code
  const handleGenerateRandomPromo = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'PUFF';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPromoForm((prev) => ({ ...prev, code }));
  };

  // Process Batch Import
  const handleProcessImport = async () => {
    if (!importText.trim()) return;
    const lines = importText.split('\n').filter((l) => l.trim());
    const parsed = [];

    for (const line of lines) {
      let parts = line.split('|').map((s) => s.trim());
      if (parts.length < 2) parts = line.split(';').map((s) => s.trim());
      if (parts.length >= 2) {
        parsed.push({
          name: parts[0],
          price: parseFloat(parts[1]) || 0,
          category: parts[2] || 'liquid',
          brand: parts[3],
          model: parts[4],
          flavor: parts[5],
          strength: parts[6],
          stock: parseInt(parts[7]) || 10,
        });
      }
    }

    if (parsed.length === 0) {
      setImportReport('❌ Не удалось распознать строки. Формат: Название | Цена | Категория | Бренд | Модель | Вкус | Крепость | Количество');
      return;
    }

    const { successCount, errors } = await importProducts(parsed);
    setImportReport(`✅ Успешно импортировано: ${successCount} товаров.${errors.length > 0 ? ` Ошибки: ${errors.join(', ')}` : ''}`);
    setImportText('');
  };

  // Menu items list
  const menuItems = [
    { id: 'stats', label: 'Статистика & Прибыль', icon: BarChart3, color: 'text-purple-400', desc: 'Продажи, выручка, топ товаров' },
    { id: 'orders', label: 'Управление заказами', icon: Package, color: 'text-orange-400', desc: `${stats.pendingOrdersCount} новых заказов` },
    { id: 'products', label: 'Каталог товаров', icon: ShoppingBag, color: 'text-emerald-400', desc: `${products.length} активных товаров` },
    { id: 'categories', label: 'Категории', icon: FolderTree, color: 'text-blue-400', desc: `${categories.length} категорий` },
    { id: 'brands', label: 'Бренды & Линейки', icon: Tag, color: 'text-pink-400', desc: `${brands.length} брендов` },
    { id: 'models', label: 'Модели устройств', icon: Boxes, color: 'text-cyan-400', desc: `${models.length} моделей` },
    { id: 'promotions', label: 'Акции и розыгрыши', icon: Gift, color: 'text-amber-400', desc: `${promotions.length} активных акций` },
    { id: 'promocodes', label: 'Генератор промокодов', icon: Ticket, color: 'text-fuchsia-400', desc: `${promocodes.length} промокодов` },
    { id: 'pickup', label: 'Точки самовывоза', icon: MapPin, color: 'text-lime-400', desc: `${pickupPoints.length} локаций в Минске` },
    { id: 'moderators', label: 'Модераторы & Админы', icon: Users, color: 'text-indigo-400', desc: `${admins.length} сотрудников` },
    { id: 'import', label: 'Пакетный импорт товаров', icon: FileSpreadsheet, color: 'text-teal-400', desc: 'Вставка списком через |' },
    { id: 'settings', label: 'Настройки магазина', icon: SettingsIcon, color: 'text-zinc-300', desc: 'Тексты, доставка, менеджер' },
  ];

  return (
    <div className="space-y-4 pb-28">
      {/* Admin Header */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-950/60 to-orange-950/60 border border-purple-500/30 shadow-md">
        <div className="flex items-center gap-2">
          {activeSubpage !== 'menu' && (
            <button
              onClick={() => {
                setActiveSubpage('menu');
                hapticImpact('light');
              }}
              className="p-1.5 rounded-xl bg-white/10 text-white hover:bg-white/20 mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-sm font-black text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>
                {activeSubpage === 'menu'
                  ? 'Панель управления'
                  : menuItems.find((m) => m.id === activeSubpage)?.label || 'Админка'}
              </span>
            </h2>
            <p className="text-[10px] text-zinc-400 font-medium">
              Уровень: <span className="text-purple-300 font-bold">{isAdmin ? 'Администратор' : 'Модератор'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onBackToHome}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-zinc-300"
        >
          На главную
        </button>
      </div>

      {/* SUBPAGE: MENU */}
      {activeSubpage === 'menu' && (
        <div className="grid grid-cols-2 gap-2.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSubpage(item.id as AdminSubpage);
                  hapticImpact('light');
                }}
                className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] hover:border-purple-500/30 transition-all text-left flex flex-col justify-between tap-active shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl bg-white/5 ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5 leading-snug">{item.label}</h4>
                  <p className="text-[10px] text-zinc-400 line-clamp-1">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* SUBPAGE: STATS */}
      {activeSubpage === 'stats' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-purple-500/20">
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Выручка сегодня</span>
              <span className="text-lg font-black text-purple-300">{stats.revenueToday.toFixed(2)} BYN</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-purple-500/20">
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Выручка за 7 дней</span>
              <span className="text-lg font-black text-orange-300">{stats.revenueWeek.toFixed(2)} BYN</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-purple-500/20">
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Выручка за месяц</span>
              <span className="text-lg font-black text-fuchsia-300">{stats.revenueMonth.toFixed(2)} BYN</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-purple-500/20">
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Всего оборот</span>
              <span className="text-lg font-black text-emerald-300">{stats.revenueTotal.toFixed(2)} BYN</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Логистика & Доставка</h4>
            <div className="flex justify-between text-xs text-zinc-300">
              <span>Заказов с курьером:</span>
              <span className="font-bold text-white">{stats.deliveryCount}</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-300">
              <span>Самовывозов:</span>
              <span className="font-bold text-white">{stats.pickupCount}</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-300">
              <span>Доход от платной доставки:</span>
              <span className="font-bold text-emerald-400">{stats.deliveryRevenue.toFixed(2)} BYN</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Топ товаров по продажам</h4>
            {stats.topProducts.length > 0 ? (
              stats.topProducts.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                  <span className="text-zinc-200 truncate pr-2">
                    {item.emoji} {item.name}
                  </span>
                  <span className="font-bold text-purple-300 shrink-0">
                    {item.count} шт. ({item.revenue.toFixed(2)} BYN)
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500">После завершения первых заказов тут появится аналитика.</p>
            )}
          </div>
        </div>
      )}

      {/* SUBPAGE: ORDERS */}
      {activeSubpage === 'orders' && (
        <div className="space-y-3">
          {/* Controls bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 tap-active"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Экспорт заказов в CSV</span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="flex-1 py-2 px-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white"
            >
              <option value="all" className="bg-[#181628]">Все статусы</option>
              <option value="pending" className="bg-[#181628]">🔄 В обработке</option>
              <option value="confirmed" className="bg-[#181628]">✅ Подтвержден</option>
              <option value="shipped" className="bg-[#181628]">🚚 Отправлен</option>
              <option value="completed" className="bg-[#181628]">🎉 Выполнен</option>
              <option value="cancelled" className="bg-[#181628]">❌ Отменен</option>
            </select>

            <select
              value={orderDeliveryFilter}
              onChange={(e) => setOrderDeliveryFilter(e.target.value)}
              className="flex-1 py-2 px-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white"
            >
              <option value="all" className="bg-[#181628]">Все типы</option>
              <option value="pickup" className="bg-[#181628]">🏪 Самовывоз</option>
              <option value="delivery" className="bg-[#181628]">🚚 Доставка</option>
            </select>
          </div>

          {/* Orders List */}
          <div className="space-y-3">
            {orders
              .filter((o) => {
                if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
                if (orderDeliveryFilter !== 'all' && o.delivery_type !== orderDeliveryFilter) return false;
                return true;
              })
              .map((order) => (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-md space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-extrabold text-white">
                        Заказ #{order.id} · <span className="text-purple-400">{order.total.toFixed(2)} BYN</span>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Клиент: <span className="text-zinc-200 font-semibold">{order.username || order.first_name || 'Гость'}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-purple-300">
                      {order.status}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-300 bg-black/30 p-2.5 rounded-xl space-y-1">
                    <div>{order.delivery_type === 'pickup' ? `🏪 Точка: ${order.pickup_point_name}` : `🚚 Адрес: ${order.delivery_address}`}</div>
                    {order.comment && <div className="text-zinc-400">💬 {order.comment}</div>}
                    <div className="pt-1 font-mono text-[11px] text-zinc-400">
                      {order.items_json.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                    </div>
                  </div>

                  {/* Status Action Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'confirmed')}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold tap-active-sm"
                        >
                          Подтвердить
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                          className="py-1.5 px-2.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold tap-active-sm"
                        >
                          Отклонить
                        </button>
                      </>
                    )}

                    {order.status === 'confirmed' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'shipped')}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold tap-active-sm"
                      >
                        {order.delivery_type === 'pickup' ? 'Курьер на месте' : 'Курьер отправлен'}
                      </button>
                    )}

                    {(order.status === 'confirmed' || order.status === 'shipped') && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold tap-active-sm"
                      >
                        ✅ Выполнен (Рассчитан)
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SUBPAGE: PRODUCTS */}
      {activeSubpage === 'products' && (
        <div className="space-y-3">
          <button
            onClick={() => handleOpenProductModal()}
            className="w-full py-3 px-4 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 tap-active"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить новый товар</span>
          </button>

          <div className="space-y-2">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl">{p.emoji || '📦'}</span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{p.name}</h4>
                    <p className="text-[10px] text-zinc-400">
                      {p.price.toFixed(2)} BYN · Остаток: {p.stock_quantity} шт.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenProductModal(p)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 tap-active-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Удалить товар "${p.name}"?`)) deleteProduct(p.id);
                    }}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 tap-active-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBPAGE: PROMOCODES */}
      {activeSubpage === 'promocodes' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-purple-500/20 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Создать промокод</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoForm.code}
                onChange={(e) => setPromoForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="КОД ПРОМОКОДА"
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs"
              />
              <button
                onClick={handleGenerateRandomPromo}
                className="px-3 py-2 rounded-xl bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30"
              >
                Рандом
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Скидка (% или BYN)</label>
                <input
                  type="number"
                  value={promoForm.discount_value}
                  onChange={(e) => setPromoForm((prev) => ({ ...prev, discount_value: e.target.value }))}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Тип скидки</label>
                <select
                  value={promoForm.discount_type}
                  onChange={(e) => setPromoForm((prev) => ({ ...prev, discount_type: e.target.value as 'percent' | 'fixed' }))}
                  className="w-full py-2 px-2 rounded-xl bg-[#181628] border border-white/10 text-white text-xs"
                >
                  <option value="percent">Процент (%)</option>
                  <option value="fixed">Фикс (BYN)</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                if (!promoForm.code.trim()) return;
                addPromocode({
                  code: promoForm.code.trim().toUpperCase(),
                  discount_type: promoForm.discount_type,
                  discount_value: parseFloat(promoForm.discount_value) || 0,
                  min_order_amount: parseFloat(promoForm.min_order_amount) || 0,
                  max_uses: parseInt(promoForm.max_uses) || 100,
                  valid_until: promoForm.valid_until,
                  is_active: true,
                });
                setPromoForm((prev) => ({ ...prev, code: '' }));
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 text-white text-xs font-bold tap-active"
            >
              Сохранить промокод
            </button>
          </div>

          <div className="space-y-2">
            {promocodes.map((promo) => (
              <div
                key={promo.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div>
                  <span className="font-mono text-xs font-bold text-purple-300">{promo.code}</span>
                  <span className="text-[11px] text-zinc-400 ml-2">
                    -{promo.discount_value}
                    {promo.discount_type === 'percent' ? '%' : ' BYN'} (исп.: {promo.used_count}/{promo.max_uses || '∞'})
                  </span>
                </div>
                <button
                  onClick={() => deletePromocode(promo.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBPAGE: IMPORT */}
      {activeSubpage === 'import' && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-zinc-300 leading-relaxed">
            <span className="font-bold text-white block mb-1">Формат для быстрой вставки (через символ |):</span>
            <code>Название | Цена | Категория | Бренд | Модель | Вкус | Крепость | Количество</code>
          </div>

          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={`Husky White Ice | 24 | liquid | husky | | Сладкая мята | 20-50 мг | 15\nGeekvape Aegis Boost 3 | 145 | pod | geekvape-aegis | | | | 5`}
            rows={7}
            className="w-full p-3 rounded-2xl bg-white/5 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
          />

          <button
            onClick={handleProcessImport}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-orange-500 text-white text-xs font-bold tap-active"
          >
            📥 Обработать и добавить в базу
          </button>

          {importReport && (
            <p className="text-xs p-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300">{importReport}</p>
          )}
        </div>
      )}

      {/* SUBPAGE: SETTINGS */}
      {activeSubpage === 'settings' && (
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">Заголовок приветственной карточки</label>
            <input
              type="text"
              value={settingsForm.welcome_title}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, welcome_title: e.target.value }))}
              className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">Текст описания на главной</label>
            <textarea
              value={settingsForm.welcome_description}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, welcome_description: e.target.value }))}
              rows={3}
              className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Стоимость доставки (BYN)</label>
              <input
                type="number"
                value={settingsForm.delivery_price}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, delivery_price: e.target.value }))}
                className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Бесплатная доставка от (шт)</label>
              <input
                type="number"
                value={settingsForm.free_delivery_min_items}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, free_delivery_min_items: e.target.value }))}
                className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">Username менеджера в Telegram</label>
            <input
              type="text"
              value={settingsForm.manager_username}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, manager_username: e.target.value }))}
              className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">URL логотипа</label>
            <input
              type="text"
              value={settingsForm.logo_url}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, logo_url: e.target.value }))}
              placeholder="https://..."
              className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
          </div>

          <button
            onClick={() => {
              saveSettings({
                welcome_title: settingsForm.welcome_title,
                welcome_description: settingsForm.welcome_description,
                delivery_price: parseFloat(settingsForm.delivery_price) || 5,
                free_delivery_min_items: parseInt(settingsForm.free_delivery_min_items) || 4,
                manager_username: settingsForm.manager_username,
                logo_url: settingsForm.logo_url,
              });
              alert('Настройки успешно сохранены!');
            }}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 text-white text-xs font-bold tap-active"
          >
            Сохранить настройки
          </button>
        </div>
      )}

      {/* SUBPAGE: PICKUP */}
      {activeSubpage === 'pickup' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-purple-500/20 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Добавить точку выдачи</h4>
            <input
              type="text"
              value={pickupForm.name}
              onChange={(e) => setPickupForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Название (напр. Атриум)"
              className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
            <input
              type="text"
              value={pickupForm.address}
              onChange={(e) => setPickupForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Адрес (ул. Ленинская)"
              className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
            <input
              type="text"
              value={pickupForm.working_hours}
              onChange={(e) => setPickupForm((prev) => ({ ...prev, working_hours: e.target.value }))}
              placeholder="Время работы (напр. 10:00 - 22:00)"
              className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
            <button
              onClick={() => {
                if (!pickupForm.name || !pickupForm.address) return;
                addPickupPoint({
                  name: pickupForm.name,
                  address: pickupForm.address,
                  working_hours: pickupForm.working_hours,
                  comment: pickupForm.comment,
                  is_active: true,
                });
                setPickupForm({ name: '', address: '', working_hours: '10:00 - 22:00', comment: '' });
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 text-white text-xs font-bold tap-active"
            >
              Добавить точку
            </button>
          </div>

          <div className="space-y-2">
            {pickupPoints.map((point) => (
              <div
                key={point.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">📍 {point.name}</h4>
                  <p className="text-[11px] text-zinc-400">{point.address} ({point.working_hours})</p>
                </div>
                <button
                  onClick={() => deletePickupPoint(point.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBPAGE: MODERATORS */}
      {activeSubpage === 'moderators' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-purple-500/20 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Назначить сотрудника</h4>
            <input
              type="number"
              value={moderatorForm.user_id}
              onChange={(e) => setModeratorForm((prev) => ({ ...prev, user_id: e.target.value }))}
              placeholder="Telegram ID пользователя"
              className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
            <input
              type="text"
              value={moderatorForm.username}
              onChange={(e) => setModeratorForm((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="Username (@username)"
              className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
            <select
              value={moderatorForm.role}
              onChange={(e) => setModeratorForm((prev) => ({ ...prev, role: e.target.value as 'admin' | 'moderator' }))}
              className="w-full py-2 px-2 rounded-xl bg-[#181628] border border-white/10 text-white text-xs"
            >
              <option value="moderator">Модератор (Заказы и клиенты)</option>
              <option value="admin">Администратор (Полный доступ)</option>
            </select>
            <button
              onClick={() => {
                if (!moderatorForm.user_id) return;
                addAdminUser(parseInt(moderatorForm.user_id), moderatorForm.username || 'staff', moderatorForm.role);
                setModeratorForm({ user_id: '', username: '', role: 'moderator' });
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 text-white text-xs font-bold tap-active"
            >
              Добавить сотрудника
            </button>
          </div>

          <div className="space-y-2">
            {admins.map((adm) => (
              <div
                key={adm.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">@{adm.username || 'user'} (ID: {adm.user_id})</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                    {adm.role}
                  </span>
                </div>
                <button
                  onClick={() => deleteAdminUser(adm.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBPAGE: PROMOTIONS */}
      {activeSubpage === 'promotions' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-purple-500/20 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Создать акцию</h4>
            <input
              type="text"
              value={promotionForm.title}
              onChange={(e) => setPromotionForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Заголовок акции"
              className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
            <input
              type="text"
              value={promotionForm.condition_text}
              onChange={(e) => setPromotionForm((prev) => ({ ...prev, condition_text: e.target.value }))}
              placeholder="Бейдж условия (напр. Скидка 10%)"
              className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
            <textarea
              value={promotionForm.description}
              onChange={(e) => setPromotionForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Полное описание акции..."
              rows={3}
              className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
            <button
              onClick={() => {
                if (!promotionForm.title) return;
                addPromotion({
                  title: promotionForm.title,
                  short_description: promotionForm.description.slice(0, 80),
                  description: promotionForm.description,
                  condition_text: promotionForm.condition_text,
                  image_emoji: promotionForm.image_emoji,
                  button_text: promotionForm.button_text,
                  button_url: promotionForm.button_url,
                  is_active: true,
                });
                setPromotionForm({
                  title: '',
                  short_description: '',
                  description: '',
                  condition_text: '',
                  image_emoji: '🎉',
                  button_text: 'Написать менеджеру',
                  button_url: `https://t.me/${settings.manager_username}`,
                });
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 text-white text-xs font-bold tap-active"
            >
              Опубликовать акцию
            </button>
          </div>

          <div className="space-y-2">
            {promotions.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">{p.image_emoji} {p.title}</h4>
                  <p className="text-[10px] text-zinc-400">{p.condition_text}</p>
                </div>
                <button
                  onClick={() => deletePromotion(p.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBPAGE: CATEGORIES */}
      {activeSubpage === 'categories' && (
        <div className="space-y-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{c.icon || '📂'}</span>
                <div>
                  <h4 className="text-xs font-bold text-white">{c.name}</h4>
                  <p className="text-[10px] text-zinc-400">slug: {c.slug}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-400">Активна</span>
            </div>
          ))}
        </div>
      )}

      {/* SUBPAGE: BRANDS & LINES */}
      {activeSubpage === 'brands' && (
        <div className="space-y-4">
          {/* Form: Add Brand */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-purple-500/20 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>🏷️ Добавить бренд</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={brandForm.name}
                onChange={(e) => setBrandForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Название бренда (напр. Husky, Vaporesso)"
                className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
              />
              <select
                value={brandForm.category_slug}
                onChange={(e) => setBrandForm((prev) => ({ ...prev, category_slug: e.target.value }))}
                className="w-full py-2 px-2 rounded-xl bg-[#181628] border border-white/10 text-white text-xs"
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                if (!brandForm.name.trim()) return;
                const slug = brandForm.name.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '-');
                addBrand({
                  name: brandForm.name.trim(),
                  slug,
                  category_slug: brandForm.category_slug,
                  sort_order: brands.length + 1,
                });
                setBrandForm({ name: '', category_slug: 'liquid' });
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 text-white text-xs font-bold tap-active"
            >
              Добавить бренд
            </button>
          </div>

          {/* Form: Add Brand Line (Линейка вкусов) */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-blue-500/20 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>✨ Добавить линейку вкусов / серию</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={brandLineForm.line_name}
                onChange={(e) => setBrandLineForm((prev) => ({ ...prev, line_name: e.target.value }))}
                placeholder="Название линейки (напр. White (Холодок))"
                className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
              />
              <select
                value={brandLineForm.group_slug}
                onChange={(e) => setBrandLineForm((prev) => ({ ...prev, group_slug: e.target.value }))}
                className="w-full py-2 px-2 rounded-xl bg-[#181628] border border-white/10 text-white text-xs"
              >
                <option value="liquid_brand_line">Линейка жидкостей</option>
                <option value="disposable_puffs">Линейка затяжек одноразок</option>
                <option value="snus_brand_line">Линейка снюса</option>
              </select>
            </div>
            <button
              onClick={() => {
                if (!brandLineForm.line_name.trim()) return;
                addBrandLine(brandLineForm.group_slug, brandLineForm.line_name.trim());
                setBrandLineForm((prev) => ({ ...prev, line_name: '' }));
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 text-white text-xs font-bold tap-active"
            >
              Добавить линейку вкусов
            </button>
          </div>

          {/* List of Brands */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">Список брендов</h5>
            {brands.map((b) => {
              const brandProductsCount = products.filter((p) => p.brand_slug === b.slug).length;
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{b.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">
                        {brandProductsCount} тов.
                      </span>
                    </h4>
                    <p className="text-[10px] text-zinc-400">Категория: {b.category_slug}</p>
                  </div>
                  <button onClick={() => deleteBrand(b.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* List of Flavor Lines */}
          <div className="space-y-2 pt-2">
            <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">Линейки вкусов / Серии</h5>
            <div className="flex flex-wrap gap-1.5">
              {attributeValues
                .filter((v) => {
                  return (
                    v.attribute_group_slug === 'liquid_brand_line' ||
                    v.attribute_group_slug === 'disposable_puffs' ||
                    v.attribute_group_slug === 'snus_brand_line'
                  );
                })
                .map((val) => (
                  <div
                    key={val.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-xs text-purple-200"
                  >
                    <span>{val.value}</span>
                    <button
                      onClick={() => deleteBrandLine(val.id)}
                      className="text-purple-400 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBPAGE: MODELS */}
      {activeSubpage === 'models' && (
        <div className="space-y-4">
          {/* Form: Add Model */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-purple-500/20 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>📱 Добавить модель устройства</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={modelForm.name}
                onChange={(e) => setModelForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Название модели (напр. XROS 4, Aegis Hero 2)"
                className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
              />
              <select
                value={modelForm.brand_slug}
                onChange={(e) => setModelForm((prev) => ({ ...prev, brand_slug: e.target.value }))}
                className="w-full py-2 px-2 rounded-xl bg-[#181628] border border-white/10 text-white text-xs"
              >
                {brands.map((b) => (
                  <option key={b.slug} value={b.slug}>{b.name} ({b.category_slug})</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                if (!modelForm.name.trim()) return;
                const slug = modelForm.name.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '-');
                addModel({
                  name: modelForm.name.trim(),
                  slug,
                  brand_slug: modelForm.brand_slug,
                  category_slug: 'pod',
                  sort_order: models.length + 1,
                });
                setModelForm((prev) => ({ ...prev, name: '' }));
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 text-white text-xs font-bold tap-active"
            >
              Добавить модель
            </button>
          </div>

          {/* List of Models */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">Список моделей устройств</h5>
            {models.map((m) => {
              const brandObj = brands.find((b) => b.slug === m.brand_slug);
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white">{m.name}</h4>
                    <p className="text-[10px] text-zinc-400">Бренд: {brandObj?.name || m.brand_slug}</p>
                  </div>
                  <button onClick={() => deleteModel(m.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PRODUCT ADD / EDIT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsProductModalOpen(false)} />
          <div className="relative w-full max-w-[390px] max-h-[85vh] overflow-y-auto bg-[#141221] border border-purple-500/30 rounded-3xl p-5 no-scrollbar z-10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {editingProduct ? 'Редактировать товар' : 'Добавить товар'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-300 block mb-1">Название товара</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Цена (BYN)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))}
                    className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Цена со скидкой</label>
                  <input
                    type="number"
                    step="0.5"
                    value={productForm.discount_price}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, discount_price: e.target.value }))}
                    className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Категория</label>
                  <select
                    value={productForm.category_slug}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, category_slug: e.target.value }))}
                    className="w-full py-2 px-2 rounded-xl bg-[#181628] border border-white/10 text-white text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Остаток (шт)</label>
                  <input
                    type="number"
                    value={productForm.stock_quantity}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, stock_quantity: e.target.value }))}
                    className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-300 block mb-1">Эмодзи или значок</label>
                <input
                  type="text"
                  value={productForm.emoji}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, emoji: e.target.value }))}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 block mb-1">Описание / Вкус / Характеристики</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                />
              </div>

              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.is_hit}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, is_hit: e.target.checked }))}
                    className="rounded text-purple-500"
                  />
                  <span>🔥 Хит продаж</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.is_new}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, is_new: e.target.checked }))}
                    className="rounded text-purple-500"
                  />
                  <span>✨ Новинка</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 text-white text-xs font-bold tap-active"
              >
                {editingProduct ? 'Сохранить изменения' : 'Создать товар'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
