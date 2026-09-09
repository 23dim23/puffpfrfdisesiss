import os
import json
import asyncio
import logging
import re
import requests
import html
from pyrogram import Client, filters, enums
from pyrogram.handlers import MessageHandler
from pyrogram.types import Message

# ================= НАСТРОЙКА =================
API_ID = int(os.getenv("API_ID", 30835466))
API_HASH = os.getenv("API_HASH", "22374b1452abc3709de75fc214c6de35")
BOT_TOKEN = os.getenv("TOKEN", "8648233320:AAHqnWppOqFTogRR7szthQSclkq3caT8_8Y")
PARSER_GROUP_ID = -4995013422

logging.basicConfig(
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("TwinkParser")

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)
PARSER_SETTINGS_FILE = os.path.join(DATA_DIR, "parser_settings.json")
WATCHED_CHATS_FILE = os.path.join(DATA_DIR, "watched_chats.json")

# Глобальные переменные
client = None
is_running = False


def load_json(filepath: str, default: dict) -> dict:
    try:
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Ошибка загрузки {filepath}: {e}")
    return default


def get_parser_settings():
    return load_json(PARSER_SETTINGS_FILE, {
        "keywords": [],
        "stop_words": [],
        "blacklist": [],
        "enabled": True,
        "group_id": PARSER_GROUP_ID
    })


def get_watched_chats():
    return load_json(WATCHED_CHATS_FILE, {
        "chats": [],
        "enabled": True
    })


def save_watched_chats(watched):
    try:
        with open(WATCHED_CHATS_FILE, 'w', encoding='utf-8') as f:
            json.dump(watched, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Ошибка сохранения watched_chats: {e}")


async def send_to_group(message_text, user_id, source_url=None, dm_url=None, group_id=PARSER_GROUP_ID):
    try:
        buttons = []
        if source_url:
            buttons.append({"text": "📩 Источник", "url": source_url})
        else:
            buttons.append({"text": "📩 Источник", "callback_data": f"source_{user_id}"})
            
        if dm_url:
            buttons.append({"text": "💬 Личка", "url": dm_url})
        else:
            buttons.append({"text": "💬 Личка", "callback_data": f"dm_{user_id}"})
            
        keyboard = {
            "inline_keyboard": [buttons]
        }
        
        logger.info(f"📤 Попытка отправить спаршенное сообщение в Telegram группу ID: {group_id}")
        
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": group_id,
            "text": message_text,
            "parse_mode": "HTML",
            "reply_markup": json.dumps(keyboard),
            "disable_web_page_preview": True
        }
        
        response = await asyncio.to_thread(requests.post, url, json=payload, timeout=10)
        if response.status_code == 200:
            logger.info(f"✅ Спаршенное сообщение успешно отправлено в группу ID: {group_id}")
        else:
            logger.error(f"❌ Ошибка отправки в группу ID {group_id} (проверьте, добавлен ли бот с токеном {BOT_TOKEN[:10]}... в эту группу!): {response.text}")
            
    except Exception as e:
        logger.error(f"❌ Ошибка в send_to_group: {e}")


async def handle_new_message(client: Client, message: Message):
    global is_running
    
    if not is_running:
        return
    
    try:
        # Получаем информацию о входящем сообщении
        chat_id = message.chat.id
        chat_title = message.chat.title or message.chat.username or "Личный чат/Неизвестно"
        sender_name = message.from_user.username if (message.from_user and message.from_user.username) else f"ID {message.from_user.id}" if message.from_user else "Канал"
        
        logger.info(f"📨 Получено новое сообщение в чате '{chat_title}' ({chat_id}) от '{sender_name}'")
        
        # Игнорируем сообщения от самого себя (твинка)
        me = await client.get_me()
        if message.from_user and message.from_user.id == me.id:
            logger.info(f"   ⏭️ Пропущено: сообщение от самого себя (аккаунта-парсера)")
            return
        
        # Получаем динамические настройки при каждом входящем событии
        settings = get_parser_settings()
        if not settings.get("enabled", True):
            logger.info(f"   ⏭️ Пропущено: парсер отключен в настройках (enabled=False)")
            return
            
        watched = get_watched_chats()
        if not watched.get("enabled", True):
            logger.info(f"   ⏭️ Пропущено: отслеживание чатов отключено в настройках (watched_enabled=False)")
            return

        # Сбор контента (текст или подпись) с поддержкой цитирования/reply
        content = ""
        if message.text:
            content = message.text
        elif message.caption:
            content = message.caption

        if message.reply_to_message:
            quote_text = message.reply_to_message.text or message.reply_to_message.caption
            if quote_text:
                content = f"{content}\n\n{quote_text}" if content else quote_text

        content = content.strip()
        if not content:
            logger.info(f"   ⏭️ Пропущено: пустое сообщение (нет текста или подписи)")
            return

        # Проверка черного списка
        blacklist = settings.get("blacklist", [])
        sender_id = message.from_user.id if message.from_user else None
        sender_username = message.from_user.username.lower() if (message.from_user and message.from_user.username) else ""
        
        if sender_id and (sender_id in blacklist or str(sender_id) in blacklist):
            logger.info(f"   ⏭️ Пропущено: отправитель ID={sender_id} находится в чёрном списке.")
            return
        if sender_username and (sender_username in blacklist or f"@{sender_username}" in blacklist):
            logger.info(f"   ⏭️ Пропущено: отправитель @{sender_username} находится в чёрном списке.")
            return

        # Проверяем, отслеживается ли данный чат
        chats_list = watched.get("chats", [])
        is_watched = False
        
        cid_full = str(message.chat.id)
        cid_short = cid_full.replace("-100", "").replace("-", "")
        uname = (message.chat.username or "").lower().strip()
        raw_topic_id = getattr(message, "message_thread_id", None)
        current_thread_id = str(raw_topic_id) if raw_topic_id else None

        logger.info(f"   🔍 Проверка отслеживания для чата {cid_full} (короткий: {cid_short}, username: @{uname or 'нет'}, топик: {current_thread_id})")
        logger.info(f"   📋 Список отслеживаемых чатов: {chats_list}")

        for conf in chats_list:
            if not conf:
                continue
            c_str = str(conf).strip().lower()
            c_clean = c_str.replace("https://t.me/", "").replace("http://t.me/", "").replace("t.me/", "").replace("@", "")
            
            target_chat = c_clean
            target_topic = None
            if "/" in c_clean:
                parts = c_clean.rstrip('/').split('/')
                if parts[0] == "c" and len(parts) >= 3:
                    target_chat, target_topic = parts[1], parts[2]
                elif len(parts) >= 2:
                    target_chat, target_topic = parts[0], parts[1]
            
            target_chat_clean = target_chat.replace("-100", "").replace("-", "")
            
            # Пробуем разные варианты совпадения
            matched_by_id = (target_chat_clean == cid_short)
            matched_by_username = (uname and target_chat == uname)
            
            if matched_by_id or matched_by_username:
                if target_topic:
                    if current_thread_id == target_topic:
                        is_watched = True
                        logger.info(f"      ✅ Совпадение найдено! Чат: {c_str} (совпало по топику {target_topic})")
                        break
                    else:
                        logger.info(f"      ⚠️ Чат совпал, но топик не совпал (ожидался: {target_topic}, текущий: {current_thread_id})")
                else:
                    is_watched = True
                    logger.info(f"      ✅ Совпадение найдено! Чат: {c_str} (совпало по ID/юзернейму)")
                    break
        
        if not is_watched:
            logger.info(f"   ⏭️ Пропущено: чат {cid_full} не находится в списке отслеживаемых")
            return
        
        # Проверка стоп-слов
        text_lower = content.lower()
        stop_words = settings.get("stop_words", [])
        for stop_word in stop_words:
            if stop_word and stop_word.lower() in text_lower:
                logger.info(f"   🚫 Пропущено: обнаружено стоп-слово '{stop_word}'")
                return

        # Проверка ключевых слов по границам слова
        keywords = settings.get("keywords", [])
        found_keyword = None
        
        logger.info(f"   🔍 Проверка ключевых слов... Список ключевых слов: {keywords}")
        
        if not keywords:
            found_keyword = "Любое сообщение (список ключевых слов пуст)"
        else:
            for word in keywords:
                if not word:
                    continue
                pattern = rf"(?:^|[^а-яёa-z0-9]){re.escape(word.lower())}(?:$|[^а-яёa-z0-9])"
                try:
                    if re.search(pattern, text_lower):
                        found_keyword = word
                        break
                except Exception:
                    if word.lower() in text_lower:
                        found_keyword = word
                        break
        
        if not found_keyword:
            logger.info(f"   ⏭️ Пропущено: в тексте не найдено ни одного ключевого слова")
            return

        logger.info(f"   ✨ Найдено ключевое слово: '{found_keyword}' в чате ID={message.chat.id}!")

        # Безопасное форматирование HTML тела сообщения
        body_html = ""
        try:
            if message.text:
                body_html = message.text.html if hasattr(message.text, 'html') else html.escape(message.text)
            elif message.caption:
                body_html = message.caption.html if hasattr(message.caption, 'html') else html.escape(message.caption)
        except Exception:
            body_html = html.escape(content)

        # Сбор контактов по приоритетным методам
        contact = "Не указан"
        author_id = None
        source_username = message.chat.username

        # 1. Поиск TEXT_LINK или MENTION
        entities = message.entities or message.caption_entities
        if entities:
            for entity in entities:
                if entity.type == enums.MessageEntityType.TEXT_LINK:
                    if "t.me/" in entity.url or "tg://user" in entity.url:
                        if source_username and source_username.lower() in entity.url.lower():
                            continue
                        contact = entity.url
                        break
                elif entity.type == enums.MessageEntityType.MENTION:
                    mention = content[entity.offset:entity.offset+entity.length]
                    if source_username and mention.lower().strip('@') == source_username.lower():
                        continue
                    contact = mention
                    break

        # 2. Поиск регулярок @username
        if contact == "Не указан":
            found_usernames = re.findall(r"@[a-zA-Z0-9_]{5,}", content)
            for fu in found_usernames:
                if source_username and fu.lower().strip('@') == source_username.lower():
                    continue
                contact = fu
                break

        # 3. Использование профиля автора
        if contact == "Не указан" and message.from_user:
            if message.from_user.username:
                contact = f"@{message.from_user.username}"
                author_id = message.from_user.id
            elif message.from_user.first_name:
                contact = html.escape(message.from_user.first_name)
                author_id = message.from_user.id
            else:
                contact = "Автор"
                author_id = message.from_user.id

        # 4. Поиск телефонов и почты
        if contact == "Не указан":
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            phone_pattern = r'\+?[\d\s\-\(\)]{10,}'
            email_match = re.search(email_pattern, content)
            phone_match = re.search(phone_pattern, content)
            if email_match:
                contact = email_match.group()
            elif phone_match:
                contact = phone_match.group()
            else:
                contact = "<i>⚠️ Контакт не найден (укажите @username или добавьте контакт в текст)</i>"

        # Форматирование и отправка в группу
        username_str = f"@{message.from_user.username}" if (message.from_user and message.from_user.username) else f"id{message.from_user.id}" if message.from_user else "id_неизвестен"
        full_name_str = f"{message.from_user.first_name or ''} {message.from_user.last_name or ''}".strip() if message.from_user else "Пользователь"
        
        source_url = None
        if message.chat:
            if message.chat.username:
                source_url = f"https://t.me/{message.chat.username}/{message.id}"
            else:
                clean_chat_id = str(message.chat.id).replace("-100", "").replace("-", "")
                source_url = f"https://t.me/c/{clean_chat_id}/{message.id}"
                
        dm_url = None
        if message.from_user:
            if message.from_user.username:
                dm_url = f"https://t.me/{message.from_user.username}"
            else:
                dm_url = f"tg://user?id={message.from_user.id}"
        else:
            dm_url = f"tg://user?id={message.from_user.id}" if message.from_user else None
            
        message_text = (
            f"🔍 <b>Обнаружено ключевое слово:</b> <code>{found_keyword}</code>\n\n"
            f"👤 <b>Пользователь:</b> {username_str}\n"
            f"📛 <b>Имя:</b> {full_name_str}\n"
            f"🆔 <b>User ID:</b> <code>{message.from_user.id if message.from_user else 'неизвестен'}</code>\n\n"
            f"📝 <b>Сообщение:</b>\n{body_html[:2000]}"
        )
        
        target_group_id = settings.get("group_id", PARSER_GROUP_ID)
        await send_to_group(message_text, message.from_user.id if message.from_user else 0, source_url=source_url, dm_url=dm_url, group_id=target_group_id)
        
    except Exception as e:
        logger.error(f"Ошибка в handle_new_message: {e}", exc_info=True)


async def main():
    global client, is_running
    
    logger.info("🔍 Запуск Twink Parser (Pyrogram)...")
    
    # Показываем загруженные настройки
    settings = get_parser_settings()
    logger.info(f"⚙️ Загружены настройки из {PARSER_SETTINGS_FILE}:")
    logger.info(f"   - Группа для отправки (group_id): {settings.get('group_id')}")
    logger.info(f"   - Ключевые слова (keywords): {settings.get('keywords')}")
    logger.info(f"   - Стоп-слова (stop_words): {settings.get('stop_words')}")
    logger.info(f"   - Черный список (blacklist): {settings.get('blacklist')}")
    
    client = Client("parser_session", api_id=API_ID, api_hash=API_HASH)
    
    # Добавляем обработчик событий
    client.add_handler(MessageHandler(handle_new_message))
    
    await client.start()
    
    me = await client.get_me()
    logger.info(f"✅ Авторизован в Pyrogram: {me.first_name} (ID: {me.id})")
    
    is_running = True
    
    # Показываем отслеживаемые чаты
    watched = get_watched_chats()
    for chat_id in watched.get("chats", []):
        try:
            entity = await client.get_chat(chat_id)
            title = entity.title or entity.username or chat_id
            logger.info(f"📢 Отслеживается: {title} ({chat_id})")
        except Exception as e:
            logger.error(f"❌ Ошибка чата {chat_id}: {e}")
            
    logger.info("✅ Готов к работе (в полностью беспортовом режиме)!")
    
    while True:
        await asyncio.sleep(3600)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("⏹️ Парсер остановлен")
