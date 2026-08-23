// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// ===== ЗАГЛУШКА ДЛЯ ПОКАЗА В БРАУЗЕРЕ =====
function showMessage(title, message) {
    console.log(`📢 ${title}: ${message}`);
    if (window.Telegram.WebApp.platform === 'unknown' || window.Telegram.WebApp.version === '6.0') {
        alert(`${title}\n\n${message}`);
    } else {
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
}

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

// Используем SERVICE_ROLE для всех запросов
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
let pickupPoints = [];
let currentCategorySlug = 'all';
let currentBrandSlug = 'all';
let currentModelSlug = 'all';
let currentAttributeValue = 'all';
let currentSort = 'default';
let adminFilterCategory = 'all';
let adminFilterStock = 'all';
let selectedAttributes = {};
let searchQuery = '';
let ordersFilter = { status: 'all', dateFrom: '', dateTo: '', deliveryType: 'all' };
let notificationSound = null;
let lastOrderCheck = 0;

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
            console.error(`❌ Ошибка сервера: ${response.status}`);
            return false;
        }

        const data = await response.json();
        console.log('📊 Ответ от Supabase:', data);
        
        return data.length > 0;
    } catch (error) {
        console.error('❌ Ошибка проверки админа:', error);
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
        
        if (!response.ok) throw new Error('Не удалось загрузить бренды');
        const data = await response.json();
        brands = data;
        console.log('✅ Загружено брендов:', brands.length);
        return brands;
    } catch (error) {
        console.error('❌ Ошибка загрузки брендов:', error);
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
        productModels = data;
        console.log('✅ Загружено моделей:', productModels.length);
        return productModels;
    } catch (error) {
        console.error('❌ Ошибка загрузки моделей:', error);
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
        productAttributes = data;
        console.log('✅ Загружено атрибутов:', productAttributes.length);
        return productAttributes;
    } catch (error) {
        console.error('❌ Ошибка загрузки атрибутов:', error);
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
        console.error('❌ Ошибка загрузки товаров:', error);
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
        promotions = data;
        console.log('✅ Загружено акций:', promotions.length);
        renderPromotions();
        return promotions;
    } catch (error) {
        console.error('❌ Ошибка загрузки акций:', error);
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
        pickupPoints = data.filter(p => p.is_active !== false);
        console.log('✅ Загружено точек самовывоза:', pickupPoints.length);
        return pickupPoints;
    } catch (error) {
        console.error('❌ Ошибка загрузки точек самовывоза:', error);
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

// ==========================================
// ===== КАТАЛОГ (С ПОИСКОМ) =====
// ==========================================
function renderCatalog() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;
    
    if (currentCategorySlug === 'all' && !searchQuery) {
        renderMainCategories(grid);
    } else if (currentBrandSlug === 'all' && !searchQuery) {
        renderBrands(grid);
    } else if (currentModelSlug === 'all' && !searchQuery) {
        renderModels(grid);
    } else if (currentAttributeValue === 'all' && !searchQuery) {
        renderAttributes(grid);
    } else {
        renderProductsWithSearch(grid);
    }
}

function renderProductsWithSearch(grid) {
    let filtered = products.filter(p => p.inStock);
    
    // Поиск
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(q) || 
            (p.emoji && p.emoji.includes(q))
        );
    }
    
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
        case 'price-asc': filtered.sort((a, b) => a.price - b.price); break;
        case 'price-desc': filtered.sort((a, b) => b.price - a.price); break;
        case 'name': filtered.sort((a, b) => a.name.localeCompare(b.name)); break;
        default: filtered.sort((a, b) => a.id - b.id);
    }
    
    const countEl = document.getElementById('catalog-count');
    if (countEl) countEl.textContent = `${filtered.length} товаров`;
    
    if (filtered.length === 0) {
        let backHtml = '';
        if (searchQuery) {
            backHtml = `<div class="category-back" onclick="clearSearch()">← Очистить поиск</div>`;
        } else if (currentAttributeValue !== 'all') {
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
    if (searchQuery) {
        backHtml = `<div class="category-back" onclick="clearSearch()">← Очистить поиск</div>`;
    } else if (currentAttributeValue !== 'all') {
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

function clearSearch() {
    searchQuery = '';
    document.getElementById('search-input')?.value = '';
    renderCatalog();
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
        renderProductsWithSearch(grid);
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

// ===== ФУНКЦИИ НАВИГАЦИИ ПО КАТАЛОГУ =====
window.selectMainCategory = function(slug) {
    currentCategorySlug = slug;
    currentBrandSlug = 'all';
    currentModelSlug = 'all';
    currentAttributeValue = 'all';
    searchQuery = '';
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
    searchQuery = '';
    document.getElementById('search-input')?.value = '';
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
// ===== ПОИСК =====
// ==========================================
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    searchInput.addEventListener('input', function() {
        searchQuery = this.value.trim();
        if (searchQuery) {
            currentCategorySlug = 'all';
            currentBrandSlug = 'all';
            currentModelSlug = 'all';
            currentAttributeValue = 'all';
            renderCatalog();
        } else {
            resetCatalog();
        }
    });
}

// ==========================================
// ===== КОРЗИНА (С КОЛИЧЕСТВОМ И СОХРАНЕНИЕМ) =====
// ==========================================
function saveCart() {
    localStorage.setItem('puff_cart', JSON.stringify(cart));
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (product.stockQuantity <= 0) {
        showMessage('❌ Нет в наличии', 'Товар закончился на складе');
        return;
    }
    
    // Проверяем, есть ли уже товар в корзине
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
    
    showMessage('✅ Добавлено!', `${product.emoji} ${product.name} — ${product.discountPrice || product.price} BYN`);
}

function updateCartUI() {
    const cartItems = document.getElementById('cart-items');
    const totalPrice = document.getElementById('total-price');
    const checkoutBtn = document.getElementById('checkout-btn');
    const orderForm = document.getElementById('order-form');
    
    if (!cartItems) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<li class="cart-empty">Корзина пуста</li>';
        if (totalPrice) totalPrice.textContent = '0 BYN';
        if (checkoutBtn) checkoutBtn.disabled = true;
        if (orderForm) orderForm.style.display = 'none';
        return;
    }
    
    let html = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        const price = item.discountPrice || item.price;
        const qty = item.quantity || 1;
        total += price * qty;
        html += `
            <li>
                <span class="item-name">${item.emoji} ${item.name}</span>
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
    if (totalPrice) totalPrice.textContent = total.toFixed(2) + ' BYN';
    if (checkoutBtn) checkoutBtn.disabled = false;
    if (orderForm) orderForm.style.display = 'block';
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
    if (badge) {
        const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }
}

// ===== НАВИГАЦИЯ =====
function navigateTo(pageId) {
    console.log('🔄 ПЕРЕХОД НА СТРАНИЦУ:', pageId);
    
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
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageId);
    });
    
    currentPage = pageId;
    
    if (pageId.startsWith('page-admin')) {
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
                case 'page-my-orders':
                    loadMyOrders();
                    break;
            }
        }, 300);
    }
}

// ==========================================
// ===== ОФОРМЛЕНИЕ ЗАКАЗА =====
// ==========================================
async function checkout() {
    if (cart.length === 0) return;
    
    const phone = document.getElementById('order-phone')?.value?.trim() || '';
    const deliveryType = document.getElementById('order-delivery-type')?.value || 'pickup';
    const pickupPointId = document.getElementById('order-pickup-point')?.value || '';
    const address = document.getElementById('order-address')?.value?.trim() || '';
    const comment = document.getElementById('order-comment')?.value?.trim() || '';
    
    if (!phone) {
        showMessage('⚠️ Введите телефон', 'Пожалуйста, укажите номер телефона для связи');
        return;
    }
    
    if (deliveryType === 'pickup' && !pickupPointId) {
        showMessage('⚠️ Выберите точку', 'Пожалуйста, выберите точку самовывоза');
        return;
    }
    
    if (deliveryType === 'delivery' && !address) {
        showMessage('⚠️ Введите адрес', 'Пожалуйста, укажите адрес доставки');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.discountPrice || item.price) * (item.quantity || 1), 0);
    const items = cart.map(item => ({ 
        id: item.id,
        name: item.name, 
        price: item.discountPrice || item.price,
        quantity: item.quantity || 1,
        emoji: item.emoji || '📦'
    }));
    
    const user = tg.initDataUnsafe?.user;
    
    let pickupPointName = '';
    let pickupPointAddress = '';
    if (deliveryType === 'pickup') {
        const selectedPoint = pickupPoints.find(p => p.id == pickupPointId);
        if (selectedPoint) {
            pickupPointName = selectedPoint.name;
            pickupPointAddress = selectedPoint.address;
        }
    }
    
    const orderData = {
        user_id: user?.id || 0,
        username: user?.username || user?.first_name || 'Гость',
        total: total,
        status: 'pending',
        currency: 'BYN',
        phone: phone,
        delivery_type: deliveryType,
        delivery_address: deliveryType === 'pickup' ? pickupPointAddress : (address || null),
        pickup_point_id: deliveryType === 'pickup' ? pickupPointId : null,
        pickup_point_name: pickupPointName,
        comment: comment || null,
        items_json: items
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
        
        // Отправляем уведомление в бот
        const botOrderData = {
            action: 'order',
            items: items,
            total: total,
            currency: 'BYN',
            phone: phone,
            delivery_type: deliveryType,
            delivery_address: deliveryType === 'pickup' ? pickupPointAddress : (address || null),
            pickup_point_name: pickupPointName,
            comment: comment || null,
            user_id: user?.id || null,
            username: user?.username || user?.first_name || 'Гость'
        };
        
        try {
            tg.sendData(JSON.stringify(botOrderData));
            console.log('📤 Уведомление отправлено в бот');
        } catch (botError) {
            console.warn('⚠️ Ошибка отправки уведомления в бот:', botError);
        }
        
        // Обновляем остатки
        for (const item of cart) {
            const product = products.find(p => p.id === item.id);
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
        
        // Очищаем корзину
        cart = [];
        saveCart();
        updateCartUI();
        updateBadge();
        
        const orderForm = document.getElementById('order-form');
        if (orderForm) orderForm.style.display = 'none';
        
        const phoneInput = document.getElementById('order-phone');
        const addressInput = document.getElementById('order-address');
        const commentInput = document.getElementById('order-comment');
        if (phoneInput) phoneInput.value = '';
        if (addressInput) addressInput.value = '';
        if (commentInput) commentInput.value = '';
        
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
        console.log('📦 Загружено ваших заказов:', orders.length);
        
        if (orders.length === 0) {
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
            
            return `
            <div class="my-order-card">
                <div class="order-header">
                    <strong>Заказ #${order.id}</strong>
                    <span class="order-status ${statusClass}">${statusMap[order.status] || order.status}</span>
                </div>
                <div class="order-details">
                    <p>💰 ${order.total} BYN</p>
                    <p>📦 ${deliveryText}</p>
                    ${itemsList ? `<p>📋 ${itemsList}</p>` : ''}
                    ${order.comment ? `<p>💬 ${order.comment}</p>` : ''}
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
// ===== СТАТИСТИКА =====
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
            ordersPending: 0
        };
        
        orders.forEach(order => {
            const orderDate = new Date(order.created_at);
            const amount = Number(order.total) || 0;
            
            stats.total += amount;
            
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
        });
        
        const pendingResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=id&status=eq.pending`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (pendingResponse.ok) {
            const pending = await pendingResponse.json();
            stats.ordersPending = pending.length;
        }
        
        document.getElementById('stat-today').textContent = stats.today.toFixed(2) + ' BYN';
        document.getElementById('stat-week').textContent = stats.week.toFixed(2) + ' BYN';
        document.getElementById('stat-month').textContent = stats.month.toFixed(2) + ' BYN';
        document.getElementById('stat-total').textContent = stats.total.toFixed(2) + ' BYN';
        document.getElementById('stat-orders-today').textContent = stats.ordersToday;
        document.getElementById('stat-orders-pending').textContent = stats.ordersPending;
        
        console.log('✅ Статистика загружена:', stats);
        
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

// --- Заказы (с фильтрами) ---
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
        console.log('📦 Загружено заказов:', orders.length);
        
        if (orders.length === 0) {
            container.innerHTML = '<div class="empty-message">Заказов пока нет</div>';
            return;
        }
        
        container.innerHTML = orders.map(order => {
            let deliveryText = order.delivery_type === 'pickup' ? `🏪 Самовывоз: ${order.pickup_point_name || 'Точка не указана'}` : `🚚 Доставка: ${order.delivery_address || 'Адрес не указан'}`;
            const itemsList = order.items_json ? order.items_json.map(item => `${item.emoji || '📦'} ${item.name} × ${item.quantity || 1}`).join(', ') : '';
            const userLink = order.user_id ? `<a href="tg://user?id=${order.user_id}" target="_blank">✉️ Связаться</a>` : '';
            
            let statusText = '', statusClass = '', actionButtons = '';
            switch(order.status) {
                case 'pending':
                    statusText = '🔄 В обработке'; statusClass = 'pending';
                    actionButtons = `
                        <button class="order-status-btn confirm-btn" data-id="${order.id}" data-status="confirmed">✅ Подтвердить заказ</button>
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
                    <p>👤 ${order.username || 'Не указан'} ${userLink}</p>
                    <p>📱 ${order.phone || 'Не указан'}</p>
                    <p>💰 ${order.total} BYN</p>
                    <p>📦 ${deliveryText}</p>
                    ${itemsList ? `<p>📋 ${itemsList}</p>` : ''}
                    ${order.comment ? `<p>💬 ${order.comment}</p>` : ''}
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
        const order = orderData[0];
        
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
                        case 'confirmed': message = `✅ Ваш заказ #${orderId} ПОДТВЕРЖДЕН!\n\n📦 Товары: ${order.items_json ? order.items_json.map(item => `${item.name} (${item.price} BYN) × ${item.quantity || 1}`).join(', ') : ''}\n💰 Итого: ${order.total} BYN\n\nСпасибо за заказ! Мы приступили к его обработке.`; break;
                        case 'shipped': message = `📦 Ваш заказ #${orderId} ОТПРАВЛЕН!\n\nСпасибо за покупку! ❤️`; break;
                        case 'completed': message = `✅ Ваш заказ #${orderId} ВЫПОЛНЕН!\n\nБлагодарим за покупку! Ждем вас снова! 🙏`; break;
                        default: message = `Статус заказа #${orderId} изменен на: ${status}`;
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

// ===== ОТПРАВКА СООБЩЕНИЯ ПОКУПАТЕЛЮ =====
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
        const order = orders[0];
        if (!order) { showMessage('❌ Ошибка', 'Заказ не найден'); return; }
        const fullMessage = `📩 Сообщение от администратора по заказу #${orderId}:\n\n${message}\n\n---\n📦 Заказ: ${order.items_json ? order.items_json.map(i => `${i.name} × ${i.quantity || 1}`).join(', ') : ''}\n💰 Сумма: ${order.total} BYN`;
        
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
        let csv = 'ID,Покупатель,Телефон,Сумма,Способ получения,Статус,Дата,Товары\n';
        orders.forEach(o => {
            const items = o.items_json ? o.items_json.map(i => `${i.name} × ${i.quantity || 1}`).join('; ') : '';
            const delivery = o.delivery_type === 'pickup' ? `Самовывоз: ${o.pickup_point_name || ''}` : `Доставка: ${o.delivery_address || ''}`;
            csv += `${o.id},"${o.username || ''}","${o.phone || ''}",${o.total},"${delivery}","${o.status || ''}","${new Date(o.created_at).toLocaleString()}","${items}"\n`;
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
        console.log('📦 Загружено точек самовывоза:', data.length);
        
        if (data.length === 0) {
            container.innerHTML = '<div class="empty-message">Точек самовывоза пока нет</div>';
            return;
        }
        
        container.innerHTML = data.map(point => `
            <div class="admin-pickup-point-card" data-id="${point.id}">
                <div class="admin-pickup-point-info">
                    <div class="admin-pickup-point-name">📍 ${point.name}</div>
                    <div class="admin-pickup-point-address">${point.address}</div>
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
        const categoryBrands = brands.filter(b => b.main_category_slug === mainCategorySlug);
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
        const accessoriesModels = productModels.filter(m => m.main_category_slug === 'accessories');
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
        const disposableModels = productModels.filter(m => m.main_category_slug === 'disposable');
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
        const brandModels = productModels.filter(m => m.brand_slug === brandSlug);
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
        `).join('');
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
        `).join('');
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
    
    const brandOptions = brands.map((b, i) => `${i+1}. ${b.name} (${b.slug})`).join('\n');
    if (brands.length === 0) {
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
            showMessage('✅ Модель добавлена!', `"${name}" успешно добавлена`);
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
    const attrName = prompt('🏷️ Введите название атрибута (например, "Цвет", "Сопротивление"):');
    if (!attrName) return;
    const attrValue = prompt('🎨 Введите значение атрибута (например, "Чёрный", "0.8 Ом"):');
    if (!attrValue) return;
    const modelSlug = prompt('📦 Введите slug модели (например, "xros-3"):');
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
            showMessage('❌ Ошибка', error.message || 'Не удалось добавить атрибут');
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
    const title = prompt('🎉 Введите название акции:');
    if (!title) return;
    const description = prompt('📝 Введите описание акции:');
    if (description === null) return;
    const emoji = prompt('😊 Выберите эмодзи для акции (по умолчанию 🎉):', '🎉');
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
            showMessage('✅ Акция добавлена!', `"${title}" успешно добавлена`);
        } else {
            const error = await response.json();
            console.error('❌ Ошибка добавления:', error);
            showMessage('❌ Ошибка', error.message || 'Не удалось добавить акцию');
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error);
        showMessage('❌ Ошибка', 'Ошибка соединения с сервером');
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
            showMessage('✅ Акция удалена', 'Акция успешно удалена');
        }
    } catch (error) {
        console.error('❌ Ошибка удаления акции:', error);
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
        alert('⚠️ Введите Telegram ID пользователя');
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
            showMessage('✅ Модератор добавлен!', `Пользователь ${username} добавлен как модератор`);
        } else {
            const error = await response.json();
            console.error('❌ Ошибка добавления:', error);
            showMessage('❌ Ошибка', error.message || 'Не удалось добавить модератора');
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error);
        showMessage('❌ Ошибка', 'Ошибка соединения с сервером');
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
            showMessage('✅ Модератор удалён', 'Модератор успешно удалён');
        }
    } catch (error) {
        console.error('❌ Ошибка удаления модератора:', error);
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
    showMessage('ℹ️ Фиксированные категории', 'Основные категории (Pod-системы, Жижи, Комплектующие, Одноразовые, Снюс) зафиксированы в коде.\n\nДля добавления новых категорий обратитесь к разработчику.');
}

// ==========================================
// ===== ИНИЦИАЛИЗАЦИЯ =====
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ...');
    console.log('📱 initData:', window.Telegram.WebApp.initData);
    console.log('👤 initDataUnsafe:', window.Telegram.WebApp.initDataUnsafe);
    console.log('📱 platform:', window.Telegram.WebApp.platform);
    
    // Загружаем корзину из localStorage
    cart = JSON.parse(localStorage.getItem('puff_cart') || '[]');
    updateCartUI();
    updateBadge();
    
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
    await loadPickupPoints();
    await loadPromotionsFromSupabase();
    await loadProductsFromSupabase();
    
    setupSortFilters();
    setupSearch();
    setupOrderFilters();
    initNotificationSound();
    
    // Проверка новых заказов
    if (isAdmin) {
        setInterval(checkNewOrders, 15000);
        setTimeout(checkNewOrders, 3000);
    }
    
    // Отслеживаем изменение способа получения
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
        });
        // Обновляем выбор точек при загрузке
        if (pickupGroup) {
            const pickupSelect = document.getElementById('order-pickup-point');
            if (pickupSelect) {
                pickupSelect.innerHTML = '<option value="">-- Выберите точку --</option>';
                pickupPoints.forEach(p => {
                    pickupSelect.innerHTML += `<option value="${p.id}">${p.name} — ${p.address}</option>`;
                });
            }
        }
    }
    
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
        document.getElementById('admin-add-pickup-point-btn')?.addEventListener('click', addNewPickupPoint);
        document.getElementById('admin-export-orders-btn')?.addEventListener('click', exportOrdersCSV);
    }
    
    updateCartUI();
    updateBadge();
    
    console.log('✅ ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА');
});

tg.onEvent('mainButtonClicked', checkout);