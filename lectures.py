import os
import html
from typing import Optional

LECTURES_DIR = os.path.join(os.path.dirname(__file__), "assets", "lectures")

SUBJECT_MAP = {
    "mdk0702": {"name": "МДК 07.02", "full": "МДК 07.02 Сертификация ИС", "icon": "🛡"},
    "mgmt": {"name": "Менеджмент в ПД", "full": "Менеджмент в профессиональной деятельности", "icon": "📊"},
    "mdk0401": {"name": "МДК 04.01", "full": "МДК 04.01 Внедрение и поддержка КС", "icon": "💻"},
    "econ": {"name": "Экономика отрасли", "full": "Экономика отрасли (IT)", "icon": "💼"},
    "bzhd": {"name": "БЖД", "full": "Безопасность жизнедеятельности", "icon": "🦺"},
}

LECTURES: list[dict] = [
    {
        "id": "mdk0702_1510",
        "subject_code": "mdk0702",
        "subject": "МДК 07.02",
        "subject_full": "МДК 07.02 Сертификация ИС",
        "teacher": "Щербакова М.А.",
        "date": "15.10.2026",
        "date_iso": "2026-10-15",
        "pair": "Чт-3 (каб. 304)",
        "title": "Тема 2.1. Защита информации БД. Законодательство РФ, уровни ИСПДн и СУБД",
        "summary": (
            "Защита информации в базах данных опирается на иерархию НПА РФ: от Конституции РФ "
            "и рамочного закона № 149-ФЗ (триада КИД) до № 152-ФЗ (локализация баз в РФ). "
            "Технические нормы задаются ГОСТами (Р 50922, 53114, 51275, 59709) и ФСТЭК № 64 "
            "(классы 1–6, разделение ролей DBA и Администратора СУБД, DAC/RBAC, аудит, отказоустойчивые "
            "кластеры). Ответственность: оборотные штрафы 1–3% выручки (до 500 млн руб.) по ст. 13.11 КоАП РФ "
            "и до 10 лет тюрьмы по ст. 272.1 УК РФ за незаконный оборот баз данных. "
            "Рынок сертифицированных СУБД: Postgres Pro Certified, Jatoba, Ред База Данных, Tantor."
        ),
        "key_points": [
            "Иерархия НПА РФ (Конституция, ФЗ, подзаконные акты)",
            "149-ФЗ и триада безопасности (Конфиденциальность, Целостность, Доступность)",
            "152-ФЗ и уровни УЗ-1..4 (ПП РФ № 1119)",
            "Приказ ФСТЭК России № 64 (классы СУБД 1–6)",
            "Оборотные штрафы КоАП 13.11 и ст. 272.1 УК РФ",
            "Сертифицированные СУБД в РФ (Postgres Pro, Jatoba, Ред БД)"
        ],
        "file": "mdk0702_2026-10-15.md"
    },
    {
        "id": "mdk0702_1610",
        "subject_code": "mdk0702",
        "subject": "МДК 07.02",
        "subject_full": "МДК 07.02 Сертификация ИС",
        "teacher": "Щербакова М.А.",
        "date": "16.10.2026",
        "date_iso": "2026-10-16",
        "pair": "Пт-4 (каб. 422)",
        "title": "Раздел 1: Тема 7.2.1. ФСТЭК № 64, ГОСТы и методы противодействия угрозам БД",
        "summary": (
            "Комплексный блок Раздела 1: нормативные стандарты (ГОСТ Р 50922, 53114, 51275, 59709), "
            "детальные требования Приказа ФСТЭК № 64 к архитектуре защищённой СУБД (RBAC/MAC, аудит, "
            "High Availability кластеры, гарантированная очистка оперативной памяти и дисков). "
            "6 групп методов противодействия угрозам: нормативно-правовые, организационные, "
            "программно-аппаратные (WAF, DAM, TDE, KMS), криптографические, физические и кадровые. "
            "Принцип эшелонированной защиты (Defense-in-Depth) и матрица «Угроза → Метод → Средство»."
        ),
        "key_points": [
            "Нормативные ГОСТы защиты информации",
            "Архитектурные требования ФСТЭК № 64 к СУБД",
            "6 групп методов противодействия угрозам БД",
            "Принцип эшелонированной защиты (Defense-in-Depth)",
            "Матрица: Угроза → Метод → Средство защиты",
            "Контрольный чек-лист соответствия СУБД"
        ],
        "file": "mdk0702_2026-10-16.md"
    },
    {
        "id": "mgmt_1310",
        "subject_code": "mgmt",
        "subject": "Менеджмент в ПД",
        "subject_full": "Менеджмент в профессиональной деятельности",
        "teacher": "Избасарова А.К.",
        "date": "13.10.2026",
        "date_iso": "2026-10-13",
        "pair": "Вт-2 (каб. 612)",
        "title": "Эволюция менеджмента и методы тайм-менеджмента",
        "summary": (
            "Понятие менеджмента и его отличие от универсального управления. Менеджмент как наука и искусство. "
            "Формула Друкера: эффективность (делать правильные вещи) vs результативность (делать вещи правильно). "
            "Функции управления: классика Файоля и современный цикл (планирование → организация → мотивация → контроль). "
            "3 уровня управления: институциональный (Top), управленческий (Middle), технический (First-line). "
            "Самоменеджмент: 1) Матрица Эйзенхауэра (4 квадранта), 2) Принцип Парето (20/80), 3) Метод Помидора (Pomodoro 25/5)."
        ),
        "key_points": [
            "Управление vs менеджмент",
            "Формула Друкера (эффективность + результативность)",
            "Функции управления (Файоль и современный цикл)",
            "3 уровня управления (Top, Middle, First-line)",
            "Матрица Эйзенхауэра (срочно / важно)",
            "Принцип Парето 20/80 и техника Pomodoro"
        ],
        "file": "mgmt_2026-10-13.md"
    },
    {
        "id": "mgmt_1410",
        "subject_code": "mgmt",
        "subject": "Менеджмент в ПД",
        "subject_full": "Менеджмент в профессиональной деятельности",
        "teacher": "Избасарова А.К.",
        "date": "14.10.2026",
        "date_iso": "2026-10-14",
        "pair": "Ср-2 (каб. 609)",
        "title": "Организация как социотехническая система",
        "summary": (
            "Понятие организации как структурированного целого. Социотехническая модель (люди + технологии + процессы). "
            "Синергетический эффект (1+1=3). 6 ключевых признаков организации: обособленность, разделение труда, "
            "координация, адаптивность к внешней среде, саморегуляция и культура. Целеполагание по технологии "
            "SMART (Specific, Measurable, Achievable, Relevant, Time-bound). Преодоление конфликтов целей внутри компании."
        ),
        "key_points": [
            "Сущность и определение организации",
            "Социотехническая модель (люди + процессы + техника)",
            "Эффект синергии (1+1=3)",
            "6 фундаментальных признаков организации",
            "Постановка целей по SMART",
            "Пирамида целей и преодоление конфликтов"
        ],
        "file": "mgmt_2026-10-14.md"
    },
    {
        "id": "mdk0401_1310",
        "subject_code": "mdk0401",
        "subject": "МДК 04.01",
        "subject_full": "МДК 04.01 Внедрение и поддержка КС",
        "teacher": "Смирнова А.В.",
        "date": "13.10.2026",
        "date_iso": "2026-10-13",
        "pair": "Вт-3 (каб. 305)",
        "title": "API и архитектурный стиль REST API, формат JSON",
        "summary": (
            "Что такое API (программный интерфейс приложения) и его роль в интеграции систем. "
            "Архитектурный стиль REST: ресурсы, стабильные URI, HTTP-методы (GET, POST, PUT, PATCH, DELETE), "
            "коды ответов (2xx, 4xx, 5xx). Текстовый формат JSON: типы данных, синтаксис. "
            "6 базовых принципов (ограничений) REST по Филдингу: Client-Server, Stateless (JWT в каждом запросе), "
            "Cacheable, Uniform Interface, Layered System (Nginx/Gateway), Code on Demand. "
            "Практический кейс на проекте «Моя Кухня» (Express API + JWT + MySQL)."
        ),
        "key_points": [
            "Что такое API и зачем он нужен",
            "Архитектурный стиль REST vs протоколы",
            "Формат JSON и его типы данных",
            "Связка API → REST → JSON",
            "6 принципов REST по Рою Филдингу",
            "Практический кейс: Express API + JWT + MySQL"
        ],
        "file": "mdk0401_2026-10-13.md"
    },
    {
        "id": "econ_1610",
        "subject_code": "econ",
        "subject": "Экономика отрасли",
        "subject_full": "Экономика отрасли (IT)",
        "teacher": "Петрова Е.А.",
        "date": "16.10.2026",
        "date_iso": "2026-10-16",
        "pair": "Пт-2 (каб. 711)",
        "title": "Организация в системе рыночной экономики. Предпринимательство",
        "summary": (
            "Рыночная экономика и принципы Адама Смита («невидимая рука рынка», конкуренция). "
            "Определение предпринимательства по ст. 2 ГК РФ и ст. 34 Конституции РФ. "
            "5 ключевых признаков бизнеса: риск, прибыль, самостоятельность, ответственность, законность. "
            "Классификация деятельности: производственная, торгово-закупочная, коммерческое посредничество "
            "(институт агентов и брокеров), ценные бумаги, инновации, консалтинг. Специфика экономики IT-отрасли: "
            "нематериальные активы, 70-80% расходов — ФОТ, нулевые предельные издержки тиражирования (marginal cost ≈ 0), "
            "налоговые преференции. Формы бизнеса: Самозанятость (НПД), ИП, ООО, АО."
        ),
        "key_points": [
            "Рыночная экономика и концепция Адама Смита",
            "Предпринимательство (ст. 2 ГК РФ, ст. 34 Конституции)",
            "5 ключевых признаков бизнеса",
            "Классификация деятельности: брокеры, агенты, производство",
            "Специфика экономики IT-предприятий (ФОТ, marginal cost)",
            "Формы бизнеса в РФ: Самозанятые, ИП, ООО, АО"
        ],
        "file": "econ_2026-10-16.md"
    },
    {
        "id": "bzhd_summary",
        "subject_code": "bzhd",
        "subject": "БЖД",
        "subject_full": "Безопасность жизнедеятельности",
        "teacher": "Осипов Д.Л.",
        "date": "Курс 2026",
        "date_iso": "2026-10-12",
        "pair": "Ауд. 505",
        "title": "Сводный конспект ключевых тем курса БЖД",
        "summary": (
            "Сводный конспект лекций курса БЖД: 1) Нормативная база защиты населения от ЧС (ФЗ № 68, ФЗ № 28); "
            "2) РСЧС: 5 уровней, 3 режима функционирования; 3) Гражданская оборона: сигналы ГО («Внимание всем!»), "
            "защитные сооружения (убежища, ПРУ), эвакуация; 4) Средства защиты: СИЗОД (противогаз ГП-7, респираторы), "
            "СИЗК (ОЗК, Л-1), аптечки (АИ-2, КИМГЗ); 5) Основы обороны государства и структура Вооруженных Сил РФ; "
            "6) Огневая подготовка: ТТХ автомата АК-74, порядок неполной разборки и сборки; "
            "7) Первая помощь: алгоритм СЛР (30:2, 100-120 компр/мин), жгут Эсмарха при артериальном кровотечении."
        ),
        "key_points": [
            "ФЗ № 68 и ФЗ № 28 по защите от ЧС",
            "5 уровней и 3 режима функционирования РСЧС",
            "Гражданская оборона (сигналы, убежища, ПРУ)",
            "СИЗОД (ГП-7) и СИЗК (ОЗК, Л-1)",
            "Огневая подготовка: автомат АК-74",
            "Алгоритмы первой медицинской помощи (СЛР 30:2, жгут)"
        ],
        "file": "bzhd_summary.md"
    }
]


def get_all_lectures() -> list[dict]:
    """Возвращает список всех лекций."""
    return LECTURES


def get_lecture_by_id(lecture_id: str) -> Optional[dict]:
    """Поиск лекции по ID."""
    for l in LECTURES:
        if l["id"] == lecture_id:
            return l
    return None


def get_subject_info(subject_code: str) -> Optional[dict]:
    """Возвращает метаданные предмета по коду."""
    return SUBJECT_MAP.get(subject_code)


def get_subjects_with_counts() -> list[dict]:
    """
    Возвращает упорядоченный список предметов с кодом, названием, иконкой и количеством лекций.
    """
    results = []
    for code, meta in SUBJECT_MAP.items():
        count = sum(1 for l in LECTURES if l.get("subject_code") == code)
        results.append({
            "code": code,
            "name": meta["name"],
            "full": meta["full"],
            "icon": meta["icon"],
            "count": count
        })
    return results


def get_lectures_by_subject_code(subject_code: str) -> list[dict]:
    """Возвращает все лекции по коду предмета."""
    return [l for l in LECTURES if l.get("subject_code") == subject_code]


def get_lectures_by_subject(subject_name: str) -> list[dict]:
    """Возвращает лекции по текстовому названию предмета."""
    s_clean = subject_name.strip().lower()
    return [l for l in LECTURES if s_clean in l["subject"].lower() or s_clean in l["subject_full"].lower()]


def get_unique_dates() -> list[dict]:
    """Возвращает список уникальных дат занятий с количеством лекций, отсортированный по убыванию."""
    dates_map = {}
    for l in LECTURES:
        d_iso = l["date_iso"]
        if d_iso not in dates_map:
            dates_map[d_iso] = {
                "date_iso": d_iso,
                "date": l["date"],
                "count": 0,
                "lectures": []
            }
        dates_map[d_iso]["count"] += 1
        dates_map[d_iso]["lectures"].append(l)

    # Сортируем даты по убыванию
    sorted_dates = sorted(dates_map.values(), key=lambda x: x["date_iso"], reverse=True)
    return sorted_dates


def get_lectures_by_date_iso(date_iso: str) -> list[dict]:
    """Возвращает лекции по ISO дате (например '2026-10-15')."""
    return [l for l in LECTURES if l["date_iso"] == date_iso]


def search_lectures(query: str) -> list[dict]:
    """
    Полнотекстовый поиск лекций по ключевым словам в названии, описании, терминах и датах.
    """
    q = query.strip().lower()
    if not q:
        return []

    matched = []
    for l in LECTURES:
        searchable_text = (
            f"{l['title']} {l['summary']} {l['subject']} {l['subject_full']} "
            f"{l['teacher']} {l['date']} {l['date_iso']} {' '.join(l['key_points'])}"
        ).lower()
        if q in searchable_text:
            matched.append(l)
    return matched


def format_lecture_card(lecture: dict) -> str:
    """
    Форматирует интерактивную карточку лекции для Telegram.
    """
    subj = html.escape(lecture["subject_full"])
    title = html.escape(lecture["title"])
    teacher = html.escape(lecture["teacher"])
    date_str = lecture["date"]
    pair_str = html.escape(lecture.get("pair", ""))
    summary = html.escape(lecture["summary"])
    
    points_lines = "\n".join(f"  • {html.escape(pt)}" for pt in lecture.get("key_points", []))

    text = (
        f"📖 <b>{title}</b>\n"
        f"──────────────────────\n"
        f"📚 <b>Предмет:</b> <code>{subj}</code>\n"
        f"👨‍🏫 <b>Преподаватель:</b> <i>{teacher}</i>\n"
        f"📅 <b>Дата:</b> <b>{date_str}</b> · {pair_str}\n\n"
        f"<blockquote>"
        f"📌 <b>Краткое резюме (TL;DR):</b>\n{summary}\n\n"
        f"🔑 <b>Ключевые вопросы темы:</b>\n{points_lines}"
        f"</blockquote>\n\n"
        f"👇 <i>Нажмите «📖 Читать конспект», чтобы открыть текст в чате, или «📄 Скачать .md» для заметок:</i>"
    )
    return text


def get_lecture_file_path(lecture_id: str) -> Optional[str]:
    """Возвращает путь к markdown-файлу конспекта."""
    lec = get_lecture_by_id(lecture_id)
    if not lec:
        return None
    p = os.path.join(LECTURES_DIR, lec["file"])
    if os.path.exists(p):
        return p
    return None


def get_lecture_pages(lecture_id: str, max_chars: int = 2800) -> list[str]:
    """
    Читает конспект из файла и разбивает его на страницы до max_chars символов.
    """
    p = get_lecture_file_path(lecture_id)
    if not p:
        lec = get_lecture_by_id(lecture_id)
        if not lec:
            return ["❌ Лекция не найдена."]
        return [lec["summary"]]

    try:
        with open(p, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        return [f"❌ Ошибка чтения файла конспекта: {e}"]

    paras = content.split("\n\n")
    pages = []
    curr = []
    curr_len = 0
    for p_text in paras:
        if curr_len + len(p_text) + 2 > max_chars:
            if curr:
                pages.append("\n\n".join(curr).strip())
                curr = []
                curr_len = 0
            if len(p_text) > max_chars:
                lines = p_text.split("\n")
                for line in lines:
                    if curr_len + len(line) + 1 > max_chars:
                        pages.append("\n\n".join(curr).strip())
                        curr = []
                        curr_len = 0
                    curr.append(line)
                    curr_len += len(line) + 1
            else:
                curr.append(p_text)
                curr_len += len(p_text) + 2
        else:
            curr.append(p_text)
            curr_len += len(p_text) + 2
    if curr:
        pages.append("\n\n".join(curr).strip())

    return pages if pages else ["Конспект пуст."]


def format_lecture_page(lecture: dict, page_idx: int, total_pages: int, page_text: str) -> str:
    """Форматирует страницу конспекта для чтения с безопасным экранированием."""
    title = html.escape(lecture["title"])
    escaped_body = html.escape(page_text)
    subj = html.escape(lecture["subject_full"])
    return (
        f"📖 <b>{title}</b>\n"
        f"📚 <code>{subj}</code> · <b>Стр. {page_idx + 1} из {total_pages}</b>\n"
        f"──────────────────────\n\n"
        f"{escaped_body}\n\n"
        f"──────────────────────\n"
        f"💡 <i>Листайте страницы кнопками ниже или скачайте полный .md файл:</i>"
    )
