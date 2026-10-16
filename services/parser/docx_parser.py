import re
import asyncio
import logging
from datetime import date, datetime
from typing import Any
import docx

from db.crud import add_replacement_record, add_group, normalize_group_name
from schedule_data import get_course_from_group_name
from config import BOT_TZ

logger = logging.getLogger(__name__)

MONTHS_RU = {
    "января": 1, "февраля": 2, "марта": 3, "апреля": 4,
    "мая": 5, "июня": 6, "июля": 7, "августа": 8,
    "сентября": 9, "октября": 10, "ноября": 11, "декабря": 12
}


def _extract_date_from_text(text: str) -> date | None:
    """Извлекает дату вида ДД.ММ.ГГГГ или '19 октября 2026'."""
    # Шаблон 1: 19.10.2026
    m1 = re.search(r'(\d{1,2})[./](\d{1,2})[./](\d{2,4})', text)
    if m1:
        d, m, y = int(m1.group(1)), int(m1.group(2)), int(m1.group(3))
        if y < 100:
            y += 2000
        try:
            return date(y, m, d)
        except ValueError:
            pass

    # Шаблон 2: 19 октября 2026
    m2 = re.search(r'(\d{1,2})\s+([а-яё]+)\s*(\d{4})?', text.lower())
    if m2:
        d = int(m2.group(1))
        month_name = m2.group(2)
        y = int(m2.group(3)) if m2.group(3) else datetime.now(BOT_TZ).year
        if month_name in MONTHS_RU:
            try:
                return date(y, MONTHS_RU[month_name], d)
            except ValueError:
                pass

    return None


def parse_docx_replacements_sync(file_path: str) -> dict[str, Any]:
    """
    Синхронный парсер Word (.docx) документа с заменами.
    Анализирует текст заголовка для определения даты и таблицы для извлечения замен.
    """
    doc = docx.Document(file_path)
    result = {
        "date": None,
        "date_str": None,
        "replacements": [],
        "groups_affected": set(),
        "total_parsed": 0,
        "errors": []
    }

    full_text = " ".join([p.text.strip() for p in doc.paragraphs if p.text.strip()])
    target_date = _extract_date_from_text(full_text)
    if not target_date:
        # Если в тексте параграфов дата не найдена, ищем в таблицах
        for table in doc.tables:
            for row in table.rows[:3]:
                row_str = " ".join([c.text.strip() for c in row.cells])
                target_date = _extract_date_from_text(row_str)
                if target_date:
                    break
            if target_date:
                break

    if not target_date:
        # По умолчанию берем завтрашнюю дату
        target_date = datetime.now(BOT_TZ).date()

    result["date"] = target_date
    result["date_str"] = target_date.strftime("%Y-%m-%d")

    group_regex = re.compile(r'\b(\d{1,2}[А-Яа-яA-Za-z]{1,4}-\d{1,3}[а-яА-Яa-zA-Z]?)\b')
    room_regex = re.compile(r'(?:каб\.?|ауд\.?|№)?\s*(\d{2,4}[а-яА-Я]?)')

    for table in doc.tables:
        col_group = -1
        col_pair = -1
        col_replace = -1
        col_room = -1
        col_teacher = -1

        rows = table.rows
        if not rows:
            continue

        # Пытаемся определить шапку таблицы
        header_row_idx = 0
        for r_idx in range(min(3, len(rows))):
            cells = [c.text.lower().strip() for c in rows[r_idx].cells]
            for c_idx, cell_text in enumerate(cells):
                if "групп" in cell_text:
                    col_group = c_idx
                elif "пара" in cell_text or "урок" in cell_text or "№" in cell_text:
                    col_pair = c_idx
                elif "замен" in cell_text or "предмет" in cell_text or "дисциплин" in cell_text:
                    col_replace = c_idx
                elif "каб" in cell_text or "ауд" in cell_text:
                    col_room = c_idx
                elif "препод" in cell_text or "учител" in cell_text or "фио" in cell_text:
                    col_teacher = c_idx

            if col_group != -1 or col_pair != -1:
                header_row_idx = r_idx + 1
                break

        # Разбор строк с данными
        current_group = None
        for r_idx in range(header_row_idx, len(rows)):
            row = rows[r_idx]
            cells = [c.text.strip() for c in row.cells]
            if not any(cells):
                continue

            row_full = " ".join(cells)
            grp_m = group_regex.search(row_full)
            if grp_m:
                current_group = normalize_group_name(grp_m.group(1))
            elif col_group != -1 and col_group < len(cells) and cells[col_group]:
                g_cand = group_regex.search(cells[col_group])
                if g_cand:
                    current_group = normalize_group_name(g_cand.group(1))

            if not current_group:
                continue

            # Поиск номера пары
            pair_num = 1
            if col_pair != -1 and col_pair < len(cells):
                pair_val = cells[col_pair]
                m_pair = re.search(r'\b([1-6])\b', pair_val)
                if m_pair:
                    pair_num = int(m_pair.group(1))
            else:
                m_pair = re.search(r'\b([1-6])\s*пара\b', row_full.lower())
                if m_pair:
                    pair_num = int(m_pair.group(1))

            # Проверка отмены или замены
            is_cancel = any(w in row_full.lower() for w in ["отмен", "снят", "нет пары", "не будет"])
            action_type = "cancel" if is_cancel else "replace"

            # Предмет и детали
            subject = ""
            if col_replace != -1 and col_replace < len(cells):
                subject = cells[col_replace]
            else:
                subject = row_full

            # Кабинет
            room = "—"
            if col_room != -1 and col_room < len(cells) and cells[col_room]:
                room = cells[col_room]
            else:
                m_room = room_regex.search(row_full)
                if m_room:
                    room = m_room.group(1)

            # Преподаватель
            teacher = "—"
            if col_teacher != -1 and col_teacher < len(cells) and cells[col_teacher]:
                teacher = cells[col_teacher]

            rep_item = {
                "group_name": current_group,
                "pair_num": pair_num,
                "action_type": action_type,
                "subject": subject[:250],
                "room": room[:50],
                "teacher": teacher[:100],
                "raw_text": row_full[:400]
            }
            result["replacements"].append(rep_item)
            result["groups_affected"].add(current_group)
            result["total_parsed"] += 1

    return result


async def parse_and_apply_docx_replacements(file_path: str, created_by: int = 0) -> dict[str, Any]:
    """
    Асинхронно парсит Word-файл замен и сохраняет их в базу данных.
    """
    data = await asyncio.to_thread(parse_docx_replacements_sync, file_path)
    target_date = data["date"]

    applied_count = 0
    for item in data.get("replacements", []):
        grp = item["group_name"]
        await add_group(grp, course=get_course_from_group_name(grp))

        await add_replacement_record(
            target_date=target_date,
            pair_num=item["pair_num"],
            action_type=item["action_type"],
            subject=item["subject"],
            room=item["room"],
            teacher=item["teacher"],
            raw_text=item["raw_text"],
            group_name=grp,
            created_by=created_by
        )
        applied_count += 1

    data["applied_count"] = applied_count
    return data
