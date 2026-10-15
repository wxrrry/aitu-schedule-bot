import asyncio
import logging
import sys
from datetime import datetime, timedelta

from aiogram import Bot, Dispatcher, types
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.client.default import DefaultBotProperties
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from config import BOT_TOKEN, CHAT_ID, BOT_TZ, ADMIN_ID
from formatter import format_day_schedule, format_week_schedule
from parity import get_week_parity

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s"
)
logger = logging.getLogger(__name__)

dp = Dispatcher()
scheduler = AsyncIOScheduler(timezone=BOT_TZ)
bot: Bot | None = None


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
        f"⏰ <b>Каждый день в 00:00</b> я автоматически отправляю расписание на день в закреплённый чат.\n\n"
        f"<b>Доступные команды:</b>\n"
        f"🔹 /today — Расписание на сегодня\n"
        f"🔹 /tomorrow — Расписание на завтра\n"
        f"🔹 /week — Расписание на текущую неделю\n"
        f"🔹 /next_week — Расписание на следующую неделю\n"
        f"🔹 /parity — Текущий статус недели (числитель/знаменатель)\n"
        f"🔹 /chat_id — Узнать ID этого чата (для настройки рассылки)\n"
    )
    if ADMIN_ID and message.from_user.id == ADMIN_ID:
        welcome_text += "\n👑 <b>Админ-команды:</b>\n🔸 /test_broadcast — Проверить отправку рассылки прямо сейчас"
    
    await message.answer(welcome_text)


@dp.message(Command("today"))
async def handle_today(message: types.Message):
    today = datetime.now(BOT_TZ).date()
    text = format_day_schedule(today, title_prefix="Расписание на сегодня")
    await message.answer(text)


@dp.message(Command("tomorrow"))
async def handle_tomorrow(message: types.Message):
    tomorrow = datetime.now(BOT_TZ).date() + timedelta(days=1)
    text = format_day_schedule(tomorrow, title_prefix="Расписание на завтра")
    await message.answer(text)


@dp.message(Command("week"))
async def handle_week(message: types.Message):
    today = datetime.now(BOT_TZ).date()
    monday = today - timedelta(days=today.weekday())
    text = format_week_schedule(monday)
    await message.answer(text)


@dp.message(Command("next_week"))
async def handle_next_week(message: types.Message):
    today = datetime.now(BOT_TZ).date()
    next_monday = today - timedelta(days=today.weekday()) + timedelta(days=7)
    text = format_week_schedule(next_monday)
    await message.answer(text)


@dp.message(Command("parity"))
async def handle_parity(message: types.Message):
    today = datetime.now(BOT_TZ).date()
    code, name = get_week_parity(today)
    await message.answer(
        f"🗓 Сегодня: <b>{today.strftime('%d.%m.%Y')}</b>\n"
        f"🏷 Текущая неделя: <b>{name}</b>"
    )


@dp.message(Command("chat_id"))
async def handle_chat_id(message: types.Message):
    await message.answer(
        f"🆔 ID этого чата: <code>{message.chat.id}</code>\n\n"
        f"Скопируйте его и пропишите в <code>CHAT_ID</code> вашего бота."
    )


@dp.message(Command("test_broadcast"))
async def handle_test_broadcast(message: types.Message):
    if ADMIN_ID and message.from_user.id != ADMIN_ID:
        await message.answer("⛔️ Эта команда доступна только администратору.")
        return
        
    await message.answer("⏳ Тестирую отправку рассылки...")
    await send_midnight_schedule()
    await message.answer("✅ Тест отправки завершён (проверьте целевой чат или логи).")


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
