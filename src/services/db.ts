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
} from '../services/mockData';

// Hardcoded Master Admins
export const HARDCODED_ADMIN_IDS = [5659638424, 8161417737];

const DB_KEYS = {
  SETTINGS: 'puff_db_settings_v3',
  PRODUCTS: 'puff_db_products_v3',
  CATEGORIES: 'puff_db_categories_v3',
  BRANDS: 'puff_db_brands_v3',
  MODELS: 'puff_db_models_v3',
  ATTR_GROUPS: 'puff_db_attr_groups_v3',
  ATTR_VALUES: 'puff_db_attr_values_v3',
  COLORS: 'puff_db_colors_v3',
  ORDERS: 'puff_db_orders_v3',
  PROMOTIONS: 'puff_db_promotions_v3',
  PROMOCODES: 'puff_db_promocodes_v3',
  PICKUP_POINTS: 'puff_db_pickup_points_v3',
  ADMINS: 'puff_db_admins_v3',
};

// Database Schema
export interface DatabaseSchema {
  settings: ShopSettings;
  products: Product[];
  categories: Category[];
  brands: Brand[];
  models: ProductModel[];
  attributeGroups: AttributeGroup[];
  attributeValues: AttributeValue[];
  productColors: ProductColor[];
  orders: Order[];
  promotions: Promotion[];
  promocodes: Promocode[];
  pickupPoints: PickupPoint[];
  admins: AdminUser[];
}

// Local Storage Helper with Fallbacks
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

/**
 * Self-contained In-Root Local Database Engine
 */
class LocalDatabase {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initDatabase();
  }

  // Subscribe to database change events
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  // Initialize Tables
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

  // ================= SETTINGS =================
  public getSettings(): ShopSettings {
    return getStoredItem<ShopSettings>(DB_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  public updateSettings(partial: Partial<ShopSettings>): ShopSettings {
    const current = this.getSettings();
    const updated = { ...current, ...partial };
    setStoredItem(DB_KEYS.SETTINGS, updated);
    this.notify();
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
    return updatedProduct;
  }

  public deleteProduct(id: number): boolean {
    const products = this.getProducts();
    const filtered = products.filter((p) => p.id !== id);
    if (filtered.length === products.length) return false;
    setStoredItem(DB_KEYS.PRODUCTS, filtered);
    this.notify();
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
      newItems.push({
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
      });
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
    const newCategory: Category = { ...cat, id: nextId };
    const updated = [...categories, newCategory];
    setStoredItem(DB_KEYS.CATEGORIES, updated);
    this.notify();
    return newCategory;
  }

  public deleteCategory(id: number): boolean {
    const categories = this.getCategories();
    const filtered = categories.filter((c) => c.id !== id);
    setStoredItem(DB_KEYS.CATEGORIES, filtered);
    this.notify();
    return true;
  }

  // ================= BRANDS =================
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
    return newBrand;
  }

  public deleteBrand(id: number): boolean {
    const brands = this.getBrands();
    const filtered = brands.filter((b) => b.id !== id);
    setStoredItem(DB_KEYS.BRANDS, filtered);
    this.notify();
    return true;
  }

  // ================= MODELS =================
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
    return newModel;
  }

  public deleteModel(id: number): boolean {
    const models = this.getModels();
    const filtered = models.filter((m) => m.id !== id);
    setStoredItem(DB_KEYS.MODELS, filtered);
    this.notify();
    return true;
  }

  // ================= ATTRIBUTES & LINES =================
  public getAttributeGroups(): AttributeGroup[] {
    return getStoredItem<AttributeGroup[]>(DB_KEYS.ATTR_GROUPS, INITIAL_ATTRIBUTE_GROUPS);
  }

  public getAttributeValues(): AttributeValue[] {
    return getStoredItem<AttributeValue[]>(DB_KEYS.ATTR_VALUES, INITIAL_ATTRIBUTE_VALUES);
  }

  public addBrandLine(attributeGroupSlug: string, lineName: string): AttributeValue {
    const groups = this.getAttributeGroups();
    let group = groups.find((g) => g.slug === attributeGroupSlug);
    if (!group) {
      const nextGroupId = groups.length > 0 ? Math.max(...groups.map((g) => g.id)) + 1 : 1;
      group = {
        id: nextGroupId,
        name: lineName,
        slug: attributeGroupSlug,
        category_slug: 'liquid',
        sort_order: groups.length + 1,
        is_active: true,
      };
      setStoredItem(DB_KEYS.ATTR_GROUPS, [...groups, group]);
    }

    const values = this.getAttributeValues();
    const nextValId = values.length > 0 ? Math.max(...values.map((v) => v.id)) + 1 : 1;
    const newValue: AttributeValue = {
      id: nextValId,
      attribute_group_slug: attributeGroupSlug,
      value: lineName,
      sort_order: values.length + 1,
      is_active: true,
    };
    setStoredItem(DB_KEYS.ATTR_VALUES, [...values, newValue]);
    this.notify();
    return newValue;
  }

  public deleteBrandLine(id: number): boolean {
    const values = this.getAttributeValues();
    const filtered = values.filter((v) => v.id !== id);
    setStoredItem(DB_KEYS.ATTR_VALUES, filtered);
    this.notify();
    return true;
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
    return newPromo;
  }

  public deletePromotion(id: number): boolean {
    const promos = this.getPromotions();
    const filtered = promos.filter((p) => p.id !== id);
    setStoredItem(DB_KEYS.PROMOTIONS, filtered);
    this.notify();
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
    return newCode;
  }

  public deletePromocode(id: number): boolean {
    const codes = this.getPromocodes();
    const filtered = codes.filter((c) => c.id !== id);
    setStoredItem(DB_KEYS.PROMOCODES, filtered);
    this.notify();
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
    return newPoint;
  }

  public deletePickupPoint(id: number): boolean {
    const points = this.getPickupPoints();
    const filtered = points.filter((p) => p.id !== id);
    setStoredItem(DB_KEYS.PICKUP_POINTS, filtered);
    this.notify();
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
    return newOrder;
  }

  public updateOrderStatus(orderId: number, status: OrderStatus): boolean {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id === orderId);
    if (index === -1) return false;
    orders[index] = { ...orders[index], status };
    setStoredItem(DB_KEYS.ORDERS, orders);
    this.notify();
    return true;
  }

  public cancelOrder(orderId: number): boolean {
    return this.updateOrderStatus(orderId, 'cancelled');
  }

  // ================= ADMINS =================
  public getAdmins(): AdminUser[] {
    return getStoredItem<AdminUser[]>(DB_KEYS.ADMINS, INITIAL_ADMINS);
  }

  public addAdminUser(userId: number, username: string, role: 'admin' | 'moderator'): AdminUser {
    const admins = this.getAdmins();
    const existing = admins.find((a) => a.user_id === userId);
    if (existing) {
      existing.role = role;
      existing.is_active = true;
      setStoredItem(DB_KEYS.ADMINS, [...admins]);
      this.notify();
      return existing;
    }
    const nextId = admins.length > 0 ? Math.max(...admins.map((a) => a.id)) + 1 : 1;
    const newAdmin: AdminUser = {
      id: nextId,
      user_id: userId,
      username,
      role,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    const updated = [...admins, newAdmin];
    setStoredItem(DB_KEYS.ADMINS, updated);
    this.notify();
    return newAdmin;
  }

  public deleteAdminUser(id: number): boolean {
    const admins = this.getAdmins();
    const filtered = admins.filter((a) => a.id !== id);
    setStoredItem(DB_KEYS.ADMINS, filtered);
    this.notify();
    return true;
  }

  // Strict Admin Check
  public isUserAdmin(userId: number | undefined | null): boolean {
    if (!userId) return false;
    const numId = Number(userId);
    if (HARDCODED_ADMIN_IDS.includes(numId)) return true;
    const admins = this.getAdmins();
    return admins.some((a) => Number(a.user_id) === numId && a.is_active && (a.role === 'admin' || a.role === 'moderator'));
  }

  // ================= EXPORT & IMPORT =================
  public exportDatabase(): string {
    const dump: DatabaseSchema = {
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
      const data = JSON.parse(jsonString) as Partial<DatabaseSchema>;
      if (data.settings) setStoredItem(DB_KEYS.SETTINGS, data.settings);
      if (data.products) setStoredItem(DB_KEYS.PRODUCTS, data.products);
      if (data.categories) setStoredItem(DB_KEYS.CATEGORIES, data.categories);
      if (data.brands) setStoredItem(DB_KEYS.BRANDS, data.brands);
      if (data.models) setStoredItem(DB_KEYS.MODELS, data.models);
      if (data.attributeGroups) setStoredItem(DB_KEYS.ATTR_GROUPS, data.attributeGroups);
      if (data.attributeValues) setStoredItem(DB_KEYS.ATTR_VALUES, data.attributeValues);
      if (data.promotions) setStoredItem(DB_KEYS.PROMOTIONS, data.promotions);
      if (data.promocodes) setStoredItem(DB_KEYS.PROMOCODES, data.promocodes);
      if (data.pickupPoints) setStoredItem(DB_KEYS.PICKUP_POINTS, data.pickupPoints);
      if (data.orders) setStoredItem(DB_KEYS.ORDERS, data.orders);
      if (data.admins) setStoredItem(DB_KEYS.ADMINS, data.admins);
      this.notify();
      return true;
    } catch (e) {
      console.error('Failed to import database JSON:', e);
      return false;
    }
  }

  public resetToDefaults(): void {
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
    setStoredItem(DB_KEYS.ORDERS, []);
    this.notify();
  }
}

// Global Singleton Instance
export const db = new LocalDatabase();
