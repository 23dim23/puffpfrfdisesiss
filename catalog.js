// ==========================================
// ===== CATALOG.JS - УЛУЧШЕНИЯ КАТАЛОГА =====
// ==========================================

// ===== ПАГИНАЦИЯ (Показать ещё) =====
const ITEMS_PER_PAGE = 10;
let catalogCurrentPage = 1;  // ← переименовал, чтобы не конфликтовать с currentPage из app.js
let totalFilteredItems = [];
let isLoading = false;

// ===== ХЛЕБНЫЕ КРОШКИ =====
function renderBreadcrumbs() {
    const container = document.getElementById('breadcrumbs');
    if (!container) return;
    
    let crumbs = [];
    
    // Всегда добавляем "Главная"
    crumbs.push({ name: '🏠 Главная', action: 'resetCatalog()' });
    
    if (currentCategorySlug !== 'all') {
        const category = FIXED_CATEGORIES.find(c => c.slug === currentCategorySlug);
        if (category) {
            crumbs.push({ name: category.icon + ' ' + category.name, action: `selectMainCategory('${category.slug}')` });
        }
    }
    
    if (currentBrandSlug !== 'all') {
        const brand = brands.find(b => b.slug === currentBrandSlug);
        if (brand) {
            crumbs.push({ name: '🏷️ ' + brand.name, action: `selectBrand('${brand.slug}')` });
        }
    }
    
    if (currentModelSlug !== 'all') {
        const model = productModels.find(m => m.slug === currentModelSlug);
        if (model) {
            crumbs.push({ name: '📦 ' + model.name, action: `selectModel('${model.slug}')` });
        }
    }
    
    if (currentAttributeValue !== 'all') {
        crumbs.push({ name: '🎨 ' + currentAttributeValue, action: `selectAttributeValue('all')` });
    }
    
    if (searchQuery) {
        crumbs.push({ name: '🔍 Поиск: "' + searchQuery + '"', action: 'clearSearch()' });
    }
    
    // Если нет ни одной крошки кроме "Главная" — показываем только "Главная"
    if (crumbs.length === 1) {
        container.innerHTML = `<span class="breadcrumb">${crumbs[0].name}</span>`;
        return;
    }
    
    // Собираем HTML
    let html = '';
    crumbs.forEach((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        if (isLast) {
            html += `<span class="breadcrumb last">${crumb.name}</span>`;
        } else {
            html += `<span class="breadcrumb clickable" onclick="${crumb.action}">${crumb.name}</span>`;
            html += `<span class="breadcrumb-separator">›</span>`;
        }
    });
    
    container.innerHTML = html;
}

// ===== ПАГИНАЦИЯ =====
function renderProductsWithPagination(grid, filteredProducts) {
    totalFilteredItems = filteredProducts;
    catalogCurrentPage = 1;
    renderPage(grid);
}

function renderPage(grid) {
    if (!grid) return;
    
    const start = 0;
    const end = catalogCurrentPage * ITEMS_PER_PAGE;
    const pageItems = totalFilteredItems.slice(start, end);
    const hasMore = end < totalFilteredItems.length;
    const remaining = totalFilteredItems.length - end;
    
    // Очищаем сетку, но сохраняем кнопку "Назад" если она есть
    const backBtn = grid.querySelector('.category-back');
    let backHtml = '';
    if (backBtn) {
        backHtml = backBtn.outerHTML;
    }
    
    // Добавляем товары
    let html = backHtml;
    html += pageItems.map(p => createProductCard(p)).join('');
    
    // Добавляем кнопку "Показать ещё"
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

// ===== ЗАГРУЗКА ЕЩЁ ТОВАРОВ =====
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

// ===== ХЛЕБНЫЕ КРОШКИ — ОБНОВЛЕНИЕ =====
function updateBreadcrumbsAndPagination() {
    renderBreadcrumbs();
    
    // Получаем отфильтрованные товары
    let filtered = (products || []).filter(p => p.inStock);
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p => 
            (p.name || '').toLowerCase().includes(q) || 
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
            const productAttrs = (productAttributes || []).filter(a => a.product_model_slug === p.modelSlug);
            return productAttrs.some(a => a.attribute_value === currentAttributeValue);
        });
    }
    
    switch (currentSort) {
        case 'price-asc': filtered.sort((a, b) => a.price - b.price); break;
        case 'price-desc': filtered.sort((a, b) => b.price - a.price); break;
        case 'name': filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
        default: filtered.sort((a, b) => a.id - b.id);
    }
    
    const grid = document.getElementById('catalog-grid');
    if (grid) {
        // Сохраняем кнопку "Назад"
        const backBtn = grid.querySelector('.category-back');
        let backHtml = '';
        if (backBtn) {
            backHtml = backBtn.outerHTML;
        }
        
        if (filtered.length === 0) {
            let emptyHtml = backHtml + '<div class="empty-message">Товары не найдены</div>';
            grid.innerHTML = emptyHtml;
            return;
        }
        
        renderProductsWithPagination(grid, filtered);
    }
}

// ===== РЕКОМЕНДАЦИИ "С ЭТИМ ТОВАРОМ ПОКУПАЮТ" =====
function renderRecommendations(productId) {
    const container = document.getElementById('recommendations-container');
    if (!container) return;
    
    const product = products.find(p => p.id === productId);
    if (!product) {
        container.innerHTML = '';
        return;
    }
    
    // Ищем похожие товары (по категории, бренду или модели)
    let recommendations = products.filter(p => 
        p.id !== productId && 
        p.inStock &&
        (p.mainCategorySlug === product.mainCategorySlug || 
         p.brandSlug === product.brandSlug ||
         p.modelSlug === product.modelSlug)
    );
    
    // Если мало рекомендаций — добавляем случайные из той же категории
    if (recommendations.length < 4) {
        const more = products.filter(p => 
            p.id !== productId && 
            p.inStock &&
            p.mainCategorySlug === product.mainCategorySlug &&
            !recommendations.includes(p)
        );
        recommendations = [...recommendations, ...more].slice(0, 4);
    }
    
    // Если всё ещё нет — берём любые товары в наличии
    if (recommendations.length === 0) {
        recommendations = products.filter(p => p.id !== productId && p.inStock).slice(0, 4);
    }
    
    if (recommendations.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = `
        <div class="recommendations-section">
            <div class="section-header">
                <h2>🔥 С этим товаром покупают</h2>
            </div>
            <div class="recommendations-grid">
                ${recommendations.slice(0, 4).map(p => createProductCard(p)).join('')}
            </div>
        </div>
    `;
    
    addBuyButtons(container);
}

// ===== БЫСТРЫЙ ПРОСМОТР ТОВАРА (МОДАЛЬНОЕ ОКНО) =====
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
        <button class="buy-btn quick-view-buy" data-id="${product.id}" onclick="addToCartQuick(${product.id})">🔥 Добавить в корзину</button>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Рекомендации
    renderRecommendations(productId);
}

function closeQuickView() {
    const modal = document.getElementById('quick-view-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    const recContainer = document.getElementById('recommendations-container');
    if (recContainer) {
        recContainer.innerHTML = '';
    }
}

function addToCartQuick(productId) {
    addToCart(productId);
    closeQuickView();
}

// ===== ПЕРЕХВАТ КЛИКОВ ПО КАРТОЧКАМ ДЛЯ БЫСТРОГО ПРОСМОТРА =====
function setupQuickView() {
    document.addEventListener('click', function(e) {
        const card = e.target.closest('.product-card');
        if (!card) return;
        
        // Если клик по кнопке "Купить" — не открываем быстрый просмотр
        if (e.target.closest('.buy-btn')) return;
        
        const id = parseInt(card.dataset.id);
        if (id) {
            showQuickView(id);
        }
    });
}

// ===== ПЕРЕХВАТ РЕНДЕРА КАТАЛОГА =====
function overrideRenderCatalog() {
    // Сохраняем оригинальную функцию
    const originalRenderCatalog = window.renderCatalog;
    
    // Переопределяем
    window.renderCatalog = function() {
        originalRenderCatalog();
        // После отрисовки обновляем хлебные крошки и пагинацию
        setTimeout(() => {
            renderBreadcrumbs();
            // Если есть товары, применяем пагинацию
            const grid = document.getElementById('catalog-grid');
            if (grid && !grid.querySelector('.category-card') && !grid.querySelector('.empty-message')) {
                // Это товары — применяем пагинацию
                updateBreadcrumbsAndPagination();
            } else {
                // Это категории/бренды/модели
                renderBreadcrumbs();
            }
        }, 50);
    };
}

// ===== ПЕРЕХВАТ НАВИГАЦИИ =====
function overrideNavigation() {
    // Сохраняем оригинальные функции
    const originalSelectMainCategory = window.selectMainCategory;
    const originalSelectBrand = window.selectBrand;
    const originalSelectModel = window.selectModel;
    const originalSelectAttributeValue = window.selectAttributeValue;
    const originalResetCatalog = window.resetCatalog;
    const originalClearSearch = window.clearSearch;
    
    // Переопределяем
    window.selectMainCategory = function(slug) {
        originalSelectMainCategory(slug);
        renderBreadcrumbs();
        updateBreadcrumbsAndPagination();
    };
    
    window.selectBrand = function(slug) {
        originalSelectBrand(slug);
        renderBreadcrumbs();
        updateBreadcrumbsAndPagination();
    };
    
    window.selectModel = function(slug) {
        originalSelectModel(slug);
        renderBreadcrumbs();
        updateBreadcrumbsAndPagination();
    };
    
    window.selectAttributeValue = function(value) {
        originalSelectAttributeValue(value);
        renderBreadcrumbs();
        updateBreadcrumbsAndPagination();
    };
    
    window.resetCatalog = function() {
        originalResetCatalog();
        renderBreadcrumbs();
        updateBreadcrumbsAndPagination();
    };
    
    window.clearSearch = function() {
        originalClearSearch();
        renderBreadcrumbs();
        updateBreadcrumbsAndPagination();
    };
}

// ===== ИНИЦИАЛИЗАЦИЯ CATALOG.JS =====
function initCatalogExtensions() {
    console.log('🚀 Инициализация расширений каталога...');
    
    // Добавляем контейнер для хлебных крошек если его нет
    const catalogPage = document.getElementById('page-catalog');
    if (catalogPage) {
        const searchEl = catalogPage.querySelector('.catalog-search');
        if (searchEl && !document.getElementById('breadcrumbs')) {
            const breadcrumbsDiv = document.createElement('div');
            breadcrumbsDiv.id = 'breadcrumbs';
            breadcrumbsDiv.className = 'breadcrumbs-container';
            searchEl.after(breadcrumbsDiv);
        }
    }
    
    // Добавляем модальное окно если его нет
    if (!document.getElementById('quick-view-modal')) {
        const modal = document.createElement('div');
        modal.id = 'quick-view-modal';
        modal.className = 'quick-view-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="quick-view-overlay" onclick="closeQuickView()"></div>
            <div class="quick-view-content" id="quick-view-content">
                <div class="quick-view-loader">⏳ Загрузка...</div>
            </div>
            <div id="recommendations-container" class="recommendations-container"></div>
        `;
        document.body.appendChild(modal);
    }
    
    // Добавляем контейнер для рекомендаций в модалке
    const recContainer = document.getElementById('recommendations-container');
    if (recContainer) {
        recContainer.style.display = 'block';
        recContainer.style.marginTop = '20px';
        recContainer.style.padding = '0 16px';
    }
    
    // Настраиваем быстрый просмотр
    setupQuickView();
    
    // Переопределяем функции
    overrideRenderCatalog();
    overrideNavigation();
    
    // Первоначальная отрисовка
    setTimeout(() => {
        renderBreadcrumbs();
        // Проверяем, нужно ли применить пагинацию
        const grid = document.getElementById('catalog-grid');
        if (grid) {
            const cards = grid.querySelectorAll('.product-card');
            if (cards.length > ITEMS_PER_PAGE) {
                // Применяем пагинацию ко всем товарам в каталоге
                const allProducts = Array.from(cards).map(card => {
                    const id = parseInt(card.dataset.id);
                    return products.find(p => p.id === id);
                }).filter(p => p);
                if (allProducts.length > 0) {
                    // Перестраиваем с пагинацией
                    const filtered = allProducts;
                    renderProductsWithPagination(grid, filtered);
                }
            }
        }
        renderBreadcrumbs();
    }, 500);
    
    console.log('✅ Расширения каталога инициализированы');
}

// ===== ЗАПУСК ПОСЛЕ ЗАГРУЗКИ СТРАНИЦЫ =====
document.addEventListener('DOMContentLoaded', function() {
    // Ждём загрузки основных данных
    const checkData = setInterval(() => {
        if (products.length > 0 && brands.length > 0 && productModels.length > 0) {
            clearInterval(checkData);
            initCatalogExtensions();
        }
    }, 200);
    
    // Если через 10 секунд данные не загрузились — всё равно запускаем
    setTimeout(() => {
        clearInterval(checkData);
        initCatalogExtensions();
    }, 10000);
});