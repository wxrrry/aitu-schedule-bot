import logging
from config import ADMIN_IDS, ADMIN_ID
from db.crud import get_user
from db.models import UserRole

logger = logging.getLogger(__name__)


def is_superadmin(user_id: int) -> bool:
    """
    Проверяет, является ли пользователь главным администратором из .env (ADMIN_IDS).
    """
    return user_id in ADMIN_IDS


async def is_admin(user_id: int) -> bool:
    """
    Проверяет, является ли пользователь администратором (из .env или роль 'admin'/'superadmin' в БД).
    """
    if is_superadmin(user_id):
        return True
    user = await get_user(user_id)
    if not user:
        return False
    return user.role in (UserRole.ADMIN.value, UserRole.SUPERADMIN.value)


async def is_starosta(user_id: int, group_name: str | None = None) -> bool:
    """
    Проверяет, является ли пользователь старостой (опционально конкретной группы).
    Администраторы бота также имеют права старосты.
    """
    if await is_admin(user_id):
        return True
    user = await get_user(user_id)
    if not user or user.role != UserRole.STAROSTA.value:
        return False
    if group_name:
        return (user.group_name or "").strip().lower() == group_name.strip().lower()
    return True


async def is_zam_starosty(user_id: int, group_name: str | None = None) -> bool:
    """
    Проверяет, является ли пользователь зам. старосты (опционально конкретной группы).
    """
    if await is_admin(user_id):
        return True
    user = await get_user(user_id)
    if not user or user.role != UserRole.ZAM_STAROSTY.value:
        return False
    if group_name:
        return (user.group_name or "").strip().lower() == group_name.strip().lower()
    return True


async def is_starosta_or_zam(user_id: int, group_name: str | None = None) -> bool:
    """
    Проверяет, является ли пользователь старостой или заместителем старосты.
    """
    if await is_admin(user_id):
        return True
    user = await get_user(user_id)
    if not user:
        return False
    if user.role not in (UserRole.STAROSTA.value, UserRole.ZAM_STAROSTY.value):
        return False
    if group_name:
        return (user.group_name or "").strip().lower() == group_name.strip().lower()
    return True


async def can_manage_group(user_id: int, group_name: str) -> bool:
    """
    Проверяет, имеет ли право пользователь редактировать расписание, кабинеты и замены группы:
    - Главные администраторы и админы бота: для ЛЮБОЙ группы.
    - Староста и зам. старосты: ТОЛЬКО для своей группы.
    """
    if await is_admin(user_id):
        return True
    return await is_starosta_or_zam(user_id, group_name=group_name)


async def get_user_role_display(user_id: int) -> tuple[str, str | None]:
    """
    Возвращает человекочитаемое название роли и группу пользователя.
    Например: ("👑 Главный администратор", None) или ("⭐️ Староста", "9ПО-43к").
    """
    if is_superadmin(user_id):
        user = await get_user(user_id)
        grp = user.group_name if user else None
        return "👑 Главный администратор (Superadmin)", grp

    user = await get_user(user_id)
    if not user:
        return "👨‍🎓 Студент", None

    grp = user.group_name
    roles_map = {
        UserRole.SUPERADMIN.value: "👑 Главный администратор",
        UserRole.ADMIN.value: "🛡 Администратор бота",
        UserRole.STAROSTA.value: "⭐️ Староста группы",
        UserRole.ZAM_STAROSTY.value: "⚡️ Заместитель старосты",
        UserRole.STUDENT.value: "👨‍🎓 Студент"
    }
    role_name = roles_map.get(user.role, "👨‍🎓 Студент")
    return role_name, grp
