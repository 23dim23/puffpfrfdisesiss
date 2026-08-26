// ========================================
// ===== КОНФИГУРАЦИЯ =====
// ========================================

const SUPABASE_URL = 'https://prtwcgqidlivkaanbowl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydHdjZ3FpZGxpdmthYW5ib3dsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc3MzcwNiwiZXhwIjoyMTAyMzQ5NzA2fQ.dvZAnH78ThbtWUTcn9mwveBXhV4RtyefUeFit4mHEUI';
const BOT_TOKEN = '8870349321:AAEXFersNinRpHnPETbR_vGFn_TnGWOCums';

// ========================================
// ===== ХАРДКОД АДМИНОВ =====
// ========================================

const HARDCODED_ADMINS = [5659638424, 8161417737];

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
let currentBrand = 'all';
let currentStrength = 'all';
let currentFlavor = 'all';
let currentLine = 'all';
let currentPage = 'page-home';
let searchQuery = '';
let categories = [];
let brands = [];
let models = [];
let attributeGroups = [];
let attributeValues = [];
let productColors = [];
let settings = {};
let pickupPoints = [];
let promotions = [];
let promocodes = [];
let orders = [];
let appliedPromocode = null;
let deliveryPrice = 5;
let freeDeliveryMinItems = 4;
let managerUsername = 'puff_mngr';
let logoUrl = '';

// Пагинация для каталога
let catalogPage = 1;
let catalogLimit = 20;
let catalogTotal = 0;
let isLoadingMore = false;

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
// ===== ЗАГРУЗКА ДАННЫХ ИЗ SUPABASE =====
// ========================================

async function fetchFromSupabase(table, filters = {}, order = {}) {
    try {
        let url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
        
        Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                url += `&${key}=eq.${filters[key]}`;
            }
        });
        
        if (order.by) {
            url += `&order=${order.by}.${order.direction || 'asc'}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error(`❌ Ошибка загрузки ${table}:`, error);
        return [];
    }
}

async function loadSettings() {
    const data = await fetchFromSupabase('settings');
    data.forEach(s => settings[s.key] = s.value);
    deliveryPrice = parseFloat(settings.delivery_price) || 5;
    freeDeliveryMinItems = parseInt(settings.free_delivery_min_items) || 4;
    managerUsername = settings.manager_username || 'puff_mngr';
    logoUrl = settings.logo_url || '';
    
    // Обновляем логотип
    updateLogo();
    
    console.log('✅ Загружены настройки:', settings);
    return settings;
}

function updateLogo() {
    const logoElements = document.querySelectorAll('.logo-img');
    logoElements.forEach(el => {
        if (logoUrl) {
            el.src = logoUrl;
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    });
}

async function loadCategories() {
    categories = await fetchFromSupabase('categories', { is_active: true }, { by: 'sort_order' });
    console.log('✅ Загружено категорий:', categories.length);
    return categories;
}

async function loadBrands() {
    brands = await fetchFromSupabase('brands', { is_active: true }, { by: 'sort_order' });
    console.log('✅ Загружено брендов:', brands.length);
    return brands;
}

async function loadModels() {
    models = await fetchFromSupabase('product_models', { is_active: true }, { by: 'sort_order' });
    console.log('✅ Загружено моделей:', models.length);
    return models;
}

async function loadAttributeGroups() {
    attributeGroups = await fetchFromSupabase('attribute_groups', { is_active: true }, { by: 'sort_order' });
    console.log('✅ Загружено групп атрибутов:', attributeGroups.length);
    return attributeGroups;
}

async function loadAttributeValues() {
    attributeValues = await fetchFromSupabase('attribute_values', { is_active: true }, { by: 'sort_order' });
    console.log('✅ Загружено значений атрибутов:', attributeValues.length);
    return attributeValues;
}

async function loadProductColors() {
    productColors = await fetchFromSupabase('product_colors', {}, { by: 'sort_order' });
    console.log('✅ Загружено цветов товаров:', productColors.length);
    return productColors;
}

async function loadProducts() {
    const data = await fetchFromSupabase('products');
    products = (data || []).map(p => ({
        ...p,
        inStock: p.in_stock !== false && (p.stock_quantity === undefined || p.stock_quantity > 0)
    }));
    console.log('✅ Загружено товаров:', products.length);
    return products;
}

async function loadPickupPoints() {
    pickupPoints = await fetchFromSupabase('pickup_points', { is_active: true }, { by: 'sort_order' });
    console.log('✅ Загружено точек самовывоза:', pickupPoints.length);
    return pickupPoints;
}

async function loadPromotions() {
    promotions = await fetchFromSupabase('promotions', { is_active: true }, { by: 'sort_order' });
    console.log('✅ Загружено акций:', promotions.length);
    return promotions;
}

async function loadPromocodes() {
    promocodes = await fetchFromSupabase('promocodes', { is_active: true });
    console.log('✅ Загружено промокодов:', promocodes.length);
    return promocodes;
}

async function loadOrders() {
    if (!currentUser) return [];
    const data = await fetchFromSupabase('orders', { user_id: currentUser.id }, { by: 'created_at', direction: 'desc' });
    orders = data || [];
    console.log('✅ Загружено заказов:', orders.length);
    return orders;
}

async function loadAllData() {
    await Promise.all([
        loadSettings(),
        loadCategories(),
        loadBrands(),
        loadModels(),
        loadAttributeGroups(),
        loadAttributeValues(),
        loadProductColors(),
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
    if (title && settings.welcome_title) title.textContent = settings.welcome_title;
    if (desc && settings.welcome_description) desc.textContent = settings.welcome_description;
}

// ========================================
// ===== ОТОБРАЖЕНИЕ НА ГЛАВНОЙ =====
// ========================================

function renderPromotions() {
    const container = document.getElementById('promotions-scroll');
    if (!container) return;
    
    if (promotions.length === 0) {
        container.innerHTML = `
            <div class="promotion-card" style="min-width:200px; opacity:0.6; background:rgba(255,255,255,0.03);">
                <span class="promo-emoji">🎁</span>
                <h4>Скоро здесь будут акции!</h4>
                <p>Следите за обновлениями</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = promotions.map(p => `
        <div class="promotion-card" onclick="showPromotionDetail(${p.id})">
            <span class="promo-emoji">${p.image_emoji || '🎉'}</span>
            <h4>${p.title}</h4>
            <p>${p.short_description || p.description || ''}</p>
            ${p.condition_text ? `<span class="promo-tag">${p.condition_text}</span>` : ''}
        </div>
    `).join('');
}

function renderCategories() {
    const container = document.getElementById('categories-scroll');
    if (!container) return;
    
    if (categories.length === 0) {
        container.innerHTML = `
            <div class="category-card" style="min-width:200px; opacity:0.6; background:rgba(255,255,255,0.03);">
                <span class="cat-emoji">📂</span>
                <span class="cat-name">Категории не загружены</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = categories.map(cat => `
        <div class="category-card" data-category="${cat.slug}" onclick="selectCategory('${cat.slug}')">
            <span class="cat-emoji">${cat.icon || '📂'}</span>
            <span class="cat-name">${cat.name}</span>
        </div>
    `).join('');
}

function renderDiscounts() {
    const container = document.getElementById('discounts-scroll');
    if (!container) return;
    
    const discounted = products.filter(p => p.discount_price && p.discount_price > 0 && p.inStock);
    
    if (discounted.length === 0) {
        container.innerHTML = `
            <div class="product-scroll-card" style="min-width:200px; opacity:0.6; background:rgba(255,255,255,0.03);">
                <div class="product-image-placeholder">🛍️</div>
                <p style="color:#71717a; font-size:13px; margin-top:8px;">Товаров со скидкой пока нет</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = discounted.slice(0, 10).map(p => createProductScrollCard(p)).join('');
}

function renderPopular() {
    const container = document.getElementById('popular-scroll');
    if (!container) return;
    
    const popular = products.filter(p => p.inStock).sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
    const topPopular = popular.slice(0, 10);
    
    if (topPopular.length === 0) {
        container.innerHTML = `
            <div class="product-scroll-card" style="min-width:200px; opacity:0.6; background:rgba(255,255,255,0.03);">
                <div class="product-image-placeholder">⭐</div>
                <p style="color:#71717a; font-size:13px; margin-top:8px;">Популярных товаров пока нет</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = topPopular.map(p => createProductScrollCard(p)).join('');
}

function createProductScrollCard(product) {
    const brand = brands.find(b => b.slug === product.brand_slug);
    const brandName = brand ? brand.name : '';
    
    const discountPercent = product.discount_price ? Math.round((1 - product.discount_price / product.price) * 100) : 0;
    
    const priceDisplay = product.discount_price ? 
        `<span class="product-price">${product.discount_price} BYN</span>
         <span class="product-old-price">${product.price} BYN</span>
         <span class="product-discount">-${discountPercent}%</span>` :
        `<span class="product-price">${product.price} BYN</span>`;
    
    // Получаем фото товара
    const productImage = getProductImage(product.id);
    const imageHtml = productImage ? 
        `<img src="${productImage}" alt="${product.name}" />` : 
        (product.emoji || '📦');
    
    return `
        <div class="product-scroll-card" onclick="showProductDetail(${product.id})">
            <div class="product-image-placeholder">${imageHtml}</div>
            <div class="product-name">${product.name || 'Без названия'}</div>
            <div class="product-brand">${brandName}</div>
            <div class="product-price-row">${priceDisplay}</div>
        </div>
    `;
}

// ========================================
// ===== ФОТОГРАФИИ ТОВАРОВ =====
// ========================================

function getProductImage(productId) {
    // TODO: Реализовать получение фото из БД
    // Пока возвращаем null — будет показываться эмодзи
    return null;
}

function getProductImageHtml(product, size = 'small') {
    const imageUrl = getProductImage(product.id);
    if (imageUrl) {
        return `<img src="${imageUrl}" alt="${product.name}" />`;
    }
    return product.emoji || '📦';
}

// ========================================
// ===== КАТАЛОГ =====
// ========================================

function renderCategoryFilters() {
    const container = document.getElementById('category-filters');
    if (!container) return;
    
    const allCategories = [
        { slug: 'all', name: 'Все товары', icon: '' },
        ...categories
    ];
    
    container.innerHTML = allCategories.map(cat => `
        <button class="filter-tab ${currentCategory === cat.slug ? 'active' : ''}" 
                onclick="selectCategory('${cat.slug}')">
            ${cat.icon || ''} ${cat.name}
        </button>
    `).join('');
}

function selectCategory(slug) {
    currentCategory = slug;
    currentBrand = 'all';
    currentStrength = 'all';
    currentFlavor = 'all';
    currentLine = 'all';
    catalogPage = 1;
    renderCategoryFilters();
    renderSubFilters();
    renderCatalog();
}

function renderSubFilters() {
    const container = document.getElementById('sub-filters-container');
    if (!container) return;
    
    if (currentCategory === 'all' || currentCategory === '') {
        container.innerHTML = '';
        return;
    }
    
    const category = categories.find(c => c.slug === currentCategory);
    if (!category) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Бренды (ассортимент)
    const categoryBrands = brands.filter(b => b.category_slug === currentCategory);
    if (categoryBrands.length > 0) {
        html += `
            <div class="sub-filter-group">
                <div class="sub-filter-group-label">Ассортимент</div>
                <div class="sub-filters">
                    <button class="sub-filter-tab ${currentBrand === 'all' ? 'active' : ''}" onclick="selectBrand('all')">Весь ассортимент</button>
                    ${categoryBrands.map(b => `
                        <button class="sub-filter-tab ${currentBrand === b.slug ? 'active' : ''}" onclick="selectBrand('${b.slug}')">${b.name}</button>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Атрибуты для жидкостей
    if (currentCategory === 'liquid') {
        // Крепость — обобщённые группы
        const strengthGroups = [
            { label: '0 мг', min: 0, max: 0 },
            { label: '20-50 мг', min: 20, max: 50 },
            { label: '60-70 мг', min: 60, max: 70 },
            { label: '80+ мг', min: 80, max: 999 }
        ];
        
        html += `
            <div class="sub-filter-group">
                <div class="sub-filter-group-label">Крепость</div>
                <div class="sub-filters">
                    <button class="sub-filter-tab ${currentStrength === 'all' ? 'active' : ''}" onclick="selectStrength('all')">Вся крепость</button>
                    ${strengthGroups.map(g => `
                        <button class="sub-filter-tab ${currentStrength === g.label ? 'active' : ''}" onclick="selectStrength('${g.label}')">${g.label}</button>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Линейки
        const lineGroup = attributeGroups.find(g => g.slug === 'liquid_brand_line');
        if (lineGroup) {
            const values = attributeValues.filter(v => v.attribute_group_slug === 'liquid_brand_line');
            if (values.length > 0) {
                html += `
                    <div class="sub-filter-group">
                        <div class="sub-filter-group-label">Линейки</div>
                        <div class="sub-filters">
                            <button class="sub-filter-tab ${currentLine === 'all' ? 'active' : ''}" onclick="selectLine('all')">Все линейки</button>
                            ${values.map(v => `
                                <button class="sub-filter-tab ${currentLine === v.value ? 'active' : ''}" onclick="selectLine('${v.value}')">${v.value}</button>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        }
    }
    
    // Атрибуты для снюса
    if (currentCategory === 'snus') {
        const strengthGroups = [
            { label: '75 мг', min: 75, max: 75 },
            { label: '150 мг', min: 150, max: 150 },
            { label: '200 мг', min: 200, max: 200 }
        ];
        
        html += `
            <div class="sub-filter-group">
                <div class="sub-filter-group-label">Крепость</div>
                <div class="sub-filters">
                    <button class="sub-filter-tab ${currentStrength === 'all' ? 'active' : ''}" onclick="selectStrength('all')">Вся крепость</button>
                    ${strengthGroups.map(g => `
                        <button class="sub-filter-tab ${currentStrength === g.label ? 'active' : ''}" onclick="selectStrength('${g.label}')">${g.label}</button>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // POD системы — фильтр по бренду уже есть выше
    
    container.innerHTML = html || '<div style="padding:8px 0;"></div>';
}

function selectBrand(slug) {
    currentBrand = slug;
    catalogPage = 1;
    renderSubFilters();
    renderCatalog();
}

function selectStrength(value) {
    currentStrength = value;
    catalogPage = 1;
    renderSubFilters();
    renderCatalog();
}

function selectLine(value) {
    currentLine = value;
    catalogPage = 1;
    renderSubFilters();
    renderCatalog();
}

function renderCatalog() {
    const container = document.getElementById('catalog-products');
    const counter = document.getElementById('catalog-counter');
    if (!container) return;
    
    let filtered = products.filter(p => p.inStock);
    
    // Фильтр по категории
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category_slug === currentCategory);
    }
    
    // Фильтр по бренду
    if (currentBrand !== 'all') {
        filtered = filtered.filter(p => p.brand_slug === currentBrand);
    }
    
    // Фильтр по крепости (для жидкостей и снюса)
    if (currentStrength !== 'all') {
        // Парсим числовые значения из строки
        let min = 0, max = 999;
        if (currentStrength === '0 мг') { min = 0; max = 0; }
        else if (currentStrength === '20-50 мг') { min = 20; max = 50; }
        else if (currentStrength === '60-70 мг') { min = 60; max = 70; }
        else if (currentStrength === '80+ мг') { min = 80; max = 999; }
        else if (currentStrength === '75 мг') { min = 75; max = 75; }
        else if (currentStrength === '150 мг') { min = 150; max = 150; }
        else if (currentStrength === '200 мг') { min = 200; max = 200; }
        
        // Ищем товары с атрибутом крепости в нужном диапазоне
        // TODO: Реализовать через product_attributes
        // Пока оставляем как заглушку
    }
    
    // Фильтр по линейке (для жидкостей)
    if (currentLine !== 'all') {
        // TODO: Фильтр по атрибутам через product_attributes
    }
    
    // Поиск
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p => {
            const brand = brands.find(b => b.slug === p.brand_slug);
            const model = models.find(m => m.slug === p.model_slug);
            // Ищем по вкусу/характеристикам через атрибуты
            return (p.name || '').toLowerCase().includes(q) ||
                   (brand?.name || '').toLowerCase().includes(q) ||
                   (model?.name || '').toLowerCase().includes(q);
        });
    }
    
    catalogTotal = filtered.length;
    
    // Обновляем счётчик
    if (counter) {
        counter.textContent = `${catalogTotal} поз.`;
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-emoji">🔍</span>
                <h3>Товары не найдены</h3>
                <p>Попробуйте изменить фильтры или поиск</p>
            </div>
        `;
        return;
    }
    
    // Пагинация
    const start = 0;
    const end = catalogPage * catalogLimit;
    const pageItems = filtered.slice(start, end);
    const hasMore = end < filtered.length;
    
    let html = '';
    pageItems.forEach(p => {
        const brand = brands.find(b => b.slug === p.brand_slug);
        const brandName = brand ? brand.name : '';
        
        // Получаем дополнительные детали (вкус, характеристика)
        const details = getProductDetails(p);
        
        const discountPercent = p.discount_price ? Math.round((1 - p.discount_price / p.price) * 100) : 0;
        
        const priceDisplay = p.discount_price ? 
            `${p.discount_price} BYN <span class="catalog-old-price">${p.price} BYN</span>` :
            `${p.price} BYN`;
        
        const imageHtml = getProductImageHtml(p);
        
        html += `
            <div class="catalog-item" onclick="showProductDetail(${p.id})">
                <div class="catalog-image">${imageHtml}</div>
                <div class="catalog-info">
                    <div class="catalog-name">${p.name}</div>
                    <div class="catalog-details">${brandName} · ${details}</div>
                    <div class="catalog-price-row">
                        <span class="catalog-price">${priceDisplay}</span>
                    </div>
                </div>
                <button class="catalog-add-btn" onclick="event.stopPropagation(); addToCart(${p.id})">+</button>
            </div>
        `;
    });
    
    // Кнопка "Показать ещё"
    if (hasMore) {
        html += `
            <div style="text-align:center; padding:12px 0;">
                <button class="welcome-btn primary" onclick="loadMoreCatalog()" style="width:auto; padding:10px 24px; font-size:14px;">
                    Показать ещё (${filtered.length - end} осталось)
                </button>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function getProductDetails(product) {
    // Получаем детали товара из атрибутов
    // TODO: Реализовать через product_attributes
    // Пока возвращаем заглушку
    const brand = brands.find(b => b.slug === product.brand_slug);
    const model = models.find(m => m.slug === product.model_slug);
    
    let details = '';
    if (brand) details += brand.name;
    if (model) details += (details ? ' · ' : '') + model.name;
    
    // Для жидкостей — ищем вкус
    if (product.category_slug === 'liquid') {
        // TODO: Найти атрибут "Вкус"
    }
    
    return details || 'Подробнее';
}

function loadMoreCatalog() {
    if (isLoadingMore) return;
    isLoadingMore = true;
    catalogPage++;
    renderCatalog();
    setTimeout(() => { isLoadingMore = false; }, 500);
}

// ========================================
// ===== ПОИСК =====
// ========================================

function setupSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;
    
    let timeout;
    input.addEventListener('input', function() {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            searchQuery = this.value.trim();
            catalogPage = 1;
            renderCatalog();
        }, 300);
    });
}

// ========================================
// ===== МОДАЛЬНОЕ ОКНО ТОВАРА =====
// ========================================

let modalQuantity = 1;
let selectedColorId = null;

async function showProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const modal = document.getElementById('product-modal');
    const content = document.getElementById('product-modal-content');
    
    // Получаем атрибуты товара
    const productAttrs = await fetchFromSupabase('product_attributes', { product_id: productId });
    
    // Получаем цвета для POD-систем
    let colors = [];
    if (product.category_slug === 'pod') {
        colors = productColors.filter(c => c.product_id === productId && c.stock_quantity > 0);
    }
    
    const brand = brands.find(b => b.slug === product.brand_slug);
    const brandName = brand ? brand.name : '';
    const model = models.find(m => m.slug === product.model_slug);
    const modelName = model ? model.name : '';
    
    const discountPercent = product.discount_price ? Math.round((1 - product.discount_price / product.price) * 100) : 0;
    
    const priceDisplay = product.discount_price ? 
        `${product.discount_price} BYN <span style="text-decoration:line-through;color:#71717a;font-size:14px;margin-left:8px;">${product.price} BYN</span>
         <span style="display:inline-block;background:rgba(34,197,94,0.15);color:#22c55e;font-size:12px;font-weight:600;padding:2px 10px;border-radius:12px;margin-left:8px;">-${discountPercent}%</span>` :
        `${product.price} BYN`;
    
    // Атрибуты
    let attrsHtml = '';
    let flavorValue = '';
    if (productAttrs.length > 0) {
        attrsHtml = '<div class="modal-attributes">';
        for (const attr of productAttrs) {
            const group = attributeGroups.find(g => g.slug === attr.attribute_group_slug);
            const value = attributeValues.find(v => v.id === attr.attribute_value_id);
            if (group && value) {
                if (group.slug === 'liquid_flavor' || group.slug === 'snus_flavor') {
                    flavorValue = value.value;
                }
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
    
    // Цвета для POD
    let colorHtml = '';
    if (colors.length > 0) {
        colorHtml = `
            <div class="modal-color-select">
                <label>🎨 Выберите цвет</label>
                <select id="modal-color-select" onchange="selectColor(this.value)">
                    <option value="">-- Выберите цвет --</option>
                    ${colors.map(c => `
                        <option value="${c.id}" data-stock="${c.stock_quantity}">
                            ${c.color_name} (${c.stock_quantity} шт.)
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
        // Устанавливаем первый цвет по умолчанию
        if (colors.length > 0) {
            selectedColorId = colors[0].id;
        }
    }
    
    const imageHtml = getProductImageHtml(product, 'large');
    
    // Сброс количества
    modalQuantity = 1;
    
    content.innerHTML = `
        <div class="modal-close" onclick="closeModal('product-modal')">✕</div>
        <div class="modal-image">${imageHtml}</div>
        <h2 class="modal-title">${product.name}</h2>
        <div class="modal-subtitle">${brandName} ${modelName ? '· ' + modelName : ''}</div>
        <div class="modal-price">${priceDisplay}</div>
        <div class="modal-stock ${product.inStock ? 'in-stock' : 'out-of-stock'}">
            ${product.inStock ? `✅ В наличии (${product.stock_quantity || 0} шт.)` : '❌ Нет в наличии'}
        </div>
        ${colorHtml}
        ${attrsHtml}
        <div class="modal-quantity">
            <span class="qty-label">Количество</span>
            <button class="modal-qty-btn" onclick="changeModalQuantity(-1)">−</button>
            <span class="modal-qty-value" id="modal-qty-value">1</span>
            <button class="modal-qty-btn" onclick="changeModalQuantity(1)">+</button>
        </div>
        <button class="modal-add-btn" onclick="addToCartFromModal(${product.id})" ${!product.inStock ? 'disabled' : ''}>
            🛒 В корзину · ${product.discount_price || product.price} BYN
        </button>
        <div style="text-align:center;font-size:12px;color:#71717a;margin-top:8px;">
            Оплата наличными или картой · быстрое оформление
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function selectColor(colorId) {
    selectedColorId = colorId;
}

function changeModalQuantity(delta) {
    const newQty = modalQuantity + delta;
    if (newQty < 1) return;
    modalQuantity = newQty;
    document.getElementById('modal-qty-value').textContent = newQty;
}

function addToCartFromModal(productId) {
    // Проверяем цвет для POD
    if (selectedColorId) {
        const color = productColors.find(c => c.id == selectedColorId);
        if (color && color.stock_quantity < modalQuantity) {
            showMessage('⚠️ Лимит', `Доступно только ${color.stock_quantity} шт. этого цвета`);
            return;
        }
    }
    
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
        const newQty = (existing.quantity || 1) + modalQuantity;
        if (newQty > product.stock_quantity) {
            showMessage('⚠️ Лимит', `Доступно только ${product.stock_quantity} шт.`);
            return;
        }
        existing.quantity = newQty;
    } else {
        cart.push({ 
            ...product, 
            quantity: modalQuantity,
            color_id: selectedColorId || null
        });
    }
    
    saveCart();
    updateCartBadge();
    renderCart();
    closeModal('product-modal');
    showMessage('✅ Добавлено!', `${product.emoji || '📦'} ${product.name} в корзину`);
}

// ========================================
// ===== МОДАЛЬНОЕ ОКНО АКЦИИ =====
// ========================================

function showPromotionDetail(promotionId) {
    const promo = promotions.find(p => p.id === promotionId);
    if (!promo) return;
    
    const modal = document.getElementById('promotion-modal');
    const content = document.getElementById('promotion-modal-content');
    
    const buttonHtml = promo.button_url ? 
        `<a href="${promo.button_url}" target="_blank" class="modal-add-btn" style="display:block;text-align:center;text-decoration:none;">${promo.button_text || 'Подробнее'}</a>` :
        '';
    
    content.innerHTML = `
        <div class="modal-close" onclick="closeModal('promotion-modal')">✕</div>
        <span class="modal-emoji">${promo.image_emoji || '🎉'}</span>
        <h2 class="modal-title">${promo.title}</h2>
        <div style="text-align:center;margin-bottom:8px;">
            ${promo.condition_text ? `<span style="display:inline-block;background:rgba(168,85,247,0.15);color:#a855f7;font-size:13px;font-weight:600;padding:4px 14px;border-radius:12px;">${promo.condition_text}</span>` : ''}
        </div>
        <div class="modal-description">${promo.description || promo.short_description || ''}</div>
        ${buttonHtml}
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
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
    renderCart();
    showMessage('✅ Добавлено!', `${product.emoji || '📦'} ${product.name} в корзину`);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartBadge();
    renderCart();
}

function changeQuantity(index, delta) {
    if (index < 0 || index >= cart.length) return;
    const item = cart[index];
    const newQty = (item.quantity || 1) + delta;
    if (newQty < 1) {
        removeFromCart(index);
        return;
    }
    const product = products.find(p => p.id === item.id);
    if (product && newQty > product.stock_quantity) {
        showMessage('⚠️ Лимит', `Доступно только ${product.stock_quantity} шт.`);
        return;
    }
    item.quantity = newQty;
    saveCart();
    updateCartBadge();
    renderCart();
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

function renderCart() {
    const container = document.getElementById('cart-content');
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="cart-empty">
                <span class="empty-emoji">🛒</span>
                <h3>Корзина пуста</h3>
                <p>Добавьте товары из каталога</p>
                <button class="cart-empty-btn" onclick="navigateTo('page-catalog')">В каталог</button>
            </div>
        `;
        return;
    }
    
    let itemsHtml = '';
    let subtotal = 0;
    
    cart.forEach((item, index) => {
        const price = item.discount_price || item.price || 0;
        const qty = item.quantity || 1;
        subtotal += price * qty;
        
        const brand = brands.find(b => b.slug === item.brand_slug);
        const brandName = brand ? brand.name : '';
        
        const color = item.color_id ? productColors.find(c => c.id == item.color_id) : null;
        const colorName = color ? ` (${color.color_name})` : '';
        
        itemsHtml += `
            <div class="cart-item">
                <span class="cart-item-emoji">${item.emoji || '📦'}</span>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}${colorName}</div>
                    <div class="cart-item-brand">${brandName}</div>
                    <div class="cart-item-price">${(price * qty).toFixed(2)} BYN</div>
                </div>
                <div class="cart-item-actions">
                    <button class="cart-qty-btn" onclick="changeQuantity(${index}, -1)">−</button>
                    <span class="cart-qty">${qty}</span>
                    <button class="cart-qty-btn" onclick="changeQuantity(${index}, 1)">+</button>
                    <button class="cart-remove-btn" onclick="removeFromCart(${index})">✕</button>
                </div>
            </div>
        `;
    });
    
    // Доставка
    let deliveryCost = 0;
    const deliveryType = document.getElementById('delivery-type')?.value || 'pickup';
    if (deliveryType === 'delivery') {
        const itemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        deliveryCost = itemCount >= freeDeliveryMinItems ? 0 : deliveryPrice;
    }
    
    // Скидка по промокоду
    let discountAmount = 0;
    if (appliedPromocode) {
        if (appliedPromocode.discount_type === 'percent') {
            discountAmount = subtotal * (appliedPromocode.discount_value / 100);
        } else if (appliedPromocode.discount_type === 'fixed') {
            discountAmount = Math.min(appliedPromocode.discount_value, subtotal);
        }
    }
    
    const total = subtotal - discountAmount + deliveryCost;
    
    container.innerHTML = `
        <div style="margin-bottom:16px;">
            ${itemsHtml}
        </div>
        
        <div class="cart-checkout">
            <div class="checkout-group">
                <label>Способ получения</label>
                <select class="checkout-select" id="delivery-type" onchange="renderCart()">
                    <option value="pickup">🏪 Самовывоз — БЕСПЛАТНО</option>
                    <option value="delivery">🚚 Доставка — ${deliveryPrice} BYN</option>
                </select>
            </div>
            
            <div id="pickup-points-group">
                <div class="checkout-group">
                    <label>📍 Выберите точку самовывоза</label>
                    <select class="checkout-select" id="pickup-point">
                        <option value="">-- Выберите точку --</option>
                        ${pickupPoints.map(p => `
                            <option value="${p.id}">${p.name} — ${p.address}</option>
                        `).join('')}
                    </select>
                </div>
            </div>
            
            <div id="delivery-address-group" style="display:none;">
                <div class="checkout-group">
                    <label>📍 Адрес доставки</label>
                    <input class="checkout-input" id="delivery-address" placeholder="Город, улица, дом, квартира" />
                </div>
            </div>
            
            <div class="checkout-group">
                <label>💬 Комментарий к заказу</label>
                <textarea class="checkout-textarea" id="order-comment" placeholder="Дополнительная информация..."></textarea>
            </div>
            
            <div class="checkout-group">
                <label>🎫 Промокод</label>
                <div class="promocode-row">
                    <input class="checkout-input" id="promocode-input" placeholder="Введите промокод" />
                    <button class="promocode-apply-btn" onclick="applyPromocode()">Применить</button>
                </div>
                <div class="promocode-status" id="promocode-status"></div>
            </div>
            
            <div class="checkout-total">
                <div class="checkout-total-row">
                    <span>Товары</span>
                    <span class="price">${subtotal.toFixed(2)} BYN</span>
                </div>
                ${discountAmount > 0 ? `
                    <div class="checkout-total-row">
                        <span>Скидка</span>
                        <span class="price" style="color:#22c55e;">-${discountAmount.toFixed(2)} BYN</span>
                    </div>
                ` : ''}
                <div class="checkout-total-row">
                    <span>🚚 Доставка</span>
                    <span class="price">${deliveryCost === 0 ? 'Бесплатно' : deliveryCost.toFixed(2) + ' BYN'}</span>
                </div>
                <div class="checkout-total-row total">
                    <span>Итого</span>
                    <span class="price">${total.toFixed(2)} BYN</span>
                </div>
                ${deliveryType === 'delivery' && cart.reduce((sum, i) => sum + (i.quantity || 1), 0) < freeDeliveryMinItems ? 
                    `<div style="font-size:12px;color:#71717a;margin-top:4px;">Бесплатная доставка от ${freeDeliveryMinItems} позиций в заказе · сейчас ${cart.reduce((sum, i) => sum + (i.quantity || 1), 0)}</div>` : 
                    ''}
            </div>
            
            <button class="checkout-btn" onclick="checkout()">Оформить заказ</button>
        </div>
    `;
    
    // Показываем/скрываем поля
    const pickupGroup = document.getElementById('pickup-points-group');
    const addressGroup = document.getElementById('delivery-address-group');
    if (deliveryType === 'delivery') {
        pickupGroup.style.display = 'none';
        addressGroup.style.display = 'block';
    } else {
        pickupGroup.style.display = 'block';
        addressGroup.style.display = 'none';
    }
}

// ========================================
// ===== ПРОМОКОДЫ =====
// ========================================

async function applyPromocode() {
    const input = document.getElementById('promocode-input');
    const status = document.getElementById('promocode-status');
    if (!input || !status) return;
    
    const code = input.value.trim().toUpperCase();
    if (!code) {
        status.textContent = '⚠️ Введите промокод';
        status.className = 'promocode-status error';
        return;
    }
    
    try {
        const data = await fetchFromSupabase('promocodes', { code: code });
        const promocode = data[0];
        
        if (!promocode) {
            status.textContent = '❌ Промокод не найден';
            status.className = 'promocode-status error';
            return;
        }
        
        if (!promocode.is_active) {
            status.textContent = '❌ Промокод неактивен';
            status.className = 'promocode-status error';
            return;
        }
        
        if (promocode.valid_until && new Date(promocode.valid_until) < new Date()) {
            status.textContent = '❌ Срок действия истёк';
            status.className = 'promocode-status error';
            return;
        }
        
        if (promocode.max_uses && promocode.used_count >= promocode.max_uses) {
            status.textContent = '❌ Лимит использований исчерпан';
            status.className = 'promocode-status error';
            return;
        }
        
        const subtotal = cart.reduce((sum, item) => sum + (item.discount_price || item.price || 0) * (item.quantity || 1), 0);
        if (promocode.min_order_amount && subtotal < promocode.min_order_amount) {
            status.textContent = `❌ Минимальная сумма заказа: ${promocode.min_order_amount} BYN`;
            status.className = 'promocode-status error';
            return;
        }
        
        appliedPromocode = promocode;
        status.textContent = `✅ Промокод применён! Скидка ${promocode.discount_value}%`;
        status.className = 'promocode-status success';
        input.disabled = true;
        document.querySelector('.promocode-apply-btn').disabled = true;
        renderCart();
        
    } catch (error) {
        console.error('❌ Ошибка применения промокода:', error);
        status.textContent = '❌ Ошибка проверки промокода';
        status.className = 'promocode-status error';
    }
}

// ========================================
// ===== ОФОРМЛЕНИЕ ЗАКАЗА =====
// ========================================

async function checkout() {
    if (cart.length === 0) {
        showMessage('❌ Корзина пуста', 'Добавьте товары в корзину');
        return;
    }
    
    const deliveryType = document.getElementById('delivery-type')?.value || 'pickup';
    const pickupPointId = document.getElementById('pickup-point')?.value || '';
    const address = document.getElementById('delivery-address')?.value?.trim() || '';
    const comment = document.getElementById('order-comment')?.value?.trim() || '';
    
    if (deliveryType === 'pickup' && !pickupPointId) {
        showMessage('⚠️ Выберите точку', 'Пожалуйста, выберите точку самовывоза');
        return;
    }
    
    if (deliveryType === 'delivery' && !address) {
        showMessage('⚠️ Введите адрес', 'Пожалуйста, укажите адрес доставки');
        return;
    }
    
    let subtotal = cart.reduce((sum, item) => sum + (item.discount_price || item.price || 0) * (item.quantity || 1), 0);
    let deliveryCost = 0;
    if (deliveryType === 'delivery') {
        const itemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        deliveryCost = itemCount >= freeDeliveryMinItems ? 0 : deliveryPrice;
    }
    
    let discountAmount = 0;
    if (appliedPromocode) {
        if (appliedPromocode.discount_type === 'percent') {
            discountAmount = subtotal * (appliedPromocode.discount_value / 100);
        } else if (appliedPromocode.discount_type === 'fixed') {
            discountAmount = Math.min(appliedPromocode.discount_value, subtotal);
        }
    }
    
    const total = subtotal - discountAmount + deliveryCost;
    
    const pickupPoint = pickupPoints.find(p => p.id == pickupPointId);
    
    const orderData = {
        user_id: currentUser?.id || 0,
        username: currentUser?.username || currentUser?.first_name || 'Гость',
        first_name: currentUser?.first_name || '',
        last_name: currentUser?.last_name || '',
        phone: '',
        subtotal: subtotal,
        discount_amount: discountAmount,
        delivery_price: deliveryCost,
        total: total,
        currency: 'BYN',
        delivery_type: deliveryType,
        pickup_point_id: pickupPointId || null,
        pickup_point_name: pickupPoint?.name || '',
        delivery_address: deliveryType === 'delivery' ? address : null,
        delivery_comment: comment || null,
        comment: comment || null,
        promocode_id: appliedPromocode?.id || null,
        promocode_code: appliedPromocode?.code || null,
        items_json: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.discount_price || item.price || 0,
            quantity: item.quantity || 1,
            emoji: item.emoji || '📦',
            color_id: item.color_id || null
        }))
    };
    
    try {
        showMessage('⏳ Оформление', 'Пожалуйста, подождите...');
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.error('❌ Ошибка сохранения заказа:', error);
            showMessage('❌ Ошибка', 'Не удалось оформить заказ. Попробуйте еще раз.');
            return;
        }
        
        const result = await response.json();
        const orderId = result[0]?.id || 'новый';
        
        // Обновляем остатки
        for (const item of cart) {
            const product = products.find(p => p.id === item.id);
            if (product) {
                const newStock = Math.max(0, (product.stock_quantity || 0) - (item.quantity || 1));
                await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${item.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        stock_quantity: newStock,
                        in_stock: newStock > 0,
                        sold_count: (product.sold_count || 0) + (item.quantity || 1)
                    })
                });
            }
        }
        
        // Обновляем промокод
        if (appliedPromocode) {
            await fetch(`${SUPABASE_URL}/rest/v1/promocodes?id=eq.${appliedPromocode.id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    used_count: (appliedPromocode.used_count || 0) + 1
                })
            });
        }
        
        // Отправляем уведомление в бот
        try {
            const botMessage = {
                action: 'order',
                items: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.discount_price || item.price || 0,
                    quantity: item.quantity || 1,
                    emoji: item.emoji || '📦'
                })),
                total: total,
                subtotal: subtotal,
                discount: discountAmount,
                delivery_cost: deliveryCost,
                currency: 'BYN',
                username: currentUser?.username || currentUser?.first_name || 'Гость',
                user_id: currentUser?.id || null,
                delivery_type: deliveryType,
                delivery_address: deliveryType === 'delivery' ? address : null,
                pickup_point_name: pickupPoint?.name || '',
                comment: comment,
                promocode: appliedPromocode?.code || null
            };
            tg.sendData(JSON.stringify(botMessage));
        } catch (botError) {
            console.warn('⚠️ Ошибка отправки уведомления в бот:', botError);
        }
        
        // Показываем успешное окно
        showOrderSuccess(orderId, total, deliveryType);
        
        // Очищаем корзину
        cart = [];
        appliedPromocode = null;
        saveCart();
        updateCartBadge();
        renderCart();
        
        // Обновляем товары
        await loadProducts();
        renderDiscounts();
        renderPopular();
        
    } catch (error) {
        console.error('❌ Ошибка оформления заказа:', error);
        showMessage('❌ Ошибка', 'Не удалось оформить заказ. Попробуйте еще раз.');
    }
}

function showOrderSuccess(orderId, total, deliveryType) {
    const modal = document.getElementById('order-success-modal');
    const content = document.getElementById('order-success-content');
    
    const paymentMethod = deliveryType === 'pickup' ? 'Наличные' : 'Карта при получении';
    
    content.innerHTML = `
        <div class="modal-close" onclick="closeModal('order-success-modal')">✕</div>
        <span class="modal-emoji" style="font-size:64px;">🎉</span>
        <h2 class="modal-title">Готово!</h2>
        <div style="text-align:center;color:#a1a1aa;margin:8px 0 16px;">
            Заказ #${orderId} на ${total.toFixed(2)} BYN.<br />
            Оплата: 💵 ${paymentMethod}
        </div>
        <div style="text-align:center;color:#ffffff;font-size:15px;font-weight:500;margin-bottom:16px;">
            Заказ принят. Менеджер напишет вам в Telegram.
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="modal-add-btn" onclick="closeModal('order-success-modal'); openManagerChat();" style="flex:1;">
                📩 Написать менеджеру
            </button>
            <button class="modal-add-btn" onclick="closeModal('order-success-modal'); navigateTo('page-orders');" style="flex:1;background:rgba(255,255,255,0.08);">
                📦 Мои заказы
            </button>
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// ========================================
// ===== МОИ ЗАКАЗЫ =====
// ========================================

async function renderOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;
    
    if (!currentUser) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-emoji">🔒</span>
                <h3>Войдите в Telegram</h3>
                <p>Чтобы увидеть свои заказы</p>
            </div>
        `;
        return;
    }
    
    await loadOrders();
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-emoji">📦</span>
                <h3>У вас пока нет заказов</h3>
                <p>Перейдите в каталог и сделайте первый заказ!</p>
                <button class="cart-empty-btn" onclick="navigateTo('page-catalog')">В каталог</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = orders.map(order => {
        const statusMap = {
            'pending': '🔄 В обработке',
            'confirmed': '✅ Подтвержден',
            'shipped': '📦 Отправлен',
            'completed': '✅ Выполнен',
            'cancelled': '❌ Отменен'
        };
        const statusClass = order.status || 'pending';
        const itemsList = order.items_json ? order.items_json.map(item => 
            `${item.emoji || '📦'} ${item.name} × ${item.quantity || 1}`
        ).join('<br />') : '';
        
        const deliveryText = order.delivery_type === 'pickup' ? 
            `🏪 Самовывоз: ${order.pickup_point_name || 'Точка не указана'}` : 
            `🚚 Доставка: ${order.delivery_address || 'Адрес не указан'}`;
        
        const canCancel = order.status === 'pending';
        
        return `
            <div class="order-card">
                <div class="order-card-header">
                    <span class="order-id">#${order.id} · ${new Date(order.created_at).toLocaleDateString()}, ${new Date(order.created_at).toLocaleTimeString()}</span>
                    <span class="order-status ${statusClass}">${statusMap[order.status] || order.status}</span>
                </div>
                <div class="order-card-details">
                    <div><span class="highlight">${order.total || 0} BYN</span></div>
                    <div>${deliveryText}</div>
                    <div>Оплата: 💵 Наличные</div>
                    ${itemsList ? `<div style="margin-top:4px;">${itemsList}</div>` : ''}
                    ${order.comment ? `<div style="margin-top:4px;color:#71717a;">💬 ${order.comment}</div>` : ''}
                </div>
                <div class="order-card-actions">
                    <button class="order-btn contact" onclick="openManagerChat()">Написать менеджеру</button>
                    ${canCancel ? `<button class="order-btn cancel" onclick="cancelOrder(${order.id})">❌ Отменить заказ</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function cancelOrder(orderId) {
    if (!confirm('Отменить заказ #' + orderId + '?')) return;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'cancelled' })
        });
        
        if (response.ok) {
            showMessage('✅ Отменено', 'Заказ #' + orderId + ' отменен');
            await renderOrders();
        }
    } catch (error) {
        console.error('❌ Ошибка отмены заказа:', error);
        showMessage('❌ Ошибка', 'Не удалось отменить заказ');
    }
}

// ========================================
// ===== АКЦИИ =====
// ========================================

function renderPrizes() {
    const container = document.getElementById('prizes-list');
    if (!container) return;
    
    if (promotions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-emoji">🎁</span>
                <h3>Акций пока нет</h3>
                <p>Следите за обновлениями!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = promotions.map(p => `
        <div class="promotion-card" style="min-width:unset;max-width:unset;margin-bottom:12px;cursor:pointer;" onclick="showPromotionDetail(${p.id})">
            <span class="promo-emoji">${p.image_emoji || '🎉'}</span>
            <h4>${p.title}</h4>
            <p>${p.short_description || p.description || ''}</p>
            ${p.condition_text ? `<span class="promo-tag">${p.condition_text}</span>` : ''}
        </div>
    `).join('');
}

// ========================================
// ===== АДМИН-ПАНЕЛЬ =====
// ========================================

function renderAdminMenu() {
    const container = document.getElementById('admin-menu');
    if (!container) return;
    
    const menuItems = [
        { icon: '📊', label: 'Статистика', page: 'page-admin-stats' },
        { icon: '📦', label: 'Заказы', page: 'page-admin-orders' },
        { icon: '🛍️', label: 'Товары', page: 'page-admin-products' },
        { icon: '📂', label: 'Категории', page: 'page-admin-categories' },
        { icon: '🏷️', label: 'Бренды', page: 'page-admin-brands' },
        { icon: '📦', label: 'Модели', page: 'page-admin-models' },
        { icon: '🏷️', label: 'Атрибуты', page: 'page-admin-attributes' },
        { icon: '🎉', label: 'Акции', page: 'page-admin-promotions' },
        { icon: '🎫', label: 'Промокоды', page: 'page-admin-promocodes' },
        { icon: '📍', label: 'Точки вывоза', page: 'page-admin-pickup' },
        { icon: '👥', label: 'Модераторы', page: 'page-admin-moderators' },
        { icon: '📥', label: 'Импорт', page: 'page-admin-import' }
    ];
    
    container.innerHTML = menuItems.map(item => `
        <button class="admin-menu-btn" onclick="navigateTo('${item.page}')">
            <span class="admin-icon">${item.icon}</span>
            <span class="admin-label">${item.label}</span>
        </button>
    `).join('');
}

// ===== АДМИН: СТАТИСТИКА =====

async function renderAdminStats() {
    const container = document.getElementById('admin-stats-content');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Загрузка статистики...</div>';
    
    try {
        const ordersData = await fetchFromSupabase('orders', { status: 'completed' });
        const allOrders = await fetchFromSupabase('orders');
        const pendingOrders = allOrders.filter(o => o.status === 'pending');
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        let stats = {
            today: 0,
            week: 0,
            month: 0,
            total: 0,
            ordersToday: 0,
            ordersPending: pendingOrders.length,
            deliveryOrders: 0,
            pickupOrders: 0,
            deliveryRevenue: 0,
            totalOrders: allOrders.length
        };
        
        const categorySales = {};
        categories.forEach(c => { categorySales[c.slug] = { name: c.name, revenue: 0, orders: 0 }; });
        
        const productSales = {};
        
        ordersData.forEach(order => {
            const orderDate = new Date(order.created_at);
            const amount = Number(order.total) || 0;
            const deliveryPrice = Number(order.delivery_price) || 0;
            
            stats.total += amount;
            
            if (orderDate >= today) {
                stats.today += amount;
                stats.ordersToday++;
            }
            if (orderDate >= weekAgo) stats.week += amount;
            if (orderDate >= monthAgo) stats.month += amount;
            
            if (order.delivery_type === 'delivery') {
                stats.deliveryOrders++;
                stats.deliveryRevenue += deliveryPrice;
            } else if (order.delivery_type === 'pickup') {
                stats.pickupOrders++;
            }
            
            if (order.items_json) {
                order.items_json.forEach(item => {
                    const product = products.find(p => p.id === item.id);
                    if (product && product.category_slug && categorySales[product.category_slug]) {
                        categorySales[product.category_slug].revenue += (item.price || 0) * (item.quantity || 1);
                        categorySales[product.category_slug].orders++;
                    }
                    if (product) {
                        const key = product.id;
                        if (!productSales[key]) {
                            productSales[key] = {
                                name: product.name,
                                emoji: product.emoji || '📦',
                                quantity: 0,
                                revenue: 0
                            };
                        }
                        productSales[key].quantity += (item.quantity || 1);
                        productSales[key].revenue += (item.price || 0) * (item.quantity || 1);
                    }
                });
            }
        });
        
        const topProducts = Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
        
        let html = `
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-icon">💰</span>
                    <div class="stat-value">${stats.today.toFixed(2)} BYN</div>
                    <div class="stat-label">Сегодня</div>
                </div>
                <div class="stat-card">
                    <span class="stat-icon">📈</span>
                    <div class="stat-value">${stats.week.toFixed(2)} BYN</div>
                    <div class="stat-label">За неделю</div>
                </div>
                <div class="stat-card">
                    <span class="stat-icon">📊</span>
                    <div class="stat-value">${stats.month.toFixed(2)} BYN</div>
                    <div class="stat-label">За месяц</div>
                </div>
                <div class="stat-card">
                    <span class="stat-icon">🏆</span>
                    <div class="stat-value">${stats.total.toFixed(2)} BYN</div>
                    <div class="stat-label">Всего продаж</div>
                </div>
                <div class="stat-card">
                    <span class="stat-icon">📦</span>
                    <div class="stat-value">${stats.ordersToday}</div>
                    <div class="stat-label">Заказов сегодня</div>
                </div>
                <div class="stat-card">
                    <span class="stat-icon">🔄</span>
                    <div class="stat-value">${stats.ordersPending}</div>
                    <div class="stat-label">В обработке</div>
                </div>
                <div class="stat-card">
                    <span class="stat-icon">🚚</span>
                    <div class="stat-value">${stats.deliveryOrders}</div>
                    <div class="stat-label">Доставок</div>
                </div>
                <div class="stat-card">
                    <span class="stat-icon">🏪</span>
                    <div class="stat-value">${stats.pickupOrders}</div>
                    <div class="stat-label">Самовывозов</div>
                </div>
                <div class="stat-card">
                    <span class="stat-icon">💰</span>
                    <div class="stat-value">${stats.deliveryRevenue.toFixed(2)} BYN</div>
                    <div class="stat-label">Доход от доставки</div>
                </div>
                <div class="stat-card">
                    <span class="stat-icon">📋</span>
                    <div class="stat-value">${stats.totalOrders}</div>
                    <div class="stat-label">Всего заказов</div>
                </div>
            </div>
        `;
        
        // Продажи по категориям
        html += `<div style="margin-top:16px;"><h3 style="color:#ffffff;margin-bottom:8px;">Продажи по категориям</h3>`;
        categories.forEach(c => {
            const data = categorySales[c.slug] || { revenue: 0, orders: 0 };
            html += `
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                    <span style="color:#a1a1aa;">${c.icon || '📂'} ${c.name}</span>
                    <span style="color:#ffffff;">${data.revenue.toFixed(2)} BYN (${data.orders} заказов)</span>
                </div>
            `;
        });
        html += `</div>`;
        
        // Топ товаров
        html += `<div style="margin-top:16px;"><h3 style="color:#ffffff;margin-bottom:8px;">Топ товаров</h3>`;
        if (topProducts.length === 0) {
            html += `<div style="color:#71717a;">Нет данных о продажах</div>`;
        } else {
            topProducts.forEach((p, i) => {
                html += `
                    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                        <span style="color:#a1a1aa;">#${i+1} ${p.emoji} ${p.name}</span>
                        <span style="color:#ffffff;">${p.quantity} шт. · ${p.revenue.toFixed(2)} BYN</span>
                    </div>
                `;
            });
        }
        html += `</div>`;
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки статистики:', error);
        container.innerHTML = '<div class="empty-state"><span class="empty-emoji">⚠️</span><h3>Ошибка загрузки</h3></div>';
    }
}

// ===== АДМИН: ЗАКАЗЫ =====

async function renderAdminOrders() {
    const container = document.getElementById('admin-orders-content');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Загрузка заказов...</div>';
    
    try {
        const data = await fetchFromSupabase('orders', {}, { by: 'created_at', direction: 'desc' });
        const ordersList = data || [];
        
        if (ordersList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-emoji">📦</span>
                    <h3>Заказов пока нет</h3>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="admin-filters">
                <select id="admin-order-status-filter">
                    <option value="all">Все статусы</option>
                    <option value="pending">В обработке</option>
                    <option value="confirmed">Подтвержден</option>
                    <option value="shipped">Отправлен</option>
                    <option value="completed">Выполнен</option>
                    <option value="cancelled">Отменен</option>
                </select>
                <select id="admin-order-delivery-filter">
                    <option value="all">Все способы</option>
                    <option value="pickup">Самовывоз</option>
                    <option value="delivery">Доставка</option>
                </select>
                <button class="filter-btn" onclick="applyAdminOrderFilters()">Применить</button>
                <button class="filter-btn" onclick="resetAdminOrderFilters()">Сбросить</button>
            </div>
            <button class="admin-add-btn" onclick="exportOrdersCSV()">📥 Экспорт в CSV</button>
        `;
        
        const statusMap = {
            'pending': '🔄 В обработке',
            'confirmed': '✅ Подтвержден',
            'shipped': '📦 Отправлен',
            'completed': '✅ Выполнен',
            'cancelled': '❌ Отменен'
        };
        
        ordersList.forEach(order => {
            const statusClass = order.status || 'pending';
            const itemsList = order.items_json ? order.items_json.map(item => 
                `${item.emoji || '📦'} ${item.name} × ${item.quantity || 1}`
            ).join(', ') : '';
            
            const deliveryText = order.delivery_type === 'pickup' ? 
                `🏪 Самовывоз: ${order.pickup_point_name || 'Точка не указана'}` : 
                `🚚 Доставка: ${order.delivery_address || 'Адрес не указан'}`;
            
            const priceDetails = `💰 ${order.total || 0} BYN` + 
                (order.delivery_price > 0 ? ` (+ доставка ${order.delivery_price} BYN)` : '') +
                (order.discount_amount > 0 ? ` (скидка -${order.discount_amount} BYN)` : '');
            
            let actionButtons = '';
            if (order.status === 'pending') {
                actionButtons = `
                    <button class="admin-btn confirm" onclick="updateOrderStatus(${order.id}, 'confirmed', ${order.user_id})">Подтвердить</button>
                    <button class="admin-btn delete" onclick="updateOrderStatus(${order.id}, 'cancelled', ${order.user_id})">Отклонить</button>
                `;
            } else if (order.status === 'confirmed') {
                actionButtons = `
                    <button class="admin-btn ship" onclick="updateOrderStatus(${order.id}, 'shipped', ${order.user_id})">Отправлен</button>
                    <button class="admin-btn complete" onclick="updateOrderStatus(${order.id}, 'completed', ${order.user_id})">Выполнен</button>
                `;
            } else if (order.status === 'shipped') {
                actionButtons = `
                    <button class="admin-btn complete" onclick="updateOrderStatus(${order.id}, 'completed', ${order.user_id})">Выполнен</button>
                `;
            }
            
            html += `
                <div class="order-card">
                    <div class="order-card-header">
                        <span class="order-id">#${order.id}</span>
                        <span class="order-status ${statusClass}">${statusMap[order.status] || order.status}</span>
                    </div>
                    <div class="order-card-details">
                        <div>👤 ${order.username || 'Гость'} (ID: ${order.user_id || 'N/A'})</div>
                        <div>📱 ${order.phone || 'Не указан'}</div>
                        <div>${priceDetails}</div>
                        <div>${deliveryText}</div>
                        ${itemsList ? `<div>📋 ${itemsList}</div>` : ''}
                        ${order.comment ? `<div>💬 ${order.comment}</div>` : ''}
                        <div>📅 ${new Date(order.created_at).toLocaleString()}</div>
                    </div>
                    <div class="order-card-actions">
                        ${actionButtons}
                        <button class="order-btn contact" onclick="openManagerChat()">Написать</button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки заказов:', error);
        container.innerHTML = '<div class="empty-state"><span class="empty-emoji">⚠️</span><h3>Ошибка загрузки</h3></div>';
    }
}

async function updateOrderStatus(orderId, status, userId) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: status })
        });
        
        if (response.ok) {
            if (userId) {
                const messages = {
                    'confirmed': `✅ Ваш заказ #${orderId} ПОДТВЕРЖДЕН!\n\nСпасибо за заказ! Мы приступили к его обработке.\n\n📩 По вопросам заказа: @${managerUsername}`,
                    'shipped': `📦 Ваш заказ #${orderId} ОТПРАВЛЕН!\n\nСпасибо за покупку! ❤️\n\n📩 По вопросам заказа: @${managerUsername}`,
                    'completed': `✅ Ваш заказ #${orderId} ВЫПОЛНЕН!\n\nБлагодарим за покупку! Ждем вас снова! 🙏\n\n📩 По вопросам заказа: @${managerUsername}`,
                    'cancelled': `❌ Ваш заказ #${orderId} ОТМЕНЕН.\n\nЕсли у вас есть вопросы, напишите менеджеру: @${managerUsername}`
                };
                
                if (messages[status]) {
                    try {
                        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: userId,
                                text: messages[status],
                                parse_mode: 'HTML'
                            })
                        });
                    } catch (e) {
                        console.warn('⚠️ Ошибка отправки уведомления:', e);
                    }
                }
            }
            
            showMessage('✅ Статус обновлён', 'Заказ #' + orderId + ' обновлен');
            renderAdminOrders();
            if (currentPage === 'page-orders') renderOrders();
        }
    } catch (error) {
        console.error('❌ Ошибка обновления статуса:', error);
        showMessage('❌ Ошибка', 'Не удалось обновить статус');
    }
}

function applyAdminOrderFilters() {
    renderAdminOrders();
}

function resetAdminOrderFilters() {
    document.getElementById('admin-order-status-filter').value = 'all';
    document.getElementById('admin-order-delivery-filter').value = 'all';
    renderAdminOrders();
}

function exportOrdersCSV() {
    showMessage('📥 Экспорт', 'Функция экспорта в разработке');
}

// ===== АДМИН: ТОВАРЫ =====

async function renderAdminProducts() {
    const container = document.getElementById('admin-products-content');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Загрузка товаров...</div>';
    
    try {
        const productsList = products;
        
        if (productsList.length === 0) {
            container.innerHTML = `
                <button class="admin-add-btn" onclick="showAddProductForm()">➕ Добавить товар</button>
                <div class="empty-state"><span class="empty-emoji">🛍️</span><h3>Товаров пока нет</h3></div>
            `;
            return;
        }
        
        let html = `
            <button class="admin-add-btn" onclick="showAddProductForm()">➕ Добавить товар</button>
            <div class="admin-filters">
                <select id="admin-product-category-filter">
                    <option value="all">Все категории</option>
                    ${categories.map(c => `<option value="${c.slug}">${c.name}</option>`).join('')}
                </select>
                <select id="admin-product-stock-filter">
                    <option value="all">Все товары</option>
                    <option value="in-stock">В наличии</option>
                    <option value="out-of-stock">Нет в наличии</option>
                </select>
                <button class="filter-btn" onclick="applyAdminProductFilters()">Применить</button>
            </div>
        `;
        
        productsList.forEach(p => {
            const brand = brands.find(b => b.slug === p.brand_slug);
            const category = categories.find(c => c.slug === p.category_slug);
            
            html += `
                <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(255,255,255,0.04);border-radius:12px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.04);">
                    <span style="font-size:28px;">${p.emoji || '📦'}</span>
                    <div style="flex:1;min-width:0;">
                        <div style="color:#ffffff;font-weight:500;">${p.name}</div>
                        <div style="font-size:12px;color:#71717a;">${category?.name || p.category_slug} · ${brand?.name || p.brand_slug || ''}</div>
                        <div style="font-size:13px;color:#a855f7;font-weight:600;">${p.discount_price || p.price} BYN</div>
                        <div style="font-size:12px;color:${p.inStock ? '#22c55e' : '#ef4444'};">${p.inStock ? `✅ В наличии (${p.stock_quantity || 0} шт.)` : '❌ Нет в наличии'}</div>
                    </div>
                    <div style="display:flex;gap:6px;">
                        <button class="admin-btn edit" onclick="showEditProductForm(${p.id})">✏️</button>
                        <button class="admin-btn delete" onclick="deleteProduct(${p.id})">🗑️</button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки товаров:', error);
        container.innerHTML = '<div class="empty-state"><span class="empty-emoji">⚠️</span><h3>Ошибка загрузки</h3></div>';
    }
}

function showAddProductForm() {
    const name = prompt('📝 Название товара:');
    if (!name) return;
    const price = prompt('💰 Цена (BYN):');
    if (!price) return;
    const emoji = prompt('😊 Эмодзи (по умолчанию 📦):', '📦');
    if (emoji === null) return;
    const stock = prompt('📦 Количество на складе (по умолчанию 0):', '0');
    if (stock === null) return;
    
    const categoryOptions = categories.map((c, i) => `${i+1}. ${c.icon || '📂'} ${c.name} (${c.slug})`).join('\n');
    const categoryChoice = prompt(
        `📂 ВЫБЕРИТЕ КАТЕГОРИЮ\n\n${categoryOptions}\n\n💡 Введите номер:`
    );
    if (!categoryChoice) return;
    const categoryIndex = parseInt(categoryChoice) - 1;
    if (isNaN(categoryIndex) || categoryIndex < 0 || categoryIndex >= categories.length) {
        alert('❌ Неверный выбор категории');
        return;
    }
    const categorySlug = categories[categoryIndex].slug;
    
    const brandOptions = brands.filter(b => b.category_slug === categorySlug);
    let brandSlug = null;
    if (brandOptions.length > 0) {
        const brandList = brandOptions.map((b, i) => `${i+1}. ${b.name}`).join('\n');
        const brandChoice = prompt(`🏷️ ВЫБЕРИТЕ БРЕНД\n\n${brandList}\n\n💡 Введите номер (или нажмите Отмена для пропуска):`);
        if (brandChoice) {
            const brandIndex = parseInt(brandChoice) - 1;
            if (!isNaN(brandIndex) && brandIndex >= 0 && brandIndex < brandOptions.length) {
                brandSlug = brandOptions[brandIndex].slug;
            }
        }
    }
    
    const modelOptions = models.filter(m => m.category_slug === categorySlug && (brandSlug ? m.brand_slug === brandSlug : true));
    let modelSlug = null;
    if (modelOptions.length > 0) {
        const modelList = modelOptions.map((m, i) => `${i+1}. ${m.name}`).join('\n');
        const modelChoice = prompt(`📦 ВЫБЕРИТЕ МОДЕЛЬ\n\n${modelList}\n\n💡 Введите номер (или нажмите Отмена для пропуска):`);
        if (modelChoice) {
            const modelIndex = parseInt(modelChoice) - 1;
            if (!isNaN(modelIndex) && modelIndex >= 0 && modelIndex < modelOptions.length) {
                modelSlug = modelOptions[modelIndex].slug;
            }
        }
    }
    
    const isHit = confirm('🔥 Это хит продаж? (OK - да, Отмена - нет)');
    const isNew = confirm('✨ Это новинка? (OK - да, Отмена - нет)');
    const discountPrice = prompt('💰 Цена со скидкой (оставьте пустым если нет):');
    
    const confirmData = `
📋 ПРОВЕРЬТЕ ДАННЫЕ:
━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Название: ${name}
💰 Цена: ${price} BYN
${discountPrice ? `💰 Скидка: ${discountPrice} BYN` : ''}
📂 Категория: ${categories[categoryIndex].name}
${brandSlug ? `🏷️ Бренд: ${brandOptions.find(b => b.slug === brandSlug)?.name || brandSlug}` : ''}
${modelSlug ? `📦 Модель: ${modelOptions.find(m => m.slug === modelSlug)?.name || modelSlug}` : ''}
📦 Остаток: ${stock} шт.
${isHit ? '🔥 Хит' : ''} ${isNew ? '✨ Новинка' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━
Подтвердить добавление?
    `;
    if (!confirm(confirmData)) return;
    
    addProductToDB({
        name,
        price: parseFloat(price) || 0,
        discount_price: discountPrice ? parseFloat(discountPrice) : null,
        emoji: emoji || '📦',
        category_slug: categorySlug,
        brand_slug: brandSlug,
        model_slug: modelSlug,
        stock_quantity: parseInt(stock) || 0,
        in_stock: parseInt(stock) > 0,
        is_hit: isHit,
        is_new: isNew
    });
}

async function addProductToDB(data) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            await loadProducts();
            renderAdminProducts();
            renderDiscounts();
            renderPopular();
            showMessage('✅ Товар добавлен', 'Товар успешно добавлен');
        } else {
            const error = await response.json();
            showMessage('❌ Ошибка', error.message || 'Не удалось добавить товар');
        }
    } catch (error) {
        console.error('❌ Ошибка добавления товара:', error);
        showMessage('❌ Ошибка', 'Ошибка соединения с сервером');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Удалить этот товар?')) return;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (response.ok) {
            await loadProducts();
            renderAdminProducts();
            renderDiscounts();
            renderPopular();
            showMessage('✅ Товар удалён', 'Товар успешно удалён');
        }
    } catch (error) {
        console.error('❌ Ошибка удаления товара:', error);
        showMessage('❌ Ошибка', 'Не удалось удалить товар');
    }
}

// ===== АДМИН: ИМПОРТ =====

async function renderAdminImport() {
    const container = document.getElementById('admin-import-content');
    if (!container) return;
    
    container.innerHTML = `
        <div style="margin-bottom:12px;">
            <p style="color:#a1a1aa;font-size:14px;margin-bottom:8px;">
                Вставьте данные для импорта товаров. Поддерживается формат:
            </p>
            <div style="background:rgba(255,255,255,0.04);padding:12px;border-radius:8px;font-size:12px;color:#71717a;font-family:monospace;margin-bottom:12px;">
                Название | Цена | Категория | Бренд | Модель | Вкус | Крепость | Количество
            </div>
            <textarea id="import-textarea" class="import-textarea" placeholder="Вставьте данные для импорта..." rows="8"></textarea>
            <button class="admin-add-btn" onclick="processImport()" style="margin-top:8px;">📥 Обработать импорт</button>
            <div id="import-status" class="import-status"></div>
            <div id="import-preview" class="import-preview"></div>
        </div>
    `;
}

async function processImport() {
    const textarea = document.getElementById('import-textarea');
    const status = document.getElementById('import-status');
    const preview = document.getElementById('import-preview');
    
    if (!textarea || !status || !preview) return;
    
    const data = textarea.value.trim();
    if (!data) {
        status.textContent = '⚠️ Вставьте данные для импорта';
        status.style.color = '#f59e0b';
        return;
    }
    
    // Парсим строки
    const lines = data.split('\n').filter(line => line.trim());
    const parsed = [];
    let errors = [];
    
    for (const line of lines) {
        // Пробуем разные разделители
        let parts = line.split('|').map(s => s.trim());
        if (parts.length < 2) {
            parts = line.split(';').map(s => s.trim());
        }
        if (parts.length < 2) {
            parts = line.split('\t').map(s => s.trim());
        }
        
        if (parts.length < 2) {
            errors.push(`❌ Не удалось распарсить: ${line}`);
            continue;
        }
        
        const item = {
            name: parts[0] || '',
            price: parseFloat(parts[1]) || 0,
            category: parts[2] || 'liquid',
            brand: parts[3] || '',
            model: parts[4] || '',
            flavor: parts[5] || '',
            strength: parts[6] || '',
            stock: parseInt(parts[7]) || 0,
            emoji: '📦'
        };
        
        // Определяем эмодзи по категории
        const catMap = {
            'liquid': '🧪',
            'pod': '💨',
            'disposable': '⚡',
            'snus': '🫧',
            'accessories': '🔧'
        };
        item.emoji = catMap[item.category] || '📦';
        
        parsed.push(item);
    }
    
    if (parsed.length === 0) {
        status.textContent = '❌ Не найдено товаров для импорта';
        status.style.color = '#ef4444';
        return;
    }
    
    // Показываем предпросмотр
    let previewHtml = `
        <div style="margin-top:12px;">
            <h4 style="color:#ffffff;margin-bottom:8px;">📋 Предпросмотр (${parsed.length} товаров)</h4>
            <div style="max-height:300px;overflow-y:auto;">
    `;
    
    parsed.forEach((item, i) => {
        previewHtml += `
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:13px;color:#a1a1aa;">
                <span>${i+1}. ${item.emoji} ${item.name}</span>
                <span style="color:#a855f7;">${item.price} BYN</span>
                <span style="color:#71717a;">${item.category} · ${item.stock} шт.</span>
            </div>
        `;
    });
    
    previewHtml += `
            </div>
            <div style="display:flex;gap:10px;margin-top:12px;">
                <button class="admin-btn confirm" onclick="confirmImport(${JSON.stringify(parsed).replace(/"/g, '&quot;')})">✅ Подтвердить импорт</button>
                <button class="admin-btn delete" onclick="cancelImport()">❌ Отменить</button>
            </div>
        </div>
    `;
    
    preview.innerHTML = previewHtml;
    status.textContent = `✅ Найдено ${parsed.length} товаров. Проверьте данные и подтвердите импорт.`;
    status.style.color = '#22c55e';
}

async function confirmImport(items) {
    const status = document.getElementById('import-status');
    const preview = document.getElementById('import-preview');
    
    let success = 0;
    let errors = [];
    
    for (const item of items) {
        try {
            // Находим или создаём категорию
            let category = categories.find(c => c.slug === item.category);
            if (!category) {
                // Создаём категорию
                const catData = {
                    slug: item.category,
                    name: item.category.charAt(0).toUpperCase() + item.category.slice(1),
                    icon: '📂',
                    is_active: true
                };
                const catResp = await fetch(`${SUPABASE_URL}/rest/v1/categories`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(catData)
                });
                if (catResp.ok) {
                    const catResult = await catResp.json();
                    category = catResult[0];
                    categories.push(category);
                }
            }
            
            // Находим или создаём бренд
            let brand = null;
            if (item.brand) {
                brand = brands.find(b => b.slug === item.brand.toLowerCase().replace(/\s+/g, '-'));
                if (!brand && category) {
                    const brandData = {
                        slug: item.brand.toLowerCase().replace(/\s+/g, '-'),
                        name: item.brand,
                        category_slug: category.slug,
                        is_active: true
                    };
                    const brandResp = await fetch(`${SUPABASE_URL}/rest/v1/brands`, {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${SUPABASE_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(brandData)
                    });
                    if (brandResp.ok) {
                        const brandResult = await brandResp.json();
                        brand = brandResult[0];
                        brands.push(brand);
                    }
                }
            }
            
            // Создаём товар
            const productData = {
                name: item.name,
                price: item.price,
                emoji: item.emoji || '📦',
                category_slug: category?.slug || 'liquid',
                brand_slug: brand?.slug || null,
                stock_quantity: item.stock || 0,
                in_stock: (item.stock || 0) > 0,
                description: `Вкус: ${item.flavor || 'Не указан'}, Крепость: ${item.strength || 'Не указана'}`
            };
            
            const productResp = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });
            
            if (productResp.ok) {
                success++;
            } else {
                errors.push(`❌ Ошибка импорта: ${item.name}`);
            }
        } catch (error) {
            errors.push(`❌ Ошибка импорта: ${item.name} - ${error.message}`);
        }
    }
    
    // Обновляем данные
    await loadAllData();
    renderAdminProducts();
    renderDiscounts();
    renderPopular();
    
    if (errors.length === 0) {
        status.textContent = `✅ Импорт завершён! Добавлено ${success} товаров.`;
        status.style.color = '#22c55e';
    } else {
        status.textContent = `⚠️ Импорт завершён с ошибками: ${errors.join(', ')}`;
        status.style.color = '#f59e0b';
    }
    preview.innerHTML = '';
}

function cancelImport() {
    document.getElementById('import-preview').innerHTML = '';
    document.getElementById('import-status').textContent = '❌ Импорт отменён';
    document.getElementById('import-status').style.color = '#ef4444';
}

// ========================================
// ===== НАВИГАЦИЯ =====
// ========================================

function navigateTo(pageId) {
    console.log('🔄 Переход на:', pageId);
    
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
    });
    
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add('active');
        target.style.display = 'block';
    }
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageId);
    });
    
    currentPage = pageId;
    
    // Загружаем данные для страницы
    switch(pageId) {
        case 'page-cart':
            renderCart();
            break;
        case 'page-orders':
            renderOrders();
            break;
        case 'page-prizes':
            renderPrizes();
            break;
        case 'page-admin':
            renderAdminMenu();
            break;
        case 'page-admin-stats':
            renderAdminStats();
            break;
        case 'page-admin-orders':
            renderAdminOrders();
            break;
        case 'page-admin-products':
            renderAdminProducts();
            break;
        case 'page-admin-categories':
            renderAdminCategories();
            break;
        case 'page-admin-brands':
            renderAdminBrands();
            break;
        case 'page-admin-models':
            renderAdminModels();
            break;
        case 'page-admin-attributes':
            renderAdminAttributes();
            break;
        case 'page-admin-promotions':
            renderAdminPromotions();
            break;
        case 'page-admin-promocodes':
            renderAdminPromocodes();
            break;
        case 'page-admin-pickup':
            renderAdminPickup();
            break;
        case 'page-admin-moderators':
            renderAdminModerators();
            break;
        case 'page-admin-import':
            renderAdminImport();
            break;
    }
}

function openManagerChat() {
    window.open(`https://t.me/${managerUsername}`, '_blank');
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
        
        // Проверяем хардкод админов
        if (HARDCODED_ADMINS.includes(user.id)) {
            console.log('👑 Хардкод админ найден:', user.id);
            return true;
        }
        
        // Проверяем в БД
        const data = await fetchFromSupabase('admins', { user_id: user.id, is_active: true });
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
    
    await loadAllData();
    updateWelcomeCard();
    
    renderPromotions();
    renderCategories();
    renderDiscounts();
    renderPopular();
    
    renderCategoryFilters();
    renderSubFilters();
    renderCatalog();
    
    isAdmin = await checkAdmin();
    if (isAdmin) {
        document.getElementById('nav-admin').style.display = 'flex';
        console.log('👑 Админ-режим активирован');
    }
    
    setupSearch();
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            if (page) navigateTo(page);
        });
    });
    
    document.querySelectorAll('.modal-overlay').forEach(el => {
        el.addEventListener('click', () => {
            const modal = el.closest('.modal');
            if (modal) modal.style.display = 'none';
            document.body.style.overflow = '';
        });
    });
    
    console.log('✅ Инициализация завершена');
});