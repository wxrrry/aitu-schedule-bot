import os
import re
import asyncio
import logging
from typing import Any
import openpyxl

from db.crud import add_group, add_or_update_lesson, normalize_group_name
from schedule_data import get_course_from_group_name

logger = logging.getLogger(__name__)

WEEKDAYS_MAP = {
    "понедельник": 0, "пн": 0,
    "вторник": 1, "вт": 1,
    "среда": 2, "ср": 2,
    "четверг": 3, "чт": 3,
    "пятница": 4, "пт": 4,
    "суббота": 5, "сб": 5
}


def _clean_str(val: Any) -> str:
    if val is None:
        return ""
    return str(val).strip()


def parse_excel_sync(file_path: str) -> dict[str, Any]:
    """
    Синхронный парсинг Excel-файла семестрового расписания.
    Поддерживает стандартные структуры расписания СПО/вузов:
    - По листам (каждый лист = курс или группа)
    - Строки/колонки дней недели, номеров пар (1..5), числителя/знаменателя
    """
    wb = openpyxl.load_workbook(file_path, data_only=True)
    results = {
        "groups_found": set(),
        "lessons": [],
        "lessons_parsed": 0,
        "errors": []
    }

    group_regex = re.compile(r'\b(\d{1,2}[А-Яа-яA-Za-z]{1,4}-\d{1,3}[а-яА-Яa-zA-Z]?)\b')
    room_regex = re.compile(r'(?:каб\.?|ауд\.?|№)?\s*(\d{2,4}[а-яА-Я]?)')

    for sheet_name in wb.sheetnames:
        sheet = wb[sheet_name]
        max_row = min(sheet.max_row, 300)
        max_col = min(sheet.max_column, 50)

        # 1. Поиск колонок или ячеек с названиями групп
        group_cols: dict[int, str] = {}
        for r in range(1, min(max_row, 10)):
            for c in range(1, max_col + 1):
                val = _clean_str(sheet.cell(row=r, column=c).value)
                m = group_regex.search(val)
                if m:
                    grp_name = normalize_group_name(m.group(1))
                    group_cols[c] = grp_name
                    results["groups_found"].add(grp_name)

        current_weekday = None
        current_pair_num = None

        for r in range(1, max_row + 1):
            row_text = " ".join([_clean_str(sheet.cell(row=r, column=c).value) for c in range(1, min(max_col, 5))]).lower()

            # Определение дня недели
            for day_name, day_idx in WEEKDAYS_MAP.items():
                if day_name in row_text:
                    current_weekday = day_idx
                    break

            # Определение номера пары (1..6)
            for c in range(1, min(max_col, 4)):
                cell_val = _clean_str(sheet.cell(row=r, column=c).value)
                if cell_val.isdigit() and 1 <= int(cell_val) <= 6:
                    current_pair_num = int(cell_val)
                    break

            if current_weekday is None or current_pair_num is None:
                continue

            # Считывание предметов по найденным колонкам групп
            for col_idx, grp_name in group_cols.items():
                cell_content = _clean_str(sheet.cell(row=r, column=col_idx).value)
                if not cell_content or len(cell_content) < 3:
                    continue

                # Извлечение кабинета
                room = "—"
                room_m = room_regex.search(cell_content)
                if room_m:
                    room = room_m.group(1)

                # Проверка числителя/знаменателя (если ячейка разделена слэшем)
                if "/" in cell_content and len(cell_content.split("/")) == 2:
                    parts = cell_content.split("/")
                    for parity, subj_part in [("chislitel", parts[0].strip()), ("znamenatel", parts[1].strip())]:
                        if subj_part:
                            results["lessons"].append({
                                "group_name": grp_name,
                                "weekday": current_weekday,
                                "pair_num": current_pair_num,
                                "parity": parity,
                                "subject": subj_part,
                                "room": room
                            })
                            results["lessons_parsed"] += 1
                else:
                    results["lessons"].append({
                        "group_name": grp_name,
                        "weekday": current_weekday,
                        "pair_num": current_pair_num,
                        "parity": "both",
                        "subject": cell_content,
                        "room": room
                    })
                    results["lessons_parsed"] += 1

    wb.close()
    return results


async def parse_and_apply_excel_schedule(file_path: str) -> dict[str, Any]:
    """
    Асинхронная обёртка для парсинга и сохранения расписания в SQLite.
    Выполняется в отдельном потоке (asyncio.to_thread), чтобы не блокировать бота.
    """
    results = await asyncio.to_thread(parse_excel_sync, file_path)
    
    # Сохраняем найденные группы в БД
    for grp in results.get("groups_found", []):
        course = get_course_from_group_name(grp)
        await add_group(grp, course=course)

    # Сохраняем все уроки в БД
    applied_count = 0
    for lesson in results.get("lessons", []):
        await add_or_update_lesson(
            group_name=lesson["group_name"],
            weekday=lesson["weekday"],
            pair_num=lesson["pair_num"],
            parity=lesson["parity"],
            subject=lesson["subject"],
            room=lesson["room"]
        )
        applied_count += 1

    results["applied_count"] = applied_count
    return results
