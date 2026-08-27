import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { firestore } from './firebase';
import {
  Category,
  Brand,
  ProductModel,
  AttributeGroup,
  AttributeValue,
  Product,
  ProductColor,
  Order,
  Promotion,
  Promocode,
  PickupPoint,
  ShopSettings,
  AdminUser,
  OrderStatus,
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

// Hardcoded Master Admins
export const HARDCODED_ADMIN_IDS = [5659638424, 8161417737];

const DB_KEYS = {
  SETTINGS: 'puff_db_settings_v5',
  PRODUCTS: 'puff_db_products_v5',
  CATEGORIES: 'puff_db_categories_v5',
  BRANDS: 'puff_db_brands_v5',
  MODELS: 'puff_db_models_v5',
  ATTR_GROUPS: 'puff_db_attr_groups_v5',
  ATTR_VALUES: 'puff_db_attr_values_v5',
  COLORS: 'puff_db_colors_v5',
  ORDERS: 'puff_db_orders_v5',
  PROMOTIONS: 'puff_db_promotions_v5',
  PROMOCODES: 'puff_db_promocodes_v5',
  PICKUP_POINTS: 'puff_db_pickup_points_v5',
  ADMINS: 'puff_db_admins_v5',
};

// Firestore Collection Names
const FS_COLS = {
  SETTINGS: 'shop_settings',
  PRODUCTS: 'shop_products',
  CATEGORIES: 'shop_categories',
  BRANDS: 'shop_brands',
  MODELS: 'shop_models',
  ATTR_GROUPS: 'shop_attr_groups',
  ATTR_VALUES: 'shop_attr_values',
  COLORS: 'shop_colors',
  ORDERS: 'shop_orders',
  PROMOTIONS: 'shop_promotions',
  PROMOCODES: 'shop_promocodes',
  PICKUP_POINTS: 'shop_pickup_points',
  ADMINS: 'shop_admins',
};

// Local Storage Helper
function getStoredItem<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error(`Error reading ${key} from local database:`, e);
    return defaultValue;
  }
}

function setStoredItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to local database:`, e);
  }
}

// Strip undefined values so Firestore setDoc / updateDoc never fails
function cleanFirestoreData<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_, v) => (v === undefined ? null : v)));
}

/**
 * Unified Cloud Database Engine (Firestore + Realtime Sync + Local Offline Fallback)
 */
class CloudDatabase {
  private listeners: Set<() => void> = new Set();
  private isInitialized = false;

  constructor() {
    this.initDatabase();
    this.setupFirestoreRealtimeSync();
  }

  // Subscribe to database change events
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error notifying DB listener:', err);
      }
    });
  }

  // Local fallback storage initialization
  public initDatabase(): void {
    if (!localStorage.getItem(DB_KEYS.SETTINGS)) {
      setStoredItem(DB_KEYS.SETTINGS, INITIAL_SETTINGS);
    }
    if (!localStorage.getItem(DB_KEYS.PRODUCTS)) {
      setStoredItem(DB_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    }
    if (!localStorage.getItem(DB_KEYS.CATEGORIES)) {
      setStoredItem(DB_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    }
    if (!localStorage.getItem(DB_KEYS.BRANDS)) {
      setStoredItem(DB_KEYS.BRANDS, INITIAL_BRANDS);
    }
    if (!localStorage.getItem(DB_KEYS.MODELS)) {
      setStoredItem(DB_KEYS.MODELS, INITIAL_MODELS);
    }
    if (!localStorage.getItem(DB_KEYS.ATTR_GROUPS)) {
      setStoredItem(DB_KEYS.ATTR_GROUPS, INITIAL_ATTRIBUTE_GROUPS);
    }
    if (!localStorage.getItem(DB_KEYS.ATTR_VALUES)) {
      setStoredItem(DB_KEYS.ATTR_VALUES, INITIAL_ATTRIBUTE_VALUES);
    }
    if (!localStorage.getItem(DB_KEYS.COLORS)) {
      setStoredItem(DB_KEYS.COLORS, INITIAL_PRODUCT_COLORS);
    }
    if (!localStorage.getItem(DB_KEYS.PROMOTIONS)) {
      setStoredItem(DB_KEYS.PROMOTIONS, INITIAL_PROMOTIONS);
    }
    if (!localStorage.getItem(DB_KEYS.PROMOCODES)) {
      setStoredItem(DB_KEYS.PROMOCODES, INITIAL_PROMOCODES);
    }
    if (!localStorage.getItem(DB_KEYS.PICKUP_POINTS)) {
      setStoredItem(DB_KEYS.PICKUP_POINTS, INITIAL_PICKUP_POINTS);
    }
    if (!localStorage.getItem(DB_KEYS.ADMINS)) {
      setStoredItem(DB_KEYS.ADMINS, INITIAL_ADMINS);
    }
    if (!localStorage.getItem(DB_KEYS.ORDERS)) {
      setStoredItem(DB_KEYS.ORDERS, []);
    }
  }

  // Set up realtime Firestore subscribers for multi-device sync
  private setupFirestoreRealtimeSync(): void {
    try {
      // 1. Settings Listener
      onSnapshot(
        doc(firestore, FS_COLS.SETTINGS, 'global'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as ShopSettings;
            setStoredItem(DB_KEYS.SETTINGS, data);
            this.notify();
          } else {
            // Seed settings to Firestore
            setDoc(doc(firestore, FS_COLS.SETTINGS, 'global'), INITIAL_SETTINGS).catch(() => {});
          }
        },
        (err) => console.warn('Firestore settings listener:', err)
      );

      // 2. Orders Listener (Realtime!)
      onSnapshot(
        collection(firestore, FS_COLS.ORDERS),
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => d.data() as Order);
            // Sort by id descending
            list.sort((a, b) => (b.id || 0) - (a.id || 0));
            setStoredItem(DB_KEYS.ORDERS, list);
            this.notify();
          }
        },
        (err) => console.warn('Firestore orders listener:', err)
      );

      // 3. Products Listener
      onSnapshot(
        collection(firestore, FS_COLS.PRODUCTS),
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => d.data() as Product);
            setStoredItem(DB_KEYS.PRODUCTS, list);
            this.notify();
          } else if (!this.isInitialized) {
            this.seedInitialProductsToFirestore();
          }
        },
        (err) => console.warn('Firestore products listener:', err)
      );

      // 4. Admins & Moderators Listener (Realtime!)
      onSnapshot(
        collection(firestore, FS_COLS.ADMINS),
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => d.data() as AdminUser);
            setStoredItem(DB_KEYS.ADMINS, list);
            this.notify();
          } else {
            this.seedInitialAdminsToFirestore();
          }
        },
        (err) => console.warn('Firestore admins listener:', err)
      );

      // 5. Pickup Points Listener
      onSnapshot(
        collection(firestore, FS_COLS.PICKUP_POINTS),
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => d.data() as PickupPoint);
            setStoredItem(DB_KEYS.PICKUP_POINTS, list);
            this.notify();
          } else {
            this.seedInitialPickupPointsToFirestore();
          }
        },
        (err) => console.warn('Firestore pickup points listener:', err)
      );

      // 6. Promotions Listener
      onSnapshot(
        collection(firestore, FS_COLS.PROMOTIONS),
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => d.data() as Promotion);
            setStoredItem(DB_KEYS.PROMOTIONS, list);
            this.notify();
          } else {
            this.seedInitialPromotionsToFirestore();
          }
        },
        (err) => console.warn('Firestore promotions listener:', err)
      );

      // 7. Promocodes Listener
      onSnapshot(
        collection(firestore, FS_COLS.PROMOCODES),
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => d.data() as Promocode);
            setStoredItem(DB_KEYS.PROMOCODES, list);
            this.notify();
          } else {
            this.seedInitialPromocodesToFirestore();
          }
        },
        (err) => console.warn('Firestore promocodes listener:', err)
      );

      // 8. Categories Listener
      onSnapshot(
        collection(firestore, FS_COLS.CATEGORIES),
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => d.data() as Category);
            setStoredItem(DB_KEYS.CATEGORIES, list);
            this.notify();
          } else {
            this.seedInitialCategoriesToFirestore();
          }
        },
        (err) => console.warn('Firestore categories listener:', err)
      );

      // 9. Brands & Models Listener
      onSnapshot(
        collection(firestore, FS_COLS.BRANDS),
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => d.data() as Brand);
            setStoredItem(DB_KEYS.BRANDS, list);
            this.notify();
          }
        },
        (err) => console.warn('Firestore brands listener:', err)
      );

      onSnapshot(
        collection(firestore, FS_COLS.MODELS),
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => d.data() as ProductModel);
            setStoredItem(DB_KEYS.MODELS, list);
            this.notify();
          }
        },
        (err) => console.warn('Firestore models listener:', err)
      );

      this.isInitialized = true;
    } catch (e) {
      console.warn('Firestore realtime sync setup notice:', e);
    }
  }

  // Seeding helpers to populate Firestore from invoice mock data on clean DB
  private async seedInitialProductsToFirestore(): Promise<void> {
    try {
      const snap = await getDocs(collection(firestore, FS_COLS.PRODUCTS));
      if (snap.empty) {
        for (const p of INITIAL_PRODUCTS) {
          await setDoc(doc(firestore, FS_COLS.PRODUCTS, String(p.id)), p);
        }
      }
    } catch (e) {
      console.warn('Product seeding notice:', e);
    }
  }

  private async seedInitialAdminsToFirestore(): Promise<void> {
    try {
      for (const a of INITIAL_ADMINS) {
        await setDoc(doc(firestore, FS_COLS.ADMINS, String(a.id)), a);
      }
    } catch (e) {
      console.warn('Admin seeding notice:', e);
    }
  }

  private async seedInitialPickupPointsToFirestore(): Promise<void> {
    try {
      for (const p of INITIAL_PICKUP_POINTS) {
        await setDoc(doc(firestore, FS_COLS.PICKUP_POINTS, String(p.id)), p);
      }
    } catch (e) {
      console.warn('Pickup point seeding notice:', e);
    }
  }

  private async seedInitialPromotionsToFirestore(): Promise<void> {
    try {
      for (const p of INITIAL_PROMOTIONS) {
        await setDoc(doc(firestore, FS_COLS.PROMOTIONS, String(p.id)), p);
      }
    } catch (e) {
      console.warn('Promotion seeding notice:', e);
    }
  }

  private async seedInitialPromocodesToFirestore(): Promise<void> {
    try {
      for (const p of INITIAL_PROMOCODES) {
        await setDoc(doc(firestore, FS_COLS.PROMOCODES, String(p.id)), p);
      }
    } catch (e) {
      console.warn('Promocode seeding notice:', e);
    }
  }

  private async seedInitialCategoriesToFirestore(): Promise<void> {
    try {
      for (const c of INITIAL_CATEGORIES) {
        await setDoc(doc(firestore, FS_COLS.CATEGORIES, String(c.id)), c);
      }
      for (const b of INITIAL_BRANDS) {
        await setDoc(doc(firestore, FS_COLS.BRANDS, String(b.id)), b);
      }
      for (const m of INITIAL_MODELS) {
        await setDoc(doc(firestore, FS_COLS.MODELS, String(m.id)), m);
      }
    } catch (e) {
      console.warn('Category seeding notice:', e);
    }
  }

  // ================= SETTINGS =================
  public getSettings(): ShopSettings {
    const s = getStoredItem<ShopSettings>(DB_KEYS.SETTINGS, INITIAL_SETTINGS);
    if (!s.logo_url) {
      s.logo_url = '/logo.png';
    }
    return s;
  }

  public updateSettings(partial: Partial<ShopSettings>): ShopSettings {
    const current = this.getSettings();
    const updated = { ...current, ...partial };
    setStoredItem(DB_KEYS.SETTINGS, updated);
    this.notify();

    // Async write to Cloud Firestore
    setDoc(doc(firestore, FS_COLS.SETTINGS, 'global'), updated).catch((err) => {
      console.error('Error saving settings to Firestore:', err);
    });

    return updated;
  }

  // ================= PRODUCTS =================
  public getProducts(): Product[] {
    return getStoredItem<Product[]>(DB_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }

  public addProduct(product: Omit<Product, 'id'>): Product {
    const products = this.getProducts();
    const nextId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
    const newProduct: Product = {
      ...product,
      id: nextId,
      created_at: new Date().toISOString(),
    };
    const updated = [newProduct, ...products];
    setStoredItem(DB_KEYS.PRODUCTS, updated);
    this.notify();

    // Async write to Cloud Firestore
    setDoc(doc(firestore, FS_COLS.PRODUCTS, String(nextId)), newProduct).catch((err) => {
      console.error('Error adding product to Firestore:', err);
    });

    return newProduct;
  }

  public updateProduct(id: number, data: Partial<Product>): Product | null {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return null;
    const updatedProduct = { ...products[index], ...data };
    products[index] = updatedProduct;
    setStoredItem(DB_KEYS.PRODUCTS, products);
    this.notify();

    // Async write to Cloud Firestore
    setDoc(doc(firestore, FS_COLS.PRODUCTS, String(id)), updatedProduct, { merge: true }).catch((err) => {
      console.error('Error updating product in Firestore:', err);
    });

    return updatedProduct;
  }

  public deleteProduct(id: number): boolean {
    const products = this.getProducts();
    const filtered = products.filter((p) => p.id !== id);
    if (filtered.length === products.length) return false;
    setStoredItem(DB_KEYS.PRODUCTS, filtered);
    this.notify();

    // Async delete from Cloud Firestore
    deleteDoc(doc(firestore, FS_COLS.PRODUCTS, String(id))).catch((err) => {
      console.error('Error deleting product from Firestore:', err);
    });

    return true;
  }

  public batchImportProducts(
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
  ): { successCount: number; errors: string[] } {
    const products = this.getProducts();
    let nextId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
    const newItems: Product[] = [];
    const errors: string[] = [];

    for (const item of items) {
      if (!item.name || isNaN(item.price)) {
        errors.push(`Некорректный товар: ${item.name || 'без названия'}`);
        continue;
      }
      const prod: Product = {
        id: nextId++,
        name: item.name,
        price: Number(item.price),
        category_slug: item.category || 'liquid',
        brand_slug: item.brand ? item.brand.toLowerCase() : undefined,
        description: [item.flavor, item.strength].filter(Boolean).join(' • '),
        emoji: item.emoji || '📦',
        in_stock: (item.stock ?? 1) > 0,
        stock_quantity: item.stock ?? 10,
        is_hit: false,
        is_new: true,
        created_at: new Date().toISOString(),
      };
      newItems.push(prod);

      // Save each to Firestore
      setDoc(doc(firestore, FS_COLS.PRODUCTS, String(prod.id)), prod).catch(() => {});
    }

    if (newItems.length > 0) {
      const merged = [...newItems, ...products];
      setStoredItem(DB_KEYS.PRODUCTS, merged);
      this.notify();
    }

    return { successCount: newItems.length, errors };
  }

  // ================= CATEGORIES =================
  public getCategories(): Category[] {
    return getStoredItem<Category[]>(DB_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  }

  public addCategory(cat: Omit<Category, 'id'>): Category {
    const categories = this.getCategories();
    const nextId = categories.length > 0 ? Math.max(...categories.map((c) => c.id)) + 1 : 1;
    const newCat: Category = { ...cat, id: nextId };
    const updated = [...categories, newCat];
    setStoredItem(DB_KEYS.CATEGORIES, updated);
    this.notify();

    setDoc(doc(firestore, FS_COLS.CATEGORIES, String(nextId)), newCat).catch(() => {});
    return newCat;
  }

  public deleteCategory(id: number): boolean {
    const categories = this.getCategories();
    const filtered = categories.filter((c) => c.id !== id);
    setStoredItem(DB_KEYS.CATEGORIES, filtered);
    this.notify();

    deleteDoc(doc(firestore, FS_COLS.CATEGORIES, String(id))).catch(() => {});
    return true;
  }

  // ================= BRANDS & MODELS =================
  public getBrands(): Brand[] {
    return getStoredItem<Brand[]>(DB_KEYS.BRANDS, INITIAL_BRANDS);
  }

  public addBrand(brand: Omit<Brand, 'id'>): Brand {
    const brands = this.getBrands();
    const nextId = brands.length > 0 ? Math.max(...brands.map((b) => b.id)) + 1 : 1;
    const newBrand: Brand = { ...brand, id: nextId };
    const updated = [...brands, newBrand];
    setStoredItem(DB_KEYS.BRANDS, updated);
    this.notify();

    setDoc(doc(firestore, FS_COLS.BRANDS, String(nextId)), newBrand).catch(() => {});
    return newBrand;
  }

  public deleteBrand(id: number): boolean {
    const brands = this.getBrands();
    const filtered = brands.filter((b) => b.id !== id);
    setStoredItem(DB_KEYS.BRANDS, filtered);
    this.notify();

    deleteDoc(doc(firestore, FS_COLS.BRANDS, String(id))).catch(() => {});
    return true;
  }

  public getModels(): ProductModel[] {
    return getStoredItem<ProductModel[]>(DB_KEYS.MODELS, INITIAL_MODELS);
  }

  public addModel(model: Omit<ProductModel, 'id'>): ProductModel {
    const models = this.getModels();
    const nextId = models.length > 0 ? Math.max(...models.map((m) => m.id)) + 1 : 1;
    const newModel: ProductModel = { ...model, id: nextId };
    const updated = [...models, newModel];
    setStoredItem(DB_KEYS.MODELS, updated);
    this.notify();

    setDoc(doc(firestore, FS_COLS.MODELS, String(nextId)), newModel).catch(() => {});
    return newModel;
  }

  public deleteModel(id: number): boolean {
    const models = this.getModels();
    const filtered = models.filter((m) => m.id !== id);
    setStoredItem(DB_KEYS.MODELS, filtered);
    this.notify();

    deleteDoc(doc(firestore, FS_COLS.MODELS, String(id))).catch(() => {});
    return true;
  }

  // ================= ATTRIBUTES =================
  public getAttributeGroups(): AttributeGroup[] {
    return getStoredItem<AttributeGroup[]>(DB_KEYS.ATTR_GROUPS, INITIAL_ATTRIBUTE_GROUPS);
  }

  public getAttributeValues(): AttributeValue[] {
    return getStoredItem<AttributeValue[]>(DB_KEYS.ATTR_VALUES, INITIAL_ATTRIBUTE_VALUES);
  }

  public addAttributeGroup(group: Omit<AttributeGroup, 'id'>): AttributeGroup {
    const groups = this.getAttributeGroups();
    const nextId = groups.length > 0 ? Math.max(...groups.map((g) => g.id)) + 1 : 1;
    const newGroup: AttributeGroup = { ...group, id: nextId };
    const updated = [...groups, newGroup];
    setStoredItem(DB_KEYS.ATTR_GROUPS, updated);
    this.notify();

    setDoc(doc(firestore, FS_COLS.ATTR_GROUPS, String(nextId)), newGroup).catch(() => {});
    return newGroup;
  }

  public addAttributeValue(val: Omit<AttributeValue, 'id'>): AttributeValue {
    const values = this.getAttributeValues();
    const nextId = values.length > 0 ? Math.max(...values.map((v) => v.id)) + 1 : 1;
    const newVal: AttributeValue = { ...val, id: nextId };
    const updated = [...values, newVal];
    setStoredItem(DB_KEYS.ATTR_VALUES, updated);
    this.notify();

    setDoc(doc(firestore, FS_COLS.ATTR_VALUES, String(nextId)), newVal).catch(() => {});
    return newVal;
  }

  // ================= PROMOTIONS =================
  public getPromotions(): Promotion[] {
    return getStoredItem<Promotion[]>(DB_KEYS.PROMOTIONS, INITIAL_PROMOTIONS);
  }

  public addPromotion(promo: Omit<Promotion, 'id'>): Promotion {
    const promos = this.getPromotions();
    const nextId = promos.length > 0 ? Math.max(...promos.map((p) => p.id)) + 1 : 1;
    const newPromo: Promotion = { ...promo, id: nextId };
    const updated = [newPromo, ...promos];
    setStoredItem(DB_KEYS.PROMOTIONS, updated);
    this.notify();

    setDoc(doc(firestore, FS_COLS.PROMOTIONS, String(nextId)), newPromo).catch(() => {});
    return newPromo;
  }

  public deletePromotion(id: number): boolean {
    const promos = this.getPromotions();
    const filtered = promos.filter((p) => p.id !== id);
    setStoredItem(DB_KEYS.PROMOTIONS, filtered);
    this.notify();

    deleteDoc(doc(firestore, FS_COLS.PROMOTIONS, String(id))).catch(() => {});
    return true;
  }

  // ================= PROMOCODES =================
  public getPromocodes(): Promocode[] {
    return getStoredItem<Promocode[]>(DB_KEYS.PROMOCODES, INITIAL_PROMOCODES);
  }

  public addPromocode(code: Omit<Promocode, 'id' | 'used_count'>): Promocode {
    const codes = this.getPromocodes();
    const nextId = codes.length > 0 ? Math.max(...codes.map((c) => c.id)) + 1 : 1;
    const newCode: Promocode = { ...code, id: nextId, used_count: 0 };
    const updated = [newCode, ...codes];
    setStoredItem(DB_KEYS.PROMOCODES, updated);
    this.notify();

    setDoc(doc(firestore, FS_COLS.PROMOCODES, String(nextId)), newCode).catch(() => {});
    return newCode;
  }

  public deletePromocode(id: number): boolean {
    const codes = this.getPromocodes();
    const filtered = codes.filter((c) => c.id !== id);
    setStoredItem(DB_KEYS.PROMOCODES, filtered);
    this.notify();

    deleteDoc(doc(firestore, FS_COLS.PROMOCODES, String(id))).catch(() => {});
    return true;
  }

  // ================= PICKUP POINTS =================
  public getPickupPoints(): PickupPoint[] {
    return getStoredItem<PickupPoint[]>(DB_KEYS.PICKUP_POINTS, INITIAL_PICKUP_POINTS);
  }

  public addPickupPoint(point: Omit<PickupPoint, 'id'>): PickupPoint {
    const points = this.getPickupPoints();
    const nextId = points.length > 0 ? Math.max(...points.map((p) => p.id)) + 1 : 1;
    const newPoint: PickupPoint = { ...point, id: nextId };
    const updated = [...points, newPoint];
    setStoredItem(DB_KEYS.PICKUP_POINTS, updated);
    this.notify();

    setDoc(doc(firestore, FS_COLS.PICKUP_POINTS, String(nextId)), newPoint).catch(() => {});
    return newPoint;
  }

  public deletePickupPoint(id: number): boolean {
    const points = this.getPickupPoints();
    const filtered = points.filter((p) => p.id !== id);
    setStoredItem(DB_KEYS.PICKUP_POINTS, filtered);
    this.notify();

    deleteDoc(doc(firestore, FS_COLS.PICKUP_POINTS, String(id))).catch(() => {});
    return true;
  }

  // ================= ORDERS =================
  public getOrders(): Order[] {
    return getStoredItem<Order[]>(DB_KEYS.ORDERS, []);
  }

  public createOrder(order: Omit<Order, 'id' | 'created_at'>): Order {
    const orders = this.getOrders();
    const nextId = 1000 + orders.length + 1;
    const newOrder: Order = {
      ...order,
      id: nextId,
      created_at: new Date().toISOString(),
    };
    const updated = [newOrder, ...orders];
    setStoredItem(DB_KEYS.ORDERS, updated);
    this.notify();

    // Persist immediately to Cloud Firestore
    setDoc(doc(firestore, FS_COLS.ORDERS, String(nextId)), cleanFirestoreData(newOrder)).catch((err) => {
      console.error('Error saving order to Firestore:', err);
    });

    return newOrder;
  }

  public updateOrderStatus(orderId: number, status: OrderStatus): boolean {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id === orderId);
    if (index === -1) return false;
    orders[index] = { ...orders[index], status };
    setStoredItem(DB_KEYS.ORDERS, orders);
    this.notify();

    // Update in Cloud Firestore
    updateDoc(doc(firestore, FS_COLS.ORDERS, String(orderId)), { status }).catch((err) => {
      console.error('Error updating order status in Firestore:', err);
    });

    return true;
  }

  public cancelOrder(orderId: number): boolean {
    return this.updateOrderStatus(orderId, 'cancelled');
  }

  // ================= ADMINS & MODERATORS =================
  public getAdmins(): AdminUser[] {
    return getStoredItem<AdminUser[]>(DB_KEYS.ADMINS, INITIAL_ADMINS);
  }

  public addAdminUser(
    userIdInput?: number | string | null,
    usernameInput?: string | null,
    role: 'admin' | 'moderator' = 'moderator'
  ): AdminUser {
    const admins = this.getAdmins();
    const cleanUsername = (usernameInput || '').replace(/^@/, '').trim();
    const parsedId = userIdInput ? parseInt(String(userIdInput), 10) : 0;

    let finalUserId = !isNaN(parsedId) && parsedId > 0 ? parsedId : 0;
    if (finalUserId === 0 && cleanUsername) {
      let hash = 0;
      for (let i = 0; i < cleanUsername.length; i++) {
        hash = (hash << 5) - hash + cleanUsername.charCodeAt(i);
        hash |= 0;
      }
      finalUserId = Math.abs(hash) || Math.floor(Math.random() * 899999999 + 100000000);
    }

    const finalUsername = cleanUsername || (finalUserId > 0 ? `user_${finalUserId}` : 'moderator');

    const existingIndex = admins.findIndex((a) => {
      const matchId = finalUserId > 0 && Number(a.user_id) === finalUserId;
      const matchUsername =
        cleanUsername &&
        a.username &&
        a.username.replace(/^@/, '').toLowerCase().trim() === cleanUsername.toLowerCase();
      return Boolean(matchId || matchUsername);
    });

    if (existingIndex > -1) {
      const updatedAdmin = {
        ...admins[existingIndex],
        user_id: finalUserId > 0 ? finalUserId : admins[existingIndex].user_id,
        username: finalUsername,
        role,
        is_active: true,
      };
      admins[existingIndex] = updatedAdmin;
      setStoredItem(DB_KEYS.ADMINS, [...admins]);
      this.notify();

      setDoc(doc(firestore, FS_COLS.ADMINS, String(updatedAdmin.id)), updatedAdmin).catch(() => {});
      return updatedAdmin;
    }

    const nextId = admins.length > 0 ? Math.max(...admins.map((a) => a.id)) + 1 : 1;
    const newAdmin: AdminUser = {
      id: nextId,
      user_id: finalUserId,
      username: finalUsername,
      role,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    const updated = [...admins, newAdmin];
    setStoredItem(DB_KEYS.ADMINS, updated);
    this.notify();

    // Persist to Cloud Firestore
    setDoc(doc(firestore, FS_COLS.ADMINS, String(nextId)), newAdmin).catch((err) => {
      console.error('Error saving admin to Firestore:', err);
    });

    return newAdmin;
  }

  public deleteAdminUser(id: number): boolean {
    const admins = this.getAdmins();
    const filtered = admins.filter((a) => a.id !== id);
    setStoredItem(DB_KEYS.ADMINS, filtered);
    this.notify();

    deleteDoc(doc(firestore, FS_COLS.ADMINS, String(id))).catch((err) => {
      console.error('Error deleting admin from Firestore:', err);
    });

    return true;
  }

  // Strict Admin/Moderator Check
  public isUserAdmin(userId?: number | string | null, username?: string | null): boolean {
    const numId = userId ? parseInt(String(userId), 10) : 0;
    if (!isNaN(numId) && numId > 0 && HARDCODED_ADMIN_IDS.includes(numId)) {
      return true;
    }

    const cleanUsername = username ? username.replace(/^@/, '').toLowerCase().trim() : '';
    const admins = this.getAdmins();

    return admins.some((a) => {
      if (!a.is_active) return false;
      const matchId = numId > 0 && Number(a.user_id) === numId;
      const matchUsername =
        cleanUsername &&
        a.username &&
        a.username.replace(/^@/, '').toLowerCase().trim() === cleanUsername;
      return Boolean(matchId || matchUsername);
    });
  }

  // Reset / Restore to Invoice Data (Cloud & Local)
  public async resetToInvoiceData(): Promise<void> {
    setStoredItem(DB_KEYS.SETTINGS, INITIAL_SETTINGS);
    setStoredItem(DB_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    setStoredItem(DB_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    setStoredItem(DB_KEYS.BRANDS, INITIAL_BRANDS);
    setStoredItem(DB_KEYS.MODELS, INITIAL_MODELS);
    setStoredItem(DB_KEYS.ATTR_GROUPS, INITIAL_ATTRIBUTE_GROUPS);
    setStoredItem(DB_KEYS.ATTR_VALUES, INITIAL_ATTRIBUTE_VALUES);
    setStoredItem(DB_KEYS.COLORS, INITIAL_PRODUCT_COLORS);
    setStoredItem(DB_KEYS.PROMOTIONS, INITIAL_PROMOTIONS);
    setStoredItem(DB_KEYS.PROMOCODES, INITIAL_PROMOCODES);
    setStoredItem(DB_KEYS.PICKUP_POINTS, INITIAL_PICKUP_POINTS);
    setStoredItem(DB_KEYS.ADMINS, INITIAL_ADMINS);
    this.notify();

    // Re-seed to Firestore
    try {
      await setDoc(doc(firestore, FS_COLS.SETTINGS, 'global'), INITIAL_SETTINGS);
      for (const p of INITIAL_PRODUCTS) {
        await setDoc(doc(firestore, FS_COLS.PRODUCTS, String(p.id)), p);
      }
      for (const a of INITIAL_ADMINS) {
        await setDoc(doc(firestore, FS_COLS.ADMINS, String(a.id)), a);
      }
      for (const pt of INITIAL_PICKUP_POINTS) {
        await setDoc(doc(firestore, FS_COLS.PICKUP_POINTS, String(pt.id)), pt);
      }
    } catch (e) {
      console.warn('Error resetting cloud DB:', e);
    }
  }

  // Export & Import
  public exportDatabase(): string {
    const dump = {
      settings: this.getSettings(),
      products: this.getProducts(),
      categories: this.getCategories(),
      brands: this.getBrands(),
      models: this.getModels(),
      attributeGroups: this.getAttributeGroups(),
      attributeValues: this.getAttributeValues(),
      productColors: getStoredItem(DB_KEYS.COLORS, INITIAL_PRODUCT_COLORS),
      orders: this.getOrders(),
      promotions: this.getPromotions(),
      promocodes: this.getPromocodes(),
      pickupPoints: this.getPickupPoints(),
      admins: this.getAdmins(),
    };
    return JSON.stringify(dump, null, 2);
  }

  public importDatabase(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.settings) this.updateSettings(data.settings);
      if (data.products && Array.isArray(data.products)) {
        setStoredItem(DB_KEYS.PRODUCTS, data.products);
        data.products.forEach((p: Product) => {
          setDoc(doc(firestore, FS_COLS.PRODUCTS, String(p.id)), p).catch(() => {});
        });
      }
      if (data.orders && Array.isArray(data.orders)) {
        setStoredItem(DB_KEYS.ORDERS, data.orders);
        data.orders.forEach((o: Order) => {
          setDoc(doc(firestore, FS_COLS.ORDERS, String(o.id)), o).catch(() => {});
        });
      }
      if (data.admins && Array.isArray(data.admins)) {
        setStoredItem(DB_KEYS.ADMINS, data.admins);
        data.admins.forEach((a: AdminUser) => {
          setDoc(doc(firestore, FS_COLS.ADMINS, String(a.id)), a).catch(() => {});
        });
      }
      this.notify();
      return true;
    } catch (e) {
      console.error('Error importing database:', e);
      return false;
    }
  }
}

export const db = new CloudDatabase();
