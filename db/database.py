import os
import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from .models import Base

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "schedule_bot.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{DB_PATH}")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args
)

async_session = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency / context helper for getting an async session."""
    async with async_session() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Инициализация базы данных и таблиц + запуск автомиграции данных."""
    db_target = DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DB_PATH
    logger.info(f"Инициализация базы данных: {db_target}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Проверяем и добавляем новые колонки в chat_bindings при их отсутствии
        for col, col_type in [
            ("notify_pairs", "BOOLEAN DEFAULT 1"),
            ("notify_breaks", "BOOLEAN DEFAULT 1"),
            ("notify_morning", "BOOLEAN DEFAULT 1"),
            ("notify_midnight", "BOOLEAN DEFAULT 1"),
            ("notify_silent", "BOOLEAN DEFAULT 0"),
        ]:
            try:
                await conn.exec_driver_sql(f"ALTER TABLE chat_bindings ADD COLUMN {col} {col_type};")
            except Exception:
                pass
    logger.info("Таблицы базы данных успешно созданы/проверены.")

    # Импортируем и запускаем миграцию существующих данных
    try:
        from .migration import run_data_migrations
        await run_data_migrations()
    except Exception as e:
        logger.error(f"Ошибка при выполнении автомиграции данных: {e}", exc_info=True)
