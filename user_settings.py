import os
import json
import logging
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

logger = logging.getLogger(__name__)

SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "user_settings.json")
SUBS_FILE = os.path.join(os.path.dirname(__file__), "subscribers.json")

# Настройки по умолчанию для каждого пользователя
DEFAULT_SETTINGS = {
    "remind_10min": True,      # Напоминание за 10 минут до начала пары
    "morning_alert": False,    # Утренняя рассылка в 08:00 в личные сообщения
    "five_min_breaks": False,  # Оповещения о пятиминутках внутри пары в ЛС
}


def load_all_settings() -> dict[str, dict]:
    """Загружает словарь настроек всех пользователей."""
    if not os.path.exists(SETTINGS_FILE):
        return {}
    try:
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                return data
            return {}
    except Exception as e:
        logger.error(f"Ошибка чтения {SETTINGS_FILE}: {e}")
        return {}


def save_all_settings(data: dict[str, dict]) -> bool:
    """Сохраняет словарь настроек всех пользователей."""
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"Ошибка записи {SETTINGS_FILE}: {e}")
        return False


def get_user_settings(user_id: int) -> dict:
    """Получает настройки конкретного пользователя с fallback на дефолты."""
    all_data = load_all_settings()
    uid = str(user_id)
    user_data = all_data.get(uid, {})
    
    # Синхронизация со старым subscribers.json
    if "remind_10min" not in user_data:
        try:
            if os.path.exists(SUBS_FILE):
                with open(SUBS_FILE, "r", encoding="utf-8") as sf:
                    subs_list = json.load(sf).get("users", [])
                    user_data["remind_10min"] = user_id in subs_list
        except Exception:
            pass

    merged = dict(DEFAULT_SETTINGS)
    merged.update(user_data)
    return merged


def set_user_setting(user_id: int, key: str, value: bool) -> bool:
    """Устанавливает конкретную настройку для пользователя."""
    all_data = load_all_settings()
    uid = str(user_id)
    if uid not in all_data:
        all_data[uid] = dict(DEFAULT_SETTINGS)
    all_data[uid][key] = bool(value)
    success = save_all_settings(all_data)

    # Синхронизация с subscribers.json для обратной совместимости
    if key == "remind_10min":
        try:
            subs = set()
            if os.path.exists(SUBS_FILE):
                with open(SUBS_FILE, "r", encoding="utf-8") as sf:
                    subs = set(json.load(sf).get("users", []))
            if value:
                subs.add(user_id)
            else:
                subs.discard(user_id)
            with open(SUBS_FILE, "w", encoding="utf-8") as sf:
                json.dump({"users": sorted(list(subs))}, sf, indent=2)
        except Exception as e:
            logger.error(f"Ошибка синхронизации subscribers.json: {e}")

    return success


def toggle_user_setting(user_id: int, key: str) -> bool:
    """Инвертирует булеву настройку пользователя и возвращает новое значение."""
    settings = get_user_settings(user_id)
    curr_val = settings.get(key, DEFAULT_SETTINGS.get(key, False))
    new_val = not curr_val
    set_user_setting(user_id, key, new_val)
    return new_val


def get_users_with_setting(key: str) -> set[int]:
    """Возвращает множество user_id, у которых включена указанная настройка."""
    all_data = load_all_settings()
    result = set()
    for uid_str, u_settings in all_data.items():
        try:
            uid = int(uid_str)
            if u_settings.get(key, DEFAULT_SETTINGS.get(key, False)):
                result.add(uid)
        except ValueError:
            continue
    return result


def format_user_settings_text(user_id: int, user_name: str = "") -> str:
    """Генерирует аккуратное текстовое описание настроек пользователя."""
    settings = get_user_settings(user_id)
    
    r_10 = "🟢 Включено" if settings.get("remind_10min") else "🔴 Отключено"
    m_alert = "🟢 Включено" if settings.get("morning_alert") else "🔴 Отключено"
    f_breaks = "🟢 Включено" if settings.get("five_min_breaks") else "🔴 Отключено"

    name_str = f", <b>{user_name}</b>" if user_name else ""
    return (
        f"⚙️ <b>Личные настройки{name_str}</b>\n"
        f"──────────────────────\n"
        f"Управляйте персональными уведомлениями бота в личных сообщениях:\n\n"
        f"🔔 <b>Колокольчик за 10 мин:</b> {r_10}\n"
        f"   ▫️ <i>Персональное напоминание с предметом и кабинетом перед каждой парой</i>\n\n"
        f"🌅 <b>Утренняя сводка (08:00):</b> {m_alert}\n"
        f"   ▫️ <i>Расписание на день каждое утро по будням в ЛС</i>\n\n"
        f"☕️ <b>Оповещения о пятиминутках:</b> {f_breaks}\n"
        f"   ▫️ <i>Уведомления о перерывах внутри пар в ЛС</i>\n\n"
        f"👇 <i>Нажмите на пункт ниже для переключения или обновите меню:</i>"
    )


def get_user_settings_keyboard(user_id: int, is_admin: bool = False) -> InlineKeyboardMarkup:
    """Генерирует клавиатуру настроек с чекбоксами."""
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
                text="🔄 Обновить интерфейс и меню",
                callback_data="user_refresh_ui"
            )
        ]
    ]

    if is_admin:
        buttons.append([
            InlineKeyboardButton(
                text="👑 Перейти в Админ-панель",
                callback_data="open_admin_panel"
            )
        ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)
