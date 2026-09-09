# -*- coding: utf-8 -*-
import os
import json
import logging
import asyncio
import threading
import requests
from datetime import datetime
from typing import Dict, List, Any, Optional

from flask import Flask, request, jsonify
from flask_cors import CORS
from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    WebAppInfo,
    ReplyKeyboardMarkup,
    KeyboardButton,
    MenuButtonWebApp,
)
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    CallbackQueryHandler,
    filters,
)

# ================= НАСТРОЙКА ЛОГИРОВАНИЯ =================
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("werkzeug").setLevel(logging.WARNING)

logging.basicConfig(
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("PuffParadiseBot")

# ================= КОНФИГУРАЦИЯ И ПЕРЕМЕННЫЕ =================
TOKEN = os.getenv("TOKEN", "8648233320:AAHqnWppOqFTogRR7szthQSclkq3caT8_8Y")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://puffpfrfdisesiss.karpenkoov32.workers.dev")
MANAGER_USERNAME = os.getenv("MANAGER_USERNAME", "puff_mngr")
PARSER_GROUP_ID = -4995013422

# Жестко захардкоженные ID главных администраторов
HARDCODED_ADMINS = [5659638424, 8161417737]

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)
ORDERS_FILE = os.path.join(DATA_DIR, "orders.json")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
SETTINGS_FILE = os.path.join(DATA_DIR, "settings.json")
PARSER_SETTINGS_FILE = os.path.join(DATA_DIR, "parser_settings.json")
WATCHED_CHATS_FILE = os.path.join(DATA_DIR, "watched_chats.json")

# Глобальный экземпляр бота для Flask-потока
tg_app: Optional[Application] = None


# ================= ЛОКАЛЬНАЯ БАЗА ДАННЫХ (JSON) =================
def load_json(filepath: str, default: Any) -> Any:
    try:
        if not os.path.exists(filepath):
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(default, f, ensure_ascii=False, indent=2)
            return default
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Ошибка чтения {filepath}: {e}")
        return default


def format_brand_slug(slug: Optional[str]) -> Optional[str]:
    if not slug:
        return None
    s = slug.strip()
    if not s:
        return None
    if len(s) <= 3:
        return s.upper()
    return " ".join(word.capitalize() for word in s.split("-"))


def save_json(filepath: str, data: Any) -> None:
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Ошибка записи в {filepath}: {e}")


def is_admin(user_id: int) -> bool:
    if not user_id:
        return False
    if int(user_id) in HARDCODED_ADMINS:
        return True
    settings = load_json(SETTINGS_FILE, {"admins": []})
    custom_admins = settings.get("admins", [])
    return int(user_id) in [int(a) for a in custom_admins]


def save_user(user_data: Dict[str, Any]) -> None:
    users = load_json(USERS_FILE, {})
    uid = str(user_data.get("id"))
    users[uid] = {
        "id": user_data.get("id"),
        "username": user_data.get("username"),
        "first_name": user_data.get("first_name"),
        "last_name": user_data.get("last_name"),
        "last_seen": datetime.now().isoformat(),
    }
    save_json(USERS_FILE, users)


def get_all_orders() -> List[Dict[str, Any]]:
    return load_json(ORDERS_FILE, [])


def save_order(order_data: Dict[str, Any]) -> Dict[str, Any]:
    orders = get_all_orders()
    order_id = order_data.get("id") or (1000 + len(orders) + 1)
    
    new_order = {
        "id": order_id,
        "user_id": order_data.get("user_id"),
        "username": order_data.get("username", "user"),
        "first_name": order_data.get("first_name", ""),
        "phone": order_data.get("phone", "Не указан"),
        "items": order_data.get("items", []),
        "total": order_data.get("total", 0),
        "subtotal": order_data.get("subtotal", order_data.get("total", 0)),
        "discount": order_data.get("discount", 0),
        "delivery_cost": order_data.get("delivery_cost", 0),
        "currency": order_data.get("currency", "BYN"),
        "status": order_data.get("status", "pending"),
        "delivery_type": order_data.get("delivery_type", "pickup"),
        "pickup_point_name": order_data.get("pickup_point_name"),
        "delivery_address": order_data.get("delivery_address"),
        "comment": order_data.get("comment"),
        "promocode": order_data.get("promocode"),
        "created_at": datetime.now().strftime("%d.%m.%Y %H:%M"),
    }
    
    orders.insert(0, new_order)
    save_json(ORDERS_FILE, orders)
    return new_order


def update_order_status(order_id: int, new_status: str) -> Optional[Dict[str, Any]]:
    orders = get_all_orders()
    for o in orders:
        if o.get("id") == int(order_id):
            o["status"] = new_status
            save_json(ORDERS_FILE, orders)
            return o
    return None


def get_parser_settings() -> Dict[str, Any]:
    default = {
        "stop_words": [],
        "keywords": [],
        "blacklist": [],
        "enabled": True,
        "group_id": PARSER_GROUP_ID
    }
    return load_json(PARSER_SETTINGS_FILE, default)


def save_parser_settings(settings: Dict[str, Any]) -> None:
    save_json(PARSER_SETTINGS_FILE, settings)


def get_watched_chats() -> Dict[str, Any]:
    default = {
        "chats": [],
        "enabled": True
    }
    return load_json(WATCHED_CHATS_FILE, default)


def save_watched_chats(watched: Dict[str, Any]) -> None:
    save_json(WATCHED_CHATS_FILE, watched)


def check_message_for_keywords(text: str, settings: Dict[str, Any]) -> Optional[str]:
    if not settings.get("enabled", True):
        return None
    
    stop_words = settings.get("stop_words", [])
    keywords = settings.get("keywords", [])
    
    if not keywords:
        return None
    
    text_lower = text.lower()
    
    for stop_word in stop_words:
        if stop_word.lower() in text_lower:
            return None
    
    for keyword in keywords:
        if keyword.lower() in text_lower:
            return keyword
    
    return None


def notify_twink_reload():
    """Уведомить Twink о перезагрузке чатов"""
    # Парсер теперь беспортовый и считывает JSON файлы конфигурации динамически при каждом входящем событии.
    # Поэтому ручной вызов HTTP эндпоинта больше не требуется, файлы синхронизированы автоматически.
    logger.info("⚙️ Настройки сохранены и синхронизированы на диске.")


# ================= КЛАВИАТУРЫ =================
def get_main_keyboard(user_id: int) -> ReplyKeyboardMarkup:
    buttons = [
        [KeyboardButton("📦 Мои заказы"), KeyboardButton("📖 Помощь / Связь")],
    ]
    if is_admin(user_id):
        buttons.append([KeyboardButton("👑 Панель управления")])
        buttons.append([KeyboardButton("🔍 Парсер")])
        
    return ReplyKeyboardMarkup(buttons, resize_keyboard=True, is_persistent=True)


def get_admin_order_keyboard(order_id: int, user_id: int) -> InlineKeyboardMarkup:
    keyboard = [
        [
            InlineKeyboardButton("✅ Подтвердить", callback_data=f"status_{order_id}_confirmed"),
            InlineKeyboardButton("🚚 Отправлен", callback_data=f"status_{order_id}_shipped"),
        ],
        [
            InlineKeyboardButton("🎉 Выполнен", callback_data=f"status_{order_id}_completed"),
            InlineKeyboardButton("❌ Отменить", callback_data=f"status_{order_id}_cancelled"),
        ],
        [
            InlineKeyboardButton("✉️ Написать покупателю", url=f"tg://user?id={user_id}"),
        ]
    ]
    return InlineKeyboardMarkup(keyboard)


def get_parser_admin_keyboard() -> InlineKeyboardMarkup:
    settings = get_parser_settings()
    status_text = "🟢 Включен" if settings.get("enabled", True) else "🔴 Выключен"
    
    keyboard = [
        [InlineKeyboardButton(f"📊 Парсер: {status_text}", callback_data="parser_toggle")],
        [InlineKeyboardButton("🔑 Ключевые слова", callback_data="parser_keywords")],
        [InlineKeyboardButton("🚫 Стоп-слова", callback_data="parser_stopwords")],
        [InlineKeyboardButton("⛔ Чёрный список", callback_data="parser_blacklist")],
        [InlineKeyboardButton("📢 Управление чатами", callback_data="parser_chats")],
        [InlineKeyboardButton("📋 Сводный отчёт", callback_data="parser_show")],
        [InlineKeyboardButton("◀️ В админ-панель", callback_data="back_to_admin")]
    ]
    return InlineKeyboardMarkup(keyboard)


def get_keywords_admin_keyboard() -> InlineKeyboardMarkup:
    settings = get_parser_settings()
    keywords = settings.get("keywords", [])
    
    keyboard = []
    
    if keywords:
        for idx, kw in enumerate(keywords[:15]):
            display = str(kw)
            if len(display) > 20:
                display = display[:17] + "..."
            keyboard.append([
                InlineKeyboardButton(f"🗑️ {display}", callback_data=f"remove_kw_{idx}")
            ])
        if len(keywords) > 15:
            keyboard.append([
                InlineKeyboardButton(f"📊 Всего {len(keywords)} ключевых слов", callback_data="parser_keywords_info")
            ])
    else:
        keyboard.append([
            InlineKeyboardButton("📭 Нет ключевых слов", callback_data="no_keywords")
        ])
        
    keyboard.extend([
        [InlineKeyboardButton("➕ Добавить ключевое слово", callback_data="parser_add_keyword")],
        [InlineKeyboardButton("◀️ Назад в парсер", callback_data="back_to_parser")]
    ])
    return InlineKeyboardMarkup(keyboard)


def get_stopwords_admin_keyboard() -> InlineKeyboardMarkup:
    settings = get_parser_settings()
    stop_words = settings.get("stop_words", [])
    
    keyboard = []
    
    if stop_words:
        for idx, sw in enumerate(stop_words[:15]):
            display = str(sw)
            if len(display) > 20:
                display = display[:17] + "..."
            keyboard.append([
                InlineKeyboardButton(f"🗑️ {display}", callback_data=f"remove_sw_{idx}")
            ])
        if len(stop_words) > 15:
            keyboard.append([
                InlineKeyboardButton(f"📊 Всего {len(stop_words)} стоп-слов", callback_data="parser_stopwords_info")
            ])
    else:
        keyboard.append([
            InlineKeyboardButton("📭 Нет стоп-слов", callback_data="no_stopwords")
        ])
        
    keyboard.extend([
        [InlineKeyboardButton("➕ Добавить стоп-слово", callback_data="parser_add_stop")],
        [InlineKeyboardButton("◀️ Назад в парсер", callback_data="back_to_parser")]
    ])
    return InlineKeyboardMarkup(keyboard)


def get_blacklist_admin_keyboard() -> InlineKeyboardMarkup:
    settings = get_parser_settings()
    blacklist = settings.get("blacklist", [])
    
    keyboard = []
    
    if blacklist:
        for idx, bl in enumerate(blacklist[:15]):
            display = str(bl)
            if len(display) > 20:
                display = display[:17] + "..."
            keyboard.append([
                InlineKeyboardButton(f"🗑️ {display}", callback_data=f"remove_bl_{idx}")
            ])
        if len(blacklist) > 15:
            keyboard.append([
                InlineKeyboardButton(f"📊 Всего {len(blacklist)} в чёрном списке", callback_data="parser_blacklist_info")
            ])
    else:
        keyboard.append([
            InlineKeyboardButton("📭 Чёрный список пуст", callback_data="no_blacklist")
        ])
        
    keyboard.extend([
        [InlineKeyboardButton("➕ Добавить в чёрный список", callback_data="parser_add_blacklist")],
        [InlineKeyboardButton("◀️ Назад в парсер", callback_data="back_to_parser")]
    ])
    return InlineKeyboardMarkup(keyboard)


async def show_keywords_panel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    settings = get_parser_settings()
    keywords = settings.get("keywords", [])
    
    text = (
        f"🔑 <b>Управление ключевыми словами</b>\n\n"
        f"Здесь отображается список ваших ключевых слов ({len(keywords)} шт.).\n"
        f"При клике на слово с иконкой 🗑️ оно будет <b>удалено мгновенно</b>!\n\n"
        f"Для добавления нового слова нажмите кнопку ниже."
    )
    
    if query:
        await query.edit_message_text(
            text,
            parse_mode="HTML",
            reply_markup=get_keywords_admin_keyboard()
        )
    else:
        await update.message.reply_text(
            text,
            parse_mode="HTML",
            reply_markup=get_keywords_admin_keyboard()
        )


async def show_stopwords_panel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    settings = get_parser_settings()
    stop_words = settings.get("stop_words", [])
    
    text = (
        f"🚫 <b>Управление стоп-словами</b>\n\n"
        f"Здесь отображается список ваших стоп-слов ({len(stop_words)} шт.).\n"
        f"При клике на слово с иконкой 🗑️ оно будет <b>удалено мгновенно</b>!\n\n"
        f"Для добавления нового слова нажмите кнопку ниже."
    )
    
    if query:
        await query.edit_message_text(
            text,
            parse_mode="HTML",
            reply_markup=get_stopwords_admin_keyboard()
        )
    else:
        await update.message.reply_text(
            text,
            parse_mode="HTML",
            reply_markup=get_stopwords_admin_keyboard()
        )


async def show_blacklist_panel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    settings = get_parser_settings()
    blacklist = settings.get("blacklist", [])
    
    text = (
        f"⛔ <b>Управление чёрным списком</b>\n\n"
        f"Здесь отображаются ID пользователей в чёрном списке ({len(blacklist)} шт.).\n"
        f"Сообщения от этих пользователей будут игнорироваться парсером.\n"
        f"При клике на ID с иконкой 🗑️ он будет <b>удален мгновенно</b>!\n\n"
        f"Для добавления нового ID нажмите кнопку ниже."
    )
    
    if query:
        await query.edit_message_text(
            text,
            parse_mode="HTML",
            reply_markup=get_blacklist_admin_keyboard()
        )
    else:
        await update.message.reply_text(
            text,
            parse_mode="HTML",
            reply_markup=get_blacklist_admin_keyboard()
        )


def get_chats_admin_keyboard() -> InlineKeyboardMarkup:
    watched = get_watched_chats()
    chats = watched.get("chats", [])
    
    keyboard = []
    
    if chats:
        for chat in chats[:10]:
            display = str(chat)
            if len(display) > 20:
                display = display[:17] + "..."
            keyboard.append([
                InlineKeyboardButton(f"🗑️ {display}", callback_data=f"remove_chat_{chat}")
            ])
        if len(chats) > 10:
            keyboard.append([
                InlineKeyboardButton(f"📊 Всего {len(chats)} чатов", callback_data="show_all_chats")
            ])
    else:
        keyboard.append([
            InlineKeyboardButton("📭 Нет чатов", callback_data="no_chats")
        ])
    
    keyboard.extend([
        [InlineKeyboardButton("➕ Добавить чат", callback_data="add_chat_dialog")],
        [InlineKeyboardButton("◀️ Назад в парсер", callback_data="back_to_parser")]
    ])
    
    return InlineKeyboardMarkup(keyboard)


def get_parsed_message_keyboard(user_id: int, username: str = None) -> InlineKeyboardMarkup:
    # Очищаем юзернейм от символа @
    clean_username = username.replace("@", "").strip() if username else None
    
    if clean_username and not clean_username.startswith("id"):
        dm_url = f"https://t.me/{clean_username}"
    else:
        dm_url = f"tg://user?id={user_id}"
        
    keyboard = [
        [
            InlineKeyboardButton("📩 Источник", url=dm_url),
            InlineKeyboardButton("💬 Личка", url=dm_url),
        ]
    ]
    return InlineKeyboardMarkup(keyboard)


# ================= ОБРАБОТЧИКИ КОМАНД БОТА =================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    save_user({
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
    })

    welcome_text = (
        f"👋 Привет, <b>{user.first_name}</b>!\n\n"
        f"Добро пожаловать в официальный бот <b>Puff Paradise</b> 💨\n\n"
        f"🛍️ Нажмите <b>«Открыть магазин»</b> для покупок\n"
        f"📦 <b>«Мои заказы»</b> — история ваших заказов\n"
        f"📖 <b>«Помощь»</b> — консультация и ответы на вопросы\n\n"
        f"📩 Наш менеджер: @{MANAGER_USERNAME}"
    )

    if is_admin(user.id):
        welcome_text += "\n\n👑 <i>Вы авторизованы как Администратор магазина!</i>"

    await update.message.reply_text(
        welcome_text,
        parse_mode="HTML",
        reply_markup=get_main_keyboard(user.id),
    )


async def admin_panel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    
    if not is_admin(user_id):
        await start(update, context)
        return
    
    orders = get_all_orders()
    pending_orders = [o for o in orders if o.get("status") == "pending"]
    completed_orders = [o for o in orders if o.get("status") == "completed"]
    revenue = sum(o.get("total", 0) for o in completed_orders)

    admin_text = (
        "👑 <b>Панель управления Puff Paradise</b>\n\n"
        f"📦 Всего заказов: {len(orders)}\n"
        f"⏳ Ожидают обработки: {len(pending_orders)}\n"
        f"💰 Выполнено заказов на сумму: {revenue} BYN\n\n"
        "Выберите раздел для управления:"
    )
    
    keyboard = [
        [InlineKeyboardButton("📦 Управление заказами", callback_data="admin_orders")],
        [InlineKeyboardButton("🔍 Настройка парсера", callback_data="admin_parser")],
        [InlineKeyboardButton("⚙️ Общие настройки", callback_data="admin_settings")],
    ]
    
    await update.message.reply_text(
        admin_text,
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def parser_panel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    
    if not is_admin(user_id):
        await update.message.reply_text("⛔ У вас нет прав доступа к парсеру.")
        return
    
    settings = get_parser_settings()
    watched = get_watched_chats()
    
    status_text = "🟢 Включен" if settings.get("enabled", True) else "🔴 Выключен"
    keywords_count = len(settings.get("keywords", []))
    stop_words_count = len(settings.get("stop_words", []))
    blacklist_count = len(settings.get("blacklist", []))
    chats_count = len(watched.get("chats", []))
    
    info_text = (
        f"🔍 <b>Настройки парсера</b>\n\n"
        f"📊 Status: {status_text}\n"
        f"📝 Ключевых слов: {keywords_count}\n"
        f"🚫 Стоп-слов: {stop_words_count}\n"
        f"⛔ В чёрном списке: {blacklist_count}\n"
        f"📢 Отслеживаемых чатов: {chats_count}\n\n"
        f"<i>Управляйте настройками с помощью кнопок ниже</i>"
    )
    
    await update.message.reply_text(
        info_text,
        parse_mode="HTML",
        reply_markup=get_parser_admin_keyboard(),
    )


async def shop(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("🛒 Открыть магазин Puff Paradise", web_app=WebAppInfo(url=WEBAPP_URL))]
    ]
    await update.message.reply_text(
        "💨 Нажмите на кнопку ниже, чтобы открыть наш каталог:",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = (
        "📖 <b>Справка и поддержка Puff Paradise:</b>\n\n"
        "1️⃣ Нажмите кнопку <b>«🛒 Открыть магазин»</b>\n"
        "2️⃣ Выберите нужные товары и добавьте их в корзину\n"
        "3️⃣ Оформите заказ (самовывоз из точки или доставка)\n"
        "4️⃣ Мы сразу получим заказ и свяжемся с вами!\n\n"
        "🚚 <b>Доставка:</b> по городу\n"
        "🏪 <b>Самовывоз:</b> из удобных точек выдачи\n"
        "💵 <b>Оплата:</b> наличными или картой при получении\n\n"
        f"💬 <b>Есть вопросы? Напишите менеджеру:</b> @{MANAGER_USERNAME}"
    )
    await update.message.reply_text(
        help_text,
        parse_mode="HTML",
        reply_markup=get_main_keyboard(update.effective_user.id),
    )


async def admin_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await admin_panel(update, context)


# ================= ОБРАБОТКА ДАННЫХ ИЗ WEBAPP =================
async def handle_webapp_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        raw_data = update.message.web_app_data.data
        data = json.loads(raw_data)
        user = update.effective_user
        
        logger.info(f"📥 Получен заказ из WebApp от user_id={user.id}")

        if data.get("action") == "order":
            items = data.get("items", [])
            total = data.get("total", 0)
            subtotal = data.get("subtotal", total)
            discount = data.get("discount", 0)
            delivery_cost = data.get("delivery_cost", 0)
            promocode = data.get("promocode")
            phone = data.get("phone", "Не указан")
            delivery_type = data.get("delivery_type", "pickup")
            pickup_point_name = data.get("pickup_point_name", "")
            delivery_address = data.get("delivery_address", "")
            comment = data.get("comment", "")

            saved_order = save_order({
                "id": data.get("order_id"),
                "user_id": user.id,
                "username": user.username or "user",
                "first_name": user.first_name or "",
                "phone": phone,
                "items": items,
                "total": total,
                "subtotal": subtotal,
                "discount": discount,
                "delivery_cost": delivery_cost,
                "delivery_type": delivery_type,
                "pickup_point_name": pickup_point_name,
                "delivery_address": delivery_address,
                "comment": comment,
                "promocode": promocode,
                "status": "pending",
            })
            order_id = saved_order["id"]

            items_list = "\n".join([
                f"  • {it.get('emoji', '📦')} <b>[{it.get('brand_name') or format_brand_slug(it.get('brand_slug'))}]</b> <b>{it.get('name')}</b> × {it.get('quantity', 1)} — {it.get('price')} BYN"
                if it.get('brand_name') or it.get('brand_slug') else
                f"  • {it.get('emoji', '📦')} <b>{it.get('name')}</b> × {it.get('quantity', 1)} — {it.get('price')} BYN"
                for it in items
            ])

            delivery_label = (
                f"🏪 Самовывоз: <b>{pickup_point_name or 'Точка выдачи'}</b>"
                if delivery_type == "pickup"
                else f"🚚 Доставка: <b>{delivery_address or 'Адрес не указан'}</b> (+{delivery_cost} BYN)"
            )

            price_summary = f"💰 <b>Итого к оплате:</b> {total} BYN"
            if discount > 0:
                price_summary += f"\n   <i>Скидка по промокоду: -{discount} BYN</i>"
            if promocode:
                price_summary += f"\n   <i>Промокод: {promocode}</i>"

            admin_msg = (
                f"🆕 <b>НОВЫЙ ЗАКАЗ #{order_id}!</b>\n\n"
                f"👤 <b>Покупатель:</b> @{user.username or 'не_указан'} ({user.first_name})\n"
                f"🆔 <b>User ID:</b> <code>{user.id}</code>\n"
                f"📱 <b>Телефон:</b> {phone}\n\n"
                f"📦 <b>Состав заказа:</b>\n{items_list}\n\n"
                f"{price_summary}\n\n"
                f"📍 <b>Способ получения:</b> {delivery_label}\n"
                f"💬 <b>Комментарий:</b> {comment or 'Нет'}\n\n"
                f"🔗 <a href=\"tg://user?id={user.id}\">✉️ Написать покупателю</a>"
            )

            for admin_id in HARDCODED_ADMINS:
                try:
                    await context.bot.send_message(
                        chat_id=admin_id,
                        text=admin_msg,
                        parse_mode="HTML",
                        reply_markup=get_admin_order_keyboard(order_id, user.id),
                    )
                    logger.info(f"✅ Уведомление о заказе #{order_id} отправлено админу {admin_id}")
                except Exception as e:
                    logger.error(f"❌ Ошибка отправки админу {admin_id}: {e}")

            customer_msg = (
                f"✅ <b>Заказ #{order_id} успешно принят!</b>\n\n"
                f"📦 <b>Товары:</b>\n{items_list}\n\n"
                f"{price_summary}\n\n"
                f"📍 <b>Получение:</b> {delivery_label}\n\n"
                f"🙏 Спасибо за покупку! Мы уже собираем ваш заказ.\n\n"
                f"📩 По всем вопросам: @{MANAGER_USERNAME}"
            )

            await update.message.reply_text(
                customer_msg,
                parse_mode="HTML",
                reply_markup=get_main_keyboard(user.id),
            )

    except Exception as e:
        logger.error(f"❌ Ошибка обработки webapp data: {e}", exc_info=True)
        await update.message.reply_text(
            f"❌ Произошла ошибка при сохранении заказа. Пожалуйста, напишите нашему менеджеру: @{MANAGER_USERNAME}",
            reply_markup=get_main_keyboard(update.effective_user.id),
        )


# ================= ПАРСЕР СООБЩЕНИЙ =================
async def send_to_parser_group(context: ContextTypes.DEFAULT_TYPE, message_text: str, user_id: int, username: str = None) -> bool:
    try:
        keyboard = get_parsed_message_keyboard(user_id, username)
        
        await context.bot.send_message(
            chat_id=PARSER_GROUP_ID,
            text=message_text,
            parse_mode="HTML",
            reply_markup=keyboard,
            disable_web_page_preview=True
        )
        logger.info(f"✅ Спаршенное сообщение отправлено в группу {PARSER_GROUP_ID}")
        return True
    except Exception as e:
        logger.error(f"❌ Ошибка отправки в группу: {e}")
        return False


async def handle_messages_for_parser(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.is_bot:
        return
    
    if update.message.text and update.message.text.startswith('/'):
        return
    
    user_id = update.effective_user.id
    text = update.message.text or update.message.caption or ""
    
    if not text:
        return
    
    settings = get_parser_settings()
    
    if not settings.get("enabled", True):
        return
    
    if user_id in settings.get("blacklist", []):
        logger.info(f"⛔ Пользователь {user_id} в чёрном списке")
        return
    
    found_keyword = check_message_for_keywords(text, settings)
    if not found_keyword:
        return
    
    user = update.effective_user
    username = f"@{user.username}" if user.username else f"id{user.id}"
    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or "Пользователь"
    
    message_text = (
        f"🔍 <b>Обнаружено ключевое слово:</b> <code>{found_keyword}</code>\n\n"
        f"👤 <b>Пользователь:</b> {username}\n"
        f"📛 <b>Имя:</b> {full_name}\n"
        f"🆔 <b>User ID:</b> <code>{user_id}</code>\n\n"
        f"📝 <b>Сообщение:</b>\n{text[:2000]}"
    )
    
    await send_to_parser_group(context, message_text, user_id, user.username)


# ================= ОБРАБОТЧИКИ ГРУППЫ =================
async def handle_group_messages(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.chat_id != PARSER_GROUP_ID:
        return
    
    if update.effective_user.is_bot:
        return


# ================= ОБРАБОТКА ИНЛАЙН КНОПОК =================
async def handle_callback_query(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    data = query.data
    user_id = update.effective_user.id

    if not is_admin(user_id):
        await query.answer("⛔ Нет прав", show_alert=True)
        return

    # ===== АДМИН ПАНЕЛЬ =====
    if data == "admin_orders":
        await query.edit_message_text(
            "📦 <b>Управление заказами</b>\n\nИспользуйте WebApp для управления заказами:",
            parse_mode="HTML",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🛒 Открыть админку", web_app=WebAppInfo(url=WEBAPP_URL))],
                [InlineKeyboardButton("◀️ Назад", callback_data="back_to_admin")]
            ])
        )
        return
    
    elif data == "admin_parser":
        settings = get_parser_settings()
        watched = get_watched_chats()
        
        status_text = "🟢 Включен" if settings.get("enabled", True) else "🔴 Выключен"
        
        info_text = (
            f"🔍 <b>Настройки парсера</b>\n\n"
            f"📊 Статус: {status_text}\n"
            f"📝 Ключевых слов: {len(settings.get('keywords', []))}\n"
            f"🚫 Стоп-слов: {len(settings.get('stop_words', []))}\n"
            f"⛔ В чёрном списке: {len(settings.get('blacklist', []))}\n"
            f"📢 Отслеживаемых чатов: {len(watched.get('chats', []))}\n\n"
            f"<i>Управляйте настройками с помощью кнопок ниже</i>"
        )
        
        await query.edit_message_text(
            info_text,
            parse_mode="HTML",
            reply_markup=get_parser_admin_keyboard(),
        )
        return
    
    elif data == "admin_settings":
        await query.edit_message_text(
            "⚙️ <b>Общие настройки</b>\n\nЗдесь будут общие настройки бота.",
            parse_mode="HTML",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("◀️ Назад", callback_data="back_to_admin")]
            ])
        )
        return
    
    elif data == "back_to_admin":
        orders = get_all_orders()
        pending_orders = [o for o in orders if o.get("status") == "pending"]
        completed_orders = [o for o in orders if o.get("status") == "completed"]
        revenue = sum(o.get("total", 0) for o in completed_orders)

        admin_text = (
            "👑 <b>Панель управления Puff Paradise</b>\n\n"
            f"📦 Всего заказов: {len(orders)}\n"
            f"⏳ Ожидают обработки: {len(pending_orders)}\n"
            f"💰 Выполнено заказов на сумму: {revenue} BYN\n\n"
            "Выберите раздел для управления:"
        )
        keyboard = [
            [InlineKeyboardButton("📦 Управление заказами", callback_data="admin_orders")],
            [InlineKeyboardButton("🔍 Настройка парсера", callback_data="admin_parser")],
            [InlineKeyboardButton("⚙️ Общие настройки", callback_data="admin_settings")],
        ]
        await query.edit_message_text(
            admin_text,
            parse_mode="HTML",
            reply_markup=InlineKeyboardMarkup(keyboard),
        )
        return

    # ===== ПАРСЕР - УПРАВЛЕНИЕ ЧАТАМИ =====
    elif data == "parser_chats":
        await show_chats_panel(update, context)
        return
    
    elif data == "back_to_parser":
        settings = get_parser_settings()
        watched = get_watched_chats()
        status_text = "🟢 Включен" if settings.get("enabled", True) else "🔴 Выключен"
        info_text = (
            f"🔍 <b>Настройки парсера</b>\n\n"
            f"📊 Статус: {status_text}\n"
            f"📝 Ключевых слов: {len(settings.get('keywords', []))}\n"
            f"🚫 Стоп-слов: {len(settings.get('stop_words', []))}\n"
            f"⛔ В чёрном списке: {len(settings.get('blacklist', []))}\n"
            f"📢 Отслеживаемых чатов: {len(watched.get('chats', []))}\n\n"
            f"<i>Управляйте настройками с помощью кнопок ниже</i>"
        )
        await query.edit_message_text(
            info_text,
            parse_mode="HTML",
            reply_markup=get_parser_admin_keyboard(),
        )
        return
    
    elif data == "add_chat_dialog":
        context.user_data["expecting_chat_input"] = True
        await query.edit_message_text(
            "✏️ <b>Введите ID или ссылку на чат</b>\n\n"
            "Примеры:\n"
            "• <code>-1001234567890</code> - ID группы\n"
            "• <code>@channel_username</code> - username канала\n"
            "• <code>https://t.me/channel</code> - ссылка\n\n"
            "Для отмены нажмите кнопку ниже",
            parse_mode="HTML",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("❌ Отмена", callback_data="back_to_chats")]
            ])
        )
        return
    
    elif data.startswith("remove_chat_"):
        chat_id_str = data.replace("remove_chat_", "")
        
        try:
            chat_id = int(chat_id_str)
        except ValueError:
            chat_id = chat_id_str
        
        watched = get_watched_chats()
        if chat_id in watched["chats"]:
            watched["chats"].remove(chat_id)
            save_watched_chats(watched)
            notify_twink_reload()
            await query.answer("✅ Чат удалён", show_alert=True)
            await show_chats_panel(update, context)
        else:
            # Попробуем сравнить как строку
            str_chats = [str(c) for c in watched["chats"]]
            if str(chat_id) in str_chats:
                idx = str_chats.index(str(chat_id))
                watched["chats"].pop(idx)
                save_watched_chats(watched)
                notify_twink_reload()
                await query.answer("✅ Чат удалён", show_alert=True)
                await show_chats_panel(update, context)
            else:
                await query.answer("❌ Чат не найден", show_alert=True)
        return

    elif data.startswith("remove_kw_"):
        idx_str = data.replace("remove_kw_", "")
        try:
            idx = int(idx_str)
            settings = get_parser_settings()
            keywords = settings.get("keywords", [])
            if 0 <= idx < len(keywords):
                removed_kw = keywords.pop(idx)
                save_parser_settings(settings)
                await query.answer(f"✅ Ключевое слово '{removed_kw}' удалено", show_alert=True)
                await show_keywords_panel(update, context)
            else:
                await query.answer("❌ Слово не найдено", show_alert=True)
        except Exception as e:
            await query.answer(f"❌ Ошибка удаления: {e}", show_alert=True)
        return

    elif data.startswith("remove_sw_"):
        idx_str = data.replace("remove_sw_", "")
        try:
            idx = int(idx_str)
            settings = get_parser_settings()
            stop_words = settings.get("stop_words", [])
            if 0 <= idx < len(stop_words):
                removed_sw = stop_words.pop(idx)
                save_parser_settings(settings)
                await query.answer(f"✅ Стоп-слово '{removed_sw}' удалено", show_alert=True)
                await show_stopwords_panel(update, context)
            else:
                await query.answer("❌ Слово не найдено", show_alert=True)
        except Exception as e:
            await query.answer(f"❌ Ошибка удаления: {e}", show_alert=True)
        return

    elif data.startswith("remove_bl_"):
        idx_str = data.replace("remove_bl_", "")
        try:
            idx = int(idx_str)
            settings = get_parser_settings()
            blacklist = settings.get("blacklist", [])
            if 0 <= idx < len(blacklist):
                removed_bl = blacklist.pop(idx)
                save_parser_settings(settings)
                await query.answer(f"✅ ID {removed_bl} удален из чёрного списка", show_alert=True)
                await show_blacklist_panel(update, context)
            else:
                await query.answer("❌ Пользователь не найден", show_alert=True)
        except Exception as e:
            await query.answer(f"❌ Ошибка удаления: {e}", show_alert=True)
        return
    
    elif data == "back_to_chats":
        await show_chats_panel(update, context)
        return
    
    elif data == "show_all_chats":
        watched = get_watched_chats()
        chats = watched.get("chats", [])
        
        if not chats:
            await query.answer("Нет чатов", show_alert=True)
            return
        
        chat_list = "\n".join([f"• <code>{chat}</code>" for chat in chats])
        
        await query.edit_message_text(
            f"📊 <b>Все отслеживаемые чаты ({len(chats)})</b>\n\n{chat_list}\n\n"
            f"<i>Для удаления нажмите на кнопку с названием чата</i>",
            parse_mode="HTML",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("◀️ Назад", callback_data="parser_chats")]
            ])
        )
        return

    # ===== ПАРСЕР - ОСНОВНЫЕ НАСТРОЙКИ =====
    elif data.startswith("parser_"):
        action = data.replace("parser_", "")
        
        if action == "keywords":
            await show_keywords_panel(update, context)
            return
            
        elif action == "stopwords":
            await show_stopwords_panel(update, context)
            return
            
        elif action == "blacklist":
            await show_blacklist_panel(update, context)
            return

        elif action == "status":
            settings = get_parser_settings()
            status = "включен ✅" if settings.get("enabled", True) else "выключен ❌"
            await query.answer(f"Парсер {status}", show_alert=True)
            return
        
        elif action == "toggle":
            settings = get_parser_settings()
            settings["enabled"] = not settings.get("enabled", True)
            save_parser_settings(settings)
            status = "включен ✅" if settings["enabled"] else "выключен ❌"
            await query.answer(f"Парсер {status}", show_alert=True)
            
            # Обновляем панель
            watched = get_watched_chats()
            status_text = "🟢 Включен" if settings.get("enabled", True) else "🔴 Выключен"
            info_text = (
                f"🔍 <b>Настройки парсера</b>\n\n"
                f"📊 Статус: {status_text}\n"
                f"📝 Ключевых слов: {len(settings.get('keywords', []))}\n"
                f"🚫 Стоп-слов: {len(settings.get('stop_words', []))}\n"
                f"⛔ В чёрном списке: {len(settings.get('blacklist', []))}\n"
                f"📢 Отслеживаемых чатов: {len(watched.get('chats', []))}\n\n"
                f"<i>Управляйте настройками с помощью кнопок ниже</i>"
            )
            await query.edit_message_text(
                info_text,
                parse_mode="HTML",
                reply_markup=get_parser_admin_keyboard(),
            )
            return
        
        elif action in ["add_stop", "add_keyword", "add_blacklist"]:
            context.user_data["parser_action"] = action
            context.user_data["expecting_input"] = True
            
            type_names = {
                "add_stop": "стоп-слово",
                "add_keyword": "ключевое слово",
                "add_blacklist": "ID пользователя"
            }
            
            await query.edit_message_text(
                f"✏️ Введите <b>{type_names[action]}</b> для добавления:\n\n"
                f"<i>Отправьте одним сообщением. Для отмены нажмите кнопку</i>",
                parse_mode="HTML",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("❌ Отмена", callback_data="parser_cancel_input")]
                ])
            )
            return
        
        elif action == "show":
            settings = get_parser_settings()
            watched = get_watched_chats()
            
            keywords = settings.get("keywords", [])
            stop_words = settings.get("stop_words", [])
            blacklist = settings.get("blacklist", [])
            chats = watched.get("chats", [])
            
            text = "📋 <b>Полные настройки парсера</b>\n\n"
            
            text += f"🔑 <b>Ключевые слова ({len(keywords)}):</b>\n"
            if keywords:
                text += "\n".join([f"  • {kw}" for kw in keywords[:30]])
                if len(keywords) > 30:
                    text += f"\n  ... и ещё {len(keywords) - 30}"
            else:
                text += "  <i>(пусто)</i>"
            
            text += f"\n\n🚫 <b>Стоп-слова ({len(stop_words)}):</b>\n"
            if stop_words:
                text += "\n".join([f"  • {sw}" for sw in stop_words[:30]])
                if len(stop_words) > 30:
                    text += f"\n  ... и ещё {len(stop_words) - 30}"
            else:
                text += "  <i>(пусто)</i>"
            
            text += f"\n\n⛔ <b>Чёрный список ({len(blacklist)}):</b>\n"
            if blacklist:
                text += "\n".join([f"  • {uid}" for uid in blacklist[:30]])
                if len(blacklist) > 30:
                    text += f"\n  ... и ещё {len(blacklist) - 30}"
            else:
                text += "  <i>(пусто)</i>"
            
            text += f"\n\n📢 <b>Отслеживаемые чаты ({len(chats)}):</b>\n"
            if chats:
                text += "\n".join([f"  • <code>{chat}</code>" for chat in chats[:10]])
                if len(chats) > 10:
                    text += f"\n  ... и ещё {len(chats) - 10}"
            else:
                text += "  <i>(пусто)</i>"
            
            await query.edit_message_text(
                text,
                parse_mode="HTML",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("◀️ Назад", callback_data="admin_parser")]
                ])
            )
            return
        
        elif action == "cancel_input":
            prev_action = context.user_data.get("parser_action")
            context.user_data.pop("expecting_input", None)
            context.user_data.pop("parser_action", None)
            context.user_data.pop("list_name", None)
            
            if prev_action == "add_keyword":
                await show_keywords_panel(update, context)
            elif prev_action == "add_stop":
                await show_stopwords_panel(update, context)
            elif prev_action == "add_blacklist":
                await show_blacklist_panel(update, context)
            else:
                settings = get_parser_settings()
                watched = get_watched_chats()
                status_text = "🟢 Включен" if settings.get("enabled", True) else "🔴 Выключен"
                info_text = (
                    f"🔍 <b>Настройки парсера</b>\n\n"
                    f"📊 Статус: {status_text}\n"
                    f"📝 Ключевых слов: {len(settings.get('keywords', []))}\n"
                    f"🚫 Стоп-слов: {len(settings.get('stop_words', []))}\n"
                    f"⛔ В чёрном списке: {len(settings.get('blacklist', []))}\n"
                    f"📢 Отслеживаемых чатов: {len(watched.get('chats', []))}\n\n"
                    f"<i>Управляйте настройками с помощью кнопок ниже</i>"
                )
                await query.edit_message_text(
                    info_text,
                    parse_mode="HTML",
                    reply_markup=get_parser_admin_keyboard(),
                )
            return

    # ===== КНОПКИ СПАРШЕННЫХ СООБЩЕНИЙ =====
    elif data.startswith("source_"):
        parts = data.split("_")
        target_user_id = int(parts[1])
        
        try:
            try:
                user = await context.bot.get_chat(target_user_id)
                username = f"@{user.username}" if user.username else f"id{target_user_id}"
            except Exception:
                username = f"id{target_user_id}"
            
            alert_text = (
                f"👤 Пользователь: {username}\n"
                f"🆔 User ID: {target_user_id}\n\n"
                f"Чтобы написать ему через бота, отправьте в ЛИЧКУ боту:\n"
                f"/msg {target_user_id} Ваше сообщение"
            )
            await query.answer(alert_text, show_alert=True)
        except Exception as e:
            logger.error(f"Ошибка получения пользователя: {e}")
            await query.answer("Не удалось получить информацию", show_alert=True)
        return
    
    elif data.startswith("dm_"):
        parts = data.split("_")
        target_user_id = int(parts[1])
        
        alert_text = (
            f"💬 Отправить сообщение пользователю (ID: {target_user_id})\n\n"
            f"Напишите в ЛИЧКУ боту команду:\n"
            f"/msg {target_user_id} Ваше сообщение"
        )
        await query.answer(alert_text, show_alert=True)
        return

    # ===== СТАТУС ЗАКАЗОВ =====
    elif data.startswith("status_"):
        parts = data.split("_")
        order_id = int(parts[1])
        new_status = parts[2]

        status_names = {
            "confirmed": "Подтвержден ✅",
            "shipped": "Отправлен / В пути 🚚",
            "completed": "Выполнен 🎉",
            "cancelled": "Отменен ❌",
        }

        updated = update_order_status(order_id, new_status)
        if updated:
            status_text = status_names.get(new_status, new_status)
            
            try:
                await query.edit_message_caption(
                    caption=f"{query.message.text or ''}\n\n<b>Статус обновлен на:</b> {status_text}",
                    parse_mode="HTML",
                )
            except Exception:
                await query.edit_message_text(
                    text=f"{query.message.text}\n\n🔄 <b>Статус изменен:</b> {status_text}",
                    parse_mode="HTML",
                    reply_markup=get_admin_order_keyboard(order_id, updated["user_id"]),
                )

            customer_status_messages = {
                "confirmed": f"✅ Ваш заказ #{order_id} <b>ПОДТВЕРЖДЕН</b>!\n\nМы приступили к его сборке.\n\n📩 Менеджер: @{MANAGER_USERNAME}",
                "shipped": f"🚚 Ваш заказ #{order_id} <b>ОТПРАВЛЕН</b> / передан курьеру!\n\nОжидайте прибытия.\n\n📩 Менеджер: @{MANAGER_USERNAME}",
                "completed": f"🎉 Ваш заказ #{order_id} <b>ВЫПОЛНЕН</b>!\n\nБлагодарим за выбор Puff Paradise! Приходите снова ❤️\n\n📩 Менеджер: @{MANAGER_USERNAME}",
                "cancelled": f"❌ Заказ #{order_id} был <b>ОТМЕНЕН</b>.\n\nЕсли это ошибка, напишите нам: @{MANAGER_USERNAME}",
            }

            customer_msg = customer_status_messages.get(new_status)
            if customer_msg and updated.get("user_id"):
                try:
                    await context.bot.send_message(
                        chat_id=updated["user_id"],
                        text=customer_msg,
                        parse_mode="HTML",
                    )
                except Exception as e:
                    logger.error(f"Не удалось отправить уведомление покупателю {updated['user_id']}: {e}")


async def show_chats_panel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать панель управления чатами"""
    watched = get_watched_chats()
    chats = watched.get("chats", [])
    
    chat_list = "\n".join([f"• <code>{chat}</code>" for chat in chats[:5]]) if chats else "📭 Нет чатов"
    if len(chats) > 5:
        chat_list += f"\n... и ещё {len(chats) - 5} чатов"
    
    text = (
        f"📢 <b>Управление чатами для парсинга</b>\n\n"
        f"Всего чатов: {len(chats)}\n\n"
        f"{chat_list}\n\n"
        f"<i>Нажмите «➕ Добавить чат» чтобы добавить новый чат для отслеживания</i>\n"
        f"<i>Нажмите на чат чтобы удалить его</i>"
    )
    
    await update.callback_query.edit_message_text(
        text,
        parse_mode="HTML",
        reply_markup=get_chats_admin_keyboard()
    )


# ================= ОБРАБОТЧИК ВВОДА =================
async def handle_parser_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    
    if not is_admin(user_id):
        return
    
    if not context.user_data.get("expecting_input"):
        return
    
    text = update.message.text.strip()
    action = context.user_data.get("parser_action")
    
    if not action:
        return
    
    context.user_data["expecting_input"] = False
    settings = get_parser_settings()
    
    try:
        if action == "add_stop":
            if text in settings.get("stop_words", []):
                await update.message.reply_text("⚠️ Такое стоп-слово уже существует.")
            else:
                settings.setdefault("stop_words", []).append(text)
                save_parser_settings(settings)
                await update.message.reply_text(f"✅ Стоп-слово <code>{text}</code> добавлено!")
            
        elif action == "add_keyword":
            if text in settings.get("keywords", []):
                await update.message.reply_text("⚠️ Такое ключевое слово уже существует.")
            else:
                settings.setdefault("keywords", []).append(text)
                save_parser_settings(settings)
                await update.message.reply_text(f"✅ Ключевое слово <code>{text}</code> добавлено!")
            
        elif action == "add_blacklist":
            try:
                user_id_int = int(text)
                if user_id_int in settings.get("blacklist", []):
                    await update.message.reply_text("⚠️ Этот пользователь уже в чёрном списке.")
                else:
                    settings.setdefault("blacklist", []).append(user_id_int)
                    save_parser_settings(settings)
                    await update.message.reply_text(f"✅ ID {user_id_int} добавлен в чёрный список!")
            except ValueError:
                await update.message.reply_text("❌ Некорректный ID пользователя. Введите число.")
    
    except Exception as e:
        logger.error(f"Ошибка обработки ввода парсера: {e}")
        await update.message.reply_text(f"❌ Произошла ошибка: {e}")
    
    finally:
        context.user_data.pop("parser_action", None)
        context.user_data.pop("list_name", None)
        
        if action == "add_keyword":
            await show_keywords_panel(update, context)
        elif action == "add_stop":
            await show_stopwords_panel(update, context)
        elif action == "add_blacklist":
            await show_blacklist_panel(update, context)
        else:
            await parser_panel(update, context)


async def handle_chat_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка ввода для добавления чата"""
    user_id = update.effective_user.id
    
    if not is_admin(user_id):
        return
    
    if not context.user_data.get("expecting_chat_input"):
        return
    
    text = update.message.text.strip()
    context.user_data["expecting_chat_input"] = False
    
    # Парсим ввод
    chat_id = text
    
    # Если это ссылка, извлекаем username или ID
    if 't.me/' in text:
        username = text.split('t.me/')[-1].split('/')[0]
        if username:
            chat_id = f"@{username}"
    
    # Если это username без @, добавляем @
    if isinstance(chat_id, str) and chat_id.startswith('@'):
        pass
    # Если это число, оставляем как есть
    elif isinstance(chat_id, str) and chat_id.lstrip('-').isdigit():
        chat_id = int(chat_id)
    else:
        # Если строка, но не юзернейм
        if isinstance(chat_id, str) and not chat_id.startswith('@'):
            chat_id = f"@{chat_id}"
    
    watched = get_watched_chats()
    
    if chat_id in watched["chats"]:
        await update.message.reply_text(f"⚠️ Чат <code>{chat_id}</code> уже отслеживается.", parse_mode="HTML")
        await parser_panel(update, context)
        return
    
    # Сравниваем также по строковому представлению во избежание дубликатов
    str_chats = [str(c) for c in watched["chats"]]
    if str(chat_id) in str_chats:
        await update.message.reply_text(f"⚠️ Чат <code>{chat_id}</code> уже отслеживается.", parse_mode="HTML")
        await parser_panel(update, context)
        return
        
    watched["chats"].append(chat_id)
    save_watched_chats(watched)
    notify_twink_reload()
    
    await update.message.reply_text(
        f"✅ Чат <code>{chat_id}</code> добавлен в отслеживание!",
        parse_mode="HTML"
    )
    await parser_panel(update, context)


async def cancel_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data.pop("expecting_input", None)
    context.user_data.pop("expecting_chat_input", None)
    context.user_data.pop("parser_action", None)
    context.user_data.pop("list_name", None)
    await update.message.reply_text("❌ Ввод отменён")
    await start(update, context)


# ================= КОМАНДА ДЛЯ ОТПРАВКИ СООБЩЕНИЙ =================
async def send_message_to_user(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    
    if not is_admin(user_id):
        await update.message.reply_text("⛔ У вас нет прав.")
        return
    
    if len(context.args) < 2:
        await update.message.reply_text(
            "❌ Использование: /msg <user_id> <текст сообщения>\n\n"
            "Пример: /msg 123456 Привет!"
        )
        return
    
    try:
        target_user_id = int(context.args[0])
        message_text = " ".join(context.args[1:])
        
        await context.bot.send_message(
            chat_id=target_user_id,
            text=f"📩 <b>Сообщение от администратора:</b>\n\n{message_text}\n\n"
                 f"📩 Менеджер: @{MANAGER_USERNAME}",
            parse_mode="HTML"
        )
        await update.message.reply_text(f"✅ Сообщение отправлено пользователю <code>{target_user_id}</code>")
    except ValueError:
        await update.message.reply_text("❌ Некорректный ID пользователя.")
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка отправки: {e}")


# ================= ТЕКСТОВЫЕ КНОПКИ МЕНЮ =================
async def handle_text_messages(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        text = update.message.text
        user_id = update.effective_user.id
        
        if context.user_data.get("expecting_input"):
            await handle_parser_input(update, context)
            return
        
        if context.user_data.get("expecting_chat_input"):
            await handle_chat_input(update, context)
            return

        if text == "🛒 Открыть магазин":
            keyboard = [
                [InlineKeyboardButton("🛒 Открыть магазин Puff Paradise", web_app=WebAppInfo(url=WEBAPP_URL))]
            ]
            await update.message.reply_text(
                "💨 Нажмите кнопку ниже для запуска каталога:",
                reply_markup=InlineKeyboardMarkup(keyboard),
            )

        elif text == "📦 Мои заказы":
            orders = get_all_orders()
            user_orders = [o for o in orders if o.get("user_id") == user_id]

            if not user_orders:
                await update.message.reply_text(
                    "📦 У вас пока нет оформленных заказов.\n"
                    "Нажмите «Открыть магазин», чтобы сделать свой первый заказ! 💨",
                    reply_markup=get_main_keyboard(user_id),
                )
                return

            orders_msg = "📦 <b>Ваши последние заказы:</b>\n\n"
            status_emojis = {
                "pending": "⏳ В обработке",
                "confirmed": "✅ Подтвержден",
                "shipped": "🚚 Отправлен",
                "completed": "🎉 Выполнен",
                "cancelled": "❌ Отменен",
            }

            for o in user_orders[:5]:
                status = status_emojis.get(o.get("status"), o.get("status"))
                orders_msg += (
                    f"• <b>Заказ #{o.get('id')}</b> на сумму {o.get('total')} BYN\n"
                    f"  Статус: {status} ({o.get('created_at', '')})\n\n"
                )

            orders_msg += f"📩 По всем вопросам: @{MANAGER_USERNAME}"
            await update.message.reply_text(
                orders_msg,
                parse_mode="HTML",
                reply_markup=get_main_keyboard(user_id),
            )

        elif text in ["📖 Помощь / Связь", "📖 Помощь"]:
            await help_command(update, context)

        elif text in ["👑 Панель управления", "👑 Админка"]:
            await admin_panel(update, context)
        
        elif text == "🔍 Парсер":
            await parser_panel(update, context)

        else:
            await update.message.reply_text(
                "Используйте кнопки меню ниже 👇",
                reply_markup=get_main_keyboard(user_id),
            )
    except Exception as e:
        logger.error(f"Ошибка в handle_text_messages: {e}", exc_info=True)


# ================= FLASK API =================
flask_app = Flask(__name__)
CORS(flask_app)


@flask_app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "app": "Puff Paradise Bot API"}), 200


@flask_app.route("/api/orders", methods=["GET", "POST"])
def get_orders_api():
    global tg_app
    if request.method == "POST":
        try:
            data = request.json or {}
            logger.info(f"📥 Получен POST запрос на создание заказа #{data.get('order_id') or 'новый'} в Flask API")
            
            saved_order = save_order({
                "id": data.get("order_id"),
                "user_id": data.get("user_id"),
                "username": data.get("username", "user"),
                "first_name": data.get("first_name", ""),
                "phone": data.get("phone", "Не указан"),
                "items": data.get("items", []),
                "total": data.get("total", 0),
                "subtotal": data.get("subtotal", data.get("total", 0)),
                "discount": data.get("discount", 0),
                "delivery_cost": data.get("delivery_cost", 0),
                "delivery_type": data.get("delivery_type", "pickup"),
                "pickup_point_name": data.get("pickup_point_name", ""),
                "delivery_address": data.get("delivery_address", ""),
                "comment": data.get("comment", ""),
                "promocode": data.get("promocode"),
                "status": "pending",
            })
            order_id = saved_order["id"]
            user_id = saved_order["user_id"]
            
            items = saved_order.get("items", [])
            items_list = "\n".join([
                f"  • {it.get('emoji', '📦')} <b>[{it.get('brand_name') or format_brand_slug(it.get('brand_slug'))}]</b> <b>{it.get('name')}</b> × {it.get('quantity', 1)} — {it.get('price')} BYN"
                if it.get('brand_name') or it.get('brand_slug') else
                f"  • {it.get('emoji', '📦')} <b>{it.get('name')}</b> × {it.get('quantity', 1)} — {it.get('price')} BYN"
                for it in items
            ])

            delivery_type = saved_order.get("delivery_type", "pickup")
            pickup_point_name = saved_order.get("pickup_point_name", "")
            delivery_address = saved_order.get("delivery_address", "")
            delivery_cost = saved_order.get("delivery_cost", 0)
            delivery_label = (
                f"🏪 Самовывоз: <b>{pickup_point_name or 'Точка выдачи'}</b>"
                if delivery_type == "pickup"
                else f"🚚 Доставка: <b>{delivery_address or 'Адрес не указан'}</b> (+{delivery_cost} BYN)"
            )

            total = saved_order.get("total", 0)
            discount = saved_order.get("discount", 0)
            promocode = saved_order.get("promocode")
            price_summary = f"💰 <b>Итого к оплате:</b> {total} BYN"
            if discount > 0:
                price_summary += f"\n   <i>Скидка по промокоду: -{discount} BYN</i>"
            if promocode:
                price_summary += f"\n   <i>Промокод: {promocode}</i>"

            comment = saved_order.get("comment", "")
            phone = saved_order.get("phone", "Не указан")

            admin_msg = (
                f"🆕 <b>НОВЫЙ ЗАКАЗ #{order_id}!</b>\n\n"
                f"👤 <b>Покупатель:</b> @{saved_order['username']} ({saved_order['first_name']})\n"
                f"🆔 <b>User ID:</b> <code>{user_id}</code>\n"
                f"📱 <b>Телефон:</b> {phone}\n\n"
                f"📦 <b>Состав заказа:</b>\n{items_list}\n\n"
                f"{price_summary}\n\n"
                f"📍 <b>Способ получения:</b> {delivery_label}\n"
                f"💬 <b>Комментарий:</b> {comment or 'Нет'}\n\n"
                f"🔗 <a href=\"tg://user?id={user_id}\">✉️ Написать покупателю</a>"
            )

            customer_msg = (
                f"✅ <b>Заказ #{order_id} успешно принят!</b>\n\n"
                f"📦 <b>Товары:</b>\n{items_list}\n\n"
                f"{price_summary}\n\n"
                f"📍 <b>Получение:</b> {delivery_label}\n\n"
                f"🙏 Спасибо за покупку! Мы уже собираем ваш заказ.\n\n"
                f"📩 По всем вопросам: @{MANAGER_USERNAME}"
            )

            async def send_notifications():
                if tg_app:
                    # 1. Отправить покупателю
                    try:
                        await tg_app.bot.send_message(
                            chat_id=user_id,
                            text=customer_msg,
                            parse_mode="HTML"
                        )
                        logger.info(f"✅ Уведомление о новом заказе #{order_id} отправлено покупателю {user_id}")
                    except Exception as e:
                        logger.error(f"❌ Ошибка отправки нового заказа покупателю {user_id}: {e}")
                    
                    # 2. Отправить админам
                    for admin_id in HARDCODED_ADMINS:
                        try:
                            await tg_app.bot.send_message(
                                chat_id=admin_id,
                                text=admin_msg,
                                parse_mode="HTML",
                                reply_markup=get_admin_order_keyboard(order_id, user_id),
                            )
                            logger.info(f"✅ Уведомление о новом заказе #{order_id} отправлено админу {admin_id}")
                        except Exception as e:
                            logger.error(f"❌ Ошибка отправки нового заказа админу {admin_id}: {e}")

            if tg_app:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(send_notifications())
                loop.close()

            return jsonify({"success": True, "order": saved_order}), 200
        except Exception as e:
            logger.error(f"❌ Ошибка при POST /api/orders: {e}", exc_info=True)
            return jsonify({"error": str(e)}), 500
    else:
        orders = get_all_orders()
        return jsonify(orders), 200


@flask_app.route("/api/orders/status", methods=["POST"])
def update_order_status_api():
    global tg_app
    try:
        data = request.json or {}
        order_id = data.get("order_id")
        new_status = data.get("status")
        user_id = data.get("user_id")

        if not order_id or not new_status:
            return jsonify({"error": "Missing order_id or status"}), 400

        logger.info(f"📥 Изменение статуса заказа #{order_id} на {new_status} из Flask API")
        
        updated = update_order_status(int(order_id), new_status)
        
        customer_status_messages = {
            "confirmed": f"✅ Ваш заказ #{order_id} <b>ПОДТВЕРЖДЕН</b>!\n\nМы приступили к его сборке.\n\n📩 Менеджер: @{MANAGER_USERNAME}",
            "shipped": f"🚚 Ваш заказ #{order_id} <b>ОТПРАВЛЕН</b> / передан курьеру!\n\nОжидайте прибытия.\n\n📩 Менеджер: @{MANAGER_USERNAME}",
            "completed": f"🎉 Ваш заказ #{order_id} <b>ВЫПОЛНЕН</b>!\n\nБлагодарим за выбор Puff Paradise! Приходите снова ❤️\n\n📩 Менеджер: @{MANAGER_USERNAME}",
            "cancelled": f"❌ Заказ #{order_id} был <b>ОТМЕНЕН</b>.\n\nЕсли это ошибка, напишите нам: @{MANAGER_USERNAME}",
        }

        target_user_id = user_id or (updated.get("user_id") if updated else None)
        customer_msg = customer_status_messages.get(new_status)
        
        if customer_msg and target_user_id and tg_app:
            async def send():
                try:
                    await tg_app.bot.send_message(
                        chat_id=int(target_user_id),
                        text=customer_msg,
                        parse_mode="HTML"
                    )
                    logger.info(f"✅ Уведомление об изменении статуса заказа #{order_id} отправлено покупателю {target_user_id}")
                except Exception as e:
                    logger.error(f"❌ Ошибка отправки статуса покупателю {target_user_id}: {e}")

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(send())
            loop.close()

        return jsonify({"success": True}), 200
    except Exception as e:
        logger.error(f"❌ Ошибка при изменении статуса заказа в Flask API: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@flask_app.route("/api/send_message", methods=["POST"])
def send_message_api():
    global tg_app
    try:
        data = request.json or {}
        user_id = data.get("user_id")
        text = data.get("message")

        if not user_id or not text or not tg_app:
            return jsonify({"error": "Invalid params or bot not ready"}), 400

        full_msg = f"{text}\n\n📩 Менеджер: @{MANAGER_USERNAME}"

        async def send():
            await tg_app.bot.send_message(chat_id=user_id, text=full_msg, parse_mode="HTML")

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(send())
        loop.close()

        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@flask_app.route("/api/parser/config", methods=["GET"])
def get_parser_config_api():
    settings = get_parser_settings()
    watched = get_watched_chats()
    return jsonify({
        "enabled": settings.get("enabled", True),
        "keywords": settings.get("keywords", []),
        "stop_words": settings.get("stop_words", []),
        "blacklist": settings.get("blacklist", []),
        "chats": watched.get("chats", []),
        "group_id": settings.get("group_id", PARSER_GROUP_ID)
    }), 200


@flask_app.route("/api/parser/config", methods=["POST"])
def save_parser_config_api():
    try:
        data = request.json or {}
        settings = get_parser_settings()
        
        if "enabled" in data:
            settings["enabled"] = bool(data["enabled"])
        if "keywords" in data:
            settings["keywords"] = list(data["keywords"])
        if "stop_words" in data:
            settings["stop_words"] = list(data["stop_words"])
        if "blacklist" in data:
            blacklist_parsed = []
            for item in data["blacklist"]:
                try:
                    blacklist_parsed.append(int(item))
                except ValueError:
                    pass
            settings["blacklist"] = blacklist_parsed
        if "group_id" in data:
            try:
                settings["group_id"] = int(data["group_id"])
            except ValueError:
                pass
                
        save_parser_settings(settings)
        
        if "chats" in data:
            watched = get_watched_chats()
            watched["chats"] = list(data["chats"])
            save_watched_chats(watched)
            notify_twink_reload()
            
        return jsonify({"success": True, "settings": settings}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@flask_app.route("/api/parser/chats", methods=["POST"])
def save_parser_chats_api():
    try:
        data = request.json or {}
        if "chats" in data:
            watched = get_watched_chats()
            watched["chats"] = list(data["chats"])
            save_watched_chats(watched)
            notify_twink_reload()
            return jsonify({"success": True, "chats": watched["chats"]}), 200
        return jsonify({"error": "Missing 'chats' field"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def run_flask():
    try:
        flask_app.run(host="0.0.0.0", port=8080, debug=False, use_reloader=False)
    except Exception as e:
        logger.warning(
            f"⚠️ Не удалось запустить Flask API на порту 8080 (возможно, порт заблокирован хостингом или уже используется). "
            f"Сам Telegram-бот и парсер продолжат работать в штатном режиме без портов! Ошибка: {e}"
        )


async def post_init(application: Application):
    try:
        await application.bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(text="🛒 Магазин", web_app=WebAppInfo(url=WEBAPP_URL))
        )
        logger.info(f"✅ WebApp MenuButton успешно установлен: {WEBAPP_URL}")
    except Exception as e:
        logger.warning(f"Не удалось установить MenuButton: {e}")


# ================= ОСНОВНОЙ ЗАПУСК =================
def main():
    global tg_app

    # Автозапуск парсера, если запущено напрямую на хосте (Linux) без launcher.py
    # На Windows (local PC) автозапуск отключен, так как там всегда используется launcher.py
    if os.name != "nt" and os.environ.get("LAUNCHED_FROM_LAUNCHER") != "1":
        logger.info("⚠️ Запуск на хостинге без launcher.py. Проверяем автозапуск twink_parser.py...")
        import subprocess
        import sys
        if os.path.exists("twink_parser.py"):
            logger.info("🚀 Запуск twink_parser.py в фоновом режиме подпроцесса...")
            try:
                env = os.environ.copy()
                env["LAUNCHED_FROM_LAUNCHER"] = "1"
                subprocess.Popen(
                    [sys.executable, "twink_parser.py"],
                    env=env
                )
                logger.info("✅ twink_parser.py успешно запущен в фоновом режиме!")
            except Exception as e:
                logger.error(f"❌ Не удалось автоматически запустить twink_parser.py: {e}")
        else:
            logger.warning("⚠️ Файл twink_parser.py не найден для автозапуска.")

    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    logger.info("🌐 Flask API запущен на порту 8080")

    tg_app = Application.builder().token(TOKEN).post_init(post_init).build()

    tg_app.add_handler(CommandHandler("start", start, filters=filters.ChatType.PRIVATE))
    tg_app.add_handler(CommandHandler("shop", shop, filters=filters.ChatType.PRIVATE))
    tg_app.add_handler(CommandHandler("help", help_command, filters=filters.ChatType.PRIVATE))
    tg_app.add_handler(CommandHandler("admin", admin_panel, filters=filters.ChatType.PRIVATE))
    tg_app.add_handler(CommandHandler("admin_panel", admin_panel, filters=filters.ChatType.PRIVATE))
    tg_app.add_handler(CommandHandler("msg", send_message_to_user, filters=filters.ChatType.PRIVATE))
    tg_app.add_handler(CommandHandler("cancel", cancel_input, filters=filters.ChatType.PRIVATE))

    tg_app.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, handle_webapp_data))
    tg_app.add_handler(CallbackQueryHandler(handle_callback_query))

    tg_app.add_handler(MessageHandler(
        filters.TEXT & ~filters.COMMAND & ~filters.StatusUpdate.WEB_APP_DATA & filters.ChatType.PRIVATE,
        handle_text_messages
    ))

    tg_app.add_handler(MessageHandler(
        filters.TEXT & filters.Chat(chat_id=PARSER_GROUP_ID),
        handle_group_messages
    ))

    logger.info("🤖 Puff Paradise Telegram Bot запущен!")
    logger.info(f"👑 Администраторы: {HARDCODED_ADMINS}")
    logger.info(f"🔗 WebApp URL: {WEBAPP_URL}")
    logger.info(f"🔍 Парсер настроен на отправку в группу: {PARSER_GROUP_ID}")

    tg_app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
