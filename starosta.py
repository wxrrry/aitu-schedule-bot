import html
from datetime import date, timedelta
from zoneinfo import ZoneInfo
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder

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
    get_group_by_name,
    get_group_officers,
    assign_group_officer,
    demote_group_officer,
    get_group_replacements,
    delete_replacement_by_id
)
from db.models import UserRole, Replacement
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


# =============================================================
# ТЕКСТ И КЛАВИАТУРЫ ДЛЯ СТАРОСТАТА (В НАСТРОЙКАХ)
# =============================================================
def format_starostat_menu_text(group_name: str, starosta_user, zam_user) -> str:
    """Форматирует карточку старостата группы для меню настроек."""
    def _user_repr(u):
        if not u:
            return "<i>❌ Не назначен</i>"
        name = html.escape(u.full_name or "Без имени")
        username_str = f" (@{u.username})" if u.username else ""
        return f"<b>{name}</b>{username_str} [<code>{u.user_id}</code>]"

    return (
        f"👥 <b>Старостат группы {group_name}</b>\n"
        f"──────────────────────\n"
        f"👑 <b>Староста группы:</b> {_user_repr(starosta_user)}\n"
        f"🎖 <b>Заместитель старосты:</b> {_user_repr(zam_user)}\n\n"
        f"📌 <b>Возможности старосты и заместителя:</b>\n"
        f"• Интерактивное изменение кабинетов пар\n"
        f"• Добавление замен и отмен занятий своей группы\n"
        f"• Привязка Telegram-беседы группы\n\n"
        f"ℹ️ <i>Для каждой группы может быть назначен 1 староста и 1 заместитель. "
        f"Вы можете выбрать кандидатуру ниже или назначить себя.</i>"
    )


def get_starostat_menu_keyboard(group_name: str, starosta_user, zam_user) -> InlineKeyboardMarkup:
    """Клавиатура управления старостатом группы."""
    builder = InlineKeyboardBuilder()

    # Кнопка для старосты
    if starosta_user:
        builder.row(
            InlineKeyboardButton(text="👑 Переизбрать старосту", callback_data="starostat_pick_starosta"),
            InlineKeyboardButton(text="❌ Снять", callback_data="starostat_demote_starosta")
        )
    else:
        builder.row(
            InlineKeyboardButton(text="👑 Выбрать старосту", callback_data="starostat_pick_starosta")
        )

    # Кнопка для зама
    if zam_user:
        builder.row(
            InlineKeyboardButton(text="🎖 Переизбрать заместителя", callback_data="starostat_pick_zam"),
            InlineKeyboardButton(text="❌ Снять", callback_data="starostat_demote_zam")
        )
    else:
        builder.row(
            InlineKeyboardButton(text="🎖 Выбрать заместителя", callback_data="starostat_pick_zam")
        )

    builder.row(
        InlineKeyboardButton(text="◀️ Назад в настройки", callback_data="settings_back_to_menu")
    )
    return builder.as_markup()


def get_officer_election_keyboard(role: str) -> InlineKeyboardMarkup:
    """Клавиатура выбора: назначить себя или указать юзернейм."""
    builder = InlineKeyboardBuilder()
    role_label = "старостой" if role == "starosta" else "заместителем"
    builder.row(
        InlineKeyboardButton(text=f"🙋‍♂️ Стать {role_label} самому", callback_data=f"starostat_self_{role}")
    )
    builder.row(
        InlineKeyboardButton(text="✍️ Указать другого студента (@username / ID)", callback_data=f"starostat_manual_{role}")
    )
    builder.row(
        InlineKeyboardButton(text="◀️ Отмена", callback_data="starostat_menu")
    )
    return builder.as_markup()


# =============================================================
# ТЕКСТ И КЛАВИАТУРЫ ДЛЯ КАБИНЕТА СТАРОСТЫ
# =============================================================
def get_starosta_dashboard_text(user_id: int, role_display: str, group_name: str) -> str:
    """Генерирует текст главного меню кабинета старосты."""
    return (
        f"⭐️ <b>Кабинет старосты · {group_name}</b>\n"
        f"──────────────────────\n"
        f"🎖 <b>Ваш статус:</b> {role_display}\n\n"
        f"Здесь вы можете управлять расписанием своей группы с помощью кнопок:\n\n"
        f"🚪 <b>Кабинеты</b> — перенос пары в другой кабинет на постоянной основе\n"
        f"🔄 <b>Замена пары</b> — назначение замещающего предмета/кабинета\n"
        f"❌ <b>Отмена пары</b> — быстрая отмена занятия на дату с указанием причины\n"
        f"📋 <b>Список замен</b> — просмотр и удаление активных замен в 1 клик\n"
        f"💬 <b>Привязка беседы</b> — подключение бота к групповому чату группы"
    )


def get_starosta_dashboard_keyboard(group_name: str) -> InlineKeyboardMarkup:
    """Главная клавиатура кабинета старосты."""
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="🚪 Изменить кабинет", callback_data="st_ui_room_start"),
        InlineKeyboardButton(text="🔄 Добавить замену", callback_data="st_ui_zam_start")
    )
    builder.row(
        InlineKeyboardButton(text="❌ Отменить пару", callback_data="st_ui_cancel_start"),
        InlineKeyboardButton(text="📋 Активные замены", callback_data="st_ui_list_zam")
    )
    builder.row(
        InlineKeyboardButton(text="💬 Привязать беседу группы", callback_data="starosta_bind_info")
    )
    builder.row(
        InlineKeyboardButton(text="◀️ В настройки", callback_data="starosta_back_to_settings")
    )
    return builder.as_markup()


def get_starosta_days_keyboard(prefix: str = "st_day_") -> InlineKeyboardMarkup:
    """Клавиатура выбора дня недели (Пн-Сб)."""
    builder = InlineKeyboardBuilder()
    days = [("Пн", 0), ("Вт", 1), ("Ср", 2), ("Чт", 3), ("Пт", 4), ("Сб", 5)]
    row1 = [InlineKeyboardButton(text=d[0], callback_data=f"{prefix}{d[1]}") for d in days[:3]]
    row2 = [InlineKeyboardButton(text=d[0], callback_data=f"{prefix}{d[1]}") for d in days[3:]]
    builder.row(*row1)
    builder.row(*row2)
    builder.row(InlineKeyboardButton(text="◀️ Назад в кабинет старосты", callback_data="open_starosta_panel"))
    return builder.as_markup()


def get_starosta_pairs_keyboard(prefix: str = "st_pair_") -> InlineKeyboardMarkup:
    """Клавиатура выбора номера пары (1-4)."""
    builder = InlineKeyboardBuilder()
    row = [InlineKeyboardButton(text=f"{i} пара", callback_data=f"{prefix}{i}") for i in range(1, 5)]
    builder.row(*row)
    builder.row(InlineKeyboardButton(text="◀️ Назад в кабинет старосты", callback_data="open_starosta_panel"))
    return builder.as_markup()


def get_starosta_date_picker_keyboard(prefix: str = "st_date_") -> InlineKeyboardMarkup:
    """Клавиатура быстрого выбора даты: Сегодня, Завтра или произвольная дата."""
    today = date.today()
    tomorrow = today + timedelta(days=1)
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text=f"📅 Сегодня ({today.strftime('%d.%m')})", callback_data=f"{prefix}{today.isoformat()}"),
        InlineKeyboardButton(text=f"🔜 Завтра ({tomorrow.strftime('%d.%m')})", callback_data=f"{prefix}{tomorrow.isoformat()}")
    )
    builder.row(
        InlineKeyboardButton(text="📆 Ввести другую дату вручную", callback_data=f"{prefix}custom")
    )
    builder.row(
        InlineKeyboardButton(text="◀️ Назад в кабинет старосты", callback_data="open_starosta_panel")
    )
    return builder.as_markup()


def get_starosta_cancel_reasons_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура типовых причин отмены пары."""
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text="🤒 Болезнь преподавателя", callback_data="st_c_reason_sick"))
    builder.row(InlineKeyboardButton(text="🚫 Занятия отменены", callback_data="st_c_reason_cancelled"))
    builder.row(InlineKeyboardButton(text="✍️ Ввести свою причину текстом", callback_data="st_c_reason_custom"))
    builder.row(InlineKeyboardButton(text="◀️ Назад в кабинет старосты", callback_data="open_starosta_panel"))
    return builder.as_markup()


def get_group_replacements_keyboard(replacements: list[Replacement]) -> InlineKeyboardMarkup:
    """Список замен группы с кнопками удаления в 1 клик."""
    builder = InlineKeyboardBuilder()
    if not replacements:
        builder.row(InlineKeyboardButton(text="◀️ Назад в кабинет старосты", callback_data="open_starosta_panel"))
        return builder.as_markup()

    for r in replacements:
        d_str = r.date.strftime("%d.%m")
        action_icon = "❌ Отмена" if r.action_type == "cancel" else "🔄 Замена"
        btn_text = f"🗑 Удалить: {d_str} #{r.pair_num} ({action_icon})"
        builder.row(InlineKeyboardButton(text=btn_text, callback_data=f"st_del_rep_{r.id}"))

    builder.row(InlineKeyboardButton(text="◀️ Назад в кабинет старосты", callback_data="open_starosta_panel"))
    return builder.as_markup()
