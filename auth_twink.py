#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Скрипт для авторизации Twink аккаунта (Pyrogram)
Запустите один раз для создания сессии
"""

import asyncio
import os
from pyrogram import Client

# ================= НАСТРОЙКА =================
API_ID = int(os.getenv("API_ID", 30835466))
API_HASH = os.getenv("API_HASH", "22374b1452abc3709de75fc214c6de35")

async def main():
    print("🔐 Авторизация Twink аккаунта (Pyrogram)")
    print("=" * 50)
    print(f"🆔 API ID: {API_ID}")
    print("=" * 50)
    print()
    
    # Создаем клиент Pyrogram
    app = Client("parser_session", api_id=API_ID, api_hash=API_HASH)
    
    try:
        print("⏳ Запуск авторизации...")
        await app.start()
        
        # Получаем информацию о пользователе
        me = await app.get_me()
        print()
        print("✅ АВТОРИЗАЦИЯ УСПЕШНА!")
        print("=" * 50)
        print(f"👤 Имя: {me.first_name} {me.last_name or ''}")
        print(f"🆔 ID: {me.id}")
        print(f"📱 Номер: {me.phone_number if hasattr(me, 'phone_number') else 'не указан'}")
        print(f"👤 Username: @{me.username}" if me.username else "👤 Username: не установлен")
        print("=" * 50)
        print()
        print("💾 Сессия сохранена в файл: parser_session.session")
        print("✅ Теперь вы можете запускать twink_parser.py")
        
    except Exception as e:
        print(f"❌ Ошибка авторизации: {e}")
        print()
        print("Проверьте:")
        print("1. Правильно ли указаны API_ID и API_HASH")
        print("2. Введен ли правильный код подтверждения")
        
    finally:
        try:
            await app.stop()
        except Exception:
            pass

if __name__ == "__main__":
    asyncio.run(main())
