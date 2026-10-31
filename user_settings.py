import os
import json
import logging
import sqlite3
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

logger = logging.getLogger(__name__)

# Настройки по умолчанию для каждого пользователя
DEFAULT_SETTINGS = {
    "remind_10min": True,      # Напоминание за 10 минут до начала пары
    "morning_alert": False,    # Утренняя рассылка в 08:00 в личные сообщения
    "five_min_breaks": False,  # Оповещения о пятиминутках внутри пары в ЛС
}

def _get_db_path() -> str:
    from db.database import DB_PATH
    return DB_PATH

def get_user_settings(user_id: int, user_obj=None) -> dict:
    """Получает настройки конкретного пользователя из базы данных SQLite с fallback на дефолты."""
    if user_obj is not None:
        return {
            "remind_10min": getattr(user_obj, "remind_10min", True),
            "morning_alert": getattr(user_obj, "morning_alert", False),
            "five_min_breaks": getattr(user_obj, "five_min_breaks", False)
        }
    
    db_path = _get_db_path()
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path, timeout=5)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT remind_10min, morning_alert, five_min_breaks FROM users WHERE user_id = ?", (user_id,))
            row = cur.fetchone()
            conn.close()
            if row:
                return {
                    "remind_10min": bool(row["remind_10min"]),
                    "morning_alert": bool(row["morning_alert"]),
                    "five_min_breaks": bool(row["five_min_breaks"])
                }
        except Exception as e:
            logger.debug(f"SQLite read user_settings error: {e}")

    return dict(DEFAULT_SETTINGS)

def set_user_setting(user_id: int, key: str, value: bool) -> bool:
    """Устанавливает конкретную настройку для пользователя в базе данных SQLite."""
    if key not in DEFAULT_SETTINGS:
        return False

    db_path = _get_db_path()
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path, timeout=5)
            cur = conn.cursor()
            val_int = 1 if value else 0
            cur.execute(f"UPDATE users SET {key} = ?, updated_at = datetime('now') WHERE user_id = ?", (val_int, user_id))
            if cur.rowcount == 0:
                cur.execute(
                    f"INSERT INTO users (user_id, {key}, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))",
                    (user_id, val_int)
                )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"SQLite write user_setting error: {e}")
    return False

def toggle_user_setting(user_id: int, key: str) -> bool:
    """Инвертирует булеву настройку пользователя и сохраняет в SQLite."""
    settings = get_user_settings(user_id)
    curr_val = settings.get(key, DEFAULT_SETTINGS.get(key, False))
    new_val = not curr_val
    set_user_setting(user_id, key, new_val)
    return new_val

def get_users_with_setting(key: str) -> set[int]:
    """Возвращает множество user_id, у которых включена указанная настройка."""
    db_path = _get_db_path()
    result = set()
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path, timeout=5)
            cur = conn.cursor()
            cur.execute(f"SELECT user_id FROM users WHERE {key} = 1")
            rows = cur.fetchall()
            conn.close()
            for r in rows:
                result.add(r[0])
        except Exception as e:
            logger.debug(f"SQLite get_users_with_setting error: {e}")
    return result


def load_all_settings() -> dict:
    """Совместимость: возвращает словарь настроек пользователей из SQLite."""
    db_path = _get_db_path()
    res = {}
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path, timeout=5)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT user_id, remind_10min, morning_alert, five_min_breaks FROM users")
            rows = cur.fetchall()
            conn.close()
            for r in rows:
                res[str(r["user_id"])] = {
                    "remind_10min": bool(r["remind_10min"]),
                    "morning_alert": bool(r["morning_alert"]),
                    "five_min_breaks": bool(r["five_min_breaks"])
                }
        except Exception:
            pass
    return res

def save_all_settings(data: dict) -> bool:
    return True


def format_user_settings_text(
    user_id: int,
    user_name: str = "",
    group_name: str | None = None,
    role_display: str | None = None
) -> str:
    """Генерирует аккуратное текстовое описание настроек пользователя с группой и ролью."""
    settings = get_user_settings(user_id)
    
    r_10 = "🟢 Включено" if settings.get("remind_10min") else "🔴 Отключено"
    m_alert = "🟢 Включено" if settings.get("morning_alert") else "🔴 Отключено"
    f_breaks = "🟢 Включено" if settings.get("five_min_breaks") else "🔴 Отключено"

    name_str = f", <b>{user_name}</b>" if user_name else ""
    grp_str = f"👥 <b>Учебная группа:</b> <code>{group_name or '9ПО-43к'}</code>\n"
    role_str = f"🎖 <b>Статус/Роль:</b> {role_display}\n" if role_display else ""

    return (
        f"⚙️ <b>Личные настройки{name_str}</b>\n"
        f"──────────────────────\n"
        f"{grp_str}"
        f"{role_str}\n"
        f"Управляйте персональными уведомлениями бота в личных сообщениях:\n\n"
        f"🔔 <b>Колокольчик за 10 мин:</b> {r_10}\n"
        f"   ▫️ <i>Персональное напоминание с предметом и кабинетом перед каждой парой</i>\n\n"
        f"🌅 <b>Утренняя сводка (08:00):</b> {m_alert}\n"
        f"   ▫️ <i>Расписание на день каждое утро по будням в ЛС</i>\n\n"
        f"☕️ <b>Оповещения о пятиминутках:</b> {f_breaks}\n"
        f"   ▫️ <i>Уведомления о перерывах внутри пар в ЛС</i>\n\n"
        f"👇 <i>Нажмите на пункт ниже для переключения или смените группу:</i>"
    )


def get_user_settings_keyboard(
    user_id: int,
    is_admin: bool = False,
    is_starosta: bool = False,
    group_name: str | None = None
) -> InlineKeyboardMarkup:
    """Генерирует клавиатуру настроек с чекбоксами и кнопками управления группой."""
    settings = get_user_settings(user_id)
    
    icon_10 = "✅" if settings.get("remind_10min") else "❌"
    icon_m = "✅" if settings.get("morning_alert") else "❌"
    icon_f = "✅" if settings.get("five_min_breaks") else "❌"

    buttons = [
        [
            InlineKeyboardButton(
                text=f"{icon_10} Колокольчик за 10 мин",
                callback_data="toggle_set_remind_10min"
            )
        ],
        [
            InlineKeyboardButton(
                text=f"{icon_m} Утренняя сводка (08:00)",
                callback_data="toggle_set_morning_alert"
            )
        ],
        [
            InlineKeyboardButton(
                text=f"{icon_f} Оповещения о пятиминутках",
                callback_data="toggle_set_five_min_breaks"
            )
        ],
        [
            InlineKeyboardButton(
                text=f"👥 Сменить группу ({group_name or '9ПО-43к'})",
                callback_data="user_change_group"
            )
        ],
        [
            InlineKeyboardButton(
                text=f"👥 Старостат группы ({group_name or '9ПО-43к'})",
                callback_data="starostat_menu"
            )
        ],
        [
            InlineKeyboardButton(
                text="🔄 Обновить интерфейс и меню",
                callback_data="user_refresh_ui"
            )
        ]
    ]

    if is_starosta or is_admin:
        buttons.append([
            InlineKeyboardButton(
                text="💬 Оповещения в беседах",
                callback_data="manage_bound_chats"
            )
        ])
        buttons.append([
            InlineKeyboardButton(
                text="⭐️ Панель старосты",
                callback_data="open_starosta_panel"
            )
        ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def format_chat_settings_text(
    chat_id: int,
    chat_title: str,
    group_name: str,
    binding = None
) -> str:
    """Генерирует описание настроек системных оповещений для беседы."""
    f_breaks = "🟢 Включено" if getattr(binding, "notify_five_min_breaks", True) else "🔴 Отключено"
    r_10 = "🟢 Включено" if getattr(binding, "notify_10min", True) else "🔴 Отключено"
    m_alert = "🟢 Включено" if getattr(binding, "notify_morning", True) else "🔴 Отключено"
    mid_alert = "🟢 Включено" if getattr(binding, "notify_midnight", True) else "🔴 Отключено"
    reps = "🟢 Включено" if getattr(binding, "notify_replacements", True) else "🔴 Отключено"

    return (
        f"⚙️ <b>Настройки оповещений беседы</b>\n"
        f"──────────────────────\n"
        f"💬 <b>Чат:</b> <b>{chat_title or 'Беседа'}</b> [<code>{chat_id}</code>]\n"
        f"👥 <b>Группа:</b> <code>{group_name}</code>\n\n"
        f"Управляйте типами сообщений, которые бот отправляет в эту беседу:\n\n"
        f"🔔 <b>Звонок на пятиминутку:</b> {f_breaks}\n"
        f"   ▫️ <i>Системный звонок на 5-минутный перерыв внутри пар</i>\n\n"
        f"⏰ <b>Колокольчик за 10 мин:</b> {r_10}\n"
        f"   ▫️ <i>Напоминание перед началом каждой пары</i>\n\n"
        f"🌅 <b>Утренняя сводка (08:00):</b> {m_alert}\n"
        f"   ▫️ <i>Утреннее расписание по будням</i>\n\n"
        f"🌙 <b>Полночная рассылка (00:00):</b> {mid_alert}\n"
        f"   ▫️ <i>Детальное расписание на наступающий день</i>\n\n"
        f"⚠️ <b>Замены и отмены:</b> {reps}\n"
        f"   ▫️ <i>Мгновенные оповещения при публикации замен</i>\n\n"
        f"👇 <i>Нажмите на тумблер ниже, чтобы включить или отключить оповещение:</i>"
    )


def get_bound_chats_list_keyboard(
    chats: list,
    is_admin: bool = False,
    group_name: str | None = None
) -> InlineKeyboardMarkup:
    """Генерирует инлайн-список привязанных бесед для выбора старостой/админом в ЛС."""
    buttons = []
    for c in chats:
        c_title = getattr(c, "chat_title", "") or "Беседа"
        c_grp = getattr(c, "group_name", "") or (group_name or "")
        c_id = getattr(c, "chat_id", 0)
        label = f"💬 {c_title}" + (f" ({c_grp})" if is_admin else "")
        buttons.append([
            InlineKeyboardButton(
                text=label,
                callback_data=f"select_chat_set_{c_id}"
            )
        ])

    buttons.append([
        InlineKeyboardButton(
            text="◀️ Назад в настройки",
            callback_data="starosta_back_to_settings"
        )
    ])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_chat_settings_keyboard(chat_id: int, binding = None, from_pm: bool = False) -> InlineKeyboardMarkup:
    """Генерирует инлайн-клавиатуру с тумблерами оповещений для беседы."""
    icon_f = "✅" if getattr(binding, "notify_five_min_breaks", True) else "❌"
    icon_10 = "✅" if getattr(binding, "notify_10min", True) else "❌"
    icon_m = "✅" if getattr(binding, "notify_morning", True) else "❌"
    icon_mid = "✅" if getattr(binding, "notify_midnight", True) else "❌"
    icon_rep = "✅" if getattr(binding, "notify_replacements", True) else "❌"

    buttons = [
        [
            InlineKeyboardButton(
                text=f"{icon_mid} Полночная рассылка (00:00)",
                callback_data=f"toggle_chat_set_{chat_id}_notify_midnight"
            )
        ],
        [
            InlineKeyboardButton(
                text=f"{icon_m} Утренняя сводка (08:00)",
                callback_data=f"toggle_chat_set_{chat_id}_notify_morning"
            )
        ],
        [
            InlineKeyboardButton(
                text=f"{icon_10} Колокольчик за 10 мин",
                callback_data=f"toggle_chat_set_{chat_id}_notify_10min"
            )
        ],
        [
            InlineKeyboardButton(
                text=f"{icon_f} Звонки на пятиминутки",
                callback_data=f"toggle_chat_set_{chat_id}_notify_five_min_breaks"
            )
        ],
        [
            InlineKeyboardButton(
                text=f"{icon_rep} Замены и отмены пар",
                callback_data=f"toggle_chat_set_{chat_id}_notify_replacements"
            )
        ]
    ]

    if from_pm:
        buttons.append([
            InlineKeyboardButton(
                text="◀️ Назад к списку бесед",
                callback_data="manage_bound_chats"
            )
        ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)
