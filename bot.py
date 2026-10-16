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

import html

from config import BOT_TOKEN, CHAT_ID, BOT_TZ, ADMIN_ID
from schedule_data import SCHEDULE, DAYS_RU
from formatter import (
    format_day_schedule,
    format_week_schedule,
    format_weekday_by_index,
    format_morning_alert,
    MONTHS_RU
)
from parity import get_week_parity
from keyboards import (
    main_keyboard,
    schedule_keyboard,
    services_keyboard,
    get_days_inline_keyboard,
    get_back_to_days_keyboard,
    get_day_nav_keyboard,
    get_back_to_teachers_keyboard,
    get_moodle_keyboard,
    get_remind_toggle_keyboard,
    get_replacements_keyboard
)
from features import (
    get_now_status,
    get_teachers_catalog_text,
    get_teachers_inline_keyboard,
    get_teacher_detail_text,
    search_room_schedule,
    generate_ics_calendar,
    get_moodle_info_text
)
from replacements import (
    add_replacement,
    delete_replacement,
    format_replacements_summary,
    parse_date_input,
    get_replacements_for_date
)
from reminders import (
    is_subscribed,
    toggle_subscription,
    send_pair_reminder
)
from user_settings import (
    get_user_settings,
    set_user_setting,
    toggle_user_setting,
    format_user_settings_text,
    get_user_settings_keyboard,
    get_users_with_setting,
    load_all_settings
)
from admin import (
    get_admin_dashboard_text,
    get_admin_main_keyboard,
    get_admin_replacements_keyboard,
    get_admin_tests_keyboard,
    run_git_pull
)

# Время запуска для расчета Uptime
BOT_START_TIME = datetime.now(BOT_TZ)

async def register_bot_commands(bot_instance: Bot):
    """Регистрирует команды в меню Telegram."""
    try:
        await bot_instance.set_my_commands([
            types.BotCommand(command="now", description="⚡️ Какая пара идёт сейчас"),
            types.BotCommand(command="today", description="📅 Расписание на сегодня"),
            types.BotCommand(command="tomorrow", description="🔜 Расписание на завтра"),
            types.BotCommand(command="week", description="🗓 Расписание на эту неделю"),
            types.BotCommand(command="zameny", description="⚠️ Замены и отмены пар"),
            types.BotCommand(command="settings", description="⚙️ Настройки уведомлений"),
            types.BotCommand(command="refresh", description="🔄 Обновить интерфейс"),
            types.BotCommand(command="moodle", description="📁 СДО Moodle и материалы"),
            types.BotCommand(command="maket", description="📄 Титульный лист (.docx)"),
            types.BotCommand(command="teachers", description="👨‍🏫 Преподаватели группы"),
            types.BotCommand(command="room", description="📍 Поиск пар по кабинету"),
            types.BotCommand(command="calendar", description="📥 Добавить в календарь (.ics)"),
            types.BotCommand(command="parity", description="🏷 Чётность (числ / знам)"),
            types.BotCommand(command="bells", description="🔔 Расписание звонков"),
            types.BotCommand(command="admin", description="👑 Панель администратора"),
            types.BotCommand(command="help", description="📖 Полная справка"),
        ])
        logger.info("Команды меню бота успешно зарегистрированы в Telegram.")
    except Exception as e:
        logger.warning(f"Не удалось установить команды меню Telegram: {e}")

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
MAKET_DOCX = os.path.join(ASSETS_DIR, "maket_titul_pz_lr.docx")

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
        
        # Личная рассылка подписанным пользователям
        for uid in get_users_with_setting("morning_alert"):
            if uid == CHAT_ID:
                continue
            try:
                await bot.send_message(
                    chat_id=uid,
                    text=text,
                    reply_markup=main_keyboard,
                    link_preview_options=types.LinkPreviewOptions(is_disabled=True)
                )
            except Exception:
                pass
    except Exception as e:
        logger.error(f"Ошибка при отправке утреннего напоминания: {e}", exc_info=True)


FIVE_MIN_BREAKS = {
    1: {
        "start": "09:45",
        "end": "09:50",
        "resume": "09:50",
        "pair_end": "10:35",
        "tip": "Время размяться, выпить воды или дать глазам отдохнуть от экрана 🧘‍♂️"
    },
    2: {
        "start": "11:30",
        "end": "11:35",
        "resume": "11:35",
        "pair_end": "12:20",
        "tip": "Вторая половина пары продлится до 12:20, а сразу после — большой обед (12:20 — 12:55) 🥪"
    },
    3: {
        "start": "13:40",
        "end": "13:45",
        "resume": "13:45",
        "pair_end": "14:30",
        "tip": "Вторая половина пары продлится до 14:30 ☕️"
    },
    4: {
        "start": "15:25",
        "end": "15:30",
        "resume": "15:30",
        "pair_end": "16:15",
        "tip": "Финишная прямая! Вторая половина пары до 16:15 — и учебный день завершён 🎉"
    }
}


async def send_five_minute_break(pair_num: int):
    """
    Отправляет уведомление в группу о начале пятиминутного перерыва внутри пары.
    Отправляется только по будням и только если пара сегодня есть по расписанию!
    """
    if not bot or not CHAT_ID:
        return

    now = datetime.now(BOT_TZ)
    weekday = now.weekday()
    if weekday >= 5:
        return

    parity_code, parity_name = get_week_parity(now.date())
    day_pairs = SCHEDULE.get(weekday, {})
    pair_val = day_pairs.get(pair_num)
    if not pair_val:
        return

    if pair_val.get("split"):
        pair_info = pair_val["chislitel"] if parity_code == "chislitel" else pair_val["znamenatel"]
    else:
        pair_info = pair_val

    if not pair_info:
        return  # Пары нет по текущей четности (окно)

    break_data = FIVE_MIN_BREAKS.get(pair_num, {
        "start": "—", "end": "—", "resume": "—", "pair_end": "—", "tip": ""
    })

    subject = html.escape(str(pair_info.get("subject", "Не указан")))
    room = html.escape(str(pair_info.get("room", "—")))
    teacher = html.escape(str(pair_info.get("teacher", "—")))

    text = (
        f"🔔 <b>Звонок на пятиминутку! (Перерыв 5 минут) · {pair_num}-я пара</b>\n"
        f"──────────────────────\n"
        f"<blockquote>"
        f"⏱ <b>Время перерыва:</b> <code>{break_data['start']} — {break_data['end']}</code>\n"
        f"📚 <b>{subject}</b>\n"
        f"📍 Кабинет: <code>{room}</code> · 👨‍🏫 <i>{teacher}</i>\n"
        f"🔔 <i>Звонок на 2-ю половину пары: в {break_data['resume']} (до {break_data['pair_end']})</i>"
        f"</blockquote>\n"
        f"💡 <i>{break_data['tip']}</i>"
    )

    logger.info(f"Отправка уведомления о пятиминутке {pair_num}-й пары в чат {CHAT_ID}")
    try:
        await bot.send_message(
            chat_id=CHAT_ID,
            text=text,
            reply_markup=main_keyboard,
            link_preview_options=types.LinkPreviewOptions(is_disabled=True)
        )
        logger.info(f"Уведомление о пятиминутке {pair_num}-й пары успешно доставлено.")
        
        # Личная рассылка пользователям с включёнными пятиминутками
        for uid in get_users_with_setting("five_min_breaks"):
            if uid == CHAT_ID:
                continue
            try:
                await bot.send_message(
                    chat_id=uid,
                    text=text,
                    reply_markup=main_keyboard,
                    link_preview_options=types.LinkPreviewOptions(is_disabled=True)
                )
            except Exception:
                pass
    except Exception as e:
        logger.error(f"Ошибка при отправке уведомления о пятиминутке: {e}", exc_info=True)


@dp.message(CommandStart())
async def handle_start(message: types.Message):
    parity_code, parity_name = get_week_parity(datetime.now(BOT_TZ).date())
    welcome_text = (
        f"👋 <b>Добро пожаловать в бот расписания группы 9ПО-43к!</b>\n\n"
        f"🏷 <b>Текущая неделя:</b> {parity_name}\n\n"
        f"⏰ <b>Автоматические рассылки:</b>\n"
        f"▫️ <b>00:00</b> — детальное расписание на наступающий день\n"
        f"▫️ <b>08:00</b> — утреннее напоминание о первой паре (по будням)\n"
        f"▫️ <b>Пятиминутки</b> — уведомления о перерывах внутри пар\n\n"
        f"📁 <b>Меню разбито по удобным папкам:</b>\n"
        f"• <b>Быстрый доступ</b> — пара сейчас, сегодня, завтра\n"
        f"• <b>🗓 Расписание 📂</b> — недели, выбор дня, чётность\n"
        f"• <b>🛠 Полезное 📂</b> — звонки, замены, СДО/макет, напоминания, преподаватели\n\n"
        f"💬 <b>Инлайн-режим:</b> напишите <code>@aituraspisaniebot</code> в любом чате!\n\n"
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


@dp.message(Command("now"))
@dp.message(F.text == "⚡️ Какая пара сейчас?")
async def handle_now(message: types.Message):
    text = get_now_status()
    refresh_kb = types.InlineKeyboardMarkup(
        inline_keyboard=[
            [types.InlineKeyboardButton(text="🔄 Обновить статус", callback_data="refresh_now")]
        ]
    )
    await message.answer(text, reply_markup=refresh_kb)


@dp.callback_query(F.data == "refresh_now")
async def handle_refresh_now_callback(call: types.CallbackQuery):
    text = get_now_status()
    refresh_kb = types.InlineKeyboardMarkup(
        inline_keyboard=[
            [types.InlineKeyboardButton(text="🔄 Обновить статус", callback_data="refresh_now")]
        ]
    )
    try:
        await call.message.edit_text(text, reply_markup=refresh_kb)
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e).lower():
            logger.debug(f"Refresh now error: {e}")
    except Exception:
        pass
    await call.answer("Статус обновлён!")


@dp.message(Command("today"))
@dp.message(F.text == "📅 Сегодня")
async def handle_today(message: types.Message):
    now = datetime.now(BOT_TZ)
    current_time_str = now.strftime("%H:%M")
    text = format_day_schedule(now.date(), title_prefix="Расписание на сегодня", current_time_str=current_time_str)
    nav_kb = get_day_nav_keyboard(now.date())
    
    if "Пар нет!" in text and os.path.exists(WEEKEND_IMG):
        try:
            await message.answer_photo(
                photo=types.FSInputFile(WEEKEND_IMG),
                caption=text,
                reply_markup=nav_kb
            )
            return
        except Exception as e:
            logger.debug(f"Не удалось отправить фото: {e}")

    await message.answer(text, reply_markup=nav_kb)


@dp.message(Command("tomorrow"))
@dp.message(F.text == "🔜 Завтра")
async def handle_tomorrow(message: types.Message):
    tomorrow = datetime.now(BOT_TZ).date() + timedelta(days=1)
    text = format_day_schedule(tomorrow, title_prefix="Расписание на завтра")
    nav_kb = get_day_nav_keyboard(tomorrow)
    
    if "Пар нет!" in text and os.path.exists(WEEKEND_IMG):
        try:
            await message.answer_photo(
                photo=types.FSInputFile(WEEKEND_IMG),
                caption=text,
                reply_markup=nav_kb
            )
            return
        except Exception as e:
            logger.debug(f"Не удалось отправить фото: {e}")

    await message.answer(text, reply_markup=nav_kb)


# -------------------------------------------------------------
# Навигация по папкам меню
# -------------------------------------------------------------
@dp.message(F.text.in_(["🗓 Расписание 📂", "🗓 Расписание"]))
async def handle_schedule_folder(message: types.Message):
    await message.answer(
        "📂 <b>Папка «Расписание»:</b>\n\n"
        "Выберите, какое расписание вы хотите посмотреть:\n"
        "• <b>🗓 Текущая неделя</b> — пары текущей недели\n"
        "• <b>⏭ След. неделя</b> — расписание на следующую неделю\n"
        "• <b>📆 Выбрать день</b> — интерактивный выбор дня недели\n"
        "• <b>🏷 Чётность недели</b> — узнать числитель или знаменатель\n\n"
        "👈 <i>Для возврата нажмите «◀️ Главное меню»</i>",
        reply_markup=schedule_keyboard
    )


@dp.message(F.text.in_(["🛠 Полезное 📂", "🛠 Полезное"]))
async def handle_services_folder(message: types.Message):
    await message.answer(
        "📂 <b>Папка «Полезное и сервисы»:</b>\n\n"
        "Дополнительные инструменты и справочники:\n"
        "• <b>🔔 Звонки</b> — расписание пар и пятиминуток\n"
        "• <b>⚠️ Замены пар</b> — отмены и переносы занятий\n"
        "• <b>📁 СДО и Материалы</b> — портал СДО и макет титульного листа (.docx)\n"
        "• <b>🔔 Мои напоминания</b> — личный колокольчик за 10 минут до пары\n"
        "• <b>👨‍🏫 Преподаватели</b> — карточки преподавателей и их график\n"
        "• <b>📍 Поиск кабинета</b> — пары в конкретной аудитории\n"
        "• <b>📥 В календарь</b> — экспорт расписания (.ics) в телефон\n\n"
        "👈 <i>Для возврата нажмите «◀️ Главное меню»</i>",
        reply_markup=services_keyboard
    )


@dp.message(Command("menu"))
@dp.message(F.text.in_(["◀️ Главное меню", "◀️ Назад", "Главное меню"]))
async def handle_back_to_main(message: types.Message):
    await message.answer(
        "🏠 <b>Главное меню</b>\n\n"
        "Выберите действие или откройте нужную папку:",
        reply_markup=main_keyboard
    )


@dp.message(Command("week"))
@dp.message(F.text == "🗓 Текущая неделя")
async def handle_week(message: types.Message):
    today = datetime.now(BOT_TZ).date()
    monday = today - timedelta(days=today.weekday())
    text = format_week_schedule(monday)
    await message.answer(text, reply_markup=schedule_keyboard)


@dp.message(Command("next_week"))
@dp.message(F.text == "⏭ След. неделя")
async def handle_next_week(message: types.Message):
    today = datetime.now(BOT_TZ).date()
    next_monday = today - timedelta(days=today.weekday()) + timedelta(days=7)
    text = format_week_schedule(next_monday)
    await message.answer(text, reply_markup=schedule_keyboard)


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
        reply_markup=schedule_keyboard
    )


@dp.message(Command("bells"))
@dp.message(F.text == "🔔 Звонки")
async def handle_bells(message: types.Message):
    if os.path.exists(BELLS_IMG):
        try:
            await message.answer_photo(
                photo=types.FSInputFile(BELLS_IMG),
                caption=BELLS_TEXT,
                reply_markup=services_keyboard
            )
            return
        except Exception as e:
            logger.debug(f"Не удалось отправить фото bells: {e}")

    await message.answer(BELLS_TEXT, reply_markup=services_keyboard)


@dp.callback_query(F.data.startswith("navdate_"))
async def handle_navdate_callback(call: types.CallbackQuery):
    date_str = call.data.split("_")[1]
    try:
        target_date = date.fromisoformat(date_str)
    except Exception:
        target_date = datetime.now(BOT_TZ).date()

    today = datetime.now(BOT_TZ).date()
    current_time_str = datetime.now(BOT_TZ).strftime("%H:%M") if target_date == today else None
    
    if target_date == today:
        prefix = "Расписание на сегодня"
    elif target_date == today + timedelta(days=1):
        prefix = "Расписание на завтра"
    else:
        prefix = "Расписание на"

    text = format_day_schedule(target_date, title_prefix=prefix, current_time_str=current_time_str)
    nav_kb = get_day_nav_keyboard(target_date)
    
    try:
        await call.message.edit_text(text, reply_markup=nav_kb)
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e).lower():
            logger.debug(f"Navdate error: {e}")
    except Exception:
        pass
    await call.answer()


@dp.callback_query(F.data == "nav_chooseday")
async def handle_nav_chooseday_callback(call: types.CallbackQuery):
    today = datetime.now(BOT_TZ).date()
    curr_parity, parity_name = get_week_parity(today)
    kb = get_days_inline_keyboard(curr_parity)
    try:
        await call.message.edit_text(
            f"🗓 <b>Выберите день недели:</b>\n"
            f"Отображаются пары для: <b>{parity_name}</b>",
            reply_markup=kb
        )
    except Exception:
        pass
    await call.answer()


@dp.message(Command("teachers"))
@dp.message(F.text == "👨‍🏫 Преподаватели")
async def handle_teachers(message: types.Message):
    text = get_teachers_catalog_text()
    kb = get_teachers_inline_keyboard()
    await message.answer(text, reply_markup=kb)


@dp.callback_query(F.data == "teachers_list")
async def handle_teachers_list_callback(call: types.CallbackQuery):
    text = get_teachers_catalog_text()
    kb = get_teachers_inline_keyboard()
    try:
        await call.message.edit_text(text, reply_markup=kb)
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e).lower():
            logger.debug(f"Teachers list error: {e}")
    except Exception:
        pass
    await call.answer()


@dp.callback_query(F.data.startswith("teacher_"))
async def handle_teacher_detail_callback(call: types.CallbackQuery):
    t_idx = int(call.data.split("_")[1])
    text = get_teacher_detail_text(t_idx)
    kb = get_back_to_teachers_keyboard()
    try:
        await call.message.edit_text(text, reply_markup=kb)
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e).lower():
            logger.debug(f"Teacher detail error: {e}")
    except Exception:
        pass
    await call.answer()


@dp.message(Command("room"))
@dp.message(F.text == "📍 Поиск кабинета")
async def handle_room_search(message: types.Message):
    parts = message.text.split(maxsplit=1)
    if len(parts) < 2 or message.text.strip() == "📍 Поиск кабинета":
        await message.answer(
            "📍 <b>Поиск занятий по номеру кабинета</b>\n\n"
            "Напишите команду с номером аудитории, например:\n"
            "<code>/room 305</code> или <code>/room 505</code>\n\n"
            "Бот покажет все дни и пары, которые проходят в этом кабинете у группы 9ПО-43к.",
            reply_markup=services_keyboard
        )
        return
        
    query = parts[1].strip()
    text = search_room_schedule(query)
    await message.answer(text, reply_markup=services_keyboard)


@dp.message(Command("calendar"))
@dp.message(Command("ics"))
@dp.message(F.text == "📥 В календарь")
async def handle_calendar_export(message: types.Message):
    wait_msg = await message.answer("⏳ Генерирую файл календаря с вашим расписанием...")
    ics_file = generate_ics_calendar()
    
    caption = (
        "📅 <b>Интеграция расписания в ваш смартфон (iCalendar .ics)</b>\n\n"
        "✨ <b>Что внутри файла:</b>\n"
        "• Все пары 4 курса группы <code>9ПО-43к</code>\n"
        "• Учёт числителя и знаменателя\n"
        "• Точное время звонков, кабинеты и преподаватели\n"
        "• 🔔 Автоматические напоминания за 15 минут до пары!\n\n"
        "📲 <b>Как добавить:</b>\n"
        "1. Нажмите на прикреплённый файл ниже.\n"
        "2. Выберите «Добавить всё в Календарь» (iOS) или откройте через Google Calendar (Android).\n"
        "Готово! Все пары появятся в вашем системном календаре."
    )
    
    try:
        await message.answer_document(
            document=types.FSInputFile(ics_file, filename="aitu_schedule_9po43k.ics"),
            caption=caption,
            reply_markup=services_keyboard
        )
        try:
            await wait_msg.delete()
        except Exception:
            pass
    except Exception as e:
        logger.error(f"Ошибка при отправке календаря: {e}")
        await message.answer(f"Не удалось отправить файл календаря: {e}", reply_markup=services_keyboard)


# -------------------------------------------------------------
# Раздел: Замены и отмены пар
# -------------------------------------------------------------
@dp.message(Command("zameny"))
@dp.message(Command("zameni"))
@dp.message(F.text == "⚠️ Замены пар")
async def handle_zameny_list(message: types.Message):
    text = format_replacements_summary()
    kb = get_replacements_keyboard()
    await message.answer(text, reply_markup=kb)


@dp.callback_query(F.data == "refresh_replacements")
async def handle_refresh_replacements(call: types.CallbackQuery):
    text = format_replacements_summary()
    kb = get_replacements_keyboard()
    try:
        await call.message.edit_text(text, reply_markup=kb)
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e).lower():
            logger.debug(f"Refresh replacements error: {e}")
    except Exception:
        pass
    await call.answer("Список замен обновлён!")


@dp.callback_query(F.data == "nav_today")
async def handle_nav_today_callback(call: types.CallbackQuery):
    now = datetime.now(BOT_TZ)
    current_time_str = now.strftime("%H:%M")
    text = format_day_schedule(now.date(), title_prefix="Расписание на сегодня", current_time_str=current_time_str)
    nav_kb = get_day_nav_keyboard(now.date())
    try:
        await call.message.edit_text(text, reply_markup=nav_kb)
    except Exception:
        await call.message.answer(text, reply_markup=nav_kb)
    await call.answer()


async def check_admin_privileges(user_id: int, chat: types.Chat | None = None) -> bool:
    """Проверяет права админа бота или администратора текущей группы."""
    if ADMIN_ID and user_id == ADMIN_ID:
        return True
    if chat and chat.type in ("group", "supergroup"):
        try:
            member = await chat.get_member(user_id)
            if member.status in ("creator", "administrator"):
                return True
        except Exception:
            pass
    if not ADMIN_ID:
        return True
    return False


async def is_user_admin(message: types.Message) -> bool:
    """Проверяет права админа бота или администратора текущей группы."""
    return await check_admin_privileges(message.from_user.id, message.chat)


@dp.message(Command("zamena"))
async def handle_zamena_cmd(message: types.Message):
    """
    Добавление замены или отмены пары.
    Синтаксис:
    /zamena <дата> <номер_пары> <описание или 'отмена'>
    Пример: /zamena 17.10 3 отмена
    Пример: /zamena завтра 2 МДК 07.01, каб. 305
    Удаление: /zamena del <дата> <номер_пары>
    """
    if not await is_user_admin(message):
        await message.answer("⛔️ У вас нет прав для добавления замен. Обратитесь к старосте или администратору бота.")
        return

    text = message.text.strip()
    parts = text.split(maxsplit=3)
    
    if len(parts) < 2:
        await message.answer(
            "⚠️ <b>Управление заменами и отменами пар</b>\n\n"
            "▫️ <b>Отменить пару:</b>\n"
            "<code>/zamena 17.10 3 отмена</code> или <code>/zamena завтра 1 отмена</code>\n\n"
            "▫️ <b>Заменить пару:</b>\n"
            "<code>/zamena 17.10 2 МДК 07.01 Сертификация, каб. 305</code>\n\n"
            "▫️ <b>Удалить замену:</b>\n"
            "<code>/zamena del 17.10 3</code> или <code>/zamena_del 17.10 3</code>\n\n"
            "▫️ <b>Список всех замен:</b> /zameny\n\n"
            "📢 <i>При добавлении замены бот автоматически оповестит группу 9ПО-43к!</i>"
        )
        return

    # Удаление: /zamena del 17.10 3
    if parts[1].lower() in ("del", "delete", "rm", "remove"):
        if len(parts) < 4:
            await message.answer("ℹ️ Формат удаления: <code>/zamena del &lt;дата&gt; &lt;номер_пары&gt;</code>\nПример: <code>/zamena del 17.10 3</code>")
            return
        d_obj = parse_date_input(parts[2])
        if not d_obj:
            await message.answer(f"❌ Не удалось распознать дату: <code>{parts[2]}</code>. Используйте формат ДД.ММ или 'завтра'.")
            return
        try:
            p_num = int(parts[3])
        except ValueError:
            await message.answer("❌ Номер пары должен быть числом от 1 до 6.")
            return

        deleted = delete_replacement(d_obj, p_num)
        if deleted:
            await message.answer(f"✅ Замена на <b>{d_obj.strftime('%d.%m.%Y')}</b> (пара №{p_num}) успешно удалена.")
        else:
            await message.answer(f"ℹ️ Замена для пары №{p_num} на {d_obj.strftime('%d.%m.%Y')} не была найдена.")
        return

    # Добавление: /zamena <дата> <номер_пары> <текст>
    if len(parts) < 4:
        await message.answer(
            "❌ Недостаточно аргументов!\n"
            "Используйте: <code>/zamena &lt;дата&gt; &lt;номер_пары&gt; &lt;текст или отмена&gt;</code>\n"
            "Пример: <code>/zamena 17.10 3 отмена</code>"
        )
        return

    target_date = parse_date_input(parts[1])
    if not target_date:
        await message.answer(f"❌ Не удалось распознать дату: <code>{parts[1]}</code>. Укажите дату как ДД.ММ (например, 17.10), 'сегодня' или 'завтра'.")
        return

    try:
        pair_num = int(parts[2])
        if pair_num < 1 or pair_num > 6:
            raise ValueError()
    except ValueError:
        await message.answer("❌ Номер пары должен быть числом от 1 до 6.")
        return

    rep_content = parts[3].strip()
    author_name = message.from_user.full_name or message.from_user.username or "Администратор"
    
    entry = add_replacement(target_date, pair_num, rep_content, author=author_name)
    is_cancel = entry.get("type") == "cancel"
    action_title = "❌ ОТМЕНЕНА" if is_cancel else f"🔄 ЗАМЕНА: {entry['text']}"

    success_msg = (
        f"✅ <b>Запись успешно сохранена!</b>\n\n"
        f"📅 <b>Дата:</b> {target_date.strftime('%d.%m.%Y')}\n"
        f"🔔 <b>Пара №{pair_num}:</b> {action_title}\n\n"
        f"Метка отобразится во всех расписаниях (сегодня, завтра, неделя, инлайн)."
    )
    await message.answer(success_msg)

    # Оповещение группы 9ПО-43к
    if CHAT_ID:
        try:
            alert_text = (
                f"⚠️ <b>Внимание! Изменение в расписании 9ПО-43к!</b>\n"
                f"──────────────────────\n"
                f"📅 <b>Дата:</b> {target_date.strftime('%d.%m.%Y')} ({DAYS_RU[target_date.weekday()]})\n"
                f"🔔 <b>Пара №{pair_num}:</b> {action_title}\n"
                f"👤 <i>Внёс: {html.escape(author_name)}</i>\n\n"
                f"👉 <i>Смотрите актуальное расписание кнопкой <b>«📅 Сегодня»</b> или <b>«⚠️ Замены пар»</b></i>"
            )
            await bot.send_message(
                chat_id=CHAT_ID,
                text=alert_text,
                link_preview_options=types.LinkPreviewOptions(is_disabled=True)
            )
            logger.info(f"Оповещение о замене успешно разослано в группу {CHAT_ID}")
        except Exception as e:
            logger.warning(f"Не удалось отправить уведомление о замене в группу: {e}")


@dp.message(Command("zamena_del"))
async def handle_zamena_del_cmd(message: types.Message):
    if not await is_user_admin(message):
        await message.answer("⛔️ У вас нет прав для изменения замен.")
        return

    parts = message.text.split(maxsplit=2)
    if len(parts) < 3:
        await message.answer("ℹ️ Использование: <code>/zamena_del &lt;дата&gt; &lt;номер_пары&gt;</code>\nПример: <code>/zamena_del 17.10 3</code>")
        return

    d_obj = parse_date_input(parts[1])
    if not d_obj:
        await message.answer(f"❌ Не удалось распознать дату: <code>{parts[1]}</code>.")
        return

    try:
        p_num = int(parts[2])
    except ValueError:
        await message.answer("❌ Номер пары должен быть числом от 1 до 6.")
        return

    deleted = delete_replacement(d_obj, p_num)
    if deleted:
        await message.answer(f"✅ Замена на <b>{d_obj.strftime('%d.%m.%Y')}</b> (пара №{p_num}) успешно удалена.")
    else:
        await message.answer(f"ℹ️ Замена для пары №{p_num} на {d_obj.strftime('%d.%m.%Y')} не была найдена.")


# -------------------------------------------------------------
# Раздел: СДО Moodle и материалы
# -------------------------------------------------------------
@dp.message(Command("moodle"))
@dp.message(Command("materials"))
@dp.message(Command("materialy"))
@dp.message(F.text == "📁 СДО и Материалы")
async def handle_moodle_and_materials(message: types.Message):
    text = get_moodle_info_text()
    kb = get_moodle_keyboard()
    await message.answer(text, reply_markup=kb, link_preview_options=types.LinkPreviewOptions(is_disabled=True))


@dp.message(Command("maket"))
@dp.callback_query(F.data == "download_maket_docx")
async def handle_download_maket(event: types.Message | types.CallbackQuery):
    if not os.path.exists(MAKET_DOCX):
        error_text = "❌ Файл макета титульного листа не найден на сервере. Обратитесь к разработчику."
        if isinstance(event, types.CallbackQuery):
            await event.answer("Файл временно недоступен", show_alert=True)
            return
        await event.answer(error_text)
        return

    caption = (
        "📄 <b>Макет титульного листа для практических и лабораторных работ</b>\n"
        "Группа: <code>9ПО-43к</code> · 4 курс 1 семестр\n\n"
        "💡 <i>Откройте файл в Word или Google Docs, заполните тему, номер работы и вашу фамилию.</i>"
    )

    if isinstance(event, types.CallbackQuery):
        await event.answer("Отправляю документ...")
        await event.message.answer_document(
            document=types.FSInputFile(MAKET_DOCX, filename="maket_titul_pz_lr.docx"),
            caption=caption
        )
    else:
        await event.answer_document(
            document=types.FSInputFile(MAKET_DOCX, filename="maket_titul_pz_lr.docx"),
            caption=caption
        )


# -------------------------------------------------------------
# Раздел: Настройки пользователя и уведомлений
# -------------------------------------------------------------
@dp.message(Command("settings"))
@dp.message(Command("remind"))
@dp.message(Command("notify"))
@dp.message(F.text == "⚙️ Настройки")
@dp.message(F.text == "🔔 Мои напоминания")
async def handle_user_settings(message: types.Message):
    user_id = message.from_user.id
    user_name = message.from_user.first_name or ""
    is_admin = await check_admin_privileges(user_id, message.chat)
    text = format_user_settings_text(user_id, user_name)
    kb = get_user_settings_keyboard(user_id, is_admin=is_admin)
    await message.answer(text, reply_markup=kb)


@dp.callback_query(F.data.startswith("toggle_set_"))
async def handle_toggle_user_setting(call: types.CallbackQuery):
    key = call.data.replace("toggle_set_", "")
    user_id = call.from_user.id
    new_val = toggle_user_setting(user_id, key)
    
    titles = {
        "remind_10min": "Колокольчик за 10 мин",
        "morning_alert": "Утренняя сводка (08:00)",
        "five_min_breaks": "Оповещения о пятиминутках"
    }
    title = titles.get(key, key)
    state_str = "включено ✅" if new_val else "отключено ❌"
    await call.answer(f"{title}: {state_str}")

    user_name = call.from_user.first_name or ""
    is_admin = await check_admin_privileges(user_id, call.message.chat)
    text = format_user_settings_text(user_id, user_name)
    kb = get_user_settings_keyboard(user_id, is_admin=is_admin)
    try:
        await call.message.edit_text(text, reply_markup=kb)
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e).lower():
            logger.debug(f"Toggle setting error: {e}")
    except Exception:
        pass


@dp.callback_query(F.data == "user_refresh_ui")
async def handle_user_refresh_ui(call: types.CallbackQuery):
    if bot:
        await register_bot_commands(bot)
    await call.message.answer(
        "🔄 <b>Интерфейс бота успешно обновлён!</b>\n\n"
        "▫️ Меню команд [ / ] актуализировано.\n"
        "▫️ Экранная клавиатура синхронизирована с сервером.",
        reply_markup=main_keyboard
    )
    await call.answer("Интерфейс обновлён! ✅")


@dp.message(Command("refresh"))
@dp.message(Command("update"))
async def handle_refresh_command(message: types.Message):
    if bot:
        await register_bot_commands(bot)
    await message.answer(
        "🔄 <b>Интерфейс и команды бота обновлены!</b>\n\n"
        "Все кнопки и команды меню синхронизированы с сервером.",
        reply_markup=main_keyboard
    )


# -------------------------------------------------------------
# Раздел: Панель администратора
# -------------------------------------------------------------
@dp.message(Command("admin"))
@dp.callback_query(F.data == "open_admin_panel")
@dp.callback_query(F.data == "admin_back_to_main")
async def handle_admin_panel(event: types.Message | types.CallbackQuery):
    user_id = event.from_user.id
    chat = event.message.chat if isinstance(event, types.CallbackQuery) else event.chat
    
    if not await check_admin_privileges(user_id, chat):
        msg = "⛔️ Панель администратора доступна только доверенным пользователям."
        if isinstance(event, types.CallbackQuery):
            await event.answer(msg, show_alert=True)
        else:
            await event.answer(msg)
        return

    text = get_admin_dashboard_text(BOT_START_TIME)
    kb = get_admin_main_keyboard()

    if isinstance(event, types.CallbackQuery):
        try:
            await event.message.edit_text(text, reply_markup=kb)
        except TelegramBadRequest as e:
            if "message is not modified" not in str(e).lower():
                await event.message.answer(text, reply_markup=kb)
        await event.answer()
    else:
        await event.answer(text, reply_markup=kb)


@dp.callback_query(F.data == "admin_git_pull")
async def handle_admin_git_pull(call: types.CallbackQuery):
    if not await check_admin_privileges(call.from_user.id, call.message.chat):
        await call.answer("⛔️ Отказано в доступе", show_alert=True)
        return

    await call.answer("⏳ Выполняю git pull origin main...")
    status_msg = await call.message.answer("⏳ <i>Подтягиваю изменения с GitHub репозитория...</i>")
    success, output = run_git_pull()
    
    if bot:
        await register_bot_commands(bot)

    if success:
        result_text = (
            "✅ <b>Git pull выполнен успешно!</b>\n\n"
            f"<pre>{html.escape(output[:1500])}</pre>\n\n"
            "💡 <i>Если изменился код Python, нажмите «⚡️ Рестарт бота» в админке для мгновенного применения!</i>"
        )
    else:
        result_text = (
            "❌ <b>Ошибка при выполнении git pull:</b>\n\n"
            f"<pre>{html.escape(output[:1500])}</pre>"
        )

    await status_msg.edit_text(result_text)


@dp.callback_query(F.data == "admin_restart")
async def handle_admin_restart(call: types.CallbackQuery):
    if not await check_admin_privileges(call.from_user.id, call.message.chat):
        await call.answer("⛔️ Отказано в доступе", show_alert=True)
        return

    await call.answer("⚡️ Перезапускаю процесс бота...", show_alert=True)
    await call.message.answer(
        "🔄 <b>Перезапуск процесса бота...</b>\n\n"
        "Бот снова выйдет на связь через 2-3 секунды с обновлённым кодом."
    )
    
    def _restart():
        logger.info("Мягкий перезапуск процесса бота по команде администратора...")
        os.execv(sys.executable, [sys.executable] + sys.argv)

    asyncio.get_event_loop().call_later(1.0, _restart)


@dp.callback_query(F.data == "admin_manage_zameny")
async def handle_admin_manage_zameny(call: types.CallbackQuery):
    if not await check_admin_privileges(call.from_user.id, call.message.chat):
        await call.answer("⛔️ Отказано в доступе", show_alert=True)
        return

    kb = get_admin_replacements_keyboard()
    summary = format_replacements_summary()
    text = (
        "⚠️ <b>Управление заменами и отменами пар:</b>\n"
        "──────────────────────\n"
        f"{summary}\n\n"
        "👇 <i>Нажмите кнопку ниже, чтобы удалить нужную замену в 1 клик, или используйте команду:</i>\n"
        "<code>/zamena &lt;дата&gt; &lt;пара&gt; &lt;предмет/отмена&gt;</code>"
    )
    try:
        await call.message.edit_text(text, reply_markup=kb)
    except Exception:
        await call.message.answer(text, reply_markup=kb)
    await call.answer()


@dp.callback_query(F.data.startswith("adm_del_zam_"))
async def handle_admin_delete_zamena(call: types.CallbackQuery):
    if not await check_admin_privileges(call.from_user.id, call.message.chat):
        await call.answer("⛔️ Отказано в доступе", show_alert=True)
        return

    parts = call.data.split("_")
    date_str = parts[3]
    p_num = int(parts[4])
    
    d_obj = parse_date_input(date_str)
    if d_obj:
        delete_replacement(d_obj, p_num)
        await call.answer(f"Замена на {date_str} пара {p_num} удалена! 🗑", show_alert=False)
    
    kb = get_admin_replacements_keyboard()
    summary = format_replacements_summary()
    text = (
        "⚠️ <b>Управление заменами и отменами пар:</b>\n"
        "──────────────────────\n"
        f"{summary}\n\n"
        "👇 <i>Нажмите кнопку ниже, чтобы удалить нужную замену в 1 клик:</i>"
    )
    try:
        await call.message.edit_text(text, reply_markup=kb)
    except Exception:
        pass


@dp.callback_query(F.data == "admin_broadcast_menu")
async def handle_admin_broadcast_menu(call: types.CallbackQuery):
    if not await check_admin_privileges(call.from_user.id, call.message.chat):
        await call.answer("⛔️ Отказано в доступе", show_alert=True)
        return

    text = (
        "📢 <b>Рассылка объявлений от имени бота</b>\n"
        "──────────────────────\n"
        "Чтобы разослать важное сообщение во все каналы, введите:\n\n"
        "<code>/broadcast &lt;текст вашего сообщения&gt;</code>\n\n"
        "▫️ Сообщение придёт в привязанный чат группы 9ПО-43к.\n"
        "▫️ А также в личные сообщения всем пользователям, взаимодействовавшим с ботом.\n\n"
        "<i>Поддерживается HTML-разметка (&lt;b&gt;, &lt;i&gt;, &lt;code&gt;).</i>"
    )
    back_kb = InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="◀️ Назад в админку", callback_data="admin_back_to_main")]]
    )
    try:
        await call.message.edit_text(text, reply_markup=back_kb)
    except Exception:
        await call.message.answer(text, reply_markup=back_kb)
    await call.answer()


@dp.message(Command("broadcast"))
async def handle_broadcast_command(message: types.Message):
    if not await check_admin_privileges(message.from_user.id, message.chat):
        await message.answer("⛔️ Эта команда доступна только администраторам бота.")
        return

    parts = message.text.split(maxsplit=1)
    if len(parts) < 2 or not parts[1].strip():
        await message.answer(
            "ℹ️ <b>Формат рассылки:</b>\n<code>/broadcast &lt;текст объявления&gt;</code>",
            reply_markup=main_keyboard
        )
        return

    broadcast_text = (
        f"📢 <b>ОБЪЯВЛЕНИЕ ДЛЯ ГРУППЫ 9ПО-43к</b>\n"
        f"──────────────────────\n"
        f"{parts[1].strip()}\n\n"
        f"👤 <i>От: {html.escape(message.from_user.full_name or 'Администрация')}</i>"
    )

    status_msg = await message.answer("⏳ <i>Рассылаю сообщение...</i>")
    sent_count = 0
    fail_count = 0

    if CHAT_ID:
        try:
            await bot.send_message(
                chat_id=CHAT_ID,
                text=broadcast_text,
                link_preview_options=types.LinkPreviewOptions(is_disabled=True)
            )
            sent_count += 1
        except Exception as e:
            logger.warning(f"Ошибка broadcast в группу {CHAT_ID}: {e}")
            fail_count += 1

    all_users = load_all_settings()
    for uid_str in all_users.keys():
        try:
            uid = int(uid_str)
            if uid == CHAT_ID or uid == message.from_user.id:
                continue
            await bot.send_message(
                chat_id=uid,
                text=broadcast_text,
                link_preview_options=types.LinkPreviewOptions(is_disabled=True)
            )
            sent_count += 1
            await asyncio.sleep(0.05)
        except Exception:
            fail_count += 1

    await status_msg.edit_text(
        f"✅ <b>Рассылка успешно завершена!</b>\n\n"
        f"▫️ Доставлено: <b>{sent_count}</b> получателям\n"
        f"▫️ Ошибок: <b>{fail_count}</b>"
    )


@dp.callback_query(F.data == "admin_tests_menu")
async def handle_admin_tests_menu(call: types.CallbackQuery):
    if not await check_admin_privileges(call.from_user.id, call.message.chat):
        await call.answer("⛔️ Отказано в доступе", show_alert=True)
        return

    kb = get_admin_tests_keyboard()
    text = (
        "🧪 <b>Тестирование фоновых рассылок</b>\n"
        "──────────────────────\n"
        "Нажмите кнопку ниже для отправки тестового уведомления:"
    )
    try:
        await call.message.edit_text(text, reply_markup=kb)
    except Exception:
        await call.message.answer(text, reply_markup=kb)
    await call.answer()


@dp.callback_query(F.data == "admin_refresh_all_commands")
async def handle_admin_refresh_all_commands(call: types.CallbackQuery):
    if not await check_admin_privileges(call.from_user.id, call.message.chat):
        await call.answer("⛔️ Отказано в доступе", show_alert=True)
        return

    if bot:
        await register_bot_commands(bot)
    await call.answer("✅ Команды меню Telegram обновлены глобально!", show_alert=True)


@dp.callback_query(F.data == "admin_close")
async def handle_admin_close(call: types.CallbackQuery):
    try:
        await call.message.delete()
    except Exception:
        await call.message.edit_text("Панель закрыта.")
    await call.answer()


@dp.callback_query(F.data == "test_send_midnight")
async def handle_test_midnight(call: types.CallbackQuery):
    await call.answer("Отправляю тестовую полночную сводку...")
    await send_midnight_schedule()


@dp.callback_query(F.data == "test_send_morning")
async def handle_test_morning(call: types.CallbackQuery):
    await call.answer("Отправляю тестовое утреннее оповещение (08:00)...")
    await send_morning_alert()


@dp.callback_query(F.data == "test_send_five_min")
async def handle_test_five_min(call: types.CallbackQuery):
    await call.answer("Отправляю тестовое оповещение о пятиминутке...")
    await send_five_minute_break(4)


@dp.callback_query(F.data == "test_send_ten_min")
async def handle_test_ten_min(call: types.CallbackQuery):
    await call.answer("Отправляю тестовое напоминание за 10 минут...")
    if bot:
        await send_pair_reminder(bot, 4)


# -------------------------------------------------------------
# Раздел: Инлайн-режим (Inline Mode @aituraspisaniebot)
# -------------------------------------------------------------
@dp.inline_query()
async def handle_inline_query(inline_query: types.InlineQuery):
    """
    Инлайн-режим: позволяет вызывать бота в любом чате через @aituraspisaniebot.
    Делится расписанием на сегодня, завтра, текущим статусом, звонками и заменами.
    """
    query = inline_query.query.strip().lower()
    results: list[types.InlineQueryResultArticle] = []
    
    now = datetime.now(BOT_TZ)
    today = now.date()
    tomorrow = today + timedelta(days=1)
    current_time_str = now.strftime("%H:%M")
    parity_code, parity_name = get_week_parity(today)
    
    # 1. Сегодня
    today_text = format_day_schedule(today, title_prefix="Расписание на сегодня", current_time_str=current_time_str)
    results.append(
        types.InlineQueryResultArticle(
            id="inline_today",
            title="📅 Расписание на сегодня",
            description=f"{DAYS_RU[today.weekday()]}, {today.day} {MONTHS_RU[today.month]} · {parity_name}",
            input_message_content=types.InputTextMessageContent(
                message_text=today_text,
                parse_mode=ParseMode.HTML
            )
        )
    )

    # 2. Завтра
    tomorrow_text = format_day_schedule(tomorrow, title_prefix="Расписание на завтра")
    results.append(
        types.InlineQueryResultArticle(
            id="inline_tomorrow",
            title="🔜 Расписание на завтра",
            description=f"{DAYS_RU[tomorrow.weekday()]}, {tomorrow.day} {MONTHS_RU[tomorrow.month]}",
            input_message_content=types.InputTextMessageContent(
                message_text=tomorrow_text,
                parse_mode=ParseMode.HTML
            )
        )
    )

    # 3. Сейчас идёт пара
    now_text = get_now_status(now)
    results.append(
        types.InlineQueryResultArticle(
            id="inline_now",
            title="⚡️ Какая пара идёт сейчас?",
            description=f"Текущее время {current_time_str} · прогресс пары и звонки",
            input_message_content=types.InputTextMessageContent(
                message_text=now_text,
                parse_mode=ParseMode.HTML
            )
        )
    )

    # 4. Неделя
    monday = today - timedelta(days=today.weekday())
    week_text = format_week_schedule(monday)
    results.append(
        types.InlineQueryResultArticle(
            id="inline_week",
            title="🗓 Расписание на всю неделю",
            description="Понедельник — Пятница (группа 9ПО-43к)",
            input_message_content=types.InputTextMessageContent(
                message_text=week_text,
                parse_mode=ParseMode.HTML
            )
        )
    )

    # 5. Замены и отмены
    zameny_text = format_replacements_summary()
    results.append(
        types.InlineQueryResultArticle(
            id="inline_zameny",
            title="⚠️ Замены и отмены пар",
            description="Актуальные изменения в расписании",
            input_message_content=types.InputTextMessageContent(
                message_text=zameny_text,
                parse_mode=ParseMode.HTML
            )
        )
    )

    # 6. Звонки
    results.append(
        types.InlineQueryResultArticle(
            id="inline_bells",
            title="🔔 Расписание звонков и пятиминуток",
            description="1-4 пары, 5-минутки внутри и обед 35 минут",
            input_message_content=types.InputTextMessageContent(
                message_text=BELLS_TEXT,
                parse_mode=ParseMode.HTML
            )
        )
    )

    # 7. СДО Moodle
    moodle_text = get_moodle_info_text()
    results.append(
        types.InlineQueryResultArticle(
            id="inline_moodle",
            title="📁 СДО Moodle и материалы",
            description="Ссылка на moodle.astanait.edu.kz и макет титульника",
            input_message_content=types.InputTextMessageContent(
                message_text=moodle_text,
                parse_mode=ParseMode.HTML
            )
        )
    )

    if query:
        search_results: list[types.InlineQueryResultArticle] = []
        
        # Если ввод похож на номер кабинета (например "304", "515", "с/з")
        if any(c.isdigit() for c in query) or "с/з" in query or "зал" in query:
            room_res = search_room_schedule(query)
            if "не найден" not in room_res.lower():
                search_results.append(
                    types.InlineQueryResultArticle(
                        id=f"inline_room_{query}",
                        title=f"📍 Кабинет {query.upper()}",
                        description=f"Расписание занятий в аудитории {query.upper()}",
                        input_message_content=types.InputTextMessageContent(
                            message_text=room_res,
                            parse_mode=ParseMode.HTML
                        )
                    )
                )

        # Если совпадение с днем недели
        day_keywords = {
            "понедельник": 0, "пн": 0,
            "вторник": 1, "вт": 1,
            "среда": 2, "ср": 2,
            "четверг": 3, "чт": 3,
            "пятница": 4, "пт": 4
        }
        for kw, d_idx in day_keywords.items():
            if kw in query:
                d_text = format_weekday_by_index(d_idx, parity_code)
                search_results.append(
                    types.InlineQueryResultArticle(
                        id=f"inline_day_{d_idx}",
                        title=f"📆 {DAYS_RU[d_idx]} ({parity_name})",
                        description=f"Расписание на {DAYS_RU[d_idx]} для текущей недели",
                        input_message_content=types.InputTextMessageContent(
                            message_text=d_text,
                            parse_mode=ParseMode.HTML
                        )
                    )
                )
                break

        if search_results:
            results = search_results + results

    logger.info(f"Инлайн-запрос от user_id={inline_query.from_user.id}: query={query!r}, возвращаем {len(results)} карточек")
    try:
        await inline_query.answer(
            results=results[:20],
            cache_time=1,
            is_personal=True
        )
    except Exception as e:
        logger.error(f"Ошибка при ответе на inline_query: {e}", exc_info=True)



@dp.message(Command("help"))
async def handle_help(message: types.Message):
    help_text = (
        "📖 <b>Справка по командам бота расписания (9ПО-43к):</b>\n\n"
        "🏠 <b>Быстрый доступ:</b>\n"
        "⚡️ /now — Какая пара идёт сейчас (прогресс и время до звонка)\n"
        "📅 /today — Расписание на сегодня (+ навигация по дням)\n"
        "🔜 /tomorrow — Расписание на завтра\n\n"
        "🗓 <b>Папка «Расписание»:</b>\n"
        "🗓 /week — Расписание на текущую неделю\n"
        "⏭ /next_week — Расписание на следующую неделю\n"
        "📆 /days — Выбрать день недели (интерактивно)\n"
        "🏷 /parity — Текущая чётность (Числитель / Знаменатель)\n\n"
        "🛠 <b>Папка «Полезное»:</b>\n"
        "🔔 /bells — Расписание звонков и перерывов\n"
        "⚠️ /zameny — Актуальные замены и отмены пар\n"
        "📁 /moodle — Портал СДО и материалы группы\n"
        "📄 /maket — Скачать макет титульного листа (.docx)\n"
        "⚙️ /settings — Персональные настройки уведомлений\n"
        "🔄 /refresh — Обновить интерфейс и меню бота\n"
        "👨‍🏫 /teachers — Справочник преподавателей группы\n"
        "📍 /room <code>&lt;номер&gt;</code> — Поиск пар по кабинету (например, <code>/room 305</code>)\n"
        "📥 /calendar — Скачать расписание в календарь смартфона (.ics)\n\n"
        "👑 <b>Для старосты и админов:</b>\n"
        "👑 /admin — Интерактивная панель администратора\n"
        "✏️ /zamena <code>&lt;дата&gt; &lt;пара&gt; &lt;текст/отмена&gt;</code> — Добавить замену\n"
        "🗑 /zamena del <code>&lt;дата&gt; &lt;пара&gt;</code> — Удалить замену\n"
        "📢 /broadcast <code>&lt;текст&gt;</code> — Объявление для группы и подписчиков\n\n"
        "💬 <b>Инлайн-режим:</b>\n"
        "Напишите <code>@aituraspisaniebot</code> в любом чате Telegram, чтобы поделиться расписанием!\n\n"
        "⚙️ <b>Навигация:</b>\n"
        "🏠 /menu — Открыть главное меню\n"
        "🆔 /chat_id — Узнать ID чата для рассылок\n"
        "❓ /help — Показать эту справку"
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
        
    await message.answer("⏳ Тестирую отправку рассылок...")
    await send_midnight_schedule()
    await send_morning_alert()
    await send_five_minute_break(2)
    await message.answer("✅ Тест отправки завершён (полночь, 08:00 и пятиминутка).")


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
    Фоновый анти-сон для Render: каждые 4 минуты шлёт запрос на /health.
    Предотвращает засыпание (spin down) бесплатного контейнера Render (лимит 15 минут).
    """
    render_url = (
        os.getenv("RENDER_EXTERNAL_URL")
        or os.getenv("RENDER_URL")
        or os.getenv("APP_URL")
        or ""
    ).strip()

    if not render_url:
        service_name = os.getenv("RENDER_SERVICE_NAME", "").strip()
        if service_name:
            render_url = f"https://{service_name}.onrender.com"
        elif os.getenv("RENDER") or os.getenv("RENDER_INSTANCE_ID"):
            render_url = "https://aitu-schedule-bot.onrender.com"

    if not render_url:
        logger.info("Внешний URL не задан (активен локальный режим). Анти-сон отключен.")
        return

    if not render_url.startswith("http"):
        render_url = f"https://{render_url}"

    ping_target = f"{render_url.rstrip('/')}/health"
    logger.info(f"🛡 Автопинг Render (анти-сон) включен! Интервал: 4 мин. Цель: {ping_target}")
    
    # Небольшая пауза перед первым пингом
    await asyncio.sleep(30)
    async with ClientSession() as session:
        while True:
            try:
                async with session.get(ping_target, timeout=20) as resp:
                    logger.info(f"Keep-Alive пинг Render выполнен: статус {resp.status}")
            except Exception as e:
                logger.debug(f"Keep-Alive пинг ({ping_target}): {e}")
            await asyncio.sleep(240)  # Пинг раз в 4 минуты (Render засыпает через 15 минут неактивности)


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
        
        await register_bot_commands(bot)

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

        # Расписание 3: Уведомления о пятиминутках внутри каждой пары по будням
        # 1-я пара: 09:45
        scheduler.add_job(
            send_five_minute_break,
            trigger="cron",
            day_of_week="mon-fri",
            hour=9,
            minute=45,
            second=0,
            args=[1],
            id="break_pair_1",
            replace_existing=True
        )
        # 2-я пара: 11:30
        scheduler.add_job(
            send_five_minute_break,
            trigger="cron",
            day_of_week="mon-fri",
            hour=11,
            minute=30,
            second=0,
            args=[2],
            id="break_pair_2",
            replace_existing=True
        )
        # 3-я пара: 13:40
        scheduler.add_job(
            send_five_minute_break,
            trigger="cron",
            day_of_week="mon-fri",
            hour=13,
            minute=40,
            second=0,
            args=[3],
            id="break_pair_3",
            replace_existing=True
        )
        # 4-я пара: 15:25
        scheduler.add_job(
            send_five_minute_break,
            trigger="cron",
            day_of_week="mon-fri",
            hour=15,
            minute=25,
            second=0,
            args=[4],
            id="break_pair_4",
            replace_existing=True
        )

        # Расписание 4: Личный колокольчик — напоминания за 10 минут до каждой пары по будням
        # 1-я пара: 08:50 (начало в 09:00)
        scheduler.add_job(
            send_pair_reminder,
            trigger="cron",
            day_of_week="mon-fri",
            hour=8,
            minute=50,
            second=0,
            args=[bot, 1],
            id="remind_pair_1",
            replace_existing=True
        )
        # 2-я пара: 10:35 (начало в 10:45)
        scheduler.add_job(
            send_pair_reminder,
            trigger="cron",
            day_of_week="mon-fri",
            hour=10,
            minute=35,
            second=0,
            args=[bot, 2],
            id="remind_pair_2",
            replace_existing=True
        )
        # 3-я пара: 12:45 (начало в 12:55)
        scheduler.add_job(
            send_pair_reminder,
            trigger="cron",
            day_of_week="mon-fri",
            hour=12,
            minute=45,
            second=0,
            args=[bot, 3],
            id="remind_pair_3",
            replace_existing=True
        )
        # 4-я пара: 14:30 (начало в 14:40)
        scheduler.add_job(
            send_pair_reminder,
            trigger="cron",
            day_of_week="mon-fri",
            hour=14,
            minute=30,
            second=0,
            args=[bot, 4],
            id="remind_pair_4",
            replace_existing=True
        )
        
        scheduler.start()
        
        logger.info(f"Планировщик запущен. Часовой пояс: {BOT_TZ}. Рассылки в 00:00, 08:00, пятиминутки и напоминания за 10 мин.")
        
        # Удаляем вебхуки если были, и запускаем опрос
        await bot.delete_webhook(drop_pending_updates=True)
        await dp.start_polling(
            bot,
            allowed_updates=["message", "inline_query", "callback_query"]
        )
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
