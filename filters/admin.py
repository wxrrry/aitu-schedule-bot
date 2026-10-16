from aiogram.filters import Filter
from aiogram import types
from permissions import is_admin, is_starosta_or_zam


class IsAdminFilter(Filter):
    """
    Кастомный фильтр для проверки прав администратора.
    Проверяет ADMIN_IDS из .env или role in ('admin', 'superadmin') в базе данных.
    """
    def __init__(self, is_admin: bool = True):
        self.is_admin = is_admin

    async def __call__(self, event: types.Message | types.CallbackQuery) -> bool:
        user = event.from_user
        if not user:
            return False
        user_is_adm = await is_admin(user.id)
        return user_is_adm == self.is_admin


class IsStarostaFilter(Filter):
    """
    Кастомный фильтр для проверки прав старосты или зам. старосты.
    """
    def __init__(self, is_starosta: bool = True):
        self.is_starosta = is_starosta

    async def __call__(self, event: types.Message | types.CallbackQuery) -> bool:
        user = event.from_user
        if not user:
            return False
        user_is_starosta = await is_starosta_or_zam(user.id)
        return user_is_starosta == self.is_starosta
