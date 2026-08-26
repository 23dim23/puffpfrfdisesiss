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
import { db, HARDCODED_ADMIN_IDS } from './db';
import { getTelegramWebApp, hapticImpact, hapticNotification } from './telegram';

export const BOT_TOKEN = '8870349321:AAEXFersNinRpHnPETbR_vGFn_TnGWOCums';
export const HARDCODED_ADMINS = HARDCODED_ADMIN_IDS;

interface StoreContextType {
  // User & Access
  currentUser: TelegramUser | null;
  isAuthorizedAdmin: boolean; // True only if user ID is in admin list (5659638424, 8161417737 or admins table)
  isAdmin: boolean;           // True if user is admin AND admin mode is active
  isModerator: boolean;
  isAdminMode: boolean;       // Current view mode (admin vs client preview)
  toggleAdminMode: () => void; // Only works if isAuthorizedAdmin is true
  setCurrentUser: (user: TelegramUser | null) => void;

  // Data Collections (from local in-root Database)
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

  // Cart & Order Actions
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

  // Database Management Actions (CRUD)
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
  exportDatabaseDump: () => string;
  importDatabaseDump: (json: string) => boolean;
  resetDatabaseDefaults: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<TelegramUser | null>(null);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState<boolean>(false);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Synchronized DB States
  const [settings, setSettings] = useState<ShopSettings>(() => db.getSettings());
  const [categories, setCategories] = useState<Category[]>(() => db.getCategories());
  const [brands, setBrands] = useState<Brand[]>(() => db.getBrands());
  const [models, setModels] = useState<ProductModel[]>(() => db.getModels());
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>(() => db.getAttributeGroups());
  const [attributeValues, setAttributeValues] = useState<AttributeValue[]>(() => db.getAttributeValues());
  const [products, setProducts] = useState<Product[]>(() => db.getProducts());
  const [productColors] = useState<ProductColor[]>([
    { id: 1, name: 'Черный матовый', hex: '#18181b', is_in_stock: true },
    { id: 2, name: 'Неоновый фиолет', hex: '#a855f7', is_in_stock: true },
    { id: 3, name: 'Градиент Закат', hex: '#f97316', is_in_stock: true },
    { id: 4, name: 'Космический серый', hex: '#52525b', is_in_stock: true },
  ]);
  const [orders, setOrders] = useState<Order[]>(() => db.getOrders());
  const [promotions, setPromotions] = useState<Promotion[]>(() => db.getPromotions());
  const [promocodes, setPromocodes] = useState<Promocode[]>(() => db.getPromocodes());
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>(() => db.getPickupPoints());
  const [admins, setAdmins] = useState<AdminUser[]>(() => db.getAdmins());

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('puff_cart_items_v3');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [appliedPromocode, setAppliedPromocode] = useState<Promocode | null>(null);

  // Sync DB state listener
  const syncFromDb = useCallback(() => {
    setSettings(db.getSettings());
    setCategories(db.getCategories());
    setBrands(db.getBrands());
    setModels(db.getModels());
    setAttributeGroups(db.getAttributeGroups());
    setAttributeValues(db.getAttributeValues());
    setProducts(db.getProducts());
    setOrders(db.getOrders());
    setPromotions(db.getPromotions());
    setPromocodes(db.getPromocodes());
    setPickupPoints(db.getPickupPoints());
    setAdmins(db.getAdmins());
  }, []);

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      syncFromDb();
    });
    return unsubscribe;
  }, [syncFromDb]);

  // Persist cart
  useEffect(() => {
    localStorage.setItem('puff_cart_items_v3', JSON.stringify(cart));
  }, [cart]);

  // Check admin privileges strictly
  const verifyAdmin = useCallback((user: TelegramUser | null) => {
    if (!user || !user.id) {
      setIsAuthorizedAdmin(false);
      return false;
    }
    const authorized = db.isUserAdmin(user.id);
    setIsAuthorizedAdmin(authorized);
    return authorized;
  }, []);

  // Initialize Telegram User
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (tg?.initDataUnsafe?.user) {
      const tgUser = tg.initDataUnsafe.user;
      const user: TelegramUser = {
        id: tgUser.id,
        first_name: tgUser.first_name || '',
        last_name: tgUser.last_name || '',
        username: tgUser.username || '',
        language_code: tgUser.language_code || 'ru',
      };
      setCurrentUserState(user);
      verifyAdmin(user);
    } else {
      // In browser preview, check if last user was saved or simulate guest
      const savedUser = localStorage.getItem('puff_current_user_v3');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setCurrentUserState(parsed);
          verifyAdmin(parsed);
        } catch {
          setIsAuthorizedAdmin(false);
        }
      } else {
        setIsAuthorizedAdmin(false);
      }
    }
  }, [verifyAdmin]);

  const setCurrentUser = (user: TelegramUser | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('puff_current_user_v3', JSON.stringify(user));
    } else {
      localStorage.removeItem('puff_current_user_v3');
    }
    verifyAdmin(user);
  };

  // Toggle Admin Mode - STRICT: ONLY works if user is an authorized admin!
  const toggleAdminMode = () => {
    if (!isAuthorizedAdmin) {
      // Non-admin cannot switch to admin mode under any circumstances
      console.warn('Access denied: user is not an authorized administrator.');
      return;
    }
    setIsAdminMode((prev) => !prev);
    hapticImpact('medium');
  };

  // Effective Admin / Moderator statuses (active only when admin mode is turned on)
  const isAdmin = isAuthorizedAdmin && isAdminMode;
  const isModerator = isAuthorizedAdmin && isAdminMode;

  const loadAllData = async () => {
    setIsLoading(true);
    syncFromDb();
    setIsLoading(false);
  };

  // Cart Operations
  const addToCart = (product: Product, quantity = 1, colorId: number | null = null) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.selectedColorId === colorId
      );
      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex].quantity += quantity;
        return copy;
      }
      return [...prev, { product, quantity, selectedColorId: colorId }];
    });
    hapticNotification('success');
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
    hapticImpact('light');
  };

  const updateCartQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      copy[index].quantity = newQty;
      return copy;
    });
    hapticImpact('light');
  };

  const clearCart = () => {
    setCart([]);
    setAppliedPromocode(null);
  };

  // Promocode validation
  const applyPromocode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const found = promocodes.find((p) => p.code.toUpperCase() === cleanCode && p.is_active);

    if (!found) {
      return { success: false, message: 'Промокод не найден или недействителен' };
    }

    if (found.max_uses && found.used_count >= found.max_uses) {
      return { success: false, message: 'Лимит использования промокода исчерпан' };
    }

    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    if (found.min_order_amount && subtotal < found.min_order_amount) {
      return {
        success: false,
        message: `Минимальная сумма заказа для этого промокода: ${found.min_order_amount} BYN`,
      };
    }

    setAppliedPromocode(found);
    hapticNotification('success');
    return {
      success: true,
      message: `Промокод применен! Скидка ${found.discount_percent}%`,
    };
  };

  const removePromocode = () => {
    setAppliedPromocode(null);
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

    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    let discountAmount = 0;
    if (appliedPromocode) {
      discountAmount = Math.round((subtotal * appliedPromocode.discount_percent) / 100);
    }

    let deliveryPrice = 0;
    if (params.deliveryType === 'delivery') {
      deliveryPrice = subtotal >= settings.free_delivery_from ? 0 : settings.delivery_price;
    }

    const total = Math.max(0, subtotal - discountAmount + deliveryPrice);

    const selectedPickup = pickupPoints.find((p) => p.id === params.pickupPointId);

    const newOrder = db.createOrder({
      user_id: currentUser?.id || 999999,
      username: currentUser?.username || 'user',
      first_name: currentUser?.first_name || '',
      last_name: currentUser?.last_name || '',
      phone: currentUser?.username ? `@${currentUser.username}` : 'Не указан',
      items_json: cart.map((c) => ({
        id: c.product.id,
        name: c.product.name,
        price: c.product.price,
        quantity: c.quantity,
        emoji: c.product.emoji,
      })),
      total,
      subtotal,
      discount_amount: discountAmount,
      delivery_price: deliveryPrice,
      currency: 'BYN',
      status: 'pending',
      delivery_type: params.deliveryType,
      pickup_point_id: params.pickupPointId || undefined,
      pickup_point_name: selectedPickup?.name || (params.deliveryType === 'pickup' ? 'Точка самовывоза' : undefined),
      delivery_address: params.deliveryAddress || undefined,
      comment: params.comment || undefined,
      promocode_id: appliedPromocode?.id,
      promocode_code: appliedPromocode?.code,
    });

    // Send Telegram WebApp Data to connected Python Bot
    const tg = getTelegramWebApp();
    if (tg?.sendData) {
      try {
        tg.sendData(
          JSON.stringify({
            action: 'order',
            order_id: newOrder.id,
            username: newOrder.username,
            items: newOrder.items_json,
            total: newOrder.total,
            subtotal: newOrder.subtotal,
            discount: newOrder.discount_amount,
            delivery_cost: newOrder.delivery_price,
            currency: 'BYN',
            phone: newOrder.phone,
            delivery_type: newOrder.delivery_type,
            delivery_address: newOrder.delivery_address || '',
            pickup_point_name: newOrder.pickup_point_name || '',
            comment: newOrder.comment || '',
            promocode: newOrder.promocode_code || '',
          })
        );
      } catch (e) {
        console.warn('Telegram sendData exception:', e);
      }
    }

    // Direct Telegram Notification to Admins if BOT_TOKEN is present
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
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminId,
            text: adminNotice,
            parse_mode: 'HTML',
          }),
        }).catch(() => {});
      }
    }

    clearCart();
    hapticNotification('success');
    return { success: true, orderId: newOrder.id, total: newOrder.total };
  };

  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    const success = db.updateOrderStatus(orderId, newStatus);
    if (success) {
      hapticNotification('success');

      // Send status notification to customer via Telegram bot
      const targetOrder = orders.find((o) => o.id === orderId);
      if (targetOrder && targetOrder.user_id && BOT_TOKEN) {
        const statusTitles: Record<OrderStatus, string> = {
          pending: 'В обработке ⏳',
          confirmed: 'Подтвержден ✅',
          shipped: 'Отправлен / Передан курьеру 🚚',
          completed: 'Выполнен 🎉',
          cancelled: 'Отменен ❌',
        };

        const msg = `🔔 <b>Статус заказа #${orderId} изменен!</b>\n\nТекущий статус: <b>${statusTitles[newStatus] || newStatus}</b>\n\n📩 По всем вопросам: @puff_mngr`;

        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: targetOrder.user_id,
            text: msg,
            parse_mode: 'HTML',
          }),
        }).catch(() => {});
      }
    }
    return success;
  };

  const cancelOrder = async (orderId: number) => {
    const success = db.cancelOrder(orderId);
    if (success) hapticImpact('medium');
    return success;
  };

  // Admin Database CRUD Operations
  const saveSettings = async (newSettings: Partial<ShopSettings>) => {
    db.updateSettings(newSettings);
    hapticNotification('success');
    return true;
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    db.addProduct(product);
    hapticNotification('success');
    return true;
  };

  const updateProduct = async (id: number, productData: Partial<Product>) => {
    db.updateProduct(id, productData);
    hapticNotification('success');
    return true;
  };

  const deleteProduct = async (id: number) => {
    db.deleteProduct(id);
    hapticImpact('medium');
    return true;
  };

  const addCategory = async (cat: Omit<Category, 'id'>) => {
    db.addCategory(cat);
    hapticNotification('success');
    return true;
  };

  const deleteCategory = async (id: number) => {
    db.deleteCategory(id);
    hapticImpact('medium');
    return true;
  };

  const addBrand = async (brand: Omit<Brand, 'id'>) => {
    db.addBrand(brand);
    hapticNotification('success');
    return true;
  };

  const deleteBrand = async (id: number) => {
    db.deleteBrand(id);
    hapticImpact('medium');
    return true;
  };

  const addBrandLine = async (attributeGroupSlug: string, lineName: string) => {
    db.addBrandLine(attributeGroupSlug, lineName);
    hapticNotification('success');
    return true;
  };

  const deleteBrandLine = async (id: number) => {
    db.deleteBrandLine(id);
    hapticImpact('medium');
    return true;
  };

  const addModel = async (model: Omit<ProductModel, 'id'>) => {
    db.addModel(model);
    hapticNotification('success');
    return true;
  };

  const deleteModel = async (id: number) => {
    db.deleteModel(id);
    hapticImpact('medium');
    return true;
  };

  const addPromotion = async (promo: Omit<Promotion, 'id'>) => {
    db.addPromotion(promo);
    hapticNotification('success');
    return true;
  };

  const deletePromotion = async (id: number) => {
    db.deletePromotion(id);
    hapticImpact('medium');
    return true;
  };

  const addPromocode = async (code: Omit<Promocode, 'id' | 'used_count'>) => {
    db.addPromocode(code);
    hapticNotification('success');
    return true;
  };

  const deletePromocode = async (id: number) => {
    db.deletePromocode(id);
    hapticImpact('medium');
    return true;
  };

  const addPickupPoint = async (point: Omit<PickupPoint, 'id'>) => {
    db.addPickupPoint(point);
    hapticNotification('success');
    return true;
  };

  const deletePickupPoint = async (id: number) => {
    db.deletePickupPoint(id);
    hapticImpact('medium');
    return true;
  };

  const addAdminUser = async (userId: number, username: string, role: 'admin' | 'moderator') => {
    db.addAdminUser(userId, username, role);
    hapticNotification('success');
    return true;
  };

  const deleteAdminUser = async (id: number) => {
    db.deleteAdminUser(id);
    hapticImpact('medium');
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
    const result = db.batchImportProducts(items);
    if (result.successCount > 0) {
      hapticNotification('success');
    }
    return result;
  };

  const exportDatabaseDump = () => {
    return db.exportDatabase();
  };

  const importDatabaseDump = (json: string) => {
    const ok = db.importDatabase(json);
    if (ok) hapticNotification('success');
    return ok;
  };

  const resetDatabaseDefaults = () => {
    db.resetToDefaults();
    hapticNotification('warning');
  };

  return (
    <StoreContext.Provider
      value={{
        currentUser,
        isAuthorizedAdmin,
        isAdmin,
        isModerator,
        isAdminMode,
        toggleAdminMode,
        setCurrentUser,
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
