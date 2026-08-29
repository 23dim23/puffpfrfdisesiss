export type CategorySlug = 'all' | 'on-sale' | 'liquid' | 'accessories' | 'pod' | 'disposable' | 'snus' | 'nicboosters';
export type TabType = 'home' | 'catalog' | 'cart' | 'prizes' | 'orders' | 'admin';

export interface Category {
  id: number;
  slug: string;
  name: string;
  icon?: string;
  sort_order?: number;
  is_active: boolean;
  default_margin?: number; // Маржа по умолчанию для категории в BYN
}

export interface Brand {
  id: number;
  slug: string;
  name: string;
  category_slug: string;
  sort_order?: number;
  is_active: boolean;
  default_margin?: number; // Маржа для бренда в BYN
}

export interface ProductModel {
  id: number;
  slug: string;
  name: string;
  category_slug: string;
  brand_slug: string;
  sort_order?: number;
  is_active: boolean;
  default_margin?: number;
}

export interface AttributeGroup {
  id: number;
  slug: string;
  name: string;
  category_slug: string;
  sort_order?: number;
  is_active: boolean;
}

export interface AttributeValue {
  id: number;
  attribute_group_slug: string;
  value: string;
  sort_order?: number;
  is_active: boolean;
  margin_profit?: number; // Маржа для линейки вкусов / серии в BYN
}

export interface ProductColor {
  id: number;
  product_id: number;
  color_name: string;
  color_hex?: string;
  stock_quantity: number;
  sort_order?: number;
}

export interface ProductAttribute {
  id?: number;
  product_id: number;
  attribute_group_slug: string;
  attribute_value_id: number;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  cost_price?: number | null; // Цена закупа / себестоимость (в BYN)
  margin_profit?: number | null; // Чистая прибыль с 1 шт (в BYN)
  discount_price?: number | null;
  emoji?: string;
  image_url?: string;
  category_slug: string;
  brand_slug?: string | null;
  model_slug?: string | null;
  nicotine_strength?: string | null; // Крепость (напр. "20 мг", "50 мг")
  flavor?: string | null; // Вкус
  flavor_line?: string | null; // Линейка вкусов / серия
  stock_quantity: number;
  in_stock: boolean;
  sold_count?: number;
  is_hit?: boolean;
  is_new?: boolean;
  description?: string;
  created_at?: string;
}

export interface CartItem extends Product {
  quantity: number;
  color_id?: number | null;
  selected_color_name?: string;
  selected_flavor?: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'ready_for_pickup'
  | 'courier_sent'
  | 'courier_arrived'
  | 'shipped'
  | 'completed'
  | 'cancelled';

export type DeliveryType = 'pickup' | 'delivery';

export interface OrderItem {
  id: number;
  name: string;
  price: number;
  cost_price?: number | null;
  margin_profit?: number | null;
  quantity: number;
  emoji?: string;
  color_id?: number | null;
  color_name?: string;
}

export interface Order {
  id: number;
  user_id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  subtotal: number;
  discount_amount: number;
  delivery_price: number;
  total: number;
  total_margin?: number; // Общая чистая прибыль за заказ (для админов)
  currency: string;
  delivery_type: DeliveryType;
  pickup_point_id?: number | null;
  pickup_point_name?: string | null;
  delivery_address?: string | null;
  delivery_comment?: string | null;
  comment?: string | null;
  promocode_id?: number | null;
  promocode_code?: string | null;
  items_json: OrderItem[];
  status: OrderStatus;
  stock_deducted?: boolean;
  created_at: string;
}

export interface Promotion {
  id: number;
  title: string;
  short_description?: string;
  description: string;
  condition_text?: string;
  image_emoji?: string;
  image_url?: string;
  button_text?: string;
  button_url?: string;
  is_active: boolean;
  sort_order?: number;
  created_at?: string;
}

export interface Promocode {
  id: number;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order_amount?: number;
  max_uses?: number;
  used_count: number;
  valid_until?: string;
  is_active: boolean;
  created_at?: string;
}

export interface ProductReservation {
  id: string; // userId_productId_colorId
  user_id: number;
  product_id: number;
  quantity: number;
  expires_at: number; // timestamp
}

export interface PickupPoint {
  id: number;
  name: string;
  address: string;
  working_hours?: string;
  comment?: string;
  is_active: boolean;
  sort_order?: number;
}

export interface AdminUser {
  id: number;
  user_id: number;
  username: string;
  role: 'admin' | 'moderator';
  is_active: boolean;
  created_at?: string;
}

export interface ShopUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  source: 'bot' | 'miniapp';
  created_at: string;
  last_seen_at: string;
  orders_count?: number;
}

export interface ShopSettings {
  welcome_title: string;
  welcome_description: string;
  logo_url: string;
  delivery_price: number;
  free_delivery_min_items: number;
  manager_username: string;
  line_margins?: Record<string, number>; // key: "category_slug:line_name" -> margin BYN
  delivery_card_title?: string; // Заголовок карточки курьера
  delivery_card_subtitle?: string; // Время / график доставки
  delivery_card_conditions?: string; // Условия / тарифы
  delivery_card_note?: string; // Примечание / предупреждение
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}
