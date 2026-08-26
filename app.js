// ===== ТОКЕН БОТА (для отправки сообщений) =====
const TOKEN = '8870349321:AAEXFersNinRpHnPETbR_vGFn_TnGWOCums';

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// ===== ЗАГЛУШКА ДЛЯ ПОКАЗА В БРАУЗЕРЕ =====
function showMessage(title, message) {
    console.log(`📢 ${title}: ${message}`);
    try {
        if (window.Telegram.WebApp.platform === 'unknown' || window.Telegram.WebApp.version === '6.0') {
            alert(`${title}\n\n${message}`);
        } else {
            tg.showPopup({
                title: title,
                message: message,
                buttons: [{ type: 'ok' }]
            });
        }
    } catch (e) {
        alert(`${title}\n\n${message}`);
    }
}

// ===== ДИАГНОСТИКА =====
console.log('🔍 ДИАГНОСТИКА:');
console.log('📱 initData:', window.Telegram.WebApp.initData || 'empty');
console.log('👤 initDataUnsafe:', window.Telegram.WebApp.initDataUnsafe || 'empty');
console.log('📱 platform:', window.Telegram.WebApp.platform || 'unknown');
console.log('📱 version:', window.Telegram.WebApp.version || 'unknown');

// ===== ПОДКЛЮЧЕНИЕ К SUPABASE =====
const SUPABASE_URL = 'https://prtwcgqidlivkaanbowl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XxBLBacZddir7xEUUYsjdA_RdH1NnZz';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydHdjZ3FpZGxpdmthYW5ib3dsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc3MzcwNiwiZXhwIjoyMTAyMzQ5NzA2fQ.dvZAnH78ThbtWUTcn9mwveBXhV4RtyefUeFit4mHEUI';
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE;

// ===== ФИКСИРОВАННЫЕ КАТЕГОРИИ (С ДОБАВЛЕНИЕМ "ВСЕ") =====
const FIXED_CATEGORIES = [
    { slug: 'all', name: 'Все', icon: '📋' },
    { slug: 'pod', name: 'Pod-системы', icon: '💨' },
    { slug: 'liquid', name: 'Жижи', icon: '🧪' },
    { slug: 'accessories', name: 'Комплектующие', icon: '🔧' },
    { slug: 'disposable', name: 'Одноразовые', icon: '⚡' },
    { slug: 'snus', name: 'Снюс', icon: '🫧' }
];

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let products = [];
let cart = [];
let currentPage = 'page-home';
let isAdmin = false;
let mainCategories = [];
let brands = [];
let productModels = [];
let productAttributes = [];
let promotions = [];
let pickupPoints = [];
let prizes = [];
let promocodes = [];
let settings = {};
let currentCategorySlug = 'all';
let currentSort = 'default';
let adminFilterCategory = 'all';
let adminFilterStock = 'all';
let selectedAttributes = {};
let searchQuery = '';
let ordersFilter = { status: 'all', dateFrom: '', dateTo: '', deliveryType: 'all' };
let notificationSound = null;
let lastOrderCheck = 0;
let appliedPromocode = null;
let deliveryPrice = 5;
let deliveryEnabled = true;

// ===== ПАГИНАЦИЯ =====
const ITEMS_PER_PAGE = 10;
let catalogCurrentPage = 1;
let totalFilteredItems = [];
let isLoading = false;

// ===== РЕЖИМ РАЗРАБОТКИ =====
const isDevelopment = !window.Telegram.WebApp.initDataUnsafe?.user;

if (isDevelopment) {
    console.log('⚠️ Режим разработки: показываем админку для тестирования');
}

// ===== ПРОВЕРКА АДМИНА =====
async function checkAdmin() {
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            console.log('⚠️ Режим разработки: пользователь не найден');
            return true;
        }

        console.log(`🔍 Проверка админа для ID: ${user.id}`);

        const response = await fetch(`${SUPABASE_URL}/rest/v1/admins?select=*&id=eq.${user.id}`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            console.error(`❌ Ошибка сервера: ${response.status}`);
            return false;
        }

        const data = await response.json();
        console.log('📊 Ответ от Supabase:', data);
        
        return data && data.length > 0;
    } catch (error) {
        console.error('❌ Ошибка проверки админа:', error);
        return false;
    }
}

// ==========================================
// ===== ЗАГРУЗКА НАСТРОЕК =====
// ==========================================
async function loadSettings() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!response.ok) throw new Error('Не удалось загрузить настройки');
        const data = await response.json();
        data.forEach(setting => {
            settings[setting.key] = setting.value;
        });
        
        deliveryEnabled = settings.delivery_enabled === 'true';
        deliveryPrice = parseFloat(settings.delivery_price) || 5;
        
        console.log('✅ Загружены настройки:', settings);
        return settings;
    } catch (error) {
        console.error('❌ Ошибка загрузки настроек:', error);
        settings = {};
        return {};
    }
}

// ==========================================
// ===== ЗАГРУЗКА ДАННЫХ =====
// ==========================================

async function loadMainCategories() {
    mainCategories = FIXED_CATEGORIES;
    return mainCategories;
}

async function loadBrands() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/brands?select=*&order=sort_order.asc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Не удалось загрузить бренды');
        const data = await response.json();
        brands = data || [];
        console.log('✅ Загружено брендов:', brands.length);
        return brands;
    } catch (error) {
        console.error('❌ Ошибка загрузки брендов:', error);
        brands = [];
        return [];
    }
}

async function loadProductModels() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/product_models?select=*&order=sort_order.asc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Не удалось загрузить модели');
        const data = await response.json();
        productModels = data || [];
        console.log('✅ Загружено моделей:', productModels.length);
        return productModels;
    } catch (error) {
        console.error('❌ Ошибка загрузки моделей:', error);
        productModels = [];
        return [];
    }
}

async function loadProductAttributes() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/product_attributes?select=*&order=sort_order.asc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Не удалось загрузить атрибуты');
        const data = await response.json();
        productAttributes = data || [];
        console.log('✅ Загружено атрибутов:', productAttributes.length);
        return productAttributes;
    } catch (error) {
        console.error('❌ Ошибка загрузки атрибутов:', error);
        productAttributes = [];
        return [];
    }
}

async function loadProductsFromSupabase() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📦 Загружено товаров:', data ? data.length : 0);
        
        products = (data || []).map(p => ({
            id: p.id,
            name: p.name || 'Без названия',
            price: p.price || 0,
            emoji: p.emoji || '📦',
            mainCategorySlug: p.main_category_slug,
            brandSlug: p.brand_slug,
            modelSlug: p.product_model_slug,
            inStock: p.in_stock !== false && (p.stock_quantity === undefined || p.stock_quantity > 0),
            stockQuantity: p.stock_quantity || 0,
            soldCount: p.sold_count || 0,
            isHit: p.is_hit || false,
            isNew: p.is_new || false,
            discountPrice: p.discount_price || null
        }));
        
        renderHits();
        renderNewItems();
        renderCategoryTabs();
        renderCatalog();
        
        return products;
    } catch (error) {
        console.error('❌ Ошибка загрузки товаров:', error);
        products = [];
        return [];
    }
}

async function loadPromotionsFromSupabase() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/promotions?select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Не удалось загрузить акции');
        const data = await response.json();
        promotions = data || [];
        console.log('✅ Загружено акций:', promotions.length);
        renderPromotions();
        return promotions;
    } catch (error) {
        console.error('❌ Ошибка загрузки акций:', error);
        promotions = [];
        return [];
    }
}

// ===== ЗАГРУЗКА ПРИЗОВ =====
async function loadPrizes() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/prizes?select=*&order=sort_order.asc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!response.ok) throw new Error('Не удалось загрузить призы');
        const data = await response.json();
        prizes = (data || []).filter(p => p.active !== false);
        console.log('✅ Загружено призов:', prizes.length);
        renderPrizes();
        return prizes;
    } catch (error) {
        console.error('❌ Ошибка загрузки призов:', error);
        prizes = [];
        return [];
    }
}

// ===== ЗАГРУЗКА ПРОМОКОДОВ =====
async function loadPromocodes() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/promocodes?select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!response.ok) throw new Error('Не удалось загрузить промокоды');
        const data = await response.json();
        promocodes = data || [];
        console.log('✅ Загружено промокодов:', promocodes.length);
        return promocodes;
    } catch (error) {
        console.error('❌ Ошибка загрузки промокодов:', error);
        promocodes = [];
        return [];
    }
}

// ===== ЗАГРУЗКА ТОЧЕК САМОВЫВОЗА =====
async function loadPickupPoints() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/pickup_points?select=*&order=sort_order.asc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Не удалось загрузить точки самовывоза');
        const data = await response.json();
        pickupPoints = (data || []).filter(p => p.is_active !== false);
        console.log('✅ Загружено точек самовывоза:', pickupPoints.length);
        return pickupPoints;
    } catch (error) {
        console.error('❌ Ошибка загрузки точек самовывоза:', error);
        pickupPoints = [];
        return pickupPoints;
    }
}

// ==========================================
// ===== ОТОБРАЖЕНИЕ =====
// ==========================================

function renderPromotions() {
    const container = document.getElementById('promotions-container');
    if (!container) {
        console.warn('⚠️ Контейнер promotions-container не найден');
        return;
    }
    
    if (!promotions || promotions.length === 0) {
        container.innerHTML = '<div class="empty-message">Нет активных акций</div>';
        return;
    }
    
    container.innerHTML = promotions.map(p => `
        <div class="promotion-card">
            <span class="promotion-emoji">${p.image_emoji || '🎉'}</span>
            <div class="promotion-info">
                <strong>${p.title || 'Акция'}</strong>
                <p>${p.description || ''}</p>
            </div>
        </div>
    `).join('');
}

// ===== ОТОБРАЖЕНИЕ ПРИЗОВ =====
function renderPrizes() {
    const container = document.getElementById('prizes-list');
    if (!container) return;
    
    if (!prizes || prizes.length === 0) {
        container.innerHTML = '<div class="empty-message">🎁 Скоро появятся новые призы!</div>';
        return;
    }
    
    container.innerHTML = prizes.map(p => `
        <div class="prize-card">
            <span>${p.emoji || '🎁'}</span>
            <div>
                <h4>${p.title || 'Приз'}</h4>
                <p>${p.description || ''}</p>
                ${p.promo_code_id ? `<span class="prize-promo">🎫 Промокод внутри</span>` : ''}
            </div>
        </div>
    `).join('');
}

function renderHits() {
    const grid = document.getElementById('hits-grid');
    if (!grid) {
        console.warn('⚠️ hits-grid не найден');
        return;
    }
    
    const hits = (products || []).filter(p => p.isHit && p.inStock);
    
    if (hits.length === 0) {
        grid.innerHTML = '<div class="empty-message">Хитов пока нет</div>';
        return;
    }
    
    grid.innerHTML = hits.slice(0, 4).map(p => createProductCard(p, true)).join('');
    addBuyButtons(grid);
}

function renderNewItems() {
    const grid = document.getElementById('new-grid');
    if (!grid) {
        console.warn('⚠️ new-grid не найден');
        return;
    }
    
    const newItems = (products || []).filter(p => p.isNew && p.inStock);
    
    if (newItems.length === 0) {
        grid.innerHTML = '<div class="empty-message">Новинок пока нет</div>';
        return;
    }
    
    grid.innerHTML = newItems.slice(0, 4).map(p => createProductCard(p, true)).join('');
    addBuyButtons(grid);
}

// ==========================================
// ===== ФИЛЬТРЫ-ТЕГИ КАТЕГОРИЙ =====
// ==========================================
function renderCategoryTabs() {
    const container = document.getElementById('category-tabs');
    if (!container) return;
    
    container.innerHTML = FIXED_CATEGORIES.map(cat => `
        <button class="category-tab ${currentCategorySlug === cat.slug ? 'active' : ''}" 
                data-slug="${cat.slug}" 
                onclick="selectCategoryTab('${cat.slug}')">
            ${cat.icon} ${cat.name}
        </button>
    `).join('');
}

function selectCategoryTab(slug) {
    currentCategorySlug = slug;
    renderCategoryTabs();
    renderCatalog();
}

// ==========================================
// ===== КАТАЛОГ (НОВАЯ ВЕРСИЯ — КАК В ALPAKAA) =====
// ==========================================
function renderCatalog() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) {
        console.warn('⚠️ catalog-grid не найден');
        return;
    }
    
    // Получаем отфильтрованные товары
    let filtered = getFilteredProducts();
    
    // Сортируем
    switch (currentSort) {
        case 'price-asc': filtered.sort((a, b) => a.price - b.price); break;
        case 'price-desc': filtered.sort((a, b) => b.price - a.price); break;
        case 'name': filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
        case 'popular': filtered.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)); break;
        default: filtered.sort((a, b) => a.id - b.id);
    }
    
    // Сохраняем для пагинации
    totalFilteredItems = filtered;
    catalogCurrentPage = 1;
    
    const countEl = document.getElementById('catalog-count');
    if (countEl) countEl.textContent = `${filtered.length} товаров`;
    
    if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-message">😕 Товары не найдены</div>`;
        return;
    }
    
    renderPage(grid);
}

function getFilteredProducts() {
    let filtered = (products || []).filter(p => p.inStock);
    
    // Поиск
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p => {
            const brand = brands.find(b => b.slug === p.brandSlug);
            const model = productModels.find(m => m.slug === p.modelSlug);
            const category = FIXED_CATEGORIES.find(c => c.slug === p.mainCategorySlug);
            
            return (p.name || '').toLowerCase().includes(q) ||
                   (brand?.name || '').toLowerCase().includes(q) ||
                   (model?.name || '').toLowerCase().includes(q) ||
                   (category?.name || '').toLowerCase().includes(q);
        });
    }
    
    // Фильтр по категории
    if (currentCategorySlug !== 'all') {
        filtered = filtered.filter(p => p.mainCategorySlug === currentCategorySlug);
    }
    
    return filtered;
}

function renderPage(grid) {
    const start = 0;
    const end = catalogCurrentPage * ITEMS_PER_PAGE;
    const pageItems = totalFilteredItems.slice(start, end);
    const hasMore = end < totalFilteredItems.length;
    const remaining = totalFilteredItems.length - end;
    
    let html = '';
    html += pageItems.map(p => createProductCard(p, false)).join('');
    
    // Кнопка "Показать ещё"
    if (hasMore) {
        html += `
            <div class="load-more-container">
                <button class="load-more-btn" onclick="loadMoreProducts()">
                    📦 Показать ещё ${Math.min(ITEMS_PER_PAGE, remaining)} товаров
                    <span class="load-more-count">(осталось ${remaining})</span>
                </button>
            </div>
        `;
    }
    
    grid.innerHTML = html;
    addBuyButtons(grid);
    
    // Обновляем счётчик
    const countEl = document.getElementById('catalog-count');
    if (countEl) {
        countEl.textContent = `${pageItems.length} из ${totalFilteredItems.length} товаров`;
    }
}

function loadMoreProducts() {
    const grid = document.getElementById('catalog-grid');
    if (!grid || isLoading) return;
    
    isLoading = true;
    const btn = grid.querySelector('.load-more-btn');
    if (btn) {
        btn.textContent = '⏳ Загрузка...';
        btn.disabled = true;
    }
    
    setTimeout(() => {
        catalogCurrentPage++;
        renderPage(grid);
        isLoading = false;
    }, 300);
}

// ==========================================
// ===== ПОИСК =====
// ==========================================
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    searchInput.addEventListener('input', function() {
        searchQuery = this.value.trim();
        renderCatalog();
    });
}

function clearSearch() {
    searchQuery = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    renderCatalog();
}

// ==========================================
// ===== КАРТОЧКА ТОВАРА (КОМПАКТНАЯ, КАК В ALPAKAA) =====
// ==========================================
function createProductCard(product, isHome) {
    if (!product) return '';
    
    const discountBadge = product.discountPrice ? 
        `<span class="discount-badge">-${Math.round((1 - product.discountPrice / product.price) * 100)}%</span>` : '';
    const hitBadge = product.isHit ? `<span class="hit-badge">🔥</span>` : '';
    const newBadge = product.isNew ? `<span class="new-badge">✨</span>` : '';
    const stockBadge = product.stockQuantity <= 5 && product.stockQuantity > 0 ? 
        `<span class="stock-badge">⚠️ Осталось ${product.stockQuantity}</span>` : '';
    
    const priceDisplay = product.discountPrice ? 
        `<span class="old-price">${product.price}</span> <span class="price">${product.discountPrice}</span>` :
        `<span class="price">${product.price}</span>`;
    
    // Находим бренд и модель
    const brand = (brands || []).find(b => b.slug === product.brandSlug);
    const model = (productModels || []).find(m => m.slug === product.modelSlug);
    
    const infoParts = [];
    if (brand) infoParts.push(brand.name);
    if (model) infoParts.push(model.name);
    const infoDisplay = infoParts.length > 0 ? 
        `<span class="product-info-text">${infoParts.join(' · ')}</span>` : '';
    
    // На главной странице карточки крупнее
    if (isHome) {
        return `
            <div class="product-card" data-id="${product.id}" onclick="showQuickView(${product.id})">
                <div class="product-badges">
                    ${hitBadge}
                    ${newBadge}
                    ${discountBadge}
                    ${stockBadge}
                </div>
                <span class="emoji">${product.emoji || '📦'}</span>
                <h3>${product.name || 'Без названия'}</h3>
                ${infoDisplay}
                <div class="price-row">${priceDisplay}</div>
                <button class="buy-btn" data-id="${product.id}" onclick="event.stopPropagation(); addToCart(${product.id})">🔥 Купить</button>
            </div>
        `;
    }
    
    // Компактная карточка для каталога (как в Alpakaa)
    return `
        <div class="product-card compact" data-id="${product.id}" onclick="showQuickView(${product.id})">
            <div class="product-badges">
                ${hitBadge}
                ${newBadge}
                ${discountBadge}
            </div>
            <span class="emoji">${product.emoji || '📦'}</span>
            <div class="product-details">
                <h3>${product.name || 'Без названия'}</h3>
                ${infoDisplay}
                <div class="price-row">${priceDisplay}</div>
            </div>
            <button class="buy-btn" data-id="${product.id}" onclick="event.stopPropagation(); addToCart(${product.id})">🔥</button>
        </div>
    `;
}

function addBuyButtons(grid) {
    if (!grid) return;
    grid.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(e.target.dataset.id);
            addToCart(id);
        });
    });
}

// ==========================================
// ===== БЫСТРЫЙ ПРОСМОТР (МОДАЛКА) =====
// ==========================================
function showQuickView(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const brand = brands.find(b => b.slug === product.brandSlug);
    const model = productModels.find(m => m.slug === product.modelSlug);
    const attributes = productAttributes.filter(a => a.product_model_slug === product.modelSlug);
    
    const modal = document.getElementById('quick-view-modal');
    if (!modal) return;
    
    const content = document.getElementById('quick-view-content');
    if (!content) return;
    
    const priceDisplay = product.discountPrice ? 
        `<span class="old-price">${product.price} BYN</span> <span class="price">${product.discountPrice} BYN</span>` :
        `<span class="price">${product.price} BYN</span>`;
    
    const stockStatus = product.stockQuantity > 0 ? 
        `<span class="in-stock">✅ В наличии (${product.stockQuantity} шт.)</span>` : 
        `<span class="out-of-stock">❌ Нет в наличии</span>`;
    
    let attrsHtml = '';
    if (attributes.length > 0) {
        attrsHtml = `
            <div class="quick-view-attributes">
                <h4>📋 Характеристики</h4>
                ${attributes.map(a => `
                    <div class="quick-view-attr">
                        <span class="attr-name">${a.attribute_name}</span>
                        <span class="attr-value">${a.attribute_value}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    content.innerHTML = `
        <div class="quick-view-close" onclick="closeQuickView()">✕</div>
        <div class="quick-view-emoji">${product.emoji || '📦'}</div>
        <h2 class="quick-view-title">${product.name}</h2>
        <div class="quick-view-info">
            ${brand ? `<span class="quick-view-brand">🏷️ ${brand.name}</span>` : ''}
            ${model ? `<span class="quick-view-model">📦 ${model.name}</span>` : ''}
        </div>
        <div class="quick-view-stock">${stockStatus}</div>
        <div class="quick-view-price">${priceDisplay}</div>
        ${attrsHtml}
        <button class="buy-btn quick-view-buy" onclick="addToCartQuick(${product.id})">🔥 Добавить в корзину</button>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeQuickView() {
    const modal = document.getElementById('quick-view-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function addToCartQuick(productId) {
    addToCart(productId);
    closeQuickView();
}

// ==========================================
// ===== СОРТИРОВКА =====
// ==========================================
function setupSortFilters() {
    const sortFilters = document.querySelectorAll('#sort-filters .filter-btn');
    if (!sortFilters.length) return;
    sortFilters.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#sort-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSort = btn.dataset.sort;
            renderCatalog();
        });
    });
}

// ==========================================
// ===== КОРЗИНА =====
// ==========================================
function saveCart() {
    localStorage.setItem('puff_cart', JSON.stringify(cart));
}

function addToCart(productId) {
    const product = (products || []).find(p => p.id === productId);
    if (!product) {
        showMessage('❌ Ошибка', 'Товар не найден');
        return;
    }
    
    if (product.stockQuantity <= 0) {
        showMessage('❌ Нет в наличии', 'Товар закончился на складе');
        return;
    }
    
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        if (existing.quantity >= product.stockQuantity) {
            showMessage('⚠️ Лимит', 'Доступно только ' + product.stockQuantity + ' шт.');
            return;
        }
        existing.quantity = (existing.quantity || 1) + 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    saveCart();
    updateCartUI();
    updateBadge();
    
    const card = document.querySelector(`.product-card[data-id="${productId}"]`);
    if (card) { card.classList.add('added'); setTimeout(() => card.classList.remove('added'), 300); }
    
    const orderForm = document.getElementById('order-form');
    if (orderForm) orderForm.style.display = 'block';
    
    showMessage('✅ Добавлено!', `${product.emoji || '📦'} ${product.name || 'Товар'} — ${product.discountPrice || product.price} BYN`);
}

function updateCartUI() {
    const cartItems = document.getElementById('cart-items');
    const totalPrice = document.getElementById('total-price');
    const checkoutBtn = document.getElementById('checkout-btn');
    const orderForm = document.getElementById('order-form');
    const deliveryInfo = document.getElementById('delivery-info');
    const promocodeInput = document.getElementById('promocode-input');
    const promocodeStatus = document.getElementById('promocode-status');
    const deliveryPriceEl = document.getElementById('delivery-price-display');
    
    if (!cartItems) return;
    
    if (!cart || cart.length === 0) {
        cartItems.innerHTML = '<li class="cart-empty">Корзина пуста</li>';
        if (totalPrice) totalPrice.textContent = '0 BYN';
        if (checkoutBtn) checkoutBtn.disabled = true;
        if (orderForm) orderForm.style.display = 'none';
        if (deliveryInfo) deliveryInfo.style.display = 'none';
        return;
    }
    
    let html = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        const price = item.discountPrice || item.price || 0;
        const qty = item.quantity || 1;
        total += price * qty;
        
        const brand = (brands || []).find(b => b.slug === item.brandSlug);
        const model = (productModels || []).find(m => m.slug === item.modelSlug);
        const brandDisplay = brand ? ` ${brand.name}` : '';
        const modelDisplay = model ? ` ${model.name}` : '';
        const fullName = item.name + brandDisplay + modelDisplay;
        
        html += `
            <li>
                <span class="item-name">${item.emoji || '📦'} ${fullName}</span>
                <div class="item-quantity">
                    <button class="qty-btn" onclick="changeQuantity(${index}, -1)">−</button>
                    <span class="qty-value">${qty}</span>
                    <button class="qty-btn" onclick="changeQuantity(${index}, 1)">+</button>
                </div>
                <span class="item-price">${(price * qty).toFixed(2)} BYN</span>
                <button class="remove-item-btn" onclick="removeFromCart(${index})">✕</button>
            </li>
        `;
    });
    
    cartItems.innerHTML = html;
    
    let deliveryDisplay = 0;
    if (deliveryEnabled && document.getElementById('order-delivery-type')?.value === 'delivery') {
        deliveryDisplay = deliveryPrice;
    }
    const totalWithDelivery = total + deliveryDisplay;
    
    if (deliveryPriceEl) {
        deliveryPriceEl.textContent = deliveryDisplay > 0 ? `+ ${deliveryDisplay.toFixed(2)} BYN` : 'Бесплатно';
    }
    
    if (totalPrice) totalPrice.textContent = totalWithDelivery.toFixed(2) + ' BYN';
    if (checkoutBtn) checkoutBtn.disabled = false;
    if (orderForm) orderForm.style.display = 'block';
    if (deliveryInfo) deliveryInfo.style.display = 'block';
}

function changeQuantity(index, delta) {
    if (index < 0 || index >= cart.length) return;
    const item = cart[index];
    const newQty = (item.quantity || 1) + delta;
    if (newQty < 1) {
        removeFromCart(index);
        return;
    }
    const product = (products || []).find(p => p.id === item.id);
    if (product && newQty > product.stockQuantity) {
        showMessage('⚠️ Лимит', 'Доступно только ' + product.stockQuantity + ' шт.');
        return;
    }
    item.quantity = newQty;
    saveCart();
    updateCartUI();
    updateBadge();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
    updateBadge();
    if (cart.length === 0) {
        const orderForm = document.getElementById('order-form');
        if (orderForm) orderForm.style.display = 'none';
    }
}

function updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
}

// ===== ПРОМОКОДЫ =====
async function applyPromocode() {
    const input = document.getElementById('promocode-input');
    const status = document.getElementById('promocode-status');
    if (!input || !status) return;
    
    const code = input.value.trim().toUpperCase();
    if (!code) {
        status.textContent = '⚠️ Введите промокод';
        status.style.color = '#f59e0b';
        return;
    }
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/promocodes?select=*&code=eq.${code}`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!response.ok) throw new Error('Ошибка проверки промокода');
        const data = await response.json();
        const promocode = data[0];
        
        if (!promocode) {
            status.textContent = '❌ Промокод не найден';
            status.style.color = '#ef4444';
            return;
        }
        
        if (!promocode.active) {
            status.textContent = '❌ Промокод неактивен';
            status.style.color = '#ef4444';
            return;
        }
        
        if (promocode.valid_until && new Date(promocode.valid_until) < new Date()) {
            status.textContent = '❌ Срок действия истёк';
            status.style.color = '#ef4444';
            return;
        }
        
        if (promocode.max_uses && promocode.used_count >= promocode.max_uses) {
            status.textContent = '❌ Лимит использований исчерпан';
            status.style.color = '#ef4444';
            return;
        }
        
        const total = cart.reduce((sum, item) => sum + (item.discountPrice || item.price || 0) * (item.quantity || 1), 0);
        if (promocode.min_order_amount && total < promocode.min_order_amount) {
            status.textContent = `❌ Минимальная сумма заказа: ${promocode.min_order_amount} BYN`;
            status.style.color = '#ef4444';
            return;
        }
        
        appliedPromocode = promocode;
        status.textContent = `✅ Промокод применён! Скидка ${promocode.discount_value}%`;
        status.style.color = '#22c55e';
        input.disabled = true;
        document.getElementById('promocode-apply-btn').disabled = true;
        
        updateCartUI();
        showMessage('🎫 Промокод применён!', `Скидка ${promocode.discount_value}% на заказ`);
        
    } catch (error) {
        console.error('❌ Ошибка применения промокода:', error);
        status.textContent = '❌ Ошибка проверки промокода';
        status.style.color = '#ef4444';
    }
}

// ==========================================
// ===== НАВИГАЦИЯ =====
// ==========================================
function navigateTo(pageId) {
    console.log('🔄 ПЕРЕХОД НА СТРАНИЦУ:', pageId);
    
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
        if (p.id && p.id.startsWith('page-admin')) {
            p.style.display = 'none';
            p.style.visibility = 'hidden';
            p.style.opacity = '0';
            p.style.height = '0';
            p.style.overflow = 'hidden';
            p.style.padding = '0';
            p.style.margin = '0';
        }
    });
    
    const target = document.getElementById(pageId);
    if (!target) {
        console.error('❌ СТРАНИЦА НЕ НАЙДЕНА:', pageId);
        return;
    }
    
    target.classList.add('active');
    if (pageId && pageId.startsWith('page-admin')) {
        target.style.display = 'block';
        target.style.visibility = 'visible';
        target.style.opacity = '1';
        target.style.height = 'auto';
        target.style.overflow = 'visible';
        target.style.padding = '';
        target.style.margin = '';
    }
    
    console.log('✅ СТРАНИЦА ПОКАЗАНА:', pageId);
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.page === pageId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    currentPage = pageId;
    
    if (pageId && pageId.startsWith('page-admin')) {
        console.log('🔄 ЗАГРУЗКА ДАННЫХ ДЛЯ:', pageId);
        
        setTimeout(() => {
            const containerMap = {
                'page-admin-attributes': 'admin-attributes-list',
                'page-admin-promotions': 'admin-promotions-list',
                'page-admin-moderators': 'admin-moderators-list',
                'page-admin-orders': 'admin-orders-list',
                'page-admin-products': 'admin-products-list',
                'page-admin-brands': 'admin-brands-list',
                'page-admin-models': 'admin-models-list',
                'page-admin-categories': 'admin-categories-list',
                'page-admin-stats': null,
                'page-admin-pickup-points': 'admin-pickup-points-list',
                'page-admin-settings': 'admin-settings-container',
                'page-admin-import': 'admin-import-container',
                'page-admin-prizes': 'admin-prizes-list',
                'page-admin-promocodes': 'admin-promocodes-list',
                'page-my-orders': 'my-orders-list'
            };
            
            const containerId = containerMap[pageId];
            if (containerId) {
                const container = document.getElementById(containerId);
                if (container) {
                    container.style.display = 'block';
                    container.style.visibility = 'visible';
                    console.log('📦 Контейнер показан:', containerId);
                }
            }
            
            switch(pageId) {
                case 'page-admin-attributes':
                    loadAdminAttributes();
                    break;
                case 'page-admin-promotions':
                    loadAdminPromotions();
                    break;
                case 'page-admin-moderators':
                    loadAdmins();
                    break;
                case 'page-admin-orders':
                    loadAdminOrders();
                    break;
                case 'page-admin-products':
                    loadAdminProducts();
                    break;
                case 'page-admin-brands':
                    loadAdminBrands();
                    break;
                case 'page-admin-models':
                    loadAdminModels();
                    break;
                case 'page-admin-categories':
                    loadAdminCategories();
                    break;
                case 'page-admin-stats':
                    loadStats();
                    break;
                case 'page-admin-pickup-points':
                    loadAdminPickupPoints();
                    break;
                case 'page-admin-settings':
                    loadAdminSettings();
                    break;
                case 'page-admin-import':
                    // Импорт загружается автоматически
                    break;
                case 'page-admin-prizes':
                    loadAdminPrizes();
                    break;
                case 'page-admin-promocodes':
                    loadAdminPromocodes();
                    break;
                case 'page-my-orders':
                    loadMyOrders();
                    break;
            }
        }, 300);
    }
    
    if (pageId === 'page-prizes') {
        loadPrizes();
    }
}

// ==========================================
// ===== ОФОРМЛЕНИЕ ЗАКАЗА =====
// ==========================================
async function checkout() {
    if (!cart || cart.length === 0) return;
    
    const phone = document.getElementById('order-phone')?.value?.trim() || '';
    const username = document.getElementById('order-username')?.value?.trim() || '';
    const deliveryType = document.getElementById('order-delivery-type')?.value || 'pickup';
    const pickupPointId = document.getElementById('order-pickup-point')?.value || '';
    const address = document.getElementById('order-address')?.value?.trim() || '';
    const comment = document.getElementById('order-comment')?.value?.trim() || '';
    
    if (deliveryType === 'pickup' && !pickupPointId) {
        showMessage('⚠️ Выберите точку', 'Пожалуйста, выберите точку самовывоза');
        return;
    }
    
    if (deliveryType === 'delivery' && !address) {
        showMessage('⚠️ Введите адрес', 'Пожалуйста, укажите адрес доставки');
        return;
    }
    
    let total = cart.reduce((sum, item) => sum + (item.discountPrice || item.price || 0) * (item.quantity || 1), 0);
    let deliveryCost = 0;
    
    if (deliveryEnabled && deliveryType === 'delivery') {
        deliveryCost = deliveryPrice;
    }
    
    let discountAmount = 0;
    if (appliedPromocode) {
        if (appliedPromocode.discount_type === 'percent') {
            discountAmount = total * (appliedPromocode.discount_value / 100);
        } else if (appliedPromocode.discount_type === 'fixed') {
            discountAmount = Math.min(appliedPromocode.discount_value, total);
        }
        total = total - discountAmount;
    }
    
    const finalTotal = total + deliveryCost;
    
    const items = cart.map(item => ({ 
        id: item.id,
        name: item.name || 'Товар', 
        price: item.discountPrice || item.price || 0,
        quantity: item.quantity || 1,
        emoji: item.emoji || '📦'
    }));
    
    const user = tg.initDataUnsafe?.user;
    
    let pickupPointName = '';
    let pickupPointAddress = '';
    if (deliveryType === 'pickup') {
        const selectedPoint = (pickupPoints || []).find(p => p.id == pickupPointId);
        if (selectedPoint) {
            pickupPointName = selectedPoint.name;
            pickupPointAddress = selectedPoint.address;
        }
    }
    
    const orderData = {
        user_id: user?.id || 0,
        username: username || user?.username || user?.first_name || 'Гость',
        total: finalTotal,
        status: 'pending',
        currency: 'BYN',
        phone: phone || 'Не указан',
        delivery_type: deliveryType,
        delivery_price: deliveryCost,
        delivery_address: deliveryType === 'pickup' ? pickupPointAddress : (address || null),
        pickup_point_id: deliveryType === 'pickup' ? pickupPointId : null,
        pickup_point_name: pickupPointName,
        comment: comment || null,
        items_json: items,
        promocode_id: appliedPromocode?.id || null,
        discount_amount: discountAmount,
        final_total: finalTotal
    };
    
    try {
        console.log('📦 Сохранение заказа:', orderData);
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const responseText = await response.text();
        console.log('📦 Статус ответа:', response.status);
        console.log('📦 Текст ответа:', responseText);
        
        if (!response.ok) {
            console.error('❌ Ошибка сохранения заказа:', response.status, responseText);
            showMessage('❌ Ошибка', `Не удалось сохранить заказ. Код ошибки: ${response.status}`);
            return;
        }
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            result = responseText;
        }
        console.log('✅ Заказ сохранен в Supabase:', result);
        
        if (appliedPromocode) {
            try {
                await fetch(`${SUPABASE_URL}/rest/v1/promocodes?id=eq.${appliedPromocode.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ used_count: (appliedPromocode.used_count || 0) + 1 })
                });
            } catch (e) {
                console.error('❌ Ошибка обновления промокода:', e);
            }
        }
        
        const botOrderData = {
            action: 'order',
            items: items,
            total: finalTotal,
            subtotal: total + discountAmount,
            discount: discountAmount,
            delivery_cost: deliveryCost,
            currency: 'BYN',
            phone: phone || 'Не указан',
            username: username || user?.username || user?.first_name || 'Гость',
            delivery_type: deliveryType,
            delivery_address: deliveryType === 'pickup' ? pickupPointAddress : (address || null),
            pickup_point_name: pickupPointName,
            comment: comment || null,
            user_id: user?.id || null,
            promocode: appliedPromocode?.code || null
        };
        
        try {
            tg.sendData(JSON.stringify(botOrderData));
            console.log('📤 Уведомление отправлено в бот');
        } catch (botError) {
            console.warn('⚠️ Ошибка отправки уведомления в бот:', botError);
        }
        
        for (const item of cart) {
            const product = (products || []).find(p => p.id === item.id);
            if (product) {
                const newStock = Math.max(0, (product.stockQuantity || 0) - (item.quantity || 1));
                try {
                    await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${item.id}`, {
                        method: 'PATCH',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${SUPABASE_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            stock_quantity: newStock,
                            in_stock: newStock > 0
                        })
                    });
                    console.log(`✅ Обновлен остаток товара ${item.id}: ${newStock}`);
                } catch (stockError) {
                    console.error('❌ Ошибка обновления остатка:', stockError);
                }
            }
        }
        
        cart = [];
        appliedPromocode = null;
        saveCart();
        updateCartUI();
        updateBadge();
        
        const orderForm = document.getElementById('order-form');
        if (orderForm) orderForm.style.display = 'none';
        
        const phoneInput = document.getElementById('order-phone');
        const usernameInput = document.getElementById('order-username');
        const addressInput = document.getElementById('order-address');
        const commentInput = document.getElementById('order-comment');
        const promocodeInput = document.getElementById('promocode-input');
        const promocodeStatus = document.getElementById('promocode-status');
        
        if (phoneInput) phoneInput.value = '';
        if (usernameInput) usernameInput.value = '';
        if (addressInput) addressInput.value = '';
        if (commentInput) commentInput.value = '';
        if (promocodeInput) { promocodeInput.value = ''; promocodeInput.disabled = false; }
        if (promocodeStatus) { promocodeStatus.textContent = ''; }
        document.getElementById('promocode-apply-btn').disabled = false;
        
        showMessage('✅ Заказ оформлен!', 'Спасибо за заказ! Мы свяжемся с вами в ближайшее время.');
        
        await loadProductsFromSupabase();
        
        setTimeout(() => {
            tg.close();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Ошибка оформления заказа:', error);
        showMessage('❌ Ошибка', 'Не удалось оформить заказ. Попробуйте еще раз.');
    }
}

// ==========================================
// ===== МОИ ЗАКАЗЫ =====
// ==========================================
async function loadMyOrders() {
    console.log('🔄 ЗАГРУЗКА МОИХ ЗАКАЗОВ...');
    const container = document.getElementById('my-orders-list');
    if (!container) return;
    
    const user = tg.initDataUnsafe?.user;
    if (!user) {
        container.innerHTML = '<div class="empty-message">Войдите в Telegram, чтобы увидеть заказы</div>';
        return;
    }
    
    try {
        container.innerHTML = '<div class="loading">⏳ Загрузка ваших заказов...</div>';
        const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&user_id=eq.${user.id}&order=created_at.desc`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        if (!response.ok) throw new Error('Не удалось загрузить заказы');
        const orders = await response.json();
        console.log('📦 Загружено ваших заказов:', orders ? orders.length : 0);
        
        if (!orders || orders.length === 0) {
            container.innerHTML = '<div class="empty-message">У вас пока нет заказов</div>';
            return;
        }
        
        container.innerHTML = orders.map(order => {
            const statusMap = {
                'pending': '🔄 В обработке',
                'confirmed': '✅ Подтвержден',
                'shipped': '📦 Отправлен',
                'completed': '✅ Выполнен'
            };
            const statusClass = order.status || 'pending';
            const itemsList = order.items_json ? order.items_json.map(item => `${item.emoji || '📦'} ${item.name} × ${item.quantity || 1}`).join(', ') : '';
            let deliveryText = order.delivery_type === 'pickup' ? `🏪 Самовывоз: ${order.pickup_point_name || 'Точка не указана'}` : `🚚 Доставка: ${order.delivery_address || 'Адрес не указан'}`;
            
            let cancelButton = '';
            if (order.status === 'pending') {
                cancelButton = `<button class="order-status-btn cancel-btn" onclick="cancelOrder(${order.id})">❌ Отменить заказ</button>`;
            }
            
            let priceDetails = `💰 ${order.total || 0} BYN`;
            if (order.delivery_price > 0) {
                priceDetails += ` (включая доставку ${order.delivery_price} BYN)`;
            }
            if (order.discount_amount > 0) {
                priceDetails += ` со скидкой ${order.discount_amount} BYN`;
            }
            
            return `
            <div class="my-order-card">
                <div class="order-header">
                    <strong>Заказ #${order.id}</strong>
                    <span class="order-status ${statusClass}">${statusMap[order.status] || order.status}</span>
                </div>
                <div class="order-details">
                    <p>${priceDetails}</p>
                    <p>📦 ${deliveryText}</p>
                    ${itemsList ? `<p>📋 ${itemsList}</p>` : ''}
                    ${order.comment ? `<p>💬 ${order.comment}</p>` : ''}
                    ${order.username ? `<p>👤 ${order.username}</p>` : ''}
                    <p>📅 ${new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div class="order-actions">${cancelButton}</div>
            </div>
        `}).join('');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки заказов:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки заказов</div>';
    }
}

async function cancelOrder(orderId) {
    if (!confirm('Отменить заказ #' + orderId + '?')) return;
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
            method: 'PATCH',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'cancelled' })
        });
        if (response.ok) {
            showMessage('✅ Отменено', 'Заказ #' + orderId + ' отменен');
            await loadMyOrders();
        }
    } catch (error) {
        console.error('❌ Ошибка отмены заказа:', error);
        showMessage('❌ Ошибка', 'Не удалось отменить заказ');
    }
}

// ==========================================
// ===== РАСШИРЕННАЯ СТАТИСТИКА =====
// ==========================================
async function loadStats() {
    console.log('🔄 ЗАГРУЗКА СТАТИСТИКИ...');
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&status=eq.completed`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Не удалось загрузить статистику');
        const orders = await response.json();
        
        const productsResponse = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const allProducts = await productsResponse.json();
        
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
            ordersPending: 0,
            deliveryOrders: 0,
            pickupOrders: 0,
            deliveryRevenue: 0,
            categorySales: {},
            topProducts: [],
            totalOrders: 0
        };
        
        const categoryNames = {
            'pod': 'Pod-системы',
            'liquid': 'Жижи',
            'accessories': 'Комплектующие',
            'disposable': 'Одноразовые pod',
            'snus': 'Снюс'
        };
        
        FIXED_CATEGORIES.forEach(cat => {
            stats.categorySales[cat.slug] = { name: cat.name, revenue: 0, orders: 0, items: 0 };
        });
        
        (orders || []).forEach(order => {
            const orderDate = new Date(order.created_at);
            const amount = Number(order.total) || 0;
            const deliveryPrice = Number(order.delivery_price) || 0;
            
            stats.total += amount;
            stats.totalOrders++;
            
            if (orderDate >= today) {
                stats.today += amount;
                stats.ordersToday++;
            }
            if (orderDate >= weekAgo) {
                stats.week += amount;
            }
            if (orderDate >= monthAgo) {
                stats.month += amount;
            }
            
            if (order.delivery_type === 'delivery') {
                stats.deliveryOrders++;
                stats.deliveryRevenue += deliveryPrice;
            } else if (order.delivery_type === 'pickup') {
                stats.pickupOrders++;
            }
            
            if (order.items_json) {
                order.items_json.forEach(item => {
                    const product = allProducts.find(p => p.id === item.id);
                    if (product && product.main_category_slug) {
                        const slug = product.main_category_slug;
                        if (stats.categorySales[slug]) {
                            stats.categorySales[slug].revenue += (item.price || 0) * (item.quantity || 1);
                            stats.categorySales[slug].orders++;
                            stats.categorySales[slug].items += (item.quantity || 1);
                        }
                    }
                });
            }
        });
        
        const productSales = {};
        (orders || []).forEach(order => {
            if (order.items_json) {
                order.items_json.forEach(item => {
                    const key = item.id;
                    if (!productSales[key]) {
                        productSales[key] = { 
                            name: item.name, 
                            emoji: item.emoji || '📦',
                            quantity: 0, 
                            revenue: 0 
                        };
                    }
                    productSales[key].quantity += (item.quantity || 1);
                    productSales[key].revenue += (item.price || 0) * (item.quantity || 1);
                });
            }
        });
        
        stats.topProducts = Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
        
        const pendingResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=id&status=eq.pending`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (pendingResponse.ok) {
            const pending = await pendingResponse.json();
            stats.ordersPending = pending ? pending.length : 0;
        }
        
        document.getElementById('stat-today').textContent = stats.today.toFixed(2) + ' BYN';
        document.getElementById('stat-week').textContent = stats.week.toFixed(2) + ' BYN';
        document.getElementById('stat-month').textContent = stats.month.toFixed(2) + ' BYN';
        document.getElementById('stat-total').textContent = stats.total.toFixed(2) + ' BYN';
        document.getElementById('stat-orders-today').textContent = stats.ordersToday;
        document.getElementById('stat-orders-pending').textContent = stats.ordersPending;
        
        const deliveryStats = document.getElementById('stat-delivery');
        const pickupStats = document.getElementById('stat-pickup');
        const deliveryRevenueStats = document.getElementById('stat-delivery-revenue');
        const totalOrdersStats = document.getElementById('stat-total-orders');
        
        if (deliveryStats) deliveryStats.textContent = stats.deliveryOrders;
        if (pickupStats) pickupStats.textContent = stats.pickupOrders;
        if (deliveryRevenueStats) deliveryRevenueStats.textContent = stats.deliveryRevenue.toFixed(2) + ' BYN';
        if (totalOrdersStats) totalOrdersStats.textContent = stats.totalOrders;
        
        const categoryStatsContainer = document.getElementById('stat-categories');
        if (categoryStatsContainer) {
            let html = '';
            FIXED_CATEGORIES.forEach(cat => {
                const data = stats.categorySales[cat.slug] || { revenue: 0, orders: 0, items: 0 };
                html += `
                    <div class="stat-category-item">
                        <span class="stat-category-icon">${cat.icon || '📂'}</span>
                        <span class="stat-category-name">${cat.name}</span>
                        <span class="stat-category-revenue">${data.revenue.toFixed(2)} BYN</span>
                        <span class="stat-category-orders">${data.orders} заказов</span>
                    </div>
                `;
            });
            categoryStatsContainer.innerHTML = html;
        }
        
        const topProductsContainer = document.getElementById('stat-top-products');
        if (topProductsContainer) {
            if (stats.topProducts.length === 0) {
                topProductsContainer.innerHTML = '<div class="empty-message">Нет данных о продажах</div>';
            } else {
                let html = '';
                stats.topProducts.forEach((p, i) => {
                    html += `
                        <div class="stat-top-product">
                            <span class="top-product-rank">#${i + 1}</span>
                            <span class="top-product-emoji">${p.emoji}</span>
                            <span class="top-product-name">${p.name}</span>
                            <span class="top-product-qty">${p.quantity} шт.</span>
                            <span class="top-product-revenue">${p.revenue.toFixed(2)} BYN</span>
                        </div>
                    `;
                });
                topProductsContainer.innerHTML = html;
            }
        }
        
        console.log('✅ Расширенная статистика загружена:', stats);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки статистики:', error);
        showMessage('❌ Ошибка', 'Не удалось загрузить статистику');
    }
}

// ==========================================
// ===== АДМИН-ПАНЕЛЬ =====
// ==========================================

// --- Фильтры заказов ---
function setupOrderFilters() {
    const statusFilter = document.getElementById('order-filter-status');
    const dateFrom = document.getElementById('order-filter-date-from');
    const dateTo = document.getElementById('order-filter-date-to');
    const deliveryFilter = document.getElementById('order-filter-delivery');
    const applyBtn = document.getElementById('order-filter-apply');
    const resetBtn = document.getElementById('order-filter-reset');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', function() {
            ordersFilter.status = statusFilter ? statusFilter.value : 'all';
            ordersFilter.dateFrom = dateFrom ? dateFrom.value : '';
            ordersFilter.dateTo = dateTo ? dateTo.value : '';
            ordersFilter.deliveryType = deliveryFilter ? deliveryFilter.value : 'all';
            loadAdminOrders();
        });
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (statusFilter) statusFilter.value = 'all';
            if (dateFrom) dateFrom.value = '';
            if (dateTo) dateTo.value = '';
            if (deliveryFilter) deliveryFilter.value = 'all';
            ordersFilter = { status: 'all', dateFrom: '', dateTo: '', deliveryType: 'all' };
            loadAdminOrders();
        });
    }
}

// --- Заказы (с фильтрами и юзернеймом) ---
async function loadAdminOrders() {
    console.log('🔄 ЗАГРУЗКА ЗАКАЗОВ...');
    const container = document.getElementById('admin-orders-list');
    if (!container) {
        console.error('❌ Контейнер admin-orders-list не найден');
        return;
    }
    
    container.style.display = 'block';
    container.style.visibility = 'visible';
    
    try {
        container.innerHTML = '<div class="loading">⏳ Загрузка заказов...</div>';
        
        let url = `${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`;
        if (ordersFilter.status !== 'all') url += `&status=eq.${ordersFilter.status}`;
        if (ordersFilter.dateFrom) {
            const fromDate = new Date(ordersFilter.dateFrom);
            fromDate.setHours(0,0,0,0);
            url += `&created_at=gte.${fromDate.toISOString()}`;
        }
        if (ordersFilter.dateTo) {
            const toDate = new Date(ordersFilter.dateTo);
            toDate.setHours(23,59,59,999);
            url += `&created_at=lte.${toDate.toISOString()}`;
        }
        if (ordersFilter.deliveryType !== 'all') url += `&delivery_type=eq.${ordersFilter.deliveryType}`;
        
        const response = await fetch(url, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        if (!response.ok) throw new Error('Не удалось загрузить заказы');
        const orders = await response.json();
        console.log('📦 Загружено заказов:', orders ? orders.length : 0);
        
        if (!orders || orders.length === 0) {
            container.innerHTML = '<div class="empty-message">Заказов пока нет</div>';
            return;
        }
        
        container.innerHTML = orders.map(order => {
            let deliveryText = order.delivery_type === 'pickup' ? `🏪 Самовывоз: ${order.pickup_point_name || 'Точка не указана'}` : `🚚 Доставка: ${order.delivery_address || 'Адрес не указан'}`;
            const itemsList = order.items_json ? order.items_json.map(item => `${item.emoji || '📦'} ${item.name} × ${item.quantity || 1}`).join(', ') : '';
            
            const userDisplay = order.username || order.user_id ? 
                `<a href="tg://user?id=${order.user_id}" target="_blank" class="user-link">👤 ${order.username || 'Пользователь'}</a>` : 
                '👤 Гость';
            
            let priceDetails = `💰 ${order.total || 0} BYN`;
            if (order.delivery_price > 0) {
                priceDetails += ` (+ доставка ${order.delivery_price} BYN)`;
            }
            if (order.discount_amount > 0) {
                priceDetails += ` (скидка -${order.discount_amount} BYN)`;
            }
            
            let statusText = '', statusClass = '', actionButtons = '';
            switch(order.status) {
                case 'pending':
                    statusText = '🔄 В обработке'; statusClass = 'pending';
                    actionButtons = `
                        <button class="order-status-btn confirm-btn" data-id="${order.id}" data-status="confirmed">✅ Подтвердить</button>
                        <button class="order-status-btn contact-btn" onclick="openChatWithUser(${order.user_id}, ${order.id})">💬 Написать</button>
                    `;
                    break;
                case 'confirmed':
                    statusText = '✅ Подтвержден'; statusClass = 'confirmed';
                    actionButtons = `
                        <button class="order-status-btn" data-id="${order.id}" data-status="shipped">📦 Отправлен</button>
                        <button class="order-status-btn" data-id="${order.id}" data-status="completed">✅ Выполнен</button>
                        <button class="order-status-btn contact-btn" onclick="openChatWithUser(${order.user_id}, ${order.id})">💬 Написать</button>
                    `;
                    break;
                case 'shipped':
                    statusText = '📦 Отправлен'; statusClass = 'shipped';
                    actionButtons = `
                        <button class="order-status-btn" data-id="${order.id}" data-status="completed">✅ Выполнен</button>
                        <button class="order-status-btn contact-btn" onclick="openChatWithUser(${order.user_id}, ${order.id})">💬 Написать</button>
                    `;
                    break;
                case 'completed':
                    statusText = '✅ Выполнен'; statusClass = 'completed';
                    actionButtons = `
                        <button class="order-status-btn contact-btn" onclick="openChatWithUser(${order.user_id}, ${order.id})">💬 Написать</button>
                    `;
                    break;
                default:
                    statusText = order.status || 'Неизвестно'; statusClass = 'pending'; actionButtons = '';
            }
            
            return `
            <div class="admin-order-card">
                <div class="order-header">
                    <strong>Заказ #${order.id}</strong>
                    <span class="order-status ${statusClass}">${statusText}</span>
                </div>
                <div class="order-details">
                    <p>${userDisplay}</p>
                    <p>📱 ${order.phone || 'Не указан'}</p>
                    <p>${priceDetails}</p>
                    <p>📦 ${deliveryText}</p>
                    ${itemsList ? `<p>📋 ${itemsList}</p>` : ''}
                    ${order.comment ? `<p>💬 ${order.comment}</p>` : ''}
                    ${order.promocode_id ? `<p>🎫 Промокод применён</p>` : ''}
                    <p>📅 ${new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div class="order-actions">${actionButtons}</div>
            </div>
        `}).join('');
        
        container.querySelectorAll('.order-status-btn[data-id]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                const status = btn.dataset.status;
                await updateOrderStatus(id, status);
                await loadAdminOrders();
            });
        });
        
    } catch (error) {
        console.error('❌ Ошибка загрузки заказов:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки заказов</div>';
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        const orderResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const orderData = await orderResponse.json();
        const order = orderData ? orderData[0] : null;
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
            method: 'PATCH',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            if (order && order.user_id) {
                try {
                    let message = '';
                    switch(status) {
                        case 'confirmed': 
                            message = `✅ Ваш заказ #${orderId} ПОДТВЕРЖДЕН!\n\n📦 Товары: ${order.items_json ? order.items_json.map(item => `${item.name} (${item.price} BYN) × ${item.quantity || 1}`).join(', ') : ''}\n💰 Итого: ${order.total || 0} BYN\n\nСпасибо за заказ! Мы приступили к его обработке.\n\n📩 По вопросам заказа: @puff_mngr`; 
                            break;
                        case 'shipped': 
                            message = `📦 Ваш заказ #${orderId} ОТПРАВЛЕН!\n\nСпасибо за покупку! ❤️\n\n📩 По вопросам заказа: @puff_mngr`; 
                            break;
                        case 'completed': 
                            message = `✅ Ваш заказ #${orderId} ВЫПОЛНЕН!\n\nБлагодарим за покупку! Ждем вас снова! 🙏\n\n📩 По вопросам заказа: @puff_mngr`; 
                            break;
                        default: 
                            message = `Статус заказа #${orderId} изменен на: ${status}\n\n📩 По вопросам заказа: @puff_mngr`;
                    }
                    fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: order.user_id, text: message, parse_mode: 'HTML' })
                    });
                } catch (notifyError) { console.error('❌ Ошибка отправки уведомления:', notifyError); }
            }
            showMessage('✅ Статус обновлён', `Заказ #${orderId} успешно обновлен`);
        }
    } catch (error) {
        console.error('❌ Ошибка обновления статуса:', error);
        showMessage('❌ Ошибка', 'Не удалось обновить статус заказа');
    }
}

// ===== ОТПРАВКА СООБЩЕНИЯ ПОКУПАТЕЛЮ (С @puff_mngr) =====
function openChatWithUser(userId, orderId) {
    if (!userId) {
        showMessage('⚠️ Ошибка', 'У пользователя нет ID для связи');
        return;
    }
    const message = prompt('💬 Введите сообщение для покупателя (заказ #' + orderId + '):');
    if (!message) return;
    
    fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    })
    .then(r => r.json())
    .then(orders => {
        const order = orders ? orders[0] : null;
        if (!order) { showMessage('❌ Ошибка', 'Заказ не найден'); return; }
        const fullMessage = `📩 Сообщение от администратора по заказу #${orderId}:\n\n${message}\n\n---\n📦 Заказ: ${order.items_json ? order.items_json.map(i => `${i.name} × ${i.quantity || 1}`).join(', ') : ''}\n💰 Сумма: ${order.total || 0} BYN\n\n📩 По вопросам заказа: @puff_mngr`;
        
        fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: userId, text: fullMessage, parse_mode: 'HTML' })
        })
        .then(() => showMessage('✅ Отправлено', 'Сообщение отправлено покупателю'))
        .catch(err => showMessage('❌ Ошибка', 'Не удалось отправить сообщение: ' + err.message));
    })
    .catch(err => console.error('❌ Ошибка:', err));
}

// ===== ЭКСПОРТ ЗАКАЗОВ =====
function exportOrdersCSV() {
    fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    })
    .then(r => r.json())
    .then(orders => {
        if (!orders || orders.length === 0) { showMessage('⚠️ Нет данных', 'Нет заказов для экспорта'); return; }
        let csv = 'ID,Покупатель,Телефон,Сумма,Доставка,Скидка,Итого,Способ получения,Статус,Дата,Товары\n';
        orders.forEach(o => {
            const items = o.items_json ? o.items_json.map(i => `${i.name} × ${i.quantity || 1}`).join('; ') : '';
            const delivery = o.delivery_type === 'pickup' ? `Самовывоз: ${o.pickup_point_name || ''}` : `Доставка: ${o.delivery_address || ''}`;
            csv += `${o.id},"${o.username || ''}","${o.phone || ''}",${o.total || 0},${o.delivery_price || 0},${o.discount_amount || 0},${o.final_total || o.total || 0},"${delivery}","${o.status || ''}","${new Date(o.created_at).toLocaleString()}","${items}"\n`;
        });
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `заказы_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        showMessage('✅ Экспорт выполнен', 'Файл CSV скачан');
    })
    .catch(err => { console.error('❌ Ошибка экспорта:', err); showMessage('❌ Ошибка', 'Не удалось экспортировать заказы'); });
}

// ==========================================
// ===== УВЕДОМЛЕНИЯ В АДМИНКЕ =====
// ==========================================
function initNotificationSound() {
    try {
        notificationSound = new Audio('data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAACBhYqFhYWJhYaFhIuDg4SEg4OEhIKCg4ODg4ODg4ODhIKEhoSGhISEg4ODg4ODg4ODg4ODg4ODhA==');
    } catch (e) {}
}

function playNotificationSound() {
    try {
        if (notificationSound) {
            notificationSound.currentTime = 0;
            notificationSound.play().catch(() => {});
        }
    } catch (e) {}
}

function checkNewOrders() {
    if (!isAdmin) return;
    const now = Date.now();
    if (now - lastOrderCheck < 10000) return;
    lastOrderCheck = now;
    
    fetch(`${SUPABASE_URL}/rest/v1/orders?select=id,created_at,status&status=eq.pending&order=created_at.desc&limit=5`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    })
    .then(r => r.json())
    .then(orders => {
        if (orders && orders.length > 0) {
            const pendingOrders = orders.filter(o => o.status === 'pending');
            if (pendingOrders.length > 0) {
                playNotificationSound();
                const count = pendingOrders.length;
                showMessage('🆕 Новые заказы!', `У вас ${count} ${count === 1 ? 'новый заказ' : 'новых заказа'} в обработке.`);
            }
        }
    })
    .catch(() => {});
}

// ==========================================
// ===== УПРАВЛЕНИЕ ТОЧКАМИ САМОВЫВОЗА =====
// ==========================================

async function loadAdminPickupPoints() {
    console.log('🔄 ЗАГРУЗКА ТОЧЕК САМОВЫВОЗА...');
    const container = document.getElementById('admin-pickup-points-list');
    if (!container) {
        console.error('❌ Контейнер admin-pickup-points-list не найден');
        return;
    }
    
    container.style.display = 'block';
    container.style.visibility = 'visible';
    
    try {
        container.innerHTML = '<div class="loading">⏳ Загрузка точек самовывоза...</div>';
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/pickup_points?select=*&order=sort_order.asc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Не удалось загрузить точки самовывоза');
        const data = await response.json();
        console.log('📦 Загружено точек самовывоза:', data ? data.length : 0);
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="empty-message">Точек самовывоза пока нет</div>';
            return;
        }
        
        container.innerHTML = data.map(point => `
            <div class="admin-pickup-point-card" data-id="${point.id}">
                <div class="admin-pickup-point-info">
                    <div class="admin-pickup-point-name">📍 ${point.name || 'Без названия'}</div>
                    <div class="admin-pickup-point-address">${point.address || ''}</div>
                    ${point.working_hours ? `<div class="admin-pickup-point-hours">🕐 ${point.working_hours}</div>` : ''}
                    ${point.phone ? `<div class="admin-pickup-point-phone">📱 ${point.phone}</div>` : ''}
                    <div class="admin-pickup-point-status">${point.is_active !== false ? '🟢 Активна' : '🔴 Неактивна'}</div>
                </div>
                <div class="admin-pickup-point-actions">
                    <button class="admin-edit-btn" onclick="editPickupPoint(${point.id})">✏️</button>
                    <button class="admin-delete-btn" onclick="deletePickupPoint(${point.id})">🗑️</button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки точек самовывоза:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки точек самовывоза</div>';
    }
}

async function addNewPickupPoint() {
    const name = prompt('📍 Введите название точки самовывоза:');
    if (!name) return;
    const address = prompt('🏠 Введите адрес:');
    if (!address) return;
    const workingHours = prompt('🕐 Введите часы работы (например, "Пн-Пт: 10:00-20:00"):') || '';
    const phone = prompt('📱 Введите телефон:') || '';
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/pickup_points`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                address,
                working_hours: workingHours,
                phone,
                is_active: true,
                sort_order: 0
            })
        });
        
        if (response.ok) {
            await loadAdminPickupPoints();
            await loadPickupPoints();
            showMessage('✅ Точка добавлена!', `"${name}" успешно добавлена`);
        } else {
            const error = await response.json();
            console.error('❌ Ошибка добавления:', error);
            showMessage('❌ Ошибка', error.message || 'Не удалось добавить точку');
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error);
        showMessage('❌ Ошибка', 'Ошибка соединения с сервером');
    }
}

async function deletePickupPoint(pointId) {
    if (!confirm('Удалить эту точку самовывоза?')) return;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/pickup_points?id=eq.${pointId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (response.ok) {
            await loadAdminPickupPoints();
            await loadPickupPoints();
            showMessage('✅ Точка удалена', 'Точка самовывоза успешно удалена');
        }
    } catch (error) {
        console.error('❌ Ошибка удаления:', error);
    }
}

// --- Товары (админка) ---
async function loadAdminProducts() {
    console.log('🔄 ЗАГРУЗКА ТОВАРОВ...');
    const container = document.getElementById('admin-products-list');
    if (!container) {
        console.error('❌ Контейнер admin-products-list не найден');
        return;
    }
    
    container.style.display = 'block';
    container.style.visibility = 'visible';
    
    try {
        container.innerHTML = '<div class="loading">⏳ Загрузка товаров...</div>';
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Не удалось загрузить товары');
        const data = await response.json();
        console.log('📦 Загружено товаров в админке:', data ? data.length : 0);
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="empty-message">Товаров не найдено</div>';
            return;
        }
        
        container.innerHTML = data.map(p => {
            const category = FIXED_CATEGORIES.find(c => c.slug === p.main_category_slug);
            const brand = (brands || []).find(b => b.slug === p.brand_slug);
            const model = (productModels || []).find(m => m.slug === p.product_model_slug);
            
            return `
            <div class="admin-product-card" data-id="${p.id}">
                <span class="admin-product-emoji">${p.emoji || '📦'}</span>
                <div class="admin-product-info">
                    <div class="admin-product-name">${p.name || 'Без названия'}</div>
                    <div class="admin-product-price">${p.price || 0} BYN</div>
                    <div class="admin-product-category">${category ? category.name : p.main_category_slug}</div>
                    <div class="admin-product-brand">${brand ? brand.name : p.brand_slug}</div>
                    <div class="admin-product-model">${model ? model.name : p.product_model_slug}</div>
                    <div class="admin-product-stock">📦 Остаток: ${p.stock_quantity || 0} шт.</div>
                    <div class="admin-product-sold">📈 Продано: ${p.sold_count || 0} шт.</div>
                    ${p.is_hit ? '<span class="badge-hit">🔥 Хит</span>' : ''}
                    ${p.is_new ? '<span class="badge-new">✨ Новинка</span>' : ''}
                    <div class="admin-stock-toggle">
                        <label class="toggle-switch">
                            <input type="checkbox" ${p.in_stock !== false ? 'checked' : ''} onchange="toggleStock(${p.id}, this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="admin-stock-label">${p.in_stock !== false ? '✅ В наличии' : '❌ Нет в наличии'}</span>
                    </div>
                </div>
                <div class="admin-product-actions">
                    <button class="admin-edit-btn" data-id="${p.id}">✏️</button>
                    <button class="admin-delete-btn" data-id="${p.id}">🗑️</button>
                </div>
            </div>
        `}).join('');
        
        container.querySelectorAll('.admin-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                if (confirm('Удалить этот товар?')) {
                    await deleteProduct(id);
                }
            });
        });
        
        container.querySelectorAll('.admin-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                showEditProductForm(id);
            });
        });
    } catch (error) {
        console.error('❌ Ошибка загрузки товаров:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки товаров</div>';
    }
}

async function toggleStock(productId, checked) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ in_stock: checked })
        });
        
        if (response.ok) {
            await loadAdminProducts();
            await loadProductsFromSupabase();
        }
    } catch (error) {
        console.error('❌ Ошибка обновления статуса:', error);
        showMessage('❌ Ошибка', 'Не удалось обновить статус товара');
    }
}

async function deleteProduct(productId) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (response.ok) {
            await loadAdminProducts();
            await loadProductsFromSupabase();
            showMessage('✅ Удалено', 'Товар успешно удален');
        }
    } catch (error) {
        console.error('❌ Ошибка удаления товара:', error);
    }
}

function showEditProductForm(productId) {
    const product = (products || []).find(p => p.id === productId);
    if (!product) return;
    
    const name = prompt('Название товара:', product.name || '');
    if (name === null) return;
    const price = prompt('Цена (BYN):', product.price || 0);
    if (price === null) return;
    const emoji = prompt('Эмодзи:', product.emoji || '📦');
    if (emoji === null) return;
    const stock = prompt('Количество на складе:', product.stockQuantity || 0);
    if (stock === null) return;
    const isHit = confirm('Это хит продаж? (OK - да, Отмена - нет)');
    const isNew = confirm('Это новинка? (OK - да, Отмена - нет)');
    
    updateProduct(productId, { 
        name, 
        price: parseFloat(price) || 0, 
        emoji, 
        stock_quantity: parseInt(stock) || 0,
        is_hit: isHit,
        is_new: isNew
    });
}

async function updateProduct(productId, data) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            await loadAdminProducts();
            await loadProductsFromSupabase();
            showMessage('✅ Обновлено', 'Товар успешно обновлен');
        }
    } catch (error) {
        console.error('❌ Ошибка обновления товара:', error);
    }
}

// ===== ДОБАВЛЕНИЕ ТОВАРА =====
async function addNewProduct() {
    const categoryOptions = FIXED_CATEGORIES.map((c, i) => `${i+1}. ${c.icon} ${c.name}`).join('\n');
    const categoryChoice = prompt(
        `📂 ВЫБЕРИТЕ КАТЕГОРИЮ ТОВАРА\n\n` +
        `${categoryOptions}\n\n` +
        `💡 Введите номер категории:`
    );
    if (!categoryChoice) return;
    const categoryIndex = parseInt(categoryChoice) - 1;
    if (isNaN(categoryIndex) || categoryIndex < 0 || categoryIndex >= FIXED_CATEGORIES.length) {
        alert('❌ Неверный выбор категории');
        return;
    }
    const category = FIXED_CATEGORIES[categoryIndex];
    const mainCategorySlug = category.slug;

    let brandSlug = null;
    let brandName = null;
    if (mainCategorySlug !== 'accessories' && mainCategorySlug !== 'disposable') {
        const categoryBrands = (brands || []).filter(b => b.main_category_slug === mainCategorySlug);
        if (categoryBrands.length === 0) {
            alert(`❌ Нет брендов для категории "${category.name}". Сначала добавьте бренд через админку → Бренды.`);
            return;
        }
        const brandOptions = categoryBrands.map((b, i) => `${i+1}. ${b.name}`).join('\n');
        const brandChoice = prompt(
            `🏷️ ВЫБЕРИТЕ БРЕНД\n\n` +
            `${brandOptions}\n\n` +
            `💡 Введите номер бренда:`
        );
        if (!brandChoice) return;
        const brandIndex = parseInt(brandChoice) - 1;
        if (isNaN(brandIndex) || brandIndex < 0 || brandIndex >= categoryBrands.length) {
            alert('❌ Неверный выбор бренда');
            return;
        }
        brandSlug = categoryBrands[brandIndex].slug;
        brandName = categoryBrands[brandIndex].name;
    }

    let modelSlug = null;
    let modelName = null;
    let modelOptions = [];

    if (mainCategorySlug === 'accessories') {
        const accessoriesModels = (productModels || []).filter(m => m.main_category_slug === 'accessories');
        if (accessoriesModels.length === 0) {
            alert('❌ Нет комплектующих. Сначала добавьте комплектующие через админку → Модели.');
            return;
        }
        modelOptions = accessoriesModels.map((m, i) => `${i+1}. ${m.name}`).join('\n');
        const modelChoice = prompt(
            `🔧 ВЫБЕРИТЕ КОМПЛЕКТУЮЩЕЕ\n\n` +
            `${modelOptions}\n\n` +
            `💡 Введите номер:`
        );
        if (!modelChoice) return;
        const modelIndex = parseInt(modelChoice) - 1;
        if (isNaN(modelIndex) || modelIndex < 0 || modelIndex >= accessoriesModels.length) {
            alert('❌ Неверный выбор');
            return;
        }
        modelSlug = accessoriesModels[modelIndex].slug;
        modelName = accessoriesModels[modelIndex].name;
    } else if (mainCategorySlug === 'disposable') {
        const disposableModels = (productModels || []).filter(m => m.main_category_slug === 'disposable');
        if (disposableModels.length === 0) {
            alert('❌ Нет одноразовых pod. Сначала добавьте через админку → Модели.');
            return;
        }
        modelOptions = disposableModels.map((m, i) => `${i+1}. ${m.name}`).join('\n');
        const modelChoice = prompt(
            `⚡ ВЫБЕРИТЕ ОДНОРАЗОВЫЙ POD\n\n` +
            `${modelOptions}\n\n` +
            `💡 Введите номер:`
        );
        if (!modelChoice) return;
        const modelIndex = parseInt(modelChoice) - 1;
        if (isNaN(modelIndex) || modelIndex < 0 || modelIndex >= disposableModels.length) {
            alert('❌ Неверный выбор');
            return;
        }
        modelSlug = disposableModels[modelIndex].slug;
        modelName = disposableModels[modelIndex].name;
    } else {
        const brandModels = (productModels || []).filter(m => m.brand_slug === brandSlug);
        if (brandModels.length === 0) {
            alert(`❌ Нет моделей для бренда "${brandName}". Сначала добавьте модели через админку → Модели.`);
            return;
        }
        modelOptions = brandModels.map((m, i) => `${i+1}. ${m.name}`).join('\n');
        const modelChoice = prompt(
            `📦 ВЫБЕРИТЕ МОДЕЛЬ ДЛЯ "${brandName}"\n\n` +
            `${modelOptions}\n\n` +
            `💡 Введите номер:`
        );
        if (!modelChoice) return;
        const modelIndex = parseInt(modelChoice) - 1;
        if (isNaN(modelIndex) || modelIndex < 0 || modelIndex >= brandModels.length) {
            alert('❌ Неверный выбор модели');
            return;
        }
        modelSlug = brandModels[modelIndex].slug;
        modelName = brandModels[modelIndex].name;
    }

    let attributes = [];
    const modelAttributes = (productAttributes || []).filter(a => a.product_model_slug === modelSlug);
    
    if (modelAttributes.length > 0) {
        const attrGroups = {};
        modelAttributes.forEach(a => {
            if (!attrGroups[a.attribute_name]) {
                attrGroups[a.attribute_name] = [];
            }
            attrGroups[a.attribute_name].push(a.attribute_value);
        });

        for (const [attrName, values] of Object.entries(attrGroups)) {
            const valueOptions = values.map((v, i) => `${i+1}. ${v}`).join('\n');
            const valueChoice = prompt(
                `🎨 ВЫБЕРИТЕ ${attrName.toUpperCase()}\n\n` +
                `${valueOptions}\n\n` +
                `💡 Введите номер:`
            );
            if (!valueChoice) return;
            const valueIndex = parseInt(valueChoice) - 1;
            if (isNaN(valueIndex) || valueIndex < 0 || valueIndex >= values.length) {
                alert(`❌ Неверный выбор ${attrName}`);
                return;
            }
            attributes.push({ name: attrName, value: values[valueIndex] });
        }
    } else {
        if (mainCategorySlug === 'accessories') {
            const resistance = prompt('🔧 Введите сопротивление (например, 0.8):');
            if (resistance === null) return;
            if (resistance) attributes.push({ name: 'Сопротивление', value: resistance + ' Ом' });
        } else if (mainCategorySlug === 'snus') {
            const strength = prompt('💪 Введите крепость (например, 20):');
            if (strength === null) return;
            if (strength) attributes.push({ name: 'Крепость', value: strength + ' мг' });
        }
    }

    const name = prompt('📝 Введите название товара:');
    if (!name) return;
    const price = prompt('💰 Введите цену (BYN):');
    if (!price) return;
    const emoji = prompt('😊 Выберите эмодзи для товара (по умолчанию 📦):', '📦');
    if (emoji === null) return;
    const stock = prompt('📦 Введите количество на складе (по умолчанию 0):', '0');
    if (stock === null) return;
    const isHit = confirm('🔥 Это хит продаж? (OK - да, Отмена - нет)');
    const isNew = confirm('✨ Это новинка? (OK - да, Отмена - нет)');

    let description = '';
    if (attributes.length > 0) {
        description = attributes.map(a => `${a.name}: ${a.value}`).join(', ');
    }

    const confirmMsg = `
📋 ПРОВЕРЬТЕ ДАННЫЕ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📂 Категория: ${category.icon} ${category.name}
${brandName ? `🏷️ Бренд: ${brandName}` : ''}
📦 Модель: ${modelName}
${description ? `🎨 Характеристики: ${description}` : ''}
📝 Название: ${name}
💰 Цена: ${price} BYN
📦 Остаток: ${stock} шт.
${isHit ? '🔥 Хит' : ''} ${isNew ? '✨ Новинка' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Подтвердить добавление?
    `;
    if (!confirm(confirmMsg)) return;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                price: parseFloat(price) || 0,
                emoji,
                main_category_slug: mainCategorySlug,
                brand_slug: brandSlug,
                product_model_slug: modelSlug,
                stock_quantity: parseInt(stock) || 0,
                in_stock: parseInt(stock) > 0,
                is_hit: isHit,
                is_new: isNew,
                description: description
            })
        });
        
        if (response.ok) {
            await loadAdminProducts();
            await loadProductsFromSupabase();
            showMessage('✅ Товар добавлен!', `"${name}" успешно добавлен в категорию "${category.name}"`);
        } else {
            const error = await response.json();
            console.error('❌ Ошибка добавления:', error);
            showMessage('❌ Ошибка', error.message || 'Не удалось добавить товар');
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error);
        showMessage('❌ Ошибка', 'Ошибка соединения с сервером');
    }
}

// ==========================================
// ===== УПРАВЛЕНИЕ БРЕНДАМИ =====
// ==========================================

async function loadAdminBrands() {
    console.log('🔄 ЗАГРУЗКА БРЕНДОВ...');
    const container = document.getElementById('admin-brands-list');
    if (!container) return;
    
    container.style.display = 'block';
    container.style.visibility = 'visible';
    
    try {
        container.innerHTML = '<div class="loading">⏳ Загрузка брендов...</div>';
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/brands?select=*&order=sort_order.asc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Не удалось загрузить бренды');
        const data = await response.json();
        console.log('📦 Загружено брендов в админке:', data ? data.length : 0);
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="empty-message">Брендов пока нет</div>';
            return;
        }
        
        container.innerHTML = data.map(b => {
            const category = FIXED_CATEGORIES.find(c => c.slug === b.main_category_slug);
            return `
            <div class="admin-brand-card" data-id="${b.id}">
                <div class="admin-brand-info">
                    <div class="admin-brand-name">${b.name || 'Без названия'}</div>
                    <div class="admin-brand-slug">${b.slug || ''}</div>
                    <div class="admin-brand-category">${category ? category.name : b.main_category_slug}</div>
                    <div class="admin-brand-status">${b.active !== false ? '🟢 Активен' : '🔴 Неактивен'}</div>
                </div>
                <div class="admin-brand-actions">
                    <button class="admin-edit-btn" onclick="editBrand(${b.id})">✏️</button>
                    <button class="admin-delete-btn" onclick="deleteBrand(${b.id})">🗑️</button>
                </div>
            </div>
        `}).join('');
    } catch (error) {
        console.error('❌ Ошибка загрузки брендов:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки брендов</div>';
    }
}

async function addNewBrand() {
    const name = prompt('🏷️ Введите название бренда:');
    if (!name) return;
    const slug = prompt('🔑 Введите slug (уникальный идентификатор на латинице, например: "smok"):');
    if (!slug) return;
    
    const categoryOptions = FIXED_CATEGORIES.map((c, i) => `${i+1}. ${c.name} (${c.slug})`).join('\n');
    const categoryChoice = prompt(
        `📂 ВЫБЕРИТЕ КАТЕГОРИЮ ДЛЯ БРЕНДА\n\n` +
        `${categoryOptions}\n\n` +
        `💡 Введите номер:`
    );
    if (!categoryChoice) return;
    const categoryIndex = parseInt(categoryChoice) - 1;
    if (isNaN(categoryIndex) || categoryIndex < 0 || categoryIndex >= FIXED_CATEGORIES.length) {
        alert('❌ Неверный выбор категории');
        return;
    }
    const mainCategorySlug = FIXED_CATEGORIES[categoryIndex].slug;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/brands`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                slug,
                main_category_slug: mainCategorySlug,
                active: true
            })
        });
        
        if (response.ok) {
            await loadAdminBrands();
            await loadBrands();
            renderCatalog();
            showMessage('✅ Бренд добавлен!', `"${name}" успешно добавлен`);
        } else {
            const error = await response.json();
            console.error('❌ Ошибка добавления:', error);
            showMessage('❌ Ошибка', error.message || 'Не удалось добавить бренд');
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error);
        showMessage('❌ Ошибка', 'Ошибка соединения с сервером');
    }
}

async function deleteBrand(brandId) {
    if (!confirm('Удалить этот бренд?')) return;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/brands?id=eq.${brandId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (response.ok) {
            await loadAdminBrands();
            await loadBrands();
            renderCatalog();
            showMessage('✅ Бренд удалён', 'Бренд успешно удалён');
        }
    } catch (error) {
        console.error('❌ Ошибка удаления бренда:', error);
    }
}

// ==========================================
// ===== УПРАВЛЕНИЕ МОДЕЛЯМИ =====
// ==========================================

async function loadAdminModels() {
    console.log('🔄 ЗАГРУЗКА МОДЕЛЕЙ...');
    const container = document.getElementById('admin-models-list');
    if (!container) return;
    
    container.style.display = 'block';
    container.style.visibility = 'visible';
    
    try {
        container.innerHTML = '<div class="loading">⏳ Загрузка моделей...</div>';
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/product_models?select=*&order=sort_order.asc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Не удалось загрузить модели');
        const data = await response.json();
        console.log('📦 Загружено моделей в админке:', data ? data.length : 0);
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="empty-message">Моделей пока нет</div>';
            return;
        }
        
        container.innerHTML = data.map(m => {
            const brand = (brands || []).find(b => b.slug === m.brand_slug);
            const category = FIXED_CATEGORIES.find(c => c.slug === m.main_category_slug);
            return `
            <div class="admin-model-card" data-id="${m.id}">
                <div class="admin-model-info">
                    <div class="admin-model-name">${m.name || 'Без названия'}</div>
                    <div class="admin-model-slug">${m.slug || ''}</div>
                    <div class="admin-model-brand">${brand ? brand.name : m.brand_slug}</div>
                    <div class="admin-model-category">${category ? category.name : m.main_category_slug}</div>
                    <div class="admin-model-status">${m.active !== false ? '🟢 Активна' : '🔴 Неактивна'}</div>
                </div>
                <div class="admin-model-actions">
                    <button class="admin-edit-btn" onclick="editModel(${m.id})">✏️</button>
                    <button class="admin-delete-btn" onclick="deleteModel(${m.id})">🗑️</button>
                </div>
            </div>
        `}).join('');
    } catch (error) {
        console.error('❌ Ошибка загрузки моделей:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки моделей</div>';
    }
}

async function addNewModel() {
    const name = prompt('📦 Введите название модели:');
    if (!name) return;
    const slug = prompt('🔑 Введите slug (уникальный идентификатор на латинице, например: "xros-3"):');
    if (!slug) return;
    
    const brandOptions = (brands || []).map((b, i) => `${i+1}. ${b.name} (${b.slug})`).join('\n');
    if (!brands || brands.length === 0) {
        alert('⚠️ Сначала добавьте бренд через админку → Бренды.');
        return;
    }
    const brandChoice = prompt(
        `🏷️ ВЫБЕРИТЕ БРЕНД ДЛЯ МОДЕЛИ\n\n` +
        `${brandOptions}\n\n` +
        `💡 Введите номер:`
    );
    if (!brandChoice) return;
    const brandIndex = parseInt(brandChoice) - 1;
    if (isNaN(brandIndex) || brandIndex < 0 || brandIndex >= brands.length) {
        alert('❌ Неверный выбор бренда');
        return;
    }
    const brandSlug = brands[brandIndex].slug;
    const categorySlug = brands[brandIndex].main_category_slug;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/product_models`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                slug,
                brand_slug: brandSlug,
                main_category_slug: categorySlug,
                active: true
            })
        });
        
        if (response.ok) {
            await loadAdminModels();
            await loadProductModels();
            renderCatalog();
            showMessage(`✅ Модель добавлена!\n\n📦 Название: ${name}\n🔑 Slug: ${slug}\n🏷️ Бренд: ${brands[brandIndex].name}\n📂 Категория: ${categorySlug}\n\n💡 Используйте этот SLUG для добавления атрибутов: ${slug}`);
        } else {
            const error = await response.json();
            console.error('❌ Ошибка добавления:', error);
            showMessage('❌ Ошибка', error.message || 'Не удалось добавить модель');
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error);
        showMessage('❌ Ошибка', 'Ошибка соединения с сервером');
    }
}

async function deleteModel(modelId) {
    if (!confirm('Удалить эту модель?')) return;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/product_models?id=eq.${modelId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (response.ok) {
            await loadAdminModels();
            await loadProductModels();
            renderCatalog();
            showMessage('✅ Модель удалена', 'Модель успешно удалена');
        }
    } catch (error) {
        console.error('❌ Ошибка удаления модели:', error);
    }
}

// ==========================================
// ===== АТРИБУТЫ (АДМИНКА) =====
// ==========================================

async function loadAdminAttributes() {
    console.log('🔄 ЗАГРУЗКА АТРИБУТОВ...');
    
    const page = document.getElementById('page-admin-attributes');
    if (page) {
        page.style.display = 'block';
        page.style.visibility = 'visible';
        page.style.opacity = '1';
        page.style.height = 'auto';
        page.style.overflow = 'visible';
        page.classList.add('active');
        console.log('✅ Страница атрибутов показана принудительно');
    }
    
    const container = document.getElementById('admin-attributes-list');
    if (!container) {
        console.error('❌ Контейнер admin-attributes-list не найден');
        return;
    }
    
    container.style.display = 'block';
    container.style.visibility = 'visible';
    
    try {
        container.innerHTML = '<div class="loading">⏳ Загрузка атрибутов...</div>';
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/product_attributes?select=*&order=sort_order.asc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        console.log('📦 Загружено атрибутов:', data ? data.length : 0);
        console.log('📦 Данные атрибутов:', data);
        
        productAttributes = data || [];
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="empty-message">Атрибутов пока нет</div>';
            return;
        }
        
        let html = '';
        data.forEach(attr => {
            html += `
            <div class="admin-attribute-card" data-id="${attr.id}">
                <span class="admin-attribute-icon">🏷️</span>
                <div class="admin-attribute-info">
                    <div class="admin-attribute-name">${attr.attribute_name || 'Без названия'}</div>
                    <div class="admin-attribute-value">${attr.attribute_value || 'Без значения'}</div>
                    <div class="admin-attribute-model">Модель: ${attr.product_model_slug || 'Не указана'}</div>
                    <div class="admin-attribute-status ${attr.active !== false ? 'active' : 'inactive'}">
                        ${attr.active !== false ? '✅ Активен' : '❌ Неактивен'}
                    </div>
                </div>
                <div class="admin-attribute-actions">
                    <button class="admin-edit-btn" onclick="editAttribute(${attr.id})">✏️</button>
                    <button class="admin-delete-btn" onclick="deleteAttribute(${attr.id})">🗑️</button>
                </div>
            </div>
            `;
        });
        
        container.innerHTML = html;
        console.log('✅ Атрибуты отображены, количество карточек:', container.children.length);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки атрибутов:', error);
        container.innerHTML = `<div class="error-message">❌ Ошибка загрузки: ${error.message}</div>`;
    }
}

async function addNewAttribute() {
    let modelList = '';
    if (productModels && productModels.length > 0) {
        modelList = productModels.map(m => `  📦 ${m.name} → slug: "${m.slug}"`).join('\n');
    } else {
        modelList = '  ⚠️ Нет моделей. Сначала добавьте модели через админку → Модели.';
    }
    
    const attrName = prompt(
        `🏷️ Введите название атрибута\n\n` +
        `Примеры: "Цвет", "Сопротивление", "Вкус", "Крепость"\n\n` +
        `📝 Название:`
    );
    if (!attrName) return;
    
    const attrValue = prompt(
        `🎨 Введите значение атрибута\n\n` +
        `Примеры: "Чёрный", "0.8 Ом", "Клубника", "20 мг"\n\n` +
        `📝 Значение:`
    );
    if (!attrValue) return;
    
    const modelSlug = prompt(
        `📦 Введите slug МОДЕЛИ\n\n` +
        `Доступные модели:\n${modelList}\n\n` +
        `💡 Скопируйте slug из списка выше (например: "xros-3")\n\n` +
        `🔑 Slug модели:`
    );
    if (!modelSlug) return;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/product_attributes`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                attribute_name: attrName,
                attribute_value: attrValue,
                product_model_slug: modelSlug,
                active: true
            })
        });
        
        if (response.ok) {
            await loadAdminAttributes();
            await loadProductAttributes();
            showMessage('✅ Атрибут добавлен!', `"${attrName}: ${attrValue}" добавлен для модели "${modelSlug}"`);
        } else {
            const error = await response.json();
            console.error('❌ Ошибка добавления:', error);
            showMessage('❌ Ошибка', error.message || 'Не удалось добавить атрибут. Проверьте правильность slug модели.');
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error);
        showMessage('❌ Ошибка', 'Ошибка соединения с сервером');
    }
}

async function deleteAttribute(attributeId) {
    if (!confirm('Удалить этот атрибут?')) return;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/product_attributes?id=eq.${attributeId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (response.ok) {
            await loadAdminAttributes();
            await loadProductAttributes();
            showMessage('✅ Атрибут удалён', 'Атрибут успешно удалён');
        }
    } catch (error) {
        console.error('❌ Ошибка удаления атрибута:', error);
    }
}

// ==========================================
// ===== АКЦИИ (АДМИНКА) =====
// ==========================================
// ... (все функции для акций остаются без изменений)

// ==========================================
// ===== ИНИЦИАЛИЗАЦИЯ =====
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ...');
        
        const pages = document.querySelectorAll('.page');
        if (pages.length === 0) {
            console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Страницы не найдены!');
            return;
        }
        
        cart = JSON.parse(localStorage.getItem('puff_cart') || '[]');
        updateCartUI();
        updateBadge();
        
        try {
            isAdmin = await checkAdmin();
            console.log('👑 isAdmin:', isAdmin);
        } catch (adminError) {
            console.error('❌ Ошибка проверки админа:', adminError);
            isAdmin = false;
        }
        
        const adminNavBtn = document.getElementById('nav-admin');
        if (adminNavBtn && isAdmin) {
            adminNavBtn.style.display = 'flex';
        }
        
        try {
            await loadSettings();
            await loadMainCategories();
            await loadBrands();
            await loadProductModels();
            await loadProductAttributes();
            await loadPickupPoints();
            await loadPromotionsFromSupabase();
            await loadPrizes();
            await loadPromocodes();
            await loadProductsFromSupabase();
        } catch (loadError) {
            console.error('❌ Ошибка загрузки данных:', loadError);
            showMessage('⚠️ Внимание', 'Некоторые данные не загрузились.');
        }
        
        setupSortFilters();
        setupSearch();
        setupOrderFilters();
        initNotificationSound();
        
        if (isAdmin) {
            setInterval(checkNewOrders, 15000);
            setTimeout(checkNewOrders, 3000);
        }
        
        const deliveryType = document.getElementById('order-delivery-type');
        const addressGroup = document.getElementById('delivery-address-group');
        const pickupGroup = document.getElementById('pickup-point-group');
        
        if (deliveryType) {
            deliveryType.addEventListener('change', function() {
                if (this.value === 'delivery') {
                    if (addressGroup) addressGroup.style.display = 'block';
                    if (pickupGroup) pickupGroup.style.display = 'none';
                } else if (this.value === 'pickup') {
                    if (addressGroup) addressGroup.style.display = 'none';
                    if (pickupGroup) pickupGroup.style.display = 'block';
                } else {
                    if (addressGroup) addressGroup.style.display = 'none';
                    if (pickupGroup) pickupGroup.style.display = 'none';
                }
                updateCartUI();
            });
            if (pickupGroup) {
                const pickupSelect = document.getElementById('order-pickup-point');
                if (pickupSelect) {
                    pickupSelect.innerHTML = '<option value="">-- Выберите точку --</option>';
                    (pickupPoints || []).forEach(p => {
                        pickupSelect.innerHTML += `<option value="${p.id}">${p.name} — ${p.address}</option>`;
                    });
                }
            }
        }
        
        document.getElementById('promocode-apply-btn')?.addEventListener('click', applyPromocode);
        document.getElementById('promocode-input')?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                applyPromocode();
            }
        });
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                if (page) {
                    navigateTo(page);
                }
            });
        });
        
        document.querySelectorAll('.admin-menu-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                if (page) {
                    navigateTo(page);
                }
            });
        });
        
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', checkout);
        }
        
        if (isAdmin) {
            document.getElementById('admin-add-category-btn')?.addEventListener('click', addNewCategory);
            document.getElementById('admin-add-product-btn')?.addEventListener('click', addNewProduct);
            document.getElementById('admin-add-brand-btn')?.addEventListener('click', addNewBrand);
            document.getElementById('admin-add-model-btn')?.addEventListener('click', addNewModel);
            document.getElementById('admin-add-attribute-btn')?.addEventListener('click', addNewAttribute);
            document.getElementById('admin-add-promotion-btn')?.addEventListener('click', addNewPromotion);
            document.getElementById('admin-add-btn')?.addEventListener('click', addAdmin);
            document.getElementById('admin-add-pickup-point-btn')?.addEventListener('click', addNewPickupPoint);
            document.getElementById('admin-export-orders-btn')?.addEventListener('click', exportOrdersCSV);
            document.getElementById('admin-import-btn')?.addEventListener('click', importProducts);
        }
        
        updateCartUI();
        updateBadge();
        
        console.log('✅ ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА');
    } catch (error) {
        console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ИНИЦИАЛИЗАЦИИ:', error);
        try {
            showMessage('❌ Ошибка', 'Произошла ошибка при загрузке приложения. Попробуйте перезапустить.');
        } catch (e) {
            alert('Ошибка загрузки приложения. Попробуйте перезапустить.');
        }
    }
});

tg.onEvent('mainButtonClicked', checkout);