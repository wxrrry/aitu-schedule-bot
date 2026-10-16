from datetime import date, datetime
import logging
from sqlalchemy import select, update, delete, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from .database import async_session
from .models import User, Group, Lesson, Replacement, ChatBinding, UserRole

logger = logging.getLogger(__name__)


# =============================================================
# USERS CRUD
# =============================================================
async def get_or_create_user(
    user_id: int,
    username: str | None = None,
    full_name: str = "",
    default_group: str | None = "9ПО-43к"
) -> tuple[User, bool]:
    """Получает пользователя из БД или создаёт нового (возвращает (user, created))."""
    async with async_session() as session:
        stmt = select(User).where(User.user_id == user_id)
        res = await session.execute(stmt)
        user = res.scalar_one_or_none()
        if user:
            # Обновляем username / full_name если изменились
            changed = False
            if username and user.username != username:
                user.username = username
                changed = True
            if full_name and user.full_name != full_name:
                user.full_name = full_name
                changed = True
            if changed:
                await session.commit()
                await session.refresh(user)
            return user, False

        # Создаём нового пользователя
        user = User(
            user_id=user_id,
            username=username,
            full_name=full_name,
            group_name=default_group,
            role=UserRole.STUDENT.value
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user, True


async def get_user(user_id: int) -> User | None:
    """Возвращает пользователя по ID."""
    async with async_session() as session:
        stmt = select(User).where(User.user_id == user_id)
        res = await session.execute(stmt)
        return res.scalar_one_or_none()


async def get_user_by_username(username: str) -> User | None:
    """Возвращает пользователя по username (без @)."""
    clean_username = username.lstrip("@").strip()
    async with async_session() as session:
        stmt = select(User).where(User.username.ilike(clean_username))
        res = await session.execute(stmt)
        return res.scalar_one_or_none()


async def update_user_group(user_id: int, group_name: str) -> bool:
    """Обновляет академическую группу пользователя."""
    async with async_session() as session:
        stmt = update(User).where(User.user_id == user_id).values(group_name=group_name)
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0


async def update_user_role(user_id: int, role: str) -> bool:
    """Обновляет роль пользователя (student, zam_starosty, starosta, admin)."""
    async with async_session() as session:
        stmt = update(User).where(User.user_id == user_id).values(role=role)
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0


async def update_user_setting(user_id: int, key: str, value: bool) -> bool:
    """Обновляет персональную настройку уведомлений."""
    if key not in ("remind_10min", "morning_alert", "five_min_breaks"):
        return False
    async with async_session() as session:
        stmt = update(User).where(User.user_id == user_id).values(**{key: value})
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0


async def get_users_by_group(group_name: str) -> list[User]:
    """Возвращает всех студентов указанной группы."""
    async with async_session() as session:
        stmt = select(User).where(User.group_name == group_name)
        res = await session.execute(stmt)
        return list(res.scalars().all())


async def get_users_for_notification(setting_key: str, group_name: str | None = None) -> list[User]:
    """Возвращает список пользователей, у которых включена настройка notification."""
    valid_keys = {"remind_10min": User.remind_10min, "morning_alert": User.morning_alert, "five_min_breaks": User.five_min_breaks}
    col = valid_keys.get(setting_key)
    if col is None:
        return []

    async with async_session() as session:
        conditions = [col == True]
        if group_name:
            conditions.append(User.group_name == group_name)
        stmt = select(User).where(and_(*conditions))
        res = await session.execute(stmt)
        return list(res.scalars().all())


async def count_all_users() -> int:
    """Возвращает общее количество пользователей."""
    async with async_session() as session:
        stmt = select(User)
        res = await session.execute(stmt)
        return len(res.scalars().all())


# =============================================================
# GROUPS CRUD
# =============================================================
async def get_all_groups(course: int | None = None) -> list[Group]:
    """Возвращает список групп (опционально по курсу)."""
    async with async_session() as session:
        stmt = select(Group).where(Group.is_active == True)
        if course is not None:
            stmt = stmt.where(Group.course == course)
        stmt = stmt.order_by(Group.course, Group.name)
        res = await session.execute(stmt)
        return list(res.scalars().all())


async def get_group_by_name(name: str) -> Group | None:
    """Возвращает группу по названию."""
    clean_name = name.strip()
    async with async_session() as session:
        stmt = select(Group).where(Group.name.ilike(clean_name))
        res = await session.execute(stmt)
        return res.scalar_one_or_none()


async def add_group(name: str, course: int, department: str = "") -> Group:
    """Добавляет новую группу, если её ещё нет."""
    clean_name = name.strip()
    async with async_session() as session:
        stmt = select(Group).where(Group.name.ilike(clean_name))
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing
        new_g = Group(name=clean_name, course=course, department=department)
        session.add(new_g)
        await session.commit()
        await session.refresh(new_g)
        return new_g


async def get_all_courses() -> list[int]:
    """Возвращает список уникальных номеров курсов."""
    async with async_session() as session:
        stmt = select(Group.course).where(Group.is_active == True).distinct().order_by(Group.course)
        res = await session.execute(stmt)
        return list(res.scalars().all())


# =============================================================
# LESSONS (SCHEDULE) CRUD
# =============================================================
async def get_lessons_for_day(group_name: str, weekday: int, parity_code: str) -> dict[int, dict]:
    """
    Возвращает пары группы на указанный день недели с учётом чётности.
    Формат словаря: {1: {'subject': '...', 'room': '...', 'teacher': '...'}, ...}
    """
    async with async_session() as session:
        stmt = select(Lesson).where(
            and_(
                Lesson.group_name.ilike(group_name.strip()),
                Lesson.weekday == weekday,
                or_(Lesson.parity == "both", Lesson.parity == parity_code)
            )
        ).order_by(Lesson.pair_num)
        res = await session.execute(stmt)
        lessons = res.scalars().all()

        pairs_dict: dict[int, dict] = {}
        for l in lessons:
            pairs_dict[l.pair_num] = {
                "subject": l.subject,
                "room": l.room,
                "teacher": l.teacher,
                "parity": l.parity
            }
        return pairs_dict


async def get_all_lessons_for_group(group_name: str) -> list[Lesson]:
    """Возвращает все уроки группы из базы данных."""
    async with async_session() as session:
        stmt = select(Lesson).where(
            Lesson.group_name.ilike(group_name.strip())
        ).order_by(Lesson.weekday, Lesson.pair_num)
        res = await session.execute(stmt)
        return list(res.scalars().all())


async def add_or_update_lesson(
    group_name: str,
    weekday: int,
    pair_num: int,
    parity: str,
    subject: str,
    room: str = "—",
    teacher: str = "—"
) -> Lesson:
    """Добавляет или обновляет урок."""
    async with async_session() as session:
        stmt = select(Lesson).where(
            and_(
                Lesson.group_name.ilike(group_name.strip()),
                Lesson.weekday == weekday,
                Lesson.pair_num == pair_num,
                Lesson.parity == parity
            )
        )
        res = await session.execute(stmt)
        lesson = res.scalar_one_or_none()
        if lesson:
            lesson.subject = subject
            lesson.room = room
            lesson.teacher = teacher
        else:
            lesson = Lesson(
                group_name=group_name.strip(),
                weekday=weekday,
                pair_num=pair_num,
                parity=parity,
                subject=subject,
                room=room,
                teacher=teacher
            )
            session.add(lesson)
        await session.commit()
        await session.refresh(lesson)
        return lesson


async def update_lesson_room(group_name: str, weekday: int, pair_num: int, new_room: str) -> bool:
    """Староста/Зам: обновляет номер аудитории для всех вариантов пары."""
    async with async_session() as session:
        stmt = update(Lesson).where(
            and_(
                Lesson.group_name.ilike(group_name.strip()),
                Lesson.weekday == weekday,
                Lesson.pair_num == pair_num
            )
        ).values(room=new_room)
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0


# =============================================================
# REPLACEMENTS CRUD
# =============================================================
async def get_replacements_for_date_and_group(target_date: date, group_name: str | None = None) -> dict[int, dict]:
    """
    Возвращает замены на дату для конкретной группы (включая общеколледжные замены group_name is NULL).
    """
    async with async_session() as session:
        conditions = [Replacement.date == target_date]
        if group_name:
            conditions.append(or_(Replacement.group_name.is_(None), Replacement.group_name.ilike(group_name.strip())))
        stmt = select(Replacement).where(and_(*conditions)).order_by(Replacement.pair_num)
        res = await session.execute(stmt)
        reps = res.scalars().all()

        reps_dict: dict[int, dict] = {}
        for r in reps:
            reps_dict[r.pair_num] = {
                "type": r.action_type,
                "subject": r.subject,
                "room": r.room,
                "teacher": r.teacher,
                "text": r.raw_text,
                "group_name": r.group_name
            }
        return reps_dict


async def get_all_active_replacements(since_date: date | None = None) -> list[Replacement]:
    """Возвращает все замены, начиная с указанной даты (по умолчанию с сегодняшнего дня)."""
    if since_date is None:
        since_date = date.today()
    async with async_session() as session:
        stmt = select(Replacement).where(Replacement.date >= since_date).order_by(Replacement.date, Replacement.pair_num)
        res = await session.execute(stmt)
        return list(res.scalars().all())


async def add_replacement_record(
    target_date: date,
    pair_num: int,
    action_type: str,
    subject: str = "",
    room: str = "—",
    teacher: str = "—",
    raw_text: str = "",
    group_name: str | None = None,
    created_by: int = 0
) -> Replacement:
    """Добавляет или заменяет запись о замене/отмене."""
    async with async_session() as session:
        # Проверяем существующую замену на эту пару
        stmt = select(Replacement).where(
            and_(
                Replacement.date == target_date,
                Replacement.pair_num == pair_num,
                Replacement.group_name == (group_name.strip() if group_name else None)
            )
        )
        res = await session.execute(stmt)
        rep = res.scalar_one_or_none()
        if rep:
            rep.action_type = action_type
            rep.subject = subject
            rep.room = room
            rep.teacher = teacher
            rep.raw_text = raw_text
            rep.created_by = created_by
        else:
            rep = Replacement(
                group_name=group_name.strip() if group_name else None,
                date=target_date,
                pair_num=pair_num,
                action_type=action_type,
                subject=subject,
                room=room,
                teacher=teacher,
                raw_text=raw_text,
                created_by=created_by
            )
            session.add(rep)
        await session.commit()
        await session.refresh(rep)
        return rep


async def delete_replacement_record(target_date: date, pair_num: int, group_name: str | None = None) -> bool:
    """Удаляет замену по дате, номеру пары и группе."""
    async with async_session() as session:
        conditions = [Replacement.date == target_date, Replacement.pair_num == pair_num]
        if group_name is not None:
            conditions.append(Replacement.group_name.ilike(group_name.strip()))
        stmt = delete(Replacement).where(and_(*conditions))
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0


# =============================================================
# CHAT BINDINGS (Группы Telegram) CRUD
# =============================================================
async def bind_chat_to_group(chat_id: int, chat_title: str, group_name: str, user_id: int = 0) -> ChatBinding:
    """Привязывает беседу Telegram к академической группе."""
    async with async_session() as session:
        stmt = select(ChatBinding).where(ChatBinding.chat_id == chat_id)
        res = await session.execute(stmt)
        binding = res.scalar_one_or_none()
        if binding:
            binding.chat_title = chat_title
            binding.group_name = group_name.strip()
            binding.bound_by_user_id = user_id
        else:
            binding = ChatBinding(
                chat_id=chat_id,
                chat_title=chat_title,
                group_name=group_name.strip(),
                bound_by_user_id=user_id
            )
            session.add(binding)
        await session.commit()
        await session.refresh(binding)
        return binding


async def get_chat_group(chat_id: int) -> str | None:
    """Возвращает название группы, привязанной к чату."""
    async with async_session() as session:
        stmt = select(ChatBinding.group_name).where(ChatBinding.chat_id == chat_id)
        res = await session.execute(stmt)
        return res.scalar_one_or_none()


async def get_chats_for_group(group_name: str) -> list[ChatBinding]:
    """Возвращает все чаты Telegram, привязанные к группе."""
    async with async_session() as session:
        stmt = select(ChatBinding).where(ChatBinding.group_name.ilike(group_name.strip()))
        res = await session.execute(stmt)
        return list(res.scalars().all())


async def get_all_chat_bindings() -> list[ChatBinding]:
    """Возвращает все привязанные беседы."""
    async with async_session() as session:
        stmt = select(ChatBinding)
        res = await session.execute(stmt)
        return list(res.scalars().all())


# =============================================================
# GROUP OFFICERS (STAROSTA / ZAM_STAROSTY) MANAGEMENT
# =============================================================
async def get_group_officers(group_name: str) -> dict[str, User | None]:
    """Возвращает текущего старосту и заместителя старосты указанной группы."""
    clean_grp = group_name.strip()
    async with async_session() as session:
        stmt = select(User).where(
            and_(
                User.group_name.ilike(clean_grp),
                User.role.in_([UserRole.STAROSTA.value, UserRole.ZAM_STAROSTY.value])
            )
        )
        res = await session.execute(stmt)
        users = res.scalars().all()

        officers = {"starosta": None, "zam_starosty": None}
        for u in users:
            if u.role == UserRole.STAROSTA.value:
                officers["starosta"] = u
            elif u.role == UserRole.ZAM_STAROSTY.value:
                officers["zam_starosty"] = u
        return officers


async def assign_group_officer(group_name: str, officer_role: str, new_user_id: int) -> tuple[bool, str]:
    """
    Назначает старосту или заместителя старосты для группы:
    - Для одной группы не может быть больше 1 старосты и 1 зама.
    - Если слот уже занят, предыдущий офицер с этой ролью разжалуется до student.
    - Новый пользователь получает указанную роль и привязывается к группе.
    """
    if officer_role not in (UserRole.STAROSTA.value, UserRole.ZAM_STAROSTY.value):
        return False, "Недопустимая роль офицера."

    clean_grp = group_name.strip()
    async with async_session() as session:
        target_stmt = select(User).where(User.user_id == new_user_id)
        res = await session.execute(target_stmt)
        target_user = res.scalar_one_or_none()
        if not target_user:
            return False, "Пользователь не найден в базе данных бота."

        curr_stmt = select(User).where(
            and_(
                User.group_name.ilike(clean_grp),
                User.role == officer_role,
                User.user_id != new_user_id
            )
        )
        curr_res = await session.execute(curr_stmt)
        old_officers = curr_res.scalars().all()
        for old in old_officers:
            old.role = UserRole.STUDENT.value

        target_user.role = officer_role
        target_user.group_name = clean_grp

        await session.commit()
        return True, "Успешно назначено."


async def demote_group_officer(group_name: str, officer_role: str) -> bool:
    """Снимает старосту или заместителя группы, возвращая им роль student."""
    clean_grp = group_name.strip()
    async with async_session() as session:
        stmt = update(User).where(
            and_(
                User.group_name.ilike(clean_grp),
                User.role == officer_role
            )
        ).values(role=UserRole.STUDENT.value)
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0


async def get_group_replacements(group_name: str, since_date: date | None = None) -> list[Replacement]:
    """Возвращает все активные замены для указанной группы."""
    if since_date is None:
        since_date = date.today()
    clean_grp = group_name.strip()
    async with async_session() as session:
        stmt = select(Replacement).where(
            and_(
                Replacement.date >= since_date,
                or_(Replacement.group_name.is_(None), Replacement.group_name.ilike(clean_grp))
            )
        ).order_by(Replacement.date, Replacement.pair_num)
        res = await session.execute(stmt)
        return list(res.scalars().all())


async def delete_replacement_by_id(rep_id: int) -> bool:
    """Удаляет замену по её первичному ключу ID."""
    async with async_session() as session:
        stmt = delete(Replacement).where(Replacement.id == rep_id)
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0

