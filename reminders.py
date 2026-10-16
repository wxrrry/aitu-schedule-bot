import os
import json
import html
import logging
from datetime import datetime
from aiogram import Bot, types
from aiogram.exceptions import TelegramForbiddenError, TelegramBadRequest

from config import BOT_TZ
from parity import get_week_parity
from schedule_data import SCHEDULE, BELL_SCHEDULE, NUMBER_EMOJIS, DAYS_RU
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
    Рассылает личное напоминание за 10 минут до начала пары всем подписанным пользователям.
    Проверяет чётность недели, наличие пары и замены/отмены.
    """
    subs = load_subscribers()
    if not subs:
        return

    now = datetime.now(BOT_TZ)
    today = now.date()
    weekday = today.weekday()
    if weekday >= 5:
        return  # Выходные дни

    parity_code, parity_name = get_week_parity(today)
    day_pairs = SCHEDULE.get(weekday, {})
    pair_val = day_pairs.get(pair_num)
    
    # Замены на сегодня
    replacements = get_replacements_for_date(today)
    replacement = replacements.get(pair_num)

    time_info = BELL_SCHEDULE.get(pair_num, {})
    time_range = time_info.get("range", "") if isinstance(time_info, dict) else str(time_info)
    breakdown = time_info.get("breakdown", "") if isinstance(time_info, dict) else ""
    emoji_num = NUMBER_EMOJIS.get(pair_num, f"[{pair_num}]")

    # Если пары нет в расписании и нет замены — пропускаем
    if not pair_val and not replacement:
        return

    # Обычная пара
    pair_info = None
    if pair_val:
        if pair_val.get("split"):
            pair_info = pair_val["chislitel"] if parity_code == "chislitel" else pair_val["znamenatel"]
        else:
            pair_info = pair_val

    # Случай 1: Пара отменена
    if replacement and replacement.get("type") == "cancel":
        msg_text = (
            f"🔔 <b>Личный колокольчик 9ПО-43к</b>\n"
            f"──────────────────────\n"
            f"<blockquote>"
            f"❌ {emoji_num} <b>{time_range} — ПАРА ОТМЕНЕНА!</b>\n"
            + (f"📚 <s>{html.escape(pair_info['subject'])}</s>\n" if pair_info else "")
            + f"💡 <i>{replacement.get('text', 'Занятие отменено')}</i>\n"
            f"🎉 Можно отдохнуть или заняться своими делами!"
            f"</blockquote>"
        )
    # Случай 2: Пара заменена
    elif replacement and replacement.get("type") == "replace":
        breakdown_line = f"\n⏱ <i>{breakdown}</i>" if breakdown else ""
        msg_text = (
            f"🔔 <b>Через 10 минут начнётся {pair_num}-я пара (ЗАМЕНА)!</b>\n"
            f"──────────────────────\n"
            f"<blockquote>"
            f"⚠️ {emoji_num} <b>{time_range}</b> · <b>ЗАМЕНА В РАСПИСАНИИ</b>\n"
            f"📚 <b>{html.escape(replacement.get('text', 'Замена пары'))}</b>\n"
            + (f"▫️ <i>(по плану было: {html.escape(pair_info['subject'])})</i>\n" if pair_info else "")
            + f"{breakdown_line}"
            f"</blockquote>\n"
            f"🏃‍♂️ <i>Успейте занять места в аудитории!</i>"
        )
    # Случай 3: Обычная пара по расписанию
    elif pair_info:
        subject = html.escape(str(pair_info.get("subject", "Не указан")))
        room = html.escape(str(pair_info.get("room", "—")))
        teacher = html.escape(str(pair_info.get("teacher", "—")))
        breakdown_line = f"\n⏱ <i>{breakdown}</i>" if breakdown else ""

        msg_text = (
            f"🔔 <b>Через 10 минут начнётся {pair_num}-я пара!</b>\n"
            f"──────────────────────\n"
            f"<blockquote>"
            f"{emoji_num} <b>{time_range}</b>\n"
            f"📚 <b>{subject}</b>\n"
            f"📍 Кабинет: <code>{room}</code> · 👨‍🏫 <i>{teacher}</i>"
            f"{breakdown_line}"
            f"</blockquote>\n"
            f"🏃‍♂️ <i>Пора в аудиторию! Успешной пары!</i>"
        )
    else:
        # Пары нет по текущей четности (окно)
        return

    dead_users = []
    success_count = 0

    for uid in subs:
        try:
            await bot.send_message(
                chat_id=uid,
                text=msg_text,
                link_preview_options=types.LinkPreviewOptions(is_disabled=True)
            )
            success_count += 1
        except (TelegramForbiddenError, TelegramBadRequest) as e:
            logger.warning(f"Пользователь {uid} недоступен (блокировка или чат не найден): {e}")
            dead_users.append(uid)
        except Exception as e:
            logger.error(f"Ошибка отправки напоминания пользователю {uid}: {e}")

    # Удаляем неактивных пользователей
    if dead_users:
        subs.difference_update(dead_users)
        save_subscribers(subs)

    logger.info(f"Напоминание о {pair_num}-й паре отправлено {success_count} подписчикам.")
