#!/usr/bin/env python3
"""
Скрипт парсинга официальных таблиц расписания колледжа AITU (Excel .xls).
Парсит все 4 курса и все 51 группу, очищает форматирование и генерирует:
1. data/all_groups_schedule.json (для бэкенда бота и миграции SQLite)
2. webapp/src/data/allGroupsSchedule.json (для Telegram WebApp)
"""

import os
import re
import json
import collections
import xlrd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCHEDULES_DIR = os.path.join(BASE_DIR, "schedules")

FILES = [
    (1, os.path.join(SCHEDULES_DIR, "Rasp_1_kurs_1_sem_26-27_s_12_10.xls")),
    (2, os.path.join(SCHEDULES_DIR, "Rasp_2_kurs_1_sem_26-27_s_7_09-2.xls")),
    (3, os.path.join(SCHEDULES_DIR, "Rasp_3_kurs_1_sem_26-27_s_7_09-2.xls")),
    (4, os.path.join(SCHEDULES_DIR, "Rasp_4_kurs_1_sem_26-27_s_12_10.xls")),
]

ACRONYMS = {
    "МДК", "ИС", "КС", "БЖД", "ОБЗР", "ПО", "ВР", "СК", "ИИ", "ЭВМ", 
    "ПД", "ОП", "СУБД", "ООП", "ИТ", "WEB", "Web", "1C", "1С", "AI", 
    "РПО", "АТ", "ТМ", "РС", "УК", "МР", "РФ"
}

def clean_subject(name: str) -> str:
    """Очищает название предмета, нормализует регистр и акронимы."""
    if not name:
        return ""
    name = re.sub(r"[\r\n\t]+", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    name = re.sub(r"МДК[\.\s]*(\d+[\.\d]*)", r"МДК \1", name, flags=re.I)

    letters = [c for c in name if c.isalpha()]
    if letters and sum(1 for c in letters if c.isupper()) / len(letters) > 0.6:
        words = name.split(" ")
        new_words = []
        for i, w in enumerate(words):
            clean_token = re.sub(r"[^\w]", "", w)
            if clean_token.upper() in ACRONYMS or re.match(r"^\d+(\.\d+)*$", clean_token):
                new_words.append(w.upper())
            elif i == 0:
                new_words.append(w.capitalize())
            else:
                new_words.append(w.lower())
        name = " ".join(new_words)
    return name

def clean_room(raw) -> str:
    """Очищает номер аудитории."""
    if raw is None or raw == "":
        return ""
    if isinstance(raw, float):
        if raw.is_integer():
            return str(int(raw))
        return str(raw)
    raw = str(raw).strip()
    # Нормализация спортзала
    raw = re.sub(r"С\\+з", "С/з", raw, flags=re.I)
    raw = re.sub(r"\.0$", "", raw)
    return raw

def split_rooms(raw_room) -> tuple[str, str]:
    """Разбивает номер кабинета для спаренных пар (числитель / знаменатель)."""
    r_str = clean_room(raw_room)
    if not r_str:
        return "", ""
    r_temp = r_str.replace("С/з", "@@SZ@@")
    # Разделение по двум или более пробелам, либо слэшу (но не внутри @@SZ@@)
    parts = [p.replace("@@SZ@@", "С/з").strip() for p in re.split(r"\s{2,}|\s*[\/\\]\s*", r_temp) if p.strip()]
    if len(parts) >= 2:
        return clean_room(parts[0]), clean_room(parts[1])
    elif len(parts) == 1:
        return clean_room(parts[0]), clean_room(parts[0])
    return "", ""

def parse_all_schedules():
    # Шаг 1: Извлечение каталога преподавателей
    group_teachers = collections.defaultdict(dict)
    course_teachers = collections.defaultdict(dict)

    for course, fpath in FILES:
        wb = xlrd.open_workbook(fpath)
        sheet = wb.sheet_by_index(0)
        for c in range(2, sheet.ncols, 2):
            grp = str(sheet.cell_value(7, c)).strip()
            if not grp:
                continue
            for r in range(8, sheet.nrows, 2):
                subj_raw = str(sheet.cell_value(r, c)).strip()
                teach_raw = str(sheet.cell_value(r + 1, c)).strip()
                if subj_raw and teach_raw and not re.search(r"[-_]{3,}", subj_raw):
                    s_clean = clean_subject(subj_raw)
                    group_teachers[grp][s_clean] = teach_raw
                    course_teachers[course][s_clean] = teach_raw

    # Шаг 2: Извлечение всех пар
    DAY_ROWS = [
        (0, range(8, 16, 2)),   # Пн
        (1, range(16, 24, 2)),  # Вт
        (2, range(24, 32, 2)),  # Ср
        (3, range(32, 40, 2)),  # Чт
        (4, range(40, 48, 2)),  # Пт
        (5, range(48, 56, 2)),  # Сб
    ]

    all_schedules = {}
    total_lessons = 0

    for course, fpath in FILES:
        wb = xlrd.open_workbook(fpath)
        sheet = wb.sheet_by_index(0)
        for c in range(2, sheet.ncols, 2):
            grp = str(sheet.cell_value(7, c)).strip()
            if not grp:
                continue
            
            grp_sched = {
                "course": course,
                "days": {}
            }

            for day_idx, rows in DAY_ROWS:
                day_map = {}
                for r in rows:
                    p_num_val = sheet.cell_value(r, 1)
                    try:
                        p_num = int(float(p_num_val))
                    except Exception:
                        continue
                    
                    subj_raw = str(sheet.cell_value(r, c)).strip()
                    room_raw = sheet.cell_value(r, c + 1)
                    teach_raw = str(sheet.cell_value(r + 1, c)).strip()

                    if not subj_raw:
                        continue

                    total_lessons += 1
                    if re.search(r"[-_]{3,}", subj_raw):
                        subjs = re.split(r"[-_]{3,}", subj_raw)
                        s1 = clean_subject(subjs[0].strip())
                        s2 = clean_subject(subjs[1].strip()) if len(subjs) > 1 else ""
                        r1, r2 = split_rooms(room_raw)
                        t1 = teach_raw or group_teachers[grp].get(s1) or course_teachers[course].get(s1, "")
                        t2 = teach_raw or group_teachers[grp].get(s2) or course_teachers[course].get(s2, "")

                        pair_obj = {"split": True}
                        if s1:
                            pair_obj["chislitel"] = {
                                "subject": s1,
                                "room": r1 or "—",
                                "teacher": t1 or "—"
                            }
                        else:
                            pair_obj["chislitel"] = None

                        if s2:
                            pair_obj["znamenatel"] = {
                                "subject": s2,
                                "room": r2 or "—",
                                "teacher": t2 or "—"
                            }
                        else:
                            pair_obj["znamenatel"] = None

                        day_map[str(p_num)] = pair_obj
                    else:
                        s_clean = clean_subject(subj_raw)
                        r_clean = clean_room(room_raw) or "—"
                        t_clean = teach_raw or group_teachers[grp].get(s_clean) or course_teachers[course].get(s_clean, "") or "—"
                        day_map[str(p_num)] = {
                            "split": False,
                            "subject": s_clean,
                            "room": r_clean,
                            "teacher": t_clean
                        }

                if day_map:
                    grp_sched["days"][str(day_idx)] = day_map

            all_schedules[grp] = grp_sched

    print(f"Парсинг успешно завершён!")
    print(f"Всего групп: {len(all_schedules)}")
    print(f"Всего занятий обработано: {total_lessons}")

    # Сохраняем в JSON для бота
    data_dir = os.path.join(BASE_DIR, "data")
    os.makedirs(data_dir, exist_ok=True)
    out_bot = os.path.join(data_dir, "all_groups_schedule.json")
    with open(out_bot, "w", encoding="utf-8") as f:
        json.dump(all_schedules, f, ensure_ascii=False, indent=2)
    print(f"Сохранено для бота: {out_bot}")

    # Сохраняем в JSON для WebApp
    webapp_data_dir = os.path.join(BASE_DIR, "webapp", "src", "data")
    os.makedirs(webapp_data_dir, exist_ok=True)
    out_webapp = os.path.join(webapp_data_dir, "allGroupsSchedule.json")
    with open(out_webapp, "w", encoding="utf-8") as f:
        json.dump(all_schedules, f, ensure_ascii=False, indent=2)
    print(f"Сохранено для WebApp: {out_webapp}")

    return all_schedules

if __name__ == "__main__":
    parse_all_schedules()
