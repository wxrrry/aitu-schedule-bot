import os
import json
import logging
from datetime import datetime, date, timedelta
from config import BOT_TZ
from schedule_data import DAYS_RU, BELL_SCHEDULE

logger = logging.getLogger(__name__)

DATA_FILE = os.path.join(os.path.dirname(__file__), "zameny.json")

def load_replacements() -> dict:
    """Загружает данные о заменах из файла JSON."""
    if not os.path.exists(DATA_FILE):
        return {}
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                return data
            return {}
    except Exception as e:
        logger.error(f"Ошибка чтения {DATA_FILE}: {e}")
        return {}


def save_replacements(data: dict) -> bool:
    """Сохраняет данные о заменах в файл JSON."""
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"Ошибка сохранения {DATA_FILE}: {e}")
        return False


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


def add_replacement(target_date: date, pair_num: int, text: str, author: str = "") -> dict:
    """
    Добавляет замену или отмену пары на указанную дату.
    """
    data = load_replacements()
    date_key = target_date.isoformat()
    if date_key not in data:
        data[date_key] = {}

    clean_text = text.strip()
    lower_text = clean_text.lower()
    is_cancel = lower_text in ("отмена", "отменена", "отменить", "нет", "cancel", "нет пары")

    entry = {
        "type": "cancel" if is_cancel else "replace",
        "text": "Пара отменена" if is_cancel else clean_text,
        "author": author,
        "created_at": datetime.now(BOT_TZ).strftime("%Y-%m-%d %H:%M")
    }

    data[date_key][str(pair_num)] = entry
    save_replacements(data)
    return entry


def delete_replacement(target_date: date, pair_num: int) -> bool:
    """
    Удаляет запись о замене/отмене пары.
    """
    data = load_replacements()
    date_key = target_date.isoformat()
    if date_key in data:
        pair_key = str(pair_num)
        if pair_key in data[date_key]:
            del data[date_key][pair_key]
            if not data[date_key]:
                del data[date_key]
            save_replacements(data)
            return True
    return False


def get_replacements_for_date(target_date: date) -> dict[int, dict]:
    """
    Возвращает словарь {pair_num (int): entry_dict} для заданной даты.
    """
    data = load_replacements()
    date_key = target_date.isoformat()
    day_entries = data.get(date_key, {})
    res = {}
    for k, v in day_entries.items():
        try:
            res[int(k)] = v
        except ValueError:
            pass
    return res


def get_all_upcoming_replacements(start_date: date | None = None, days_ahead: int = 14) -> list[dict]:
    """
    Возвращает список всех предстоящих замен начиная с start_date (по умолчанию сегодня).
    """
    if start_date is None:
        start_date = datetime.now(BOT_TZ).date()

    data = load_replacements()
    results = []

    for date_key, pairs_map in data.items():
        try:
            d = date.fromisoformat(date_key)
        except Exception:
            continue

        if start_date <= d <= start_date + timedelta(days=days_ahead):
            for pair_k, entry in pairs_map.items():
                try:
                    p_num = int(pair_k)
                except ValueError:
                    continue
                results.append({
                    "date": d,
                    "pair_num": p_num,
                    "type": entry.get("type", "replace"),
                    "text": entry.get("text", ""),
                    "author": entry.get("author", ""),
                    "created_at": entry.get("created_at", "")
                })

    results.sort(key=lambda x: (x["date"], x["pair_num"]))
    return results


def format_replacements_summary(target_date: date | None = None) -> str:
    """
    Красивое HTML-сообщение о заменах и отменах:
    - если указан target_date: для конкретного дня
    - если None: сводка предстоящих замен на ближайшие 2 недели
    """
    if target_date is not None:
        entries = get_replacements_for_date(target_date)
        day_name = DAYS_RU[target_date.weekday()]
        date_str = target_date.strftime("%d.%m.%Y")
        if not entries:
            return (
                f"ℹ️ <b>Замены и отмены на {day_name} ({date_str}):</b>\n\n"
                f"✅ Изменений нет, все пары проводятся по стандартному расписанию!"
            )
        
        lines = [
            f"⚠️ <b>Замены и отмены на {day_name} ({date_str}):</b>",
            "──────────────────────"
        ]
        for p_num in sorted(entries.keys()):
            e = entries[p_num]
            t_info = BELL_SCHEDULE.get(p_num, {})
            t_range = t_info.get("range", "") if isinstance(t_info, dict) else str(t_info)
            if e.get("type") == "cancel":
                lines.append(
                    f"❌ <b>Пара №{p_num} ({t_range}):</b> <s>ОТМЕНЕНА</s>\n"
                    f"   <i>Причина / комментарий: {e.get('text', 'Отмена')}</i>"
                )
            else:
                lines.append(
                    f"🔄 <b>Пара №{p_num} ({t_range}): ЗАМЕНА</b>\n"
                    f"   👉 <b>{e.get('text', '')}</b>"
                )
        return "\n\n".join(lines)

    # Список предстоящих замен
    upcoming = get_all_upcoming_replacements()
    if not upcoming:
        return (
            "✨ <b>Актуальные замены и отмены пар:</b>\n\n"
            "🎉 <b>На ближайшие 2 недели замен нет!</b>\n"
            "Все занятия проводятся по основному графику учебного плана."
        )

    lines = [
        "⚠️ <b>Актуальные изменения в расписании (9ПО-43к):</b>",
        "──────────────────────"
    ]
    curr_d = None
    for item in upcoming:
        d = item["date"]
        p_num = item["pair_num"]
        t_info = BELL_SCHEDULE.get(p_num, {})
        t_range = t_info.get("range", "") if isinstance(t_info, dict) else str(t_info)
        day_name = DAYS_RU[d.weekday()]

        if d != curr_d:
            curr_d = d
            lines.append(f"\n📅 <b>{day_name}, {d.strftime('%d.%m.%Y')}:</b>")

        if item["type"] == "cancel":
            lines.append(
                f"  ❌ <b>№{p_num} ({t_range}):</b> ОТМЕНЕНА — <i>{item['text']}</i>"
            )
        else:
            lines.append(
                f"  🔄 <b>№{p_num} ({t_range}):</b> ЗАМЕНА — <b>{item['text']}</b>"
            )

    lines.append(
        "\n💡 <i>Чтобы добавить замену (для старосты/админа):</i>\n"
        "<code>/zamena 17.10 3 отмена</code> или <code>/zamena 17.10 2 МДК 07.01, каб. 305</code>"
    )
    return "\n".join(lines)
