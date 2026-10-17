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
            KeyboardButton(text="⚠️ Замены пар")
        ],
        [
            KeyboardButton(text="📚 Конспекты лекций"),
            KeyboardButton(text="📁 СДО и Материалы")
        ],
        [
            KeyboardButton(text="⚙️ Настройки"),
            KeyboardButton(text="👨‍🏫 Преподаватели")
        ],
        [
            KeyboardButton(text="📍 Поиск кабинета"),
            KeyboardButton(text="📥 В календарь")
        ],
        [
            KeyboardButton(text="◀️ Главное меню")
        ]
    ],
    resize_keyboard=True,
    is_persistent=True,
    input_field_placeholder="Раздел: Полезное..."
)

def get_moodle_keyboard() -> InlineKeyboardMarkup:
    """Инлайн-кнопки для СДО Moodle и скачивания макета титульного листа."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🌐 Войти в СДО Moodle", url="https://do.eduhouse.ru")
            ],
            [
                InlineKeyboardButton(text="📄 Скачать титульный лист (.docx)", callback_data="download_maket_docx")
            ]
        ]
    )

def get_remind_toggle_keyboard(is_active: bool) -> InlineKeyboardMarkup:
    """Инлайн-кнопка переключения подписки на личные напоминания."""
    btn_text = "🔕 Отключить напоминания" if is_active else "🔔 Включить напоминания"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=btn_text, callback_data="toggle_reminder")
            ]
        ]
    )

def get_replacements_keyboard() -> InlineKeyboardMarkup:
    """Инлайн-кнопки под списком замен."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🔄 Обновить замены", callback_data="refresh_replacements"),
                InlineKeyboardButton(text="📅 Сегодня", callback_data="nav_today")
            ]
        ]
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


# -------------------------------------------------------------
# Клавиатуры для раздела «Конспекты лекций»
# -------------------------------------------------------------

def get_lectures_menu_keyboard() -> InlineKeyboardMarkup:
    """Главное меню конспектов: список предметов + даты + поиск."""
    from lectures import get_subjects_with_counts
    subjects = get_subjects_with_counts()
    keyboard = []
    for s in subjects:
        btn_text = f"{s['icon']} {s['name']} ({s['count']} л.)"
        keyboard.append([InlineKeyboardButton(text=btn_text, callback_data=f"lec_sub_{s['code']}")])
    
    keyboard.append([
        InlineKeyboardButton(text="📅 По датам занятий", callback_data="lec_dates"),
        InlineKeyboardButton(text="🔍 Поиск лекции", callback_data="lec_search_hint")
    ])
    return InlineKeyboardMarkup(inline_keyboard=keyboard)


def get_subject_lectures_keyboard(subject_code: str) -> InlineKeyboardMarkup:
    """Список лекций по выбранному предмету."""
    from lectures import get_lectures_by_subject_code
    lectures = get_lectures_by_subject_code(subject_code)
    keyboard = []
    for l in lectures:
        date_short = l["date"].split(".2026")[0] if ".2026" in l["date"] else l["date"]
        title_btn = l["title"]
        if len(title_btn) > 30:
            title_btn = title_btn[:27] + "..."
        btn_text = f"📖 {date_short} · {title_btn}"
        keyboard.append([InlineKeyboardButton(text=btn_text, callback_data=f"lec_view_{l['id']}")])

    keyboard.append([
        InlineKeyboardButton(text="◀️ Все предметы", callback_data="lec_menu")
    ])
    return InlineKeyboardMarkup(inline_keyboard=keyboard)


def get_dates_lectures_keyboard() -> InlineKeyboardMarkup:
    """Список дат занятий."""
    from lectures import get_unique_dates
    dates = get_unique_dates()
    keyboard = []
    for d in dates:
        btn_text = f"📅 {d['date']} ({d['count']} лекц.)"
        keyboard.append([InlineKeyboardButton(text=btn_text, callback_data=f"lec_date_{d['date_iso']}")])

    keyboard.append([
        InlineKeyboardButton(text="◀️ Все предметы", callback_data="lec_menu")
    ])
    return InlineKeyboardMarkup(inline_keyboard=keyboard)


def get_date_lectures_keyboard(date_iso: str) -> InlineKeyboardMarkup:
    """Список лекций за конкретную дату."""
    from lectures import get_lectures_by_date_iso
    lectures = get_lectures_by_date_iso(date_iso)
    keyboard = []
    for l in lectures:
        pair_num = l["pair"].split(" ")[0] if l.get("pair") else "Лекция"
        btn_text = f"📖 {pair_num} · {l['subject']}"
        keyboard.append([InlineKeyboardButton(text=btn_text, callback_data=f"lec_view_{l['id']}")])

    keyboard.append([
        InlineKeyboardButton(text="◀️ К списку дат", callback_data="lec_dates"),
        InlineKeyboardButton(text="📚 Все предметы", callback_data="lec_menu")
    ])
    return InlineKeyboardMarkup(inline_keyboard=keyboard)


def get_lecture_card_keyboard(lecture_id: str, subject_code: str) -> InlineKeyboardMarkup:
    """Кнопки под карточкой лекции: Читать, Скачать, Назад к предмету, Все предметы."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="📖 Читать конспект", callback_data=f"lec_p_{lecture_id}_0"),
                InlineKeyboardButton(text="📄 Скачать .md", callback_data=f"lec_doc_{lecture_id}")
            ],
            [
                InlineKeyboardButton(text="◀️ К лекциям предмета", callback_data=f"lec_sub_{subject_code}"),
                InlineKeyboardButton(text="📚 Все предметы", callback_data="lec_menu")
            ]
        ]
    )


def get_lecture_reader_keyboard(lecture_id: str, current_page: int, total_pages: int, subject_code: str) -> InlineKeyboardMarkup:
    """Кнопки при постраничном чтении конспекта."""
    nav_row = []
    if current_page > 0:
        nav_row.append(InlineKeyboardButton(text="◀️ Назад", callback_data=f"lec_p_{lecture_id}_{current_page - 1}"))
    
    nav_row.append(InlineKeyboardButton(text=f"📄 {current_page + 1}/{total_pages}", callback_data=f"lec_p_{lecture_id}_{current_page}"))
    
    if current_page < total_pages - 1:
        nav_row.append(InlineKeyboardButton(text="Вперёд ▶️", callback_data=f"lec_p_{lecture_id}_{current_page + 1}"))

    return InlineKeyboardMarkup(
        inline_keyboard=[
            nav_row,
            [
                InlineKeyboardButton(text="📄 Скачать полный .md файл", callback_data=f"lec_doc_{lecture_id}")
            ],
            [
                InlineKeyboardButton(text="◀️ К карточке лекции", callback_data=f"lec_view_{lecture_id}"),
                InlineKeyboardButton(text="📚 Все предметы", callback_data="lec_menu")
            ]
        ]
    )


# -------------------------------------------------------------
# Клавиатуры выбора академической группы и курса
# -------------------------------------------------------------
def get_courses_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура выбора курса (1..4) + ручной ввод."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="1️⃣ 1 курс", callback_data="sel_course_1"),
                InlineKeyboardButton(text="2️⃣ 2 курс", callback_data="sel_course_2")
            ],
            [
                InlineKeyboardButton(text="3️⃣ 3 курс", callback_data="sel_course_3"),
                InlineKeyboardButton(text="4️⃣ 4 курс", callback_data="sel_course_4")
            ],
            [
                InlineKeyboardButton(text="✍️ Ввести группу вручную", callback_data="sel_group_manual")
            ]
        ]
    )


def get_groups_by_course_keyboard(course: int, group_names: list[str]) -> InlineKeyboardMarkup:
    """Клавиатура списка групп конкретного курса."""
    buttons = []
    row = []
    for g_name in group_names:
        row.append(InlineKeyboardButton(text=f"👥 {g_name}", callback_data=f"sel_grp_{g_name}"))
        if len(row) == 2:
            buttons.append(row)
            row = []
    if row:
        buttons.append(row)

    buttons.append([
        InlineKeyboardButton(text="◀️ Назад к выбору курса", callback_data="sel_course_back")
    ])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_starosta_panel_keyboard(group_name: str) -> InlineKeyboardMarkup:
    """Клавиатура панели старосты группы."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🚪 Сменить аудиторию пары", callback_data="starosta_change_room"),
                InlineKeyboardButton(text="⚠️ Добавить замену", callback_data="starosta_add_zam")
            ],
            [
                InlineKeyboardButton(text="❌ Отменить пару", callback_data="starosta_cancel_pair"),
                InlineKeyboardButton(text="🗑 Удалить замену", callback_data="starosta_del_zam")
            ],
            [
                InlineKeyboardButton(text="💬 Привязать беседу группы", callback_data="starosta_bind_info")
            ],
            [
                InlineKeyboardButton(text="◀️ Назад в настройки", callback_data="starosta_back_to_settings")
            ]
        ]
    )


