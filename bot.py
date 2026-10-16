import asyncio
import logging
import os
import sys
from datetime import datetime, timedelta

from aiogram import Bot, Dispatcher, types, F
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.client.default import DefaultBotProperties
from aiogram.exceptions import TelegramBadRequest
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from aiohttp import web, ClientSession

from config import BOT_TOKEN, CHAT_ID, BOT_TZ, ADMIN_ID
from formatter import (
    format_day_schedule,
    format_week_schedule,
    format_weekday_by_index,
    format_morning_alert
)
from parity import get_week_parity
from keyboards import (
    main_keyboard,
    get_days_inline_keyboard,
    get_back_to_days_keyboard
)

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s"
)
logger = logging.getLogger(__name__)

dp = Dispatcher()
scheduler = AsyncIOScheduler(timezone=BOT_TZ)
bot: Bot | None = None

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")
WELCOME_IMG = os.path.join(ASSETS_DIR, "welcome.jpg")
MORNING_IMG = os.path.join(ASSETS_DIR, "morning.jpg")
BELLS_IMG = os.path.join(ASSETS_DIR, "bells.jpg")
WEEKEND_IMG = os.path.join(ASSETS_DIR, "weekend.jpg")

BELLS_TEXT = (
    "🔔 <b>Расписание звонков · 4 курс (9ПО-43к)</b>\n"
    "──────────────────────\n"
    "<blockquote>"
    "1️⃣ пара: <b>09:00 — 10:35</b>\n"
    "⏱ <i>09:00–09:45 • перерыв 5 мин • 09:50–10:35</i>\n\n"
    "2️⃣ пара: <b>10:45 — 12:20</b>\n"
    "⏱ <i>10:45–11:30 • перерыв 5 мин • 11:35–12:20</i>\n\n"
    "🍽 <b>Обед: 12:20 — 12:55 (35 минут)</b>\n\n"
    "3️⃣ пара: <b>12:55 — 14:30</b>\n"
    "⏱ <i>12:55–13:40 • перерыв 5 мин • 13:45–14:30</i>\n\n"
    "4️⃣ пара: <b>14:40 — 16:15</b>\n"
    "⏱ <i>14:40–15:25 • перерыв 5 мин • 15:30–16:15</i>"
    "</blockquote>\n"
    "💡 <i>Перерывы между парами: 10 минут. Обед после 2-й пары.</i>"
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
    target_date = now.date()
    
    logger.info(f"Запуск полночной рассылки на {target_date} в чат {CHAT_ID}")
    text = format_day_schedule(target_date, title_prefix="Расписание на сегодня")
    
    try:
        if "Пар нет!" in text and os.path.exists(WEEKEND_IMG):
            try:
                await bot.send_photo(
                    chat_id=CHAT_ID,
                    photo=types.FSInputFile(WEEKEND_IMG),
                    caption=text,
                    reply_markup=main_keyboard
                )
                logger.info("Полночное расписание (выходной с фото) успешно доставлено.")
                return
            except Exception as e:
                logger.debug(f"Не удалось отправить фото расписания: {e}")

        await bot.send_message(
            chat_id=CHAT_ID,
            text=text,
            reply_markup=main_keyboard,
            link_preview_options=types.LinkPreviewOptions(is_disabled=True)
        )
        logger.info("Полночное расписание успешно доставлено.")
    except Exception as e:
        logger.error(f"Ошибка при отправке расписания в чат {CHAT_ID}: {e}", exc_info=True)


async def send_morning_alert():
    """
    Задача, запускаемая по будням в 08:00:
    короткое бодрое напоминание о первой паре на сегодня.
    """
    if not bot or not CHAT_ID:
        return

    now = datetime.now(BOT_TZ)
    text = format_morning_alert(now.date())
    if not text:
        return  # На выходных пропускаем
        
    logger.info(f"Запуск утреннего напоминания на {now.date()} в чат {CHAT_ID}")
    try:
        if os.path.exists(MORNING_IMG):
            try:
                await bot.send_photo(
                    chat_id=CHAT_ID,
                    photo=types.FSInputFile(MORNING_IMG),
                    caption=text,
                    reply_markup=main_keyboard
                )
                logger.info("Утреннее напоминание (с фото) успешно доставлено.")
                return
            except Exception as e:
                logger.debug(f"Не удалось отправить утреннее фото: {e}")

        await bot.send_message(
            chat_id=CHAT_ID,
            text=text,
            reply_markup=main_keyboard,
            link_preview_options=types.LinkPreviewOptions(is_disabled=True)
        )
        logger.info("Утреннее напоминание успешно доставлено.")
    except Exception as e:
        logger.error(f"Ошибка при отправке утреннего напоминания: {e}", exc_info=True)


@dp.message(CommandStart())
async def handle_start(message: types.Message):
    parity_code, parity_name = get_week_parity(datetime.now(BOT_TZ).date())
    welcome_text = (
        f"👋 <b>Добро пожаловать в бот расписания группы 9ПО-43к!</b>\n\n"
        f"🏷 <b>Текущая неделя:</b> {parity_name}\n\n"
        f"⏰ <b>Автоматические рассылки:</b>\n"
        f"▫️ <b>00:00</b> — детальное расписание на наступающий день\n"
        f"▫️ <b>08:00</b> — утреннее напоминание о первой паре (по будням)\n\n"
        f"👇 <i>Используйте кнопки меню внизу или команды в меню [ / ]:</i>"
    )
    if os.path.exists(WELCOME_IMG):
        try:
            await message.answer_photo(
                photo=types.FSInputFile(WELCOME_IMG),
                caption=welcome_text,
                reply_markup=main_keyboard
            )
            return
        except Exception as e:
            logger.debug(f"Не удалось отправить фото start: {e}")

    await message.answer(welcome_text, reply_markup=main_keyboard)


@dp.message(Command("today"))
@dp.message(F.text == "📅 Сегодня")
async def handle_today(message: types.Message):
    now = datetime.now(BOT_TZ)
    current_time_str = now.strftime("%H:%M")
    text = format_day_schedule(now.date(), title_prefix="Расписание на сегодня", current_time_str=current_time_str)
    
    if "Пар нет!" in text and os.path.exists(WEEKEND_IMG):
        try:
            await message.answer_photo(
                photo=types.FSInputFile(WEEKEND_IMG),
                caption=text,
                reply_markup=main_keyboard
            )
            return
        except Exception as e:
            logger.debug(f"Не удалось отправить фото: {e}")

    await message.answer(text, reply_markup=main_keyboard)


@dp.message(Command("tomorrow"))
@dp.message(F.text == "🔜 Завтра")
async def handle_tomorrow(message: types.Message):
    tomorrow = datetime.now(BOT_TZ).date() + timedelta(days=1)
    text = format_day_schedule(tomorrow, title_prefix="Расписание на завтра")
    
    if "Пар нет!" in text and os.path.exists(WEEKEND_IMG):
        try:
            await message.answer_photo(
                photo=types.FSInputFile(WEEKEND_IMG),
                caption=text,
                reply_markup=main_keyboard
            )
            return
        except Exception as e:
            logger.debug(f"Не удалось отправить фото: {e}")

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


@dp.message(Command("days"))
@dp.message(F.text == "📆 Выбрать день")
async def handle_choose_day(message: types.Message):
    today = datetime.now(BOT_TZ).date()
    curr_parity, parity_name = get_week_parity(today)
    kb = get_days_inline_keyboard(curr_parity)
    await message.answer(
        f"🗓 <b>Выберите день недели:</b>\n"
        f"Отображаются пары для: <b>{parity_name}</b>",
        reply_markup=kb
    )


@dp.callback_query(F.data.startswith("showday_"))
async def handle_show_day_callback(call: types.CallbackQuery):
    parts = call.data.split("_")
    day_idx = int(parts[1])
    parity_code = parts[2]
    
    text = format_weekday_by_index(day_idx, parity_code)
    kb = get_back_to_days_keyboard(parity_code)
    try:
        await call.message.edit_text(text, reply_markup=kb)
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e).lower():
            await call.message.answer(text, reply_markup=kb)
    except Exception:
        await call.message.answer(text, reply_markup=kb)
    await call.answer()


@dp.callback_query(F.data.startswith("toggleweek_"))
async def handle_toggle_week_callback(call: types.CallbackQuery):
    new_parity = call.data.split("_")[1]
    parity_name = "Числитель 🔺" if new_parity == "chislitel" else "Знаменатель 🔻"
    kb = get_days_inline_keyboard(new_parity)
    try:
        await call.message.edit_text(
            f"🗓 <b>Выберите день недели:</b>\n"
            f"Отображаются пары для: <b>{parity_name}</b>",
            reply_markup=kb
        )
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e).lower():
            logger.debug(f"Toggle week error: {e}")
    except Exception:
        pass
    await call.answer()


@dp.callback_query(F.data.startswith("backtodays_"))
async def handle_back_to_days_callback(call: types.CallbackQuery):
    parity_code = call.data.split("_")[1]
    parity_name = "Числитель 🔺" if parity_code == "chislitel" else "Знаменатель 🔻"
    kb = get_days_inline_keyboard(parity_code)
    try:
        await call.message.edit_text(
            f"🗓 <b>Выберите день недели:</b>\n"
            f"Отображаются пары для: <b>{parity_name}</b>",
            reply_markup=kb
        )
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e).lower():
            logger.debug(f"Back to days error: {e}")
    except Exception:
        pass
    await call.answer()


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


@dp.message(Command("bells"))
@dp.message(F.text == "🔔 Звонки")
async def handle_bells(message: types.Message):
    if os.path.exists(BELLS_IMG):
        try:
            await message.answer_photo(
                photo=types.FSInputFile(BELLS_IMG),
                caption=BELLS_TEXT,
                reply_markup=main_keyboard
            )
            return
        except Exception as e:
            logger.debug(f"Не удалось отправить фото bells: {e}")

    await message.answer(BELLS_TEXT, reply_markup=main_keyboard)


@dp.message(Command("help"))
async def handle_help(message: types.Message):
    help_text = (
        "📖 <b>Справка по командам бота:</b>\n\n"
        "📅 /today — Расписание на сегодня\n"
        "🔜 /tomorrow — Расписание на завтра\n"
        "🗓 /week — Расписание на текущую неделю\n"
        "⏭ /next_week — Расписание на следующую неделю\n"
        "📆 /days — Выбрать день недели (интерактивно)\n"
        "🏷 /parity — Текущая чётность (Числитель / Знаменатель)\n"
        "🔔 /bells — Расписание звонков и перерывов\n"
        "🆔 /chat_id — Узнать ID текущего чата\n"
        "❓ /help — Показать эту справку\n\n"
        "💡 <i>В группах можно писать команды через слэш или использовать кнопки экранного меню.</i>"
    )
    await message.answer(help_text, reply_markup=main_keyboard)


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
    await send_morning_alert()
    await message.answer("✅ Тест отправки завершён (проверьте целевой чат или логи).")


# Простой HTTP health-check сервер для Koyeb / Render
async def start_http_server() -> web.AppRunner | None:
    preferred_port = int(os.getenv("PORT", "8000"))
    
    async def health_handler(request):
        return web.Response(text="AITU Schedule Bot is running! 200 OK")

    app = web.Application()
    app.router.add_get("/", health_handler)
    app.router.add_get("/health", health_handler)
    
    runner = web.AppRunner(app)
    await runner.setup()
    
    # Формируем список портов без дубликатов
    candidate_ports = [preferred_port]
    for p in (8000, 8080, 8081, 10000, 8888, 9090):
        if p not in candidate_ports:
            candidate_ports.append(p)

    for port in candidate_ports:
        try:
            site = web.TCPSite(runner, "0.0.0.0", port)
            await site.start()
            logger.info(f"Healthcheck HTTP server запущен на порту {port} (для Koyeb/Render)")
            return runner
        except OSError:
            continue
            
    logger.warning("Не удалось привязать HTTP healthcheck порт (все порты заняты). Продолжаем работу бота.")
    return runner


async def render_keep_alive():
    """
    Фоновый анти-сон для Render: раз в 10 минут шлёт запрос на /health.
    Render автоматически определяет URL через RENDER_EXTERNAL_URL.
    """
    render_url = os.getenv("RENDER_EXTERNAL_URL") or os.getenv("RENDER_URL", "").strip()
    if not render_url:
        logger.info("RENDER_EXTERNAL_URL не задан (активен локальный режим). Анти-сон отключен.")
        return

    ping_target = f"{render_url.rstrip('/')}/health"
    logger.info(f"🛡 Автопинг Render (анти-сон) включен! Цель: {ping_target}")
    
    # Небольшая пауза перед первым пингом
    await asyncio.sleep(45)
    async with ClientSession() as session:
        while True:
            try:
                async with session.get(ping_target, timeout=20) as resp:
                    logger.info(f"Keep-Alive пинг Render выполнен: статус {resp.status}")
            except Exception as e:
                logger.debug(f"Keep-Alive пинг: {e}")
            await asyncio.sleep(600)  # Пинг раз в 10 минут (Render спит после 15 минут)


async def main():
    global bot
    if not BOT_TOKEN:
        logger.error("BOT_TOKEN не установлен в .env! Пожалуйста, укажите токен от @BotFather.")
        sys.exit(1)

    bot = Bot(
        token=BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML)
    )

    http_runner = None
    keep_alive_task = None

    try:
        logger.info("Запуск бота и планировщика APScheduler...")
        
        # Регистрация меню команд в интерфейсе Telegram
        try:
            await bot.set_my_commands([
                types.BotCommand(command="today", description="📅 Расписание на сегодня"),
                types.BotCommand(command="tomorrow", description="🔜 Расписание на завтра"),
                types.BotCommand(command="week", description="🗓 Расписание на эту неделю"),
                types.BotCommand(command="next_week", description="⏭ Расписание на след. неделю"),
                types.BotCommand(command="days", description="📆 Выбрать день недели"),
                types.BotCommand(command="parity", description="🏷 Чётность (числ / знам)"),
                types.BotCommand(command="bells", description="🔔 Расписание звонков"),
                types.BotCommand(command="help", description="📖 Справка по командам"),
            ])
            logger.info("Команды меню бота успешно зарегистрированы в Telegram.")
        except Exception as e:
            logger.warning(f"Не удалось установить команды меню Telegram: {e}")

        # Запуск легковесного HTTP сервера для Health Check в облаке (Koyeb/Render)
        http_runner = await start_http_server()
        
        # Запуск фонового анти-сна для Render
        keep_alive_task = asyncio.create_task(render_keep_alive())
        
        # Расписание 1: ежедневно в 00:00:00 (подробное расписание на день)
        scheduler.add_job(
            send_midnight_schedule,
            trigger="cron",
            hour=0,
            minute=0,
            second=0,
            id="midnight_schedule_job",
            replace_existing=True
        )
        
        # Расписание 2: по будням в 08:00:00 (утреннее напоминание о 1-й паре)
        scheduler.add_job(
            send_morning_alert,
            trigger="cron",
            day_of_week="mon-fri",
            hour=8,
            minute=0,
            second=0,
            id="morning_alert_job",
            replace_existing=True
        )
        
        scheduler.start()
        
        logger.info(f"Планировщик запущен. Часовой пояс: {BOT_TZ}. Рассылки в 00:00 и 08:00.")
        
        # Удаляем вебхуки если были, и запускаем опрос
        await bot.delete_webhook(drop_pending_updates=True)
        await dp.start_polling(bot)
    finally:
        logger.info("Завершение работы и очистка ресурсов бота...")
        if keep_alive_task and not keep_alive_task.done():
            keep_alive_task.cancel()
        if scheduler.running:
            scheduler.shutdown(wait=False)
        if http_runner:
            await http_runner.cleanup()
        if bot and bot.session:
            await bot.session.close()
        logger.info("Все сервисы бота корректно остановлены.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Бот остановлен.")
