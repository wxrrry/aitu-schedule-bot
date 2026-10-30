import logging
from typing import Any, Awaitable, Callable, Dict
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Message
from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError

logger = logging.getLogger(__name__)

# Набор текстовых триггеров кнопок и частых текстовых команд, после которых нужно удалять сообщение пользователя
COMMAND_TEXT_TRIGGERS = {
    # Главное меню и оперативные команды
    "⚡️ какая пара сейчас?", "какая пара сейчас?", "какая пара сейчас", "пара сейчас", "сейчас",
    "📅 сегодня", "сегодня", "расписание на сегодня", "расписание сегодня",
    "🔜 завтра", "завтра", "расписание на завтра", "расписание завтра",
    "🗓 расписание 📂", "🗓 расписание", "расписание 📂", "расписание",
    "🛠 полезное 📂", "🛠 полезное", "полезное 📂", "полезное", "сервисы",
    "◀️ главное меню", "◀️ назад", "главное меню", "назад", "меню",
    
    # Папка «Расписание»
    "🗓 текущая неделя", "текущая неделя", "неделя", "расписание на неделю",
    "⏭ след. неделя", "след. неделя", "след неделя", "следующая неделя",
    "📆 выбрать день", "выбрать день", "дни",
    "🏷 чётность недели", "четность недели", "чётность", "четность",
    
    # Папка «Полезное»
    "🔔 звонки", "звонки", "расписание звонков",
    "⚠️ замены пар", "⚠️ замены", "замены пар", "замены",
    "📚 конспекты лекций", "конспекты лекций", "конспекты", "лекции",
    "📁 сдо и материалы", "сдо и материалы", "сдо", "материалы",
    "⚙️ настройки", "настройки", "🔔 мои напоминания", "мои напоминания", "напоминания",
    "👨‍🏫 преподаватели", "преподаватели", "преподы",
    "📥 в календарь", "в календарь", "календарь",
    "💬 поддержка / ошибка", "💬 поддержка", "поддержка / ошибка", "поддержка", "сообщить об ошибке", "🆘 поддержка",
    
    # Служебные
    "мой id", "узнать id", "айди", "id", "админ", "админка", "панель управления", "админ панель"
}


class CleanCommandsMiddleware(BaseMiddleware):
    """
    Middleware для автоматической очистки сообщений-команд пользователя.
    После того как бот успешно сформировал и отправил ответ в чат или беседу,
    исходное сообщение-команда пользователя удаляется, чтобы не засорять переписку.
    """
    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any]
    ) -> Any:
        # 1. Даём выполниться основному обработчику (бот отправляет ответ)
        result = await handler(event, data)

        # 2. После успешной отправки ответа проверяем, является ли входящее сообщение командой
        if isinstance(event, Message):
            is_command = False
            
            # Проверка 1: Slash-команды (/today, /tomorrow, /help, /week...)
            if event.text:
                stripped = event.text.strip()
                if stripped.startswith("/"):
                    is_command = True
                elif stripped.casefold() in COMMAND_TEXT_TRIGGERS:
                    is_command = True
            
            # Проверка 2: Сущности команд Telegram (например, /command@bot)
            if not is_command and event.entities:
                for ent in event.entities:
                    if ent.type == "bot_command":
                        is_command = True
                        break

            # 3. Если это команда или кнопка-триггер — удаляем сообщение пользователя
            if is_command:
                try:
                    await event.delete()
                except TelegramBadRequest as e:
                    # В Telegram Bot API удаление входящих сообщений обычных пользователей в ЛС (private chat)
                    # ограничено протоколом Telegram, но в группах/супергруппах (беседах) с правами админа
                    # удаление работает безотказно.
                    logger.debug(f"Не удалось удалить команду пользователя (chat_type={event.chat.type}): {e}")
                except TelegramForbiddenError as e:
                    logger.debug(f"Нет прав бота на удаление сообщения (chat_type={event.chat.type}): {e}")
                except Exception as e:
                    logger.debug(f"Ошибка при удалении сообщения команды: {e}")

        return result
