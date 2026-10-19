import os
import json
import html
import asyncio
import logging
from datetime import datetime
from aiogram import Bot, types
from aiogram.exceptions import TelegramForbiddenError, TelegramBadRequest

from config import BOT_TZ
from parity import get_week_parity
from schedule_data import (
    SCHEDULE,
    BELL_SCHEDULE,
    NUMBER_EMOJIS,
    DAYS_RU,
    GROUP_NAME,
    get_course_from_group_name,
    get_bell_schedule,
)
from replacements import get_replacements_for_date

logger = logging.getLogger(__name__)

SUBS_FILE = os.path.join(os.path.dirname(__file__), "subscribers.json")

def load_subscribers() -> set[int]:
    """Загружает список ID пользователей, подписанных на личные напоминания."""
    if not os.path.exists(SUBS_FILE):
        return set()
    try:
        with open(SUBS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            users = data.get("users", [])
            return set(int(u) for u in users if isinstance(u, (int, str)) and str(u).isdigit())
    except Exception as e:
        logger.error(f"Ошибка загрузки подписчиков из {SUBS_FILE}: {e}")
        return set()


def save_subscribers(subs: set[int]) -> bool:
    """Сохраняет список подписчиков в JSON."""
    try:
        with open(SUBS_FILE, "w", encoding="utf-8") as f:
            json.dump({"users": sorted(list(subs))}, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Ошибка сохранения подписчиков в {SUBS_FILE}: {e}")
        return False


def is_subscribed(user_id: int) -> bool:
    subs = load_subscribers()
    return user_id in subs


def toggle_subscription(user_id: int) -> bool:
    """
    Переключает статус подписки.
    Возвращает True, если пользователь подписался, и False, если отписался.
    """
    subs = load_subscribers()
    if user_id in subs:
        subs.remove(user_id)
        save_subscribers(subs)
        return False
    else:
        subs.add(user_id)
        save_subscribers(subs)
        return True


async def send_pair_reminder(bot: Bot, pair_num: int, target_courses: list[int] | None = None):
    """
    Рассылает личное напоминание за 10 минут до начала пары.
    Проверяет расписание КАЖДОЙ группы в БД и отправляет уведомления только тем студентам,
    у которых реально есть пара. Поддерживает фильтрацию по целевым курсам target_courses.
    Соблюдает лимиты Telegram API (asyncio.sleep).
    """
    from db.crud import get_users_for_notification, get_lessons_for_day, get_replacements_for_date_and_group, get_user

    now = datetime.now(BOT_TZ)
    today = now.date()
    weekday = today.weekday()
    if weekday >= 5:
        return  # Выходные дни

    parity_code, parity_name = get_week_parity(today)
    emoji_num = NUMBER_EMOJIS.get(pair_num, f"[{pair_num}]")

    # Получаем пользователей с включенным колокольчиком из БД
    db_users = await get_users_for_notification("remind_10min")
    user_map: dict[int, str] = {}
    for u in db_users:
        user_map[u.user_id] = u.group_name or GROUP_NAME

    # Для обратной совместимости добавляем из subscribers.json, если их нет в БД
    legacy_subs = load_subscribers()
    for uid in legacy_subs:
        if uid not in user_map:
            u_obj = await get_user(uid)
            user_map[uid] = u_obj.group_name if u_obj and u_obj.group_name else GROUP_NAME

    if not user_map:
        return

    # Кэшируем расписание групп на этот день
    group_cache: dict[str, dict] = {}
    success_count = 0
    dead_users = []

    for uid, grp in user_map.items():
        u_course = get_course_from_group_name(grp)
        if target_courses is not None and u_course not in target_courses:
            continue

        bell_sched = get_bell_schedule(u_course)
        time_info = bell_sched.get(pair_num, {})
        time_range = time_info.get("range", "") if isinstance(time_info, dict) else str(time_info)
        breakdown = time_info.get("breakdown", "") if isinstance(time_info, dict) else ""

        if grp not in group_cache:
            lessons = await get_lessons_for_day(grp, weekday, parity_code)
            reps = await get_replacements_for_date_and_group(today, grp)

            # Если для 9ПО-43к в БД пусто, берём из SCHEDULE
            if not lessons and grp == GROUP_NAME:
                day_pairs = SCHEDULE.get(weekday, {})
                pv = day_pairs.get(pair_num)
                if pv:
                    if pv.get("split"):
                        pinfo = pv["chislitel"] if parity_code == "chislitel" else pv["znamenatel"]
                    else:
                        pinfo = pv
                    if pinfo:
                        lessons[pair_num] = pinfo
                if not reps:
                    reps = get_replacements_for_date(today)

            group_cache[grp] = {"lessons": lessons, "reps": reps}

        grp_data = group_cache[grp]
        pair_val = grp_data["lessons"].get(pair_num)
        replacement = grp_data["reps"].get(pair_num)

        # Если пары нет и нет замены — студенту ничего не отправляем
        if not pair_val and not replacement:
            continue

        # 1. Пара отменена
        if replacement and replacement.get("type") == "cancel":
            reason = replacement.get("text") or replacement.get("subject") or "Занятие отменено"
            orig_subj = html.escape(pair_val["subject"]) if pair_val else ""
            msg_text = (
                f"🔔 <b>Личный колокольчик · {grp}</b>\n"
                f"──────────────────────\n"
                f"<blockquote>"
                f"❌ {emoji_num} <b>{time_range} — ПАРА ОТМЕНЕНА!</b>\n"
                + (f"📚 <s>{orig_subj}</s>\n" if orig_subj else "")
                + f"💡 <i>{html.escape(reason)}</i>\n"
                f"🎉 Можно отдохнуть или заняться своими делами!"
                f"</blockquote>"
            )
        # 2. Пара заменена
        elif replacement and replacement.get("type") == "replace":
            rep_subj = html.escape(replacement.get("subject") or replacement.get("text") or "Замена")
            rep_room = html.escape(replacement.get("room") or (pair_val.get("room", "—") if pair_val else "—"))
            rep_teacher = html.escape(replacement.get("teacher") or (pair_val.get("teacher", "—") if pair_val else "—"))
            orig_note = f"\n▫️ <i>(по плану было: {html.escape(pair_val['subject'])})</i>" if pair_val else ""
            breakdown_line = f"\n⏱ <i>{breakdown}</i>" if breakdown else ""
            msg_text = (
                f"🔔 <b>Через 10 минут начнётся {pair_num}-я пара (ЗАМЕНА)!</b>\n"
                f"──────────────────────\n"
                f"<blockquote>"
                f"⚠️ {emoji_num} <b>{time_range}</b> · <b>ЗАМЕНА В РАСПИСАНИИ</b>\n"
                f"📚 <b>{rep_subj}</b>\n"
                f"📍 Кабинет: <code>{rep_room}</code> · 👨‍🏫 <i>{rep_teacher}</i>\n"
                f"👥 Группа: <code>{grp}</code>"
                f"{orig_note}"
                f"{breakdown_line}"
                f"</blockquote>\n"
                f"🏃‍♂️ <i>Успейте занять места в аудитории!</i>"
            )
        # 3. Обычная пара
        elif pair_val:
            subject = html.escape(str(pair_val.get("subject", "Не указан")))
            room = html.escape(str(pair_val.get("room", "—")))
            teacher = html.escape(str(pair_val.get("teacher", "—")))
            breakdown_line = f"\n⏱ <i>{breakdown}</i>" if breakdown else ""
            msg_text = (
                f"🔔 <b>Через 10 минут начнётся {pair_num}-я пара!</b>\n"
                f"──────────────────────\n"
                f"<blockquote>"
                f"{emoji_num} <b>{time_range}</b>\n"
                f"📚 <b>{subject}</b>\n"
                f"📍 Кабинет: <code>{room}</code> · 👨‍🏫 <i>{teacher}</i>\n"
                f"👥 Группа: <code>{grp}</code>"
                f"{breakdown_line}"
                f"</blockquote>\n"
                f"🏃‍♂️ <i>Пора в аудиторию! Успешной пары!</i>"
            )
        else:
            continue

        from services.broadcaster import safe_send_message
        sent = await safe_send_message(bot, uid, msg_text)
        if sent:
            success_count += 1
        else:
            dead_users.append(uid)
        await asyncio.sleep(0.05)

    if dead_users:
        legacy_subs.difference_update(dead_users)
        save_subscribers(legacy_subs)

    # 4. Отправка 10-минутного напоминания в привязанные беседы (если включен тумблер notify_10min)
    try:
        from db.crud import get_all_chat_bindings
        from services.broadcaster import safe_send_message
        bindings = await get_all_chat_bindings()
        for b in bindings:
            if not getattr(b, "notify_10min", True):
                continue

            b_grp = b.group_name or GROUP_NAME
            b_course = get_course_from_group_name(b_grp)
            if target_courses is not None and b_course not in target_courses:
                continue

            if b_grp not in group_cache:
                b_lessons = await get_lessons_for_day(b_grp, weekday, parity_code)
                b_reps = await get_replacements_for_date_and_group(today, b_grp)
                group_cache[b_grp] = {"lessons": b_lessons, "reps": b_reps}

            grp_d = group_cache[b_grp]
            b_pair = grp_d["lessons"].get(pair_num)
            b_rep = grp_d["reps"].get(pair_num)

            if not b_pair and not b_rep:
                continue

            b_sched = get_bell_schedule(b_course)
            b_info = b_sched.get(pair_num, {})
            b_trange = b_info.get("range", "") if isinstance(b_info, dict) else str(b_info)
            b_breakdown = b_info.get("breakdown", "") if isinstance(b_info, dict) else ""
            b_bd_line = f"\n⏱ <i>{b_breakdown}</i>" if b_breakdown else ""

            if b_rep and b_rep.get("type") == "cancel":
                b_reason = b_rep.get("text") or b_rep.get("subject") or "Занятие отменено"
                c_msg = (
                    f"🔔 <b>Колокольчик беседы · {b_grp}</b>\n"
                    f"──────────────────────\n"
                    f"<blockquote>"
                    f"❌ {emoji_num} <b>{b_trange} — ПАРА ОТМЕНЕНА!</b>\n"
                    f"💡 <i>{html.escape(b_reason)}</i>\n"
                    f"🎉 Можно отдохнуть или заняться своими делами!"
                    f"</blockquote>"
                )
            elif b_rep and b_rep.get("type") == "replace":
                r_subj = html.escape(b_rep.get("subject") or b_rep.get("text") or "Замена")
                r_room = html.escape(b_rep.get("room") or (b_pair.get("room", "—") if b_pair else "—"))
                r_teacher = html.escape(b_rep.get("teacher") or (b_pair.get("teacher", "—") if b_pair else "—"))
                c_msg = (
                    f"🔔 <b>Через 10 минут начнётся {pair_num}-я пара (ЗАМЕНА)!</b>\n"
                    f"──────────────────────\n"
                    f"<blockquote>"
                    f"⚠️ {emoji_num} <b>{b_trange}</b> · <b>ЗАМЕНА В РАСПИСАНИИ</b>\n"
                    f"📚 <b>{r_subj}</b>\n"
                    f"📍 Кабинет: <code>{r_room}</code> · 👨‍🏫 <i>{r_teacher}</i>\n"
                    f"👥 Группа: <code>{b_grp}</code>"
                    f"{b_bd_line}"
                    f"</blockquote>\n"
                    f"🏃‍♂️ <i>Успейте занять места в аудитории!</i>"
                )
            else:
                s_subj = html.escape(str(b_pair.get("subject", "Не указан")))
                s_room = html.escape(str(b_pair.get("room", "—")))
                s_teacher = html.escape(str(b_pair.get("teacher", "—")))
                c_msg = (
                    f"🔔 <b>Через 10 минут начнётся {pair_num}-я пара!</b>\n"
                    f"──────────────────────\n"
                    f"<blockquote>"
                    f"{emoji_num} <b>{b_trange}</b>\n"
                    f"📚 <b>{s_subj}</b>\n"
                    f"📍 Кабинет: <code>{s_room}</code> · 👨‍🏫 <i>{s_teacher}</i>\n"
                    f"👥 Группа: <code>{b_grp}</code>"
                    f"{b_bd_line}"
                    f"</blockquote>\n"
                    f"🏃‍♂️ <i>Пора в аудиторию! Успешной пары!</i>"
                )

            await safe_send_message(bot, b.chat_id, c_msg)
            await asyncio.sleep(0.05)
    except Exception as e:
        logger.warning(f"Ошибка отправки 10-минутного колокольчика в беседы: {e}")

    logger.info(f"Напоминание о {pair_num}-й паре успешно отправлено {success_count} студентам.")
