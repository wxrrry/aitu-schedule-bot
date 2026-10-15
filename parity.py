from datetime import date, timedelta
from config import ANCHOR_DATE, ANCHOR_PARITY

def get_week_parity(target_date: date) -> tuple[str, str]:
    """
    Определяет четность недели (числитель / знаменатель) для переданной даты.
    Возвращает кортеж:
      - кодовое имя ('chislitel' или 'znamenatel')
      - отображаемое название ('Числитель' или 'Знаменатель')
    """
    # Находим понедельник целевой недели и понедельник опорной даты
    target_monday = target_date - timedelta(days=target_date.weekday())
    anchor_monday = ANCHOR_DATE - timedelta(days=ANCHOR_DATE.weekday())
    
    weeks_diff = (target_monday - anchor_monday).days // 7
    
    # Чередование относительно опорной недели
    if ANCHOR_PARITY.lower() == "znamenatel":
        is_chislitel = (weeks_diff % 2 != 0)
    else:
        is_chislitel = (weeks_diff % 2 == 0)
        
    if is_chislitel:
        return "chislitel", "Числитель 🔺"
    else:
        return "znamenatel", "Знаменатель 🔻"
