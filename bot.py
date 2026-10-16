import asyncio
import logging
import os
import sys
from datetime import datetime, timedelta, date

from aiogram import Bot, Dispatcher, types, F
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.client.default import DefaultBotProperties
from aiogram.exceptions import TelegramBadRequest
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from aiohttp import web, ClientSession

import html

from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

from config import BOT_TOKEN, CHAT_ID, BOT_TZ, ADMIN_ID, ADMIN_IDS
from schedule_data import (
    SCHEDULE,
    DAYS_RU,
    get_course_from_group_name,
    get_bell_schedule,
    get_course_lunch_info,
    COURSE_BELL_SCHEDULE,
)
from formatter import (
    format_day_schedule,
    format_week_schedule,
    format_weekday_by_index,
    format_morning_alert,
    get_formatted_day_schedule,
    get_formatted_week_schedule,
    get_formatted_weekday_by_index,
    get_formatted_morning_alert,
    MONTHS_RU
)
from db.crud import (
    get_or_create_user,
    get_user,
    get_user_by_username,
    update_user_group,
    update_user_role,
    update_user_setting,
    get_users_by_group,
    get_users_for_notification,
    count_all_users,
    get_all_groups,
    get_group_by_name,
    add_group,
    get_all_courses,
    get_lessons_for_day,
    update_lesson_room,
    get_replacements_for_date_and_group,
    add_replacement_record,
    delete_replacement_record,
    bind_chat_to_group,
    get_chat_group,
    get_chats_for_group,
    get_all_chat_bindings
)
from permissions import (
    is_superadmin,
    is_admin,
    is_starosta,
    is_starosta_or_zam,
    can_manage_group,
    get_user_role_display
)
from keyboards import (
    get_courses_keyboard,
    get_groups_by_course_keyboard,
    get_starosta_panel_keyboard
)
from features import get_formatted_now_status
from starosta import (
    parse_weekday_input,
    DAYS_NAMES_RU,
    get_starosta_dashboard_text
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
    get_replacements_keyboard,
    get_lectures_menu_keyboard,
    get_subject_lectures_keyboard,
    get_dates_lectures_keyboard,
    get_date_lectures_keyboard,
    get_lecture_card_keyboard,
    get_lecture_reader_keyboard
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
from lectures import (
    get_all_lectures,
    get_lecture_by_id,
    get_subject_info,
    get_subjects_with_counts,
    get_lectures_by_subject_code,
    get_unique_dates,
    get_lectures_by_date_iso,
    search_lectures,
    format_lecture_card,
    get_lecture_pages,
    format_lecture_page,
    get_lecture_file_path
)

# Время запуска для расчета Uptime
BOT_START_TIME = datetime.now(BOT_TZ)


class RegistrationState(StatesGroup):
    waiting_manual_group = State()


async def resolve_target_group(chat: types.Chat | None = None, user: types.User | None = None) -> str:
    """
    Определяет целевую учебную группу:
    - Если сообщение из группы/супергруппы -> привязанная к чату группа.
    - Если личные сообщения -> группа пользователя из БД (по умолчанию 9ПО-43к).
    """
    if chat and chat.type in ("group", "supergroup"):
        bound_grp = await get_chat_group(chat.id)
        if bound_grp:
            return bound_grp
    if user:
        db_user = await get_user(user.id)
        if db_user and db_user.group_name:
            return db_user.group_name
    return "9ПО-43к"


async def register_bot_commands(bot_instance: Bot):
    """Регистрирует команды в меню Telegram."""
    try:
        await bot_instance.set_my_commands([
            types.BotCommand(command="now", description="⚡️ Какая пара идёт сейчас"),
            types.BotCommand(command="today", description="📅 Расписание на сегодня"),
            types.BotCommand(command="tomorrow", description="🔜 Расписание на завтра"),
            types.BotCommand(command="week", description="🗓 Расписание на эту неделю"),
            types.BotCommand(command="lectures", description="📚 Конспекты лекций 4 курса"),
            types.BotCommand(command="zameny", description="⚠️ Замены и отмены пар"),
            types.BotCommand(command="settings", description="⚙️ Настройки уведомлений"),
            types.BotCommand(command="group", description="👥 Сменить учебную группу"),
            types.BotCommand(command="starosta", description="⭐️ Панель старосты"),
            types.BotCommand(command="bind", description="💬 Привязать беседу к группе"),
            types.BotCommand(command="refresh", description="🔄 Обновить интерфейс"),
            types.BotCommand(command="moodle", description="📁 СДО Moodle и материалы"),
            types.BotCommand(command="maket", description="📄 Титульный лист (.docx)"),
            types.BotCommand(command="teachers", description="👨‍🏫 Преподаватели группы"),
            types.BotCommand(command="room", description="📍 Поиск пар по кабинету"),
            types.BotCommand(command="calendar", description="📥 Добавить в календарь (.ics)"),
            types.BotCommand(command="parity", description="🏷 Чётность (числ / знам)"),
            types.BotCommand(command="bells", description="🔔 Расписание звонков"),
            types.BotCommand(command="id", description="🆔 Узнать свой Telegram ID"),
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

def get_bells_text(course: int = 4) -> str:
    """Генерирует текст расписания звонков для указанного курса (1..4)."""
    sched = get_bell_schedule(course)
    lunch = get_course_lunch_info(course)

    text = (
        f"🔔 <b>Расписание звонков · {course} курс</b>\n"
        f"──────────────────────\n"
        f"<blockquote>"
        f"1️⃣ пара: <b>{sched[1]['range']}</b>\n"
        f"⏱ <i>{sched[1]['breakdown']}</i>\n\n"
    )
    if course == 1:
        text += f"🍽 <b>Обед: {lunch['start']} — {lunch['end']} ({lunch['duration']})</b>\n\n"

    text += (
        f"2️⃣ пара: <b>{sched[2]['range']}</b>\n"
        f"⏱ <i>{sched[2]['breakdown']}</i>\n\n"
    )
    if course == 2:
        text += f"🍽 <b>Обед: {lunch['start']} — {lunch['end']} ({lunch['duration']}, внутри 2-й пары)</b>\n\n"
    elif course in (3, 4):
        text += f"🍽 <b>Обед: {lunch['start']} — {lunch['end']} ({lunch['duration']})</b>\n\n"

    text += (
        f"3️⃣ пара: <b>{sched[3]['range']}</b>\n"
        f"⏱ <i>{sched[3]['breakdown']}</i>\n\n"
        f"4️⃣ пара: <b>{sched[4]['range']}</b>\n"
        f"⏱ <i>{sched[4]['breakdown']}</i>"
        f"</blockquote>\n"
    )
    if course == 1:
        text += "💡 <i>Обед после 1-й пары (10:35–11:10). Перерывы между парами: 10 минут.</i>"
    elif course == 2:
        text += "💡 <i>Обед внутри 2-й пары (11:30–12:00, 30 мин). Перерывы между парами: 10 минут.</i>"
    else:
        text += "💡 <i>Обед после 2-й пары (12:20–12:55). Перерывы между парами: 10 минут.</i>"

    return text


def get_bells_course_keyboard(active_course: int = 4) -> types.InlineKeyboardMarkup:
    """Создаёт инлайн-клавиатуру для быстрого переключения между звонками 1..4 курсов."""
    buttons = []
    for c in [1, 2, 3, 4]:
        label = f"• {c} курс •" if c == active_course else f"{c} курс"
        buttons.append(types.InlineKeyboardButton(text=label, callback_data=f"bells_course_{c}"))
    return types.InlineKeyboardMarkup(inline_keyboard=[buttons])


BELLS_TEXT = get_bells_text(4)

async def send_midnight_schedule():
    """
    Задача в 00:00: рассылка подробного расписания на день по всем привязанным чатам.
    """
    now = datetime.now(BOT_TZ)
    target_date = now.date()
    
    bindings = await get_all_chat_bindings()
    # Если бесед в базе нет, используем legacy CHAT_ID
    if not bindings and CHAT_ID:
        try:
            text = await get_formatted_day_schedule(target_date, title_prefix="Расписание на сегодня", group_name="9ПО-43к")
            await bot.send_message(chat_id=CHAT_ID, text=text, reply_markup=main_keyboard, link_preview_options=types.LinkPreviewOptions(is_disabled=True))
        except Exception as e:
            logger.error(f"Ошибка полночной рассылки в legacy чат {CHAT_ID}: {e}")

    for b in bindings:
        try:
            text = await get_formatted_day_schedule(target_date, title_prefix="Расписание на сегодня", group_name=b.group_name)
            await bot.send_message(chat_id=b.chat_id, text=text, reply_markup=main_keyboard, link_preview_options=types.LinkPreviewOptions(is_disabled=True))
            await asyncio.sleep(0.05)
        except Exception as e:
            logger.warning(f"Ошибка полночной рассылки в чат {b.chat_id} ({b.group_name}): {e}")


async def send_morning_alert():
    """
    Задача по будням в 08:00: утреннее напоминание о 1-й паре студентам и привязанным беседам.
    """
    today = datetime.now(BOT_TZ).date()
    if today.weekday() >= 5:
        return

    # 1. Отправка в привязанные беседы
    bindings = await get_all_chat_bindings()
    if not bindings and CHAT_ID:
        text = await get_formatted_morning_alert(today, group_name="9ПО-43к")
        if text:
            try:
                await bot.send_message(chat_id=CHAT_ID, text=text, reply_markup=main_keyboard, link_preview_options=types.LinkPreviewOptions(is_disabled=True))
            except Exception as e:
                logger.error(f"Ошибка утренней рассылки в legacy чат {CHAT_ID}: {e}")

    for b in bindings:
        text = await get_formatted_morning_alert(today, group_name=b.group_name)
        if text:
            try:
                await bot.send_message(chat_id=b.chat_id, text=text, reply_markup=main_keyboard, link_preview_options=types.LinkPreviewOptions(is_disabled=True))
                await asyncio.sleep(0.05)
            except Exception as e:
                logger.warning(f"Ошибка утренней рассылки в чат {b.chat_id} ({b.group_name}): {e}")

    # 2. Персональная рассылка студентам
    users = await get_users_for_notification("morning_alert")
    for u in users:
        text = await get_formatted_morning_alert(today, group_name=u.group_name or "9ПО-43к")
        if text:
            try:
                await bot.send_message(chat_id=u.user_id, text=text, reply_markup=main_keyboard, link_preview_options=types.LinkPreviewOptions(is_disabled=True))
                await asyncio.sleep(0.05)
            except Exception:
                pass


COURSE_FIVE_MIN_BREAKS = {
    1: {
        1: {
            "start": "09:45",
            "end": "09:50",
            "resume": "09:50",
            "pair_end": "10:35",
            "tip": "Время размяться, выпить воды или дать глазам отдохнуть от экрана 🧘‍♂️"
        },
        2: {
            "start": "11:55",
            "end": "12:00",
            "resume": "12:00",
            "pair_end": "12:45",
            "tip": "Вторая половина пары продлится до 12:45 ☕️"
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
    },
    2: {
        1: {
            "start": "09:45",
            "end": "09:50",
            "resume": "09:50",
            "pair_end": "10:35",
            "tip": "Время размяться, выпить воды или дать глазам отдохнуть от экрана 🧘‍♂️"
        },
        2: {
            "start": "11:30",
            "end": "12:00",
            "resume": "12:00",
            "pair_end": "12:45",
            "is_lunch": True,
            "tip": "Большой 30-минутный обед внутри 2-й пары! Приятного аппетита 🥪"
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
    },
    3: {
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
    },
    4: {
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
}

FIVE_MIN_BREAKS = COURSE_FIVE_MIN_BREAKS[4]


async def send_five_minute_break(pair_num: int, target_courses: list[int] | None = None):
    """
    Отправляет уведомление о начале пятиминутного перерыва или обеда внутри пары.
    Проверяет расписание каждой группы в БД и отправляет только если пара есть.
    Поддерживает фильтрацию по целевым курсам target_courses.
    """
    if not bot:
        return

    now = datetime.now(BOT_TZ)
    weekday = now.weekday()
    if weekday >= 5:
        return

    parity_code, _ = get_week_parity(now.date())

    # 1. Отправка в привязанные беседы
    bindings = await get_all_chat_bindings()
    for b in bindings:
        c = get_course_from_group_name(b.group_name)
        if target_courses is not None and c not in target_courses:
            continue

        pairs = await get_lessons_for_day(b.group_name, weekday, parity_code)
        reps = await get_replacements_for_date_and_group(now.date(), b.group_name)
        if reps.get(pair_num, {}).get("type") == "cancel":
            continue
        p_info = pairs.get(pair_num)
        if not p_info:
            continue

        c_breaks = COURSE_FIVE_MIN_BREAKS.get(c, COURSE_FIVE_MIN_BREAKS[4])
        break_data = c_breaks.get(pair_num, {"start": "—", "end": "—", "resume": "—", "pair_end": "—", "tip": ""})
        is_lunch = break_data.get("is_lunch", False)

        title = f"🍽 <b>Звонок на обед! · 2-я пара ({c} курс)</b>" if is_lunch else f"🔔 <b>Звонок на пятиминутку! (Перерыв 5 минут) · {pair_num}-я пара</b>"
        label = "Время обеда:" if is_lunch else "Время перерыва:"

        subj = p_info.get("subject", "")
        room = p_info.get("room", "—")
        text = (
            f"{title}\n"
            f"──────────────────────\n"
            f"<blockquote>"
            f"⏱ <b>{label}</b> <code>{break_data['start']} — {break_data['end']}</code>\n"
            f"📚 <b>{html.escape(subj)}</b>\n"
            f"📍 Кабинет: <code>{html.escape(room)}</code>\n"
            f"🔔 <i>Звонок на 2-ю половину пары: в {break_data['resume']} (до {break_data['pair_end']})</i>"
            f"</blockquote>\n"
            f"💡 <i>{break_data['tip']}</i>"
        )
        try:
            await bot.send_message(chat_id=b.chat_id, text=text, reply_markup=main_keyboard, link_preview_options=types.LinkPreviewOptions(is_disabled=True))
            await asyncio.sleep(0.05)
        except Exception:
            pass

    # 2. Личная рассылка пользователям с включёнными пятиминутками
    users = await get_users_for_notification("five_min_breaks")
    for u in users:
        grp = u.group_name or "9ПО-43к"
        c = get_course_from_group_name(grp)
        if target_courses is not None and c not in target_courses:
            continue

        pairs = await get_lessons_for_day(grp, weekday, parity_code)
        reps = await get_replacements_for_date_and_group(now.date(), grp)
        if reps.get(pair_num, {}).get("type") == "cancel":
            continue
        p_info = pairs.get(pair_num)
        if not p_info:
            continue

        c_breaks = COURSE_FIVE_MIN_BREAKS.get(c, COURSE_FIVE_MIN_BREAKS[4])
        break_data = c_breaks.get(pair_num, {"start": "—", "end": "—", "resume": "—", "pair_end": "—", "tip": ""})
        is_lunch = break_data.get("is_lunch", False)

        title = f"🍽 <b>Звонок на обед! · 2-я пара ({c} курс)</b>" if is_lunch else f"🔔 <b>Звонок на пятиминутку! · {pair_num}-я пара</b>"
        label = "Обед:" if is_lunch else "Перерыв:"

        text = (
            f"{title}\n"
            f"──────────────────────\n"
            f"<blockquote>"
            f"⏱ <b>{label}</b> <code>{break_data['start']} — {break_data['end']}</code>\n"
            f"📚 <b>{html.escape(p_info.get('subject', ''))}</b> (каб. <code>{p_info.get('room', '—')}</code>)\n"
            f"🔔 <i>Звонок на 2-ю половину: в {break_data['resume']}</i>"
            f"</blockquote>"
        )
        try:
            await bot.send_message(chat_id=u.user_id, text=text, reply_markup=main_keyboard, link_preview_options=types.LinkPreviewOptions(is_disabled=True))
            await asyncio.sleep(0.05)
        except Exception:
            pass


@dp.message(CommandStart())
async def handle_start(message: types.Message, state: FSMContext):
    user_id = message.from_user.id
    username = message.from_user.username
    full_name = message.from_user.full_name or ""
    
    user, created = await get_or_create_user(user_id, username=username, full_name=full_name)
    
    if message.chat.type == "private" and (created or not user.group_name):
        courses_kb = get_courses_keyboard()
        await message.answer(
            "👋 <b>Добро пожаловать в бот расписания колледжа!</b>\n\n"
            "Для начала работы выберите ваш <b>курс</b>:",
            reply_markup=courses_kb
        )
        return

    grp = user.group_name or "9ПО-43к"
    parity_code, parity_name = get_week_parity(datetime.now(BOT_TZ).date())
    welcome_text = (
        f"👋 <b>Добро пожаловать в бот расписания!</b>\n"
        f"👥 <b>Ваша группа:</b> <code>{grp}</code>\n\n"
        f"🏷 <b>Текущая неделя:</b> {parity_name}\n\n"
        f"⏰ <b>Автоматические рассылки:</b>\n"
        f"▫️ <b>00:00</b> — детальное расписание на наступающий день\n"
        f"▫️ <b>08:00</b> — утреннее напоминание о первой паре (по будням)\n"
        f"▫️ <b>Пятиминутки</b> — уведомления о перерывах внутри пар\n\n"
        f"📁 <b>Меню разбито по удобным папкам:</b>\n"
        f"• <b>Быстрый доступ</b> — пара сейчас, сегодня, завтра\n"
        f"• <b>🗓 Расписание 📂</b> — недели, выбор дня, чётность\n"
        f"• <b>🛠 Полезное 📂</b> — звонки, замены, СДО/макет, напоминания, преподаватели\n\n"
        f"⚙️ <i>Сменить группу можно в любой момент в «⚙️ Настройки»</i>\n\n"
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


# -------------------------------------------------------------
# Раздел: Выбор и смена учебной группы (FSM)
# -------------------------------------------------------------
@dp.message(Command("group"))
@dp.callback_query(F.data == "user_change_group")
async def handle_change_group_prompt(event: types.Message | types.CallbackQuery, state: FSMContext):
    await state.clear()
    kb = get_courses_keyboard()
    text = (
        "🎓 <b>Выбор академической группы</b>\n"
        "──────────────────────\n"
        "Выберите ваш курс или введите название группы вручную:"
    )
    if isinstance(event, types.CallbackQuery):
        try:
            await event.message.edit_text(text, reply_markup=kb)
        except Exception:
            await event.message.answer(text, reply_markup=kb)
        await event.answer()
    else:
        await event.answer(text, reply_markup=kb)


@dp.callback_query(F.data.startswith("sel_course_"))
async def handle_select_course(call: types.CallbackQuery, state: FSMContext):
    parts = call.data.split("_")
    if len(parts) >= 3 and parts[2] == "back":
        kb = get_courses_keyboard()
        await call.message.edit_text(
            "🎓 <b>Выбор курса:</b>\nВыберите ваш курс:",
            reply_markup=kb
        )
        await call.answer()
        return

    course_num = int(parts[2])
    groups = await get_all_groups(course=course_num)
    group_names = [g.name for g in groups]
    kb = get_groups_by_course_keyboard(course_num, group_names)
    await call.message.edit_text(
        f"🎓 <b>{course_num} курс:</b> Выберите вашу учебную группу:\n"
        f"<i>(Если вашей группы нет в списке, вернитесь назад и нажмите «Ввести вручную»)</i>",
        reply_markup=kb
    )
    await call.answer()


@dp.callback_query(F.data.startswith("sel_grp_"))
async def handle_select_group_finish(call: types.CallbackQuery, state: FSMContext):
    chosen_grp = call.data.replace("sel_grp_", "").strip()
    user_id = call.from_user.id
    await update_user_group(user_id, chosen_grp)
    await state.clear()
    await call.answer(f"Группа {chosen_grp} выбрана! ✅")
    await call.message.answer(
        f"✅ <b>Группа успешно сохранена: <code>{chosen_grp}</code>!</b>\n\n"
        f"Теперь расписание (/today, /tomorrow, /week, /now) и персональные напоминания звонков "
        f"настроены именно для группы <b>{chosen_grp}</b>.",
        reply_markup=main_keyboard
    )


@dp.callback_query(F.data == "sel_group_manual")
async def handle_select_group_manual(call: types.CallbackQuery, state: FSMContext):
    await state.set_state(RegistrationState.waiting_manual_group)
    await call.message.answer(
        "✍️ <b>Ручной ввод группы:</b>\n\n"
        "Напишите в ответ точное название вашей учебной группы (например: <code>9ПО-43к</code> или <code>9ВТ-21</code>):"
    )
    await call.answer()


@dp.message(RegistrationState.waiting_manual_group)
async def handle_manual_group_input(message: types.Message, state: FSMContext):
    grp_input = (message.text or "").strip().upper()
    if len(grp_input) < 2 or len(grp_input) > 20:
        await message.answer("❌ Название группы должно быть от 2 до 20 символов. Попробуйте ещё раз:")
        return

    existing = await get_group_by_name(grp_input)
    if not existing:
        await add_group(grp_input, course=4)

    await update_user_group(message.from_user.id, grp_input)
    await state.clear()
    await message.answer(
        f"✅ <b>Группа успешно сохранена: <code>{grp_input}</code>!</b>\n\n"
        f"Все расписания и звонки настроены под вашу группу.",
        reply_markup=main_keyboard
    )


@dp.message(Command("now"))
@dp.message(F.text == "⚡️ Какая пара сейчас?")
async def handle_now(message: types.Message):
    grp = await resolve_target_group(message.chat, message.from_user)
    text = await get_formatted_now_status(group_name=grp)
    refresh_kb = types.InlineKeyboardMarkup(
        inline_keyboard=[
            [types.InlineKeyboardButton(text="🔄 Обновить статус", callback_data="refresh_now")]
        ]
    )
    await message.answer(text, reply_markup=refresh_kb)


@dp.callback_query(F.data == "refresh_now")
async def handle_refresh_now_callback(call: types.CallbackQuery):
    grp = await resolve_target_group(call.message.chat, call.from_user)
    text = await get_formatted_now_status(group_name=grp)
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
    grp = await resolve_target_group(message.chat, message.from_user)
    text = await get_formatted_day_schedule(now.date(), title_prefix="Расписание на сегодня", current_time_str=current_time_str, group_name=grp)
    nav_kb = get_day_nav_keyboard(now.date())
    await message.answer(text, reply_markup=nav_kb)


@dp.message(Command("tomorrow"))
@dp.message(F.text == "🔜 Завтра")
async def handle_tomorrow(message: types.Message):
    tomorrow = datetime.now(BOT_TZ).date() + timedelta(days=1)
    grp = await resolve_target_group(message.chat, message.from_user)
    text = await get_formatted_day_schedule(tomorrow, title_prefix="Расписание на завтра", group_name=grp)
    nav_kb = get_day_nav_keyboard(tomorrow)
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
    grp = await resolve_target_group(message.chat, message.from_user)
    text = await get_formatted_week_schedule(monday, group_name=grp)
    await message.answer(text, reply_markup=schedule_keyboard)


@dp.message(Command("next_week"))
@dp.message(F.text == "⏭ След. неделя")
async def handle_next_week(message: types.Message):
    today = datetime.now(BOT_TZ).date()
    next_monday = today - timedelta(days=today.weekday()) + timedelta(days=7)
    grp = await resolve_target_group(message.chat, message.from_user)
    text = await get_formatted_week_schedule(next_monday, group_name=grp)
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
    
    grp = await resolve_target_group(call.message.chat, call.from_user)
    text = await get_formatted_weekday_by_index(day_idx, parity_code, group_name=grp)
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
    target_group = await resolve_target_group(message.chat, message.from_user)
    course = get_course_from_group_name(target_group)
    text = get_bells_text(course)
    kb = get_bells_course_keyboard(course)

    if os.path.exists(BELLS_IMG):
        try:
            await message.answer_photo(
                photo=types.FSInputFile(BELLS_IMG),
                caption=text,
                reply_markup=kb
            )
            return
        except Exception as e:
            logger.debug(f"Не удалось отправить фото bells: {e}")

    await message.answer(text, reply_markup=kb)


@dp.callback_query(F.data.startswith("bells_course_"))
async def handle_bells_course_callback(call: types.CallbackQuery):
    try:
        selected_course = int(call.data.split("_")[2])
    except (IndexError, ValueError):
        selected_course = 4

    new_text = get_bells_text(selected_course)
    new_kb = get_bells_course_keyboard(selected_course)

    try:
        if call.message.photo:
            await call.message.edit_caption(caption=new_text, reply_markup=new_kb)
        else:
            await call.message.edit_text(text=new_text, reply_markup=new_kb)
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e).lower():
            logger.debug(f"Ошибка обновления звонков при смене курса: {e}")
    except Exception as e:
        logger.debug(f"Ошибка смены курса звонков: {e}")

    await call.answer()


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

    chat = getattr(call.message, "chat", None)
    grp = await resolve_target_group(chat, call.from_user)
    text = await get_formatted_day_schedule(target_date, title_prefix=prefix, current_time_str=current_time_str, group_name=grp)
    nav_kb = get_day_nav_keyboard(target_date)

    is_refresh = (target_date == today and call.data == f"navdate_{today.strftime('%Y-%m-%d')}")

    # Если исходное сообщение было фото (например, старое сообщение)
    if getattr(call.message, "photo", None):
        try:
            await call.message.edit_caption(caption=text[:1024], reply_markup=nav_kb)
            if is_refresh:
                await call.answer("Расписание актуально! 🔄", show_alert=False)
            else:
                await call.answer()
            return
        except TelegramBadRequest as e:
            if "message is not modified" in str(e).lower():
                await call.answer("Расписание актуально! 🔄", show_alert=False)
                return
        except Exception:
            pass
        # Если не удалось отредактировать подпись фото
        try:
            await call.answer()
        except Exception:
            pass
        try:
            await call.message.delete()
        except Exception:
            pass
        await call.message.answer(text, reply_markup=nav_kb)
        return

    # Стандартное поведение: плавное обновление текстового сообщения на месте
    try:
        await call.message.edit_text(text, reply_markup=nav_kb)
        if is_refresh:
            await call.answer("Расписание обновлено! 🔄", show_alert=False)
        else:
            await call.answer()
    except TelegramBadRequest as e:
        if "message is not modified" in str(e).lower():
            await call.answer("Расписание актуально! 🔄", show_alert=False)
        else:
            logger.debug(f"Navdate edit_text bad request: {e}")
            try:
                await call.answer()
            except Exception:
                pass
            await call.message.answer(text, reply_markup=nav_kb)
    except Exception as e:
        logger.debug(f"Navdate error: {e}")
        try:
            await call.answer()
        except Exception:
            pass
        await call.message.answer(text, reply_markup=nav_kb)


@dp.callback_query(F.data == "nav_chooseday")
async def handle_nav_chooseday_callback(call: types.CallbackQuery):
    today = datetime.now(BOT_TZ).date()
    curr_parity, parity_name = get_week_parity(today)
    kb = get_days_inline_keyboard(curr_parity)
    text = (
        f"🗓 <b>Выберите день недели:</b>\n"
        f"Отображаются пары для: <b>{parity_name}</b>"
    )
    if getattr(call.message, "photo", None):
        try:
            await call.answer()
        except Exception:
            pass
        try:
            await call.message.delete()
        except Exception:
            pass
        await call.message.answer(text, reply_markup=kb)
    else:
        try:
            await call.message.edit_text(text, reply_markup=kb)
            await call.answer()
        except TelegramBadRequest as e:
            if "message is not modified" not in str(e).lower():
                await call.message.answer(text, reply_markup=kb)
            await call.answer()
        except Exception:
            await call.message.answer(text, reply_markup=kb)
            try:
                await call.answer()
            except Exception:
                pass

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
    chat = getattr(call.message, "chat", None)
    grp = await resolve_target_group(chat, call.from_user)
    text = await get_formatted_day_schedule(now.date(), title_prefix="Расписание на сегодня", current_time_str=current_time_str, group_name=grp)
    nav_kb = get_day_nav_keyboard(now.date())
    try:
        await call.message.edit_text(text, reply_markup=nav_kb)
        await call.answer("Расписание обновлено! 🔄", show_alert=False)
    except TelegramBadRequest as e:
        if "message is not modified" in str(e).lower():
            await call.answer("Расписание актуально! 🔄", show_alert=False)
        else:
            await call.answer()
    except Exception:
        await call.message.answer(text, reply_markup=nav_kb)
        try:
            await call.answer()
        except Exception:
            pass


async def check_admin_privileges(user_id: int, chat: types.Chat | None = None) -> bool:
    """Проверяет права админа бота или создателя/администратора текущего чата."""
    if await is_admin(user_id):
        return True
    if chat and chat.type in ("group", "supergroup"):
        try:
            member = await chat.get_member(user_id)
            if member.status in ("creator", "administrator"):
                return True
        except Exception:
            pass
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
    user = await get_user(user_id)
    grp = user.group_name if user else "9ПО-43к"
    role_disp, _ = await get_user_role_display(user_id)
    is_adm = await is_admin(user_id)
    is_star = await is_starosta_or_zam(user_id, grp)
    text = format_user_settings_text(user_id, user_name, group_name=grp, role_display=role_disp)
    kb = get_user_settings_keyboard(user_id, is_admin=is_adm, is_starosta=is_star, group_name=grp)
    await message.answer(text, reply_markup=kb)


@dp.callback_query(F.data.startswith("toggle_set_"))
async def handle_toggle_user_setting(call: types.CallbackQuery):
    key = call.data.replace("toggle_set_", "")
    user_id = call.from_user.id
    new_val = toggle_user_setting(user_id, key)
    await update_user_setting(user_id, key, new_val)
    
    titles = {
        "remind_10min": "Колокольчик за 10 мин",
        "morning_alert": "Утренняя сводка (08:00)",
        "five_min_breaks": "Оповещения о пятиминутках"
    }
    title = titles.get(key, key)
    state_str = "включено ✅" if new_val else "отключено ❌"
    await call.answer(f"{title}: {state_str}")

    user_name = call.from_user.first_name or ""
    user = await get_user(user_id)
    grp = user.group_name if user else "9ПО-43к"
    role_disp, _ = await get_user_role_display(user_id)
    is_adm = await is_admin(user_id)
    is_star = await is_starosta_or_zam(user_id, grp)
    text = format_user_settings_text(user_id, user_name, group_name=grp, role_display=role_disp)
    kb = get_user_settings_keyboard(user_id, is_admin=is_adm, is_starosta=is_star, group_name=grp)
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
    
    if not await is_admin(user_id):
        msg = "⛔️ Панель администратора доступна только главным администраторам бота."
        if isinstance(event, types.CallbackQuery):
            await event.answer(msg, show_alert=True)
        else:
            await event.answer(msg)
        return

    all_grps = await get_all_groups()
    users_cnt = await count_all_users()
    text = get_admin_dashboard_text(
        start_time=BOT_START_TIME,
        total_users_db=users_cnt,
        total_groups_db=len(all_grps)
    )
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
    if not await is_admin(message.from_user.id):
        await message.answer("⛔️ Эта команда доступна только администраторам бота.")
        return

    parts = message.text.split(maxsplit=2)
    if len(parts) < 2 or not parts[1].strip():
        await message.answer(
            "ℹ️ <b>Формат рассылки:</b>\n"
            "▫️ Всем: <code>/broadcast &lt;текст сообщения&gt;</code>\n"
            "▫️ Или конкретной группе: <code>/broadcast &lt;группа&gt; &lt;текст сообщения&gt;</code>\n\n"
            "<i>Пример: <code>/broadcast 9ПО-43к Завтра первая пара отменена!</code></i>",
            reply_markup=main_keyboard
        )
        return

    first_arg = parts[1].strip()
    target_group = None
    existing_grp = await get_group_by_name(first_arg)
    if existing_grp and len(parts) >= 3:
        target_group = existing_grp.name
        message_body = parts[2].strip()
    else:
        message_body = message.text.split(maxsplit=1)[1].strip()

    title_grp = f"ДЛЯ ГРУППЫ {target_group}" if target_group else "ДЛЯ ВСЕХ СТУДЕНТОВ"
    broadcast_text = (
        f"📢 <b>ОБЪЯВЛЕНИЕ {title_grp}</b>\n"
        f"──────────────────────\n"
        f"{message_body}\n\n"
        f"👤 <i>От: {html.escape(message.from_user.full_name or 'Администрация')}</i>"
    )

    status_msg = await message.answer(f"⏳ <i>Рассылаю сообщение ({title_grp})...</i>")
    sent_count = 0
    fail_count = 0

    if target_group:
        bound_chats = await get_chats_for_group(target_group)
        for b in bound_chats:
            try:
                await bot.send_message(chat_id=b.chat_id, text=broadcast_text, link_preview_options=types.LinkPreviewOptions(is_disabled=True))
                sent_count += 1
                await asyncio.sleep(0.05)
            except Exception:
                fail_count += 1
    else:
        all_chats = await get_all_chat_bindings()
        for b in all_chats:
            try:
                await bot.send_message(chat_id=b.chat_id, text=broadcast_text, link_preview_options=types.LinkPreviewOptions(is_disabled=True))
                sent_count += 1
                await asyncio.sleep(0.05)
            except Exception:
                fail_count += 1

    if target_group:
        target_users = await get_users_by_group(target_group)
    else:
        all_users_settings = load_all_settings()
        target_users = [types.SimpleNamespace(user_id=int(uid)) for uid in all_users_settings.keys() if uid.isdigit()]

    for u in target_users:
        if u.user_id == message.from_user.id:
            continue
        try:
            await bot.send_message(
                chat_id=u.user_id,
                text=broadcast_text,
                link_preview_options=types.LinkPreviewOptions(is_disabled=True)
            )
            sent_count += 1
            await asyncio.sleep(0.05)
        except Exception:
            fail_count += 1

    await status_msg.edit_text(
        f"✅ <b>Рассылка успешно завершена!</b>\n\n"
        f"▫️ Получатели: <b>{title_grp}</b>\n"
        f"▫️ Доставлено: <b>{sent_count}</b> получателям\n"
        f"▫️ Ошибок: <b>{fail_count}</b>"
    )


# -------------------------------------------------------------
# Раздел: Привязка бесед Telegram к академическим группам
# -------------------------------------------------------------
@dp.message(Command("bind"))
async def handle_bind_command(message: types.Message):
    if message.chat.type not in ("group", "supergroup"):
        await message.answer(
            "ℹ️ Команда <code>/bind</code> используется в групповых чатах (беседах).\n"
            "Добавьте бота в беседу вашей группы и отправьте:\n"
            "<code>/bind &lt;название группы&gt;</code>"
        )
        return

    user_id = message.from_user.id
    is_chat_admin = False
    try:
        member = await message.chat.get_member(user_id)
        if member.status in ("creator", "administrator"):
            is_chat_admin = True
    except Exception:
        pass

    bot_admin = await is_admin(user_id)
    if not (is_chat_admin or bot_admin or await is_starosta_or_zam(user_id)):
        await message.answer("⛔️ Привязывать беседу к группе могут только администраторы чата или старосты групп.")
        return

    parts = message.text.split(maxsplit=1)
    if len(parts) < 2 or not parts[1].strip():
        await message.answer(
            "ℹ️ <b>Укажите название группы для привязки:</b>\n"
            "<code>/bind &lt;название группы&gt;</code>\n"
            "<i>Пример: <code>/bind 9ПО-43к</code></i>"
        )
        return

    target_group = parts[1].strip()
    grp_obj = await get_group_by_name(target_group)
    if not grp_obj:
        await add_group(target_group, course=4)

    await bind_chat_to_group(
        chat_id=message.chat.id,
        chat_title=message.chat.title or "Групповой чат",
        group_name=target_group,
        user_id=user_id
    )

    await message.answer(
        f"✅ <b>Беседа успешно привязана к группе: <code>{target_group}</code>!</b>\n\n"
        f"Теперь команды расписания (/today, /tomorrow, /week, /now) и автоматические рассылки звонков "
        f"работают для группы <b>{target_group}</b>."
    )


@dp.message(Command("unbind"))
async def handle_unbind_command(message: types.Message):
    if message.chat.type not in ("group", "supergroup"):
        await message.answer("ℹ️ Команда <code>/unbind</code> используется в групповых чатах.")
        return

    user_id = message.from_user.id
    bot_admin = await is_admin(user_id)
    is_chat_admin = False
    try:
        member = await message.chat.get_member(user_id)
        if member.status in ("creator", "administrator"):
            is_chat_admin = True
    except Exception:
        pass

    if not (is_chat_admin or bot_admin):
        await message.answer("⛔️ Отвязать беседу могут только администраторы чата.")
        return

    curr_group = await get_chat_group(message.chat.id)
    if not curr_group:
        await message.answer("ℹ️ Эта беседа ещё не была привязана ни к какой группе.")
        return

    from sqlalchemy import delete
    from db.models import ChatBinding
    from db.database import async_session
    async with async_session() as session:
        await session.execute(delete(ChatBinding).where(ChatBinding.chat_id == message.chat.id))
        await session.commit()

    await message.answer(f"✅ Беседа отвязана от группы <b>{curr_group}</b>.")


@dp.message(Command("chat_info"))
async def handle_chat_info_command(message: types.Message):
    if message.chat.type in ("group", "supergroup"):
        grp = await get_chat_group(message.chat.id)
        if grp:
            await message.answer(f"💬 <b>Привязка чата:</b>\nГруппа: <code>{grp}</code>\nID чата: <code>{message.chat.id}</code>")
        else:
            await message.answer(f"💬 Беседа ещё не привязана к группе.\nИспользуйте <code>/bind &lt;группа&gt;</code>.")
    else:
        user = await get_user(message.from_user.id)
        grp = user.group_name if user else "9ПО-43к"
        role_disp, _ = await get_user_role_display(message.from_user.id)
        await message.answer(f"👤 <b>Ваш профиль:</b>\n👥 Группа: <code>{grp}</code>\n🎖 Роль: {role_disp}\nID: <code>{message.from_user.id}</code>")


# -------------------------------------------------------------
# Раздел: Панель старосты и управление расписанием группы
# -------------------------------------------------------------
@dp.message(Command("starosta"))
@dp.callback_query(F.data == "open_starosta_panel")
async def handle_starosta_panel(event: types.Message | types.CallbackQuery):
    user_id = event.from_user.id
    chat = event.message.chat if isinstance(event, types.CallbackQuery) else event.chat
    grp = await resolve_target_group(chat, event.from_user)

    if not (await is_starosta_or_zam(user_id, grp) or await is_admin(user_id)):
        msg = "⛔️ Панель старосты доступна только старостам, их заместителям и администраторам бота."
        if isinstance(event, types.CallbackQuery):
            await event.answer(msg, show_alert=True)
        else:
            await event.answer(msg)
        return

    role_disp, _ = await get_user_role_display(user_id)
    text = get_starosta_dashboard_text(user_id, role_disp, grp)
    kb = get_starosta_panel_keyboard(grp)

    if isinstance(event, types.CallbackQuery):
        try:
            await event.message.edit_text(text, reply_markup=kb)
        except Exception:
            await event.message.answer(text, reply_markup=kb)
        await event.answer()
    else:
        await event.answer(text, reply_markup=kb)


@dp.callback_query(F.data == "starosta_back_to_settings")
async def handle_starosta_back(call: types.CallbackQuery):
    user_id = call.from_user.id
    user = await get_user(user_id)
    grp = user.group_name if user else "9ПО-43к"
    role_disp, _ = await get_user_role_display(user_id)
    is_adm = await is_admin(user_id)
    is_star = await is_starosta_or_zam(user_id, grp)
    text = format_user_settings_text(user_id, call.from_user.first_name or "", group_name=grp, role_display=role_disp)
    kb = get_user_settings_keyboard(user_id, is_admin=is_adm, is_starosta=is_star, group_name=grp)
    try:
        await call.message.edit_text(text, reply_markup=kb)
    except Exception:
        await call.message.answer(text, reply_markup=kb)
    await call.answer()


@dp.callback_query(F.data == "starosta_change_room")
async def handle_starosta_change_room_btn(call: types.CallbackQuery):
    await call.message.answer(
        "🚪 <b>Смена аудитории пары:</b>\n\n"
        "Используйте команду:\n"
        "<code>/edit_room &lt;день 1-6&gt; &lt;пара 1-4&gt; &lt;кабинет&gt;</code>\n\n"
        "<i>Пример: <code>/edit_room 1 2 305</code> (Понедельник, 2 пара, каб. 305)</i>"
    )
    await call.answer()


@dp.callback_query(F.data == "starosta_add_zam")
async def handle_starosta_add_zam_btn(call: types.CallbackQuery):
    await call.message.answer(
        "⚠️ <b>Добавление замены:</b>\n\n"
        "Используйте команду:\n"
        "<code>/add_zam &lt;дата ГГГГ-ММ-ДД&gt; &lt;пара 1-4&gt; &lt;предмет&gt; [кабинет] [преподаватель]</code>\n\n"
        "<i>Пример: <code>/add_zam 2026-10-20 2 Информатика 204 Иванов И.И.</code></i>"
    )
    await call.answer()


@dp.callback_query(F.data == "starosta_cancel_pair")
async def handle_starosta_cancel_pair_btn(call: types.CallbackQuery):
    await call.message.answer(
        "❌ <b>Отмена пары:</b>\n\n"
        "Используйте команду:\n"
        "<code>/cancel_pair &lt;дата ГГГГ-ММ-ДД&gt; &lt;пара 1-4&gt; [причина]</code>\n\n"
        "<i>Пример: <code>/cancel_pair 2026-10-20 3 Болезнь преподавателя</code></i>"
    )
    await call.answer()


@dp.callback_query(F.data == "starosta_del_zam")
async def handle_starosta_del_zam_btn(call: types.CallbackQuery):
    await call.message.answer(
        "🗑 <b>Удаление замены:</b>\n\n"
        "Используйте команду:\n"
        "<code>/del_zam &lt;дата ГГГГ-ММ-ДД&gt; &lt;пара 1-4&gt;</code>\n\n"
        "<i>Пример: <code>/del_zam 2026-10-20 2</code></i>"
    )
    await call.answer()


@dp.callback_query(F.data == "starosta_bind_info")
async def handle_starosta_bind_info_btn(call: types.CallbackQuery):
    grp = await resolve_target_group(call.message.chat, call.from_user)
    await call.message.answer(
        f"💬 <b>Привязка беседы Telegram к группе {grp}:</b>\n\n"
        f"1. Добавьте бота в групповой чат вашей группы.\n"
        f"2. Сделайте бота администратором беседы.\n"
        f"3. Отправьте в беседе команду: <code>/bind {grp}</code>\n\n"
        f"После этого бот начнёт присылать звонки и расписание в вашу беседу!"
    )
    await call.answer()


@dp.message(Command("edit_room"))
async def handle_edit_room_command(message: types.Message):
    user_id = message.from_user.id
    grp = await resolve_target_group(message.chat, message.from_user)

    if not await can_manage_group(user_id, grp):
        await message.answer(f"⛔️ Вы не можете менять расписание группы <b>{grp}</b>.")
        return

    parts = message.text.split(maxsplit=3)
    if len(parts) < 4:
        await message.answer(
            "ℹ️ <b>Формат:</b>\n"
            "<code>/edit_room &lt;день 1-6&gt; &lt;пара 1-4&gt; &lt;кабинет&gt;</code>\n"
            "<i>Пример: <code>/edit_room 1 2 305</code></i>"
        )
        return

    day_idx = parse_weekday_input(parts[1])
    if day_idx is None:
        await message.answer("❌ Неверный день недели. Укажите число 1-6 (1=Пн, 2=Вт, ..., 6=Сб) или название.")
        return

    if not parts[2].isdigit() or not (1 <= int(parts[2]) <= 4):
        await message.answer("❌ Номер пары должен быть от 1 до 4.")
        return
    pair_num = int(parts[2])
    new_room = parts[3].strip()

    updated = await update_lesson_room(grp, day_idx, pair_num, new_room)
    day_name = DAYS_NAMES_RU[day_idx]
    if updated:
        await message.answer(f"✅ Аудитория для <b>{pair_num}-й пары</b> ({day_name}) группы <b>{grp}</b> успешно обновлена на: <code>{new_room}</code>!")
    else:
        await message.answer(f"⚠️ Пары №{pair_num} в день {day_name} для группы {grp} не найдено в базе расписания.")


@dp.message(Command("add_zam"))
async def handle_add_zam_command(message: types.Message):
    user_id = message.from_user.id
    grp = await resolve_target_group(message.chat, message.from_user)

    if not await can_manage_group(user_id, grp):
        await message.answer(f"⛔️ Вы не можете добавлять замены для группы <b>{grp}</b>.")
        return

    parts = message.text.split(maxsplit=4)
    if len(parts) < 4:
        await message.answer(
            "ℹ️ <b>Формат:</b>\n"
            "<code>/add_zam &lt;дата&gt; &lt;пара 1-4&gt; &lt;предмет&gt; [кабинет] [преподаватель]</code>\n"
            "<i>Пример: <code>/add_zam 2026-10-20 2 Информатика 204 Иванов И.И.</code></i>"
        )
        return

    d_obj = parse_date_input(parts[1])
    if not d_obj:
        await message.answer("❌ Неверный формат даты. Используйте ГГГГ-ММ-ДД (или сегодня/завтра).")
        return

    if not parts[2].isdigit() or not (1 <= int(parts[2]) <= 4):
        await message.answer("❌ Номер пары должен быть от 1 до 4.")
        return
    pair_num = int(parts[2])

    rest = parts[3]
    if len(parts) == 5:
        rest = f"{parts[3]} {parts[4]}"
    
    tokens = rest.split()
    room = "—"
    teacher = "—"
    subj = rest
    if len(tokens) >= 3 and tokens[-2].isdigit():
        room = tokens[-2]
        teacher = tokens[-1]
        subj = " ".join(tokens[:-2])
    elif len(tokens) >= 2 and tokens[-1].isdigit():
        room = tokens[-1]
        subj = " ".join(tokens[:-1])

    await add_replacement_record(
        target_date=d_obj,
        pair_num=pair_num,
        action_type="replace",
        subject=subj,
        room=room,
        teacher=teacher,
        raw_text=rest,
        group_name=grp,
        created_by=user_id
    )
    add_replacement(d_obj, pair_num, "replace", raw_text=rest, subject=subj, room=room, teacher=teacher)
    await message.answer(
        f"✅ <b>Замена успешно добавлена!</b>\n\n"
        f"📅 Дата: <b>{d_obj.strftime('%d.%m.%Y')}</b>\n"
        f"🔢 Пара: <b>№{pair_num}</b>\n"
        f"👥 Группа: <b>{grp}</b>\n"
        f"📚 Предмет: <b>{html.escape(subj)}</b>\n"
        f"📍 Кабинет: <code>{room}</code> · 👨‍🏫 <i>{teacher}</i>"
    )


@dp.message(Command("cancel_pair"))
async def handle_cancel_pair_command(message: types.Message):
    user_id = message.from_user.id
    grp = await resolve_target_group(message.chat, message.from_user)

    if not await can_manage_group(user_id, grp):
        await message.answer(f"⛔️ Вы не можете отменять пары для группы <b>{grp}</b>.")
        return

    parts = message.text.split(maxsplit=3)
    if len(parts) < 3:
        await message.answer(
            "ℹ️ <b>Формат:</b>\n"
            "<code>/cancel_pair &lt;дата&gt; &lt;пара 1-4&gt; [причина]</code>\n"
            "<i>Пример: <code>/cancel_pair 2026-10-20 3 Болезнь преподавателя</code></i>"
        )
        return

    d_obj = parse_date_input(parts[1])
    if not d_obj:
        await message.answer("❌ Неверный формат даты.")
        return

    if not parts[2].isdigit() or not (1 <= int(parts[2]) <= 4):
        await message.answer("❌ Номер пары должен быть от 1 до 4.")
        return
    pair_num = int(parts[2])
    reason = parts[3].strip() if len(parts) > 3 else "Отмена пары"

    await add_replacement_record(
        target_date=d_obj,
        pair_num=pair_num,
        action_type="cancel",
        raw_text=reason,
        group_name=grp,
        created_by=user_id
    )
    add_replacement(d_obj, pair_num, "cancel", raw_text=reason)
    await message.answer(
        f"🚫 <b>Пара успешно отменена!</b>\n\n"
        f"📅 Дата: <b>{d_obj.strftime('%d.%m.%Y')}</b>\n"
        f"🔢 Пара: <b>№{pair_num}</b>\n"
        f"👥 Группа: <b>{grp}</b>\n"
        f"ℹ️ Причина: <i>{html.escape(reason)}</i>"
    )


@dp.message(Command("del_zam"))
async def handle_del_zam_command(message: types.Message):
    user_id = message.from_user.id
    grp = await resolve_target_group(message.chat, message.from_user)

    if not await can_manage_group(user_id, grp):
        await message.answer(f"⛔️ Вы не можете удалять замены для группы <b>{grp}</b>.")
        return

    parts = message.text.split(maxsplit=2)
    if len(parts) < 3:
        await message.answer("ℹ️ <b>Формат:</b> <code>/del_zam &lt;дата&gt; &lt;пара 1-4&gt;</code>")
        return

    d_obj = parse_date_input(parts[1])
    if not d_obj:
        await message.answer("❌ Неверный формат даты.")
        return

    if not parts[2].isdigit():
        await message.answer("❌ Номер пары должен быть числом.")
        return
    pair_num = int(parts[2])

    deleted = await delete_replacement_record(d_obj, pair_num, group_name=grp)
    delete_replacement(d_obj, pair_num)
    if deleted:
        await message.answer(f"✅ Замена на <b>{d_obj.strftime('%d.%m.%Y')}</b> (пара №{pair_num}) для группы {grp} удалена.")
    else:
        await message.answer(f"ℹ️ Замена не найдена.")


@dp.message(Command("set_role"))
async def handle_set_role_command(message: types.Message):
    if not await is_admin(message.from_user.id):
        await message.answer("⛔️ Эта команда доступна только администраторам бота.")
        return

    parts = message.text.split()
    if len(parts) < 3:
        await message.answer(
            "ℹ️ <b>Формат назначения роли:</b>\n"
            "<code>/set_role &lt;@username или user_id&gt; &lt;роль&gt; [группа]</code>\n\n"
            "Доступные роли: <code>student</code>, <code>zam_starosty</code>, <code>starosta</code>, <code>admin</code>\n"
            "<i>Пример: <code>/set_role @ivanov starosta 9ПО-43к</code></i>"
        )
        return

    target_user_str = parts[1].strip()
    role_str = parts[2].strip().lower()
    valid_roles = {"student", "zam_starosty", "starosta", "admin"}
    if role_str not in valid_roles:
        await message.answer(f"❌ Неверная роль. Выберите одну из: {', '.join(valid_roles)}")
        return

    group_str = parts[3].strip() if len(parts) > 3 else None

    target_user = None
    if target_user_str.isdigit():
        target_user = await get_user(int(target_user_str))
    else:
        target_user = await get_user_by_username(target_user_str)

    if not target_user:
        await message.answer(f"❌ Пользователь «{html.escape(target_user_str)}» не найден в базе бота. Попросите его сначала написать /start боту.")
        return

    await update_user_role(target_user.user_id, role_str)
    if group_str:
        await update_user_group(target_user.user_id, group_str)

    roles_ru = {
        "student": "Студент",
        "zam_starosty": "Заместитель старосты",
        "starosta": "Староста",
        "admin": "Администратор"
    }
    await message.answer(
        f"✅ <b>Роль успешно обновлена!</b>\n\n"
        f"👤 Пользователь: <b>{target_user.full_name or target_user.username or target_user.user_id}</b>\n"
        f"🎖 Новая роль: <b>{roles_ru.get(role_str, role_str)}</b>\n"
        f"👥 Группа: <b>{group_str or target_user.group_name or '9ПО-43к'}</b>"
    )


@dp.message(Command("id"))
@dp.message(Command("myid"))
@dp.message(Command("whois"))
async def handle_id_command(message: types.Message):
    """Показывает Telegram ID пользователя/чата с возможностью копирования в 1 клик."""
    target_user = message.reply_to_message.from_user if message.reply_to_message else message.from_user
    username_str = f"@{target_user.username}" if target_user.username else "—"
    full_name_str = html.escape(target_user.full_name or "Без имени")
    
    reply_type = " (из пересланного сообщения)" if message.reply_to_message else ""
    role_disp, grp = await get_user_role_display(target_user.id)

    reply_text = (
        f"🆔 <b>Информация о Telegram ID{reply_type}:</b>\n"
        f"──────────────────────\n"
        f"👤 <b>Имя:</b> {full_name_str}\n"
        f"🔗 <b>Юзернейм:</b> {username_str}\n"
        f"🎖 <b>Роль в боте:</b> {role_disp}\n"
        f"👥 <b>Группа:</b> <code>{grp or '—'}</code>\n\n"
        f"🔢 <b>Telegram ID:</b> <code>{target_user.id}</code>\n"
        f"<i>(нажмите на номер ID, чтобы скопировать)</i>\n\n"
        f"💬 <b>ID этого чата:</b> <code>{message.chat.id}</code>"
    )
    await message.answer(reply_text)


@dp.message(Command("my_role"))
async def handle_my_role_command(message: types.Message):
    role_disp, grp = await get_user_role_display(message.from_user.id)
    await message.answer(
        f"👤 <b>Информация о вашем профиле:</b>\n\n"
        f"🎖 <b>Роль:</b> {role_disp}\n"
        f"👥 <b>Группа:</b> <code>{grp or 'Не выбрана'}</code>\n"
        f"🆔 <b>ID:</b> <code>{message.from_user.id}</code>"
    )


@dp.message(Command("roles"))
@dp.message(Command("starostas"))
@dp.callback_query(F.data == "admin_roles_menu")
async def handle_roles_command(event: types.Message | types.CallbackQuery):
    user_id = event.from_user.id
    if not await is_admin(user_id):
        msg = "⛔️ Доступно только администраторам бота."
        if isinstance(event, types.CallbackQuery):
            await event.answer(msg, show_alert=True)
        else:
            await event.answer(msg)
        return

    from sqlalchemy import select
    from db.models import User
    from db.database import async_session

    async with async_session() as session:
        stmt = select(User).where(User.role.in_(["admin", "starosta", "zam_starosty"])).order_by(User.role, User.group_name)
        res = await session.execute(stmt)
        officers = res.scalars().all()

    lines = ["👥 <b>Администраторы и старосты колледжа:</b>\n──────────────────────"]
    if ADMIN_IDS:
        lines.append(f"👑 <b>Superadmins (.env):</b> <code>{', '.join(map(str, sorted(list(ADMIN_IDS))))}</code>\n")

    if not officers:
        lines.append("<i>В базе данных пока нет назначенных старост. Используйте /set_role</i>")
    else:
        for u in officers:
            u_name = f"@{u.username}" if u.username else (u.full_name or str(u.user_id))
            lines.append(f"• <b>{u.role.upper()}</b> | {u_name} | Группа: <code>{u.group_name or '—'}</code> (ID: <code>{u.user_id}</code>)")

    lines.append("\n💡 <i>Назначить старосту: <code>/set_role &lt;@username&gt; starosta &lt;группа&gt;</code></i>")
    text = "\n".join(lines)
    back_kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="◀️ Назад в админку", callback_data="admin_back_to_main")]])

    if isinstance(event, types.CallbackQuery):
        try:
            await event.message.edit_text(text, reply_markup=back_kb)
        except Exception:
            await event.message.answer(text, reply_markup=back_kb)
        await event.answer()
    else:
        await event.answer(text, reply_markup=back_kb)


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
# Раздел: База конспектов лекций (4 курс 1 семестр)
# -------------------------------------------------------------

LECTURES_INTRO_TEXT = (
    "📚 <b>База конспектов лекций (4 курс 1 семестр)</b>\n"
    "──────────────────────\n"
    "Здесь собраны подробные конспекты всех лекций с датами занятий, "
    "краткими выжимками (TL;DR), ключевыми вопросами и полными текстами.\n\n"
    "📖 Можно читать прямо в Telegram по страницам или скачать <code>.md</code> файл для Obsidian и заметок.\n\n"
    "👇 <b>Выберите предмет для просмотра:</b>"
)


@dp.message(Command("lectures"))
@dp.message(Command("lecture"))
@dp.message(Command("konspect"))
@dp.message(Command("konspekty"))
@dp.message(F.text == "📚 Конспекты лекций")
async def handle_lectures_entry(message: types.Message):
    # Проверяем, передан ли аргумент для быстрого поиска: например "/lecture rest" или "/lecture 15.10"
    text = (message.text or "").strip()
    parts = text.split(maxsplit=1)
    if len(parts) > 1 and parts[0].startswith("/"):
        query = parts[1].strip()
        matched = search_lectures(query)
        if len(matched) == 1:
            lec = matched[0]
            card_text = format_lecture_card(lec)
            kb = get_lecture_card_keyboard(lec["id"], lec["subject_code"])
            await message.answer(card_text, reply_markup=kb)
            return
        elif len(matched) > 1:
            buttons = []
            for l in matched:
                date_short = l["date"].split(".2026")[0] if ".2026" in l["date"] else l["date"]
                title_btn = l["title"][:26] + "..." if len(l["title"]) > 26 else l["title"]
                buttons.append([types.InlineKeyboardButton(text=f"📖 {l['subject']}: {title_btn}", callback_data=f"lec_view_{l['id']}")])
            buttons.append([types.InlineKeyboardButton(text="📚 Все предметы", callback_data="lec_menu")])
            await message.answer(
                f"🔍 <b>Найдено лекций: {len(matched)}</b> по запросу «{html.escape(query)}»:\nВыберите нужную:",
                reply_markup=types.InlineKeyboardMarkup(inline_keyboard=buttons)
            )
            return
        else:
            await message.answer(
                f"🔍 По запросу «<b>{html.escape(query)}</b>» лекций не найдено.\n\n"
                f"💡 <i>Попробуйте ввести номер темы, дату (например 15.10) или предмет (МДК 07.02, Менеджмент, REST, ФСТЭК).</i>",
                reply_markup=get_lectures_menu_keyboard()
            )
            return

    await message.answer(LECTURES_INTRO_TEXT, reply_markup=get_lectures_menu_keyboard())


@dp.callback_query(F.data == "lec_menu")
async def handle_lec_menu(call: types.CallbackQuery):
    try:
        await call.message.edit_text(LECTURES_INTRO_TEXT, reply_markup=get_lectures_menu_keyboard())
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e).lower():
            logger.debug(f"lec_menu edit error: {e}")
    except Exception:
        pass
    await call.answer()


@dp.callback_query(F.data.startswith("lec_sub_"))
async def handle_lec_subject(call: types.CallbackQuery):
    subject_code = call.data[8:]
    info = get_subject_info(subject_code)
    if not info:
        await call.answer("Предмет не найден.", show_alert=True)
        return

    lectures = get_lectures_by_subject_code(subject_code)
    kb = get_subject_lectures_keyboard(subject_code)
    text = (
        f"{info['icon']} <b>{html.escape(info['full'])}</b>\n"
        f"──────────────────────\n"
        f"Всего доступно лекций: <b>{len(lectures)}</b>\n\n"
        f"👇 <i>Выберите лекцию из списка ниже, чтобы открыть карточку темы:</i>"
    )
    try:
        await call.message.edit_text(text, reply_markup=kb)
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e).lower():
            logger.debug(f"lec_sub edit error: {e}")
    except Exception:
        pass
    await call.answer()


@dp.callback_query(F.data == "lec_dates")
async def handle_lec_dates(call: types.CallbackQuery):
    text = (
        f"📅 <b>Лекции по датам проведения занятий</b>\n"
        f"──────────────────────\n"
        f"В базе собраны лекции с датами осеннего семестра 2026 года.\n\n"
        f"👇 <i>Выберите дату занятия:</i>"
    )
    kb = get_dates_lectures_keyboard()
    try:
        await call.message.edit_text(text, reply_markup=kb)
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e).lower():
            logger.debug(f"lec_dates edit error: {e}")
    except Exception:
        pass
    await call.answer()


@dp.callback_query(F.data.startswith("lec_date_"))
async def handle_lec_date_specific(call: types.CallbackQuery):
    date_iso = call.data[9:]
    lectures = get_lectures_by_date_iso(date_iso)
    if not lectures:
        await call.answer("Лекции за эту дату не найдены.", show_alert=True)
        return

    date_display = lectures[0]["date"]
    text = (
        f"📅 <b>Лекции за {date_display}</b>\n"
        f"──────────────────────\n"
        f"Занятий в этот день: <b>{len(lectures)}</b>\n\n"
        f"👇 <i>Выберите лекцию для открытия карточки:</i>"
    )
    kb = get_date_lectures_keyboard(date_iso)
    try:
        await call.message.edit_text(text, reply_markup=kb)
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e).lower():
            logger.debug(f"lec_date edit error: {e}")
    except Exception:
        pass
    await call.answer()


@dp.callback_query(F.data.startswith("lec_view_"))
async def handle_lec_view(call: types.CallbackQuery):
    lecture_id = call.data[9:]
    lec = get_lecture_by_id(lecture_id)
    if not lec:
        await call.answer("Лекция не найдена.", show_alert=True)
        return

    card_text = format_lecture_card(lec)
    kb = get_lecture_card_keyboard(lecture_id, lec["subject_code"])
    try:
        await call.message.edit_text(card_text, reply_markup=kb)
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e).lower():
            logger.debug(f"lec_view edit error: {e}")
    except Exception:
        pass
    await call.answer()


@dp.callback_query(F.data.startswith("lec_p_"))
async def handle_lec_page(call: types.CallbackQuery):
    parts = call.data.split("_")
    # Формат: lec_p_{lecture_id}_{page_idx}
    if len(parts) < 4:
        await call.answer()
        return

    lecture_id = "_".join(parts[2:-1])
    try:
        page_idx = int(parts[-1])
    except ValueError:
        page_idx = 0

    lec = get_lecture_by_id(lecture_id)
    if not lec:
        await call.answer("Лекция не найдена.", show_alert=True)
        return

    pages = get_lecture_pages(lecture_id)
    total_pages = len(pages)
    if page_idx < 0:
        page_idx = 0
    if page_idx >= total_pages:
        page_idx = total_pages - 1

    page_content = pages[page_idx]
    page_text = format_lecture_page(lec, page_idx, total_pages, page_content)
    kb = get_lecture_reader_keyboard(lecture_id, page_idx, total_pages, lec["subject_code"])

    try:
        await call.message.edit_text(page_text, parse_mode=ParseMode.HTML, reply_markup=kb)
    except TelegramBadRequest as e:
        if "message is not modified" in str(e).lower():
            pass
        else:
            fallback_text = (
                f"📖 {lec['title']} (Стр. {page_idx + 1} из {total_pages})\n"
                f"──────────────────────\n\n"
                f"{page_content}\n\n"
                f"──────────────────────\n"
                f"💡 Листайте страницы кнопками ниже:"
            )
            await call.message.edit_text(fallback_text, parse_mode=None, reply_markup=kb)
    except Exception as e:
        logger.error(f"Ошибка при отображении страницы лекции {lecture_id}: {e}")

    await call.answer()


@dp.callback_query(F.data.startswith("lec_doc_"))
async def handle_lec_download(call: types.CallbackQuery):
    lecture_id = call.data[8:]
    lec = get_lecture_by_id(lecture_id)
    if not lec:
        await call.answer("Лекция не найдена.", show_alert=True)
        return

    file_path = get_lecture_file_path(lecture_id)
    if not file_path or not os.path.exists(file_path):
        await call.answer("❌ Файл конспекта не найден на сервере.", show_alert=True)
        return

    await call.answer("📄 Отправляю файл конспекта...")
    doc = types.FSInputFile(file_path, filename=lec["file"])
    caption = (
        f"📄 <b>{html.escape(lec['title'])}</b>\n"
        f"📚 <code>{html.escape(lec['subject_full'])}</code> · 📅 {lec['date']} · {html.escape(lec.get('pair', ''))}\n\n"
        f"💡 <i>Файл в формате Markdown (.md). Открывается в Obsidian, Notion, VS Code или любом блокноте.</i>"
    )
    await call.message.answer_document(doc, caption=caption, parse_mode=ParseMode.HTML)


@dp.callback_query(F.data == "lec_search_hint")
async def handle_lec_search_hint(call: types.CallbackQuery):
    await call.answer(
        "🔍 Чтобы найти лекцию, напишите команду:\n"
        "/lecture <название или тема>\n\n"
        "Примеры:\n"
        "• /lecture rest\n"
        "• /lecture 15.10\n"
        "• /lecture фстэк\n"
        "• /lecture менеджмент",
        show_alert=True
    )


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

    # 8. Конспекты лекций
    results.append(
        types.InlineQueryResultArticle(
            id="inline_lectures",
            title="📚 Конспекты лекций (4 курс 1 семестр)",
            description="МДК 07.02, Менеджмент, МДК 04.01, Экономика, БЖД (с датами и TL;DR)",
            input_message_content=types.InputTextMessageContent(
                message_text=LECTURES_INTRO_TEXT,
                parse_mode=ParseMode.HTML
            ),
            reply_markup=get_lectures_menu_keyboard()
        )
    )

    if query:
        search_results: list[types.InlineQueryResultArticle] = []
        
        # 1. Поиск по базе конспектов лекций
        lec_matches = search_lectures(query)
        if query in ("лекции", "лекция", "конспект", "конспекты", "тема", "темы", "учеба", "учёба"):
            lec_matches = get_all_lectures()
            
        for lec in lec_matches[:6]:
            card_text = format_lecture_card(lec)
            search_results.append(
                types.InlineQueryResultArticle(
                    id=f"inline_lec_{lec['id']}",
                    title=f"📖 {lec['subject']}: {lec['title'][:40]}",
                    description=f"{lec['date']} · {lec['teacher']} · {lec['pair']}",
                    input_message_content=types.InputTextMessageContent(
                        message_text=card_text,
                        parse_mode=ParseMode.HTML
                    ),
                    reply_markup=get_lecture_card_keyboard(lec["id"], lec["subject_code"])
                )
            )

        # 2. Если ввод похож на номер кабинета (например "304", "515", "с/з")
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

        # 3. Если совпадение с днем недели
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
        "📚 /lectures — База конспектов лекций с датами (МДК, Менеджмент, Экономика, БЖД)\n"
        "🔍 /lecture <code>&lt;тема&gt;</code> — Поиск лекции по ключевому слову (например <code>/lecture rest</code>)\n"
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
        
        # Инициализация базы данных и авто-миграция
        from db.database import init_db
        from db.migration import run_migration
        await init_db()
        await run_migration()
        
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

        # Расписание 3: Уведомления о пятиминутках и обедах внутри каждой пары по будням
        # 1-я пара: 09:45 (все курсы)
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
        # 2-я пара: 11:30 (2 курс - обед 30 мин; 3 и 4 курс - пятиминутка 5 мин)
        scheduler.add_job(
            send_five_minute_break,
            trigger="cron",
            day_of_week="mon-fri",
            hour=11,
            minute=30,
            second=0,
            args=[2, [2, 3, 4]],
            id="break_pair_2_courses_234",
            replace_existing=True
        )
        # 2-я пара: 11:55 (1 курс - пятиминутка 5 мин, т.к. пара с 11:10)
        scheduler.add_job(
            send_five_minute_break,
            trigger="cron",
            day_of_week="mon-fri",
            hour=11,
            minute=55,
            second=0,
            args=[2, [1]],
            id="break_pair_2_course_1",
            replace_existing=True
        )
        # 3-я пара: 13:40 (все курсы)
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
        # 4-я пара: 15:25 (все курсы)
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
        # 1-я пара: 08:50 (начало в 09:00 для всех курсов)
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
        # 2-я пара для 2, 3, 4 курсов: 10:35 (начало в 10:45)
        scheduler.add_job(
            send_pair_reminder,
            trigger="cron",
            day_of_week="mon-fri",
            hour=10,
            minute=35,
            second=0,
            args=[bot, 2, [2, 3, 4]],
            id="remind_pair_2_courses_234",
            replace_existing=True
        )
        # 2-я пара для 1 курса: 11:00 (начало в 11:10 из-за раннего обеда)
        scheduler.add_job(
            send_pair_reminder,
            trigger="cron",
            day_of_week="mon-fri",
            hour=11,
            minute=0,
            second=0,
            args=[bot, 2, [1]],
            id="remind_pair_2_course_1",
            replace_existing=True
        )
        # 3-я пара: 12:45 (начало в 12:55 для всех курсов)
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
        # 4-я пара: 14:30 (начало в 14:40 для всех курсов)
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
