"""
Пакет модульных роутеров aiogram 3.x согласно стандартам .rules.md.
"""
from aiogram import Dispatcher

def setup_routers(dp: Dispatcher):
    """
    Подключает все роутеры приложения в корневой Dispatcher.
    """
    from .common import router as common_router
    from .schedule import router as schedule_router
    from .settings import router as settings_router
    from .starosta import router as starosta_router
    from .admin import router as admin_router
    from .lectures import router as lectures_router

    dp.include_router(common_router)
    dp.include_router(schedule_router)
    dp.include_router(settings_router)
    dp.include_router(starosta_router)
    dp.include_router(admin_router)
    dp.include_router(lectures_router)
