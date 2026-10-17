"""
Роутер общих команд (/start, /help, /cancel, /menu) согласно .rules.md.
"""
from aiogram import Router, types, F
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext

router = Router(name="common")

@router.message(Command("cancel"))
@router.message(F.text.in_(["❌ Отмена", "Отмена", "/cancel"]))
async def handle_cancel_cmd(message: types.Message, state: FSMContext):
    """Сброс FSM контекста на любом шаге сценария."""
    current_state = await state.get_state()
    if current_state:
        await state.clear()
        await message.answer("Действие отменено. ↩️")
    else:
        await message.answer("Нет активных действий для отмены.")
