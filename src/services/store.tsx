import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Category,
  Brand,
  ProductModel,
  AttributeGroup,
  AttributeValue,
  Product,
  ProductColor,
  CartItem,
  Order,
  Promotion,
  Promocode,
  PickupPoint,
  ShopSettings,
  AdminUser,
  TelegramUser,
  OrderStatus,
  DeliveryType,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_BRANDS,
  INITIAL_MODELS,
  INITIAL_ATTRIBUTE_GROUPS,
  INITIAL_ATTRIBUTE_VALUES,
  INITIAL_PRODUCTS,
  INITIAL_PRODUCT_COLORS,
  INITIAL_PICKUP_POINTS,
  INITIAL_PROMOTIONS,
  INITIAL_PROMOCODES,
  INITIAL_SETTINGS,
  INITIAL_ADMINS,
} from './mockData';
import { getTelegramWebApp, hapticImpact, hapticNotification } from './telegram';

export const SUPABASE_URL = 'https://prtwcgqidlivkaanbowl.supabase.co';
export const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydHdjZ3FpZGxpdmthYW5ib3dsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc3MzcwNiwiZXhwIjoyMTAyMzQ5NzA2fQ.dvZAnH78ThbtWUTcn9mwveBXhV4RtyefUeFit4mHEUI';
export const BOT_TOKEN = '8870349321:AAEXFersNinRpHnPETbR_vGFn_TnGWOCums';
export const HARDCODED_ADMINS = [5659638424, 8161417737];

interface StoreContextType {
  // State
  currentUser: TelegramUser | null;
  isAdmin: boolean;
  isModerator: boolean;
  settings: ShopSettings;
  categories: Category[];
  brands: Brand[];
  models: ProductModel[];
  attributeGroups: AttributeGroup[];
  attributeValues: AttributeValue[];
  products: Product[];
  productColors: ProductColor[];
  cart: CartItem[];
  orders: Order[];
  promotions: Promotion[];
  promocodes: Promocode[];
  pickupPoints: PickupPoint[];
  admins: AdminUser[];
  appliedPromocode: Promocode | null;
  isLoading: boolean;

  // Actions
  setCurrentUser: (user: TelegramUser | null) => void;
  toggleTestAdmin: () => void;
  loadAllData: () => Promise<void>;
  addToCart: (product: Product, quantity?: number, colorId?: number | null) => void;
  removeFromCart: (index: number) => void;
  updateCartQuantity: (index: number, delta: number) => void;
  clearCart: () => void;
  applyPromocode: (code: string) => { success: boolean; message: string };
  removePromocode: () => void;
  placeOrder: (params: {
    deliveryType: DeliveryType;
    pickupPointId?: number | null;
    deliveryAddress?: string | null;
    comment?: string | null;
  }) => Promise<{ success: boolean; orderId?: number; total?: number; error?: string }>;
  updateOrderStatus: (orderId: number, newStatus: OrderStatus) => Promise<boolean>;
  cancelOrder: (orderId: number) => Promise<boolean>;

  // Admin Actions
  saveSettings: (newSettings: Partial<ShopSettings>) => Promise<boolean>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<boolean>;
  updateProduct: (id: number, product: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: number) => Promise<boolean>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<boolean>;
  deleteCategory: (id: number) => Promise<boolean>;
  addBrand: (brand: Omit<Brand, 'id'>) => Promise<boolean>;
  deleteBrand: (id: number) => Promise<boolean>;
  addBrandLine: (attributeGroupSlug: string, lineName: string) => Promise<boolean>;
  deleteBrandLine: (id: number) => Promise<boolean>;
  addModel: (model: Omit<ProductModel, 'id'>) => Promise<boolean>;
  deleteModel: (id: number) => Promise<boolean>;
  addPromotion: (promo: Omit<Promotion, 'id'>) => Promise<boolean>;
  deletePromotion: (id: number) => Promise<boolean>;
  addPromocode: (code: Omit<Promocode, 'id' | 'used_count'>) => Promise<boolean>;
  deletePromocode: (id: number) => Promise<boolean>;
  addPickupPoint: (point: Omit<PickupPoint, 'id'>) => Promise<boolean>;
  deletePickupPoint: (id: number) => Promise<boolean>;
  addAdminUser: (userId: number, username: string, role: 'admin' | 'moderator') => Promise<boolean>;
  deleteAdminUser: (id: number) => Promise<boolean>;
  importProducts: (
    items: Array<{
      name: string;
      price: number;
      category: string;
      brand?: string;
      model?: string;
      flavor?: string;
      strength?: string;
      stock?: number;
      emoji?: string;
    }>
  ) => Promise<{ successCount: number; errors: string[] }>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<TelegramUser | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isModerator, setIsModerator] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [settings, setSettings] = useState<ShopSettings>(() => {
    const saved = localStorage.getItem('puff_settings_v2');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('puff_categories_v2');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [brands, setBrands] = useState<Brand[]>(() => {
    const saved = localStorage.getItem('puff_brands_v2');
    return saved ? JSON.parse(saved) : INITIAL_BRANDS;
  });

  const [models, setModels] = useState<ProductModel[]>(() => {
    const saved = localStorage.getItem('puff_models_v2');
    return saved ? JSON.parse(saved) : INITIAL_MODELS;
  });

  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>(() => {
    const saved = localStorage.getItem('puff_attr_groups_v2');
    return saved ? JSON.parse(saved) : INITIAL_ATTRIBUTE_GROUPS;
  });

  const [attributeValues, setAttributeValues] = useState<AttributeValue[]>(() => {
    const saved = localStorage.getItem('puff_attr_values_v2');
    return saved ? JSON.parse(saved) : INITIAL_ATTRIBUTE_VALUES;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('puff_products_v2');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [productColors, setProductColors] = useState<ProductColor[]>(() => {
    const saved = localStorage.getItem('puff_colors_v2');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCT_COLORS;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('puff_cart_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('puff_orders_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [promotions, setPromotions] = useState<Promotion[]>(() => {
    const saved = localStorage.getItem('puff_promos_v2');
    return saved ? JSON.parse(saved) : INITIAL_PROMOTIONS;
  });

  const [promocodes, setPromocodes] = useState<Promocode[]>(() => {
    const saved = localStorage.getItem('puff_promocodes_v2');
    return saved ? JSON.parse(saved) : INITIAL_PROMOCODES;
  });

  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>(() => {
    const saved = localStorage.getItem('puff_pickup_v2');
    return saved ? JSON.parse(saved) : INITIAL_PICKUP_POINTS;
  });

  const [admins, setAdmins] = useState<AdminUser[]>(() => {
    const saved = localStorage.getItem('puff_admins_v2');
    return saved ? JSON.parse(saved) : INITIAL_ADMINS;
  });

  const [appliedPromocode, setAppliedPromocode] = useState<Promocode | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('puff_cart_v2', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('puff_products_v2', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('puff_orders_v2', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('puff_settings_v2', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('puff_categories_v2', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('puff_brands_v2', JSON.stringify(brands));
  }, [brands]);

  useEffect(() => {
    localStorage.setItem('puff_promos_v2', JSON.stringify(promotions));
  }, [promotions]);

  useEffect(() => {
    localStorage.setItem('puff_promocodes_v2', JSON.stringify(promocodes));
  }, [promocodes]);

  useEffect(() => {
    localStorage.setItem('puff_pickup_v2', JSON.stringify(pickupPoints));
  }, [pickupPoints]);

  useEffect(() => {
    localStorage.setItem('puff_admins_v2', JSON.stringify(admins));
  }, [admins]);

  // Supabase REST helper
  const supabaseRequest = useCallback(
    async (path: string, method: string = 'GET', body?: unknown, headers: Record<string, string> = {}) => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
          method,
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: method === 'POST' ? 'return=representation' : undefined,
            ...headers,
          } as HeadersInit,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
          const errText = await res.text();
          console.warn(`Supabase ${method} ${path} error:`, res.status, errText);
          return null;
        }
        if (res.status === 204) return true;
        const text = await res.text();
        return text ? JSON.parse(text) : true;
      } catch (e) {
        console.warn(`Supabase network exception for ${path}:`, e);
        return null;
      }
    },
    []
  );

  // Supabase REST fetch helper
  const fetchSupabase = useCallback(async (table: string, filters: Record<string, unknown> = {}, order?: { by: string; direction?: string }) => {
    try {
      let url = `${table}?select=*`;
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          url += `&${key}=eq.${filters[key]}`;
        }
      });
      if (order?.by) {
        url += `&order=${order.by}.${order.direction || 'asc'}`;
      }
      return await supabaseRequest(url, 'GET');
    } catch (e) {
      console.warn(`Supabase fetch warning for ${table}:`, e);
      return null;
    }
  }, [supabaseRequest]);

  // Check admin status
  const checkAdminPrivileges = useCallback((user: TelegramUser | null, adminList: AdminUser[]) => {
    if (!user) {
      // In dev / preview mode, default to true or check toggle
      const devAdmin = localStorage.getItem('puff_dev_is_admin');
      if (devAdmin === 'true') {
        setIsAdmin(true);
        setIsModerator(true);
        return;
      }
      return;
    }

    const numericUserId = Number(user.id);
    if (HARDCODED_ADMINS.includes(numericUserId)) {
      setIsAdmin(true);
      setIsModerator(true);
      return;
    }

    const match = adminList.find((a) => Number(a.user_id) === numericUserId && a.is_active);
    if (match) {
      setIsAdmin(match.role === 'admin');
      setIsModerator(true);
    } else {
      setIsAdmin(false);
      setIsModerator(false);
    }
  }, []);

  // Load all data from Supabase or Fallback
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        settingsData,
        categoriesData,
        brandsData,
        modelsData,
        attrGroupsData,
        attrValuesData,
        colorsData,
        productsData,
        pickupData,
        promotionsData,
        promocodesData,
        adminsData,
        ordersData,
      ] = await Promise.all([
        fetchSupabase('settings'),
        fetchSupabase('categories', { is_active: true }, { by: 'sort_order' }),
        fetchSupabase('brands', { is_active: true }, { by: 'sort_order' }),
        fetchSupabase('product_models', { is_active: true }, { by: 'sort_order' }),
        fetchSupabase('attribute_groups', { is_active: true }, { by: 'sort_order' }),
        fetchSupabase('attribute_values', { is_active: true }, { by: 'sort_order' }),
        fetchSupabase('product_colors', {}, { by: 'sort_order' }),
        fetchSupabase('products'),
        fetchSupabase('pickup_points', { is_active: true }, { by: 'sort_order' }),
        fetchSupabase('promotions', { is_active: true }, { by: 'sort_order' }),
        fetchSupabase('promocodes', { is_active: true }),
        fetchSupabase('admins', { is_active: true }),
        fetchSupabase('orders', {}, { by: 'created_at', direction: 'desc' }),
      ]);

      if (settingsData && settingsData.length > 0) {
        const map: Record<string, string> = {};
        settingsData.forEach((s: { key: string; value: string }) => {
          map[s.key] = s.value;
        });
        setSettings((prev) => ({
          welcome_title: map.welcome_title || prev.welcome_title,
          welcome_description: map.welcome_description || prev.welcome_description,
          logo_url: map.logo_url || prev.logo_url,
          delivery_price: parseFloat(map.delivery_price) || prev.delivery_price,
          free_delivery_min_items: parseInt(map.free_delivery_min_items) || prev.free_delivery_min_items,
          manager_username: map.manager_username || prev.manager_username,
        }));
      }

      if (categoriesData && categoriesData.length > 0) setCategories(categoriesData);
      if (brandsData && brandsData.length > 0) setBrands(brandsData);
      if (modelsData && modelsData.length > 0) setModels(modelsData);
      if (attrGroupsData && attrGroupsData.length > 0) setAttributeGroups(attrGroupsData);
      if (attrValuesData && attrValuesData.length > 0) setAttributeValues(attrValuesData);
      if (colorsData && colorsData.length > 0) setProductColors(colorsData);
      if (productsData && productsData.length > 0) {
        setProducts(
          productsData.map((p: Product) => ({
            ...p,
            in_stock: p.in_stock !== false && (p.stock_quantity || 0) > 0,
          }))
        );
      }
      if (pickupData && pickupData.length > 0) setPickupPoints(pickupData);
      if (promotionsData && promotionsData.length > 0) setPromotions(promotionsData);
      if (promocodesData && promocodesData.length > 0) setPromocodes(promocodesData);
      if (adminsData && adminsData.length > 0) {
        setAdmins(adminsData);
        checkAdminPrivileges(currentUser, adminsData);
      }
      if (ordersData && ordersData.length > 0) {
        setOrders(ordersData);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchSupabase, checkAdminPrivileges, currentUser]);

  // Init User & Data on Mount
  useEffect(() => {
    const tg = getTelegramWebApp();
    const tgUser = tg?.initDataUnsafe?.user;

    if (tgUser) {
      setCurrentUser(tgUser);
      checkAdminPrivileges(tgUser, admins);
    } else {
      // Default preview test user
      const defaultUser: TelegramUser = {
        id: 5659638424,
        first_name: 'Покупатель',
        username: 'puff_guest',
      };
      setCurrentUser(defaultUser);
      checkAdminPrivileges(defaultUser, admins);
    }

    loadAllData();
  }, []);

  const toggleTestAdmin = () => {
    const current = !isAdmin;
    setIsAdmin(current);
    setIsModerator(current);
    localStorage.setItem('puff_dev_is_admin', current ? 'true' : 'false');
    hapticNotification('success');
  };

  // Cart operations
  const addToCart = (product: Product, quantity = 1, colorId: number | null = null) => {
    hapticImpact('medium');
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === product.id && item.color_id === colorId);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = (updated[existingIndex].quantity || 1) + quantity;
        if (newQty > product.stock_quantity) {
          return prev;
        }
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
        return updated;
      }
      const selectedColor = colorId ? productColors.find((c) => c.id === colorId) : null;
      return [
        ...prev,
        {
          ...product,
          quantity,
          color_id: colorId,
          selected_color_name: selectedColor?.color_name,
        },
      ];
    });
  };

  const removeFromCart = (index: number) => {
    hapticImpact('light');
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCartQuantity = (index: number, delta: number) => {
    hapticImpact('light');
    setCart((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      const product = products.find((p) => p.id === item.id);
      if (product && newQty > product.stock_quantity) {
        return prev;
      }
      const updated = [...prev];
      updated[index] = { ...item, quantity: newQty };
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    setAppliedPromocode(null);
  };

  // Promocode logic
  const applyPromocode = (codeStr: string) => {
    const cleanCode = codeStr.trim().toUpperCase();
    const codeObj = promocodes.find((p) => p.code.toUpperCase() === cleanCode && p.is_active);

    if (!codeObj) {
      hapticNotification('error');
      return { success: false, message: 'Промокод не найден или неактивен' };
    }

    if (codeObj.valid_until && new Date(codeObj.valid_until) < new Date()) {
      hapticNotification('error');
      return { success: false, message: 'Срок действия промокода истёк' };
    }

    if (codeObj.max_uses && codeObj.used_count >= codeObj.max_uses) {
      hapticNotification('error');
      return { success: false, message: 'Лимит использований промокода исчерпан' };
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.discount_price || item.price) * item.quantity, 0);
    if (codeObj.min_order_amount && subtotal < codeObj.min_order_amount) {
      hapticNotification('error');
      return { success: false, message: `Минимальная сумма заказа: ${codeObj.min_order_amount} BYN` };
    }

    setAppliedPromocode(codeObj);
    hapticNotification('success');
    return {
      success: true,
      message: `Промокод применён! Скидка ${codeObj.discount_value}${codeObj.discount_type === 'percent' ? '%' : ' BYN'}`,
    };
  };

  const removePromocode = () => {
    setAppliedPromocode(null);
    hapticImpact('light');
  };

  // Place Order
  const placeOrder = async (params: {
    deliveryType: DeliveryType;
    pickupPointId?: number | null;
    deliveryAddress?: string | null;
    comment?: string | null;
  }) => {
    if (cart.length === 0) {
      return { success: false, error: 'Корзина пуста' };
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.discount_price || item.price) * item.quantity, 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    let deliveryPrice = 0;
    if (params.deliveryType === 'delivery') {
      deliveryPrice = totalItems >= settings.free_delivery_min_items ? 0 : settings.delivery_price;
    }

    let discountAmount = 0;
    if (appliedPromocode) {
      if (appliedPromocode.discount_type === 'percent') {
        discountAmount = (subtotal * appliedPromocode.discount_value) / 100;
      } else {
        discountAmount = Math.min(appliedPromocode.discount_value, subtotal);
      }
    }

    const total = Math.max(0, subtotal - discountAmount + deliveryPrice);
    const pickupPoint = params.pickupPointId ? pickupPoints.find((p) => p.id === params.pickupPointId) : null;

    const newOrder: Order = {
      id: Date.now() % 100000 + Math.floor(Math.random() * 100),
      user_id: currentUser?.id || 1,
      username: currentUser?.username || currentUser?.first_name || 'Гость',
      first_name: currentUser?.first_name || '',
      last_name: currentUser?.last_name || '',
      phone: '',
      subtotal,
      discount_amount: discountAmount,
      delivery_price: deliveryPrice,
      total,
      currency: 'BYN',
      delivery_type: params.deliveryType,
      pickup_point_id: params.pickupPointId || null,
      pickup_point_name: pickupPoint ? `${pickupPoint.name} (${pickupPoint.address})` : null,
      delivery_address: params.deliveryType === 'delivery' ? params.deliveryAddress || '' : null,
      delivery_comment: params.comment || null,
      comment: params.comment || null,
      promocode_id: appliedPromocode?.id || null,
      promocode_code: appliedPromocode?.code || null,
      items_json: cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.discount_price || item.price,
        quantity: item.quantity,
        emoji: item.emoji,
        color_id: item.color_id || null,
        color_name: item.selected_color_name,
      })),
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Save locally
    setOrders((prev) => [newOrder, ...prev]);

    // Send to Supabase
    try {
      const orderInsertRes = await supabaseRequest('orders', 'POST', {
        user_id: newOrder.user_id,
        username: newOrder.username,
        first_name: newOrder.first_name,
        last_name: newOrder.last_name,
        phone: newOrder.phone || 'Не указан',
        subtotal: newOrder.subtotal,
        discount_amount: newOrder.discount_amount,
        delivery_price: newOrder.delivery_price,
        total: newOrder.total,
        final_total: newOrder.total,
        currency: newOrder.currency,
        delivery_type: newOrder.delivery_type,
        pickup_point_id: newOrder.pickup_point_id,
        pickup_point_name: newOrder.pickup_point_name,
        delivery_address: newOrder.delivery_address,
        delivery_comment: newOrder.delivery_comment,
        comment: newOrder.comment,
        promocode_id: newOrder.promocode_id,
        promocode_code: newOrder.promocode_code,
        items_json: newOrder.items_json,
        status: 'pending',
      });

      // Insert individual order items if Supabase returned order ID
      const createdOrderId = Array.isArray(orderInsertRes) && orderInsertRes[0]?.id ? orderInsertRes[0].id : newOrder.id;
      for (const item of newOrder.items_json) {
        try {
          await supabaseRequest('order_items', 'POST', {
            order_id: createdOrderId,
            product_id: item.id,
            product_name: item.name,
            price: item.price,
            quantity: item.quantity,
          });
        } catch (itemErr) {
          // ignore
        }
      }
    } catch (e) {
      console.warn('Could not post to Supabase:', e);
    }

    // Direct Telegram notification to hardcoded Admins
    if (BOT_TOKEN) {
      const itemsListText = newOrder.items_json
        .map((it) => `  • ${it.emoji || '📦'} ${it.name} × ${it.quantity} — ${it.price} BYN`)
        .join('\n');

      const deliveryInfo =
        newOrder.delivery_type === 'pickup'
          ? `🏪 <b>Самовывоз:</b> ${newOrder.pickup_point_name || 'Точка не указана'}`
          : `🚚 <b>Доставка:</b> ${newOrder.delivery_address || 'Адрес не указан'} (+${newOrder.delivery_price} BYN)`;

      let priceInfo = `💰 <b>Итого:</b> ${newOrder.total} BYN`;
      if (newOrder.discount_amount > 0) {
        priceInfo += `\n   Скидка: -${newOrder.discount_amount} BYN`;
      }
      if (newOrder.promocode_code) {
        priceInfo += `\n   Промокод: ${newOrder.promocode_code}`;
      }

      const adminNotice = `🆕 <b>НОВЫЙ ЗАКАЗ #${newOrder.id}!</b>

👤 <b>Покупатель:</b> @${currentUser?.username || 'unknown'} (${currentUser?.first_name || 'Пользователь'})
🆔 <b>User ID:</b> <code>${newOrder.user_id}</code>

📦 <b>Товары:</b>
${itemsListText}

${priceInfo}

${deliveryInfo}
💬 <b>Комментарий:</b> ${newOrder.comment || 'Нет'}

🔗 <a href="tg://user?id=${newOrder.user_id}">✉️ Связаться с покупателем</a>
📩 Менеджер: @puff_mngr`;

      for (const adminId of HARDCODED_ADMINS) {
        try {
          fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: adminId,
              text: adminNotice,
              parse_mode: 'HTML',
            }),
          }).catch(() => {});
        } catch (e) {
          // ignore
        }
      }
    }

    // Send Telegram WebApp data event to connected Python Telegram Bot
    const tg = getTelegramWebApp();
    if (tg?.sendData) {
      try {
        tg.sendData(
          JSON.stringify({
            action: 'order',
            order_id: newOrder.id,
            username: newOrder.username,
            items: newOrder.items_json.map((it) => ({
              id: it.id,
              name: it.name,
              price: it.price,
              quantity: it.quantity,
              emoji: it.emoji || '📦',
            })),
            total: newOrder.total,
            subtotal: newOrder.subtotal,
            discount: newOrder.discount_amount,
            delivery_cost: newOrder.delivery_price,
            currency: 'BYN',
            phone: newOrder.phone || (currentUser?.username ? `@${currentUser.username}` : 'Не указан'),
            delivery_type: newOrder.delivery_type,
            delivery_address: newOrder.delivery_address || undefined,
            pickup_point_name: newOrder.pickup_point_name || undefined,
            comment: newOrder.comment || undefined,
            promocode: newOrder.promocode_code || undefined,
          })
        );
      } catch (e) {
        console.warn('sendData error:', e);
      }
    }

    // Clear cart & applied promo
    clearCart();
    hapticNotification('success');

    return {
      success: true,
      orderId: newOrder.id,
      total: newOrder.total,
    };
  };

  // Update order status (Admin/Moderator)
  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    hapticImpact('medium');

    // If order transitioned to confirmed or completed, deduct inventory
    const orderToUpdate = orders.find((o) => o.id === orderId);

    if (newStatus === 'completed' && orderToUpdate) {
      // Deduct stock for products
      setProducts((prev) =>
        prev.map((prod) => {
          const matchedItem = orderToUpdate.items_json.find((item) => item.id === prod.id);
          if (matchedItem) {
            const updatedStock = Math.max(0, prod.stock_quantity - matchedItem.quantity);
            return {
              ...prod,
              stock_quantity: updatedStock,
              in_stock: updatedStock > 0,
              sold_count: (prod.sold_count || 0) + matchedItem.quantity,
            };
          }
          return prod;
        })
      );

      // Increment promocode usage
      if (orderToUpdate.promocode_id) {
        setPromocodes((prev) =>
          prev.map((promo) =>
            promo.id === orderToUpdate.promocode_id ? { ...promo, used_count: promo.used_count + 1 } : promo
          )
        );
      }
    }

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));

    // Remote sync
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (e) {
      console.warn('Error patching order status in Supabase:', e);
    }

    // Send Bot message to client if userId present
    if (orderToUpdate && orderToUpdate.user_id && BOT_TOKEN) {
      const messages: Record<string, string> = {
        confirmed: `✅ <b>Ваш заказ #${orderId} ПОДТВЕРЖДЕН!</b>\n\nСпасибо за заказ в Puff Paradise! Мы начали сборку.\n\n📩 Менеджер: @${settings.manager_username}`,
        shipped: `📦 <b>Ваш заказ #${orderId} ${orderToUpdate.delivery_type === 'pickup' ? 'готов к выдаче!' : 'ОТПРАВЛЕН курьером!'}</b>\n\nКурьер свяжется с вами.\n\n📩 Менеджер: @${settings.manager_username}`,
        completed: `🎉 <b>Ваш заказ #${orderId} ВЫПОЛНЕН!</b>\n\nБлагодарим за выбор Puff Paradise Shop! Ждем вас снова! ❤️\n\n📩 Менеджер: @${settings.manager_username}`,
        cancelled: `❌ <b>Ваш заказ #${orderId} ОТМЕНЕН.</b>\n\nПо любым вопросам напишите менеджеру: @${settings.manager_username}`,
      };

      if (messages[newStatus]) {
        try {
          fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: orderToUpdate.user_id,
              text: messages[newStatus],
              parse_mode: 'HTML',
            }),
          }).catch((err) => console.warn('Bot sendMessage skipped:', err));
        } catch (e) {
          // ignore
        }
      }
    }

    return true;
  };

  const cancelOrder = async (orderId: number) => {
    return await updateOrderStatus(orderId, 'cancelled');
  };

  // Admin handlers
  const saveSettings = async (newSettings: Partial<ShopSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    hapticNotification('success');
    
    // Save to Supabase settings table
    try {
      await supabaseRequest('settings?id=eq.1', 'PATCH', updated);
    } catch (e) {
      console.warn('Supabase saveSettings warning:', e);
    }
    return true;
  };

  const addProduct = async (productData: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...productData,
      id: Date.now() % 1000000 + Math.floor(Math.random() * 100),
      sold_count: 0,
      created_at: new Date().toISOString(),
    };
    setProducts((prev) => [newProd, ...prev]);
    hapticNotification('success');

    try {
      const res = await supabaseRequest('products', 'POST', newProd);
      if (res && Array.isArray(res) && res[0]?.id) {
        setProducts((prev) => prev.map((p) => (p.id === newProd.id ? { ...p, id: res[0].id } : p)));
      }
    } catch (e) {
      console.warn('Supabase add product error:', e);
    }
    return true;
  };

  const updateProduct = async (id: number, productData: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...productData } : p)));
    hapticNotification('success');

    try {
      await supabaseRequest(`products?id=eq.${id}`, 'PATCH', productData);
    } catch (e) {
      console.warn('Supabase update product error:', e);
    }
    return true;
  };

  const deleteProduct = async (id: number) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    hapticImpact('medium');

    try {
      await supabaseRequest(`products?id=eq.${id}`, 'DELETE');
    } catch (e) {
      console.warn('Supabase delete product error:', e);
    }
    return true;
  };

  const addCategory = async (catData: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...catData,
      id: Date.now() % 10000,
    };
    setCategories((prev) => [...prev, newCat]);
    hapticNotification('success');

    try {
      await supabaseRequest('categories', 'POST', newCat);
    } catch (e) {
      console.warn('Supabase addCategory warning:', e);
    }
    return true;
  };

  const deleteCategory = async (id: number) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    hapticImpact('medium');

    try {
      await supabaseRequest(`categories?id=eq.${id}`, 'DELETE');
    } catch (e) {
      console.warn('Supabase deleteCategory warning:', e);
    }
    return true;
  };

  const addBrand = async (brandData: Omit<Brand, 'id'>) => {
    const newBrand: Brand = {
      ...brandData,
      id: Date.now() % 10000,
    };
    setBrands((prev) => [...prev, newBrand]);
    hapticNotification('success');

    try {
      const res = await supabaseRequest('brands', 'POST', newBrand);
      if (res && Array.isArray(res) && res[0]?.id) {
        setBrands((prev) => prev.map((b) => (b.id === newBrand.id ? { ...b, id: res[0].id } : b)));
      }
    } catch (e) {
      console.warn('Supabase addBrand warning:', e);
    }
    return true;
  };

  const deleteBrand = async (id: number) => {
    setBrands((prev) => prev.filter((b) => b.id !== id));
    hapticImpact('medium');

    try {
      await supabaseRequest(`brands?id=eq.${id}`, 'DELETE');
    } catch (e) {
      console.warn('Supabase deleteBrand warning:', e);
    }
    return true;
  };

  const addBrandLine = async (attributeGroupSlug: string, lineName: string) => {
    let group = attributeGroups.find((g) => g.slug === attributeGroupSlug);
    if (!group) {
      const newGroup: AttributeGroup = {
        id: Date.now() % 10000,
        name: lineName,
        slug: attributeGroupSlug,
        category_slug: 'liquid',
        sort_order: 1,
        is_active: true,
      };
      setAttributeGroups((prev) => [...prev, newGroup]);
      group = newGroup;
      try {
        await supabaseRequest('attribute_groups', 'POST', newGroup);
      } catch (e) {
        console.warn('Supabase add group warning:', e);
      }
    }

    const newVal: AttributeValue = {
      id: Date.now() % 10000 + Math.floor(Math.random() * 50),
      attribute_group_slug: attributeGroupSlug,
      value: lineName,
      sort_order: 1,
      is_active: true,
    };
    setAttributeValues((prev) => [...prev, newVal]);
    hapticNotification('success');

    try {
      await supabaseRequest('attribute_values', 'POST', newVal);
    } catch (e) {
      console.warn('Supabase add attribute value warning:', e);
    }
    return true;
  };

  const deleteBrandLine = async (id: number) => {
    setAttributeValues((prev) => prev.filter((v) => v.id !== id));
    hapticImpact('medium');

    try {
      await supabaseRequest(`attribute_values?id=eq.${id}`, 'DELETE');
    } catch (e) {
      console.warn('Supabase delete attribute value warning:', e);
    }
    return true;
  };

  const addModel = async (modelData: Omit<ProductModel, 'id'>) => {
    const newModel: ProductModel = {
      ...modelData,
      id: Date.now() % 10000,
    };
    setModels((prev) => [...prev, newModel]);
    hapticNotification('success');

    try {
      const res = await supabaseRequest('product_models', 'POST', newModel);
      if (res && Array.isArray(res) && res[0]?.id) {
        setModels((prev) => prev.map((m) => (m.id === newModel.id ? { ...m, id: res[0].id } : m)));
      }
    } catch (e) {
      console.warn('Supabase addModel warning:', e);
    }
    return true;
  };

  const deleteModel = async (id: number) => {
    setModels((prev) => prev.filter((m) => m.id !== id));
    hapticImpact('medium');

    try {
      await supabaseRequest(`product_models?id=eq.${id}`, 'DELETE');
    } catch (e) {
      console.warn('Supabase deleteModel warning:', e);
    }
    return true;
  };

  const addPromotion = async (promoData: Omit<Promotion, 'id'>) => {
    const newPromo: Promotion = {
      ...promoData,
      id: Date.now() % 10000,
      created_at: new Date().toISOString(),
    };
    setPromotions((prev) => [newPromo, ...prev]);
    hapticNotification('success');

    try {
      await supabaseRequest('promotions', 'POST', newPromo);
    } catch (e) {
      console.warn('Supabase addPromotion warning:', e);
    }
    return true;
  };

  const deletePromotion = async (id: number) => {
    setPromotions((prev) => prev.filter((p) => p.id !== id));
    hapticImpact('medium');

    try {
      await supabaseRequest(`promotions?id=eq.${id}`, 'DELETE');
    } catch (e) {
      console.warn('Supabase deletePromotion warning:', e);
    }
    return true;
  };

  const addPromocode = async (codeData: Omit<Promocode, 'id' | 'used_count'>) => {
    const newCode: Promocode = {
      ...codeData,
      id: Date.now() % 10000,
      used_count: 0,
      created_at: new Date().toISOString(),
    };
    setPromocodes((prev) => [newCode, ...prev]);
    hapticNotification('success');

    try {
      await supabaseRequest('promocodes', 'POST', newCode);
    } catch (e) {
      console.warn('Supabase addPromocode warning:', e);
    }
    return true;
  };

  const deletePromocode = async (id: number) => {
    setPromocodes((prev) => prev.filter((p) => p.id !== id));
    hapticImpact('medium');

    try {
      await supabaseRequest(`promocodes?id=eq.${id}`, 'DELETE');
    } catch (e) {
      console.warn('Supabase deletePromocode warning:', e);
    }
    return true;
  };

  const addPickupPoint = async (pointData: Omit<PickupPoint, 'id'>) => {
    const newPoint: PickupPoint = {
      ...pointData,
      id: Date.now() % 10000,
    };
    setPickupPoints((prev) => [...prev, newPoint]);
    hapticNotification('success');

    try {
      await supabaseRequest('pickup_points', 'POST', newPoint);
    } catch (e) {
      console.warn('Supabase addPickupPoint warning:', e);
    }
    return true;
  };

  const deletePickupPoint = async (id: number) => {
    setPickupPoints((prev) => prev.filter((p) => p.id !== id));
    hapticImpact('medium');

    try {
      await supabaseRequest(`pickup_points?id=eq.${id}`, 'DELETE');
    } catch (e) {
      console.warn('Supabase deletePickupPoint warning:', e);
    }
    return true;
  };

  const addAdminUser = async (userId: number, username: string, role: 'admin' | 'moderator') => {
    const newAdmin: AdminUser = {
      id: Date.now() % 10000,
      user_id: userId,
      username,
      role,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    setAdmins((prev) => [...prev, newAdmin]);
    hapticNotification('success');

    try {
      await supabaseRequest('admins', 'POST', newAdmin);
    } catch (e) {
      console.warn('Supabase addAdminUser warning:', e);
    }
    return true;
  };

  const deleteAdminUser = async (id: number) => {
    setAdmins((prev) => prev.filter((a) => a.id !== id));
    hapticImpact('medium');

    try {
      await supabaseRequest(`admins?id=eq.${id}`, 'DELETE');
    } catch (e) {
      console.warn('Supabase deleteAdminUser warning:', e);
    }
    return true;
  };

  const importProducts = async (
    items: Array<{
      name: string;
      price: number;
      category: string;
      brand?: string;
      model?: string;
      flavor?: string;
      strength?: string;
      stock?: number;
      emoji?: string;
    }>
  ) => {
    let successCount = 0;
    const errors: string[] = [];

    const newProducts: Product[] = [];

    for (const item of items) {
      try {
        const catMap: Record<string, string> = {
          жидкости: 'liquid',
          жидкость: 'liquid',
          liquid: 'liquid',
          pod: 'pod',
          поды: 'pod',
          комплектующие: 'accessories',
          испарители: 'accessories',
          accessories: 'accessories',
          одноразки: 'disposable',
          disposable: 'disposable',
          снюс: 'snus',
          snus: 'snus',
        };

        const categorySlug = catMap[item.category.toLowerCase()] || 'liquid';

        const emojiMap: Record<string, string> = {
          liquid: '🧪',
          pod: '💨',
          accessories: '🔧',
          disposable: '⚡',
          snus: '🫧',
        };

        const prod: Product = {
          id: Date.now() + Math.floor(Math.random() * 10000),
          name: item.name,
          price: item.price,
          category_slug: categorySlug,
          brand_slug: item.brand ? item.brand.toLowerCase().replace(/\s+/g, '-') : null,
          model_slug: item.model ? item.model.toLowerCase().replace(/\s+/g, '-') : null,
          emoji: item.emoji || emojiMap[categorySlug] || '📦',
          stock_quantity: item.stock || 10,
          in_stock: (item.stock || 10) > 0,
          description: `${item.flavor ? `Вкус: ${item.flavor}. ` : ''}${item.strength ? `Крепость: ${item.strength}.` : ''}`,
          sold_count: 0,
          created_at: new Date().toISOString(),
        };

        newProducts.push(prod);
        successCount++;
      } catch (err: unknown) {
        errors.push(`Ошибка импорта товара "${item.name}": ${(err as Error).message}`);
      }
    }

    if (newProducts.length > 0) {
      setProducts((prev) => [...newProducts, ...prev]);
      hapticNotification('success');
    }

    return { successCount, errors };
  };

  return (
    <StoreContext.Provider
      value={{
        currentUser,
        isAdmin,
        isModerator,
        settings,
        categories,
        brands,
        models,
        attributeGroups,
        attributeValues,
        products,
        productColors,
        cart,
        orders,
        promotions,
        promocodes,
        pickupPoints,
        admins,
        appliedPromocode,
        isLoading,
        setCurrentUser,
        toggleTestAdmin,
        loadAllData,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        applyPromocode,
        removePromocode,
        placeOrder,
        updateOrderStatus,
        cancelOrder,
        saveSettings,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        deleteCategory,
        addBrand,
        deleteBrand,
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
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
