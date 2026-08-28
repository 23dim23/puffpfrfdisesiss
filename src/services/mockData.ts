import {
  Category,
  Brand,
  ProductModel,
  AttributeGroup,
  AttributeValue,
  Product,
  ProductColor,
  PickupPoint,
  Promotion,
  Promocode,
  ShopSettings,
  AdminUser,
} from '../types';

export const INITIAL_SETTINGS: ShopSettings = {
  welcome_title: 'Добро пожаловать в Puff Paradise Shop',
  welcome_description:
    'Официальный каталог Puff Paradise в Могилеве: оригинальные жидкости, POD-системы Vaporesso, испарители, картриджи, одноразки и снюс. Быстрая доставка по Могилеву и Беларуси, самовывоз из удобных точек!',
  logo_url: '/logo.png',
  delivery_price: 5.0,
  free_delivery_min_items: 4,
  manager_username: 'puff_mngr',
  delivery_card_title: 'Доставка курьером по Могилеву и области',
  delivery_card_subtitle: 'По будням и выходным с 13:00',
  delivery_card_conditions: 'Стоимость 5.0 BYN • От 4 позиций в заказе — БЕСПЛАТНО',
  delivery_card_note: 'Итоговая стоимость доставки может измениться в зависимости от района Могилева.',
};

export const INITIAL_CATEGORIES: Category[] = [
  { id: 1, slug: 'liquid', name: 'Жидкости', icon: '🧪', sort_order: 1, is_active: true },
  { id: 2, slug: 'pods', name: 'POD-системы', icon: '🔋', sort_order: 2, is_active: true },
  { id: 3, slug: 'consumables', name: 'Расходники', icon: '⚡', sort_order: 3, is_active: true },
  { id: 4, slug: 'disposable', name: 'Одноразки', icon: '💨', sort_order: 4, is_active: true },
  { id: 5, slug: 'snus', name: 'Снюс', icon: '❄️', sort_order: 5, is_active: true },
];

export const INITIAL_BRANDS: Brand[] = [];

export const INITIAL_MODELS: ProductModel[] = [];

export const INITIAL_ATTRIBUTE_GROUPS: AttributeGroup[] = [];

export const INITIAL_ATTRIBUTE_VALUES: AttributeValue[] = [];

/**
 * Clean starter catalog — ready for real batch imports and manager inventory management.
 */
export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_PRODUCT_COLORS: ProductColor[] = [];

export const INITIAL_PICKUP_POINTS: PickupPoint[] = [];

export const INITIAL_PROMOTIONS: Promotion[] = [
  {
    id: 1,
    title: '🎁 Каждый 5-й заказ — подарок от шопа!',
    short_description: 'Оформите 4 заказа в Могилеве и получите бесплатный подарок к 5-му!',
    description:
      'Мы ценим постоянных клиентов Puff Paradise! За каждые 4 успешно выполненных заказа вы получаете гарантированный подарок к вашему 5-му заказу на выбор (жидкость BJORN/PODONKI или скидка на картриджи/одноразки).',
    condition_text: 'Для постоянных покупателей',
    image_emoji: '🎁',
    button_text: 'Написать менеджеру',
    button_url: 'https://t.me/puff_mngr',
    is_active: true,
    sort_order: 1,
  },
  {
    id: 2,
    title: '🎂 Скидка 10% именинникам в день рождения!',
    short_description: 'Покажите дату в Telegram и получите приятный бонус на любой заказ!',
    description:
      'Празднуешь день рождения? Дарим скидку 10% на весь ассортимент (жидкости, одноразки, POD-системы Vaporesso) в день рождения и за 2 дня до/после него! Напиши нашему менеджеру перед оформлением.',
    condition_text: 'Скидка 10%',
    image_emoji: '🎉',
    button_text: 'Получить скидку @puff_mngr',
    button_url: 'https://t.me/puff_mngr',
    is_active: true,
    sort_order: 2,
  },
  {
    id: 3,
    title: '🚚 Бесплатная доставка по Могилеву от 4 позиций!',
    short_description: 'Добавили в корзину от 4 любых товаров? Доставка по Могилеву за наш счет!',
    description:
      'Заказывай больше и экономь на доставке! При заказе от 4 любых позиций (например 2 жижи + 2 картриджа или 4 одноразки) курьер доставит заказ по Могилеву абсолютно бесплатно.',
    condition_text: 'Экономия 5 BYN',
    image_emoji: '🚚',
    button_text: 'Перейти в каталог',
    button_url: '',
    is_active: true,
    sort_order: 3,
  },
];

export const INITIAL_PROMOCODES: Promocode[] = [];

export const INITIAL_ADMINS: AdminUser[] = [
  { id: 1, user_id: 5659638424, username: 'puff_owner', role: 'admin', is_active: true },
  { id: 2, user_id: 8161417737, username: 'puff_admin', role: 'admin', is_active: true },
];
