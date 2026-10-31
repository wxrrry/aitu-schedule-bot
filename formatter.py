import html
from datetime import date, timedelta
from parity import get_week_parity
from schedule_data import (
    SCHEDULE,
    BELL_SCHEDULE,
    BELL_TIMES,
    DAYS_RU,
    GROUP_NAME,
    NUMBER_EMOJIS,
    get_course_from_group_name,
    get_bell_schedule,
    get_bell_times,
    get_course_lunch_info,
    get_schedule_for_group,
)
from replacements import get_replacements_for_date

MONTHS_RU = [
    "",
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
]


def format_day_schedule(
    target_date: date,
    title_prefix: str = "Расписание на день",
    current_time_str: str | None = None,
    group_name: str | None = None,
    custom_pairs: dict[int, dict] | None = None,
    custom_replacements: dict[int, dict] | None = None
) -> str:
    """
    Форматирует расписание на один день с красивым блочным оформлением (blockquote).
    Поддерживает произвольную группу, кастомные пары и замены из БД.
    """
    parity_code, parity_name = get_week_parity(target_date)
    weekday = target_date.weekday()
    day_name = DAYS_RU[weekday]
    date_str = f"{target_date.day} {MONTHS_RU[target_date.month]} {target_date.year}"
    target_group = group_name or GROUP_NAME
    course = get_course_from_group_name(target_group)
    bell_sched = get_bell_schedule(course)
    bell_times = get_bell_times(course)
    lunch_info = get_course_lunch_info(course)

    if custom_replacements is not None:
        replacements = custom_replacements
    else:
        replacements = get_replacements_for_date(target_date, group_name=target_group)
    
    rep_notice = ""
    if replacements:
        rep_notice = "⚠️ <i>Внимание: в расписании есть замены/отмены!</i>\n"

    header = (
        f"📅 <b>{title_prefix} · {day_name}</b> (<code>{date_str}</code>)\n"
        f"🏷 <b>Неделя:</b> {parity_name}\n"
        f"👥 <b>Группа:</b> <code>{target_group}</code> <i>({course} курс)</i>\n"
        + rep_notice
        + "──────────────────────\n"
    )
    
    if custom_pairs is not None:
        day_pairs = custom_pairs
    else:
        day_pairs = get_schedule_for_group(target_group).get(weekday, {})

    all_pair_nums = sorted(list(set(day_pairs.keys()) | set(replacements.keys())))
    if not all_pair_nums:
        return (
            f"{header}\n"
            "🎉 <b>Пар нет!</b> Отличный день для отдыха или самоподготовки 🏖️"
        )
    
    pair_items = []
    
    for num in all_pair_nums:
        pair = day_pairs.get(num)
        time_info = bell_sched.get(num, {})
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
                p_val = pair.get("parity")
                if p_val == "chislitel":
                    parity_tag = " · <i>[Числитель]</i>"
                elif p_val == "znamenatel":
                    parity_tag = " · <i>[Знаменатель]</i>"
                else:
                    parity_tag = ""
                
        # Проверяем наличие замены/отмены
        rep = replacements.get(num)
        
        # Если нет ни регулярной пары, ни замены — пропускаем
        if not current_info and not rep:
            continue
            
        # Индикатор статуса пары (идёт сейчас / завершена)
        badge = ""
        if current_time_str and num in bell_times:
            start_t, end_t = bell_times[num]
            if start_t <= current_time_str <= end_t:
                badge = " · 🟢 <b>Идёт сейчас</b>"
            elif current_time_str > end_t:
                badge = " · ▫️ <i>(завершена)</i>"
        
        breakdown_line = f"\n⏱ <i>{breakdown}</i>" if breakdown else ""
        
        if rep and rep.get("type") == "cancel":
            subj_title = html.escape(str(current_info.get("subject", "Пара"))) if current_info else "Пара"
            reason_text = html.escape(rep.get("text") or rep.get("subject") or "Отмена")
            card_content = (
                f"<blockquote>"
                f"❌ {emoji_num} <b><s>{time_range}</s></b>{parity_tag}{badge}\n"
                f"📚 <s>{subj_title}</s>\n"
                f"🚫 <b>ПАРА ОТМЕНЕНА</b> (<i>{reason_text}</i>)"
                f"</blockquote>"
            )
        elif rep and rep.get("type") == "replace":
            orig_subj = html.escape(str(current_info.get("subject", ""))) if current_info else ""
            orig_note = f"\n▫️ <i>(по расписанию: {orig_subj})</i>" if orig_subj else ""
            rep_subj = html.escape(rep.get("subject") or rep.get("text") or "Замена")
            rep_room = html.escape(rep.get("room") or (current_info.get("room", "—") if current_info else "—"))
            rep_teacher = html.escape(rep.get("teacher") or (current_info.get("teacher", "—") if current_info else "—"))
            card_content = (
                f"<blockquote>"
                f"⚠️ {emoji_num} <b>{time_range}</b>{parity_tag}{badge} · <b>ЗАМЕНА</b>\n"
                f"📚 <b>{rep_subj}</b>\n"
                f"📍 Кабинет: <code>{rep_room}</code> · 👨‍🏫 <i>{rep_teacher}</i>"
                f"{breakdown_line}"
                f"{orig_note}"
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
            "🎉 <b>Пар нет!</b> В этот день занятий не запланировано 🏖️"
        )
        
    lines = [header]
    existing_nums = [item["num"] for item in pair_items]
    
    for item in pair_items:
        # 1 курс: обед после 1 пары (перед 2 парой)
        if course == 1 and item["num"] == 2 and any(n <= 1 for n in existing_nums):
            lunch_badge = ""
            if current_time_str and lunch_info["start"] <= current_time_str <= lunch_info["end"]:
                lunch_badge = " · 🟢 <b>Сейчас перерыв</b>"
            lines.append(f"🍽 <b>Обед: {lunch_info['start']} — {lunch_info['end']}</b> <i>({lunch_info['duration']})</i>{lunch_badge}\n")

        # 3 и 4 курс: обед после 2 пары (перед 3 парой)
        elif course in (3, 4) and item["num"] == 3 and any(n <= 2 for n in existing_nums):
            lunch_badge = ""
            if current_time_str and lunch_info["start"] <= current_time_str <= lunch_info["end"]:
                lunch_badge = " · 🟢 <b>Сейчас перерыв</b>"
            lines.append(f"🍽 <b>Обед: {lunch_info['start']} — {lunch_info['end']}</b> <i>({lunch_info['duration']})</i>{lunch_badge}\n")

        lines.append(item["text"])
        
    return "\n".join(lines).strip()


def format_week_schedule(
    target_monday: date,
    group_name: str | None = None,
    custom_week_pairs: dict[int, dict[int, dict]] | None = None,
    custom_week_replacements: dict[int, dict[int, dict]] | None = None
) -> str:
    """
    Форматирует расписание на всю неделю (понедельник — пятница).
    """
    parity_code, parity_name = get_week_parity(target_monday)
    sunday = target_monday + timedelta(days=6)
    target_group = group_name or GROUP_NAME
    course = get_course_from_group_name(target_group)
    bell_sched = get_bell_schedule(course)
    
    range_str = f"{target_monday.day} {MONTHS_RU[target_monday.month]} — {sunday.day} {MONTHS_RU[sunday.month]}"
    
    res = [
        f"🗓 <b>Расписание на неделю ({range_str})</b>",
        f"🏷 <b>Неделя:</b> {parity_name}",
        f"👥 <b>Группа:</b> {target_group} <i>({course} курс)</i>",
        "══════════════════\n"
    ]
    
    for day_idx in range(5):  # Пн - Пт
        curr_date = target_monday + timedelta(days=day_idx)
        if custom_week_pairs is not None:
            day_pairs = custom_week_pairs.get(day_idx, {})
        else:
            day_pairs = get_schedule_for_group(target_group).get(day_idx, {})

        day_name = DAYS_RU[day_idx]
        
        res.append(f"📌 <b>{day_name} ({curr_date.day} {MONTHS_RU[curr_date.month]}):</b>")
        
        if custom_week_replacements is not None:
            day_replacements = custom_week_replacements.get(day_idx, {})
        else:
            day_replacements = get_replacements_for_date(curr_date, group_name=target_group)

        all_nums = sorted(list(set(day_pairs.keys()) | set(day_replacements.keys())))
        if not all_nums:
            res.append("  <i>Пар нет</i>\n")
            continue
        
        day_lines = []
        for num in all_nums:
            pair = day_pairs.get(num)
            time_info = bell_sched.get(num, {})
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
                reason = html.escape(rep.get("text") or rep.get("subject") or "Отмена")
                day_lines.append(f"  {num}. <s>{subj_esc}</s> | ❌ <i>ОТМЕНЕНА ({reason})</i>")
            elif rep and rep.get("type") == "replace":
                rep_title = html.escape(rep.get("subject") or rep.get("text") or "Замена")
                rep_room = html.escape(rep.get("room") or "—")
                day_lines.append(f"  {num}. ⚠️ <b>ЗАМЕНА: {rep_title}</b> | {time_range} (каб. {rep_room})")
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


def format_weekday_by_index(
    day_idx: int,
    parity_code: str = "chislitel",
    group_name: str | None = None,
    custom_pairs: dict[int, dict] | None = None
) -> str:
    """
    Форматирует расписание на конкретный день недели для указанной чётности.
    """
    day_name = DAYS_RU[day_idx]
    parity_name = "Числитель 🔺" if parity_code == "chislitel" else "Знаменатель 🔻"
    target_group = group_name or GROUP_NAME
    course = get_course_from_group_name(target_group)
    bell_sched = get_bell_schedule(course)
    
    header = (
        f"📅 <b>{day_name}</b>\n"
        f"🏷 <b>Неделя:</b> {parity_name}\n"
        f"👥 <b>Группа:</b> {target_group} <i>({course} курс)</i>\n"
        "──────────────────\n"
    )
    
    if custom_pairs is not None:
        day_pairs = custom_pairs
    else:
        day_pairs = get_schedule_for_group(target_group).get(day_idx, {})

    if not day_pairs:
        return f"{header}\n🎉 <b>Пар нет!</b> Выходной день 🏖️"
        
    pair_items = []
    for num in sorted(day_pairs.keys()):
        pair = day_pairs[num]
        time_info = bell_sched.get(num, {})
        time_range = time_info.get("range", "") if isinstance(time_info, dict) else str(time_info)
        breakdown = time_info.get("breakdown", "") if isinstance(time_info, dict) else ""
        emoji_num = NUMBER_EMOJIS.get(num, f"[{num}]")
        
        if pair.get("split"):
            current_info = pair["chislitel"] if parity_code == "chislitel" else pair["znamenatel"]
            parity_tag = " [Числ]" if parity_code == "chislitel" else " [Знам]"
        else:
            current_info = pair
            p_val = pair.get("parity")
            if p_val == "chislitel":
                parity_tag = " [Числ]"
            elif p_val == "znamenatel":
                parity_tag = " [Знам]"
            else:
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
    lunch_info = get_course_lunch_info(course)
    for item in pair_items:
        # 1 курс: обед после 1 пары (перед 2 парой)
        if course == 1 and item["num"] == 2 and any(n <= 1 for n in existing_nums):
            lines.append(f"🍽 <b>Обед: {lunch_info['start']} — {lunch_info['end']}</b> <i>({lunch_info['duration']})</i>\n")
        # 3 и 4 курс: обед после 2 пары (перед 3 парой)
        elif course in (3, 4) and item["num"] == 3 and any(n <= 2 for n in existing_nums):
            lines.append(f"🍽 <b>Обед: {lunch_info['start']} — {lunch_info['end']}</b> <i>({lunch_info['duration']})</i>\n")
        lines.append(item["text"])
        
    return "\n".join(lines).strip()


def format_morning_alert(
    today_date: date,
    group_name: str | None = None,
    custom_pairs: dict[int, dict] | None = None,
    custom_replacements: dict[int, dict] | None = None
) -> str | None:
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
    target_group = group_name or GROUP_NAME
    course = get_course_from_group_name(target_group)
    bell_sched = get_bell_schedule(course)
    
    if custom_replacements is not None:
        replacements = custom_replacements
    else:
        replacements = get_replacements_for_date(today_date)

    rep_badge = ""
    if replacements:
        rep_badge = "⚠️ <b>Внимание: сегодня есть изменения в расписании!</b>\n\n"

    if custom_pairs is not None:
        day_pairs = custom_pairs
    else:
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
            f"☀️ <b>Доброе утро, {target_group}!</b> <i>({course} курс)</i>\n"
            f"🗓 <b>{day_name}, {date_str}</b> · {parity_name}\n\n"
            f"{rep_badge}"
            f"🎉 <b>Сегодня пар нет (или все отменены)!</b> Отличного дня и хорошего отдыха ☕️"
        )
        
    time_info = bell_sched.get(first_pair_num, {})
    time_range = time_info.get("range", "") if isinstance(time_info, dict) else str(time_info)
    breakdown = time_info.get("breakdown", "") if isinstance(time_info, dict) else ""
    
    extra_note = ""
    if first_pair_num > 1:
        if 1 in replacements and replacements[1].get("type") == "cancel":
            extra_note = f"\n⚠️ <i>1-я пара отменена, учёба начинается со {first_pair_num}-й пары! Можно поспать подольше ☕️</i>\n"
        else:
            extra_note = f"\n☕️ <i>1-я пара отсутствует, учёба начинается со {first_pair_num}-й пары! Можно поспать подольше.</i>\n"
        
    if first_pair_rep:
        rep_subj = html.escape(first_pair_rep.get("subject") or first_pair_rep.get("text") or "Замена")
        rep_room = html.escape(first_pair_rep.get("room") or "—")
        card_content = (
            f"<blockquote>"
            f"{NUMBER_EMOJIS.get(first_pair_num, '')} <b>{time_range}</b> · <b>ЗАМЕНА</b>\n"
            f"📚 <b>{rep_subj}</b>\n"
            f"📍 Кабинет: <code>{rep_room}</code>"
            + (f"\n▫️ <i>(по плану: {html.escape(first_pair_info['subject'])})</i>\n" if first_pair_info else "")
            + (f"\n⏱ <i>{breakdown}</i>" if breakdown else "")
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
        f"☀️ <b>Доброе утро, группа {target_group}!</b>\n"
        f"🗓 <b>{day_name}, {date_str}</b> · {parity_name}\n"
        "──────────────────────\n"
        f"{rep_badge}"
        f"⏰ <b>Первая пара сегодня:</b>\n"
        f"{card_content}\n"
        f"{extra_note}"
        f"👉 <i>Полное расписание на день — кнопка <b>«📅 Сегодня»</b></i>"
    )


# =============================================================
# Асинхронные интерфейсы для работы с БД (мульти-группы)
# =============================================================
async def get_formatted_day_schedule(
    target_date: date,
    title_prefix: str = "Расписание на день",
    current_time_str: str | None = None,
    group_name: str | None = None
) -> str:
    """Загружает пары и замены группы из БД и форматирует расписание на день."""
    from db.crud import get_lessons_for_day, get_replacements_for_date_and_group

    grp = group_name or GROUP_NAME
    parity_code, _ = get_week_parity(target_date)
    weekday = target_date.weekday()

    db_pairs = await get_lessons_for_day(grp, weekday, parity_code)
    db_reps = await get_replacements_for_date_and_group(target_date, grp)

    if not db_pairs:
        return format_day_schedule(
            target_date,
            title_prefix=title_prefix,
            current_time_str=current_time_str,
            group_name=grp,
            custom_replacements=db_reps
        )

    return format_day_schedule(
        target_date,
        title_prefix=title_prefix,
        current_time_str=current_time_str,
        group_name=grp,
        custom_pairs=db_pairs,
        custom_replacements=db_reps
    )


async def get_formatted_week_schedule(target_monday: date, group_name: str | None = None) -> str:
    """Загружает пары недели и замены группы из БД и форматирует расписание на неделю."""
    from db.crud import get_lessons_for_day, get_replacements_for_date_and_group

    grp = group_name or GROUP_NAME
    parity_code, _ = get_week_parity(target_monday)

    week_pairs = {}
    week_reps = {}
    has_any_db_lessons = False

    for day_idx in range(5):
        d = target_monday + timedelta(days=day_idx)
        pairs = await get_lessons_for_day(grp, day_idx, parity_code)
        if pairs:
            has_any_db_lessons = True
        reps = await get_replacements_for_date_and_group(d, grp)
        week_pairs[day_idx] = pairs
        week_reps[day_idx] = reps

    if not has_any_db_lessons:
        return format_week_schedule(target_monday, group_name=grp, custom_week_replacements=week_reps)

    return format_week_schedule(
        target_monday,
        group_name=grp,
        custom_week_pairs=week_pairs,
        custom_week_replacements=week_reps
    )


async def get_formatted_weekday_by_index(
    day_idx: int,
    parity_code: str = "chislitel",
    group_name: str | None = None
) -> str:
    """Загружает пары конкретного дня недели из БД и форматирует их."""
    from db.crud import get_lessons_for_day

    grp = group_name or GROUP_NAME
    db_pairs = await get_lessons_for_day(grp, day_idx, parity_code)

    if not db_pairs and grp == GROUP_NAME:
        return format_weekday_by_index(day_idx, parity_code=parity_code, group_name=grp)

    return format_weekday_by_index(
        day_idx,
        parity_code=parity_code,
        group_name=grp,
        custom_pairs=db_pairs
    )


async def get_formatted_morning_alert(today_date: date, group_name: str | None = None) -> str | None:
    """Загружает пары и замены на утро для конкретной группы."""
    from db.crud import get_lessons_for_day, get_replacements_for_date_and_group

    if today_date.weekday() >= 5:
        return None

    grp = group_name or GROUP_NAME
    parity_code, _ = get_week_parity(today_date)
    weekday = today_date.weekday()

    db_pairs = await get_lessons_for_day(grp, weekday, parity_code)
    db_reps = await get_replacements_for_date_and_group(today_date, grp)

    if not db_pairs and grp == GROUP_NAME:
        return format_morning_alert(today_date, group_name=grp, custom_replacements=db_reps)

    return format_morning_alert(
        today_date,
        group_name=grp,
        custom_pairs=db_pairs,
        custom_replacements=db_reps
    )


async def get_formatted_replacements_summary(group_name: str | None = None) -> str:
    """
    Форматирует актуальные замены из SQLite БД для группы или всего колледжа.
    Поддерживает числитель/знаменатель и время звонков по курсу.
    """
    from db.crud import get_group_replacements, get_all_active_replacements
    from config import BOT_TZ
    from datetime import datetime

    grp = group_name or GROUP_NAME
    course = get_course_from_group_name(grp)
    bell_sched = get_bell_schedule(course)
    today = datetime.now(BOT_TZ).date()

    # Сначала ищем замены для конкретной группы
    db_reps = await get_group_replacements(grp, since_date=today)

    if not db_reps:
        all_reps = await get_all_active_replacements(since_date=today)
        if not all_reps:
            return (
                f"✨ <b>Актуальные замены и отмены пар ({grp}):</b>\n\n"
                "🎉 <b>На ближайшие дни изменений нет!</b>\n"
                "Все занятия проводятся по основному графику учебного плана."
            )
        affected_grps = sorted(list(set(r.group_name for r in all_reps if r.group_name)))
        grps_preview = ", ".join(affected_grps[:8])
        if len(affected_grps) > 8:
            grps_preview += f" и ещё {len(affected_grps) - 8}"
        return (
            f"✨ <b>Актуальные замены и отмены пар ({grp}):</b>\n\n"
            f"🎉 <b>У группы {grp} на ближайшие дни замен нет!</b>\n"
            "Все занятия проводятся по стандартному расписанию.\n\n"
            f"ℹ️ <i>Опубликованы изменения для других групп:</i>\n<code>{grps_preview}</code>"
        )

    by_date: dict[date, list] = {}
    for r in db_reps:
        d = r.date if isinstance(r.date, date) else date.fromisoformat(str(r.date))
        by_date.setdefault(d, []).append(r)

    lines = [
        f"⚠️ <b>Актуальные изменения в расписании ({grp}):</b>",
        f"👥 Курс: <b>{course}</b> · Расписание звонков адаптировано",
        "──────────────────────"
    ]

    for d in sorted(by_date.keys()):
        _, parity_name = get_week_parity(d)
        weekday_name = DAYS_RU[d.weekday()]
        date_str = f"{d.day} {MONTHS_RU[d.month]} {d.year}"
        lines.append(f"\n📅 <b>{weekday_name}, {date_str}</b> · {parity_name}:")

        for r in sorted(by_date[d], key=lambda x: x.pair_num):
            p_num = r.pair_num
            t_info = bell_sched.get(p_num, {})
            t_range = t_info.get("range", "") if isinstance(t_info, dict) else str(t_info)

            subj = html.escape(r.subject or r.raw_text or "Замена")
            room = html.escape(r.room or "—")
            teacher = html.escape(r.teacher or "—")

            if r.action_type == "cancel":
                lines.append(
                    f"<blockquote>"
                    f"❌ <b>{p_num} пара ({t_range}): <s>ОТМЕНЕНА</s></b>\n"
                    f"📚 <i>{subj}</i>"
                    f"</blockquote>"
                )
            else:
                lines.append(
                    f"<blockquote>"
                    f"🔄 <b>{p_num} пара ({t_range}): ЗАМЕНА</b>\n"
                    f"📚 <b>{subj}</b>\n"
                    f"📍 Кабинет: <code>{room}</code> · 👨‍🏫 <i>{teacher}</i>"
                    f"</blockquote>"
                )

    return "\n".join(lines)
