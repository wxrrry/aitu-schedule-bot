from typing import Any, Awaitable, Callable, Dict
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Message, CallbackQuery
from db.database import async_session
from db.crud import get_or_create_user


class DbSessionMiddleware(BaseMiddleware):
    """
    Middleware для внедрения асинхронной сессии SQLAlchemy
    и авторегистрации пользователя в БД.
    """
    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any]
    ) -> Any:
        # Автоматическая регистрация пользователя при взаимодействии
        user = None
        if isinstance(event, Message) and event.from_user:
            user = event.from_user
        elif isinstance(event, CallbackQuery) and event.from_user:
            user = event.from_user

        if user and not user.is_bot:
            try:
                await get_or_create_user(
                    user_id=user.id,
                    username=user.username,
                    full_name=user.full_name
                )
            except Exception:
                pass

        async with async_session() as session:
            data["session"] = session
            return await handler(event, data)
