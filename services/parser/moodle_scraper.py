import re
import os
import aiohttp
import logging
from bs4 import BeautifulSoup
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_MOODLE_URL = "https://do.eduhouse.ru"


class MoodleScraper:
    """
    Асинхронный скрапер для ЕЭОС Moodle (do.eduhouse.ru).
    Авторизуется на портале и проверяет появление новых документов замен (.docx)
    и файлов семестрового расписания (.xlsx).
    """
    def __init__(self, base_url: str = DEFAULT_MOODLE_URL, username: str = "", password: str = ""):
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password

    async def login_and_find_schedule_files(self, save_dir: str = "downloads") -> dict[str, Any]:
        """
        Пытается авторизоваться в Moodle и найти ссылки на файлы замен (.docx) и расписания (.xlsx).
        """
        os.makedirs(save_dir, exist_ok=True)
        results = {
            "authenticated": False,
            "docx_files": [],
            "xlsx_files": [],
            "errors": []
        }

        if not self.username or not self.password:
            results["errors"].append("Логин и пароль от do.eduhouse.ru не указаны в настройках.")
            return results

        login_url = f"{self.base_url}/login/index.php"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        async with aiohttp.ClientSession(headers=headers) as session:
            try:
                # 1. Получаем страницу логина и извлекаем logintoken
                async with session.get(login_url) as resp:
                    if resp.status != 200:
                        results["errors"].append(f"Ошибка доступа к Moodle: HTTP {resp.status}")
                        return results
                    html = await resp.text()

                soup = BeautifulSoup(html, "html.parser")
                token_input = soup.find("input", {"name": "logintoken"})
                login_token = token_input.get("value") if token_input else ""

                # 2. Отправляем POST запрос авторизации
                post_data = {
                    "username": self.username,
                    "password": self.password,
                    "logintoken": login_token
                }
                async with session.post(login_url, data=post_data, allow_redirects=True) as post_resp:
                    post_html = await post_resp.text()

                if "login/index.php" in str(post_resp.url) or "неверный логин" in post_html.lower():
                    results["errors"].append("Неверный логин или пароль для do.eduhouse.ru.")
                    return results

                results["authenticated"] = True
                logger.info("Успешная авторизация в Moodle do.eduhouse.ru!")

                # 3. Сканируем главную страницу и доступные курсы на наличие прикрепленных docx/xlsx
                post_soup = BeautifulSoup(post_html, "html.parser")
                for a in post_soup.find_all("a", href=True):
                    href = a["href"]
                    link_text = a.text.lower()
                    if ".docx" in href or "замен" in link_text:
                        results["docx_files"].append({"url": href, "title": a.text.strip()})
                    elif ".xlsx" in href or ".xls" in href or "расписан" in link_text:
                        results["xlsx_files"].append({"url": href, "title": a.text.strip()})

            except Exception as e:
                logger.error(f"Ошибка при работе с Moodle: {e}")
                results["errors"].append(str(e))

        return results
