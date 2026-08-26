// ========================================
// ===== КОНФИГУРАЦИЯ =====
// ========================================

const SUPABASE_URL = 'https://prtwcgqidlivkaanbowl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XxBLBacZddir7xEUUYsjdA_RdH1NnZz';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydHdjZ3FpZGxpdmthYW5ib3dsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc3MzcwNiwiZXhwIjoyMTAyMzQ5NzA2fQ.dvZAnH78ThbtWUTcn9mwveBXhV4RtyefUeFit4mHEUI';
const BOT_TOKEN = '8870349321:AAEXFersNinRpHnPETbR_vGFn_TnGWOCums';

// ========================================
// ===== ИНИЦИАЛИЗАЦИЯ TELEGRAM =====
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
// ===== ЗАГРУЗКА ДАННЫХ =====
// ========================================

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

// ========================================
// ===== ОТОБРАЖЕНИЕ КАТЕГОРИЙ =====
// ========================================

function renderCategories() {
    const container = document.getElementById('categories-scroll');
    if (!container) return;
    
    const categories = [
        { slug: 'liquid', name: 'Жидкости', emoji: '🧪' },
        { slug: 'accessories', name: 'Комплектующие', emoji: '🔧' },
        { slug: 'pod', name: 'Pod-системы', emoji: '💨' },
        { slug: 'disposable', name: 'Одноразки', emoji: '⚡' },
        { slug: 'snus', name: 'Снюс', emoji: '🫧' }
    ];
    
    container.innerHTML = categories.map(cat => `
        <div class="category-card" data-category="${cat.slug}" onclick="navigateToCategory('${cat.slug}')">
            <span class="cat-emoji">${cat.emoji}</span>
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
    
    const discounted = products.filter(p => p.discount_price && p.inStock);
    
    if (discounted.length === 0) {
        container.innerHTML = `
            <div class="product-scroll-card" style="min-width:200px; opacity:0.6;">
                <span class="product-emoji">🛍️</span>
                <p style="color:#71717a; font-size:13px;">Товаров со скидкой пока нет</p>
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
            <div class="product-scroll-card" style="min-width:200px; opacity:0.6;">
                <span class="product-emoji">⭐</span>
                <p style="color:#71717a; font-size:13px;">Популярных товаров пока нет</p>
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
    const priceDisplay = product.discount_price ? 
        `<span class="product-price">${product.discount_price} BYN</span>
         <span class="product-old-price">${product.price} BYN</span>
         <span class="product-discount">-${Math.round((1 - product.discount_price / product.price) * 100)}%</span>` :
        `<span class="product-price">${product.price} BYN</span>`;
    
    // Находим бренд
    const brandName = product.brand_slug || '';
    
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
// ===== НАВИГАЦИЯ =====
// ========================================

function navigateTo(pageId) {
    console.log('🔄 Переход на:', pageId);
    
    // Скрываем все страницы
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Показываем нужную
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add('active');
    }
    
    // Обновляем навигацию
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageId);
    });
    
    currentPage = pageId;
}

function navigateToCategory(categorySlug) {
    // Переключаем фильтр в каталоге
    currentCategory = categorySlug;
    navigateTo('page-catalog');
    // TODO: Обновить фильтры и товары в каталоге
}

function openManagerChat() {
    // Открываем чат с менеджером
    window.open('https://t.me/puff_mngr', '_blank');
}

// ========================================
// ===== МОДАЛЬНОЕ ОКНО ТОВАРА =====
// ========================================

function showProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const modal = document.getElementById('product-modal');
    const content = document.getElementById('product-modal-content');
    
    const priceDisplay = product.discount_price ? 
        `${product.discount_price} BYN <span style="text-decoration:line-through;color:#71717a;font-size:14px;">${product.price} BYN</span>` :
        `${product.price} BYN`;
    
    content.innerHTML = `
        <div class="modal-close" onclick="closeProductModal()">✕</div>
        <div class="modal-emoji">${product.emoji || '📦'}</div>
        <h2 class="modal-title">${product.name}</h2>
        <div class="modal-brand">${product.brand_slug || ''}</div>
        <div class="modal-price">${priceDisplay}</div>
        <div class="modal-stock ${product.inStock ? 'in-stock' : 'out-of-stock'}">
            ${product.inStock ? '✅ В наличии' : '❌ Нет в наличии'}
        </div>
        <div class="modal-description">${product.description || 'Описание отсутствует'}</div>
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
// ===== ПРОВЕРКА АДМИНА =====
// ========================================

async function checkAdmin() {
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            // Режим разработки
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('⚠️ Режим разработки: админка доступна');
                return true;
            }
            return false;
        }
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/admins?select=*&id=eq.${user.id}`, {
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
    
    // Получаем пользователя
    getUser();
    
    // Загружаем корзину
    loadCart();
    
    // Проверяем админа
    isAdmin = await checkAdmin();
    if (isAdmin) {
        document.getElementById('nav-admin').style.display = 'flex';
        console.log('👑 Админ-режим активирован');
    }
    
    // Загружаем товары
    await loadProducts();
    
    // Рендерим категории
    renderCategories();
    
    // Рендерим скидки и популярное
    renderDiscounts();
    renderPopular();
    
    // Навигация по клику
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            if (page) navigateTo(page);
        });
    });
    
    // Закрытие модалки по клику на фон
    document.querySelector('.modal-overlay')?.addEventListener('click', closeProductModal);
    
    console.log('✅ Инициализация завершена');
});