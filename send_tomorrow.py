#!/usr/bin/env python3
"""
Скрипт для однократной отправки расписания на следующий день.
Идеально подходит для запуска через GitHub Actions (бесплатный Cron)
или через crontab на сервере.
"""
import sys
import json
import urllib.request
import urllib.parse
from datetime import datetime, timedelta

from config import BOT_TOKEN, CHAT_ID, BOT_TZ
from formatter import format_day_schedule

def send_telegram_message(token: str, chat_id: str, text: str) -> bool:
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
            if resp_data.get("ok"):
                print("✅ Расписание успешно отправлено в Telegram!")
                return True
            else:
                print(f"❌ Ошибка Telegram API: {resp_data}", file=sys.stderr)
                return False
    except Exception as e:
        print(f"❌ Ошибка при отправке сообщения: {e}", file=sys.stderr)
        return False

def main():
    if not BOT_TOKEN or not CHAT_ID:
        print("❌ Ошибка: Не заданы BOT_TOKEN или CHAT_ID в окружении/.env!", file=sys.stderr)
        sys.exit(1)
        
    now = datetime.now(BOT_TZ)
    tomorrow = now.date() + timedelta(days=1)
    
    print(f"Текущее время ({BOT_TZ}): {now.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Формирование расписания на завтра: {tomorrow.strftime('%Y-%m-%d')}")
    
    text = format_day_schedule(tomorrow, title_prefix="Расписание на завтра")
    success = send_telegram_message(BOT_TOKEN, CHAT_ID, text)
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
