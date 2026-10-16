import html
import os
import re
from datetime import datetime, date, timedelta, time
from zoneinfo import ZoneInfo
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from config import BOT_TZ, ANCHOR_DATE, ANCHOR_PARITY
from parity import get_week_parity
from schedule_data import (
    SCHEDULE,
    BELL_SCHEDULE,
    BELL_TIMES,
    DAYS_RU,
    GROUP_NAME,
    get_course_from_group_name,
    get_bell_schedule,
    get_bell_times,
    get_course_lunch_info,
)
from replacements import get_replacements_for_date

def get_progress_bar(percentage: float, length: int = 10) -> str:
    """Генерирует аккуратный визуальный прогресс-бар."""
    filled = int(round(length * (percentage / 100.0)))
    filled = max(0, min(length, filled))
    return "▓" * filled + "░" * (length - filled)


def get_now_status(
    now_dt: datetime | None = None,
    group_name: str | None = None,
    custom_pairs: dict[int, dict] | None = None
) -> str:
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
    target_group = group_name or GROUP_NAME
    course = get_course_from_group_name(target_group)
    bell_sched = get_bell_schedule(course)
    bell_times = get_bell_times(course)
    lunch_info = get_course_lunch_info(course)

    header = (
        f"⚡️ <b>Статус занятий прямо сейчас</b>\n"
        f"🕒 Время: <b>{curr_time_str}</b> · {day_name}\n"
        f"🏷 Неделя: <b>{parity_name}</b>\n"
        f"👥 Группа: <code>{target_group}</code> <i>({course} курс)</i>\n"
        "──────────────────────\n"
    )

    if weekday >= 5:
        return (
            f"{header}"
            "🎉 <b>Сегодня выходной день!</b>\n"
            "Занятий нет, отличного отдыха и перезагрузки 🏖️\n\n"
            "👉 Нажмите <b>«🔜 Завтра»</b> или <b>«🗓 Текущая неделя»</b> для расписания."
        )

    if custom_pairs is not None:
        today_pairs = custom_pairs
    else:
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
            f"🎉 <b>Сегодня у группы {target_group} нет пар!</b> Свободный день ☕️"
        )

    pair_nums = sorted(today_pairs.keys())
    
    # Временные интервалы пар в минутах для данного курса
    intervals = {}
    for num in [1, 2, 3, 4]:
        start_s, end_s = bell_times[num]
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

    today_reps = get_replacements_for_date(now_dt.date())

    # Проверяем, идёт ли сейчас пара
    for num, (start_m, end_m, start_s, end_s) in intervals.items():
        if start_m <= curr_minutes < end_m:
            rep = today_reps.get(num)
            
            # Если пара отменена
            if rep and rep.get("type") == "cancel":
                next_pairs = [n for n in pair_nums if n > num and (n not in today_reps or today_reps[n].get("type") != "cancel")]
                next_str = ""
                if next_pairs:
                    nxt = next_pairs[0]
                    nxt_info = today_pairs.get(nxt)
                    if nxt_info:
                        next_str = f"\n🔜 <b>Следующая активная пара:</b> №{nxt} в {intervals[nxt][2]} (каб. <code>{html.escape(nxt_info['room'])}</code>)"
                return (
                    f"{header}"
                    f"🚫 <b>СЕЙЧАС ВРЕМЯ {num}-Й ПАРЫ, НО ОНА ОТМЕНЕНА!</b>\n"
                    f"<blockquote>"
                    f"⏰ <b>{start_s} — {end_s}</b>\n"
                    f"❌ <b>Пара отменена:</b> <i>{html.escape(rep.get('text', 'Отмена'))}</i>\n"
                    f"🎉 Свободное время до следующей пары!"
                    f"</blockquote>"
                    f"{next_str}"
                )
            
            # Если пара заменена
            if rep and rep.get("type") == "replace":
                elapsed = curr_minutes - start_m
                total = end_m - start_m
                pct = (elapsed / total) * 100
                rem = end_m - curr_minutes
                bar = get_progress_bar(pct)
                orig_subj = html.escape(today_pairs[num]['subject']) if num in today_pairs else ""
                orig_note = f"\n▫️ <i>(по плану: {orig_subj})</i>" if orig_subj else ""
                
                next_pairs = [n for n in pair_nums if n > num]
                next_str = ""
                if next_pairs:
                    nxt = next_pairs[0]
                    nxt_info = today_pairs.get(nxt)
                    if nxt_info:
                        next_str = (
                            f"\n🔜 <b>Следующая пара (№{nxt}):</b> в {intervals[nxt][2]}\n"
                            f"   ▫️ <b>{html.escape(nxt_info['subject'])}</b> (каб. <code>{html.escape(nxt_info['room'])}</code>)"
                        )
                return (
                    f"{header}"
                    f"⚠️ <b>СЕЙЧАС ИДЁТ {num}-Я ПАРА (ЗАМЕНА)</b>\n"
                    f"<blockquote>"
                    f"⏰ <b>{start_s} — {end_s}</b>\n"
                    f"📚 <b>{html.escape(rep.get('text', ''))}</b>{orig_note}\n"
                    f"⏱ <i>{bell_sched[num]['breakdown']}</i>\n\n"
                    f"⏳ До звонка: <b>{rem} мин</b> · Прогресс: {int(pct)}%\n"
                    f"<code>{bar}</code>"
                    f"</blockquote>"
                    f"{next_str}"
                )

            if num in today_pairs:
                pair_info = today_pairs[num]
                # Для 2 курса во 2-й паре перерыв — это 30-минутный обед (11:30–12:00)
                is_lunch_break = (course == 2 and num == 2)
                break_duration = 30 if is_lunch_break else 5
                break_start_m = start_m + 45
                break_end_m = break_start_m + break_duration
                break_start_s = f"{break_start_m // 60:02d}:{break_start_m % 60:02d}"
                break_end_s = f"{break_end_m // 60:02d}:{break_end_m % 60:02d}"
                
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

                # Фаза 1: 1-я половина пары (до звонка на перерыв/обед)
                if curr_minutes < break_start_m:
                    half_elapsed = curr_minutes - start_m
                    half_rem = break_start_m - curr_minutes
                    half_pct = (half_elapsed / 45) * 100
                    bar = get_progress_bar(half_pct)
                    break_call = "на обед" if is_lunch_break else "на пятиминутку"
                    break_desc = "30-минутный обед" if is_lunch_break else "5-минутный перерыв"
                    return (
                        f"{header}"
                        f"🟢 <b>СЕЙЧАС ИДЁТ {num}-Я ПАРА (1-я половина)</b>\n"
                        f"<blockquote>"
                        f"⏰ <b>{start_s} — {break_start_s}</b> (пара: {start_s} — {end_s})\n"
                        f"📚 <b>{html.escape(pair_info['subject'])}</b>\n"
                        f"📍 Кабинет: <code>{html.escape(pair_info['room'])}</code> · 👨‍🏫 <i>{html.escape(pair_info['teacher'])}</i>\n"
                        f"⏱ <i>{bell_sched[num]['breakdown']}</i>\n\n"
                        f"🔔 <b>Следующий звонок:</b> {break_call} в <b>{break_start_s}</b>\n"
                        f"⏳ До звонка: <b>{half_rem} мин</b> · Прогресс: {int(half_pct)}%\n"
                        f"<code>{bar}</code>\n\n"
                        f"☕️ <i>Затем {break_desc} ({break_start_s} — {break_end_s})</i>"
                        f"</blockquote>"
                        f"{next_str}"
                    )

                # Фаза 2: Перерыв/обед внутри пары
                elif curr_minutes < break_end_m:
                    break_elapsed = curr_minutes - break_start_m
                    break_rem = break_end_m - curr_minutes
                    break_pct = (break_elapsed / break_duration) * 100
                    bar = get_progress_bar(break_pct)
                    if is_lunch_break:
                        title = "🍽 <b>СЕЙЧАС ОБЕДЕННЫЙ ПЕРЕРЫВ (30 минут) · 2-я пара</b>"
                        label = "Обед внутри пары:"
                    else:
                        title = f"☕️ <b>СЕЙЧАС ПЯТИМИНУТКА · {num}-я пара</b>"
                        label = "Перерыв внутри пары:"

                    return (
                        f"{header}"
                        f"{title}\n"
                        f"<blockquote>"
                        f"⏱ <b>{label}</b> <code>{break_start_s} — {break_end_s}</code> ({break_duration} минут)\n"
                        f"📚 <b>{html.escape(pair_info['subject'])}</b>\n"
                        f"📍 Кабинет: <code>{html.escape(pair_info['room'])}</code> · 👨‍🏫 <i>{html.escape(pair_info['teacher'])}</i>\n\n"
                        f"🔔 <b>Следующий звонок:</b> на 2-ю половину пары в <b>{break_end_s}</b>\n"
                        f"⏳ До звонка: <b>{break_rem} мин</b>\n"
                        f"<code>{bar}</code>\n\n"
                        f"🔔 <i>2-я половина пары начнётся в {break_end_s} (до {end_s})</i>"
                        f"</blockquote>"
                        f"{next_str}"
                    )

                # Фаза 3: 2-я половина пары
                else:
                    half_elapsed = curr_minutes - break_end_m
                    half_rem = end_m - curr_minutes
                    half_pct = (half_elapsed / 45) * 100
                    bar = get_progress_bar(half_pct)

                    if num == 2:
                        if course in (3, 4):
                            bell_dest = f"на обед в <b>{end_s}</b>"
                        else:
                            bell_dest = f"на перемену в <b>{end_s}</b>"
                    elif num == 4 or num == last_pair_num:
                        bell_dest = f"с занятий в <b>{end_s}</b> (конец пар 🎉)"
                    else:
                        bell_dest = f"на перемену в <b>{end_s}</b>"

                    return (
                        f"{header}"
                        f"🟢 <b>СЕЙЧАС ИДЁТ {num}-Я ПАРА (2-я половина)</b>\n"
                        f"<blockquote>"
                        f"⏰ <b>{break_end_s} — {end_s}</b> (пара: {start_s} — {end_s})\n"
                        f"📚 <b>{html.escape(pair_info['subject'])}</b>\n"
                        f"📍 Кабинет: <code>{html.escape(pair_info['room'])}</code> · 👨‍🏫 <i>{html.escape(pair_info['teacher'])}</i>\n"
                        f"⏱ <i>{bell_sched[num]['breakdown']}</i>\n\n"
                        f"🔔 <b>Следующий звонок:</b> {bell_dest}\n"
                        f"⏳ До звонка: <b>{half_rem} мин</b> · Прогресс: {int(half_pct)}%\n"
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

    # Обед вне пар (для 1 курса: 10:35 - 11:10; для 3 и 4 курса: 12:20 - 12:55)
    if course in (1, 3, 4):
        l_sh, l_sm = map(int, lunch_info["start"].split(":"))
        l_eh, l_em = map(int, lunch_info["end"].split(":"))
        lunch_start = l_sh * 60 + l_sm
        lunch_end = l_eh * 60 + l_em
        if lunch_start <= curr_minutes < lunch_end:
            rem_lunch = lunch_end - curr_minutes
            target_next_pair = 2 if course == 1 else 3
            next_pair = today_pairs.get(target_next_pair)
            next_txt = ""
            if next_pair:
                next_txt = (
                    f"\n<blockquote>"
                    f"{target_next_pair}️⃣ пара: <b>{intervals[target_next_pair][2]} — {intervals[target_next_pair][3]}</b>\n"
                    f"📚 <b>{html.escape(next_pair['subject'])}</b>\n"
                    f"📍 Кабинет: <code>{html.escape(next_pair['room'])}</code> · 👨‍🏫 <i>{html.escape(next_pair['teacher'])}</i>"
                    f"</blockquote>"
                )
            return (
                f"{header}"
                f"🍽 <b>СЕЙЧАС ОБЕДЕННЫЙ ПЕРЕРЫВ ({lunch_info['start']} — {lunch_info['end']})</b>\n"
                f"⏳ До начала {target_next_pair}-й пары осталось: <b>{rem_lunch} мин</b>\n"
                f"Приятного аппетита! 🥪"
                f"{next_txt}"
            )

    # Обычные перемены (10 минут)
    for num in [1, 2, 3]:
        if num in intervals and (num + 1) in intervals:
            prev_end = intervals[num][1]
            next_start = intervals[num + 1][0]
            if prev_end < next_start and prev_end <= curr_minutes < next_start:
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


async def get_formatted_now_status(group_name: str | None = None, now_dt: datetime | None = None) -> str:
    """Загружает расписание группы из БД и определяет статус занятий прямо сейчас."""
    from db.crud import get_lessons_for_day, get_replacements_for_date_and_group

    target_group = group_name or GROUP_NAME
    if now_dt is None:
        now_dt = datetime.now(BOT_TZ)
    weekday = now_dt.weekday()
    parity_code, _ = get_week_parity(now_dt.date())

    db_pairs = await get_lessons_for_day(target_group, weekday, parity_code)
    db_reps = await get_replacements_for_date_and_group(now_dt.date(), target_group)

    if not db_pairs and target_group == GROUP_NAME:
        return get_now_status(now_dt=now_dt, group_name=target_group)

    actual_pairs = {}
    for num, lesson_data in db_pairs.items():
        rep = db_reps.get(num)
        if rep and rep.get("type") == "cancel":
            continue
        elif rep and rep.get("type") == "replace":
            actual_pairs[num] = {
                "subject": rep.get("subject") or rep.get("text") or lesson_data["subject"],
                "room": rep.get("room") or lesson_data["room"],
                "teacher": rep.get("teacher") or lesson_data["teacher"]
            }
        else:
            actual_pairs[num] = lesson_data

    return get_now_status(now_dt=now_dt, group_name=target_group, custom_pairs=actual_pairs)



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


def get_moodle_info_text() -> str:
    """Возвращает информацию о СДО Moodle, портале и учебных материалах группы."""
    return (
        "📁 <b>СДО Moodle и учебные материалы · 9ПО-43к</b>\n"
        "──────────────────────\n"
        "<blockquote>"
        "🎓 <b>Портал СДО:</b>\n"
        "▫️ Ссылка: <a href=\"https://moodle.astanait.edu.kz\">moodle.astanait.edu.kz</a>\n"
        "▫️ В СДО публикуются задания, практические (ПЗ), лабораторные (ЛР) и лекционные материалы.\n\n"
        "📄 <b>Макет титульного листа (.docx):</b>\n"
        "▫️ Официальный шаблон титульника для отчётов по практическим и лабораторным работам 4 курса.\n"
        "▫️ Утверждён стандартами кафедры AITU.\n\n"
        "📚 <b>Материалы группы:</b>\n"
        "▫️ Методические указания и вопросы к зачётам/экзаменам."
        "</blockquote>\n"
        "👇 <i>Нажмите кнопку ниже, чтобы скачать макет титульного листа (.docx):</i>"
    )

