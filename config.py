import os
from datetime import date
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
CHAT_ID = os.getenv("CHAT_ID", "").strip()
TIMEZONE_NAME = os.getenv("TIMEZONE", "Europe/Moscow").strip()

try:
    BOT_TZ = ZoneInfo(TIMEZONE_NAME)
except Exception:
    BOT_TZ = ZoneInfo("Europe/Moscow")

# Опорный понедельник и его четность (числитель / знаменатель)
ANCHOR_DATE_STR = os.getenv("ANCHOR_DATE", "2026-10-12").strip()
try:
    ANCHOR_DATE = date.fromisoformat(ANCHOR_DATE_STR)
except Exception:
    ANCHOR_DATE = date(2026, 10, 12)

# chislitel или znamenatel
ANCHOR_PARITY = os.getenv("ANCHOR_PARITY", "chislitel").strip().lower()

# Администраторы бота: список ID через запятую (например: ADMIN_IDS=12345678,87654321)
ADMIN_IDS: set[int] = set()
raw_admin_ids = os.getenv("ADMIN_IDS", "").strip()
if raw_admin_ids:
    for part in raw_admin_ids.replace(";", ",").replace(" ", ",").split(","):
        p = part.strip()
        if p.isdigit():
            ADMIN_IDS.add(int(p))

# Поддержка обратной совместимости с ADMIN_ID
ADMIN_ID_STR = os.getenv("ADMIN_ID", "").strip()
if ADMIN_ID_STR.isdigit():
    ADMIN_IDS.add(int(ADMIN_ID_STR))

ADMIN_ID = next(iter(ADMIN_IDS), None)
