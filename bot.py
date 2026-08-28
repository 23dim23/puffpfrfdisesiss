import os
import json
import logging
import asyncio
import threading
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
TOKEN = os.getenv("TOKEN", "8870349321:AAEXFersNinRpHnPETbR_vGFn_TnGWOCums")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://puffpfrfdisesiss.karpenkoov32.workers.dev")
MANAGER_USERNAME = os.getenv("MANAGER_USERNAME", "puff_mngr")

# Жестко захардкоженные ID главных администраторов
HARDCODED_ADMINS = [5659638424, 8161417737]

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)
ORDERS_FILE = os.path.join(DATA_DIR, "orders.json")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
SETTINGS_FILE = os.path.join(DATA_DIR, "settings.json")

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


def save_json(filepath: str, data: Any) -> None:
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Ошибка записи в {filepath}: {e}")


def is_admin(user_id: int) -> bool:
    """Строгая проверка прав администратора"""
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


# ================= КЛАВИАТУРЫ =================
def get_main_keyboard(user_id: int) -> ReplyKeyboardMarkup:
    """Главная нижняя клавиатура"""
    buttons = [
        [KeyboardButton("🛒 Открыть магазин", web_app=WebAppInfo(url=WEBAPP_URL))],
        [KeyboardButton("📦 Мои заказы"), KeyboardButton("📖 Помощь / Связь")],
    ]
    if is_admin(user_id):
        buttons.append([KeyboardButton("👑 Панель управления")])
        
    return ReplyKeyboardMarkup(buttons, resize_keyboard=True, is_persistent=True)


def get_admin_order_keyboard(order_id: int, user_id: int) -> InlineKeyboardMarkup:
    """Инлайн-кнопки управления заказом для администратора"""
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


async def shop(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /shop"""
    keyboard = [
        [InlineKeyboardButton("🛒 Открыть магазин Puff Paradise", web_app=WebAppInfo(url=WEBAPP_URL))]
    ]
    await update.message.reply_text(
        "💨 Нажмите на кнопку ниже, чтобы открыть наш каталог:",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /help и кнопка 'Помощь'"""
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
    """Команда /admin и кнопка 'Панель управления'"""
    user_id = update.effective_user.id
    if not is_admin(user_id):
        await update.message.reply_text("⛔ У вас нет прав администратора.")
        return

    orders = get_all_orders()
    users = load_json(USERS_FILE, {})
    
    pending_orders = [o for o in orders if o.get("status") == "pending"]
    completed_orders = [o for o in orders if o.get("status") == "completed"]
    revenue = sum(o.get("total", 0) for o in completed_orders)

    admin_text = (
        "👑 <b>Панель управления Puff Paradise:</b>\n\n"
        f"📊 <b>Всего пользователей:</b> {len(users)}\n"
        f"📦 <b>Всего заказов:</b> {len(orders)}\n"
        f"⏳ <b>Ожидают обработки:</b> {len(pending_orders)}\n"
        f"💰 <b>Выполнено заказов на сумму:</b> {revenue} BYN\n\n"
        "Вы можете управлять каталогом, категориями и акциями напрямую в приложении (переключив режим на <b>Админ</b> в правом верхнем углу)."
    )

    keyboard = [
        [InlineKeyboardButton("🛒 Открыть админку в приложении", web_app=WebAppInfo(url=WEBAPP_URL))],
    ]
    await update.message.reply_text(
        admin_text,
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


# ================= ОБРАБОТКА ДАННЫХ ИЗ WEBAPP (ЗАКАЗЫ) =================
async def handle_webapp_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка заказа, поступившего из WebApp через tg.sendData"""
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

            # 1. Сохраняем заказ в локальную базу данных бота
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

            # 2. Формируем красивый список товаров
            items_list = "\n".join([
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

            # 3. Сообщение администраторам
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

            # Отправка уведомлений всем администраторам
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

            # 4. Чек покупателю
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


# ================= ОБРАБОТКА ИНЛАЙН КНОПОК АДМИНА =================
async def handle_callback_query(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    data = query.data
    user_id = update.effective_user.id

    if not is_admin(user_id):
        await query.answer("⛔ Только для администраторов", show_alert=True)
        return

    if data.startswith("status_"):
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
            await query.edit_message_caption(
                caption=f"{query.message.text or ''}\n\n<b>Статус обновлен на:</b> {status_text}",
                parse_mode="HTML",
            ) if query.message.caption else await query.edit_message_text(
                text=f"{query.message.text}\n\n🔄 <b>Статус изменен:</b> {status_text}",
                parse_mode="HTML",
                reply_markup=get_admin_order_keyboard(order_id, updated["user_id"]),
            )

            # Отправляем уведомление покупателю
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


# ================= ТЕКСТОВЫЕ КНОПКИ МЕНЮ =================
async def handle_text_messages(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    user_id = update.effective_user.id

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
        await admin_command(update, context)

    else:
        await update.message.reply_text(
            "Используйте кнопки меню ниже 👇",
            reply_markup=get_main_keyboard(user_id),
        )


# ================= FLASK API СЕРВЕР =================
flask_app = Flask(__name__)
CORS(flask_app)


@flask_app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "app": "Puff Paradise Bot API"}), 200


@flask_app.route("/api/orders", methods=["GET"])
def get_orders_api():
    orders = get_all_orders()
    return jsonify(orders), 200


@flask_app.route("/api/send_message", methods=["POST"])
def send_message_api():
    """Отправка сообщения через бота из веб-приложения"""
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


def run_flask():
    flask_app.run(host="0.0.0.0", port=8080, debug=False, use_reloader=False)


async def post_init(application: Application):
    """Настройка кнопки меню чата (MenuButtonWebApp) при старте бота"""
    try:
        await application.bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(text="🛒 Магазин", web_app=WebAppInfo(url=WEBAPP_URL))
        )
        logger.info(f"✅ WebApp MenuButton успешно установлен: {WEBAPP_URL}")
    except Exception as e:
        logger.warning(f"Не удалось установить MenuButton: {e}")


# ================= ОСНОВНОЙ ТОЧКА ВХОДА =================
def main():
    global tg_app

    # 1. Запускаем Flask API в отдельном фоновом потоке
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    logger.info("🌐 Flask API запущен на порту 8080")

    # 2. Инициализируем бота
    tg_app = Application.builder().token(TOKEN).post_init(post_init).build()

    # Команды
    tg_app.add_handler(CommandHandler("start", start))
    tg_app.add_handler(CommandHandler("shop", shop))
    tg_app.add_handler(CommandHandler("help", help_command))
    tg_app.add_handler(CommandHandler("admin", admin_command))

    # WebApp Data & Callbacks
    tg_app.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, handle_webapp_data))
    tg_app.add_handler(CallbackQueryHandler(handle_callback_query))

    # Обычный текст
    tg_app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text_messages))

    logger.info("🤖 Puff Paradise Telegram Bot запущен!")
    logger.info(f"👑 Администраторы: {HARDCODED_ADMINS}")
    logger.info(f"🔗 WebApp URL: {WEBAPP_URL}")

    tg_app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
