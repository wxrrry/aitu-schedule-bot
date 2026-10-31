import os
import json
import logging
import sqlite3
from datetime import datetime, date, timedelta
from config import BOT_TZ
from schedule_data import DAYS_RU, BELL_SCHEDULE

logger = logging.getLogger(__name__)

def _get_db_path() -> str:
    from db.database import DB_PATH
    return DB_PATH

def parse_date_input(input_str: str) -> date | None:
    """
    Парсит дату из пользовательского ввода:
    - 'сегодня', 'today'
    - 'завтра', 'tomorrow'
    - 'послезавтра'
    - '16.10', '16.10.2026', '16/10'
    - '2026-10-16'
    """
    s = input_str.strip().lower()
    today = datetime.now(BOT_TZ).date()

    if s in ("сегодня", "today"):
        return today
    if s in ("завтра", "tomorrow"):
        return today + timedelta(days=1)
    if s in ("послезавтра", "day_after_tomorrow"):
        return today + timedelta(days=2)

    s = s.replace("/", ".")
    parts = s.split(".")
    if len(parts) == 2:
        try:
            day = int(parts[0])
            month = int(parts[1])
            return date(today.year, month, day)
        except Exception:
            return None
    elif len(parts) == 3:
        try:
            day = int(parts[0])
            month = int(parts[1])
            year = int(parts[2])
            if year < 100:
                year += 2000
            return date(year, month, day)
        except Exception:
            return None

    try:
        return date.fromisoformat(s)
    except Exception:
        return None

def add_replacement(target_date: date, pair_num: int, text: str, author: str = "", group_name: str | None = None) -> dict:
    """
    Добавляет замену или отмену пары в базу данных SQLite.
    """
    clean_text = text.strip()
    lower_text = clean_text.lower()
    is_cancel = lower_text in ("отмена", "отменена", "отменить", "нет", "cancel", "нет пары")
    action_type = "cancel" if is_cancel else "replace"
    display_text = "Пара отменена" if is_cancel else clean_text

    db_path = _get_db_path()
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path, timeout=5)
            cur = conn.cursor()
            d_str = target_date.strftime("%Y-%m-%d")
            # Delete any existing replacement for this date, group and pair
            if group_name:
                cur.execute("DELETE FROM replacements WHERE date = ? AND pair_num = ? AND group_name = ?", (d_str, pair_num, group_name))
            else:
                cur.execute("DELETE FROM replacements WHERE date = ? AND pair_num = ? AND group_name IS NULL", (d_str, pair_num))

            cur.execute(
                "INSERT INTO replacements (date, group_name, pair_num, action_type, subject, room, teacher, raw_text, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))",
                (d_str, group_name, pair_num, action_type, display_text, "—", "—", clean_text)
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"SQLite error adding replacement: {e}")

    return {
        "type": action_type,
        "text": display_text,
        "author": author,
        "created_at": datetime.now(BOT_TZ).strftime("%Y-%m-%d %H:%M")
    }

def delete_replacement(target_date: date, pair_num: int, group_name: str | None = None) -> bool:
    """
    Удаляет запись о замене/отмене пары из SQLite.
    """
    db_path = _get_db_path()
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path, timeout=5)
            cur = conn.cursor()
            d_str = target_date.strftime("%Y-%m-%d")
            if group_name:
                cur.execute("DELETE FROM replacements WHERE (date = ? OR date = ?) AND pair_num = ? AND group_name = ?", (d_str, target_date.isoformat(), pair_num, group_name))
            else:
                cur.execute("DELETE FROM replacements WHERE (date = ? OR date = ?) AND pair_num = ?", (d_str, target_date.isoformat(), pair_num))
            rc = cur.rowcount
            conn.commit()
            conn.close()
            return rc > 0
        except Exception as e:
            logger.error(f"SQLite error deleting replacement: {e}")
    return False

def get_replacements_for_date(target_date: date, group_name: str | None = None) -> dict[int, dict]:
    """
    Возвращает словарь {pair_num (int): entry_dict} для заданной даты и группы из SQLite.
    """
    db_path = _get_db_path()
    res = {}
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path, timeout=5)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            d_str = target_date.strftime("%Y-%m-%d")
            d_iso = target_date.isoformat()
            if group_name:
                cur.execute(
                    "SELECT pair_num, action_type, subject, room, teacher, raw_text FROM replacements "
                    "WHERE (date = ? OR date = ?) AND (group_name = ? OR group_name IS NULL)",
                    (d_str, d_iso, group_name)
                )
            else:
                cur.execute(
                    "SELECT pair_num, action_type, subject, room, teacher, raw_text FROM replacements "
                    "WHERE date = ? OR date = ?",
                    (d_str, d_iso)
                )
            rows = cur.fetchall()
            conn.close()
            for r in rows:
                p_num = r["pair_num"]
                res[p_num] = {
                    "type": r["action_type"],
                    "text": r["raw_text"] or r["subject"],
                    "subject": r["subject"],
                    "room": r["room"],
                    "teacher": r["teacher"]
                }
        except Exception as e:
            logger.debug(f"SQLite get_replacements_for_date error: {e}")
    return res

def get_all_upcoming_replacements(start_date: date | None = None, days_ahead: int = 14, group_name: str | None = None) -> list[dict]:
    """
    Возвращает список всех предстоящих замен начиная с start_date из базы данных SQLite.
    """
    if start_date is None:
        start_date = datetime.now(BOT_TZ).date()

    end_date = start_date + timedelta(days=days_ahead)
    d_start_str = start_date.strftime("%Y-%m-%d")
    d_end_str = end_date.strftime("%Y-%m-%d")

    db_path = _get_db_path()
    results = []
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path, timeout=5)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            if group_name:
                cur.execute(
                    "SELECT id, date, group_name, pair_num, action_type, subject, room, teacher, raw_text FROM replacements "
                    "WHERE date >= ? AND date <= ? AND (group_name = ? OR group_name IS NULL) ORDER BY date, pair_num",
                    (d_start_str, d_end_str, group_name)
                )
            else:
                cur.execute(
                    "SELECT id, date, group_name, pair_num, action_type, subject, room, teacher, raw_text FROM replacements "
                    "WHERE date >= ? AND date <= ? ORDER BY date, pair_num",
                    (d_start_str, d_end_str)
                )
            rows = cur.fetchall()
            conn.close()
            for r in rows:
                d_val = r["date"]
                try:
                    d_obj = date.fromisoformat(str(d_val))
                except Exception:
                    continue
                results.append({
                    "date": d_obj,
                    "date_str": d_val,
                    "pair_num": r["pair_num"],
                    "group": r["group_name"],
                    "type": r["action_type"],
                    "text": r["raw_text"] or r["subject"],
                    "subject": r["subject"],
                    "room": r["room"],
                    "teacher": r["teacher"]
                })
        except Exception as e:
            logger.debug(f"SQLite get_all_upcoming_replacements error: {e}")
    return results

def format_replacements_summary(group_name: str | None = None) -> str:
    """Генерирует форматированный текст со списком всех активных замен."""
    reps = get_all_upcoming_replacements(days_ahead=7, group_name=group_name)
    if not reps:
        grp_label = f" для группы <code>{group_name}</code>" if group_name else ""
        return f"🎉 <b>Замен и отмен нет!</b>\n\nВсе пары{grp_label} идут строго по расписанию."

    lines = [
        "⚠️ <b>Актуальные замены и отмены пар:</b>\n"
        "──────────────────────\n"
    ]
    by_date: dict[date, list] = {}
    for r in reps:
        by_date.setdefault(r["date"], []).append(r)

    for d_obj in sorted(by_date.keys()):
        w_day = DAYS_RU[d_obj.weekday()]
        lines.append(f"📅 <b>{w_day} ({d_obj.strftime('%d.%m.%Y')}):</b>")
        for item in sorted(by_date[d_obj], key=lambda x: x["pair_num"]):
            p_num = item["pair_num"]
            p_time = BELL_SCHEDULE.get(p_num, {}).get("range", "")
            icon = "❌" if item["type"] == "cancel" else "🔄"
            lines.append(f"  {icon} <b>{p_num} пара ({p_time}):</b> {item['text']}")
        lines.append("")

    return "\n".join(lines)
