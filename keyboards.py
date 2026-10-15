from aiogram.types import (
    ReplyKeyboardMarkup,
    KeyboardButton,
    InlineKeyboardMarkup,
    InlineKeyboardButton
)

main_keyboard = ReplyKeyboardMarkup(
    keyboard=[
        [
            KeyboardButton(text="📅 Сегодня"),
            KeyboardButton(text="🔜 Завтра")
        ],
        [
            KeyboardButton(text="🗓 Текущая неделя"),
            KeyboardButton(text="⏭ След. неделя")
        ],
        [
            KeyboardButton(text="📆 Выбрать день"),
            KeyboardButton(text="🏷 Чётность недели")
        ],
        [
            KeyboardButton(text="🔔 Звонки")
        ]
    ],
    resize_keyboard=True,
    is_persistent=True,
    input_field_placeholder="Выберите действие из меню..."
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
