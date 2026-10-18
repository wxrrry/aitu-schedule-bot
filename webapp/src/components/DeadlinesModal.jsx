import React, { useState } from 'react';
import { 
  X, 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  BookOpen, 
  Filter, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { useTelegramBackButton, triggerHaptic } from '../utils/telegram';

export default function DeadlinesModal({
  isOpen,
  onClose,
  tasks = {},
  onAddTask,
  onToggleTask,
  onDeleteTask,
  availableSubjects = []
}) {
  useTelegramBackButton(isOpen, onClose);

  const [activeFilter, setActiveFilter] = useState('active'); // 'all', 'active', 'completed'
  const [selectedSubject, setSelectedSubject] = useState(availableSubjects[0] || 'Общие задания');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');

  if (!isOpen) return null;

  // Flatten all tasks into a single list with subject metadata
  const allTaskList = [];
  Object.entries(tasks).forEach(([subj, list]) => {
    if (Array.isArray(list)) {
      list.forEach(t => {
        allTaskList.push({
          ...t,
          subject: subj
        });
      });
    }
  });

  const totalCount = allTaskList.length;
  const completedCount = allTaskList.filter(t => t.done).length;
  const activeCount = totalCount - completedCount;

  const filteredTasks = allTaskList.filter(t => {
    if (activeFilter === 'active') return !t.done;
    if (activeFilter === 'completed') return t.done;
    return true;
  });

  const handleCreate = (e) => {
    e?.preventDefault();
    if (!taskTitle.trim()) return;

    const fullText = taskDeadline.trim() 
      ? `${taskTitle.trim()} (до ${taskDeadline.trim()})`
      : taskTitle.trim();

    onAddTask(selectedSubject, fullText);
    setTaskTitle('');
    setTaskDeadline('');
    triggerHaptic('success');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn font-mono text-xs select-none"
      onClick={() => {
        onClose();
        triggerHaptic('light');
      }}
    >
      <div 
        className="w-full max-w-lg bg-[#0e0e11] border border-white/15 flex flex-col max-h-[90vh] shadow-2xl overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0a0a0c]">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white tracking-wider uppercase">
              ЛИЧНЫЙ ЧЕК-ЛИСТ // ЛАБОРАТОРНЫЕ И ДЕДЛАЙНЫ
            </span>
          </div>
          <button
            onClick={() => {
              onClose();
              triggerHaptic('light');
            }}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats and Filter Bar */}
        <div className="px-4 py-2.5 bg-black/60 border-b border-white/10 flex items-center justify-between flex-wrap gap-2 text-[10px]">
          <div className="flex items-center gap-3 text-zinc-400">
            <span>ВСЕГО: <strong className="text-white">{totalCount}</strong></span>
            <span>АКТИВНЫХ: <strong className="text-amber-400">{activeCount}</strong></span>
            <span>СДАНО: <strong className="text-emerald-400">{completedCount}</strong></span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => { setActiveFilter('active'); triggerHaptic('selection'); }}
              className={`px-2 py-0.5 border text-[9px] font-bold uppercase transition-all ${
                activeFilter === 'active' 
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300' 
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'
              }`}
            >
              АКТИВНЫЕ ({activeCount})
            </button>
            <button
              onClick={() => { setActiveFilter('completed'); triggerHaptic('selection'); }}
              className={`px-2 py-0.5 border text-[9px] font-bold uppercase transition-all ${
                activeFilter === 'completed' 
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' 
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'
              }`}
            >
              СДАННЫЕ ({completedCount})
            </button>
            <button
              onClick={() => { setActiveFilter('all'); triggerHaptic('selection'); }}
              className={`px-2 py-0.5 border text-[9px] font-bold uppercase transition-all ${
                activeFilter === 'all' 
                  ? 'bg-white text-black font-bold border-white' 
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'
              }`}
            >
              ВСЕ
            </button>
          </div>
        </div>

        {/* Add New Task Form */}
        <form onSubmit={handleCreate} className="p-3 bg-[#0a0a0c] border-b border-white/10 space-y-2">
          <div className="text-[10px] text-zinc-400 font-bold uppercase flex items-center gap-1.5">
            <Plus className="w-3 h-3 text-emerald-400" />
            <span>ДОБАВИТЬ НОВУЮ РАБОТУ / ДЕДЛАЙН:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Subject Select */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-2.5 py-1.5 bg-black border border-white/15 text-white font-mono text-[11px] focus:outline-none focus:border-white truncate"
            >
              {availableSubjects.map((s, idx) => (
                <option key={idx} value={s} className="bg-black text-white">
                  {s}
                </option>
              ))}
              <option value="Общие задания" className="bg-black text-white">
                Общие задания
              </option>
            </select>

            {/* Quick Deadline Preset */}
            <input
              type="text"
              value={taskDeadline}
              onChange={(e) => setTaskDeadline(e.target.value)}
              placeholder="Срок сдачи (напр. 24.10 или Пн)"
              className="px-2.5 py-1.5 bg-black border border-white/15 text-white font-mono text-[11px] placeholder-zinc-600 focus:outline-none focus:border-white"
            />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Название (напр. Лабораторная работа №3)..."
              className="flex-1 px-3 py-2 bg-black border border-white/15 text-white font-mono text-xs placeholder-zinc-600 focus:outline-none focus:border-white"
            />
            <button
              type="submit"
              disabled={!taskTitle.trim()}
              className="px-4 py-2 bg-white text-black font-bold uppercase hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs"
            >
              ЗАПИСАТЬ
            </button>
          </div>
        </form>

        {/* Task List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2 max-h-[50vh]">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-zinc-600" />
              <div className="text-xs uppercase font-bold text-zinc-400">
                {activeFilter === 'active' ? 'Все текущие лабораторные сданы!' : 'Заданий в этом списке нет.'}
              </div>
              <p className="text-[11px] text-zinc-600 max-w-xs mx-auto font-sans leading-relaxed">
                Добавляйте практические и лабораторные работы выше — они сохраняются локально и привязаны к вашему профилю.
              </p>
            </div>
          ) : (
            filteredTasks.map(t => (
              <div 
                key={t.id}
                className={`p-2.5 border transition-all flex items-start justify-between gap-3 ${
                  t.done 
                    ? 'bg-black/40 border-white/5 opacity-60' 
                    : 'bg-[#0a0a0c] border-white/15 hover:border-white/30'
                }`}
              >
                <div 
                  className="flex items-start gap-2.5 flex-1 cursor-pointer"
                  onClick={() => onToggleTask(t.subject, t.id)}
                >
                  <button 
                    type="button"
                    className="mt-0.5 text-zinc-400 hover:text-white transition-colors"
                  >
                    {t.done ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-500" />
                    )}
                  </button>

                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] px-1.5 py-0.2 bg-zinc-900 border border-white/10 text-zinc-400 uppercase font-bold">
                        {t.subject}
                      </span>
                      {t.done && (
                        <span className="text-[9px] text-emerald-400 font-bold uppercase">
                          СДАНО ✓
                        </span>
                      )}
                    </div>
                    <div className={`text-xs font-sans leading-snug ${t.done ? 'line-through text-zinc-500' : 'text-white'}`}>
                      {t.text}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteTask(t.subject, t.id)}
                  className="p-1 text-zinc-600 hover:text-rose-400 transition-colors"
                  title="Удалить"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#0a0a0c] border-t border-white/10 flex items-center justify-between text-[10px] text-zinc-500">
          <span>СИНХРОНИЗАЦИЯ С CLOUD STORAGE</span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white uppercase font-bold"
          >
            ЗАКРЫТЬ
          </button>
        </div>
      </div>
    </div>
  );
}
