import os
import sys
import subprocess
import logging
from datetime import datetime
from zoneinfo import ZoneInfo
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from config import BOT_TZ, CHAT_ID, ADMIN_ID
from replacements import load_replacements
from user_settings import load_all_settings, get_users_with_setting

logger = logging.getLogger(__name__)


def get_git_info() -> dict:
    """Получает информацию о последнем Git-коммите."""
    info = {
        "commit": "неизвестно",
        "author": "неизвестно",
        "date": "неизвестно",
        "message": "неизвестно"
    }
    try:
        commit_hash = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL,
            text=True
        ).strip()
        msg = subprocess.check_output(
            ["git", "log", "-1", "--pretty=%s"],
            stderr=subprocess.DEVNULL,
            text=True
        ).strip()
        date_str = subprocess.check_output(
            ["git", "log", "-1", "--pretty=%cd", "--date=format:%d.%m %H:%M"],
            stderr=subprocess.DEVNULL,
            text=True
        ).strip()
        info = {
            "commit": commit_hash,
            "message": msg,
            "date": date_str
        }
    except Exception as e:
        logger.debug(f"Не удалось получить git info: {e}")
    return info


def run_git_pull() -> tuple[bool, str]:
    """Выполняет git pull origin main."""
    try:
        res = subprocess.run(
            ["git", "pull", "origin", "main"],
            capture_output=True,
            text=True,
            timeout=30
        )
        output = (res.stdout + "\n" + res.stderr).strip()
        success = res.returncode == 0
        return success, output
    except Exception as e:
        logger.error(f"Ошибка при git pull: {e}")
        return False, str(e)


def get_admin_dashboard_text(start_time: datetime | None = None) -> str:
    """Генерирует сводку панели администратора."""
    now = datetime.now(BOT_TZ)
    
    # Расчёт Uptime
    uptime_str = "неизвестно"
    if start_time:
        delta = now - start_time
        total_seconds = int(delta.total_seconds())
        days, rem = divmod(total_seconds, 86400)
        hours, rem = divmod(rem, 3600)
        minutes, _ = divmod(rem, 60)
        parts = []
        if days > 0:
            parts.append(f"{days} д")
        if hours > 0 or days > 0:
            parts.append(f"{hours} ч")
        parts.append(f"{minutes} мин")
        uptime_str = " ".join(parts)

    git_info = get_git_info()
    all_users = load_all_settings()
    sub_10min = len(get_users_with_setting("remind_10min"))
    sub_morning = len(get_users_with_setting("morning_alert"))
    sub_breaks = len(get_users_with_setting("five_min_breaks"))
    
    reps = load_replacements()
    total_reps = sum(len(pairs) for pairs in reps.values())

    return (
        f"👑 <b>Панель управления администратора</b>\n"
        f"──────────────────────\n"
        f"🟢 <b>Статус бота:</b> В сети · Онлайн\n"
        f"⏱ <b>Время непрерывной работы (Uptime):</b> <code>{uptime_str}</code>\n"
        f"🕒 <b>Серверное время:</b> {now.strftime('%d.%m.%Y %H:%M:%S')}\n\n"
        f"📦 <b>Версия и Git:</b>\n"
        f"▫️ Коммит: <code>{git_info['commit']}</code> ({git_info.get('date', '')})\n"
        f"▫️ Сообщение: <i>{git_info['message']}</i>\n\n"
        f"👥 <b>Пользователи и подписки:</b>\n"
        f"▫️ Всего пользователей в базе: <b>{len(all_users)}</b>\n"
        f"▫️ Напоминания за 10 мин: <b>{sub_10min}</b> чел.\n"
        f"▫️ Утренние сводки (08:00): <b>{sub_morning}</b> чел.\n"
        f"▫️ Пятиминутки в ЛС: <b>{sub_breaks}</b> чел.\n\n"
        f"⚠️ <b>Замены в расписании:</b> <b>{total_reps}</b> активных\n"
        f"💬 <b>Привязанный чат группы:</b> <code>{CHAT_ID or 'Не задан'}</code>\n"
        f"🆔 <b>ID администратора:</b> <code>{ADMIN_ID or 'Все пользователи'}</code>\n"
    )


def get_admin_main_keyboard() -> InlineKeyboardMarkup:
    """Главная клавиатура админ-панели."""
    buttons = [
        [
            InlineKeyboardButton(text="🔄 Git Pull (Обновить код)", callback_data="admin_git_pull"),
            InlineKeyboardButton(text="⚡️ Рестарт бота", callback_data="admin_restart")
        ],
        [
            InlineKeyboardButton(text="⚠️ Управление заменами", callback_data="admin_manage_zameny"),
            InlineKeyboardButton(text="📢 Рассылка сообщения", callback_data="admin_broadcast_menu")
        ],
        [
            InlineKeyboardButton(text="🧪 Тестирование рассылок", callback_data="admin_tests_menu"),
            InlineKeyboardButton(text="📲 Обновить меню всем", callback_data="admin_refresh_all_commands")
        ],
        [
            InlineKeyboardButton(text="◀️ Закрыть панель", callback_data="admin_close")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_admin_replacements_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура управления заменами с кнопками быстрого удаления."""
    reps = load_replacements()
    buttons = []
    
    # Кнопки для удаления каждой существующей замены
    for date_str, pairs in sorted(reps.items()):
        for p_num, p_data in sorted(pairs.items()):
            label = "❌ Отмена" if p_data.get("type") == "cancel" else "🔄 Замена"
            subj = p_data.get("subject", p_data.get("text", ""))[:15]
            btn_text = f"🗑 Удалить: {date_str} п.{p_num} ({label})"
            cb_data = f"adm_del_zam_{date_str}_{p_num}"
            buttons.append([InlineKeyboardButton(text=btn_text, callback_data=cb_data)])

    buttons.append([
        InlineKeyboardButton(text="◀️ Назад в админку", callback_data="admin_back_to_main")
    ])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_admin_tests_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура тестирования рассылок."""
    buttons = [
        [
            InlineKeyboardButton(text="🌙 Тест: 00:00 (Полночь)", callback_data="test_send_midnight"),
            InlineKeyboardButton(text="🌅 Тест: 08:00 (Утро)", callback_data="test_send_morning")
        ],
        [
            InlineKeyboardButton(text="☕️ Тест: Пятиминутка", callback_data="test_send_five_min"),
            InlineKeyboardButton(text="🔔 Тест: 10-мин колокольчик", callback_data="test_send_ten_min")
        ],
        [
            InlineKeyboardButton(text="◀️ Назад в админку", callback_data="admin_back_to_main")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)
