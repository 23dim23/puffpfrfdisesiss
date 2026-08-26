export type CategorySlug = 'all' | 'on-sale' | 'liquid' | 'accessories' | 'pod' | 'disposable' | 'snus';
export type TabType = 'home' | 'catalog' | 'cart' | 'prizes' | 'orders' | 'admin';

export interface Category {
  id: number;
  slug: string;
  name: string;
  icon?: string;
  sort_order?: number;
  is_active: boolean;
}

export interface Brand {
  id: number;
  slug: string;
  name: string;
  category_slug: string;
  sort_order?: number;
  is_active: boolean;
}

export interface ProductModel {
  id: number;
  slug: string;
  name: string;
  category_slug: string;
  brand_slug: string;
  sort_order?: number;
  is_active: boolean;
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
  discount_price?: number | null;
  emoji?: string;
  image_url?: string;
  category_slug: string;
  brand_slug?: string | null;
  model_slug?: string | null;
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

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'completed' | 'cancelled';
export type DeliveryType = 'pickup' | 'delivery';

export interface OrderItem {
  id: number;
  name: string;
  price: number;
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

export interface ShopSettings {
  welcome_title: string;
  welcome_description: string;
  logo_url: string;
  delivery_price: number;
  free_delivery_min_items: number;
  manager_username: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}
