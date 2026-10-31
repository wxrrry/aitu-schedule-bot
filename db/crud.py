from datetime import date, datetime
import time
import re
import logging
from sqlalchemy import select, update, delete, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from .database import async_session
from .models import User, Group, Lesson, Replacement, ChatBinding, UserRole, Tournament, Team, UserTask

logger = logging.getLogger(__name__)

# Высокопроизводительный TTL-кэш для снижения нагрузки на БД (60 секунд)
_LESSONS_CACHE: dict[tuple, tuple[float, dict]] = {}
_REPLACEMENTS_CACHE: dict[tuple, tuple[float, dict]] = {}

def clear_schedule_cache():
    """Сбрасывает локальный кэш расписания при добавлении замен или правке аудиторий."""
    _LESSONS_CACHE.clear()
    _REPLACEMENTS_CACHE.clear()


def canonical_group_name(group_name: str | None) -> str:
    """
    Приводит название группы к каноническому виду (например, 9ПО-43к).
    Автоматически преобразует визуально похожие латинские буквы в кириллицу.
    """
    if not group_name:
        return ""
    clean = group_name.strip()

    lat_to_cyr = {
        'A': 'А', 'a': 'а',
        'B': 'В', 'b': 'в',
        'C': 'С', 'c': 'с',
        'E': 'Е', 'e': 'е',
        'H': 'Н', 'h': 'н',
        'K': 'К', 'k': 'к',
        'M': 'М', 'm': 'м',
        'O': 'О', 'o': 'о',
        'P': 'Р', 'p': 'р',
        'T': 'Т', 't': 'т',
        'X': 'Х', 'x': 'х',
        'Y': 'У', 'y': 'у',
    }
    trans = "".join(lat_to_cyr.get(ch, ch) for ch in clean)
    m = re.match(r"^(\d{1,2})\s*([а-яА-Яa-zA-Z]+)\s*[-–—_]?\s*(\d{1,3})\s*([а-яА-Яa-zA-Z]?)$", trans)
    if m:
        c, dept, num, letter = m.groups()
        suffix = letter.lower() if letter else ""
        return f"{c}{dept.upper()}-{num}{suffix}"
    return trans


def normalize_group_name(group_name: str | None) -> str:
    """Алиас для обратной совместимости."""
    return canonical_group_name(group_name)


def get_group_variants(group_name: str | None) -> list[str]:
    """
    Возвращает список всех возможных вариантов написания группы для безопасного
    поиска через SQL IN (...) в обход ограничения SQLite lower/LIKE для кириллицы.
    """
    if not group_name:
        return []
    variants = set()
    raw = group_name.strip()
    if not raw:
        return []

    variants.add(raw)
    variants.add(raw.upper())
    variants.add(raw.lower())

    canon = canonical_group_name(raw)
    if canon:
        variants.add(canon)
        variants.add(canon.upper())
        variants.add(canon.lower())

        if canon[-1].isalpha():
            base = canon[:-1]
            last = canon[-1]
            variants.add(f"{base}{last.lower()}")
            variants.add(f"{base}{last.upper()}")
            variants.add(f"{base.upper()}{last.lower()}")
            variants.add(f"{base.upper()}{last.upper()}")
            variants.add(f"{base.lower()}{last.lower()}")
            variants.add(f"{base.lower()}{last.upper()}")

        no_dash = canon.replace("-", "")
        variants.add(no_dash)
        variants.add(no_dash.upper())
        variants.add(no_dash.lower())

    return [v for v in variants if v]


def is_same_group(grp1: str | None, grp2: str | None) -> bool:
    """Сравнивает два названия учебных групп без учёта регистра и латиницы/кириллицы."""
    if not grp1 or not grp2:
        return False
    return canonical_group_name(grp1).lower() == canonical_group_name(grp2).lower()


# =============================================================
# USERS CRUD
# =============================================================
async def get_or_create_user(
    user_id: int | str,
    username: str | None = None,
    full_name: str = "",
    default_group: str | None = None
) -> tuple[User, bool]:
    """Получает пользователя из БД или создаёт нового (возвращает (user, created))."""
    u_id = int(user_id)
    async with async_session() as session:
        stmt = select(User).where(User.user_id == u_id)
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
            user_id=u_id,
            username=username,
            full_name=full_name,
            group_name=default_group,
            role=UserRole.STUDENT.value
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user, True


async def get_user(user_id: int | str) -> User | None:
    """Возвращает пользователя по ID."""
    try:
        u_id = int(user_id)
    except (ValueError, TypeError):
        return None
    async with async_session() as session:
        stmt = select(User).where(User.user_id == u_id)
        res = await session.execute(stmt)
        return res.scalar_one_or_none()


async def get_user_by_username(username: str) -> User | None:
    """Возвращает пользователя по username (без @) или точному имени / ID."""
    clean_username = username.lstrip("@").strip()
    if not clean_username:
        return None
    async with async_session() as session:
        # 1. Поиск по Telegram username (без учета регистра)
        stmt = select(User).where(User.username.ilike(clean_username))
        res = await session.execute(stmt)
        user = res.scalar_one_or_none()
        if user:
            return user

        # 2. Поиск по имени пользователя full_name
        stmt2 = select(User).where(func.lower(User.full_name) == clean_username.lower())
        res2 = await session.execute(stmt2)
        user2 = res2.scalar_one_or_none()
        if user2:
            return user2

        # 3. Если передан числовой ID в строковом формате
        if clean_username.isdigit():
            stmt3 = select(User).where(User.user_id == int(clean_username))
            res3 = await session.execute(stmt3)
            return res3.scalar_one_or_none()

        return None


async def update_user_group(user_id: int | str, group_name: str) -> bool:
    """
    Обновляет академическую группу пользователя.
    Роль старосты/заместителя сбрасывается на student ТОЛЬКО при реальном переходе
    в другую академическую группу. При первоначальном выборе группы или нормализации
    названия той же группы роль надёжно сохраняется.
    """
    u_id = int(user_id)
    canon = canonical_group_name(group_name) or group_name.strip()
    async with async_session() as session:
        user_res = await session.execute(select(User).where(User.user_id == u_id))
        user = user_res.scalar_one_or_none()
        if not user:
            return False

        # Если группа реально меняется на другую (и ранее уже была установлена)
        if not is_same_group(user.group_name, canon):
            if user.group_name and user.role in (UserRole.STAROSTA.value, UserRole.ZAM_STAROSTY.value):
                logger.info(f"Сброс роли офицера для пользователя {u_id}: смена группы с {user.group_name} на {canon}")
                user.role = UserRole.STUDENT.value
            user.group_name = canon
        elif user.group_name != canon:
            # Та же группа, просто нормализация регистра/написания
            user.group_name = canon

        await session.commit()
        return True


async def update_user_role(user_id: int | str, role: str) -> bool:
    """Обновляет роль пользователя (student, zam_starosty, starosta, admin)."""
    u_id = int(user_id)
    async with async_session() as session:
        stmt = update(User).where(User.user_id == u_id).values(role=role)
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0


async def update_user_setting(user_id: int | str, key: str, value: bool) -> bool:
    """Обновляет персональную настройку уведомлений."""
    if key not in ("remind_10min", "morning_alert", "five_min_breaks"):
        return False
    u_id = int(user_id)
    async with async_session() as session:
        stmt = update(User).where(User.user_id == u_id).values(**{key: value})
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0


async def update_user_notifications(
    user_id: int | str,
    remind_10min: bool | None = None,
    morning_alert: bool | None = None,
    five_min_breaks: bool | None = None
) -> bool:
    """Обновляет сразу несколько настроек уведомлений пользователя."""
    u_id = int(user_id)
    values = {}
    if remind_10min is not None:
        values["remind_10min"] = bool(remind_10min)
    if morning_alert is not None:
        values["morning_alert"] = bool(morning_alert)
    if five_min_breaks is not None:
        values["five_min_breaks"] = bool(five_min_breaks)
    if not values:
        return True
    async with async_session() as session:
        stmt = update(User).where(User.user_id == u_id).values(**values)
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0


async def get_users_by_group(group_name: str) -> list[User]:
    """Возвращает всех студентов указанной группы."""
    variants = get_group_variants(group_name)
    async with async_session() as session:
        stmt = select(User).where(User.group_name.in_(variants))
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
            variants = get_group_variants(group_name)
            conditions.append(User.group_name.in_(variants))
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
    """Возвращает группу по названию с учётом любых вариантов регистра и кириллицы/латиницы."""
    variants = get_group_variants(name)
    if not variants:
        return None
    async with async_session() as session:
        stmt = select(Group).where(Group.name.in_(variants))
        res = await session.execute(stmt)
        group = res.scalars().first()
        if group:
            return group

        # Нечеткий поиск по всем активным группам через каноническое сравнение
        all_groups = await get_all_groups()
        for g in all_groups:
            if is_same_group(g.name, name):
                return g
        return None


async def add_group(name: str, course: int, department: str = "") -> Group:
    """Добавляет новую группу, если её ещё нет."""
    canon_name = canonical_group_name(name) or name.strip()
    existing = await get_group_by_name(canon_name)
    if existing:
        return existing

    async with async_session() as session:
        new_g = Group(name=canon_name, course=course, department=department)
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
async def get_lessons_for_day(group_name: str, weekday: int, parity_code: str = "both") -> dict[int, dict]:
    """
    Возвращает пары группы на указанный день недели с учётом чётности (с TTL-кэшированием 60 секунд).
    Формат словаря: {1: {'subject': '...', 'room': '...', 'teacher': '...'}, ...}
    """
    canon = canonical_group_name(group_name) or group_name.strip()
    cache_key = (canon, weekday, parity_code)
    now_ts = time.time()
    if cache_key in _LESSONS_CACHE:
        ts, cached_val = _LESSONS_CACHE[cache_key]
        if now_ts - ts < 60:
            return cached_val

    variants = get_group_variants(group_name)
    async with async_session() as session:
        stmt = select(Lesson).where(
            and_(
                Lesson.group_name.in_(variants),
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
        _LESSONS_CACHE[cache_key] = (now_ts, pairs_dict)
        return pairs_dict


async def get_all_lessons_for_group(group_name: str) -> list[Lesson]:
    """Возвращает все уроки группы из базы данных."""
    variants = get_group_variants(group_name)
    async with async_session() as session:
        stmt = select(Lesson).where(Lesson.group_name.in_(variants)).order_by(Lesson.weekday, Lesson.pair_num)
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
    canon_grp = canonical_group_name(group_name) or group_name.strip()
    variants = get_group_variants(group_name)
    async with async_session() as session:
        stmt = select(Lesson).where(
            and_(
                Lesson.group_name.in_(variants),
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
            lesson.group_name = canon_grp
        else:
            lesson = Lesson(
                group_name=canon_grp,
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
        clear_schedule_cache()
        return lesson


async def update_lesson_room(group_name: str, weekday: int, pair_num: int, new_room: str) -> bool:
    """Староста/Зам: обновляет номер аудитории для всех вариантов пары."""
    variants = get_group_variants(group_name)
    async with async_session() as session:
        stmt = update(Lesson).where(
            and_(
                Lesson.group_name.in_(variants),
                Lesson.weekday == weekday,
                Lesson.pair_num == pair_num
            )
        ).values(room=new_room)
        res = await session.execute(stmt)
        await session.commit()
        if res.rowcount > 0:
            clear_schedule_cache()
        return res.rowcount > 0


async def find_teacher_lessons(teacher_query: str, weekday: int | None = None, parity: str | None = None) -> list[dict]:
    """Ищет занятия преподавателя по фамилии/имени по всей базе данных колледжа."""
    clean = teacher_query.strip().lower()
    if not clean:
        return []

    async with async_session() as session:
        stmt = select(Lesson).where(
            func.lower(Lesson.teacher).contains(clean)
        )
        if weekday is not None:
            stmt = stmt.where(Lesson.weekday == weekday)
        if parity is not None:
            stmt = stmt.where(or_(Lesson.parity == parity, Lesson.parity == 'all', Lesson.parity.is_(None)))
        
        stmt = stmt.order_by(Lesson.weekday, Lesson.pair_num)
        res = await session.execute(stmt)
        lessons = res.scalars().all()
        return [
            {
                "group_name": l.group_name,
                "weekday": l.weekday,
                "pair_num": l.pair_num,
                "parity": l.parity,
                "subject": l.subject,
                "room": l.room,
                "teacher": l.teacher
            }
            for l in lessons
        ]


async def find_room_lessons(room_query: str, weekday: int | None = None, parity: str | None = None) -> list[dict]:
    """Ищет занятия в указанном кабинете по всей базе данных всех 51 групп колледжа."""
    clean = room_query.strip().lower()
    if not clean:
        return []

    async with async_session() as session:
        stmt = select(Lesson).where(
            func.lower(Lesson.room).contains(clean)
        )
        if weekday is not None:
            stmt = stmt.where(Lesson.weekday == weekday)
        if parity is not None:
            stmt = stmt.where(or_(Lesson.parity == parity, Lesson.parity == 'all', Lesson.parity.is_(None)))
        
        stmt = stmt.order_by(Lesson.weekday, Lesson.pair_num)
        res = await session.execute(stmt)
        lessons = res.scalars().all()
        return [
            {
                "group_name": l.group_name,
                "weekday": l.weekday,
                "pair_num": l.pair_num,
                "parity": l.parity,
                "subject": l.subject,
                "room": l.room,
                "teacher": l.teacher
            }
            for l in lessons
        ]


# =============================================================
# REPLACEMENTS CRUD
# =============================================================
async def get_replacements_for_date_and_group(target_date: date, group_name: str | None = None) -> dict[int, dict]:
    """
    Возвращает замены на дату для конкретной группы (включая общеколледжные замены group_name is NULL) с TTL-кэшированием 60 секунд.
    Поддерживает кириллические названия групп и разные форматы хранения дат в SQLite.
    """
    if isinstance(target_date, datetime):
        d_obj = target_date.date()
    elif isinstance(target_date, str):
        try:
            d_obj = date.fromisoformat(target_date.strip())
        except Exception:
            d_obj = date.today()
    else:
        d_obj = target_date

    d_str = d_obj.isoformat()
    canon_grp = canonical_group_name(group_name) if group_name else None
    cache_key = (d_str, canon_grp)
    now_ts = time.time()
    if cache_key in _REPLACEMENTS_CACHE:
        ts, cached_val = _REPLACEMENTS_CACHE[cache_key]
        if now_ts - ts < 60:
            return cached_val

    async with async_session() as session:
        conditions = [Replacement.date == d_obj]
        variants = get_group_variants(group_name) if group_name else []
        if variants:
            conditions.append(or_(
                Replacement.group_name.is_(None),
                Replacement.group_name.in_(variants)
            ))

        stmt = select(Replacement).where(and_(*conditions)).order_by(Replacement.pair_num)
        res = await session.execute(stmt)
        reps = res.scalars().all()

        reps_dict: dict[int, dict] = {}
        for r in reps:
            # Если указана группа, проверяем в Python совпадение группы
            if group_name and r.group_name is not None and not (r.group_name in variants or is_same_group(r.group_name, group_name)):
                continue
            reps_dict[r.pair_num] = {
                "type": r.action_type,
                "subject": r.subject,
                "room": r.room,
                "teacher": r.teacher,
                "text": r.raw_text,
                "group_name": r.group_name
            }
        _REPLACEMENTS_CACHE[cache_key] = (now_ts, reps_dict)
        return reps_dict


async def get_all_active_replacements(since_date: date | None = None) -> list[Replacement]:
    """Возвращает все замены, начиная с указанной даты (по умолчанию с сегодняшнего дня)."""
    if since_date is None:
        since_date = date.today()
    if isinstance(since_date, datetime):
        s_obj = since_date.date()
    elif isinstance(since_date, str):
        try:
            s_obj = date.fromisoformat(since_date.strip())
        except Exception:
            s_obj = date.today()
    else:
        s_obj = since_date

    async with async_session() as session:
        stmt = select(Replacement).where(Replacement.date >= s_obj).order_by(Replacement.date, Replacement.pair_num)
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
    norm_grp = canonical_group_name(group_name) if group_name else None
    variants = get_group_variants(group_name) if group_name else []

    if isinstance(target_date, datetime):
        d_obj = target_date.date()
    elif isinstance(target_date, str):
        try:
            d_obj = date.fromisoformat(target_date.strip())
        except Exception:
            d_obj = date.today()
    else:
        d_obj = target_date

    async with async_session() as session:
        grp_cond = Replacement.group_name.in_(variants) if variants else Replacement.group_name.is_(None)
        stmt = select(Replacement).where(and_(Replacement.date == d_obj, Replacement.pair_num == pair_num, grp_cond))
        res = await session.execute(stmt)
        rep = res.scalar_one_or_none()
        if rep:
            rep.action_type = action_type
            rep.subject = subject
            rep.room = room
            rep.teacher = teacher
            rep.raw_text = raw_text
            rep.created_by = created_by
            rep.group_name = norm_grp
        else:
            rep = Replacement(
                group_name=norm_grp,
                date=d_obj,
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
        clear_schedule_cache()
        return rep


async def delete_replacement_record(target_date: date, pair_num: int, group_name: str | None = None) -> bool:
    """Удаляет замену по дате, номеру пары и группе."""
    if isinstance(target_date, datetime):
        d_obj = target_date.date()
    elif isinstance(target_date, str):
        try:
            d_obj = date.fromisoformat(target_date.strip())
        except Exception:
            d_obj = date.today()
    else:
        d_obj = target_date

    async with async_session() as session:
        conditions = [Replacement.date == d_obj, Replacement.pair_num == pair_num]
        if group_name is not None:
            variants = get_group_variants(group_name)
            conditions.append(Replacement.group_name.in_(variants))
        stmt = delete(Replacement).where(and_(*conditions))
        res = await session.execute(stmt)
        await session.commit()
        if res.rowcount > 0:
            clear_schedule_cache()
        return res.rowcount > 0


# Alias for backward compatibility
add_replacement = add_replacement_record


# =============================================================
# CHAT BINDINGS (Группы Telegram) CRUD
# =============================================================
async def bind_chat_to_group(chat_id: int | str, chat_title: str, group_name: str, user_id: int | str = 0) -> ChatBinding:
    """Привязывает беседу Telegram к академической группе."""
    c_id = int(chat_id)
    u_id = int(user_id)
    canon_grp = canonical_group_name(group_name) or group_name.strip()
    async with async_session() as session:
        stmt = select(ChatBinding).where(ChatBinding.chat_id == c_id)
        res = await session.execute(stmt)
        binding = res.scalar_one_or_none()
        if binding:
            binding.chat_title = chat_title
            binding.group_name = canon_grp
            binding.bound_by_user_id = u_id
        else:
            binding = ChatBinding(
                chat_id=c_id,
                chat_title=chat_title,
                group_name=canon_grp,
                bound_by_user_id=u_id
            )
            session.add(binding)
        await session.commit()
        await session.refresh(binding)
        return binding


async def get_chat_group(chat_id: int | str) -> str | None:
    """Возвращает название группы, привязанной к чату."""
    try:
        c_id = int(chat_id)
    except (ValueError, TypeError):
        return None
    async with async_session() as session:
        stmt = select(ChatBinding.group_name).where(ChatBinding.chat_id == c_id)
        res = await session.execute(stmt)
        return res.scalar_one_or_none()


async def get_chats_for_group(group_name: str) -> list[ChatBinding]:
    """Возвращает все чаты Telegram, привязанные к группе."""
    variants = get_group_variants(group_name)
    async with async_session() as session:
        stmt = select(ChatBinding).where(ChatBinding.group_name.in_(variants))
        res = await session.execute(stmt)
        return list(res.scalars().all())


async def get_all_chat_bindings() -> list[ChatBinding]:
    """Возвращает все привязанные беседы."""
    async with async_session() as session:
        stmt = select(ChatBinding)
        res = await session.execute(stmt)
        return list(res.scalars().all())


async def get_chat_binding(chat_id: int) -> ChatBinding | None:
    """Возвращает привязку беседы по её chat_id."""
    async with async_session() as session:
        stmt = select(ChatBinding).where(ChatBinding.chat_id == chat_id)
        res = await session.execute(stmt)
        return res.scalar_one_or_none()


async def update_chat_notification_setting(chat_id: int, key: str, value: bool) -> bool:
    """Обновляет булеву настройку системных уведомлений беседы."""
    valid_keys = {
        "notify_five_min_breaks",
        "notify_10min",
        "notify_morning",
        "notify_midnight",
        "notify_replacements"
    }
    if key not in valid_keys:
        return False
    async with async_session() as session:
        stmt = update(ChatBinding).where(ChatBinding.chat_id == chat_id).values(**{key: value})
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0


async def toggle_chat_notification_setting(chat_id: int, key: str) -> bool:
    """Инвертирует настройку системных уведомлений беседы и возвращает новое значение."""
    binding = await get_chat_binding(chat_id)
    if not binding:
        return False
    curr_val = getattr(binding, key, True)
    new_val = not curr_val
    await update_chat_notification_setting(chat_id, key, new_val)
    return new_val


# =============================================================
# GROUP OFFICERS (STAROSTA / ZAM_STAROSTY) MANAGEMENT
# =============================================================
async def get_group_officers(group_name: str) -> dict[str, User | None]:
    """Возвращает текущего старосту и заместителя старосты указанной группы."""
    variants = get_group_variants(group_name)
    async with async_session() as session:
        stmt = select(User).where(
            and_(
                User.group_name.in_(variants),
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
    - Новый пользователь получает указанную роль и надежно сохраняется в БД.
    """
    if officer_role not in (UserRole.STAROSTA.value, UserRole.ZAM_STAROSTY.value):
        return False, "Недопустимая роль офицера."

    canon_grp = canonical_group_name(group_name) or group_name.strip()
    variants = get_group_variants(group_name)
    async with async_session() as session:
        target_stmt = select(User).where(User.user_id == new_user_id)
        res = await session.execute(target_stmt)
        target_user = res.scalar_one_or_none()
        if not target_user:
            target_user = User(
                user_id=new_user_id,
                username=None,
                full_name="",
                group_name=canon_grp,
                role=officer_role
            )
            session.add(target_user)
        else:
            target_user.role = officer_role
            target_user.group_name = canon_grp

        curr_stmt = select(User).where(
            and_(
                User.group_name.in_(variants),
                User.role == officer_role,
                User.user_id != new_user_id
            )
        )
        curr_res = await session.execute(curr_stmt)
        old_officers = curr_res.scalars().all()
        for old in old_officers:
            logger.info(f"Смена руководства {canon_grp}: пользователь {old.user_id} освобождён от роли {officer_role}")
            old.role = UserRole.STUDENT.value

        await session.commit()
        logger.info(f"Назначен офицер {canon_grp}: роль={officer_role}, user_id={new_user_id}")
        return True, "Успешно назначено."


async def demote_group_officer(group_name: str, officer_role: str) -> bool:
    """Снимает старосту или заместителя группы, возвращая им роль student."""
    variants = get_group_variants(group_name)
    canon_grp = canonical_group_name(group_name) or str(group_name)
    async with async_session() as session:
        stmt = update(User).where(
            and_(
                User.group_name.in_(variants),
                User.role == officer_role
            )
        ).values(role=UserRole.STUDENT.value)
        res = await session.execute(stmt)
        await session.commit()
        logger.info(f"Снят офицер группы {canon_grp}: роль={officer_role}, затронуто записей: {res.rowcount}")
        return res.rowcount > 0


async def get_group_replacements(group_name: str, since_date: date | None = None) -> list[Replacement]:
    """Возвращает все активные замены для указанной группы."""
    if since_date is None:
        since_date = date.today()
    if isinstance(since_date, datetime):
        s_obj = since_date.date()
    elif isinstance(since_date, str):
        try:
            s_obj = date.fromisoformat(since_date.strip())
        except Exception:
            s_obj = date.today()
    else:
        s_obj = since_date

    variants = get_group_variants(group_name)
    async with async_session() as session:
        group_cond = or_(
            Replacement.group_name.is_(None),
            Replacement.group_name.in_(variants)
        )
        stmt = select(Replacement).where(and_(Replacement.date >= s_obj, group_cond)).order_by(Replacement.date, Replacement.pair_num)
        res = await session.execute(stmt)
        reps = list(res.scalars().all())

        # Если по строгим variants ничего не найдено, но есть записи в базе - делаем поиск по всем активным
        if not reps:
            all_active = await get_all_active_replacements(since_date=s_obj)
            reps = [r for r in all_active if r.group_name is None or is_same_group(r.group_name, group_name)]

        return reps


async def delete_replacement_by_id(rep_id: int | str) -> bool:
    """Удаляет замену по её первичному ключу ID."""
    r_id = int(rep_id)
    async with async_session() as session:
        stmt = delete(Replacement).where(Replacement.id == r_id)
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0


# =============================================================
# TOURNAMENTS & TEAMS CRUD
# =============================================================
async def get_all_tournaments() -> list[dict]:
    """Возвращает список всех турниров с их командами."""
    async with async_session() as session:
        stmt = select(Tournament).order_by(Tournament.created_at.desc())
        res = await session.execute(stmt)
        tournaments = res.scalars().all()
        result = []
        for t in tournaments:
            teams_stmt = select(Team).where(Team.tournament_id == t.id).order_by(Team.seed, Team.created_at)
            teams_res = await session.execute(teams_stmt)
            teams = teams_res.scalars().all()
            result.append({
                "id": t.id,
                "title": t.title,
                "subTitle": t.sub_title,
                "game": t.game,
                "discipline": t.game,
                "prizePool": t.prize_pool,
                "status": t.status,
                "date": t.dates,
                "format": t.format,
                "maxTeams": t.max_teams,
                "rules": t.rules_json,
                "bracketData": t.bracket_json,
                "teams": [
                    {
                        "id": tm.id,
                        "teamName": tm.name,
                        "tag": tm.tag,
                        "captainNick": tm.captain_nick,
                        "captainTg": tm.captain_tg,
                        "group": tm.group_name,
                        "avatar": tm.avatar,
                        "players": tm.players_json,
                        "status": tm.status,
                        "seed": tm.seed,
                        "score": tm.score
                    }
                    for tm in teams
                ]
            })
        return result


async def get_tournament_by_id(t_id: str) -> dict | None:
    """Возвращает детальную информацию о турнире."""
    async with async_session() as session:
        stmt = select(Tournament).where(Tournament.id == t_id)
        res = await session.execute(stmt)
        t = res.scalar_one_or_none()
        if not t:
            return None
        teams_stmt = select(Team).where(Team.tournament_id == t.id)
        teams_res = await session.execute(teams_stmt)
        teams = teams_res.scalars().all()
        return {
            "id": t.id,
            "title": t.title,
            "subTitle": t.sub_title,
            "game": t.game,
            "prizePool": t.prize_pool,
            "status": t.status,
            "date": t.dates,
            "format": t.format,
            "maxTeams": t.max_teams,
            "rules": t.rules_json,
            "bracketData": t.bracket_json,
            "teams": [
                {
                    "id": tm.id,
                    "teamName": tm.name,
                    "tag": tm.tag,
                    "captainNick": tm.captain_nick,
                    "captainTg": tm.captain_tg,
                    "group": tm.group_name,
                    "avatar": tm.avatar,
                    "players": tm.players_json,
                    "status": tm.status,
                    "seed": tm.seed,
                    "score": tm.score
                }
                for tm in teams
            ]
        }


async def upsert_tournament(t_data: dict) -> bool:
    """Создает или обновляет турнир в базе данных."""
    t_id = str(t_data.get("id") or "").strip()
    if not t_id:
        return False
    async with async_session() as session:
        stmt = select(Tournament).where(Tournament.id == t_id)
        res = await session.execute(stmt)
        t = res.scalar_one_or_none()
        rules_val = t_data.get("rules", "[]")
        if not isinstance(rules_val, str):
            import json
            rules_val = json.dumps(rules_val, ensure_ascii=False)
        bracket_val = t_data.get("bracketData") or t_data.get("bracket_json") or "{}"
        if not isinstance(bracket_val, str):
            import json
            bracket_val = json.dumps(bracket_val, ensure_ascii=False)

        if not t:
            t = Tournament(
                id=t_id,
                title=t_data.get("title", "Новый турнир"),
                sub_title=t_data.get("subTitle", ""),
                game=t_data.get("game") or t_data.get("discipline") or "Counter-Strike 2",
                prize_pool=t_data.get("prizePool", ""),
                status=t_data.get("status", "registration"),
                dates=t_data.get("date", ""),
                format=t_data.get("format", "Single Elimination"),
                max_teams=int(t_data.get("maxTeams", 8)),
                rules_json=rules_val,
                bracket_json=bracket_val
            )
            session.add(t)
        else:
            if "title" in t_data: t.title = t_data["title"]
            if "subTitle" in t_data: t.sub_title = t_data["subTitle"]
            if "game" in t_data: t.game = t_data["game"]
            if "prizePool" in t_data: t.prize_pool = t_data["prizePool"]
            if "status" in t_data: t.status = t_data["status"]
            if "date" in t_data: t.dates = t_data["date"]
            if "format" in t_data: t.format = t_data["format"]
            if "maxTeams" in t_data: t.max_teams = int(t_data["maxTeams"])
            if "rules" in t_data: t.rules_json = rules_val
            if "bracketData" in t_data or "bracket_json" in t_data: t.bracket_json = bracket_val
        await session.commit()
        return True


async def add_or_update_team(tournament_id: str, team_data: dict) -> bool:
    """Добавляет или обновляет команду в турнире."""
    team_id = str(team_data.get("id") or "").strip()
    if not team_id:
        return False
    async with async_session() as session:
        stmt = select(Team).where(Team.id == team_id)
        res = await session.execute(stmt)
        tm = res.scalar_one_or_none()
        players_val = team_data.get("players", "[]")
        if not isinstance(players_val, str):
            import json
            players_val = json.dumps(players_val, ensure_ascii=False)

        if not tm:
            tm = Team(
                id=team_id,
                tournament_id=tournament_id,
                name=team_data.get("teamName") or team_data.get("name") or "Команда",
                tag=team_data.get("tag", ""),
                captain_nick=team_data.get("captainNick", ""),
                captain_tg=team_data.get("captainTg", ""),
                group_name=team_data.get("group") or team_data.get("group_name") or "",
                avatar=team_data.get("avatar", ""),
                players_json=players_val,
                status=team_data.get("status", "registered"),
                seed=int(team_data.get("seed", 0)),
                score=int(team_data.get("score", 0))
            )
            session.add(tm)
        else:
            if "teamName" in team_data: tm.name = team_data["teamName"]
            elif "name" in team_data: tm.name = team_data["name"]
            if "tag" in team_data: tm.tag = team_data["tag"]
            if "captainNick" in team_data: tm.captain_nick = team_data["captainNick"]
            if "captainTg" in team_data: tm.captain_tg = team_data["captainTg"]
            if "group" in team_data or "group_name" in team_data:
                tm.group_name = team_data.get("group") or team_data.get("group_name") or ""
            if "avatar" in team_data: tm.avatar = team_data["avatar"]
            if "players" in team_data: tm.players_json = players_val
            if "status" in team_data: tm.status = team_data["status"]
            if "seed" in team_data: tm.seed = int(team_data["seed"])
            if "score" in team_data: tm.score = int(team_data["score"])
        await session.commit()
        return True


async def delete_tournament(t_id: str) -> bool:
    """Удаляет турнир и все связанные с ним команды."""
    clean_id = str(t_id).strip()
    if not clean_id:
        return False
    async with async_session() as session:
        await session.execute(delete(Team).where(Team.tournament_id == clean_id))
        stmt = delete(Tournament).where(Tournament.id == clean_id)
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0


async def delete_team(team_id: str, tournament_id: str | None = None) -> bool:
    """Удаляет команду по ID (и опционально tournament_id)."""
    clean_team_id = str(team_id).strip()
    if not clean_team_id:
        return False
    async with async_session() as session:
        conditions = [Team.id == clean_team_id]
        if tournament_id:
            conditions.append(Team.tournament_id == str(tournament_id).strip())
        stmt = delete(Team).where(and_(*conditions))
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0


async def get_system_stats() -> dict:
    """Возвращает общую статистику базы данных колледжа."""
    async with async_session() as session:
        u_count = await session.scalar(select(func.count(User.user_id)))
        g_count = await session.scalar(select(func.count(Group.id)))
        l_count = await session.scalar(select(func.count(Lesson.id)))
        r_count = await session.scalar(select(func.count(Replacement.id)))
        t_count = await session.scalar(select(func.count(Tournament.id)))
        tm_count = await session.scalar(select(func.count(Team.id)))
        return {
            "users": u_count or 0,
            "groups": g_count or 0,
            "lessons": l_count or 0,
            "replacements": r_count or 0,
            "tournaments": t_count or 0,
            "teams": tm_count or 0
        }


# =============================================================
# USER TASKS / DEADLINES CRUD
# =============================================================
async def get_user_tasks(user_id: int | str) -> list[UserTask]:
    """Возвращает список персональных заметок/заданий пользователя."""
    u_id = int(user_id)
    async with async_session() as session:
        stmt = select(UserTask).where(UserTask.user_id == u_id).order_by(UserTask.created_at.desc())
        res = await session.execute(stmt)
        return list(res.scalars().all())


async def add_or_update_user_task(
    user_id: int | str,
    task_key: str,
    text: str,
    is_done: bool = False,
    task_id: int | None = None
) -> UserTask:
    """Создает или обновляет задачу пользователя."""
    u_id = int(user_id)
    async with async_session() as session:
        if task_id:
            stmt = select(UserTask).where(and_(UserTask.id == task_id, UserTask.user_id == u_id))
            res = await session.execute(stmt)
            t = res.scalar_one_or_none()
            if t:
                t.text = text
                t.is_done = is_done
                await session.commit()
                return t

        new_task = UserTask(
            user_id=u_id,
            task_key=task_key,
            text=text,
            is_done=is_done
        )
        session.add(new_task)
        await session.commit()
        await session.refresh(new_task)
        return new_task


async def delete_user_task(user_id: int | str, task_id: int) -> bool:
    """Удаляет задачу пользователя."""
    u_id = int(user_id)
    async with async_session() as session:
        stmt = delete(UserTask).where(and_(UserTask.id == task_id, UserTask.user_id == u_id))
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0


async def get_group_deadlines(group_name: str) -> list[UserTask]:
    """Возвращает общие дедлайны группы, назначенные старостой (user_id=0, task_key='group:<group>')."""
    clean_grp = canonical_group_name(group_name)
    async with async_session() as session:
        stmt = select(UserTask).where(
            and_(
                UserTask.user_id == 0,
                or_(
                    UserTask.task_key == f"group:{clean_grp}",
                    UserTask.task_key == f"group:{group_name.strip()}"
                )
            )
        ).order_by(UserTask.created_at.desc())
        res = await session.execute(stmt)
        return list(res.scalars().all())


async def delete_group_deadline(task_id: int) -> bool:
    """Удаляет общий дедлайн группы по ID."""
    async with async_session() as session:
        stmt = delete(UserTask).where(and_(UserTask.id == task_id, UserTask.user_id == 0))
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0


