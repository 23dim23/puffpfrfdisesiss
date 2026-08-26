// ========================================
// ===== КОНФИГУРАЦИЯ =====
// ========================================

const SUPABASE_URL = 'https://prtwcgqidlivkaanbowl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydHdjZ3FpZGxpdmthYW5ib3dsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc3MzcwNiwiZXhwIjoyMTAyMzQ5NzA2fQ.dvZAnH78ThbtWUTcn9mwveBXhV4RtyefUeFit4mHEUI';
const BOT_TOKEN = '8870349321:AAEXFersNinRpHnPETbR_vGFn_TnGWOCums';

// ========================================
// ===== ИНИЦИАЛИЗАЦИЯ =====
// ========================================

const tg = window.Telegram.WebApp;
tg.expand();

// ========================================
// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
// ========================================

let products = [];
let cart = [];
let isAdmin = false;
let currentUser = null;
let currentCategory = 'all';
let currentSubFilters = {};
let currentPage = 'page-home';
let categories = [];
let brands = [];
let models = [];
let attributeGroups = [];
let attributeValues = [];
let settings = {};
let pickupPoints = [];
let promotions = [];
let promocodes = [];

// ========================================
// ===== ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЯ =====
// ========================================

function getUser() {
    try {
        const user = tg.initDataUnsafe?.user;
        if (user) {
            currentUser = user;
            document.getElementById('user-name').textContent = user.first_name || 'Гость';
            return user;
        }
    } catch (e) {
        console.warn('⚠️ Не удалось получить пользователя');
    }
    return null;
}

// ========================================
// ===== ЗАГРУЗКА НАСТРОЕК =====
// ========================================

async function loadSettings() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!response.ok) throw new Error('Ошибка загрузки настроек');
        const data = await response.json();
        data.forEach(s => settings[s.key] = s.value);
        console.log('✅ Загружены настройки:', settings);
        return settings;
    } catch (error) {
        console.error('❌ Ошибка загрузки настроек:', error);
        return {};
    }
}

// ========================================
// ===== ЗАГРУЗКА ДАННЫХ =====
// ========================================

async function loadCategories() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/categories?select=*&is_active=eq.true&order=sort_order.asc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!response.ok) throw new Error('Ошибка загрузки категорий');
        categories = await response.json();
        console.log('✅ Загружено категорий:', categories.length);
        return categories;
    } catch (error) {
        console.error('❌ Ошибка загрузки категорий:', error);
        categories = [];
        return [];
    }
}

async function loadBrands() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/brands?select=*&is_active=eq.true&order=sort_order.asc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!response.ok) throw new Error('Ошибка загрузки брендов');
        brands = await response.json();
        console.log('✅ Загружено брендов:', brands.length);
        return brands;
    } catch (error) {
        console.error('❌ Ошибка загрузки брендов:', error);
        brands = [];
        return [];
    }
}

async function loadModels() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/product_models?select=*&is_active=eq.true&order=sort_order.asc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!response.ok) throw new Error('Ошибка загрузки моделей');
        models = await response.json();
        console.log('✅ Загружено моделей:', models.length);
        return models;
    } catch (error) {
        console.error('❌ Ошибка загрузки моделей:', error);
        models = [];
        return [];
    }
}

async function loadAttributeGroups() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/attribute_groups?select=*&is_active=eq.true&order=sort_order.asc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!response.ok) throw new Error('Ошибка загрузки групп атрибутов');
        attributeGroups = await response.json();
        console.log('✅ Загружено групп атрибутов:', attributeGroups.length);
        return attributeGroups;
    } catch (error) {
        console.error('❌ Ошибка загрузки групп атрибутов:', error);
        attributeGroups = [];
        return [];
    }
}

async function loadAttributeValues() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/attribute_values?select=*&is_active=eq.true&order=sort_order.asc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!response.ok) throw new Error('Ошибка загрузки значений атрибутов');
        attributeValues = await response.json();
        console.log('✅ Загружено значений атрибутов:', attributeValues.length);
        return attributeValues;
    } catch (error) {
        console.error('❌ Ошибка загрузки значений атрибутов:', error);
        attributeValues = [];
        return [];
    }
}

async function loadProducts() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!response.ok) throw new Error('Ошибка загрузки товаров');
        const data = await response.json();
        products = (data || []).map(p => ({
            ...p,
            inStock: p.in_stock !== false && (p.stock_quantity === undefined || p.stock_quantity > 0)
        }));
        console.log('✅ Загружено товаров:', products.length);
        return products;
    } catch (error) {
        console.error('❌ Ошибка загрузки товаров:', error);
        products = [];
        return [];
    }
}

async function loadPickupPoints() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/pickup_points?select=*&is_active=eq.true&order=sort_order.asc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!response.ok) throw new Error('Ошибка загрузки точек самовывоза');
        pickupPoints = await response.json();
        console.log('✅ Загружено точек самовывоза:', pickupPoints.length);
        return pickupPoints;
    } catch (error) {
        console.error('❌ Ошибка загрузки точек самовывоза:', error);
        pickupPoints = [];
        return [];
    }
}

async function loadPromotions() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/promotions?select=*&is_active=eq.true&order=sort_order.asc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!response.ok) throw new Error('Ошибка загрузки акций');
        promotions = await response.json();
        console.log('✅ Загружено акций:', promotions.length);
        return promotions;
    } catch (error) {
        console.error('❌ Ошибка загрузки акций:', error);
        promotions = [];
        return [];
    }
}

async function loadPromocodes() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/promocodes?select=*&is_active=eq.true`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!response.ok) throw new Error('Ошибка загрузки промокодов');
        promocodes = await response.json();
        console.log('✅ Загружено промокодов:', promocodes.length);
        return promocodes;
    } catch (error) {
        console.error('❌ Ошибка загрузки промокодов:', error);
        promocodes = [];
        return [];
    }
}

// ========================================
// ===== ЗАГРУЗКА ВСЕХ ДАННЫХ =====
// ========================================

async function loadAllData() {
    await Promise.all([
        loadSettings(),
        loadCategories(),
        loadBrands(),
        loadModels(),
        loadAttributeGroups(),
        loadAttributeValues(),
        loadProducts(),
        loadPickupPoints(),
        loadPromotions(),
        loadPromocodes()
    ]);
}

// ========================================
// ===== ОБНОВЛЕНИЕ ПРИВЕТСТВЕННОЙ КАРТОЧКИ =====
// ========================================

function updateWelcomeCard() {
    const title = document.getElementById('welcome-title');
    const desc = document.getElementById('welcome-description');
    
    if (title && settings.welcome_title) {
        title.textContent = settings.welcome_title;
    }
    if (desc && settings.welcome_description) {
        desc.textContent = settings.welcome_description;
    }
}

// ========================================
// ===== ОТОБРАЖЕНИЕ КАТЕГОРИЙ =====
// ========================================

function renderCategories() {
    const container = document.getElementById('categories-scroll');
    if (!container) return;
    
    const cats = categories.filter(c => c.is_active !== false);
    
    if (cats.length === 0) {
        container.innerHTML = `
            <div class="category-card" style="min-width:200px; opacity:0.6; background:rgba(255,255,255,0.04);">
                <span class="cat-emoji">📂</span>
                <span class="cat-name">Категории не загружены</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = cats.map(cat => `
        <div class="category-card" data-category="${cat.slug}" onclick="navigateToCategory('${cat.slug}')">
            <span class="cat-emoji">${cat.icon || '📂'}</span>
            <span class="cat-name">${cat.name}</span>
        </div>
    `).join('');
}

// ========================================
// ===== ОТОБРАЖЕНИЕ ТОВАРОВ СО СКИДКОЙ =====
// ========================================

function renderDiscounts() {
    const container = document.getElementById('discounts-scroll');
    if (!container) return;
    
    const discounted = products.filter(p => p.discount_price && p.discount_price > 0 && p.inStock);
    
    if (discounted.length === 0) {
        container.innerHTML = `
            <div class="product-scroll-card" style="min-width:200px; opacity:0.6; background:rgba(255,255,255,0.04);">
                <span class="product-emoji">🛍️</span>
                <p style="color:#71717a; font-size:13px; margin-top:8px;">Товаров со скидкой пока нет</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = discounted.slice(0, 10).map(p => createProductScrollCard(p)).join('');
}

// ========================================
// ===== ОТОБРАЖЕНИЕ ПОПУЛЯРНЫХ ТОВАРОВ =====
// ========================================

function renderPopular() {
    const container = document.getElementById('popular-scroll');
    if (!container) return;
    
    const popular = products.filter(p => p.inStock).sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
    const topPopular = popular.slice(0, 10);
    
    if (topPopular.length === 0) {
        container.innerHTML = `
            <div class="product-scroll-card" style="min-width:200px; opacity:0.6; background:rgba(255,255,255,0.04);">
                <span class="product-emoji">⭐</span>
                <p style="color:#71717a; font-size:13px; margin-top:8px;">Популярных товаров пока нет</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = topPopular.map(p => createProductScrollCard(p)).join('');
}

// ========================================
// ===== СОЗДАНИЕ КАРТОЧКИ ТОВАРА ДЛЯ СКРОЛЛА =====
// ========================================

function createProductScrollCard(product) {
    const discountPercent = product.discount_price ? Math.round((1 - product.discount_price / product.price) * 100) : 0;
    
    const priceDisplay = product.discount_price ? 
        `<span class="product-price">${product.discount_price} BYN</span>
         <span class="product-old-price">${product.price} BYN</span>
         <span class="product-discount">-${discountPercent}%</span>` :
        `<span class="product-price">${product.price} BYN</span>`;
    
    // Находим бренд
    const brand = brands.find(b => b.slug === product.brand_slug);
    const brandName = brand ? brand.name : '';
    
    return `
        <div class="product-scroll-card" onclick="showProductDetail(${product.id})">
            <div class="product-image-placeholder">
                ${product.emoji || '📦'}
            </div>
            <div class="product-name">${product.name || 'Без названия'}</div>
            <div class="product-brand">${brandName}</div>
            <div class="product-price-row">${priceDisplay}</div>
        </div>
    `;
}

// ========================================
// ===== ПОЛУЧЕНИЕ АТРИБУТОВ ТОВАРА =====
// ========================================

async function getProductAttributes(productId) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/product_attributes?select=*&product_id=eq.${productId}`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!response.ok) throw new Error('Ошибка загрузки атрибутов товара');
        return await response.json();
    } catch (error) {
        console.error('❌ Ошибка загрузки атрибутов:', error);
        return [];
    }
}

// ========================================
// ===== МОДАЛЬНОЕ ОКНО ТОВАРА =====
// ========================================

async function showProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const modal = document.getElementById('product-modal');
    const content = document.getElementById('product-modal-content');
    
    // Получаем атрибуты
    const attrs = await getProductAttributes(productId);
    
    // Находим бренд
    const brand = brands.find(b => b.slug === product.brand_slug);
    const brandName = brand ? brand.name : '';
    
    // Находим модель
    const model = models.find(m => m.slug === product.model_slug);
    const modelName = model ? model.name : '';
    
    // Формируем список атрибутов
    let attrsHtml = '';
    if (attrs.length > 0) {
        attrsHtml = '<div class="modal-attributes">';
        for (const attr of attrs) {
            const group = attributeGroups.find(g => g.slug === attr.attribute_group_slug);
            const value = attributeValues.find(v => v.id === attr.attribute_value_id);
            if (group && value) {
                attrsHtml += `
                    <div class="modal-attr-item">
                        <span class="attr-label">${group.name}</span>
                        <span class="attr-value">${value.value}</span>
                    </div>
                `;
            }
        }
        attrsHtml += '</div>';
    }
    
    const discountPercent = product.discount_price ? Math.round((1 - product.discount_price / product.price) * 100) : 0;
    
    const priceDisplay = product.discount_price ? 
        `${product.discount_price} BYN <span style="text-decoration:line-through;color:#71717a;font-size:14px;margin-left:8px;">${product.price} BYN</span>
         <span style="display:inline-block;background:rgba(34,197,94,0.15);color:#22c55e;font-size:12px;font-weight:600;padding:2px 10px;border-radius:12px;margin-left:8px;">-${discountPercent}%</span>` :
        `${product.price} BYN`;
    
    content.innerHTML = `
        <div class="modal-close" onclick="closeProductModal()">✕</div>
        <div class="modal-emoji">${product.emoji || '📦'}</div>
        <h2 class="modal-title">${product.name}</h2>
        <div class="modal-brand">${brandName} ${modelName ? '· ' + modelName : ''}</div>
        <div class="modal-price">${priceDisplay}</div>
        <div class="modal-stock ${product.inStock ? 'in-stock' : 'out-of-stock'}">
            ${product.inStock ? `✅ В наличии (${product.stock_quantity || 0} шт.)` : '❌ Нет в наличии'}
        </div>
        ${attrsHtml}
        <div class="modal-description">${product.short_description || product.description || 'Описание отсутствует'}</div>
        <button class="modal-add-btn" onclick="addToCart(${product.id})" ${!product.inStock ? 'disabled' : ''}>
            🛒 Добавить в корзину
        </button>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
    document.body.style.overflow = '';
}

// ========================================
// ===== КОРЗИНА =====
// ========================================

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showMessage('❌ Ошибка', 'Товар не найден');
        return;
    }
    
    if (!product.inStock) {
        showMessage('❌ Нет в наличии', 'Товар закончился');
        return;
    }
    
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        if (existing.quantity >= product.stock_quantity) {
            showMessage('⚠️ Лимит', `Доступно только ${product.stock_quantity} шт.`);
            return;
        }
        existing.quantity = (existing.quantity || 1) + 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    saveCart();
    updateCartBadge();
    showMessage('✅ Добавлено!', `${product.emoji || '📦'} ${product.name} в корзину`);
}

function saveCart() {
    localStorage.setItem('puff_cart_v2', JSON.stringify(cart));
}

function loadCart() {
    try {
        const data = localStorage.getItem('puff_cart_v2');
        cart = data ? JSON.parse(data) : [];
    } catch (e) {
        cart = [];
    }
    updateCartBadge();
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
}

// ========================================
// ===== НАВИГАЦИЯ =====
// ========================================

function navigateTo(pageId) {
    console.log('🔄 Переход на:', pageId);
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add('active');
    }
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageId);
    });
    
    currentPage = pageId;
}

function navigateToCategory(categorySlug) {
    currentCategory = categorySlug;
    navigateTo('page-catalog');
    renderCatalog();
}

function openManagerChat() {
    const username = settings.manager_username || 'puff_mngr';
    window.open(`https://t.me/${username}`, '_blank');
}

// ========================================
// ===== ОТОБРАЖЕНИЕ КАТАЛОГА =====
// ========================================

function renderCatalog() {
    const container = document.getElementById('catalog-products');
    if (!container) return;
    
    let filtered = products.filter(p => p.inStock);
    
    // Фильтр по категории
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category_slug === currentCategory);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align:center;padding:40px 20px;color:#71717a;">
                <span style="font-size:48px;display:block;margin-bottom:12px;">🔍</span>
                <h3 style="color:#ffffff;margin-bottom:8px;">Товары не найдены</h3>
                <p>Попробуйте изменить фильтры или поиск</p>
            </div>
        `;
        return;
    }
    
    // TODO: Реализовать бесконечный скролл
    container.innerHTML = filtered.map(p => `
        <div class="catalog-item" onclick="showProductDetail(${p.id})">
            <span class="catalog-emoji">${p.emoji || '📦'}</span>
            <div class="catalog-info">
                <div class="catalog-name">${p.name}</div>
                <div class="catalog-price">${p.discount_price || p.price} BYN</div>
            </div>
            <button class="catalog-add-btn" onclick="event.stopPropagation(); addToCart(${p.id})">+</button>
        </div>
    `).join('');
}

// ========================================
// ===== ПРОВЕРКА АДМИНА =====
// ========================================

async function checkAdmin() {
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('⚠️ Режим разработки: админка доступна');
                return true;
            }
            return false;
        }
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/admins?select=*&user_id=eq.${user.id}&is_active=eq.true`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!response.ok) return false;
        const data = await response.json();
        return data && data.length > 0;
    } catch (error) {
        console.error('❌ Ошибка проверки админа:', error);
        return false;
    }
}

// ========================================
// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
// ========================================

function showMessage(title, message) {
    try {
        tg.showPopup({
            title: title,
            message: message,
            buttons: [{ type: 'ok' }]
        });
    } catch (e) {
        alert(`${title}\n\n${message}`);
    }
}

// ========================================
// ===== ИНИЦИАЛИЗАЦИЯ =====
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Инициализация Puff Paradise v2...');
    
    getUser();
    loadCart();
    
    // Загружаем все данные
    await loadAllData();
    
    // Обновляем приветственную карточку
    updateWelcomeCard();
    
    // Рендерим категории
    renderCategories();
    
    // Рендерим скидки и популярное
    renderDiscounts();
    renderPopular();
    
    // Проверяем админа
    isAdmin = await checkAdmin();
    if (isAdmin) {
        document.getElementById('nav-admin').style.display = 'flex';
        console.log('👑 Админ-режим активирован');
    }
    
    // Навигация по клику
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            if (page) navigateTo(page);
        });
    });
    
    // Закрытие модалки
    document.querySelector('.modal-overlay')?.addEventListener('click', closeProductModal);
    
    // Поиск
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            // TODO: Реализовать поиск
            console.log('🔍 Поиск:', searchInput.value);
        });
    }
    
    console.log('✅ Инициализация завершена');
});