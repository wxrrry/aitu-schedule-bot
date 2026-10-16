from datetime import date, timedelta
from aiogram.types import (
    ReplyKeyboardMarkup,
    KeyboardButton,
    InlineKeyboardMarkup,
    InlineKeyboardButton
)

# Главное меню (быстрый доступ + папки)
main_keyboard = ReplyKeyboardMarkup(
    keyboard=[
        [
            KeyboardButton(text="⚡️ Какая пара сейчас?")
        ],
        [
            KeyboardButton(text="📅 Сегодня"),
            KeyboardButton(text="🔜 Завтра")
        ],
        [
            KeyboardButton(text="🗓 Расписание 📂"),
            KeyboardButton(text="🛠 Полезное 📂")
        ]
    ],
    resize_keyboard=True,
    is_persistent=True,
    input_field_placeholder="Главное меню..."
)

# Папка-раздел «Расписание»
schedule_keyboard = ReplyKeyboardMarkup(
    keyboard=[
        [
            KeyboardButton(text="🗓 Текущая неделя"),
            KeyboardButton(text="⏭ След. неделя")
        ],
        [
            KeyboardButton(text="📆 Выбрать день"),
            KeyboardButton(text="🏷 Чётность недели")
        ],
        [
            KeyboardButton(text="◀️ Главное меню")
        ]
    ],
    resize_keyboard=True,
    is_persistent=True,
    input_field_placeholder="Раздел: Расписание..."
)

# Папка-раздел «Полезное и сервисы»
services_keyboard = ReplyKeyboardMarkup(
    keyboard=[
        [
            KeyboardButton(text="🔔 Звонки"),
            KeyboardButton(text="👨‍🏫 Преподаватели")
        ],
        [
            KeyboardButton(text="📥 В календарь"),
            KeyboardButton(text="📍 Поиск кабинета")
        ],
        [
            KeyboardButton(text="◀️ Главное меню")
        ]
    ],
    resize_keyboard=True,
    is_persistent=True,
    input_field_placeholder="Раздел: Полезное..."
)

def get_days_inline_keyboard(parity_code: str = "current") -> InlineKeyboardMarkup:
    """
    Генерирует инлайн-клавиатуру для выбора дня недели (Пн-Пт)
    с кнопкой переключения числитель/знаменатель.
    """
    toggle_target = "znamenatel" if parity_code == "chislitel" else "chislitel"
    toggle_label = "Показать для Знаменателя 🔻" if parity_code == "chislitel" else "Показать для Числителя 🔺"
    
    keyboard = [
        [
            InlineKeyboardButton(text="Понедельник", callback_data=f"showday_0_{parity_code}"),
            InlineKeyboardButton(text="Вторник", callback_data=f"showday_1_{parity_code}")
        ],
        [
            InlineKeyboardButton(text="Среда", callback_data=f"showday_2_{parity_code}"),
            InlineKeyboardButton(text="Четверг", callback_data=f"showday_3_{parity_code}")
        ],
        [
            InlineKeyboardButton(text="Пятница", callback_data=f"showday_4_{parity_code}")
        ],
        [
            InlineKeyboardButton(text=toggle_label, callback_data=f"toggleweek_{toggle_target}")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_back_to_days_keyboard(parity_code: str) -> InlineKeyboardMarkup:
    """
    Кнопка возврата к списку дней.
    """
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="◀️ Назад к выбору дня", callback_data=f"backtodays_{parity_code}")]
        ]
    )

def get_day_nav_keyboard(target_date: date) -> InlineKeyboardMarkup:
    """
    Инлайн-навигация под расписанием дня (переключение Вчера/Завтра на лету).
    """
    prev_date = target_date - timedelta(days=1)
    next_date = target_date + timedelta(days=1)
    prev_str = prev_date.strftime("%Y-%m-%d")
    next_str = next_date.strftime("%Y-%m-%d")
    curr_str = target_date.strftime("%Y-%m-%d")

    keyboard = [
        [
            InlineKeyboardButton(text="◀️ Вчера", callback_data=f"navdate_{prev_str}"),
            InlineKeyboardButton(text="🔄 Обновить", callback_data=f"navdate_{curr_str}"),
            InlineKeyboardButton(text="Завтра ▶️", callback_data=f"navdate_{next_str}"),
        ],
        [
            InlineKeyboardButton(text="📆 Выбрать день недели", callback_data="nav_chooseday")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_back_to_teachers_keyboard() -> InlineKeyboardMarkup:
    """
    Кнопка возврата к списку преподавателей.
    """
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="◀️ Назад к списку преподавателей", callback_data="teachers_list")]
        ]
    )
