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
