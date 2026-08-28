import React, { useState, useMemo, useEffect } from 'react';
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
  MessageCircle,
  Percent,
  Image as ImageIcon,
  Camera,
  UploadCloud,
} from 'lucide-react';
import { OrderStatus, DeliveryType, Product, Category, Brand, ProductModel, Promotion, Promocode, PickupPoint } from '../types';
import { hapticImpact, hapticNotification, openTelegramOrWeb } from '../services/telegram';
import { DetailedStatsModal } from './DetailedStatsModal';
import { MassImportModal } from './MassImportModal';
import { OrderExportModal } from './OrderExportModal';
import { ProductImage } from './ProductImage';

type AdminSubpage =
  | 'menu'
  | 'stats'
  | 'orders'
  | 'products'
  | 'photos'
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
    isMasterAdmin,
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
    users,
    settings,
    updateOrderStatus,
    saveSettings,
    addProduct,
    updateProduct,
    bulkUpdateProductImage,
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
    exportDatabaseDump,
    importDatabaseDump,
    resetDatabaseDefaults,
  } = useStore();

  const [activeSubpage, setActiveSubpage] = useState<AdminSubpage>('menu');
  const [dbDumpInput, setDbDumpInput] = useState<string>('');
  const [showDbTools, setShowDbTools] = useState<boolean>(false);

  // Photo Hub State
  const [photoTab, setPhotoTab] = useState<'single' | 'brand' | 'category'>('single');
  const [photoSearch, setPhotoSearch] = useState('');
  const [photoCategoryFilter, setPhotoCategoryFilter] = useState('all');
  const [photoBrandFilter, setPhotoBrandFilter] = useState('all');
  const [photoModalProduct, setPhotoModalProduct] = useState<Product | null>(null);
  const [photoModalUrl, setPhotoModalUrl] = useState('');
  const [bulkBrandSlug, setBulkBrandSlug] = useState('');
  const [bulkBrandImageUrl, setBulkBrandImageUrl] = useState('');
  const [bulkCategorySlug, setBulkCategorySlug] = useState('liquid');
  const [bulkCategoryImageUrl, setBulkCategoryImageUrl] = useState('');

  // New Modals
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [statsModalPeriod, setStatsModalPeriod] = useState<'today' | 'week' | 'month' | 'total'>('today');
  const [isMassImportModalOpen, setIsMassImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Orders filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderDeliveryFilter, setOrderDeliveryFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');

  // Admin Catalog filters
  const [adminProductSearch, setAdminProductSearch] = useState<string>('');
  const [adminProductCategoryFilter, setAdminProductCategoryFilter] = useState<string>('all');
  const [adminProductBrandFilter, setAdminProductBrandFilter] = useState<string>('all');

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
    cost_price: '',
    discount_price: '',
    category_slug: 'liquid',
    brand_slug: '',
    model_slug: '',
    nicotine_strength: '',
    image_url: '',
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
    delivery_card_title: settings.delivery_card_title || 'Доставка курьером по Могилеву и области',
    delivery_card_subtitle: settings.delivery_card_subtitle || 'По будням и выходным с 13:00',
    delivery_card_conditions: settings.delivery_card_conditions || 'Стоимость 5.0 BYN • От 4 позиций в заказе — БЕСПЛАТНО',
    delivery_card_note: settings.delivery_card_note || 'Итоговая стоимость доставки может измениться в зависимости от района Могилева.',
  });

  // Keep settingsForm in sync with global store settings
  useEffect(() => {
    setSettingsForm({
      welcome_title: settings.welcome_title || '',
      welcome_description: settings.welcome_description || '',
      logo_url: settings.logo_url || '',
      delivery_price: (settings.delivery_price ?? 5).toString(),
      free_delivery_min_items: (settings.free_delivery_min_items ?? 4).toString(),
      manager_username: settings.manager_username || '',
      delivery_card_title: settings.delivery_card_title || 'Доставка курьером по Могилеву и области',
      delivery_card_subtitle: settings.delivery_card_subtitle || 'По будням и выходным с 13:00',
      delivery_card_conditions: settings.delivery_card_conditions || 'Стоимость 5.0 BYN • От 4 позиций в заказе — БЕСПЛАТНО',
      delivery_card_note: settings.delivery_card_note || 'Итоговая стоимость доставки может измениться в зависимости от района Могилева.',
    });
  }, [settings]);

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
    let profitToday = 0;
    let profitWeek = 0;
    let profitMonth = 0;
    let profitTotal = 0;
    let deliveryRevenue = 0;
    let deliveryCount = 0;
    let pickupCount = 0;

    const productSalesMap: Record<number, { name: string; emoji: string; count: number; revenue: number; margin: number }> = {};
    const categorySalesMap: Record<string, { name: string; count: number; revenue: number; margin: number }> = {};

    categories.forEach((c) => {
      categorySalesMap[c.slug] = { name: c.name, count: 0, revenue: 0, margin: 0 };
    });

    completedOrders.forEach((order) => {
      const time = new Date(order.created_at).getTime();
      const orderMargin = order.total_margin ?? (order.total * 0.6);

      revenueTotal += order.total;
      profitTotal += orderMargin;
      deliveryRevenue += order.delivery_price || 0;

      if (order.delivery_type === 'delivery') deliveryCount++;
      else pickupCount++;

      if (time >= todayStart) {
        revenueToday += order.total;
        profitToday += orderMargin;
      }
      if (time >= weekAgo) {
        revenueWeek += order.total;
        profitWeek += orderMargin;
      }
      if (time >= monthAgo) {
        revenueMonth += order.total;
        profitMonth += orderMargin;
      }

      order.items_json.forEach((item) => {
        const prod = products.find((p) => p.id === item.id);
        const itemCost = prod?.cost_price ?? (item.price * 0.4);
        const itemMargin = (item.price - itemCost) * item.quantity;

        if (!productSalesMap[item.id]) {
          productSalesMap[item.id] = {
            name: item.name,
            emoji: item.emoji || '📦',
            count: 0,
            revenue: 0,
            margin: 0,
          };
        }
        productSalesMap[item.id].count += item.quantity;
        productSalesMap[item.id].revenue += item.price * item.quantity;
        productSalesMap[item.id].margin += itemMargin;

        if (prod && categorySalesMap[prod.category_slug]) {
          categorySalesMap[prod.category_slug].count += item.quantity;
          categorySalesMap[prod.category_slug].revenue += item.price * item.quantity;
          categorySalesMap[prod.category_slug].margin += itemMargin;
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
      profitToday,
      profitWeek,
      profitMonth,
      profitTotal,
      deliveryRevenue,
      deliveryCount,
      pickupCount,
      totalOrders: orders.length,
      pendingOrdersCount: orders.filter((o) => o.status === 'pending').length,
      topProducts,
      categorySalesMap,
    };
  }, [orders, products, categories]);

  // Open Product Modal for Add/Edit
  const handleOpenProductModal = (product?: Product) => {
    hapticImpact('light');
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        price: product.price.toString(),
        cost_price: product.cost_price ? product.cost_price.toString() : '',
        discount_price: product.discount_price ? product.discount_price.toString() : '',
        category_slug: product.category_slug,
        brand_slug: product.brand_slug || '',
        model_slug: product.model_slug || '',
        nicotine_strength: product.nicotine_strength || '',
        image_url: product.image_url || '',
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
        cost_price: '',
        discount_price: '',
        category_slug: 'liquid',
        brand_slug: '',
        model_slug: '',
        nicotine_strength: '',
        image_url: '',
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

    const price = parseFloat(productForm.price) || 0;
    const costPrice = productForm.cost_price ? parseFloat(productForm.cost_price) : (price * 0.4);
    const marginProfit = Math.max(0, price - costPrice);

    const payload: Partial<Product> = {
      name: productForm.name.trim(),
      price,
      cost_price: costPrice,
      margin_profit: marginProfit,
      discount_price: productForm.discount_price ? parseFloat(productForm.discount_price) : null,
      category_slug: productForm.category_slug,
      brand_slug: productForm.brand_slug || null,
      model_slug: productForm.model_slug || null,
      nicotine_strength: productForm.nicotine_strength || null,
      image_url: productForm.image_url.trim() || null,
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
    { id: 'photos', label: 'Фото товаров', icon: ImageIcon, color: 'text-amber-400', desc: 'Привязка фото: по товару, бренду или категории' },
    { id: 'categories', label: 'Категории', icon: FolderTree, color: 'text-blue-400', desc: `${categories.length} категорий` },
    { id: 'brands', label: 'Бренды & Линейки', icon: Tag, color: 'text-pink-400', desc: `${brands.length} брендов` },
    { id: 'models', label: 'Модели устройств', icon: Boxes, color: 'text-cyan-400', desc: `${models.length} моделей` },
    { id: 'promotions', label: 'Акции и розыгрыши', icon: Gift, color: 'text-amber-400', desc: `${promotions.length} активных акций` },
    { id: 'promocodes', label: 'Генератор промокодов', icon: Ticket, color: 'text-fuchsia-400', desc: `${promocodes.length} промокодов` },
    { id: 'pickup', label: 'Точки самовывоза (Могилев)', icon: MapPin, color: 'text-lime-400', desc: `${pickupPoints.length} локаций в Могилеве` },
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
          {/* Detailed stats modal trigger */}
          <button
            onClick={() => {
              setStatsModalPeriod('today');
              setIsStatsModalOpen(true);
              hapticImpact('medium');
            }}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.35)] tap-active"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Открыть расширенную аналитику и графики</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <div
              onClick={() => {
                setStatsModalPeriod('today');
                setIsStatsModalOpen(true);
                hapticImpact('light');
              }}
              className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-purple-500/20 cursor-pointer transition-all active:scale-98"
            >
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Выручка сегодня</span>
              <span className="text-lg font-black text-purple-300 block">{stats.revenueToday.toFixed(2)} BYN</span>
              {isAdmin && (
                <span className="text-[10px] font-bold text-emerald-400 block mt-0.5">
                  Прибыль: +{stats.profitToday.toFixed(2)} BYN
                </span>
              )}
            </div>

            <div
              onClick={() => {
                setStatsModalPeriod('week');
                setIsStatsModalOpen(true);
                hapticImpact('light');
              }}
              className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-purple-500/20 cursor-pointer transition-all active:scale-98"
            >
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Выручка за 7 дней</span>
              <span className="text-lg font-black text-orange-300 block">{stats.revenueWeek.toFixed(2)} BYN</span>
              {isAdmin && (
                <span className="text-[10px] font-bold text-emerald-400 block mt-0.5">
                  Прибыль: +{stats.profitWeek.toFixed(2)} BYN
                </span>
              )}
            </div>

            <div
              onClick={() => {
                setStatsModalPeriod('month');
                setIsStatsModalOpen(true);
                hapticImpact('light');
              }}
              className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-purple-500/20 cursor-pointer transition-all active:scale-98"
            >
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Выручка за 30 дней</span>
              <span className="text-lg font-black text-fuchsia-300 block">{stats.revenueMonth.toFixed(2)} BYN</span>
              {isAdmin && (
                <span className="text-[10px] font-bold text-emerald-400 block mt-0.5">
                  Прибыль: +{stats.profitMonth.toFixed(2)} BYN
                </span>
              )}
            </div>

            <div
              onClick={() => {
                setStatsModalPeriod('total');
                setIsStatsModalOpen(true);
                hapticImpact('light');
              }}
              className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-purple-500/20 cursor-pointer transition-all active:scale-98"
            >
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Всего оборот</span>
              <span className="text-lg font-black text-emerald-300 block">{stats.revenueTotal.toFixed(2)} BYN</span>
              {isAdmin && (
                <span className="text-[10px] font-bold text-emerald-400 block mt-0.5">
                  Прибыль: +{stats.profitTotal.toFixed(2)} BYN
                </span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Логистика & Доставка</h4>
            <div className="flex justify-between text-xs text-zinc-300">
              <span>Заказов с курьером:</span>
              <span className="font-bold text-white">{stats.deliveryCount}</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-300">
              <span>Самовывозов (встреч):</span>
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
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-zinc-200 truncate pr-2">
                    {item.emoji} {item.name}
                  </span>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-purple-300 block">
                      {item.count} шт. ({item.revenue.toFixed(2)} BYN)
                    </span>
                    {isAdmin && (
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        Прибыль: +{item.margin.toFixed(2)} BYN
                      </span>
                    )}
                  </div>
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
              onClick={() => {
                hapticImpact('medium');
                setIsExportModalOpen(true);
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 tap-active hover:bg-purple-600/30 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Экспорт заказов и отчетов (Excel/CSV)</span>
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
              <option value="ready_for_pickup" className="bg-[#181628]">📍 Менеджер на точке</option>
              <option value="courier_sent" className="bg-[#181628]">🚗 Курьер отправлен</option>
              <option value="courier_arrived" className="bg-[#181628]">📍 Курьер прибыл</option>
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
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-md space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-extrabold text-white">
                        Заказ #{order.id} · <span className="text-purple-400">{order.total.toFixed(2)} BYN</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Клиент: <span className="text-zinc-200 font-semibold">{order.username ? `@${order.username}` : (order.first_name || 'Клиент')}</span>
                        {order.phone && <span className="ml-1 text-zinc-400">({order.phone})</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-purple-300">
                        {order.status === 'pending' && '🔄 В обработке'}
                        {order.status === 'confirmed' && '✅ Подтвержден'}
                        {order.status === 'ready_for_pickup' && '📍 Менеджер на точке'}
                        {order.status === 'courier_sent' && '🚗 Курьер отправлен'}
                        {order.status === 'courier_arrived' && '📍 Курьер прибыл'}
                        {order.status === 'shipped' && '🚚 В пути'}
                        {order.status === 'completed' && '🎉 Выполнен'}
                        {order.status === 'cancelled' && '❌ Отменен'}
                      </span>
                    </div>
                  </div>

                  {/* Customer Quick Chat Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        hapticImpact('medium');
                        if (order.username) {
                          openTelegramOrWeb(`https://t.me/${order.username.replace('@', '')}`);
                        } else if (order.user_id) {
                          openTelegramOrWeb(`tg://user?id=${order.user_id}`);
                        }
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center justify-center gap-2 tap-active-sm transition-all"
                    >
                      <MessageCircle className="w-4 h-4 text-purple-400" />
                      <span>Связаться с заказчиком в Telegram</span>
                    </button>
                  </div>

                  <div className="text-xs text-zinc-300 bg-black/30 p-2.5 rounded-xl space-y-1">
                    <div className="font-semibold text-zinc-200">
                      {order.delivery_type === 'pickup'
                        ? `🏪 Самовывоз (Точка): ${order.pickup_point_name || 'По договоренности'}`
                        : `🚚 Доставка: ${order.delivery_address}`}
                    </div>
                    {order.comment && <div className="text-zinc-400 italic">💬 {order.comment}</div>}
                    <div className="pt-1 font-mono text-[11px] text-zinc-400 border-t border-white/5">
                      {order.items_json.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                    </div>
                    {isAdmin && (
                      <div className="pt-1 text-[11px] text-emerald-400 font-semibold">
                        💎 Расчетная прибыль: +{(order.total_margin ?? (order.total * 0.6)).toFixed(2)} BYN
                      </div>
                    )}
                  </div>

                  {/* Status Action Buttons Workflow */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {/* Status: Pending */}
                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'confirmed')}
                          className="flex-1 py-2 px-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-bold tap-active-sm"
                        >
                          ✅ Принять заказ
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                          className="py-2 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs font-bold tap-active-sm"
                        >
                          Отклонить
                        </button>
                      </>
                    )}

                    {/* Status: Confirmed */}
                    {order.status === 'confirmed' && (
                      <>
                        {order.delivery_type === 'pickup' ? (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'ready_for_pickup')}
                            className="flex-1 py-2 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold tap-active-sm"
                          >
                            📍 Менеджер на месте
                          </button>
                        ) : (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'courier_sent')}
                            className="flex-1 py-2 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold tap-active-sm"
                          >
                            🚗 Курьер отправлен
                          </button>
                        )}
                        <button
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          className="py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold tap-active-sm"
                        >
                          🎉 Выполнен
                        </button>
                      </>
                    )}

                    {/* Status: Ready for pickup (Self-pickup) */}
                    {order.status === 'ready_for_pickup' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/50 text-xs font-bold tap-active-sm flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Выдан клиенту (Завершить заказ)</span>
                      </button>
                    )}

                    {/* Status: Courier sent (Delivery) */}
                    {order.status === 'courier_sent' && (
                      <>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'courier_arrived')}
                          className="flex-1 py-2 px-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold tap-active-sm"
                        >
                          📍 Курьер прибыл на адрес
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          className="py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold tap-active-sm"
                        >
                          🎉 Завершен
                        </button>
                      </>
                    )}

                    {/* Status: Courier arrived (Delivery) */}
                    {order.status === 'courier_arrived' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/50 text-xs font-bold tap-active-sm flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Заказ вручен и оплачен (Выполнен)</span>
                      </button>
                    )}

                    {/* Status: Legacy Shipped */}
                    {order.status === 'shipped' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold tap-active-sm"
                      >
                        ✅ Выполнен (Рассчитан)
                      </button>
                    )}

                    {/* Allow cancel for active orders */}
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        className="text-[11px] text-zinc-400 hover:text-red-400 px-2 py-1 transition-colors ml-auto"
                      >
                        Отменить заказ
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

          {/* Search and Filters */}
          <div className="space-y-2 bg-black/20 p-3 rounded-2xl border border-white/5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
              <input
                type="text"
                value={adminProductSearch}
                onChange={(e) => setAdminProductSearch(e.target.value)}
                placeholder="Поиск по названию товара..."
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder-zinc-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={adminProductCategoryFilter}
                onChange={(e) => setAdminProductCategoryFilter(e.target.value)}
                className="w-full py-2 px-2.5 rounded-xl bg-[#181628] border border-white/10 text-white text-xs"
              >
                <option value="all">Все категории</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>

              <select
                value={adminProductBrandFilter}
                onChange={(e) => setAdminProductBrandFilter(e.target.value)}
                className="w-full py-2 px-2.5 rounded-xl bg-[#181628] border border-white/10 text-white text-xs"
              >
                <option value="all">Все бренды</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {products
              .filter((p) => {
                const matchesSearch = p.name.toLowerCase().includes(adminProductSearch.toLowerCase());
                const matchesCategory = adminProductCategoryFilter === 'all' || p.category_slug === adminProductCategoryFilter;
                
                let matchesBrand = true;
                if (adminProductBrandFilter !== 'all') {
                  const brandObj = brands.find((b) => b.slug === adminProductBrandFilter);
                  const pBrandSlug = p.brand_slug || '';
                  const matchSlug = pBrandSlug === adminProductBrandFilter;
                  const matchName = brandObj && (
                    pBrandSlug.toLowerCase() === brandObj.name.toLowerCase() ||
                    pBrandSlug.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '-') === brandObj.slug ||
                    pBrandSlug.toLowerCase().replace(/\s+/g, '-') === brandObj.slug
                  );
                  matchesBrand = !!(matchSlug || matchName);
                }
                
                return matchesSearch && matchesCategory && matchesBrand;
              })
              .map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10">
                    <ProductImage
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-full"
                      imageClassName="w-full h-full object-contain p-1"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-white truncate">{p.name}</h4>
                      {(!p.in_stock || p.stock_quantity <= 0) && (
                        <span className="px-1.5 py-0.5 rounded-md bg-red-500/20 border border-red-500/30 text-red-300 text-[9px] font-bold shrink-0">
                          Закончился
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      {p.price.toFixed(2)} BYN · Остаток: <span className={p.stock_quantity <= 0 ? 'text-red-400 font-bold' : 'text-zinc-200'}>{p.stock_quantity} шт.</span>
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

      {/* SUBPAGE: PHOTOS HUB */}
      {activeSubpage === 'photos' && (
        <div className="space-y-4">
          {/* Photos Navigation Mode Toggle */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/5">
            <button
              onClick={() => {
                setPhotoTab('single');
                hapticImpact('light');
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center tap-active-sm ${
                photoTab === 'single'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              По товарам
            </button>
            <button
              onClick={() => {
                setPhotoTab('brand');
                hapticImpact('light');
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center tap-active-sm ${
                photoTab === 'brand'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              По бренду
            </button>
            <button
              onClick={() => {
                setPhotoTab('category');
                hapticImpact('light');
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center tap-active-sm ${
                photoTab === 'category'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              По категории
            </button>
          </div>

          {/* TAB 1: INDIVIDUAL PRODUCT PHOTO */}
          {photoTab === 'single' && (
            <div className="space-y-3">
              {/* Search and Filters */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    value={photoSearch}
                    onChange={(e) => setPhotoSearch(e.target.value)}
                    placeholder="Поиск товара для фото..."
                    className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder-zinc-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={photoCategoryFilter}
                    onChange={(e) => setPhotoCategoryFilter(e.target.value)}
                    className="w-full py-2 px-2.5 rounded-xl bg-[#181628] border border-white/10 text-white text-xs"
                  >
                    <option value="all">Все категории</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={photoBrandFilter}
                    onChange={(e) => setPhotoBrandFilter(e.target.value)}
                    className="w-full py-2 px-2.5 rounded-xl bg-[#181628] border border-white/10 text-white text-xs"
                  >
                    <option value="all">Все бренды</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.slug}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Products List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {products
                  .filter((p) => {
                    const matchSearch =
                      !photoSearch ||
                      p.name.toLowerCase().includes(photoSearch.toLowerCase()) ||
                      (p.flavor && p.flavor.toLowerCase().includes(photoSearch.toLowerCase()));
                    const matchCat = photoCategoryFilter === 'all' || p.category_slug === photoCategoryFilter;
                    const matchBrand = photoBrandFilter === 'all' || p.brand_slug === photoBrandFilter;
                    return matchSearch && matchCat && matchBrand;
                  })
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/30 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black/40">
                          <ProductImage
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full"
                            imageClassName="w-full h-full object-contain p-1"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{p.name}</h4>
                          <p className="text-[10px] text-zinc-400">
                            {categories.find((c) => c.slug === p.category_slug)?.name || p.category_slug}
                            {p.brand_slug ? ` · ${brands.find((b) => b.slug === p.brand_slug)?.name || p.brand_slug}` : ''}
                          </p>
                          <span className={`text-[10px] font-semibold ${p.image_url ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {p.image_url ? '✓ Фото установлено' : '• Без фото (плейсхолдер)'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setPhotoModalProduct(p);
                            setPhotoModalUrl(p.image_url || '');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold tap-active-sm"
                        >
                          {p.image_url ? 'Изменить' : 'Установить'}
                        </button>
                        {p.image_url && (
                          <button
                            onClick={() => {
                              updateProduct(p.id, { image_url: '' });
                              hapticNotification('success');
                            }}
                            title="Сбросить фото"
                            className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 tap-active-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Single Product Photo Modal */}
              {photoModalProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                  <div className="relative w-full max-w-sm bg-[#181628] border border-amber-500/30 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Фото для: {photoModalProduct.name}
                      </h3>
                      <button
                        onClick={() => setPhotoModalProduct(null)}
                        className="p-1 rounded-full text-zinc-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Preview */}
                    <div className="w-28 h-28 mx-auto rounded-2xl overflow-hidden border border-amber-500/40 bg-black/50 flex items-center justify-center shadow-md">
                      <ProductImage
                        src={photoModalUrl}
                        alt="Preview"
                        className="w-full h-full"
                        imageClassName="w-full h-full object-contain p-2"
                      />
                    </div>

                    {/* Direct URL input */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">
                        Прямая ссылка на фото (URL):
                      </label>
                      <input
                        type="text"
                        value={photoModalUrl}
                        onChange={(e) => setPhotoModalUrl(e.target.value)}
                        placeholder="https://... или ссылка на фото"
                        className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Upload File */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">Или выберите файл:</label>
                      <label className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all">
                        <Camera className="w-4 h-4 text-amber-400" />
                        <span>Загрузить фото с устройства</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                if (typeof reader.result === 'string') {
                                  setPhotoModalUrl(reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          updateProduct(photoModalProduct.id, { image_url: photoModalUrl });
                          setPhotoModalProduct(null);
                          hapticNotification('success');
                        }}
                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 text-white text-xs font-bold shadow-md tap-active"
                      >
                        Сохранить фото
                      </button>
                      <button
                        onClick={() => setPhotoModalProduct(null)}
                        className="py-3 px-4 rounded-xl bg-white/10 text-zinc-300 text-xs font-bold hover:bg-white/20 tap-active"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BULK PHOTO BY BRAND */}
          {photoTab === 'brand' && (
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-purple-500/20 space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-pink-400" />
                  <span>Массовая установка фото по бренду</span>
                </h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Выберите бренд и примените одно общее фото ко всем товарам этого бренда в один клик.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Выберите бренд:</label>
                <select
                  value={bulkBrandSlug}
                  onChange={(e) => setBulkBrandSlug(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#181628] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Выберите бренд из списка --</option>
                  {brands.map((b) => {
                    const count = products.filter((p) => p.brand_slug === b.slug).length;
                    return (
                      <option key={b.id} value={b.slug}>
                        {b.name} ({count} товаров в базе)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Preview Box */}
              {bulkBrandImageUrl && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-purple-500/30">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-purple-500/40 bg-black/50">
                    <ProductImage
                      src={bulkBrandImageUrl}
                      alt="Brand Preview"
                      className="w-full h-full"
                      imageClassName="w-full h-full object-contain p-1"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-purple-300">Предпросмотр фото бренда</span>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">{bulkBrandImageUrl}</p>
                  </div>
                  <button
                    onClick={() => setBulkBrandImageUrl('')}
                    className="p-1 rounded-lg text-zinc-400 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* URL Input */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Прямая ссылка на фото бренда (URL):
                </label>
                <input
                  type="text"
                  value={bulkBrandImageUrl}
                  onChange={(e) => setBulkBrandImageUrl(e.target.value)}
                  placeholder="https://... или прямая ссылка на фото"
                  className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Upload File */}
              <div>
                <label className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all">
                  <UploadCloud className="w-4 h-4 text-pink-400" />
                  <span>Загрузить фото бренда с устройства</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            setBulkBrandImageUrl(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>

              <button
                disabled={!bulkBrandSlug || !bulkBrandImageUrl}
                onClick={async () => {
                  if (!bulkBrandSlug || !bulkBrandImageUrl) return;
                  const matchingCount = products.filter((p) => p.brand_slug === bulkBrandSlug).length;
                  const brandObj = brands.find((b) => b.slug === bulkBrandSlug);
                  if (
                    confirm(
                      `Применить это фото ко всем товарам бренда "${brandObj?.name || bulkBrandSlug}" (${matchingCount} шт.)?`
                    )
                  ) {
                    const count = await bulkUpdateProductImage({ brand_slug: bulkBrandSlug }, bulkBrandImageUrl);
                    alert(`✅ Фото успешно установлено для ${count} товаров бренда!`);
                    setBulkBrandImageUrl('');
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-bold shadow-md tap-active disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Применить фото ко всем товарам бренда
              </button>
            </div>
          )}

          {/* TAB 3: BULK PHOTO BY CATEGORY */}
          {photoTab === 'category' && (
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-blue-500/20 space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-cyan-400" />
                  <span>Массовая установка фото по категории</span>
                </h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Установите общее фото для всех товаров определенной категории (жидкости, одноразки, поды, картриджи, снюс).
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Выберите категорию:</label>
                <select
                  value={bulkCategorySlug}
                  onChange={(e) => setBulkCategorySlug(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#181628] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  {categories.map((c) => {
                    const count = products.filter((p) => p.category_slug === c.slug).length;
                    return (
                      <option key={c.id} value={c.slug}>
                        {c.icon} {c.name} ({count} товаров в базе)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Preview Box */}
              {bulkCategoryImageUrl && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-blue-500/30">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-blue-500/40 bg-black/50">
                    <ProductImage
                      src={bulkCategoryImageUrl}
                      alt="Category Preview"
                      className="w-full h-full"
                      imageClassName="w-full h-full object-contain p-1"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-cyan-300">Предпросмотр фото категории</span>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">{bulkCategoryImageUrl}</p>
                  </div>
                  <button
                    onClick={() => setBulkCategoryImageUrl('')}
                    className="p-1 rounded-lg text-zinc-400 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* URL Input */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Прямая ссылка на фото категории (URL):
                </label>
                <input
                  type="text"
                  value={bulkCategoryImageUrl}
                  onChange={(e) => setBulkCategoryImageUrl(e.target.value)}
                  placeholder="https://... или прямая ссылка на фото"
                  className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Upload File */}
              <div>
                <label className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all">
                  <UploadCloud className="w-4 h-4 text-cyan-400" />
                  <span>Загрузить фото категории с устройства</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            setBulkCategoryImageUrl(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>

              <button
                disabled={!bulkCategorySlug || !bulkCategoryImageUrl}
                onClick={async () => {
                  if (!bulkCategorySlug || !bulkCategoryImageUrl) return;
                  const matchingCount = products.filter((p) => p.category_slug === bulkCategorySlug).length;
                  const catObj = categories.find((c) => c.slug === bulkCategorySlug);
                  if (
                    confirm(
                      `Применить это фото ко всем товарам категории "${catObj?.name || bulkCategorySlug}" (${matchingCount} шт.)?`
                    )
                  ) {
                    const count = await bulkUpdateProductImage({ category_slug: bulkCategorySlug }, bulkCategoryImageUrl);
                    alert(`✅ Фото успешно установлено для ${count} товаров категории!`);
                    setBulkCategoryImageUrl('');
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold shadow-md tap-active disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Применить фото ко всем товарам категории
              </button>
            </div>
          )}
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
          <button
            onClick={() => {
              setIsMassImportModalOpen(true);
              hapticImpact('medium');
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-purple-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(20,184,166,0.35)] tap-active hover:brightness-110 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Запустить умный мастер импорта (Excel, CSV, линейки)</span>
          </button>

          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-zinc-300 leading-relaxed">
            <span className="font-bold text-white block mb-1">Быстрая вставка через символ | или ;:</span>
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
            <label className="text-xs font-bold text-zinc-300 block mb-1">URL логотипа магазина</label>
            <div className="flex gap-3 items-center mb-2">
              <img
                src={settingsForm.logo_url || '/logo.png'}
                alt="Logo Preview"
                className="w-12 h-12 rounded-xl object-cover border border-purple-500/40 shadow-sm shrink-0 bg-black/40"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={settingsForm.logo_url}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, logo_url: e.target.value }))}
                  placeholder="/logo.png или прямая ссылка https://..."
                  className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  По умолчанию используется встроенный файл <code>/logo.png</code>. Также можно вставить прямую ссылку на картинку с любого фотохостинга (Imgur, Postimages, Telegram и др.).
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Card Customization */}
          <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-2.5">
            <h5 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              <span>Оформление карточки курьерской доставки в корзине</span>
            </h5>
            
            <div>
              <label className="text-[11px] font-medium text-zinc-300 block mb-1">Заголовок карточки доставки:</label>
              <input
                type="text"
                value={settingsForm.delivery_card_title}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, delivery_card_title: e.target.value }))}
                placeholder="Доставка курьером по Могилеву и области"
                className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-300 block mb-1">Время / график доставки (подзаголовок):</label>
              <input
                type="text"
                value={settingsForm.delivery_card_subtitle}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, delivery_card_subtitle: e.target.value }))}
                placeholder="По будням и выходным с 13:00"
                className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-300 block mb-1">Текст условий и тарифов:</label>
              <input
                type="text"
                value={settingsForm.delivery_card_conditions}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, delivery_card_conditions: e.target.value }))}
                placeholder="Стоимость 5.0 BYN • От 4 позиций в заказе — БЕСПЛАТНО"
                className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-300 block mb-1">Предупреждение / примечание по району:</label>
              <textarea
                value={settingsForm.delivery_card_note}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, delivery_card_note: e.target.value }))}
                rows={2}
                placeholder="Итоговая стоимость доставки может измениться в зависимости от района Могилева."
                className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
              />
            </div>
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
                delivery_card_title: settingsForm.delivery_card_title,
                delivery_card_subtitle: settingsForm.delivery_card_subtitle,
                delivery_card_conditions: settingsForm.delivery_card_conditions,
                delivery_card_note: settingsForm.delivery_card_note,
              });
              alert('Настройки успешно сохранены!');
            }}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 text-white text-xs font-bold tap-active"
          >
            Сохранить настройки
          </button>

          {/* Database Backup & Restore */}
          <div className="pt-3 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>💾 База данных (Бэкап и Восстановление)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowDbTools((prev) => !prev)}
                className="text-[11px] font-semibold text-purple-400 hover:text-purple-300"
              >
                {showDbTools ? 'Скрыть' : 'Открыть инструменты'}
              </button>
            </div>

            {showDbTools && (
              <div className="p-3 rounded-xl bg-black/40 border border-purple-500/20 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const dump = exportDatabaseDump();
                      navigator.clipboard.writeText(dump);
                      alert('JSON дамп базы данных успешно скопирован в буфер обмена!');
                    }}
                    className="py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-[11px] font-semibold hover:bg-white/10"
                  >
                    📋 Скопировать JSON дамп
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          'Вы уверены, что хотите сбросить базу данных к чистой версии? Будут очищены все товары, бренды, заказы и промокоды, сохранятся только оформление главной страницы, акции и администраторы.'
                        )
                      ) {
                        resetDatabaseDefaults();
                        alert('База данных успешно сброшена к чистой версии!');
                      }
                    }}
                    className="py-2 px-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-[11px] font-semibold hover:bg-red-500/30"
                  >
                    ⚠️ Сброс к дефолту
                  </button>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] text-zinc-400 block">Импорт JSON дампа базы данных:</label>
                  <textarea
                    value={dbDumpInput}
                    onChange={(e) => setDbDumpInput(e.target.value)}
                    placeholder="Вставьте сюда валидный JSON дамп..."
                    rows={3}
                    className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-[10px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!dbDumpInput.trim()) return;
                      const ok = importDatabaseDump(dbDumpInput.trim());
                      if (ok) {
                        alert('База данных успешно обновлена из дампа!');
                        setDbDumpInput('');
                      } else {
                        alert('Ошибка парсинга JSON дампа!');
                      }
                    }}
                    className="w-full py-2 rounded-lg bg-purple-600/50 border border-purple-500/50 text-white text-xs font-bold"
                  >
                    Восстановить базу из JSON
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBPAGE: PICKUP */}
      {activeSubpage === 'pickup' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-purple-500/20 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Добавить точку выдачи (Могилев)</h4>
            <input
              type="text"
              value={pickupForm.name}
              onChange={(e) => setPickupForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Название (напр. ТЦ Атриум / Центр)"
              className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
            <input
              type="text"
              value={pickupForm.address}
              onChange={(e) => setPickupForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Адрес (г. Могилев, ул. Первомайская, 57)"
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
            <p className="text-[11px] text-zinc-400">
              Можно указать <b>Telegram ID</b> (числовой), либо <b>Username</b> (с @ или без).
            </p>
            <input
              type="text"
              value={moderatorForm.user_id}
              onChange={(e) => setModeratorForm((prev) => ({ ...prev, user_id: e.target.value }))}
              placeholder="Telegram ID пользователя (например: 5659638424)"
              className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
            <input
              type="text"
              value={moderatorForm.username}
              onChange={(e) => setModeratorForm((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="Username в Telegram (например: @manager_mogilev)"
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
                const uid = moderatorForm.user_id.trim();
                const uname = moderatorForm.username.trim();
                if (!uid && !uname) {
                  alert('Пожалуйста, укажите Telegram ID или @username сотрудника');
                  return;
                }
                addAdminUser(
                  uid ? parseInt(uid, 10) : null,
                  uname,
                  moderatorForm.role
                );
                setModeratorForm({ user_id: '', username: '', role: 'moderator' });
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 text-white text-xs font-bold tap-active"
            >
              Добавить сотрудника
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-bold text-zinc-400 uppercase px-1">
              Активные сотрудники ({admins.length})
            </div>
            {admins.map((adm) => (
              <div
                key={adm.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>@{adm.username ? adm.username.replace(/^@/, '') : 'пользователь'}</span>
                    {adm.user_id > 0 && <span className="text-zinc-500 font-normal text-[11px]">(ID: {adm.user_id})</span>}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                    {adm.role === 'admin' ? 'Администратор' : 'Модератор'}
                  </span>
                </div>
                <button
                  onClick={() => deleteAdminUser(adm.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                  title="Удалить доступ"
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
                  is_active: true,
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
              const brandProductsCount = products.filter((p) => {
                const pBrandSlug = p.brand_slug || '';
                return pBrandSlug === b.slug || 
                  pBrandSlug.toLowerCase() === b.name.toLowerCase() ||
                  pBrandSlug.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '-') === b.slug ||
                  pBrandSlug.toLowerCase().replace(/\s+/g, '-') === b.slug;
              }).length;
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
                  <label className="text-xs text-zinc-300 block mb-1">Розничная цена (BYN)</label>
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

              {/* Cost Price & Margin Calculation (Admin Only) */}
              {isAdmin && (
                <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-purple-300 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5" />
                      <span>Себестоимость товара</span>
                    </label>
                    <span className="text-[10px] text-zinc-400">Только для админов</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 items-center">
                    <div>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Напр. 4.00"
                        value={productForm.cost_price}
                        onChange={(e) => setProductForm((prev) => ({ ...prev, cost_price: e.target.value }))}
                        className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
                      />
                    </div>
                    <div className="text-right">
                      {(() => {
                        const price = parseFloat(productForm.price) || 0;
                        const cost = productForm.cost_price ? parseFloat(productForm.cost_price) : (price * 0.4);
                        const margin = Math.max(0, price - cost);
                        const percent = price > 0 ? Math.round((margin / price) * 100) : 0;
                        return (
                          <div>
                            <span className="text-[11px] text-zinc-400 block">Чистая прибыль:</span>
                            <span className="text-xs font-black text-emerald-400">
                              +{margin.toFixed(2)} BYN ({percent}%)
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

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
                  <label className="text-xs text-zinc-300 block mb-1">Бренд товара</label>
                  <select
                    value={productForm.brand_slug}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, brand_slug: e.target.value }))}
                    className="w-full py-2 px-2 rounded-xl bg-[#181628] border border-white/10 text-white text-xs"
                  >
                    <option value="">-- Без бренда --</option>
                    {brands.map((b) => (
                      <option key={b.slug} value={b.slug}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Остаток (шт)</label>
                  <input
                    type="number"
                    value={productForm.stock_quantity}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, stock_quantity: e.target.value }))}
                    className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Крепость (мг)</label>
                  <input
                    type="text"
                    placeholder="Напр. 20 мг, 50 мг"
                    value={productForm.nicotine_strength}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, nicotine_strength: e.target.value }))}
                    className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>

              {/* Photo & Image URL */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <label className="text-xs font-semibold text-zinc-300 block">Фотография товара</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-white/15">
                    <ProductImage
                      src={productForm.image_url}
                      alt="Предпросмотр"
                      className="w-full h-full"
                      imageClassName="w-full h-full object-contain p-1"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      placeholder="Ссылка на фото (URL)"
                      value={productForm.image_url}
                      onChange={(e) => setProductForm((prev) => ({ ...prev, image_url: e.target.value }))}
                      className="w-full py-1.5 px-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-[11px] font-bold cursor-pointer hover:bg-purple-500/30 transition-all">
                      <span>📁 Загрузить файл</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                setProductForm((prev) => ({ ...prev, image_url: reader.result as string }));
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
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

      {/* DETAILED STATS MODAL */}
      <DetailedStatsModal
        isOpen={isStatsModalOpen}
        initialPeriod={statsModalPeriod}
        onClose={() => setIsStatsModalOpen(false)}
      />

      {/* MASS IMPORT MODAL */}
      <MassImportModal
        isOpen={isMassImportModalOpen}
        onClose={() => setIsMassImportModalOpen(false)}
      />

      {/* ORDER EXPORT MODAL */}
      <OrderExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};
