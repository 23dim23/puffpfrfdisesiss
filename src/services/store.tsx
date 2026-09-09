import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
  BundlePromotion,
  ProductReservation,
  PickupPoint,
  ShopSettings,
  AdminUser,
  ShopUser,
  TelegramUser,
  OrderStatus,
  DeliveryType,
} from '../types';
import { db, HARDCODED_ADMIN_IDS } from './db';
import { getTelegramWebApp, hapticImpact, hapticNotification } from './telegram';
import { calculateBundlePromotions } from '../utils/promo';
import { formatBrandSlug } from '../utils/brand';

export const BOT_TOKEN = '8648233320:AAHqnWppOqFTogRR7szthQSclkq3caT8_8Y';
export const HARDCODED_ADMINS = HARDCODED_ADMIN_IDS;

interface StoreContextType {
  // User & Access
  currentUser: TelegramUser | null;
  isAuthorizedAdmin: boolean; // True only if user ID is in admin list (5659638424, 8161417737 or admins table)
  isAdmin: boolean;           // True if user is full admin AND admin mode is active
  isModerator: boolean;       // True if user is moderator OR admin
  isMasterAdmin: boolean;     // True for owner/root admins
  userRole: 'admin' | 'moderator' | null;
  isAdminMode: boolean;       // Current view mode (admin vs client preview)
  toggleAdminMode: () => void; // Only works if isAuthorizedAdmin is true
  setCurrentUser: (user: TelegramUser | null) => void;
  loginAsAdmin: (idOrUsername: string) => boolean;
  logoutUser: () => void;

  // Data Collections (from local in-root Database)
  settings: ShopSettings;
  categories: Category[];
  brands: Brand[];
  models: ProductModel[];
  attributeGroups: AttributeGroup[];
  attributeValues: AttributeValue[];
  products: Product[];
  catalogProducts: Product[];
  productColors: ProductColor[];
  cart: CartItem[];
  orders: Order[];
  promotions: Promotion[];
  promocodes: Promocode[];
  bundlePromotions: BundlePromotion[];
  reservations: ProductReservation[];
  pickupPoints: PickupPoint[];
  admins: AdminUser[];
  users: ShopUser[];
  appliedPromocode: Promocode | null;
  isLoading: boolean;

  // Cart & Order Actions
  loadAllData: () => Promise<void>;
  addToCart: (product: Product, quantity?: number, colorId?: number | null, selectedColorName?: string) => void;
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
  updateOrderFinances: (orderId: number, total: number, totalMargin: number) => Promise<boolean>;

  // Database Management Actions (CRUD)
  saveSettings: (newSettings: Partial<ShopSettings>) => Promise<boolean>;
  setLineMargin: (categorySlug: string, lineName: string, margin: number) => void;
  getLineMargin: (categorySlug: string, lineName: string) => number | undefined;
  addProduct: (product: Omit<Product, 'id'>) => Promise<boolean>;
  updateProduct: (id: number, product: Partial<Product>) => Promise<boolean>;
  bulkUpdateProductImage: (filter: { category_slug?: string; brand_slug?: string }, imageUrl: string) => Promise<number>;
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
  addBundlePromotion: (promo: Omit<BundlePromotion, 'id'>) => Promise<boolean>;
  deleteBundlePromotion: (id: number) => Promise<boolean>;
  addPromocode: (code: Omit<Promocode, 'id' | 'used_count'>) => Promise<boolean>;
  deletePromocode: (id: number) => Promise<boolean>;
  addPickupPoint: (point: Omit<PickupPoint, 'id'>) => Promise<boolean>;
  deletePickupPoint: (id: number) => Promise<boolean>;
  addAdminUser: (userId: number | string | null, username: string, role: 'admin' | 'moderator') => Promise<boolean>;
  deleteAdminUser: (id: number) => Promise<boolean>;
  importProducts: (
    items: Array<{
      name: string;
      price: number;
      cost_price?: number;
      margin_profit?: number;
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
    { id: 1, name: 'Mist White (Белая кожа)', hex: '#f8fafc', is_in_stock: true },
    { id: 2, name: 'Mist Black (Черная кожа)', hex: '#18181b', is_in_stock: true },
    { id: 3, name: 'Jelly Green (Ярко-зеленый)', hex: '#22c55e', is_in_stock: true },
  ]);
  const [orders, setOrders] = useState<Order[]>(() => db.getOrders());
  const [promotions, setPromotions] = useState<Promotion[]>(() => db.getPromotions());
  const [promocodes, setPromocodes] = useState<Promocode[]>(() => db.getPromocodes());
  const [bundlePromotions, setBundlePromotions] = useState<BundlePromotion[]>(() => db.getBundlePromotions());
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>(() => db.getPickupPoints());
  const [admins, setAdmins] = useState<AdminUser[]>(() => db.getAdmins());
  const [users, setUsers] = useState<ShopUser[]>(() => db.getUsers());
  const [reservations, setReservations] = useState<ProductReservation[]>(() => db.getReservations());

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('puff_cart_items_v4');
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
    setBundlePromotions(db.getBundlePromotions());
    setPickupPoints(db.getPickupPoints());
    setAdmins(db.getAdmins());
    setUsers(db.getUsers());
    setReservations(db.getReservations());
  }, []);

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      syncFromDb();
    });
    return unsubscribe;
  }, [syncFromDb]);

  // Dynamic catalogProducts with non-expired reservations subtracted
  const catalogProducts = useMemo(() => {
    const now = Date.now();
    const activeRes = reservations.filter((r) => r.expires_at > now);

    return products.map((p) => {
      const reservedQty = activeRes
        .filter((r) => r.product_id === p.id)
        .reduce((sum, r) => sum + r.quantity, 0);

      const effectiveStock = Math.max(0, (p.stock_quantity ?? 0) - reservedQty);
      return {
        ...p,
        stock_quantity: effectiveStock,
        in_stock: effectiveStock > 0 && p.in_stock,
      };
    });
  }, [products, reservations]);

  // Persist cart
  useEffect(() => {
    localStorage.setItem('puff_cart_items_v4', JSON.stringify(cart));
  }, [cart]);

  // Background self-cleaning expired reservations
  useEffect(() => {
    const checkExpiredReservations = () => {
      const now = Date.now();
      const currentUserId = currentUser?.id || 999999;
      
      // 1. Delete all expired reservations from Firestore
      const expiredList = reservations.filter((r) => r.expires_at <= now);
      for (const res of expiredList) {
        db.removeReservation(res.id);
      }
      
      // 2. Clear items from cart whose reservations have expired or are missing
      if (cart.length > 0) {
        const activeRes = reservations.filter((r) => r.expires_at > now && r.user_id === currentUserId);
        setCart((prevCart) => {
          let changed = false;
          const nextCart = prevCart.filter((cItem) => {
            const resId = `${currentUserId}_${cItem.id}_${cItem.color_id || 'none'}`;
            const hasRes = activeRes.some((r) => r.id === resId);
            if (!hasRes) {
              changed = true;
              return false; // remove
            }
            return true;
          });
          return changed ? nextCart : prevCart;
        });
      }
    };

    const interval = setInterval(checkExpiredReservations, 10000); // every 10 seconds
    checkExpiredReservations();
    return () => clearInterval(interval);
  }, [reservations, currentUser, cart.length]);

  // Check admin privileges strictly by ID or username
  const verifyAdmin = useCallback((user: TelegramUser | null) => {
    if (!user) {
      setIsAuthorizedAdmin(false);
      return false;
    }
    const authorized = db.isUserAdmin(user.id, user.username);
    setIsAuthorizedAdmin(authorized);
    return authorized;
  }, []);

  // Initialize Telegram User & check URL parameters for desktop/testing
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
      db.recordUser({
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
      }, 'miniapp');

      const isAdm = verifyAdmin(user);
      if (isAdm) setIsAdminMode(true);
    } else {
      // Check query parameters (useful for desktop preview / testing)
      const urlParams = new URLSearchParams(window.location.search);
      const qUserId = urlParams.get('user_id') || urlParams.get('tg_id') || urlParams.get('id');
      const qUsername = urlParams.get('username') || urlParams.get('user');

      if (qUserId || qUsername) {
        const parsedId = qUserId ? parseInt(qUserId, 10) : 0;
        const user: TelegramUser = {
          id: parsedId || 5659638424,
          first_name: qUsername ? `@${qUsername}` : 'Администратор',
          username: qUsername || 'admin',
          language_code: 'ru',
        };
        setCurrentUserState(user);
        db.recordUser({
          id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
        }, 'miniapp');

        const isAdm = verifyAdmin(user);
        if (isAdm) setIsAdminMode(true);
        localStorage.setItem('puff_current_user_v4', JSON.stringify(user));
        return;
      }

      // In browser preview, check if last user was saved or default
      const savedUser = localStorage.getItem('puff_current_user_v4');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setCurrentUserState(parsed);
          const isAdm = verifyAdmin(parsed);
          if (isAdm) setIsAdminMode(true);
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
      localStorage.setItem('puff_current_user_v4', JSON.stringify(user));
      db.recordUser({
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
      }, 'miniapp');
      const isAdm = verifyAdmin(user);
      if (isAdm) setIsAdminMode(true);
    } else {
      localStorage.removeItem('puff_current_user_v4');
      setIsAuthorizedAdmin(false);
    }
  };

  const loginAsAdmin = (idOrUsername: string): boolean => {
    const clean = idOrUsername.trim();
    if (!clean) return false;

    const parsedId = parseInt(clean, 10);
    const cleanUsername = clean.replace(/^@/, '');

    const isMatch = db.isUserAdmin(parsedId || null, cleanUsername || null);
    if (isMatch) {
      const user: TelegramUser = {
        id: !isNaN(parsedId) && parsedId > 0 ? parsedId : 5659638424,
        first_name: cleanUsername ? `@${cleanUsername}` : 'Администратор',
        username: cleanUsername || 'admin',
        language_code: 'ru',
      };
      setCurrentUser(user);
      setIsAuthorizedAdmin(true);
      setIsAdminMode(true);
      return true;
    }
    return false;
  };

  const logoutUser = () => {
    setCurrentUser(null);
    setIsAdminMode(false);
  };

  // Toggle Admin Mode - STRICT: ONLY works if user is an authorized admin!
  const toggleAdminMode = () => {
    if (!isAuthorizedAdmin) {
      console.warn('Access denied: user is not an authorized administrator.');
      return;
    }
    setIsAdminMode((prev) => !prev);
    hapticImpact('medium');
  };

  // Determine user's exact RBAC role
  const userRole = db.getUserRole(currentUser?.id, currentUser?.username);
  const isMasterAdmin = Boolean(currentUser?.id && HARDCODED_ADMIN_IDS.includes(currentUser.id));
  
  // Full Admin privileges (Financial metrics, margins, cost prices, staff management)
  const isAdmin = isAuthorizedAdmin && isAdminMode && (userRole === 'admin' || isMasterAdmin);
  // Moderator privileges (Order processing, status changes, customer chat)
  const isModerator = isAuthorizedAdmin && isAdminMode;

  const loadAllData = async () => {
    setIsLoading(true);
    syncFromDb();
    setIsLoading(false);
  };

  // Cart Operations - Stores standard CartItem extends Product
  const addToCart = (
    product: Product,
    quantity = 1,
    colorId: number | null = null,
    selectedColorName?: string
  ) => {
    const currentUserId = currentUser?.id || 999999;
    const resId = `${currentUserId}_${product.id}_${colorId || 'none'}`;
    const activeRes = db.getReservations().filter((r) => r.expires_at > Date.now());

    const totalReservedByOthers = activeRes
      .filter((r) => r.product_id === product.id && r.id !== resId)
      .reduce((sum, r) => sum + r.quantity, 0);

    const availableStock = Math.max(0, (product.stock_quantity ?? 0) - totalReservedByOthers);
    if (availableStock <= 0 || !product.in_stock) {
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.id === product.id && (item.color_id || null) === (colorId || null)
      );
      let newQty = quantity;
      if (existingIndex > -1) {
        newQty = Math.min(availableStock, prev[existingIndex].quantity + quantity);
      } else {
        newQty = Math.min(availableStock, Math.max(1, quantity));
      }

      // Upsert the reservation in Firestore
      const reservation: ProductReservation = {
        id: resId,
        user_id: currentUserId,
        product_id: product.id,
        quantity: newQty,
        expires_at: Date.now() + 10 * 60 * 1000, // 10 minutes
      };
      db.addOrUpdateReservation(reservation);

      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex].quantity = newQty;
        return copy;
      }
      const newItem: CartItem = {
        ...product,
        quantity: newQty,
        color_id: colorId,
        selected_color_name: selectedColorName,
      };
      return [...prev, newItem];
    });
    hapticNotification('success');
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => {
      const item = prev[index];
      if (item) {
        const currentUserId = currentUser?.id || 999999;
        const resId = `${currentUserId}_${item.id}_${item.color_id || 'none'}`;
        db.removeReservation(resId);
      }
      return prev.filter((_, i) => i !== index);
    });
    hapticImpact('light');
  };

  const updateCartQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const copy = [...prev];
      if (!copy[index]) return prev;
      const targetItem = copy[index];
      const currentUserId = currentUser?.id || 999999;
      const resId = `${currentUserId}_${targetItem.id}_${targetItem.color_id || 'none'}`;
      const activeRes = db.getReservations().filter((r) => r.expires_at > Date.now());

      const totalReservedByOthers = activeRes
        .filter((r) => r.product_id === targetItem.id && r.id !== resId)
        .reduce((sum, r) => sum + r.quantity, 0);

      const maxStock = Math.max(0, (targetItem.stock_quantity ?? 999) - totalReservedByOthers);
      const newQty = targetItem.quantity + delta;

      if (newQty <= 0) {
        db.removeReservation(resId);
        return copy.filter((_, i) => i !== index);
      }

      const finalQty = Math.min(maxStock, newQty);

      // Update reservation
      const reservation: ProductReservation = {
        id: resId,
        user_id: currentUserId,
        product_id: targetItem.id,
        quantity: finalQty,
        expires_at: Date.now() + 10 * 60 * 1000, // 10 minutes
      };
      db.addOrUpdateReservation(reservation);

      targetItem.quantity = finalQty;
      return copy;
    });
    hapticImpact('light');
  };

  const clearCart = () => {
    const currentUserId = currentUser?.id || 999999;
    db.clearUserReservations(currentUserId);
    setCart([]);
    setAppliedPromocode(null);
  };

  // Promocode validation
  const applyPromocode = (code: string) => {
    if (settings.block_promo_on_bundle) {
      const bundlePromoResult = calculateBundlePromotions(cart, db.getBundlePromotions());
      if (bundlePromoResult.totalDiscount > 0) {
        return {
          success: false,
          message: 'Промокоды не суммируются с комбо-акциями!',
        };
      }
    }

    const cleanCode = code.trim().toUpperCase();
    const found = promocodes.find((p) => p.code.toUpperCase() === cleanCode && p.is_active);

    if (!found) {
      return { success: false, message: 'Промокод не найден или недействителен' };
    }

    if (found.max_uses && found.used_count >= found.max_uses) {
      return { success: false, message: 'Лимит использования промокода исчерпан' };
    }

    const subtotal = cart.reduce((sum, item) => {
      const price = item.discount_price && item.discount_price > 0 ? item.discount_price : item.price;
      return sum + price * item.quantity;
    }, 0);

    if (found.min_order_amount && subtotal < found.min_order_amount) {
      return {
        success: false,
        message: `Минимальная сумма заказа для промокода: ${found.min_order_amount} BYN`,
      };
    }

    setAppliedPromocode(found);
    hapticNotification('success');
    const discountText =
      found.discount_type === 'percent' ? `${found.discount_value}%` : `${found.discount_value} BYN`;
    return {
      success: true,
      message: `Промокод применен! Скидка ${discountText}`,
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
    try {
      if (cart.length === 0) {
        return { success: false, error: 'Корзина пуста' };
      }

      const subtotal = cart.reduce((sum, item) => {
        const price = item.discount_price && item.discount_price > 0 ? item.discount_price : item.price;
        return sum + price * item.quantity;
      }, 0);

      let discountAmount = 0;
      if (appliedPromocode) {
        if (appliedPromocode.discount_type === 'percent') {
          discountAmount = Math.round((subtotal * appliedPromocode.discount_value) / 100);
        } else {
          discountAmount = appliedPromocode.discount_value;
        }
      }

      const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
      let deliveryPrice = 0;
      if (params.deliveryType === 'delivery') {
        const isFree = totalItemCount >= (settings.free_delivery_min_items || 4);
        deliveryPrice = isFree ? 0 : settings.delivery_price;
      }

      // Calculate bundle promotions discount
      const bundlePromoResult = calculateBundlePromotions(cart, db.getBundlePromotions());
      const bundleDiscount = bundlePromoResult.totalDiscount;

      // Check if promo code should be blocked by active bundle promotions
      const isPromoBlockedByBundle = settings.block_promo_on_bundle && bundleDiscount > 0;
      const finalDiscountAmount = isPromoBlockedByBundle ? 0 : discountAmount;

      const total = Math.max(0, subtotal - (finalDiscountAmount + bundleDiscount) + deliveryPrice);
      const selectedPickup = pickupPoints.find((p) => p.id === params.pickupPointId);

      let finalComment = params.comment || undefined;
      if (bundlePromoResult.applied.length > 0) {
        const promoNotes = bundlePromoResult.applied
          .map((a) => `Акция "${a.name}" (x${a.count}): -${a.discount} BYN`)
          .join(', ');
        finalComment = finalComment
          ? `${finalComment} | [Акция: ${promoNotes}]`
          : `[Акция: ${promoNotes}]`;
      }

      if (isPromoBlockedByBundle && appliedPromocode) {
        finalComment = finalComment
          ? `${finalComment} | [Промокод ${appliedPromocode.code} отключен: не суммируется с акциями]`
          : `[Промокод ${appliedPromocode.code} отключен: не суммируется с акциями]`;
      }

      const newOrder = db.createOrder({
        user_id: currentUser?.id || 999999,
        username: currentUser?.username || 'user',
        first_name: currentUser?.first_name || '',
        last_name: currentUser?.last_name || '',
        phone: currentUser?.username ? `@${currentUser.username}` : 'Не указан',
        items_json: cart.map((c) => {
          const brandObj = brands.find((b) => b.slug === c.brand_slug);
          return {
            id: c.id,
            name: c.name,
            price: c.discount_price && c.discount_price > 0 ? c.discount_price : c.price,
            cost_price: c.cost_price,
            margin_profit: c.margin_profit,
            quantity: c.quantity,
            emoji: c.emoji || '📦',
            brand_slug: c.brand_slug || null,
            brand_name: brandObj ? brandObj.name : (c.brand_slug ? formatBrandSlug(c.brand_slug) : null),
          };
        }),
        total,
        subtotal,
        discount_amount: finalDiscountAmount + bundleDiscount,
        delivery_price: deliveryPrice,
        currency: 'BYN',
        status: 'pending',
        delivery_type: params.deliveryType,
        pickup_point_id: params.pickupPointId || undefined,
        pickup_point_name: selectedPickup?.name || (params.deliveryType === 'pickup' ? 'Точка самовывоза' : undefined),
        delivery_address: params.deliveryAddress || undefined,
        comment: finalComment,
        promocode_id: isPromoBlockedByBundle ? undefined : appliedPromocode?.id,
        promocode_code: isPromoBlockedByBundle ? undefined : appliedPromocode?.code,
      });

      // Send Telegram WebApp Data to connected Python Bot (if supported)
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

      // 1. Primary: Notify Flask API (bot.py) on the server to handle order storage and notifications
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order_id: newOrder.id,
            user_id: newOrder.user_id,
            username: newOrder.username,
            first_name: newOrder.first_name,
            phone: newOrder.phone,
            items: newOrder.items_json,
            total: newOrder.total,
            subtotal: newOrder.subtotal,
            discount: newOrder.discount_amount,
            delivery_cost: newOrder.delivery_price,
            delivery_type: newOrder.delivery_type,
            pickup_point_name: newOrder.pickup_point_name || '',
            delivery_address: newOrder.delivery_address || '',
            comment: newOrder.comment || '',
            promocode: newOrder.promocode_code || '',
          }),
        });
        if (response.ok) {
          console.log(`✅ Successfully notified Flask API about order #${newOrder.id}`);
        } else {
          console.warn(`⚠️ Flask API returned status ${response.status} for order #${newOrder.id}`);
        }
      } catch (apiErr) {
        console.error('❌ Failed to send order POST request to Flask API:', apiErr);
      }

      // 2. Secondary/Fallback: Direct Telegram Notification to Admins if BOT_TOKEN is present in client
      if (BOT_TOKEN) {
        try {
          const itemsListText = (newOrder.items_json || [])
            .map((it) => `  • ${it.emoji || '📦'} ${it.brand_name ? `<b>[${it.brand_name}]</b> ` : ''}${it.name} × ${it.quantity} — ${it.price} BYN`)
            .join('\n');

          const deliveryInfo =
            newOrder.delivery_type === 'pickup'
              ? `🏪 <b>Самовывоз (Могилев):</b> ${newOrder.pickup_point_name || 'Точка не указана'}`
              : `🚚 <b>Доставка (Могилев):</b> ${newOrder.delivery_address || 'Адрес не указан'} (+${newOrder.delivery_price} BYN)`;

          let priceInfo = `💰 <b>Итого:</b> ${newOrder.total} BYN`;
          if (newOrder.discount_amount > 0) {
            priceInfo += `\n   Скидка: -${newOrder.discount_amount} BYN`;
          }
          if (newOrder.promocode_code) {
            priceInfo += `\n   Промокод: ${newOrder.promocode_code}`;
          }

          const adminNotice = `🆕 <b>НОВЫЙ ЗАКАЗ #${newOrder.id}!</b>\n\n👤 <b>Покупатель:</b> @${currentUser?.username || 'unknown'} (${currentUser?.first_name || 'Пользователь'})\n🆔 <b>User ID:</b> <code>${newOrder.user_id}</code>\n\n📦 <b>Товары:</b>\n${itemsListText}\n\n${priceInfo}\n\n${deliveryInfo}\n💬 <b>Комментарий:</b> ${newOrder.comment || 'Нет'}\n\n🔗 <a href="tg://user?id=${newOrder.user_id}">✉️ Связаться с покупателем</a>\n📩 Менеджер: @${settings.manager_username || 'puff_mngr'}`;

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
        } catch (botErr) {
          console.warn('Bot direct notification error:', botErr);
        }
      }

      clearCart();
      hapticNotification('success');
      return { success: true, orderId: newOrder.id, total: newOrder.total };
    } catch (err: any) {
      console.error('placeOrder error:', err);
      return { success: false, error: err?.message || 'Не удалось создать заказ' };
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    const success = db.updateOrderStatus(orderId, newStatus);
    if (success) {
      hapticNotification('success');

      const targetOrder = orders.find((o) => o.id === orderId);
      
      // 1. Primary: Notify Flask API (bot.py) of status change
      try {
        const response = await fetch('/api/orders/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order_id: orderId,
            status: newStatus,
            user_id: targetOrder?.user_id,
          }),
        });
        if (response.ok) {
          console.log(`✅ Successfully notified Flask API of status change for order #${orderId}`);
        } else {
          console.warn(`⚠️ Flask API returned status ${response.status} for order #${orderId} status update`);
        }
      } catch (apiErr) {
        console.error('❌ Failed to send status change POST request to Flask API:', apiErr);
      }

      // 2. Secondary/Fallback: Send status notification to customer via direct Telegram Bot sendMessage
      if (targetOrder && targetOrder.user_id && BOT_TOKEN) {
        const statusTitles: Record<OrderStatus, string> = {
          pending: 'В обработке ⏳',
          confirmed: 'Подтвержден ✅',
          ready_for_pickup: '📍 Менеджер на точке / Заказ готов к выдаче (Могилев)',
          courier_sent: '🚗 Курьер отправлен / В пути 🚚',
          courier_arrived: '📍 Курьер прибыл на адрес (встречайте)',
          shipped: 'Передан курьеру / В пути 🚚',
          completed: 'Выполнен 🎉 Спасибо за покупку!',
          cancelled: 'Отменен ❌',
        };

        const msg = `🔔 <b>Статус заказа #${orderId} изменен!</b>\n\nТекущий статус: <b>${statusTitles[newStatus] || newStatus}</b>\n\n📩 Менеджер в Могилеве: @${settings.manager_username || 'puff_mngr'}`;

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

  const updateOrderFinances = async (orderId: number, total: number, totalMargin: number) => {
    const success = db.updateOrderFinances(orderId, total, totalMargin);
    if (success) hapticNotification('success');
    return success;
  };

  // Admin Database CRUD Operations
  const saveSettings = async (newSettings: Partial<ShopSettings>) => {
    db.updateSettings(newSettings);
    hapticNotification('success');
    return true;
  };

  const setLineMargin = (categorySlug: string, lineName: string, margin: number) => {
    db.setLineMargin(categorySlug, lineName, margin);
  };

  const getLineMargin = (categorySlug: string, lineName: string): number | undefined => {
    return db.getLineMargin(categorySlug, lineName);
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

  const bulkUpdateProductImage = async (filter: { category_slug?: string; brand_slug?: string }, imageUrl: string) => {
    const updatedCount = db.bulkUpdateProductImage(filter, imageUrl);
    hapticNotification('success');
    return updatedCount;
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
    db.addAttributeValue({
      attribute_group_slug: attributeGroupSlug,
      value: lineName,
      sort_order: 99,
      is_active: true,
    });
    hapticNotification('success');
    return true;
  };

  const deleteBrandLine = async (id: number) => {
    const values = db.getAttributeValues().filter((v) => v.id !== id);
    localStorage.setItem('puff_db_attr_values_v5', JSON.stringify(values));
    syncFromDb();
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

  const addBundlePromotion = async (promo: Omit<BundlePromotion, 'id'>) => {
    db.addBundlePromotion(promo);
    hapticNotification('success');
    return true;
  };

  const deleteBundlePromotion = async (id: number) => {
    db.deleteBundlePromotion(id);
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

  const addAdminUser = async (
    userId: number | string | null,
    username: string,
    role: 'admin' | 'moderator'
  ) => {
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
      cost_price?: number;
      margin_profit?: number;
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
    db.resetToInvoiceData();
    hapticNotification('warning');
  };

  return (
    <StoreContext.Provider
      value={{
        currentUser,
        isAuthorizedAdmin,
        isAdmin,
        isModerator,
        isMasterAdmin,
        userRole,
        isAdminMode,
        toggleAdminMode,
        setCurrentUser,
        loginAsAdmin,
        logoutUser,
        settings,
        categories,
        brands,
        models,
        attributeGroups,
        attributeValues,
        products,
        catalogProducts,
        productColors,
        cart,
        orders,
        promotions,
        promocodes,
        bundlePromotions,
        reservations,
        pickupPoints,
        admins,
        users,
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
        updateOrderFinances,
        saveSettings,
        setLineMargin,
        getLineMargin,
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
        addBundlePromotion,
        deleteBundlePromotion,
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
