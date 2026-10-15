import asyncio
import logging
import os
import sys
from datetime import datetime, timedelta

from aiogram import Bot, Dispatcher, types, F
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.client.default import DefaultBotProperties
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from aiohttp import web

from config import BOT_TOKEN, CHAT_ID, BOT_TZ, ADMIN_ID
from formatter import format_day_schedule, format_week_schedule
from parity import get_week_parity
from keyboards import main_keyboard

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s"
)
logger = logging.getLogger(__name__)

dp = Dispatcher()
scheduler = AsyncIOScheduler(timezone=BOT_TZ)
bot: Bot | None = None

BELLS_TEXT = (
    "🔔 <b>Расписание звонков (4 курс · 9ПО-43к)</b>\n\n"
    "1️⃣ пара: <b>09:00 — 10:35</b>\n"
    "2️⃣ пара: <b>10:45 — 12:20</b>\n"
    "🍽 <b>Обед: 12:20 — 12:55</b>\n"
    "3️⃣ пара: <b>12:55 — 14:30</b>\n"
    "4️⃣ пара: <b>14:40 — 16:15</b>"
)

async def send_midnight_schedule():
    """
    Задача, запускаемая ежедневно в 00:00:
    отправляет расписание на наступающий день в целевой чат.
    """
    if not bot or not CHAT_ID:
        logger.warning("Бот или CHAT_ID не настроен. Рассылка в 00:00 пропущена.")
        return

    now = datetime.now(BOT_TZ)
    # В 00:00 сегодня — это уже наступивший день
    target_date = now.date()
    
    logger.info(f"Запуск полночной рассылки на {target_date} в чат {CHAT_ID}")
    text = format_day_schedule(target_date, title_prefix="Расписание на сегодня")
    
    try:
        await bot.send_message(
            chat_id=CHAT_ID,
            text=text,
            reply_markup=main_keyboard,
            disable_web_page_preview=True
        )
        logger.info("Полночное расписание успешно доставлено.")
    except Exception as e:
        logger.error(f"Ошибка при отправке расписания в чат {CHAT_ID}: {e}", exc_info=True)


@dp.message(CommandStart())
async def handle_start(message: types.Message):
    parity_code, parity_name = get_week_parity(datetime.now(BOT_TZ).date())
    welcome_text = (
        f"👋 <b>Привет! Я бот расписания для группы 9ПО-43к (AITU).</b>\n\n"
        f"Текущая неделя: <b>{parity_name}</b>\n\n"
        f"⏰ <b>Каждый день в 00:00</b> я автоматически отправляю расписание на день.\n\n"
        f"👇 <b>Для просмотра расписания нажимайте удобные кнопки внизу:</b>"
    )
    await message.answer(welcome_text, reply_markup=main_keyboard)


@dp.message(Command("today"))
@dp.message(F.text == "📅 Сегодня")
async def handle_today(message: types.Message):
    today = datetime.now(BOT_TZ).date()
    text = format_day_schedule(today, title_prefix="Расписание на сегодня")
    await message.answer(text, reply_markup=main_keyboard)


@dp.message(Command("tomorrow"))
@dp.message(F.text == "🔜 Завтра")
async def handle_tomorrow(message: types.Message):
    tomorrow = datetime.now(BOT_TZ).date() + timedelta(days=1)
    text = format_day_schedule(tomorrow, title_prefix="Расписание на завтра")
    await message.answer(text, reply_markup=main_keyboard)


@dp.message(Command("week"))
@dp.message(F.text == "🗓 Текущая неделя")
async def handle_week(message: types.Message):
    today = datetime.now(BOT_TZ).date()
    monday = today - timedelta(days=today.weekday())
    text = format_week_schedule(monday)
    await message.answer(text, reply_markup=main_keyboard)


@dp.message(Command("next_week"))
@dp.message(F.text == "⏭ След. неделя")
async def handle_next_week(message: types.Message):
    today = datetime.now(BOT_TZ).date()
    next_monday = today - timedelta(days=today.weekday()) + timedelta(days=7)
    text = format_week_schedule(next_monday)
    await message.answer(text, reply_markup=main_keyboard)


@dp.message(Command("parity"))
@dp.message(F.text == "🏷 Чётность недели")
async def handle_parity(message: types.Message):
    today = datetime.now(BOT_TZ).date()
    code, name = get_week_parity(today)
    await message.answer(
        f"🗓 Сегодня: <b>{today.strftime('%d.%m.%Y')}</b>\n"
        f"🏷 Текущая неделя: <b>{name}</b>",
        reply_markup=main_keyboard
    )


@dp.message(F.text == "🔔 Звонки")
async def handle_bells(message: types.Message):
    await message.answer(BELLS_TEXT, reply_markup=main_keyboard)


@dp.message(Command("chat_id"))
async def handle_chat_id(message: types.Message):
    await message.answer(
        f"🆔 ID этого чата: <code>{message.chat.id}</code>\n\n"
        f"Скопируйте его и пропишите в <code>CHAT_ID</code> вашего бота.",
        reply_markup=main_keyboard
    )


@dp.message(Command("test_broadcast"))
async def handle_test_broadcast(message: types.Message):
    if ADMIN_ID and message.from_user.id != ADMIN_ID:
        await message.answer("⛔️ Эта команда доступна только администратору.")
        return
        
    await message.answer("⏳ Тестирую отправку рассылки...")
    await send_midnight_schedule()
    await message.answer("✅ Тест отправки завершён (проверьте целевой чат или логи).")


# Простой HTTP health-check сервер для Koyeb / Render
async def start_http_server():
    preferred_port = int(os.getenv("PORT", "8000"))
    
    async def health_handler(request):
        return web.Response(text="AITU Schedule Bot is running! 200 OK")

    app = web.Application()
    app.router.add_get("/", health_handler)
    app.router.add_get("/health", health_handler)
    
    runner = web.AppRunner(app)
    await runner.setup()
    
    # Пробуем указанный порт или запасные
    for port in [preferred_port, 8000, 8081, 8888, 9090]:
        try:
            site = web.TCPSite(runner, "0.0.0.0", port)
            await site.start()
            logger.info(f"Healthcheck HTTP server запущен на порту {port} (для Koyeb/Render)")
            return
        except OSError:
            continue
            
    logger.warning("Не удалось привязать HTTP healthcheck порт (все порты заняты). Продолжаем работу бота.")


async def main():
    global bot
    if not BOT_TOKEN:
        logger.error("BOT_TOKEN не установлен в .env! Пожалуйста, укажите токен от @BotFather.")
        sys.exit(1)

    bot = Bot(
        token=BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML)
    )

    logger.info("Запуск бота и планировщика APScheduler...")
    
    # Запуск легковесного HTTP сервера для Health Check в облаке (Koyeb/Render)
    await start_http_server()
    
    # Расписание: ежедневно в 00:00:00 по времени часового пояса BOT_TZ
    scheduler.add_job(
        send_midnight_schedule,
        trigger="cron",
        hour=0,
        minute=0,
        second=0,
        id="midnight_schedule_job",
        replace_existing=True
    )
    scheduler.start()
    
    logger.info(f"Планировщик запущен. Часовой пояс: {BOT_TZ}. Следующий запуск рассылки в 00:00.")
    
    # Удаляем вебхуки если были, и запускаем опрос
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Бот остановлен.")
