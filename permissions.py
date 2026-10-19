import logging
from config import ADMIN_IDS, ADMIN_ID
from db.crud import get_user, canonical_group_name, get_group_officers
from db.models import UserRole

logger = logging.getLogger(__name__)


def is_superadmin(user_id: int | str) -> bool:
    """
    Проверяет, является ли пользователь главным администратором из .env (ADMIN_IDS).
    """
    try:
        uid = int(user_id)
        return uid in ADMIN_IDS
    except Exception:
        return False


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
        return canonical_group_name(user.group_name) == canonical_group_name(group_name)
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
        return canonical_group_name(user.group_name) == canonical_group_name(group_name)
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
        return canonical_group_name(user.group_name) == canonical_group_name(group_name)
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


async def can_change_group_officers(user_id: int, group_name: str) -> tuple[bool, str]:
    """
    Проверяет права на изменение руководства группы (старосты и заместителя):
    - Администраторы бота: всегда имеют право.
    - Действующие староста и зам этой группы: имеют право переизбирать или снимать руководство.
    - Обычные участники: имеют право назначать ТОЛЬКО если в группе ещё НЕТ ни старосты, ни заместителя.
      Если староста или зам уже назначены, обычным участникам доступ закрыт.
    """
    if await is_admin(user_id):
        return True, "Доступ администратора"

    target_canon = canonical_group_name(group_name)
    user = await get_user(user_id)
    user_grp_canon = canonical_group_name(user.group_name) if user and user.group_name else ""

    if user_grp_canon != target_canon:
        return False, f"Вы не состоите в группе {group_name}."

    officers = await get_group_officers(target_canon)
    starosta_user = officers.get("starosta")
    zam_user = officers.get("zam_starosty")

    # Если уже назначено руководство (хотя бы староста или зам)
    if starosta_user or zam_user:
        is_current_starosta = starosta_user and starosta_user.user_id == user_id
        is_current_zam = zam_user and zam_user.user_id == user_id
        if not (is_current_starosta or is_current_zam):
            return False, "Руководство группы уже назначено. Смена разрешена только действующему старосте или заместителю."

    return True, "Доступ разрешен"


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
