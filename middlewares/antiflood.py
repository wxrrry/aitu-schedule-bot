import time
from typing import Any, Awaitable, Callable, Dict
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Message, CallbackQuery


class ThrottlingMiddleware(BaseMiddleware):
    """
    Middleware для защиты от флуда и спама кнопками.
    Ограничивает частоту общих запросов (по умолчанию 0.35s) и ресурсоемких команд (1.5s).
    """
    def __init__(self, rate_limit: float = 0.35, heavy_limit: float = 1.5):
        self.rate_limit = rate_limit
        self.heavy_limit = heavy_limit
        self.last_user_actions: Dict[int, float] = {}
        self.last_user_heavy: Dict[int, float] = {}
        self.heavy_commands = {
            "/calendar", "/teacher", "/teachers", "/zameny",
            "/sync", "/export", "/import"
        }

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any]
    ) -> Any:
        user_id = None
        is_msg = isinstance(event, Message)
        is_cb = isinstance(event, CallbackQuery)
        
        if (is_msg or is_cb) and event.from_user:
            user_id = event.from_user.id

        if user_id:
            now = time.monotonic()

            # Проверка для ресурсоемких команд бота
            if is_msg and event.text:
                cmd = event.text.strip().split()[0].lower()
                if cmd in self.heavy_commands:
                    last_heavy = self.last_user_heavy.get(user_id, 0.0)
                    if now - last_heavy < self.heavy_limit:
                        try:
                            await event.answer("⏳ Пожалуйста, подождите секунду перед повторным запросом.")
                        except Exception:
                            pass
                        return None
                    self.last_user_heavy[user_id] = now

            last_time = self.last_user_actions.get(user_id, 0.0)
            if now - last_time < self.rate_limit:
                if is_cb:
                    try:
                        await event.answer("⚠️ Слишком частые клики. Пожалуйста, подождите секунду.", show_alert=False)
                    except Exception:
                        pass
                return None
            self.last_user_actions[user_id] = now

        return await handler(event, data)
