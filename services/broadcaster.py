import asyncio
import logging
from typing import Iterable, Sequence
from aiogram import Bot, types
from aiogram.exceptions import TelegramRetryAfter, TelegramForbiddenError, TelegramBadRequest

logger = logging.getLogger(__name__)


async def safe_send_message(
    bot: Bot,
    chat_id: int,
    text: str,
    reply_markup: types.InlineKeyboardMarkup | types.ReplyKeyboardMarkup | None = None,
    parse_mode: str = "HTML",
    disable_web_page_preview: bool = True
) -> bool:
    """
    Безопасная отправка одного сообщения с соблюдением требований Telegram API:
    - Перехват TelegramRetryAfter (FloodWait) с автоматическим ожиданием.
    - Перехват TelegramForbiddenError (бот заблокирован пользователем).
    - Перехват TelegramBadRequest.
    """
    link_preview = types.LinkPreviewOptions(is_disabled=disable_web_page_preview)
    max_retries = 3

    for attempt in range(max_retries):
        try:
            await bot.send_message(
                chat_id=chat_id,
                text=text,
                parse_mode=parse_mode,
                reply_markup=reply_markup,
                link_preview_options=link_preview
            )
            return True
        except TelegramRetryAfter as e:
            wait_time = e.retry_after + 1
            logger.warning(f"FloodWait: спим {wait_time}s перед повторной отправкой в {chat_id}")
            await asyncio.sleep(wait_time)
        except TelegramForbiddenError:
            logger.info(f"Пользователь {chat_id} заблокировал бота или удалил чат.")
            # Отключаем уведомления для заблокировавшего пользователя в БД
            try:
                from db.crud import update_user_notifications
                await update_user_notifications(chat_id, remind_10min=False, morning_alert=False, five_min_breaks=False)
            except Exception:
                pass
            return False
        except TelegramBadRequest as e:
            logger.warning(f"TelegramBadRequest для chat_id={chat_id}: {e}")
            return False
        except Exception as e:
            logger.error(f"Неизвестная ошибка отправки для chat_id={chat_id}: {e}")
            return False
    return False


async def execute_broadcast(
    bot: Bot,
    chat_ids: Sequence[int] | Iterable[int],
    text: str,
    reply_markup: types.InlineKeyboardMarkup | types.ReplyKeyboardMarkup | None = None,
    delay: float = 0.05
) -> tuple[int, int]:
    """
    Массовая безопасная рассылка сообщений по списку получателей:
    - Задержка delay (по умолчанию 50ms) между запросами (~20 msg/sec).
    - Возвращает (успешно_отправлено, ошибок).
    """
    sent = 0
    failed = 0

    for cid in chat_ids:
        success = await safe_send_message(bot=bot, chat_id=cid, text=text, reply_markup=reply_markup)
        if success:
            sent += 1
        else:
            failed += 1
        await asyncio.sleep(delay)

    return sent, failed
