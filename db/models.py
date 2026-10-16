from datetime import datetime, date
import enum
from sqlalchemy import (
    BigInteger,
    Integer,
    String,
    Boolean,
    DateTime,
    Date,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class UserRole(str, enum.Enum):
    STUDENT = "student"
    ZAM_STAROSTY = "zam_starosty"
    STAROSTA = "starosta"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    course: Mapped[int] = mapped_column(Integer, default=4, index=True, nullable=False)
    department: Mapped[str] = mapped_column(String(128), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    users: Mapped[list["User"]] = relationship("User", back_populates="group", cascade="all, delete-orphan")
    lessons: Mapped[list["Lesson"]] = relationship("Lesson", back_populates="group", cascade="all, delete-orphan")
    chat_bindings: Mapped[list["ChatBinding"]] = relationship("ChatBinding", back_populates="group", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Group {self.name} (курс {self.course})>"


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    full_name: Mapped[str] = mapped_column(String(128), default="")
    group_name: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("groups.name", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    role: Mapped[str] = mapped_column(String(32), default=UserRole.STUDENT.value, index=True)
    remind_10min: Mapped[bool] = mapped_column(Boolean, default=True)
    morning_alert: Mapped[bool] = mapped_column(Boolean, default=False)
    five_min_breaks: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    group: Mapped[Group | None] = relationship("Group", back_populates="users")

    def __repr__(self) -> str:
        return f"<User {self.user_id} @{self.username} [{self.group_name}] role={self.role}>"


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    group_name: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("groups.name", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    weekday: Mapped[int] = mapped_column(Integer, index=True, nullable=False)  # 0=Пн, 1=Вт, ..., 5=Сб
    pair_num: Mapped[int] = mapped_column(Integer, index=True, nullable=False)  # 1..4
    parity: Mapped[str] = mapped_column(String(16), default="both", index=True, nullable=False)  # both, chislitel, znamenatel
    subject: Mapped[str] = mapped_column(String(256), nullable=False)
    room: Mapped[str] = mapped_column(String(64), default="—")
    teacher: Mapped[str] = mapped_column(String(128), default="—")

    group: Mapped[Group] = relationship("Group", back_populates="lessons")

    def __repr__(self) -> str:
        return f"<Lesson {self.group_name} W{self.weekday} P{self.pair_num} {self.parity}: {self.subject} каб.{self.room}>"


class Replacement(Base):
    __tablename__ = "replacements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    group_name: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)  # NULL = для всего колледжа
    date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    pair_num: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    action_type: Mapped[str] = mapped_column(String(16), default="replace", nullable=False)  # replace, cancel
    subject: Mapped[str] = mapped_column(String(256), default="")
    room: Mapped[str] = mapped_column(String(64), default="—")
    teacher: Mapped[str] = mapped_column(String(128), default="—")
    raw_text: Mapped[str] = mapped_column(String(512), default="")
    created_by: Mapped[int] = mapped_column(BigInteger, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Replacement {self.date} {self.group_name or 'ALL'} P{self.pair_num}: {self.action_type}>"


class ChatBinding(Base):
    __tablename__ = "chat_bindings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chat_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True, nullable=False)
    chat_title: Mapped[str] = mapped_column(String(256), default="")
    group_name: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("groups.name", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    bound_by_user_id: Mapped[int] = mapped_column(BigInteger, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    group: Mapped[Group] = relationship("Group", back_populates="chat_bindings")

    def __repr__(self) -> str:
        return f"<ChatBinding chat={self.chat_id} ({self.chat_title}) -> group={self.group_name}>"
