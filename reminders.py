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
from schedule_data import SCHEDULE, BELL_SCHEDULE, NUMBER_EMOJIS, DAYS_RU, GROUP_NAME
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


async def send_pair_reminder(bot: Bot, pair_num: int):
    """
    Рассылает личное напоминание за 10 минут до начала пары.
    Проверяет расписание КАЖДОЙ группы в БД и отправляет уведомления только тем студентам,
    у которых реально есть пара. Соблюдает лимиты Telegram API (asyncio.sleep).
    """
    from db.crud import get_users_for_notification, get_lessons_for_day, get_replacements_for_date_and_group, get_user

    now = datetime.now(BOT_TZ)
    today = now.date()
    weekday = today.weekday()
    if weekday >= 5:
        return  # Выходные дни

    parity_code, parity_name = get_week_parity(today)
    time_info = BELL_SCHEDULE.get(pair_num, {})
    time_range = time_info.get("range", "") if isinstance(time_info, dict) else str(time_info)
    breakdown = time_info.get("breakdown", "") if isinstance(time_info, dict) else ""
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

        try:
            await bot.send_message(
                chat_id=uid,
                text=msg_text,
                link_preview_options=types.LinkPreviewOptions(is_disabled=True)
            )
            success_count += 1
            await asyncio.sleep(0.05)  # Лимит Telegram API на массовую рассылку
        except (TelegramForbiddenError, TelegramBadRequest) as e:
            logger.warning(f"Пользователь {uid} недоступен: {e}")
            dead_users.append(uid)
        except Exception as e:
            logger.error(f"Ошибка отправки напоминания пользователю {uid}: {e}")

    if dead_users:
        legacy_subs.difference_update(dead_users)
        save_subscribers(legacy_subs)

    logger.info(f"Напоминание о {pair_num}-й паре успешно отправлено {success_count} студентам.")
