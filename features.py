import html
import os
import re
from datetime import datetime, date, timedelta, time
from zoneinfo import ZoneInfo
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from config import BOT_TZ, ANCHOR_DATE, ANCHOR_PARITY
from parity import get_week_parity
from schedule_data import SCHEDULE, BELL_SCHEDULE, BELL_TIMES, DAYS_RU, GROUP_NAME

def get_progress_bar(percentage: float, length: int = 10) -> str:
    """Генерирует аккуратный визуальный прогресс-бар."""
    filled = int(round(length * (percentage / 100.0)))
    filled = max(0, min(length, filled))
    return "▓" * filled + "░" * (length - filled)


def get_now_status(now_dt: datetime | None = None) -> str:
    """
    Определяет текущий статус занятий:
    - какая пара идёт прямо сейчас (с прогресс-баром и оставшимися минутами)
    - перемена или обед
    - до начала занятий / после окончания занятий
    """
    if now_dt is None:
        now_dt = datetime.now(BOT_TZ)
        
    weekday = now_dt.weekday()
    day_name = DAYS_RU[weekday]
    curr_time_str = now_dt.strftime("%H:%M")
    curr_minutes = now_dt.hour * 60 + now_dt.minute
    parity_code, parity_name = get_week_parity(now_dt.date())

    header = (
        f"⚡️ <b>Статус занятий прямо сейчас</b>\n"
        f"🕒 Время: <b>{curr_time_str}</b> · {day_name}\n"
        f"🏷 Неделя: <b>{parity_name}</b>\n"
        "──────────────────────\n"
    )

    if weekday >= 5:
        return (
            f"{header}"
            "🎉 <b>Сегодня выходной день!</b>\n"
            "Занятий нет, отличного отдыха и перезагрузки 🏖️\n\n"
            "👉 Нажмите <b>«🔜 Завтра»</b> или <b>«🗓 Текущая неделя»</b> для расписания."
        )

    day_schedule = SCHEDULE.get(weekday, {})
    # Собираем актуальные пары на сегодня
    today_pairs = {}
    for num in sorted(day_schedule.keys()):
        pair = day_schedule[num]
        if pair.get("split"):
            info = pair["chislitel"] if parity_code == "chislitel" else pair["znamenatel"]
        else:
            info = pair
        if info:
            today_pairs[num] = info

    if not today_pairs:
        return (
            f"{header}"
            "🎉 <b>Сегодня у группы нет пар!</b> Свободный день ☕️"
        )

    pair_nums = sorted(today_pairs.keys())
    
    # Временные интервалы пар в минутах
    intervals = {}
    for num in [1, 2, 3, 4]:
        start_s, end_s = BELL_TIMES[num]
        sh, sm = map(int, start_s.split(":"))
        eh, em = map(int, end_s.split(":"))
        intervals[num] = (sh * 60 + sm, eh * 60 + em, start_s, end_s)

    first_pair_num = pair_nums[0]
    last_pair_num = pair_nums[-1]
    first_start_min = intervals[first_pair_num][0]
    last_end_min = intervals[last_pair_num][1]

    # До начала первой пары
    if curr_minutes < first_start_min:
        diff = first_start_min - curr_minutes
        h_rem, m_rem = divmod(diff, 60)
        rem_str = f"{h_rem} ч {m_rem} мин" if h_rem > 0 else f"{m_rem} мин"
        pair_info = today_pairs[first_pair_num]
        return (
            f"{header}"
            f"🌅 <b>Учёба ещё не началась.</b>\n"
            f"⏳ До первой пары осталось: <b>{rem_str}</b>\n\n"
            f"<blockquote>"
            f"🔔 <b>Первая пара (№{first_pair_num}):</b> {intervals[first_pair_num][2]} — {intervals[first_pair_num][3]}\n"
            f"📚 <b>{html.escape(pair_info['subject'])}</b>\n"
            f"📍 Кабинет: <code>{html.escape(pair_info['room'])}</code> · 👨‍🏫 <i>{html.escape(pair_info['teacher'])}</i>"
            f"</blockquote>"
        )

    # После окончания всех пар
    if curr_minutes >= last_end_min:
        return (
            f"{header}"
            f"✨ <b>Все пары на сегодня закончились!</b>\n"
            f"🎉 Учебный день завершён, отличного вечера!\n\n"
            f"👉 Нажмите <b>«🔜 Завтра»</b>, чтобы посмотреть расписание на наступающий день."
        )

    # Проверяем, идёт ли сейчас пара
    for num, (start_m, end_m, start_s, end_s) in intervals.items():
        if start_m <= curr_minutes < end_m:
            if num in today_pairs:
                pair_info = today_pairs[num]
                elapsed = curr_minutes - start_m
                total = end_m - start_m
                pct = (elapsed / total) * 100
                rem = end_m - curr_minutes
                bar = get_progress_bar(pct)
                
                # Следующая пара
                next_pairs = [n for n in pair_nums if n > num]
                next_str = ""
                if next_pairs:
                    nxt = next_pairs[0]
                    nxt_info = today_pairs[nxt]
                    next_str = (
                        f"\n🔜 <b>Следующая пара (№{nxt}):</b> в {intervals[nxt][2]}\n"
                        f"   ▫️ <b>{html.escape(nxt_info['subject'])}</b> (каб. <code>{html.escape(nxt_info['room'])}</code>)"
                    )
                else:
                    next_str = "\n✨ <i>Это последняя пара на сегодня!</i>"

                return (
                    f"{header}"
                    f"🟢 <b>СЕЙЧАС ИДЁТ {num}-Я ПАРА</b>\n"
                    f"<blockquote>"
                    f"⏰ <b>{start_s} — {end_s}</b>\n"
                    f"📚 <b>{html.escape(pair_info['subject'])}</b>\n"
                    f"📍 Кабинет: <code>{html.escape(pair_info['room'])}</code> · 👨‍🏫 <i>{html.escape(pair_info['teacher'])}</i>\n"
                    f"⏱ <i>{BELL_SCHEDULE[num]['breakdown']}</i>\n\n"
                    f"⏳ До звонка: <b>{rem} мин</b> · Прогресс: {int(pct)}%\n"
                    f"<code>{bar}</code>"
                    f"</blockquote>"
                    f"{next_str}"
                )
            else:
                next_pairs = [n for n in pair_nums if n > num]
                nxt_str = ""
                if next_pairs:
                    nxt = next_pairs[0]
                    nxt_info = today_pairs[nxt]
                    nxt_str = f"\n🔜 Следующая пара: №{nxt} в {intervals[nxt][2]} (каб. <code>{html.escape(nxt_info['room'])}</code>)"
                return (
                    f"{header}"
                    f"☕️ <b>Сейчас окно (пары №{num} нет)!</b>\n"
                    f"Свободное время до {end_s}."
                    f"{nxt_str}"
                )

    # Обед: 12:20 - 12:55
    lunch_start = 12 * 60 + 20
    lunch_end = 12 * 60 + 55
    if lunch_start <= curr_minutes < lunch_end:
        rem_lunch = lunch_end - curr_minutes
        next_pair = today_pairs.get(3)
        next_txt = ""
        if next_pair:
            next_txt = (
                f"\n<blockquote>"
                f"3️⃣ пара: <b>12:55 — 14:30</b>\n"
                f"📚 <b>{html.escape(next_pair['subject'])}</b>\n"
                f"📍 Кабинет: <code>{html.escape(next_pair['room'])}</code> · 👨‍🏫 <i>{html.escape(next_pair['teacher'])}</i>"
                f"</blockquote>"
            )
        return (
            f"{header}"
            f"🍽 <b>СЕЙЧАС ОБЕДЕННЫЙ ПЕРЕРЫВ (12:20 — 12:55)</b>\n"
            f"⏳ До начала 3-й пары осталось: <b>{rem_lunch} мин</b>\n"
            f"Приятного аппетита! 🥪"
            f"{next_txt}"
        )

    # Обычные перемены (10 минут)
    for num in [1, 3]:
        prev_end = intervals[num][1]
        next_start = intervals[num + 1][0]
        if prev_end <= curr_minutes < next_start:
            rem_break = next_start - curr_minutes
            nxt_num = num + 1
            nxt_pair = today_pairs.get(nxt_num)
            nxt_txt = ""
            if nxt_pair:
                nxt_txt = (
                    f"\n<blockquote>"
                    f"{nxt_num}️⃣ пара: <b>{intervals[nxt_num][2]} — {intervals[nxt_num][3]}</b>\n"
                    f"📚 <b>{html.escape(nxt_pair['subject'])}</b>\n"
                    f"📍 Кабинет: <code>{html.escape(nxt_pair['room'])}</code> · 👨‍🏫 <i>{html.escape(nxt_pair['teacher'])}</i>"
                    f"</blockquote>"
                )
            return (
                f"{header}"
                f"☕️ <b>СЕЙЧАС ПЕРЕМЕНА (10 минут)</b>\n"
                f"⏳ До {nxt_num}-й пары осталось: <b>{rem_break} мин</b> (начало в {intervals[nxt_num][2]})"
                f"{nxt_txt}"
            )

    return f"{header}Занятия на сегодня завершены."


# -------------------------------------------------------------
# База данных преподавателей
# -------------------------------------------------------------
def get_teachers_data() -> dict[str, dict]:
    """
    Собирает сводные данные по всем преподавателям из SCHEDULE.
    """
    teachers: dict[str, dict] = {}

    for day_idx in range(5):
        day_name = DAYS_RU[day_idx]
        pairs_map = SCHEDULE.get(day_idx, {})
        for pair_num, pair_val in pairs_map.items():
            variants = []
            if pair_val.get("split"):
                if pair_val.get("chislitel"):
                    variants.append((pair_val["chislitel"], "Числитель 🔺"))
                if pair_val.get("znamenatel"):
                    variants.append((pair_val["znamenatel"], "Знаменатель 🔻"))
            else:
                variants.append((pair_val, "Каждую неделю"))

            for info, p_label in variants:
                t_name = info.get("teacher", "Не указан").strip()
                if not t_name or t_name == "—":
                    continue

                if t_name not in teachers:
                    teachers[t_name] = {
                        "subjects": set(),
                        "rooms": set(),
                        "lessons": []
                    }

                subj = info.get("subject", "Не указан")
                room = info.get("room", "—")
                teachers[t_name]["subjects"].add(subj)
                teachers[t_name]["rooms"].add(room)
                teachers[t_name]["lessons"].append({
                    "day": day_name,
                    "day_idx": day_idx,
                    "pair_num": pair_num,
                    "time": BELL_SCHEDULE[pair_num]["range"],
                    "parity": p_label,
                    "room": room,
                    "subject": subj
                })

    return teachers


def get_teachers_catalog_text() -> str:
    """Генерирует список всех преподавателей группы."""
    teachers = get_teachers_data()
    lines = [
        "👨‍🏫 <b>Преподаватели группы 9ПО-43к:</b>\n"
        "──────────────────────\n"
    ]
    for name, data in sorted(teachers.items()):
        subjects_str = ", ".join(f"<i>{html.escape(s)}</i>" for s in sorted(data["subjects"]))
        rooms_str = ", ".join(f"<code>{html.escape(r)}</code>" for r in sorted(data["rooms"]))
        lines.append(
            f"▫️ <b>{html.escape(name)}</b>\n"
            f"   📚 {subjects_str}\n"
            f"   📍 Каб: {rooms_str}\n"
        )
    lines.append("👇 <i>Нажмите на преподавателя ниже для подробного графика:</i>")
    return "\n".join(lines)


def get_teachers_inline_keyboard() -> InlineKeyboardMarkup:
    """Генерирует инлайн-кнопки со списком преподавателей."""
    teachers = sorted(get_teachers_data().keys())
    buttons = []
    # По 1 кнопке в ряд для комфортного чтения полного ФИО
    for i, teacher in enumerate(teachers):
        buttons.append([InlineKeyboardButton(text=f"👨‍🏫 {teacher}", callback_data=f"teacher_{i}")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_teacher_detail_text(teacher_idx: int) -> str:
    """Карточка конкретного преподавателя."""
    teachers_list = sorted(get_teachers_data().keys())
    if teacher_idx < 0 or teacher_idx >= len(teachers_list):
        return "Преподаватель не найден."

    name = teachers_list[teacher_idx]
    data = get_teachers_data()[name]

    lines = [
        f"👨‍🏫 <b>{html.escape(name)}</b>\n"
        f"👥 <b>Группа:</b> <code>{GROUP_NAME}</code>\n"
        "──────────────────────\n",
        f"📚 <b>Дисциплины:</b>\n" + "\n".join(f"• <i>{html.escape(s)}</i>" for s in sorted(data["subjects"])) + "\n",
        f"📍 <b>Кабинеты:</b> " + ", ".join(f"<code>{html.escape(r)}</code>" for r in sorted(data["rooms"])) + "\n",
        "🗓 <b>График пар у группы:</b>"
    ]

    # Сортируем пары по дню недели и номеру пары
    sorted_lessons = sorted(data["lessons"], key=lambda x: (x["day_idx"], x["pair_num"]))
    for item in sorted_lessons:
        lines.append(
            f"<blockquote>"
            f"📌 <b>{item['day']}</b> · {item['pair_num']} пара (<b>{item['time']}</b>)\n"
            f"📚 <b>{html.escape(item['subject'])}</b>\n"
            f"📍 Кабинет: <code>{html.escape(item['room'])}</code> · <i>{item['parity']}</i>"
            f"</blockquote>"
        )

    return "\n".join(lines)


# -------------------------------------------------------------
# Поиск по кабинетам
# -------------------------------------------------------------
def search_room_schedule(room_query: str) -> str:
    """Ищет все пары, проходящие в указанном кабинете."""
    clean_query = room_query.strip().lower()
    if not clean_query:
        return "Укажите номер кабинета, например: <code>/room 305</code>"

    found = []
    for day_idx in range(5):
        day_name = DAYS_RU[day_idx]
        pairs_map = SCHEDULE.get(day_idx, {})
        for pair_num, pair_val in pairs_map.items():
            variants = []
            if pair_val.get("split"):
                if pair_val.get("chislitel"):
                    variants.append((pair_val["chislitel"], "Числитель 🔺"))
                if pair_val.get("znamenatel"):
                    variants.append((pair_val["znamenatel"], "Знаменатель 🔻"))
            else:
                variants.append((pair_val, "Каждую неделю"))

            for info, p_label in variants:
                r = str(info.get("room", "")).strip().lower()
                if clean_query in r:
                    found.append({
                        "day": day_name,
                        "day_idx": day_idx,
                        "pair_num": pair_num,
                        "time": BELL_SCHEDULE[pair_num]["range"],
                        "parity": p_label,
                        "room": info.get("room"),
                        "subject": info.get("subject"),
                        "teacher": info.get("teacher")
                    })

    if not found:
        return (
            f"📍 <b>Поиск по кабинету:</b> <code>{html.escape(room_query)}</code>\n\n"
            f"Занятий в кабинете <code>{html.escape(room_query)}</code> у группы {GROUP_NAME} не найдено."
        )

    lines = [
        f"📍 <b>Расписание в кабинете:</b> <code>{html.escape(room_query.upper())}</code>\n"
        f"👥 <b>Группа:</b> <code>{GROUP_NAME}</code>\n"
        "──────────────────────\n"
    ]
    found = sorted(found, key=lambda x: (x["day_idx"], x["pair_num"]))
    for item in found:
        lines.append(
            f"<blockquote>"
            f"📌 <b>{item['day']}</b> · {item['pair_num']} пара (<b>{item['time']}</b>)\n"
            f"📚 <b>{html.escape(item['subject'])}</b>\n"
            f"👨‍🏫 Преподаватель: {html.escape(item['teacher'])} · <i>{item['parity']}</i>"
            f"</blockquote>"
        )
    return "\n".join(lines)


# -------------------------------------------------------------
# Генерация файла iCalendar (.ics) для Google / Apple Calendar
# -------------------------------------------------------------
def generate_ics_calendar(output_path: str = "assets/aitu_schedule_9po43k.ics") -> str:
    """
    Генерирует стандартный .ics файл для импорта расписания в календари
    смартфонов (Apple Calendar, Google Calendar, Outlook).
    Создает повторяющиеся события с расписанием звонков, числителем и знаменателем.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Опорный понедельник для числителя (например 2026-10-12)
    # Понедельник знаменателя = опорный понедельник + 7 дней
    base_monday = ANCHOR_DATE
    if ANCHOR_PARITY.lower() == "znamenatel":
        chislitel_monday = base_monday + timedelta(days=7)
        znamenatel_monday = base_monday
    else:
        chislitel_monday = base_monday
        znamenatel_monday = base_monday + timedelta(days=7)

    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AITU//9PO-43k Schedule Bot//RU",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Расписание 9ПО-43к (AITU)",
        "X-WR-TIMEZONE:Europe/Moscow"
    ]

    # Генерируем события
    event_id = 1
    for day_idx in range(5):  # Пн - Пт
        pairs_map = SCHEDULE.get(day_idx, {})
        for pair_num, pair_val in pairs_map.items():
            start_s, end_s = BELL_TIMES[pair_num]
            sh, sm = map(int, start_s.split(":"))
            eh, em = map(int, end_s.split(":"))

            if pair_val.get("split"):
                # Числитель
                if pair_val.get("chislitel"):
                    info = pair_val["chislitel"]
                    start_date = chislitel_monday + timedelta(days=day_idx)
                    dtstart = f"{start_date.strftime('%Y%m%d')}T{sh:02d}{sm:02d}00"
                    dtend = f"{start_date.strftime('%Y%m%d')}T{eh:02d}{em:02d}00"
                    summary = f"[{pair_num}] {info['subject']} (каб. {info['room']})"
                    desc = f"Пара №{pair_num}\\nПреподаватель: {info['teacher']}\\nКабинет: {info['room']}\\nНеделя: Числитель"
                    loc = f"Кабинет {info['room']}, AITU"

                    ics_lines.extend([
                        "BEGIN:VEVENT",
                        f"UID:aitu-9po43k-{event_id}@aitubot",
                        f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}",
                        f"DTSTART;TZID=Europe/Moscow:{dtstart}",
                        f"DTEND;TZID=Europe/Moscow:{dtend}",
                        "RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20270701T000000Z",
                        f"SUMMARY:{summary}",
                        f"LOCATION:{loc}",
                        f"DESCRIPTION:{desc}",
                        "BEGIN:VALARM",
                        "TRIGGER:-PT15M",
                        "ACTION:DISPLAY",
                        "DESCRIPTION:Напоминание о паре через 15 минут",
                        "END:VALARM",
                        "END:VEVENT"
                    ])
                    event_id += 1

                # Знаменатель
                if pair_val.get("znamenatel"):
                    info = pair_val["znamenatel"]
                    start_date = znamenatel_monday + timedelta(days=day_idx)
                    dtstart = f"{start_date.strftime('%Y%m%d')}T{sh:02d}{sm:02d}00"
                    dtend = f"{start_date.strftime('%Y%m%d')}T{eh:02d}{em:02d}00"
                    summary = f"[{pair_num}] {info['subject']} (каб. {info['room']})"
                    desc = f"Пара №{pair_num}\\nПреподаватель: {info['teacher']}\\nКабинет: {info['room']}\\nНеделя: Знаменатель"
                    loc = f"Кабинет {info['room']}, AITU"

                    ics_lines.extend([
                        "BEGIN:VEVENT",
                        f"UID:aitu-9po43k-{event_id}@aitubot",
                        f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}",
                        f"DTSTART;TZID=Europe/Moscow:{dtstart}",
                        f"DTEND;TZID=Europe/Moscow:{dtend}",
                        "RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20270701T000000Z",
                        f"SUMMARY:{summary}",
                        f"LOCATION:{loc}",
                        f"DESCRIPTION:{desc}",
                        "BEGIN:VALARM",
                        "TRIGGER:-PT15M",
                        "ACTION:DISPLAY",
                        "DESCRIPTION:Напоминание о паре через 15 минут",
                        "END:VALARM",
                        "END:VEVENT"
                    ])
                    event_id += 1
            else:
                # Каждую неделю
                info = pair_val
                start_date = base_monday + timedelta(days=day_idx)
                dtstart = f"{start_date.strftime('%Y%m%d')}T{sh:02d}{sm:02d}00"
                dtend = f"{start_date.strftime('%Y%m%d')}T{eh:02d}{em:02d}00"
                summary = f"[{pair_num}] {info['subject']} (каб. {info['room']})"
                desc = f"Пара №{pair_num}\\nПреподаватель: {info['teacher']}\\nКабинет: {info['room']}"
                loc = f"Кабинет {info['room']}, AITU"

                ics_lines.extend([
                    "BEGIN:VEVENT",
                    f"UID:aitu-9po43k-{event_id}@aitubot",
                    f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}",
                    f"DTSTART;TZID=Europe/Moscow:{dtstart}",
                    f"DTEND;TZID=Europe/Moscow:{dtend}",
                    "RRULE:FREQ=WEEKLY;INTERVAL=1;UNTIL=20270701T000000Z",
                    f"SUMMARY:{summary}",
                    f"LOCATION:{loc}",
                    f"DESCRIPTION:{desc}",
                    "BEGIN:VALARM",
                    "TRIGGER:-PT15M",
                    "ACTION:DISPLAY",
                    "DESCRIPTION:Напоминание о паре через 15 минут",
                    "END:VALARM",
                    "END:VEVENT"
                ])
                event_id += 1

    ics_lines.append("END:VCALENDAR")
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\r\n".join(ics_lines) + "\r\n")

    return output_path
