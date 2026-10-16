import html
from datetime import date
from zoneinfo import ZoneInfo
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from config import BOT_TZ
from db.crud import (
    get_user,
    get_user_by_username,
    update_user_role,
    update_user_group,
    update_lesson_room,
    add_replacement_record,
    delete_replacement_record,
    get_chat_group,
    bind_chat_to_group,
    get_all_groups,
    get_group_by_name
)
from db.models import UserRole
from permissions import is_admin, is_starosta_or_zam, can_manage_group, get_user_role_display

DAYS_MAP = {
    "1": 0, "пн": 0, "понедельник": 0, "mon": 0,
    "2": 1, "вт": 1, "вторник": 1, "tue": 1,
    "3": 2, "ср": 2, "среда": 2, "wed": 2,
    "4": 3, "чт": 3, "четверг": 3, "thu": 3,
    "5": 4, "пт": 4, "пятница": 4, "fri": 4,
    "6": 5, "сб": 5, "суббота": 5, "sat": 5
}

DAYS_NAMES_RU = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]


def parse_weekday_input(day_str: str) -> int | None:
    """Парсит день недели из числа (1..6) или названия."""
    clean = day_str.strip().lower()
    return DAYS_MAP.get(clean)


def get_starosta_dashboard_text(user_id: int, role_display: str, group_name: str) -> str:
    """Генерирует текст панели старосты."""
    return (
        f"⭐️ <b>Панель управления старосты группы</b>\n"
        f"──────────────────────\n"
        f"👥 <b>Ваша группа:</b> <code>{group_name}</code>\n"
        f"🎖 <b>Ваш статус:</b> {role_display}\n\n"
        f"📌 <b>Быстрые команды для управления:</b>\n\n"
        f"🚪 <b>Сменить кабинет пары:</b>\n"
        f"<code>/edit_room &lt;день 1-6&gt; &lt;пара 1-4&gt; &lt;кабинет&gt;</code>\n"
        f"<i>Пример: <code>/edit_room 1 2 305</code> (Пн, 2 пара, каб. 305)</i>\n\n"
        f"🔄 <b>Добавить замену пары:</b>\n"
        f"<code>/add_zam &lt;дата&gt; &lt;пара 1-4&gt; &lt;предмет&gt; [кабинет] [преподаватель]</code>\n"
        f"<i>Пример: <code>/add_zam 2026-10-20 2 Информатика 204 Иванов И.И.</code></i>\n\n"
        f"❌ <b>Отменить пару:</b>\n"
        f"<code>/cancel_pair &lt;дата&gt; &lt;пара 1-4&gt; [причина]</code>\n"
        f"<i>Пример: <code>/cancel_pair 2026-10-20 3 Болезнь преподавателя</code></i>\n\n"
        f"🗑 <b>Удалить замену:</b>\n"
        f"<code>/del_zam &lt;дата&gt; &lt;пара 1-4&gt;</code>\n\n"
        f"💬 <b>Привязать беседу группы:</b>\n"
        f"В беседе вашей группы в Telegram отправьте:\n"
        f"<code>/bind {group_name}</code>"
    )
