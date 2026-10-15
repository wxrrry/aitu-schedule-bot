from datetime import date, timedelta
from parity import get_week_parity
from schedule_data import SCHEDULE, BELL_SCHEDULE, DAYS_RU, GROUP_NAME

MONTHS_RU = [
    "",
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
]

NUMBER_EMOJIS = {
    1: "1️⃣",
    2: "2️⃣",
    3: "3️⃣",
    4: "4️⃣",
    5: "5️⃣",
    6: "6️⃣",
}

def format_day_schedule(target_date: date, title_prefix: str = "Расписание на") -> str:
    """
    Форматирует расписание на один день.
    """
    parity_code, parity_name = get_week_parity(target_date)
    weekday = target_date.weekday()
    day_name = DAYS_RU[weekday]
    date_str = f"{target_date.day} {MONTHS_RU[target_date.month]} {target_date.year}"
    
    header = (
        f"📅 <b>{title_prefix} {day_name.lower()} ({date_str})</b>\n"
        f"🏷 <b>Неделя:</b> {parity_name}\n"
        f"👥 <b>Группа:</b> {GROUP_NAME}\n"
        "──────────────────\n"
    )
    
    day_pairs = SCHEDULE.get(weekday, {})
    if not day_pairs:
        return (
            f"{header}\n"
            "🎉 <b>Пар нет!</b> Отличный день для отдыха или самоподготовки 🏖️"
        )
    
    pair_items = []
    sorted_pair_nums = sorted(day_pairs.keys())
    
    for num in sorted_pair_nums:
        pair = day_pairs[num]
        time_info = BELL_SCHEDULE.get(num, {})
        if isinstance(time_info, dict):
            time_range = time_info.get("range", "")
            breakdown = time_info.get("breakdown", "")
        else:
            time_range = str(time_info)
            breakdown = ""
            
        emoji_num = NUMBER_EMOJIS.get(num, f"[{num}]")
        
        if pair.get("split"):
            current_info = pair["chislitel"] if parity_code == "chislitel" else pair["znamenatel"]
            parity_tag = " [Числ]" if parity_code == "chislitel" else " [Знам]"
        else:
            current_info = pair
            parity_tag = ""
            
        if not current_info:
            continue
            
        subject = current_info.get("subject", "Не указан")
        room = current_info.get("room", "—")
        teacher = current_info.get("teacher", "—")
        
        card_lines = [
            f"{emoji_num} <b>{time_range}</b>{parity_tag}",
            f"⏱ <i>{breakdown}</i>" if breakdown else "",
            f"📚 <b>{subject}</b>",
            f"📍 Кабинет: <code>{room}</code>",
            f"👨‍🏫 Преподаватель: {teacher}\n"
        ]
        formatted_card = "\n".join([line for line in card_lines if line])
        
        pair_items.append({
            "num": num,
            "text": formatted_card
        })
        
    if not pair_items:
        return (
            f"{header}\n"
            "🎉 <b>Пар нет!</b> Отличный день для отдыха или самоподготовки 🏖️"
        )
        
    lines = [header]
    existing_nums = [item["num"] for item in pair_items]
    
    for item in pair_items:
        # Если между 2 и 3 парой — добавляем отметку обеда
        if item["num"] == 3 and any(n <= 2 for n in existing_nums):
            lines.append("🍽 <i>Обед: 12:20 — 12:55 (35 минут)</i>\n")
        lines.append(item["text"])
        
    return "\n".join(lines).strip()

def format_week_schedule(target_monday: date) -> str:
    """
    Форматирует расписание на всю неделю (понедельник — пятница).
    """
    parity_code, parity_name = get_week_parity(target_monday)
    sunday = target_monday + timedelta(days=6)
    
    range_str = f"{target_monday.day} {MONTHS_RU[target_monday.month]} — {sunday.day} {MONTHS_RU[sunday.month]}"
    
    res = [
        f"🗓 <b>Расписание на неделю ({range_str})</b>",
        f"🏷 <b>Неделя:</b> {parity_name}",
        f"👥 <b>Группа:</b> {GROUP_NAME}",
        "══════════════════\n"
    ]
    
    for day_idx in range(5):  # Пн - Пт
        curr_date = target_monday + timedelta(days=day_idx)
        day_pairs = SCHEDULE.get(day_idx, {})
        day_name = DAYS_RU[day_idx]
        
        res.append(f"📌 <b>{day_name} ({curr_date.day} {MONTHS_RU[curr_date.month]}):</b>")
        
        if not day_pairs:
            res.append("  <i>Пар нет</i>\n")
            continue
            
        day_lines = []
        for num in sorted(day_pairs.keys()):
            pair = day_pairs[num]
            time_info = BELL_SCHEDULE.get(num, {})
            time_range = time_info.get("range", time_info) if isinstance(time_info, dict) else str(time_info)
            
            if pair.get("split"):
                info = pair["chislitel"] if parity_code == "chislitel" else pair["znamenatel"]
            else:
                info = pair
                
            if not info:
                continue
                
            day_lines.append(f"  {num}. <b>{info['subject']}</b> | {time_range} (каб. {info['room']})")
            
        if day_lines:
            res.extend(day_lines)
        else:
            res.append("  <i>Пар нет</i>")
        res.append("")
        
    return "\n".join(res).strip()


def format_weekday_by_index(day_idx: int, parity_code: str = "chislitel") -> str:
    """
    Форматирует расписание на конкретный день недели для указанной чётности.
    """
    day_name = DAYS_RU[day_idx]
    parity_name = "Числитель 🔺" if parity_code == "chislitel" else "Знаменатель 🔻"
    
    header = (
        f"📅 <b>{day_name}</b>\n"
        f"🏷 <b>Неделя:</b> {parity_name}\n"
        f"👥 <b>Группа:</b> {GROUP_NAME}\n"
        "──────────────────\n"
    )
    
    day_pairs = SCHEDULE.get(day_idx, {})
    if not day_pairs:
        return f"{header}\n🎉 <b>Пар нет!</b> Выходной день 🏖️"
        
    pair_items = []
    for num in sorted(day_pairs.keys()):
        pair = day_pairs[num]
        time_info = BELL_SCHEDULE.get(num, {})
        time_range = time_info.get("range", "") if isinstance(time_info, dict) else str(time_info)
        breakdown = time_info.get("breakdown", "") if isinstance(time_info, dict) else ""
        emoji_num = NUMBER_EMOJIS.get(num, f"[{num}]")
        
        if pair.get("split"):
            current_info = pair["chislitel"] if parity_code == "chislitel" else pair["znamenatel"]
            parity_tag = " [Числ]" if parity_code == "chislitel" else " [Знам]"
        else:
            current_info = pair
            parity_tag = ""
            
        if not current_info:
            continue
            
        subject = current_info.get("subject", "Не указан")
        room = current_info.get("room", "—")
        teacher = current_info.get("teacher", "—")
        
        card_lines = [
            f"{emoji_num} <b>{time_range}</b>{parity_tag}",
            f"⏱ <i>{breakdown}</i>" if breakdown else "",
            f"📚 <b>{subject}</b>",
            f"📍 Кабинет: <code>{room}</code>",
            f"👨‍🏫 Преподаватель: {teacher}\n"
        ]
        pair_items.append({
            "num": num,
            "text": "\n".join([line for line in card_lines if line])
        })
        
    if not pair_items:
        return f"{header}\n🎉 <b>Пар нет!</b> В эту неделю день свободен 🏖️"
        
    lines = [header]
    existing_nums = [item["num"] for item in pair_items]
    for item in pair_items:
        if item["num"] == 3 and any(n <= 2 for n in existing_nums):
            lines.append("🍽 <i>Обед: 12:20 — 12:55 (35 минут)</i>\n")
        lines.append(item["text"])
        
    return "\n".join(lines).strip()


def format_morning_alert(today_date: date) -> str | None:
    """
    Форматирует короткое утреннее напоминание в 08:00 о первой паре.
    """
    weekday = today_date.weekday()
    if weekday >= 5:  # Суббота и Воскресенье — утром не беспокоим
        return None
        
    parity_code, parity_name = get_week_parity(today_date)
    day_name = DAYS_RU[weekday]
    date_str = f"{today_date.day} {MONTHS_RU[today_date.month]}"
    
    day_pairs = SCHEDULE.get(weekday, {})
    first_pair_num = None
    first_pair_info = None
    
    for num in sorted(day_pairs.keys()):
        pair = day_pairs[num]
        if pair.get("split"):
            info = pair["chislitel"] if parity_code == "chislitel" else pair["znamenatel"]
        else:
            info = pair
        if info:
            first_pair_num = num
            first_pair_info = info
            break
            
    if not first_pair_num or not first_pair_info:
        return (
            f"☀️ <b>Доброе утро, 9ПО-43к!</b>\n"
            f"🗓 <b>{day_name}, {date_str}</b> · {parity_name}\n\n"
            f"🎉 <b>Сегодня пар нет!</b> Отличного дня и хорошего отдыха ☕️"
        )
        
    time_info = BELL_SCHEDULE.get(first_pair_num, {})
    time_range = time_info.get("range", "") if isinstance(time_info, dict) else str(time_info)
    breakdown = time_info.get("breakdown", "") if isinstance(time_info, dict) else ""
    
    extra_note = ""
    if first_pair_num > 1:
        extra_note = f"\n☕️ <i>1-я пара отсутствует, учёба начинается со {first_pair_num}-й пары! Можно поспать подольше.</i>\n"
        
    return (
        f"☀️ <b>Доброе утро, группа 9ПО-43к!</b>\n"
        f"🗓 <b>{day_name}, {date_str}</b> · {parity_name}\n"
        "──────────────────\n"
        f"⏰ <b>Первая пара сегодня:</b>\n"
        f"{NUMBER_EMOJIS.get(first_pair_num, '')} <b>{time_range}</b>\n"
        f"⏱ <i>{breakdown}</i>\n"
        f"📚 <b>{first_pair_info['subject']}</b>\n"
        f"📍 Кабинет: <code>{first_pair_info['room']}</code>\n"
        f"👨‍🏫 Преподаватель: {first_pair_info['teacher']}\n"
        f"{extra_note}\n"
        f"👉 Полное расписание на день — кнопка <b>«📅 Сегодня»</b>."
    )

