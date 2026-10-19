import os
import json
import logging
from datetime import date
from sqlalchemy import select

from .database import async_session
from .models import Group, Lesson, User, Replacement, ChatBinding, UserRole, Tournament, Team
from schedule_data import SCHEDULE, GROUP_NAME, ALL_GROUPS_SCHEDULE, ALL_COLLEGE_GROUPS
from config import CHAT_ID, ADMIN_ID

logger = logging.getLogger(__name__)

INITIAL_GROUPS = [
    {"name": grp, "course": ALL_GROUPS_SCHEDULE.get(grp, {}).get("course", 4), "department": "Колледж AITU"}
    for grp in ALL_COLLEGE_GROUPS
]


async def run_data_migrations():
    """
    Автоматически переносит существующие данные (все 51 группа, расписание, замены, пользователи)
    из файлов Python/JSON в базу данных SQLite.
    """
    async with async_session() as session:
        # 0. Проверяем и накатываем новые столбцы уведомлений в chat_bindings до выполнения SELECT запросов
        from sqlalchemy import text
        for col_name in [
            "notify_five_min_breaks",
            "notify_10min",
            "notify_morning",
            "notify_midnight",
            "notify_replacements"
        ]:
            try:
                await session.execute(text(f"ALTER TABLE chat_bindings ADD COLUMN {col_name} BOOLEAN DEFAULT 1"))
                await session.commit()
                logger.info(f"Добавлен столбец {col_name} в chat_bindings.")
            except Exception:
                await session.rollback()

        # 1. Засеиваем группы колледжа
        res = await session.execute(select(Group))
        existing_groups = {g.name: g for g in res.scalars().all()}

        for g_data in INITIAL_GROUPS:
            if g_data["name"] not in existing_groups:
                new_group = Group(
                    name=g_data["name"],
                    course=g_data["course"],
                    department=g_data["department"]
                )
                session.add(new_group)
                existing_groups[g_data["name"]] = new_group
        await session.commit()
        logger.info(f"Группы колледжа проверены/добавлены: {len(existing_groups)} групп.")

        # 2. Переносим расписание всех 51 групп из ALL_GROUPS_SCHEDULE
        total_migrated_groups = 0
        total_migrated_lessons = 0

        for grp_name, grp_data in ALL_GROUPS_SCHEDULE.items():
            lessons_res = await session.execute(
                select(Lesson).where(Lesson.group_name == grp_name)
            )
            if not lessons_res.scalars().first():
                total_migrated_groups += 1
                days_dict = grp_data.get("days", {})
                for weekday, pairs_map in days_dict.items():
                    for pair_num, pair_val in pairs_map.items():
                        if pair_val.get("split"):
                            # Числитель
                            if pair_val.get("chislitel"):
                                c_info = pair_val["chislitel"]
                                session.add(Lesson(
                                    group_name=grp_name,
                                    weekday=weekday,
                                    pair_num=pair_num,
                                    parity="chislitel",
                                    subject=c_info.get("subject", ""),
                                    room=c_info.get("room", "—"),
                                    teacher=c_info.get("teacher", "—")
                                ))
                                total_migrated_lessons += 1
                            # Знаменатель
                            if pair_val.get("znamenatel"):
                                z_info = pair_val["znamenatel"]
                                session.add(Lesson(
                                    group_name=grp_name,
                                    weekday=weekday,
                                    pair_num=pair_num,
                                    parity="znamenatel",
                                    subject=z_info.get("subject", ""),
                                    room=z_info.get("room", "—"),
                                    teacher=z_info.get("teacher", "—")
                                ))
                                total_migrated_lessons += 1
                        else:
                            session.add(Lesson(
                                group_name=grp_name,
                                weekday=weekday,
                                pair_num=pair_num,
                                parity="both",
                                subject=pair_val.get("subject", ""),
                                room=pair_val.get("room", "—"),
                                teacher=pair_val.get("teacher", "—")
                            ))
                            total_migrated_lessons += 1

        if total_migrated_groups > 0:
            await session.commit()
            logger.info(f"Миграция расписания завершена: {total_migrated_groups} новых групп, {total_migrated_lessons} занятий.")

        # 3. Миграция замен из zameny.json
        zameny_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "zameny.json")
        if os.path.exists(zameny_file):
            try:
                with open(zameny_file, "r", encoding="utf-8") as zf:
                    z_data = json.load(zf)
                for date_str, pairs in z_data.items():
                    try:
                        d_obj = date.fromisoformat(date_str)
                    except Exception:
                        continue
                    for p_num_str, p_info in pairs.items():
                        p_num = int(p_num_str)
                        # Проверяем нет ли уже в БД
                        check_rep = await session.execute(
                            select(Replacement).where(
                                Replacement.date == d_obj,
                                Replacement.pair_num == p_num,
                                Replacement.group_name == GROUP_NAME
                            )
                        )
                        if not check_rep.scalar_one_or_none():
                            session.add(Replacement(
                                group_name=GROUP_NAME,
                                date=d_obj,
                                pair_num=p_num,
                                action_type=p_info.get("type", "replace"),
                                subject=p_info.get("subject", ""),
                                room=p_info.get("room", "—"),
                                teacher=p_info.get("teacher", "—"),
                                raw_text=p_info.get("text", "")
                            ))
                await session.commit()
                logger.info("Замены из zameny.json успешно мигрированы.")
            except Exception as e:
                logger.error(f"Ошибка миграции zameny.json: {e}")

        # 4. Миграция пользователей из user_settings.json и subscribers.json
        settings_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "user_settings.json")
        subs_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "subscribers.json")
        migrated_users = set()

        if os.path.exists(settings_file):
            try:
                with open(settings_file, "r", encoding="utf-8") as sf:
                    all_settings = json.load(sf)
                for uid_str, u_prefs in all_settings.items():
                    try:
                        uid = int(uid_str)
                    except ValueError:
                        continue
                    user_res = await session.execute(select(User).where(User.user_id == uid))
                    if not user_res.scalar_one_or_none():
                        role = UserRole.SUPERADMIN.value if (ADMIN_ID and uid == ADMIN_ID) else UserRole.STUDENT.value
                        session.add(User(
                            user_id=uid,
                            group_name=GROUP_NAME,
                            role=role,
                            remind_10min=bool(u_prefs.get("remind_10min", True)),
                            morning_alert=bool(u_prefs.get("morning_alert", False)),
                            five_min_breaks=bool(u_prefs.get("five_min_breaks", False))
                        ))
                    migrated_users.add(uid)
                await session.commit()
            except Exception as e:
                logger.error(f"Ошибка миграции user_settings.json: {e}")

        if os.path.exists(subs_file):
            try:
                with open(subs_file, "r", encoding="utf-8") as sf:
                    subs_list = json.load(sf).get("users", [])
                for uid in subs_list:
                    if uid not in migrated_users:
                        user_res = await session.execute(select(User).where(User.user_id == uid))
                        if not user_res.scalar_one_or_none():
                            session.add(User(
                                user_id=uid,
                                group_name=GROUP_NAME,
                                role=UserRole.STUDENT.value,
                                remind_10min=True
                            ))
                await session.commit()
            except Exception as e:
                logger.error(f"Ошибка миграции subscribers.json: {e}")

        # 5. Привязка CHAT_ID группы 9ПО-43к
        if CHAT_ID:
            try:
                numeric_chat_id = int(CHAT_ID)
                chat_check = await session.execute(select(ChatBinding).where(ChatBinding.chat_id == numeric_chat_id))
                if not chat_check.scalar_one_or_none():
                    session.add(ChatBinding(
                        chat_id=numeric_chat_id,
                        chat_title="Группа 9ПО-43к (AITU)",
                        group_name=GROUP_NAME
                    ))
                    await session.commit()
                    logger.info(f"Основной чат {numeric_chat_id} привязан к группе {GROUP_NAME}.")
            except (ValueError, TypeError) as ex:
                logger.warning(f"Некорректный CHAT_ID '{CHAT_ID}': {ex}")

        # 6. Турниры и команды киберспорта (засеиваются строго 1 раз при первичной инициализации)
        try:
            init_flag = await session.execute(
                select(ChatBinding).where(ChatBinding.group_name == "__SYSTEM_INIT_TOURNAMENTS__")
            )
            if not init_flag.scalar_one_or_none():
                # Первичный запуск: фиксируем флаг инициализации
                session.add(ChatBinding(chat_id=0, group_name="__SYSTEM_INIT_TOURNAMENTS__"))
                await session.commit()
                logger.info("Флаг первичной инициализации турниров сохранен.")
        except Exception as te:
            logger.error(f"Ошибка проверки флага турниров: {te}")


# Псевдоним для удобства импорта
run_migration = run_data_migrations

