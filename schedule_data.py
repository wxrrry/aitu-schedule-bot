"""
Расписание занятий для группы 9ПО-43к (AITU).
Расписание звонков:
1 пара: 09:00 - 10:35 (перерыв 5 мин внутри)
2 пара: 10:45 - 12:20
Обед:   12:20 - 12:55
3 пара: 12:55 - 14:30
4 пара: 14:40 - 16:15
"""

GROUP_NAME = "9ПО-43к"

import re

# Расписание звонков по курсам колледжа (в точном соответствии с официальным графиком AITU)
COURSE_BELL_SCHEDULE = {
    1: {
        1: {
            "range": "09:00 — 10:35",
            "part1": "09:00 – 09:45",
            "break": "09:45 – 09:50 (5 мин)",
            "part2": "09:50 – 10:35",
            "breakdown": "09:00–09:45 • перерыв 5 мин • 09:50–10:35"
        },
        2: {
            "range": "11:10 — 12:45",
            "part1": "11:10 – 11:55",
            "break": "11:55 – 12:00 (5 мин)",
            "part2": "12:00 – 12:45",
            "breakdown": "11:10–11:55 • перерыв 5 мин • 12:00–12:45"
        },
        3: {
            "range": "12:55 — 14:30",
            "part1": "12:55 – 13:40",
            "break": "13:40 – 13:45 (5 мин)",
            "part2": "13:45 – 14:30",
            "breakdown": "12:55–13:40 • перерыв 5 мин • 13:45–14:30"
        },
        4: {
            "range": "14:40 — 16:15",
            "part1": "14:40 – 15:25",
            "break": "15:25 – 15:30 (5 мин)",
            "part2": "15:30 – 16:15",
            "breakdown": "14:40–15:25 • перерыв 5 мин • 15:30–16:15"
        },
    },
    2: {
        1: {
            "range": "09:00 — 10:35",
            "part1": "09:00 – 09:45",
            "break": "09:45 – 09:50 (5 мин)",
            "part2": "09:50 – 10:35",
            "breakdown": "09:00–09:45 • перерыв 5 мин • 09:50–10:35"
        },
        2: {
            "range": "10:45 — 12:45",
            "part1": "10:45 – 11:30",
            "lunch": "11:30 – 12:00 (ОБЕД 30 мин)",
            "part2": "12:00 – 12:45",
            "breakdown": "10:45–11:30 • ОБЕД 30 мин • 12:00–12:45"
        },
        3: {
            "range": "12:55 — 14:30",
            "part1": "12:55 – 13:40",
            "break": "13:40 – 13:45 (5 мин)",
            "part2": "13:45 – 14:30",
            "breakdown": "12:55–13:40 • перерыв 5 мин • 13:45–14:30"
        },
        4: {
            "range": "14:40 — 16:15",
            "part1": "14:40 – 15:25",
            "break": "15:25 – 15:30 (5 мин)",
            "part2": "15:30 – 16:15",
            "breakdown": "14:40–15:25 • перерыв 5 мин • 15:30–16:15"
        },
    },
    3: {
        1: {
            "range": "09:00 — 10:35",
            "part1": "09:00 – 09:45",
            "break": "09:45 – 09:50 (5 мин)",
            "part2": "09:50 – 10:35",
            "breakdown": "09:00–09:45 • перерыв 5 мин • 09:50–10:35"
        },
        2: {
            "range": "10:45 — 12:20",
            "part1": "10:45 – 11:30",
            "break": "11:30 – 11:35 (5 мин)",
            "part2": "11:35 – 12:20",
            "breakdown": "10:45–11:30 • перерыв 5 мин • 11:35–12:20"
        },
        3: {
            "range": "12:55 — 14:30",
            "part1": "12:55 – 13:40",
            "break": "13:40 – 13:45 (5 мин)",
            "part2": "13:45 – 14:30",
            "breakdown": "12:55–13:40 • перерыв 5 мин • 13:45–14:30"
        },
        4: {
            "range": "14:40 — 16:15",
            "part1": "14:40 – 15:25",
            "break": "15:25 – 15:30 (5 мин)",
            "part2": "15:30 – 16:15",
            "breakdown": "14:40–15:25 • перерыв 5 мин • 15:30–16:15"
        },
    },
    4: {
        1: {
            "range": "09:00 — 10:35",
            "part1": "09:00 – 09:45",
            "break": "09:45 – 09:50 (5 мин)",
            "part2": "09:50 – 10:35",
            "breakdown": "09:00–09:45 • перерыв 5 мин • 09:50–10:35"
        },
        2: {
            "range": "10:45 — 12:20",
            "part1": "10:45 – 11:30",
            "break": "11:30 – 11:35 (5 мин)",
            "part2": "11:35 – 12:20",
            "breakdown": "10:45–11:30 • перерыв 5 мин • 11:35–12:20"
        },
        3: {
            "range": "12:55 — 14:30",
            "part1": "12:55 – 13:40",
            "break": "13:40 – 13:45 (5 мин)",
            "part2": "13:45 – 14:30",
            "breakdown": "12:55–13:40 • перерыв 5 мин • 13:45–14:30"
        },
        4: {
            "range": "14:40 — 16:15",
            "part1": "14:40 – 15:25",
            "break": "15:25 – 15:30 (5 мин)",
            "part2": "15:30 – 16:15",
            "breakdown": "14:40–15:25 • перерыв 5 мин • 15:30–16:15"
        },
    },
}

# Временные интервалы (старт, конец) для определения текущего статуса
COURSE_BELL_TIMES = {
    1: {
        1: ("09:00", "10:35"),
        2: ("11:10", "12:45"),
        3: ("12:55", "14:30"),
        4: ("14:40", "16:15"),
    },
    2: {
        1: ("09:00", "10:35"),
        2: ("10:45", "12:45"),
        3: ("12:55", "14:30"),
        4: ("14:40", "16:15"),
    },
    3: {
        1: ("09:00", "10:35"),
        2: ("10:45", "12:20"),
        3: ("12:55", "14:30"),
        4: ("14:40", "16:15"),
    },
    4: {
        1: ("09:00", "10:35"),
        2: ("10:45", "12:20"),
        3: ("12:55", "14:30"),
        4: ("14:40", "16:15"),
    },
}

# Информация об обеденных перерывах по курсам
COURSE_LUNCH = {
    1: {
        "start": "10:35",
        "end": "11:10",
        "duration": "35 минут",
        "location": "после 1-й пары",
        "desc": "Обед после 1-й пары (10:35 — 11:10)"
    },
    2: {
        "start": "11:30",
        "end": "12:00",
        "duration": "30 минут",
        "location": "внутри 2-й пары",
        "desc": "Обед внутри 2-й пары (11:30 — 12:00)"
    },
    3: {
        "start": "12:20",
        "end": "12:55",
        "duration": "35 минут",
        "location": "после 2-й пары",
        "desc": "Обед после 2-й пары (12:20 — 12:55)"
    },
    4: {
        "start": "12:20",
        "end": "12:55",
        "duration": "35 минут",
        "location": "после 2-й пары",
        "desc": "Обед после 2-й пары (12:20 — 12:55)"
    },
}


import os
import json

_JSON_SCHEDULES_PATH = os.path.join(os.path.dirname(__file__), "data", "all_groups_schedule.json")

def _load_all_groups_schedule() -> dict[str, dict]:
    """Загружает полное расписание всех 51 группы колледжа AITU из JSON."""
    if os.path.exists(_JSON_SCHEDULES_PATH):
        try:
            with open(_JSON_SCHEDULES_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                result = {}
                for grp, grp_info in data.items():
                    course = grp_info.get("course", 4)
                    days_formatted = {d: {} for d in range(7)}
                    for d_str, pairs in grp_info.get("days", {}).items():
                        try:
                            d_idx = int(d_str)
                            pairs_map = {}
                            for p_str, p_val in pairs.items():
                                pairs_map[int(p_str)] = p_val
                            days_formatted[d_idx] = pairs_map
                        except Exception:
                            continue
                    result[grp] = {
                        "course": course,
                        "days": days_formatted
                    }
                return result
        except Exception as e:
            pass
    return {}

ALL_GROUPS_SCHEDULE = _load_all_groups_schedule()

ALL_COLLEGE_GROUPS = list(ALL_GROUPS_SCHEDULE.keys()) if ALL_GROUPS_SCHEDULE else [GROUP_NAME]

GROUPS_BY_COURSE: dict[int, list[str]] = {1: [], 2: [], 3: [], 4: []}
for grp, grp_data in ALL_GROUPS_SCHEDULE.items():
    c = grp_data.get("course", 4)
    if c in GROUPS_BY_COURSE:
        GROUPS_BY_COURSE[c].append(grp)
    else:
        GROUPS_BY_COURSE.setdefault(c, []).append(grp)

for c in GROUPS_BY_COURSE:
    GROUPS_BY_COURSE[c].sort()


def get_schedule_for_group(group_name: str | None) -> dict[int, dict]:
    """Возвращает расписание по дням недели для указанной группы."""
    if not group_name:
        group_name = GROUP_NAME
    if group_name in ALL_GROUPS_SCHEDULE:
        return ALL_GROUPS_SCHEDULE[group_name]["days"]
    return SCHEDULE


def get_course_from_group_name(group_name: str | None) -> int:
    """
    Определяет номер курса (1, 2, 3, 4) по названию группы.
    Примеры:
    - 9ПО-43к -> 4
    - 9РПО-11 -> 1
    - 9ПО-21  -> 2
    - 9ПО-31  -> 3
    """
    if not group_name:
        return 4
    if group_name in ALL_GROUPS_SCHEDULE:
        return ALL_GROUPS_SCHEDULE[group_name]["course"]
    # Основной паттерн: цифра курса сразу после дефиса, например -43к, -11, -21, -31
    m = re.search(r"-([1-4])", group_name)
    if m:
        try:
            return int(m.group(1))
        except (ValueError, TypeError):
            pass
    # Запасной паттерн: цифра курса 1-4 перед второй цифрой
    m2 = re.search(r"[^0-9]([1-4])\d", group_name)
    if m2:
        try:
            return int(m2.group(1))
        except (ValueError, TypeError):
            pass
    return 4



def get_bell_schedule(course: int = 4) -> dict:
    """Возвращает расписание звонков для указанного курса (1..4)."""
    if course not in COURSE_BELL_SCHEDULE:
        course = 4
    return COURSE_BELL_SCHEDULE[course]


def get_bell_times(course: int = 4) -> dict[int, tuple[str, str]]:
    """Возвращает временные интервалы пар для указанного курса (1..4)."""
    if course not in COURSE_BELL_TIMES:
        course = 4
    return COURSE_BELL_TIMES[course]


def get_course_lunch_info(course: int = 4) -> dict:
    """Возвращает информацию об обеденном перерыве курса."""
    if course not in COURSE_LUNCH:
        course = 4
    return COURSE_LUNCH[course]


# Обратная совместимость с кодом под 4 курс (9ПО-43к)
BELL_SCHEDULE = COURSE_BELL_SCHEDULE[4]
BELL_TIMES = COURSE_BELL_TIMES[4]

NUMBER_EMOJIS = {
    1: "1️⃣",
    2: "2️⃣",
    3: "3️⃣",
    4: "4️⃣",
    5: "5️⃣",
    6: "6️⃣",
}

DAYS_RU = [
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
    "Воскресенье"
]

# Расписание по дням недели (0 = Пн, 1 = Вт, ..., 6 = Вс)
# Если пара чередуется по числителю/знаменателю — указываем split: True
SCHEDULE = {
    0: {  # Понедельник
        1: {
            "split": True,
            "chislitel": {
                "subject": "МДК 04.01 Внедрение и поддержка КС",
                "room": "305",
                "teacher": "Смирнова Анастасия Владимировна"
            },
            "znamenatel": {
                "subject": "Физическая культура",
                "room": "С/з",
                "teacher": "Червинский Виталий Иванович"
            }
        },
        2: {
            "split": False,
            "subject": "Психология общения",
            "room": "520",
            "teacher": "Ерошкина Марина Юрьевна"
        },
        3: {
            "split": False,
            "subject": "Безопасность жизнедеятельности (БЖД)",
            "room": "505",
            "teacher": "Осипов Денис Леонидович"
        },
        4: {
            "split": False,
            "subject": "Безопасность жизнедеятельности (БЖД)",
            "room": "505",
            "teacher": "Осипов Денис Леонидович"
        }
    },
    1: {  # Вторник
        1: {
            "split": False,
            "subject": "Безопасность жизнедеятельности (БЖД)",
            "room": "505",
            "teacher": "Осипов Денис Леонидович"
        },
        2: {
            "split": True,
            "chislitel": {
                "subject": "Менеджмент в ПД",
                "room": "612",
                "teacher": "Избасарова А.К."
            },
            "znamenatel": {
                "subject": "МДК 07.02 Сертификация ИС",
                "room": "622",
                "teacher": "Щербакова Мария Александровна"
            }
        },
        3: {
            "split": False,
            "subject": "МДК 04.01 Внедрение и поддержка КС",
            "room": "305",
            "teacher": "Смирнова Анастасия Владимировна"
        },
        4: {
            "split": True,
            "chislitel": {
                "subject": "Иностранный язык",
                "room": "515",
                "teacher": "Клещева Елена Георгиевна"
            },
            "znamenatel": None
        }
    },
    2: {  # Среда
        # 1 пары нет
        2: {
            "split": False,
            "subject": "Менеджмент в ПД",
            "room": "609",
            "teacher": "Избасарова А.К."
        },
        3: {
            "split": False,
            "subject": "МДК 04.02 Обеспечение качества КС",
            "room": "308",
            "teacher": "Никулина Валентина Андреевна"
        },
        4: {
            "split": False,
            "subject": "МДК 04.02 Обеспечение качества КС",
            "room": "308",
            "teacher": "Никулина Валентина Андреевна"
        }
    },
    3: {  # Четверг
        1: {
            "split": False,
            "subject": "Физическая культура",
            "room": "С/з",
            "teacher": "Червинский Виталий Иванович"
        },
        2: {
            "split": False,
            "subject": "Иностранный язык",
            "room": "515",
            "teacher": "Клещева Елена Георгиевна"
        },
        3: {
            "split": False,
            "subject": "МДК 07.02 Сертификация ИС",
            "room": "304",
            "teacher": "Щербакова Мария Александровна"
        },
        4: {
            "split": True,
            "chislitel": None,  # Только по знаменателям
            "znamenatel": {
                "subject": "Психология общения",
                "room": "609",
                "teacher": "Ерошкина Марина Юрьевна"
            }
        }
    },
    4: {  # Пятница
        1: {
            "split": True,
            "chislitel": None,  # Только по знаменателям
            "znamenatel": {
                "subject": "Экономика отрасли",
                "room": "711",
                "teacher": "Петрова Елена Александровна"
            }
        },
        2: {
            "split": False,
            "subject": "Экономика отрасли",
            "room": "711",
            "teacher": "Петрова Елена Александровна"
        },
        3: {
            "split": False,
            "subject": "МДК 04.01 Внедрение и поддержка КС",
            "room": "305",
            "teacher": "Смирнова Анастасия Владимировна"
        },
        4: {
            "split": False,
            "subject": "МДК 07.02 Сертификация ИС",
            "room": "422",
            "teacher": "Щербакова Мария Александровна"
        }
    },
    5: {},  # Суббота — пар нет
    6: {}   # Воскресенье — пар нет
}
