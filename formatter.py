import html
from datetime import date, timedelta
from parity import get_week_parity
from schedule_data import SCHEDULE, BELL_SCHEDULE, BELL_TIMES, DAYS_RU, GROUP_NAME, NUMBER_EMOJIS
from replacements import get_replacements_for_date

MONTHS_RU = [
    "",
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
]

def format_day_schedule(target_date: date, title_prefix: str = "Расписание на день", current_time_str: str | None = None) -> str:
    """
    Форматирует расписание на один день с красивым блочным оформлением (blockquote).
    Если передан current_time_str (например, "11:20"), подсвечивает текущую пару.
    """
    parity_code, parity_name = get_week_parity(target_date)
    weekday = target_date.weekday()
    day_name = DAYS_RU[weekday]
    date_str = f"{target_date.day} {MONTHS_RU[target_date.month]} {target_date.year}"
    replacements = get_replacements_for_date(target_date)
    
    rep_notice = ""
    if replacements:
        rep_notice = "⚠️ <i>Внимание: в расписании есть замены/отмены!</i>\n"

    header = (
        f"📅 <b>{title_prefix} · {day_name}</b> (<code>{date_str}</code>)\n"
        f"🏷 <b>Неделя:</b> {parity_name}\n"
        f"👥 <b>Группа:</b> <code>{GROUP_NAME}</code>\n"
        + rep_notice
        + "──────────────────────\n"
    )
    
    day_pairs = SCHEDULE.get(weekday, {})
    all_pair_nums = sorted(list(set(day_pairs.keys()) | set(replacements.keys())))
    if not all_pair_nums:
        return (
            f"{header}\n"
            "🎉 <b>Пар нет!</b> Отличный день для отдыха или самоподготовки 🏖️"
        )
    
    pair_items = []
    
    for num in all_pair_nums:
        pair = day_pairs.get(num)
        time_info = BELL_SCHEDULE.get(num, {})
        if isinstance(time_info, dict):
            time_range = time_info.get("range", "")
            breakdown = time_info.get("breakdown", "")
        else:
            time_range = str(time_info)
            breakdown = ""
            
        emoji_num = NUMBER_EMOJIS.get(num, f"[{num}]")
        
        current_info = None
        parity_tag = ""
        if pair:
            if pair.get("split"):
                current_info = pair["chislitel"] if parity_code == "chislitel" else pair["znamenatel"]
                parity_tag = " · <i>[Числитель]</i>" if parity_code == "chislitel" else " · <i>[Знаменатель]</i>"
            else:
                current_info = pair
                parity_tag = ""
                
        # Проверяем наличие замены/отмены
        rep = replacements.get(num)
        
        # Если нет ни регулярной пары, ни замены — пропускаем
        if not current_info and not rep:
            continue
            
        # Индикатор статуса пары (идёт сейчас / завершена)
        badge = ""
        if current_time_str and num in BELL_TIMES:
            start_t, end_t = BELL_TIMES[num]
            if start_t <= current_time_str <= end_t:
                badge = " · 🟢 <b>Идёт сейчас</b>"
            elif current_time_str > end_t:
                badge = " · ▫️ <i>(завершена)</i>"
        
        breakdown_line = f"\n⏱ <i>{breakdown}</i>" if breakdown else ""
        
        if rep and rep.get("type") == "cancel":
            subj_title = html.escape(str(current_info.get("subject", "Пара"))) if current_info else "Пара"
            card_content = (
                f"<blockquote>"
                f"❌ {emoji_num} <b><s>{time_range}</s></b>{parity_tag}{badge}\n"
                f"📚 <s>{subj_title}</s>\n"
                f"🚫 <b>ПАРА ОТМЕНЕНА</b> (<i>{html.escape(rep.get('text', 'Отмена'))}</i>)"
                f"</blockquote>"
            )
        elif rep and rep.get("type") == "replace":
            orig_subj = html.escape(str(current_info.get("subject", ""))) if current_info else ""
            orig_note = f"\n▫️ <i>(по расписанию: {orig_subj})</i>" if orig_subj else ""
            card_content = (
                f"<blockquote>"
                f"⚠️ {emoji_num} <b>{time_range}</b>{parity_tag}{badge} · <b>ЗАМЕНА</b>\n"
                f"📚 <b>{html.escape(rep.get('text', ''))}</b>"
                f"{orig_note}"
                f"{breakdown_line}"
                f"</blockquote>"
            )
        else:
            subject = html.escape(str(current_info.get("subject", "Не указан")))
            room = html.escape(str(current_info.get("room", "—")))
            teacher = html.escape(str(current_info.get("teacher", "—")))
            
            card_content = (
                f"<blockquote>"
                f"{emoji_num} <b>{time_range}</b>{parity_tag}{badge}\n"
                f"📚 <b>{subject}</b>\n"
                f"📍 Кабинет: <code>{room}</code> · 👨‍🏫 <i>{teacher}</i>"
                f"{breakdown_line}"
                f"</blockquote>"
            )
        
        pair_items.append({
            "num": num,
            "text": card_content
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
            lunch_badge = ""
            if current_time_str and "12:20" <= current_time_str <= "12:55":
                lunch_badge = " · 🟢 <b>Сейчас перерыв</b>"
            lines.append(f"🍽 <b>Обед: 12:20 — 12:55</b> <i>(35 минут)</i>{lunch_badge}\n")
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
            
        day_replacements = get_replacements_for_date(curr_date)
        all_nums = sorted(list(set(day_pairs.keys()) | set(day_replacements.keys())))
        
        day_lines = []
        for num in all_nums:
            pair = day_pairs.get(num)
            time_info = BELL_SCHEDULE.get(num, {})
            time_range = time_info.get("range", time_info) if isinstance(time_info, dict) else str(time_info)
            
            info = None
            if pair:
                if pair.get("split"):
                    info = pair["chislitel"] if parity_code == "chislitel" else pair["znamenatel"]
                else:
                    info = pair
                    
            rep = day_replacements.get(num)
            if not info and not rep:
                continue

            if rep and rep.get("type") == "cancel":
                subj_esc = html.escape(str(info.get("subject", "Пара"))) if info else "Пара"
                day_lines.append(f"  {num}. <s>{subj_esc}</s> | ❌ <i>ОТМЕНЕНА ({html.escape(rep.get('text', ''))})</i>")
            elif rep and rep.get("type") == "replace":
                day_lines.append(f"  {num}. ⚠️ <b>ЗАМЕНА: {html.escape(rep.get('text', ''))}</b> | {time_range}")
            else:
                subj_esc = html.escape(str(info.get("subject", "")))
                room_esc = html.escape(str(info.get("room", "—")))
                day_lines.append(f"  {num}. <b>{subj_esc}</b> | {time_range} (каб. {room_esc})")
            
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
            
        subject = html.escape(str(current_info.get("subject", "Не указан")))
        room = html.escape(str(current_info.get("room", "—")))
        teacher = html.escape(str(current_info.get("teacher", "—")))
        
        card_content = (
            f"<blockquote>"
            f"{emoji_num} <b>{time_range}</b>{parity_tag}\n"
            f"📚 <b>{subject}</b>\n"
            f"📍 Кабинет: <code>{room}</code> · 👨‍🏫 <i>{teacher}</i>"
            + (f"\n⏱ <i>{breakdown}</i>" if breakdown else "")
            + f"</blockquote>"
        )
        pair_items.append({
            "num": num,
            "text": card_content
        })
        
    if not pair_items:
        return f"{header}\n🎉 <b>Пар нет!</b> В эту неделю день свободен 🏖️"
        
    lines = [header]
    existing_nums = [item["num"] for item in pair_items]
    for item in pair_items:
        if item["num"] == 3 and any(n <= 2 for n in existing_nums):
            lines.append("🍽 <b>Обед: 12:20 — 12:55</b> <i>(35 минут)</i>\n")
        lines.append(item["text"])
        
    return "\n".join(lines).strip()


def format_morning_alert(today_date: date) -> str | None:
    """
    Форматирует короткое утреннее напоминание в 08:00 о первой паре.
    Учитывает отмены и замены пар.
    """
    weekday = today_date.weekday()
    if weekday >= 5:  # Суббота и Воскресенье — утром не беспокоим
        return None
        
    parity_code, parity_name = get_week_parity(today_date)
    day_name = DAYS_RU[weekday]
    date_str = f"{today_date.day} {MONTHS_RU[today_date.month]}"
    
    replacements = get_replacements_for_date(today_date)
    rep_badge = ""
    if replacements:
        rep_badge = "⚠️ <b>Внимание: сегодня есть изменения в расписании!</b>\n\n"

    day_pairs = SCHEDULE.get(weekday, {})
    all_nums = sorted(list(set(day_pairs.keys()) | set(replacements.keys())))
    first_pair_num = None
    first_pair_info = None
    first_pair_rep = None
    
    for num in all_nums:
        pair = day_pairs.get(num)
        info = None
        if pair:
            if pair.get("split"):
                info = pair["chislitel"] if parity_code == "chislitel" else pair["znamenatel"]
            else:
                info = pair
                
        rep = replacements.get(num)
        if rep and rep.get("type") == "cancel":
            # Пара отменена, идём дальше
            continue
            
        if rep and rep.get("type") == "replace":
            first_pair_num = num
            first_pair_info = info
            first_pair_rep = rep
            break
            
        if info:
            first_pair_num = num
            first_pair_info = info
            break
            
    if not first_pair_num or (not first_pair_info and not first_pair_rep):
        return (
            f"☀️ <b>Доброе утро, 9ПО-43к!</b>\n"
            f"🗓 <b>{day_name}, {date_str}</b> · {parity_name}\n\n"
            f"{rep_badge}"
            f"🎉 <b>Сегодня пар нет (или все отменены)!</b> Отличного дня и хорошего отдыха ☕️"
        )
        
    time_info = BELL_SCHEDULE.get(first_pair_num, {})
    time_range = time_info.get("range", "") if isinstance(time_info, dict) else str(time_info)
    breakdown = time_info.get("breakdown", "") if isinstance(time_info, dict) else ""
    
    extra_note = ""
    if first_pair_num > 1:
        if 1 in replacements and replacements[1].get("type") == "cancel":
            extra_note = f"\n⚠️ <i>1-я пара отменена, учёба начинается со {first_pair_num}-й пары! Можно поспать подольше ☕️</i>\n"
        else:
            extra_note = f"\n☕️ <i>1-я пара отсутствует, учёба начинается со {first_pair_num}-й пары! Можно поспать подольше.</i>\n"
        
    if first_pair_rep:
        card_content = (
            f"<blockquote>"
            f"{NUMBER_EMOJIS.get(first_pair_num, '')} <b>{time_range}</b> · <b>ЗАМЕНА</b>\n"
            f"📚 <b>{html.escape(first_pair_rep.get('text', ''))}</b>\n"
            + (f"▫️ <i>(по плану: {html.escape(first_pair_info['subject'])})</i>\n" if first_pair_info else "")
            + (f"⏱ <i>{breakdown}</i>" if breakdown else "")
            + f"</blockquote>"
        )
    else:
        subj_esc = html.escape(str(first_pair_info.get("subject", "")))
        room_esc = html.escape(str(first_pair_info.get("room", "—")))
        teacher_esc = html.escape(str(first_pair_info.get("teacher", "—")))
        card_content = (
            f"<blockquote>"
            f"{NUMBER_EMOJIS.get(first_pair_num, '')} <b>{time_range}</b>\n"
            f"📚 <b>{subj_esc}</b>\n"
            f"📍 Кабинет: <code>{room_esc}</code> · 👨‍🏫 <i>{teacher_esc}</i>"
            + (f"\n⏱ <i>{breakdown}</i>" if breakdown else "")
            + f"</blockquote>"
        )

    return (
        f"☀️ <b>Доброе утро, группа 9ПО-43к!</b>\n"
        f"🗓 <b>{day_name}, {date_str}</b> · {parity_name}\n"
        "──────────────────────\n"
        f"{rep_badge}"
        f"⏰ <b>Первая пара сегодня:</b>\n"
        f"{card_content}\n"
        f"{extra_note}"
        f"👉 <i>Полное расписание на день — кнопка <b>«📅 Сегодня»</b></i>"
    )

