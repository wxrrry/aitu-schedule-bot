"""
Роутер навигации и расписания (/today, /tomorrow, /week, /now, navdate_) согласно .rules.md.
"""
from aiogram import Router

router = Router(name="schedule")
