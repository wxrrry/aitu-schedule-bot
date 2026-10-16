import time
from typing import Any, Awaitable, Callable, Dict
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Message, CallbackQuery


class ThrottlingMiddleware(BaseMiddleware):
    """
    Middleware для защиты от флуда и спама кнопками.
    Ограничивает частоту запросов от одного пользователя (rate limit).
    """
    def __init__(self, rate_limit: float = 0.5):
        self.rate_limit = rate_limit
        self.last_user_actions: Dict[int, float] = {}

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any]
    ) -> Any:
        user_id = None
        if isinstance(event, Message) and event.from_user:
            user_id = event.from_user.id
        elif isinstance(event, CallbackQuery) and event.from_user:
            user_id = event.from_user.id

        if user_id:
            now = time.monotonic()
            last_time = self.last_user_actions.get(user_id, 0.0)
            if now - last_time < self.rate_limit:
                # Слишком частые запросы — тихо игнорируем или отвечаем на callback
                if isinstance(event, CallbackQuery):
                    try:
                        await event.answer("⚠️ Слишком частые клики. Пожалуйста, подождите секунду.", show_alert=False)
                    except Exception:
                        pass
                return None
            self.last_user_actions[user_id] = now

        return await handler(event, data)
