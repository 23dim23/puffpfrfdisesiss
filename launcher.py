#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Главный файл запуска всех сервисов Puff Paradise Bot
Запускает одновременно:
1. Основного Telegram бота (bot.py)
2. Twink парсер (twink_parser.py)
"""

import os
import sys
import time
import signal
import subprocess
import threading
import logging
from datetime import datetime

# ================= НАСТРОЙКА ЛОГИРОВАНИЯ =================
logging.basicConfig(
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("MainLauncher")

# ================= ПЕРЕМЕННЫЕ =================
PROCESSES = []
SHUTDOWN = False


def signal_handler(signum, frame):
    """Обработчик сигналов для корректного завершения"""
    global SHUTDOWN
    logger.info(f"\n📨 Получен сигнал {signum}")
    SHUTDOWN = True
    shutdown_all()


def shutdown_all():
    """Завершить все процессы"""
    logger.info("🛑 Остановка всех сервисов...")
    
    for proc in PROCESSES:
        if proc and proc.poll() is None:
            logger.info(f"⏹️ Остановка {proc.args[0]} (PID: {proc.pid})")
            try:
                proc.terminate()
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                logger.warning(f"⚠️ Принудительное завершение {proc.args[0]}")
                proc.kill()
            except Exception as e:
                logger.error(f"❌ Ошибка остановки {proc.args[0]}: {e}")
    
    logger.info("✅ Все сервисы остановлены")
    sys.exit(0)


def run_bot():
    """Запуск основного бота"""
    logger.info("🤖 Запуск Telegram бота (bot.py)...")
    try:
        env = os.environ.copy()
        env["LAUNCHED_FROM_LAUNCHER"] = "1"
        proc = subprocess.Popen(
            [sys.executable, "bot.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1,
            env=env
        )
        PROCESSES.append(proc)
        
        # Логируем вывод бота
        for line in proc.stdout:
            if SHUTDOWN:
                break
            print(f"[BOT] {line}", end='')
            
    except Exception as e:
        logger.error(f"❌ Ошибка запуска бота: {e}")
        shutdown_all()


def run_twink():
    """Запуск Twink парсера"""
    logger.info("🔍 Запуск Twink парсера (twink_parser.py)...")
    try:
        env = os.environ.copy()
        env["LAUNCHED_FROM_LAUNCHER"] = "1"
        proc = subprocess.Popen(
            [sys.executable, "twink_parser.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1,
            env=env
        )
        PROCESSES.append(proc)
        
        # Логируем вывод Twink
        for line in proc.stdout:
            if SHUTDOWN:
                break
            print(f"[TWINK] {line}", end='')
            
    except Exception as e:
        logger.error(f"❌ Ошибка запуска Twink: {e}")
        shutdown_all()


def check_files():
    """Проверка наличия необходимых файлов"""
    required_files = ["bot.py", "twink_parser.py"]
    missing = []
    
    for file in required_files:
        if not os.path.exists(file):
            missing.append(file)
    
    if missing:
        logger.error(f"❌ Отсутствуют необходимые файлы: {', '.join(missing)}")
        logger.info("📁 Убедитесь, что все файлы находятся в одной директории")
        return False
    
    return True


def check_data_dir():
    """Проверка и создание директории data"""
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        logger.info(f"📁 Создана директория: {data_dir}")
    return True


def print_banner():
    """Вывод баннера"""
    banner = """
    ╔═══════════════════════════════════════════════╗
    ║                                               ║
    ║   🚀 PUFF PARADISE BOT LAUNCHER              ║
    ║                                               ║
    ║   🤖 Бот: Puff Paradise                       ║
    ║   🔍 Парсер: Twink Parser                    ║
    ║   📊 Группа: -4995013422                     ║
    ║                                               ║
    ║   Нажмите Ctrl+C для остановки               ║
    ║                                               ║
    ╚═══════════════════════════════════════════════╝
    """
    print(banner)


def main():
    """Главная функция"""
    global SHUTDOWN
    
    # Проверка файлов
    if not check_files():
        sys.exit(1)
    
    # Проверка директории data
    if not check_data_dir():
        sys.exit(1)
    
    # Вывод баннера
    print_banner()
    
    # Настройка обработчиков сигналов
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    logger.info("🚀 Запуск всех сервисов...")
    logger.info(f"📂 Рабочая директория: {os.getcwd()}")
    logger.info(f"🐍 Python: {sys.executable}")
    logger.info("")
    
    # Запуск бота в отдельном потоке
    bot_thread = threading.Thread(target=run_bot, daemon=True)
    bot_thread.start()
    logger.info("✅ Бот запущен в отдельном потоке")
    
    # Небольшая задержка для инициализации бота
    time.sleep(2)
    
    # Запуск Twink парсера в отдельном потоке
    twink_thread = threading.Thread(target=run_twink, daemon=True)
    twink_thread.start()
    logger.info("✅ Twink парсер запущен в отдельном потоке")
    
    logger.info("")
    logger.info("✅ Все сервисы успешно запущены!")
    logger.info("📊 Статус: Работает")
    logger.info("")
    logger.info("💡 Для управления используйте бота в Telegram")
    logger.info("   Нажмите '🔍 Парсер' для доступа к настройкам")
    logger.info("")
    logger.info("⏹️ Нажмите Ctrl+C для остановки всех сервисов")
    
    try:
        # Держим главный поток активным
        while not SHUTDOWN:
            # Проверяем, живы ли потоки
            if not bot_thread.is_alive():
                logger.error("❌ Бот остановился! Перезапуск...")
                bot_thread = threading.Thread(target=run_bot, daemon=True)
                bot_thread.start()
            
            if not twink_thread.is_alive():
                logger.error("❌ Twink парсер остановился! Перезапуск...")
                twink_thread = threading.Thread(target=run_twink, daemon=True)
                twink_thread.start()
            
            time.sleep(5)
            
    except KeyboardInterrupt:
        logger.info("\n📨 Получен сигнал Ctrl+C")
        shutdown_all()
    except Exception as e:
        logger.error(f"❌ Критическая ошибка: {e}")
        shutdown_all()


if __name__ == "__main__":
    main()
