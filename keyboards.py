from aiogram.types import ReplyKeyboardMarkup, KeyboardButton

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
            KeyboardButton(text="🏷 Чётность недели"),
            KeyboardButton(text="🔔 Звонки")
        ]
    ],
    resize_keyboard=True,
    is_persistent=True,
    input_field_placeholder="Выберите действие из меню..."
)
