// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// ===== ДИАГНОСТИКА =====
console.log('🔍 ДИАГНОСТИКА:');
console.log('📱 initData:', window.Telegram.WebApp.initData);
console.log('👤 initDataUnsafe:', window.Telegram.WebApp.initDataUnsafe);
console.log('📱 platform:', window.Telegram.WebApp.platform);
console.log('📱 version:', window.Telegram.WebApp.version);

// ===== ПОДКЛЮЧЕНИЕ К SUPABASE =====
const SUPABASE_URL = 'https://prtwcgqidlivkaanbowl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XxBLBacZddir7xEUUYsjdA_RdH1NnZz';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydHdjZ3FpZGxpdmthYW5ib3dsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc3MzcwNiwiZXhwIjoyMTAyMzQ5NzA2fQ.dvZAnH78ThbtWUTcn9mwveBXhV4RtyefUeFit4mHEUI';

// Используем SERVICE_ROLE для всех запросов (как ты просил)
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE;

// ===== ФИКСИРОВАННЫЕ КАТЕГОРИИ =====
const FIXED_CATEGORIES = [
    { slug: 'pod', name: 'Pod-системы', icon: '💨' },
    { slug: 'liquid', name: 'Жижи', icon: '🧪' },
    { slug: 'accessories', name: 'Комплектующие', icon: '🔧' },
    { slug: 'disposable', name: 'Одноразовые pod', icon: '⚡' },
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
let currentCategorySlug = 'all';
let currentBrandSlug = 'all';
let currentModelSlug = 'all';
let currentAttributeValue = 'all';
let currentSort = 'default';
let adminFilterCategory = 'all';
let adminFilterStock = 'all';
let selectedAttributes = {};

// ===== РЕЖИМ РАЗРАБОТКИ =====
const isDevelopment = !window.Telegram.WebApp.initDataUnsafe?.user;

if (isDevelopment) {
    console.log('⚠️ Режим разработки: показываем админку для тестирования');
}

// ===== ПРОВЕРКА АДМИНА =====
async function checkAdmin() {
    try {
        const user = tg.initDataUnsafe.user;
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
            console.error(`❌ Server error: ${response.status}`);
            return false;
        }

        const data = await response.json();
        console.log('📊 Ответ от Supabase:', data);
        
        return data.length > 0;
    } catch (error) {
        console.error('❌ Error checking admin:', error);
        return false;
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
        
        if (!response.ok) throw new Error('Failed to fetch brands');
        const data = await response.json();
        brands = data;
        console.log('✅ Загружено брендов:', brands.length);
        return brands;
    } catch (error) {
        console.error('❌ Error loading brands:', error);
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
        
        if (!response.ok) throw new Error('Failed to fetch product models');
        const data = await response.json();
        productModels = data;
        console.log('✅ Загружено моделей:', productModels.length);
        return productModels;
    } catch (error) {
        console.error('❌ Error loading product models:', error);
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
        
        if (!response.ok) throw new Error('Failed to fetch product attributes');
        const data = await response.json();
        productAttributes = data;
        console.log('✅ Загружено атрибутов:', productAttributes.length);
        return productAttributes;
    } catch (error) {
        console.error('❌ Error loading product attributes:', error);
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
        console.log('📦 Загружено товаров:', data.length);
        
        products = data.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
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
        renderCatalog();
        
        return products;
    } catch (error) {
        console.error('❌ Error loading products:', error);
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
        
        if (!response.ok) throw new Error('Failed to fetch promotions');
        const data = await response.json();
        promotions = data;
        console.log('✅ Загружено акций:', promotions.length);
        renderPromotions();
        return promotions;
    } catch (error) {
        console.error('❌ Error loading promotions:', error);
        return [];
    }
}

// ==========================================
// ===== ОТОБРАЖЕНИЕ =====
// ==========================================

function renderPromotions() {
    const container = document.getElementById('promotions-container');
    if (!container) return;
    
    if (promotions.length === 0) {
        container.innerHTML = '<div class="empty-message">Нет активных акций</div>';
        return;
    }
    
    container.innerHTML = promotions.map(p => `
        <div class="promotion-card">
            <span class="promotion-emoji">${p.image_emoji || '🎉'}</span>
            <div class="promotion-info">
                <strong>${p.title}</strong>
                <p>${p.description || ''}</p>
            </div>
        </div>
    `).join('');
}

function renderHits() {
    const grid = document.getElementById('hits-grid');
    if (!grid) return;
    
    const hits = products.filter(p => p.isHit && p.inStock);
    
    if (hits.length === 0) {
        grid.innerHTML = '<div class="empty-message">Хитов пока нет</div>';
        return;
    }
    
    grid.innerHTML = hits.slice(0, 4).map(p => createProductCard(p)).join('');
    addBuyButtons(grid);
}

function renderNewItems() {
    const grid = document.getElementById('new-grid');
    if (!grid) return;
    
    const newItems = products.filter(p => p.isNew && p.inStock);
    
    if (newItems.length === 0) {
        grid.innerHTML = '<div class="empty-message">Новинок пока нет</div>';
        return;
    }
    
    grid.innerHTML = newItems.slice(0, 4).map(p => createProductCard(p)).join('');
    addBuyButtons(grid);
}

// ===== ОСНОВНАЯ ЛОГИКА КАТАЛОГА =====
function renderCatalog() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;
    
    if (currentCategorySlug === 'all') {
        renderMainCategories(grid);
    } else if (currentBrandSlug === 'all') {
        renderBrands(grid);
    } else if (currentModelSlug === 'all') {
        renderModels(grid);
    } else if (currentAttributeValue === 'all') {
        renderAttributes(grid);
    } else {
        renderProducts(grid);
    }
}

function renderMainCategories(grid) {
    grid.innerHTML = FIXED_CATEGORIES.map(cat => `
        <div class="category-card" onclick="selectMainCategory('${cat.slug}')">
            <span class="category-icon">${cat.icon || '📂'}</span>
            <span class="category-name">${cat.name}</span>
            <span class="category-arrow">→</span>
        </div>
    `).join('');
}

function renderBrands(grid) {
    const categoryBrands = brands.filter(b => b.main_category_slug === currentCategorySlug);
    
    if (categoryBrands.length === 0) {
        grid.innerHTML = `
            <div class="category-back" onclick="resetCatalog()">← Назад к категориям</div>
            <div class="empty-message">Производители не найдены</div>
        `;
        return;
    }
    
    grid.innerHTML = `
        <div class="category-back" onclick="resetCatalog()">← Назад к категориям</div>
        ${categoryBrands.map(b => `
            <div class="category-card" onclick="selectBrand('${b.slug}')">
                <span class="category-icon">🏷️</span>
                <span class="category-name">${b.name}</span>
                <span class="category-arrow">→</span>
            </div>
        `).join('')}
    `;
}

function renderModels(grid) {
    const brandModels = productModels.filter(m => m.brand_slug === currentBrandSlug);
    
    if (brandModels.length === 0) {
        grid.innerHTML = `
            <div class="category-back" onclick="selectBrand('all')">← Назад к брендам</div>
            <div class="empty-message">Модели не найдены</div>
        `;
        return;
    }
    
    grid.innerHTML = `
        <div class="category-back" onclick="selectBrand('all')">← Назад к брендам</div>
        ${brandModels.map(m => `
            <div class="category-card" onclick="selectModel('${m.slug}')">
                <span class="category-icon">📦</span>
                <span class="category-name">${m.name}</span>
                <span class="category-arrow">→</span>
            </div>
        `).join('')}
    `;
}

function renderAttributes(grid) {
    const modelAttributes = productAttributes.filter(a => a.product_model_slug === currentModelSlug);
    
    if (modelAttributes.length === 0) {
        currentAttributeValue = 'all';
        renderProducts(grid);
        return;
    }
    
    const attrGroups = {};
    modelAttributes.forEach(a => {
        if (!attrGroups[a.attribute_name]) {
            attrGroups[a.attribute_name] = [];
        }
        attrGroups[a.attribute_name].push(a.attribute_value);
    });
    
    let html = `<div class="category-back" onclick="selectModel('all')">← Назад к моделям</div>`;
    
    Object.keys(attrGroups).forEach(attrName => {
        html += `<div class="filter-section"><div class="filter-label">${attrName}</div><div class="filter-options">`;
        html += `<button class="filter-btn active" onclick="selectAttributeValue('all')">Все</button>`;
        attrGroups[attrName].forEach(value => {
            html += `<button class="filter-btn" onclick="selectAttributeValue('${value}')">${value}</button>`;
        });
        html += `</div></div>`;
    });
    
    grid.innerHTML = html;
}

function renderProducts(grid) {
    let filtered = products.filter(p => p.inStock);
    
    if (currentCategorySlug !== 'all') {
        filtered = filtered.filter(p => p.mainCategorySlug === currentCategorySlug);
    }
    
    if (currentBrandSlug !== 'all') {
        filtered = filtered.filter(p => p.brandSlug === currentBrandSlug);
    }
    
    if (currentModelSlug !== 'all') {
        filtered = filtered.filter(p => p.modelSlug === currentModelSlug);
    }
    
    if (currentAttributeValue !== 'all') {
        filtered = filtered.filter(p => {
            const productAttrs = productAttributes.filter(a => a.product_model_slug === p.modelSlug);
            return productAttrs.some(a => a.attribute_value === currentAttributeValue);
        });
    }
    
    switch (currentSort) {
        case 'price-asc':
            filtered.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            filtered.sort((a, b) => b.price - a.price);
            break;
        case 'name':
            filtered.sort((a, b) => a.name.localeCompare(b.name));
            break;
        default:
            filtered.sort((a, b) => a.id - b.id);
    }
    
    const countEl = document.getElementById('catalog-count');
    if (countEl) {
        countEl.textContent = `${filtered.length} товаров`;
    }
    
    if (filtered.length === 0) {
        let backHtml = '';
        if (currentAttributeValue !== 'all') {
            backHtml = `<div class="category-back" onclick="selectAttributeValue('all')">← Назад к характеристикам</div>`;
        } else if (currentModelSlug !== 'all') {
            backHtml = `<div class="category-back" onclick="selectModel('all')">← Назад к моделям</div>`;
        } else if (currentBrandSlug !== 'all') {
            backHtml = `<div class="category-back" onclick="selectBrand('all')">← Назад к брендам</div>`;
        } else {
            backHtml = `<div class="category-back" onclick="resetCatalog()">← Назад к категориям</div>`;
        }
        
        grid.innerHTML = `${backHtml}<div class="empty-message">Товары не найдены</div>`;
        return;
    }
    
    let backHtml = '';
    if (currentAttributeValue !== 'all') {
        backHtml = `<div class="category-back" onclick="selectAttributeValue('all')">← Назад к характеристикам</div>`;
    } else if (currentModelSlug !== 'all') {
        backHtml = `<div class="category-back" onclick="selectModel('all')">← Назад к моделям</div>`;
    } else if (currentBrandSlug !== 'all') {
        backHtml = `<div class="category-back" onclick="selectBrand('all')">← Назад к брендам</div>`;
    } else {
        backHtml = `<div class="category-back" onclick="resetCatalog()">← Назад к категориям</div>`;
    }
    
    grid.innerHTML = `${backHtml}${filtered.map(p => createProductCard(p)).join('')}`;
    addBuyButtons(grid);
}

// ===== ФУНКЦИИ НАВИГАЦИИ ПО КАТАЛОГУ =====
window.selectMainCategory = function(slug) {
    currentCategorySlug = slug;
    currentBrandSlug = 'all';
    currentModelSlug = 'all';
    currentAttributeValue = 'all';
    renderCatalog();
};

window.selectBrand = function(slug) {
    currentBrandSlug = slug;
    currentModelSlug = 'all';
    currentAttributeValue = 'all';
    renderCatalog();
};

window.selectModel = function(slug) {
    currentModelSlug = slug;
    currentAttributeValue = 'all';
    renderCatalog();
};

window.selectAttributeValue = function(value) {
    currentAttributeValue = value;
    renderCatalog();
};

window.resetCatalog = function() {
    currentCategorySlug = 'all';
    currentBrandSlug = 'all';
    currentModelSlug = 'all';
    currentAttributeValue = 'all';
    renderCatalog();
};

function createProductCard(product) {
    const discountBadge = product.discountPrice ? 
        `<span class="discount-badge">-${Math.round((1 - product.discountPrice / product.price) * 100)}%</span>` : '';
    const hitBadge = product.isHit ? `<span class="hit-badge">🔥 Хит</span>` : '';
    const newBadge = product.isNew ? `<span class="new-badge">✨ Новинка</span>` : '';
    const stockBadge = product.stockQuantity <= 5 && product.stockQuantity > 0 ? 
        `<span class="stock-badge">⚠️ Осталось ${product.stockQuantity}</span>` : '';
    
    const priceDisplay = product.discountPrice ? 
        `<span class="old-price">${product.price} BYN</span> <span class="price">${product.discountPrice} BYN</span>` :
        `<span class="price">${product.price} BYN</span>`;
    
    return `
        <div class="product-card" data-id="${product.id}">
            <div class="product-badges">
                ${hitBadge}
                ${newBadge}
                ${discountBadge}
                ${stockBadge}
            </div>
            <span class="emoji">${product.emoji}</span>
            <h3>${product.name}</h3>
            <div class="price-row">${priceDisplay}</div>
            <button class="buy-btn" data-id="${product.id}">🔥 Купить</button>
        </div>
    `;
}

function addBuyButtons(grid) {
    grid.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            addToCart(id);
        });
    });
}

function setupSortFilters() {
    document.querySelectorAll('#sort-filters .filter-btn').forEach(btn => {
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
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (product.stockQuantity <= 0) {
        tg.showPopup({
            title: '❌ Нет в наличии',
            message: 'Товар закончился на складе',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    cart.push({ ...product });
    updateCartUI();
    updateBadge();
    
    const card = document.querySelector(`.product-card[data-id="${productId}"]`);
    if (card) {
        card.classList.add('added');
        setTimeout(() => card.classList.remove('added'), 300);
    }
    
    tg.showPopup({
        title: '✅ Добавлено!',
        message: `${product.emoji} ${product.name} — ${product.discountPrice || product.price} BYN`,
        buttons: [{ type: 'ok' }]
    });
}

function updateCartUI() {
    const cartItems = document.getElementById('cart-items');
    const totalPrice = document.getElementById('total-price');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    if (!cartItems) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<li class="cart-empty">Корзина пуста</li>';
        if (totalPrice) totalPrice.textContent = '0 BYN';
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
    }
    
    let html = '';
    let total = 0;
    
    cart.forEach(item => {
        const price = item.discountPrice || item.price;
        html += `
            <li>
                <span class="item-name">${item.emoji} ${item.name}</span>
                <span class="item-price">${price} BYN</span>
            </li>
        `;
        total += price;
    });
    
    cartItems.innerHTML = html;
    if (totalPrice) totalPrice.textContent = `${total} BYN`;
    if (checkoutBtn) checkoutBtn.disabled = false;
}

function updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
        const count = cart.length;
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }
}

// ===== НАВИГАЦИЯ =====
function navigateTo(pageId) {
    console.log('🔄 ПЕРЕХОД НА СТРАНИЦУ:', pageId);
    
    // Скрываем все страницы
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
        if (p.id.startsWith('page-admin')) {
            p.style.display = 'none';
            p.style.visibility = 'hidden';
            p.style.opacity = '0';
            p.style.height = '0';
            p.style.overflow = 'hidden';
            p.style.padding = '0';
            p.style.margin = '0';
        }
    });
    
    // Показываем нужную страницу
    const target = document.getElementById(pageId);
    if (!target) {
        console.error('❌ СТРАНИЦА НЕ НАЙДЕНА:', pageId);
        return;
    }
    
    target.classList.add('active');
    if (pageId.startsWith('page-admin')) {
        target.style.display = 'block';
        target.style.visibility = 'visible';
        target.style.opacity = '1';
        target.style.height = 'auto';
        target.style.overflow = 'visible';
        target.style.padding = '';
        target.style.margin = '';
    }
    
    console.log('✅ СТРАНИЦА ПОКАЗАНА:', pageId);
    
    // Обновляем кнопки
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageId);
    });
    
    currentPage = pageId;
    
    // Загружаем данные для админ-страниц
    if (pageId.startsWith('page-admin')) {
        console.log('🔄 ЗАГРУЗКА ДАННЫХ ДЛЯ:', pageId);
        
        setTimeout(() => {
            // Показываем контейнеры
            const containerMap = {
                'page-admin-attributes': 'admin-attributes-list',
                'page-admin-promotions': 'admin-promotions-list',
                'page-admin-moderators': 'admin-moderators-list',
                'page-admin-orders': 'admin-orders-list',
                'page-admin-products': 'admin-products-list',
                'page-admin-brands': 'admin-brands-list',
                'page-admin-models': 'admin-models-list',
                'page-admin-categories': 'admin-categories-list'
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
            
            // Загружаем данные
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
            }
        }, 300);
    }
}

// ===== ОФОРМЛЕНИЕ ЗАКАЗА =====
function checkout() {
    if (cart.length === 0) return;
    
    const total = cart.reduce((sum, item) => sum + (item.discountPrice || item.price), 0);
    const items = cart.map(item => ({ 
        name: item.name, 
        price: item.discountPrice || item.price 
    }));
    
    tg.sendData(JSON.stringify({
        action: 'order',
        items: items,
        total: total,
        currency: 'BYN'
    }));
    
    cart = [];
    updateCartUI();
    updateBadge();
    tg.close();
}

// ==========================================
// ===== АДМИН-ПАНЕЛЬ =====
// ==========================================

// --- Заказы ---
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
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch orders');
        const orders = await response.json();
        console.log('📦 Загружено заказов:', orders.length);
        
        if (orders.length === 0) {
            container.innerHTML = '<div class="empty-message">Заказов пока нет</div>';
            return;
        }
        
        container.innerHTML = orders.map(order => `
            <div class="admin-order-card">
                <div class="order-header">
                    <strong>Заказ #${order.id}</strong>
                    <span class="order-status ${order.status}">${order.status}</span>
                </div>
                <div class="order-details">
                    <p>👤 ${order.username || 'Не указан'}</p>
                    <p>💰 ${order.total} BYN</p>
                    <p>📅 ${new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div class="order-actions">
                    <button class="order-status-btn" data-id="${order.id}" data-status="pending">🔄 В обработке</button>
                    <button class="order-status-btn" data-id="${order.id}" data-status="completed">✅ Выполнен</button>
                    <button class="order-status-btn" data-id="${order.id}" data-status="shipped">🚚 Отправлен</button>
                </div>
            </div>
        `).join('');
        
        container.querySelectorAll('.order-status-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                const status = btn.dataset.status;
                await updateOrderStatus(id, status);
                await loadAdminOrders();
            });
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки заказов</div>';
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            tg.showPopup({
                title: '✅ Статус обновлён',
                message: `Заказ #${orderId} теперь ${status}`,
                buttons: [{ type: 'ok' }]
            });
        }
    } catch (error) {
        console.error('Error updating order status:', error);
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
        
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        console.log('📦 Загружено товаров в админке:', data.length);
        
        if (data.length === 0) {
            container.innerHTML = '<div class="empty-message">Товаров не найдено</div>';
            return;
        }
        
        container.innerHTML = data.map(p => {
            const category = FIXED_CATEGORIES.find(c => c.slug === p.main_category_slug);
            const brand = brands.find(b => b.slug === p.brand_slug);
            const model = productModels.find(m => m.slug === p.product_model_slug);
            
            return `
            <div class="admin-product-card" data-id="${p.id}">
                <span class="admin-product-emoji">${p.emoji || '📦'}</span>
                <div class="admin-product-info">
                    <div class="admin-product-name">${p.name}</div>
                    <div class="admin-product-price">${p.price} BYN</div>
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
                if (confirm('Удалить товар?')) {
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
        console.error('Error loading products:', error);
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
        console.error('Error toggling stock:', error);
        tg.showPopup({
            title: '❌ Ошибка',
            message: 'Не удалось обновить статус',
            buttons: [{ type: 'ok' }]
        });
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
        }
    } catch (error) {
        console.error('Error deleting product:', error);
    }
}

function showEditProductForm(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const name = prompt('Название товара:', product.name);
    if (name === null) return;
    const price = prompt('Цена (BYN):', product.price);
    if (price === null) return;
    const emoji = prompt('Эмодзи:', product.emoji);
    if (emoji === null) return;
    const stock = prompt('Количество на складе:', product.stockQuantity || 0);
    if (stock === null) return;
    const isHit = confirm('Это хит продаж? (OK - да, Отмена - нет)');
    const isNew = confirm('Это новинка? (OK - да, Отмена - нет)');
    
    updateProduct(productId, { 
        name, 
        price: parseFloat(price), 
        emoji, 
        stock_quantity: parseInt(stock),
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
        }
    } catch (error) {
        console.error('Error updating product:', error);
    }
}

// ===== ОБНОВЛЁННАЯ ФУНКЦИЯ ДОБАВЛЕНИЯ ТОВАРА =====
async function addNewProduct() {
    const categoryOptions = FIXED_CATEGORIES.map((c, i) => `${i+1}. ${c.icon} ${c.name}`).join('\n');
    const categoryChoice = prompt(`📂 Выберите категорию товара:\n\n${categoryOptions}\n\nВведите номер:`);
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
        const categoryBrands = brands.filter(b => b.main_category_slug === mainCategorySlug);
        if (categoryBrands.length === 0) {
            alert(`❌ Нет брендов для категории "${category.name}". Сначала добавьте бренд через админку → Бренды.`);
            return;
        }
        const brandOptions = categoryBrands.map((b, i) => `${i+1}. ${b.name}`).join('\n');
        const brandChoice = prompt(`🏷️ Выберите бренд для "${category.name}":\n\n${brandOptions}\n\nВведите номер:`);
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
        const accessoriesModels = productModels.filter(m => m.main_category_slug === 'accessories');
        if (accessoriesModels.length === 0) {
            alert('❌ Нет комплектующих. Сначала добавьте комплектующие через админку → Модели.');
            return;
        }
        modelOptions = accessoriesModels.map((m, i) => `${i+1}. ${m.name}`).join('\n');
        const modelChoice = prompt(`🔧 Выберите комплектующее:\n\n${modelOptions}\n\nВведите номер:`);
        if (!modelChoice) return;
        const modelIndex = parseInt(modelChoice) - 1;
        if (isNaN(modelIndex) || modelIndex < 0 || modelIndex >= accessoriesModels.length) {
            alert('❌ Неверный выбор');
            return;
        }
        modelSlug = accessoriesModels[modelIndex].slug;
        modelName = accessoriesModels[modelIndex].name;
    } else if (mainCategorySlug === 'disposable') {
        const disposableModels = productModels.filter(m => m.main_category_slug === 'disposable');
        if (disposableModels.length === 0) {
            alert('❌ Нет одноразовых pod. Сначала добавьте через админку → Модели.');
            return;
        }
        modelOptions = disposableModels.map((m, i) => `${i+1}. ${m.name}`).join('\n');
        const modelChoice = prompt(`⚡ Выберите одноразовый pod:\n\n${modelOptions}\n\nВведите номер:`);
        if (!modelChoice) return;
        const modelIndex = parseInt(modelChoice) - 1;
        if (isNaN(modelIndex) || modelIndex < 0 || modelIndex >= disposableModels.length) {
            alert('❌ Неверный выбор');
            return;
        }
        modelSlug = disposableModels[modelIndex].slug;
        modelName = disposableModels[modelIndex].name;
    } else {
        const brandModels = productModels.filter(m => m.brand_slug === brandSlug);
        if (brandModels.length === 0) {
            alert(`❌ Нет моделей для бренда "${brandName}". Сначала добавьте модели через админку → Модели.`);
            return;
        }
        modelOptions = brandModels.map((m, i) => `${i+1}. ${m.name}`).join('\n');
        const modelChoice = prompt(`📦 Выберите модель для "${brandName}":\n\n${modelOptions}\n\nВведите номер:`);
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
    const modelAttributes = productAttributes.filter(a => a.product_model_slug === modelSlug);
    
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
            const valueChoice = prompt(`🎨 Выберите ${attrName}:\n\n${valueOptions}\n\nВведите номер:`);
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
            const resistance = prompt('🔧 Сопротивление (например, 0.8 Ом):');
            if (resistance === null) return;
            if (resistance) attributes.push({ name: 'Сопротивление', value: resistance });
        } else if (mainCategorySlug === 'snus') {
            const strength = prompt('💪 Крепость (например, 20мг):');
            if (strength === null) return;
            if (strength) attributes.push({ name: 'Крепость', value: strength });
        }
    }

    const name = prompt('📝 Название товара:');
    if (!name) return;
    const price = prompt('💰 Цена (BYN):');
    if (!price) return;
    const emoji = prompt('😊 Эмодзи (например, 💨):', '📦');
    if (emoji === null) return;
    const stock = prompt('📦 Количество на складе:', '0');
    if (stock === null) return;
    const isHit = confirm('🔥 Это хит продаж? (OK - да, Отмена - нет)');
    const isNew = confirm('✨ Это новинка? (OK - да, Отмена - нет)');

    let description = '';
    if (attributes.length > 0) {
        description = attributes.map(a => `${a.name}: ${a.value}`).join(', ');
    }

    const confirmMsg = `
📋 Проверьте данные:
Категория: ${category.icon} ${category.name}
${brandName ? `Бренд: ${brandName}` : ''}
Модель: ${modelName}
${description ? `Характеристики: ${description}` : ''}
Название: ${name}
Цена: ${price} BYN
Остаток: ${stock} шт.
${isHit ? '🔥 Хит' : ''} ${isNew ? '✨ Новинка' : ''}

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
                price: parseFloat(price),
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
            tg.showPopup({
                title: '✅ Товар добавлен!',
                message: `"${name}" успешно добавлен в категорию "${category.name}"`,
                buttons: [{ type: 'ok' }]
            });
        } else {
            const error = await response.json();
            console.error('❌ Ошибка добавления:', error);
            tg.showPopup({
                title: '❌ Ошибка',
                message: error.message || 'Не удалось добавить товар',
                buttons: [{ type: 'ok' }]
            });
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error);
        tg.showPopup({
            title: '❌ Ошибка',
            message: 'Ошибка соединения с сервером',
            buttons: [{ type: 'ok' }]
        });
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
        
        if (!response.ok) throw new Error('Failed to fetch brands');
        const data = await response.json();
        console.log('📦 Загружено брендов в админке:', data.length);
        
        if (data.length === 0) {
            container.innerHTML = '<div class="empty-message">Брендов пока нет</div>';
            return;
        }
        
        container.innerHTML = data.map(b => {
            const category = FIXED_CATEGORIES.find(c => c.slug === b.main_category_slug);
            return `
            <div class="admin-brand-card" data-id="${b.id}">
                <div class="admin-brand-info">
                    <div class="admin-brand-name">${b.name}</div>
                    <div class="admin-brand-slug">${b.slug}</div>
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
        console.error('Error loading brands:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки брендов</div>';
    }
}

async function addNewBrand() {
    const name = prompt('Название бренда:');
    if (!name) return;
    const slug = prompt('Slug (уникальный идентификатор, латиница):');
    if (!slug) return;
    
    const categoryOptions = FIXED_CATEGORIES.map((c, i) => `${i+1}. ${c.name} (${c.slug})`).join('\n');
    const categoryChoice = prompt(`Выберите категорию:\n${categoryOptions}`);
    if (!categoryChoice) return;
    const categoryIndex = parseInt(categoryChoice) - 1;
    if (isNaN(categoryIndex) || categoryIndex < 0 || categoryIndex >= FIXED_CATEGORIES.length) {
        alert('Неверный выбор категории');
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
            tg.showPopup({
                title: '✅ Бренд добавлен!',
                message: `"${name}" успешно добавлен`,
                buttons: [{ type: 'ok' }]
            });
        } else {
            const error = await response.json();
            console.error('❌ Ошибка добавления:', error);
            tg.showPopup({
                title: '❌ Ошибка',
                message: error.message || 'Не удалось добавить бренд',
                buttons: [{ type: 'ok' }]
            });
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error);
        tg.showPopup({
            title: '❌ Ошибка',
            message: 'Ошибка соединения с сервером',
            buttons: [{ type: 'ok' }]
        });
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
            tg.showPopup({
                title: '✅ Бренд удалён',
                message: 'Бренд успешно удалён',
                buttons: [{ type: 'ok' }]
            });
        }
    } catch (error) {
        console.error('Error deleting brand:', error);
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
        
        if (!response.ok) throw new Error('Failed to fetch models');
        const data = await response.json();
        console.log('📦 Загружено моделей в админке:', data.length);
        
        if (data.length === 0) {
            container.innerHTML = '<div class="empty-message">Моделей пока нет</div>';
            return;
        }
        
        container.innerHTML = data.map(m => {
            const brand = brands.find(b => b.slug === m.brand_slug);
            const category = FIXED_CATEGORIES.find(c => c.slug === m.main_category_slug);
            return `
            <div class="admin-model-card" data-id="${m.id}">
                <div class="admin-model-info">
                    <div class="admin-model-name">${m.name}</div>
                    <div class="admin-model-slug">${m.slug}</div>
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
        console.error('Error loading models:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки моделей</div>';
    }
}

async function addNewModel() {
    const name = prompt('Название модели:');
    if (!name) return;
    const slug = prompt('Slug (уникальный идентификатор, латиница):');
    if (!slug) return;
    
    const brandOptions = brands.map((b, i) => `${i+1}. ${b.name} (${b.slug})`).join('\n');
    if (brands.length === 0) {
        alert('Сначала добавьте бренд через админку!');
        return;
    }
    const brandChoice = prompt(`Выберите бренд:\n${brandOptions}`);
    if (!brandChoice) return;
    const brandIndex = parseInt(brandChoice) - 1;
    if (isNaN(brandIndex) || brandIndex < 0 || brandIndex >= brands.length) {
        alert('Неверный выбор бренда');
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
            tg.showPopup({
                title: '✅ Модель добавлена!',
                message: `"${name}" успешно добавлена`,
                buttons: [{ type: 'ok' }]
            });
        } else {
            const error = await response.json();
            console.error('❌ Ошибка добавления:', error);
            tg.showPopup({
                title: '❌ Ошибка',
                message: error.message || 'Не удалось добавить модель',
                buttons: [{ type: 'ok' }]
            });
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error);
        tg.showPopup({
            title: '❌ Ошибка',
            message: 'Ошибка соединения с сервером',
            buttons: [{ type: 'ok' }]
        });
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
            tg.showPopup({
                title: '✅ Модель удалена',
                message: 'Модель успешно удалена',
                buttons: [{ type: 'ok' }]
            });
        }
    } catch (error) {
        console.error('Error deleting model:', error);
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
        console.log('📦 Загружено атрибутов:', data.length);
        console.log('📦 Данные атрибутов:', data);
        
        productAttributes = data;
        
        if (data.length === 0) {
            container.innerHTML = '<div class="empty-message">Атрибутов пока нет</div>';
            return;
        }
        
        let html = '';
        data.forEach(attr => {
            html += `
            <div class="admin-attribute-card" data-id="${attr.id}">
                <div class="admin-attribute-info">
                    <div class="admin-attribute-name">${attr.attribute_name || 'Без названия'}</div>
                    <div class="admin-attribute-value">${attr.attribute_value || 'Без значения'}</div>
                    <div class="admin-attribute-model">Модель: ${attr.product_model_slug || 'Не указана'}</div>
                    <div class="admin-attribute-status">${attr.active !== false ? '🟢 Активен' : '🔴 Неактивен'}</div>
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
    const attrName = prompt('Название атрибута (например, "Цвет", "Сопротивление"):');
    if (!attrName) return;
    const attrValue = prompt('Значение атрибута (например, "Чёрный", "0.8 Ом"):');
    if (!attrValue) return;
    const modelSlug = prompt('Slug модели (например, "xros-3"):');
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
            tg.showPopup({
                title: '✅ Атрибут добавлен!',
                message: `"${attrName}: ${attrValue}" добавлен для модели "${modelSlug}"`,
                buttons: [{ type: 'ok' }]
            });
        } else {
            const error = await response.json();
            console.error('❌ Ошибка добавления:', error);
            tg.showPopup({
                title: '❌ Ошибка',
                message: error.message || 'Не удалось добавить атрибут',
                buttons: [{ type: 'ok' }]
            });
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error);
        tg.showPopup({
            title: '❌ Ошибка',
            message: 'Ошибка соединения с сервером',
            buttons: [{ type: 'ok' }]
        });
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
            tg.showPopup({
                title: '✅ Атрибут удалён',
                message: 'Атрибут успешно удалён',
                buttons: [{ type: 'ok' }]
            });
        }
    } catch (error) {
        console.error('Error deleting attribute:', error);
    }
}

// ==========================================
// ===== АКЦИИ (АДМИНКА) =====
// ==========================================

async function loadAdminPromotions() {
    console.log('🔄 ЗАГРУЗКА АКЦИЙ...');
    
    const page = document.getElementById('page-admin-promotions');
    if (page) {
        page.style.display = 'block';
        page.style.visibility = 'visible';
        page.style.opacity = '1';
        page.style.height = 'auto';
        page.style.overflow = 'visible';
        page.classList.add('active');
        console.log('✅ Страница акций показана принудительно');
    }
    
    const container = document.getElementById('admin-promotions-list');
    if (!container) {
        console.error('❌ Контейнер admin-promotions-list не найден');
        return;
    }
    
    container.style.display = 'block';
    container.style.visibility = 'visible';
    
    try {
        container.innerHTML = '<div class="loading">⏳ Загрузка акций...</div>';
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/promotions?select=*&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        console.log('📦 Загружено акций:', data.length);
        console.log('📦 Данные акций:', data);
        
        promotions = data;
        
        if (data.length === 0) {
            container.innerHTML = '<div class="empty-message">Акций пока нет</div>';
            return;
        }
        
        let html = '';
        data.forEach(p => {
            html += `
            <div class="admin-promotion-card" data-id="${p.id}">
                <span class="admin-promotion-emoji">${p.image_emoji || '🎉'}</span>
                <div class="admin-promotion-info">
                    <div class="admin-promotion-title">${p.title || 'Без названия'}</div>
                    <div class="admin-promotion-desc">${p.description || ''}</div>
                    <span class="admin-promotion-status ${p.active !== false ? 'active' : 'inactive'}">
                        ${p.active !== false ? '✅ Активна' : '❌ Неактивна'}
                    </span>
                </div>
                <div class="admin-promotion-actions">
                    <button class="admin-edit-btn" onclick="editPromotion(${p.id})">✏️</button>
                    <button class="admin-delete-btn" onclick="deletePromotion(${p.id})">🗑️</button>
                </div>
            </div>
            `;
        });
        
        container.innerHTML = html;
        console.log('✅ Акции отображены, количество карточек:', container.children.length);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки акций:', error);
        container.innerHTML = `<div class="error-message">❌ Ошибка загрузки: ${error.message}</div>`;
    }
}

async function addNewPromotion() {
    const title = prompt('Название акции:');
    if (!title) return;
    const description = prompt('Описание акции:');
    if (description === null) return;
    const emoji = prompt('Эмодзи:', '🎉');
    if (emoji === null) return;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/promotions`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description,
                image_emoji: emoji,
                active: true
            })
        });
        
        if (response.ok) {
            await loadAdminPromotions();
            await loadPromotionsFromSupabase();
            tg.showPopup({
                title: '✅ Акция добавлена!',
                message: `"${title}" успешно добавлена`,
                buttons: [{ type: 'ok' }]
            });
        } else {
            const error = await response.json();
            console.error('❌ Ошибка добавления:', error);
            tg.showPopup({
                title: '❌ Ошибка',
                message: error.message || 'Не удалось добавить акцию',
                buttons: [{ type: 'ok' }]
            });
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error);
        tg.showPopup({
            title: '❌ Ошибка',
            message: 'Ошибка соединения с сервером',
            buttons: [{ type: 'ok' }]
        });
    }
}

async function deletePromotion(promotionId) {
    if (!confirm('Удалить эту акцию?')) return;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/promotions?id=eq.${promotionId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (response.ok) {
            await loadAdminPromotions();
            await loadPromotionsFromSupabase();
            tg.showPopup({
                title: '✅ Акция удалена',
                message: 'Акция успешно удалена',
                buttons: [{ type: 'ok' }]
            });
        }
    } catch (error) {
        console.error('Error deleting promotion:', error);
    }
}

// ==========================================
// ===== МОДЕРАТОРЫ (АДМИНКА) =====
// ==========================================

async function loadAdmins() {
    console.log('🔄 ЗАГРУЗКА МОДЕРАТОРОВ...');
    
    const page = document.getElementById('page-admin-moderators');
    if (page) {
        page.style.display = 'block';
        page.style.visibility = 'visible';
        page.style.opacity = '1';
        page.style.height = 'auto';
        page.style.overflow = 'visible';
        page.classList.add('active');
        console.log('✅ Страница модераторов показана принудительно');
    }
    
    const container = document.getElementById('admin-moderators-list');
    if (!container) {
        console.error('❌ Контейнер admin-moderators-list не найден');
        return;
    }
    
    container.style.display = 'block';
    container.style.visibility = 'visible';
    
    try {
        container.innerHTML = '<div class="loading">⏳ Загрузка модераторов...</div>';
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/admins?select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        console.log('📦 Загружено модераторов:', data.length);
        console.log('📦 Данные модераторов:', data);
        
        if (data.length === 0) {
            container.innerHTML = '<div class="empty-message">Нет модераторов</div>';
            return;
        }
        
        let html = '';
        data.forEach(admin => {
            html += `
            <div class="admin-card">
                <span>👤 ${admin.username || 'Unknown'}</span>
                <span>ID: ${admin.id || 'Нет ID'}</span>
                <span class="admin-role">${admin.role || 'admin'}</span>
                <button class="admin-remove-btn" onclick="removeAdmin(${admin.id})">❌</button>
            </div>
            `;
        });
        
        container.innerHTML = html;
        console.log('✅ Модераторы отображены, количество карточек:', container.children.length);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки модераторов:', error);
        container.innerHTML = `<div class="error-message">❌ Ошибка загрузки: ${error.message}</div>`;
    }
}

async function addAdmin() {
    const id = document.getElementById('admin-add-id').value;
    const username = document.getElementById('admin-add-username').value || 'unknown';
    
    if (!id) {
        alert('Введите Telegram ID');
        return;
    }
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/admins`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: parseInt(id),
                username: username,
                role: 'admin'
            })
        });
        
        if (response.ok) {
            document.getElementById('admin-add-id').value = '';
            document.getElementById('admin-add-username').value = '';
            await loadAdmins();
            tg.showPopup({
                title: '✅ Модератор добавлен!',
                message: `Пользователь ${username} добавлен как модератор`,
                buttons: [{ type: 'ok' }]
            });
        } else {
            const error = await response.json();
            console.error('❌ Ошибка добавления:', error);
            tg.showPopup({
                title: '❌ Ошибка',
                message: error.message || 'Не удалось добавить модератора',
                buttons: [{ type: 'ok' }]
            });
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error);
        tg.showPopup({
            title: '❌ Ошибка',
            message: 'Ошибка соединения с сервером',
            buttons: [{ type: 'ok' }]
        });
    }
}

async function removeAdmin(adminId) {
    if (!confirm('Удалить этого модератора?')) return;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/admins?id=eq.${adminId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (response.ok) {
            await loadAdmins();
            tg.showPopup({
                title: '✅ Модератор удалён',
                message: 'Модератор успешно удалён',
                buttons: [{ type: 'ok' }]
            });
        }
    } catch (error) {
        console.error('Error removing admin:', error);
    }
}

// --- Категории (админка) ---
async function loadAdminCategories() {
    console.log('🔄 ЗАГРУЗКА КАТЕГОРИЙ...');
    const container = document.getElementById('admin-categories-list');
    if (!container) return;
    
    container.style.display = 'block';
    container.style.visibility = 'visible';
    
    container.innerHTML = `
        <div class="admin-categories-fixed">
            <div class="admin-categories-header">
                <h3>📂 Основные категории (фиксированные)</h3>
                <p class="admin-categories-hint">Категории нельзя удалить, но вы можете управлять брендами и моделями</p>
            </div>
            ${FIXED_CATEGORIES.map(cat => `
                <div class="admin-category-card fixed">
                    <span class="admin-category-icon">${cat.icon || '📂'}</span>
                    <div class="admin-category-info">
                        <div class="admin-category-name">${cat.name}</div>
                        <div class="admin-category-slug">${cat.slug}</div>
                        <div class="admin-category-stats">
                            Брендов: ${brands.filter(b => b.main_category_slug === cat.slug).length} | 
                            Моделей: ${productModels.filter(m => m.main_category_slug === cat.slug).length}
                        </div>
                    </div>
                    <div class="admin-category-actions">
                        <span class="admin-category-badge">🔒 Фиксированная</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function addNewCategory() {
    tg.showPopup({
        title: 'ℹ️ Фиксированные категории',
        message: 'Основные категории (Pod-системы, Жижи, Комплектующие, Одноразовые, Снюс) зафиксированы в коде.\n\nДля добавления новых категорий обратитесь к разработчику.',
        buttons: [{ type: 'ok' }]
    });
}

// ==========================================
// ===== ИНИЦИАЛИЗАЦИЯ =====
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ...');
    console.log('📱 initData:', window.Telegram.WebApp.initData);
    console.log('👤 initDataUnsafe:', window.Telegram.WebApp.initDataUnsafe);
    console.log('📱 platform:', window.Telegram.WebApp.platform);
    
    isAdmin = await checkAdmin();
    console.log('👑 isAdmin:', isAdmin);
    
    const adminNavBtn = document.getElementById('nav-admin');
    if (adminNavBtn && isAdmin) {
        adminNavBtn.style.display = 'flex';
        console.log('✅ Кнопка админки показана');
    }
    
    await loadMainCategories();
    await loadBrands();
    await loadProductModels();
    await loadProductAttributes();
    await loadPromotionsFromSupabase();
    await loadProductsFromSupabase();
    
    setupSortFilters();
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            if (page) {
                console.log('🔽 Клик по навигации:', page);
                navigateTo(page);
            }
        });
    });
    
    document.querySelectorAll('.admin-menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            if (page) {
                console.log('⚙️ Клик по админ-меню:', page);
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
    }
    
    updateCartUI();
    updateBadge();
    
    console.log('✅ ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА');
});

tg.onEvent('mainButtonClicked', checkout);