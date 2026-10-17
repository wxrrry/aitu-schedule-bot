import React, { useState, useEffect } from 'react';
import { 
  DEFAULT_GROUP,
  POPULAR_GROUPS,
  ALL_COLLEGE_GROUPS,
  GROUPS_BY_COURSE,
  DAYS_RU, 
  COURSE_BELL_SCHEDULE, 
  COURSE_LUNCH,
  getBellSchedule,
  getLunchBreak,
  getCourseFromGroupName,
  getWeekParity, 
  getPairsForDay, 
  getCurrentPairStatus 
} from '../data/scheduleData';
import { 
  getStoredReplacements, 
  fetchReplacementsFromApi,
  saveCustomReplacement, 
  removeCustomReplacement, 
  getTodayDateKey 
} from '../data/replacementsData';
import { useTelegramBackButton, triggerHaptic } from '../utils/telegram';
import AllCoursesBellTable from './AllCoursesBellTable';
import AuditoriumFinderModal from './AuditoriumFinderModal';
import { 
  Clock, 
  MapPin, 
  User, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Info, 
  Check, 
  Coffee, 
  Sun,
  Layers,
  Search,
  X,
  Plus,
  Trash2,
  BookmarkCheck,
  AlertTriangle,
  Ban,
  WifiOff,
  Users
} from 'lucide-react';

export default function ScheduleTab({ profile, onUpdateProfile, onOpenProfile }) {
  const [viewMode, setViewMode] = useState('today'); // 'today', 'tomorrow', 'week'
  
  // Выбор группы (мульти-групповой режим с привязкой к профилю)
  const [selectedGroup, setSelectedGroup] = useState(() => {
    return profile?.group || localStorage.getItem('aitu_selected_group') || DEFAULT_GROUP;
  });

  useEffect(() => {
    if (profile?.group && profile.group !== selectedGroup) {
      setSelectedGroup(profile.group);
    }
  }, [profile?.group]);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [customGroupInput, setCustomGroupInput] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupCourseFilter, setGroupCourseFilter] = useState('all'); // 'all', 1, 2, 3, 4

  // Курс выбранной группы
  const currentCourse = getCourseFromGroupName(selectedGroup);
  const bellSchedule = getBellSchedule(currentCourse);
  const lunchBreak = getLunchBreak(currentCourse);
  const [showAllBellsTable, setShowAllBellsTable] = useState(false);

  // Навигация по неделям (offset: 0 = текущая неделя, -1 = прошлая, +1 = следующая)
  const [weekOffset, setWeekOffset] = useState(0);

  // Состояние сети (онлайн / офлайн)
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Базовые даты
  const now = new Date();
  const jsDay = now.getDay(); // 0 = Вс, 1 = Пн ... 6 = Сб
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1; // 0 = Пн, 4 = Пт, 5 = Сб, 6 = Вс
  const tomorrowIndex = (todayIndex + 1) % 7;

  // Понедельник текущей недели
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - todayIndex);
  currentMonday.setHours(0, 0, 0, 0);

  // Отображаемый понедельник с учетом weekOffset
  const displayedMonday = new Date(currentMonday);
  displayedMonday.setDate(currentMonday.getDate() + weekOffset * 7);

  const displayedSunday = new Date(displayedMonday);
  displayedSunday.setDate(displayedMonday.getDate() + 6);

  // Расчет четности для отображаемой недели
  const parity = getWeekParity(displayedMonday);

  const [expandedDays, setExpandedDays] = useState({ 0: true });
  const [selectedPairDetail, setSelectedPairDetail] = useState(null);
  const [isAuditoriumModalOpen, setIsAuditoriumModalOpen] = useState(false);
  const [auditoriumInitialTab, setAuditoriumInitialTab] = useState('rooms');
  const [currentStatus, setCurrentStatus] = useState(() => getCurrentPairStatus(new Date(), parity, selectedGroup));

  // Замены и отмены пар (zameny.json)
  const [replacements, setReplacements] = useState(() => getStoredReplacements());
  const [showAddReplacement, setShowAddReplacement] = useState(false);
  const [repType, setRepType] = useState('replace');
  const [repText, setRepText] = useState('');

  // Чек-лист заданий / дедлайнов (localStorage)
  const [tasks, setTasks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aitu_pair_tasks') || '{}');
    } catch (e) {
      return {};
    }
  });
  const [newTaskInput, setNewTaskInput] = useState('');

  // Привязка Telegram BackButton
  useTelegramBackButton(
    !!selectedPairDetail || isAuditoriumModalOpen || showGroupModal,
    () => {
      setSelectedPairDetail(null);
      setIsAuditoriumModalOpen(false);
      setShowGroupModal(false);
      setShowAddReplacement(false);
    }
  );

  // Вычисление даты для любого дня недели выбранной недели
  const getDateForDay = (dayIndex) => {
    const d = new Date(displayedMonday);
    d.setDate(displayedMonday.getDate() + dayIndex);
    return d;
  };

  const getDateKeyForDay = (dayIndex) => {
    return getTodayDateKey(getDateForDay(dayIndex));
  };

  const activeDayIndex = viewMode === 'today' ? todayIndex : tomorrowIndex;
  const activeDayObj = DAYS_RU.find(d => d.id === activeDayIndex);
  const activeDateKey = getTodayDateKey(viewMode === 'today' ? now : new Date(now.getTime() + 86400000));
  const activeDayPairs = getPairsForDay(activeDayIndex, getWeekParity(now), selectedGroup);

  // Обновление текущего статуса
  useEffect(() => {
    const update = () => setCurrentStatus(getCurrentPairStatus(new Date(), getWeekParity(now), selectedGroup));
    update();
    const timer = setInterval(update, 20000);
    return () => clearInterval(timer);
  }, [selectedGroup]);

  // Загрузка активных замен из базы данных при смене группы
  useEffect(() => {
    fetchReplacementsFromApi(selectedGroup).then(data => {
      if (data) setReplacements(data);
    }).catch(err => console.warn('Could not load replacements for group', err));
  }, [selectedGroup]);

  // Синхронизация задач пользователя с PostgreSQL
  useEffect(() => {
    const userId = profile?.telegramId || profile?.id;
    if (userId) {
      fetch(`/api/tasks?user_id=${userId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.tasks && Array.isArray(data.tasks)) {
            const grouped = {};
            for (const t of data.tasks) {
              const k = t.task_key || 'general';
              if (!grouped[k]) grouped[k] = [];
              grouped[k].push({ id: String(t.id), text: t.text, done: t.is_done });
            }
            setTasks(prev => {
              const merged = { ...prev };
              for (const [k, arr] of Object.entries(grouped)) {
                merged[k] = arr;
              }
              localStorage.setItem('aitu_pair_tasks', JSON.stringify(merged));
              return merged;
            });
          }
        })
        .catch(err => console.warn('Could not sync user tasks with database', err));
    }
  }, [profile?.telegramId, profile?.id]);

  const toggleDayAccordion = (dayId) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayId]: !prev[dayId]
    }));
    triggerHaptic('selection');
  };

  const toggleAllDays = (expand) => {
    const next = {};
    DAYS_RU.forEach(d => { next[d.id] = expand; });
    setExpandedDays(next);
    triggerHaptic('light');
  };

  const handleSelectGroup = (grp) => {
    const clean = grp.trim();
    if (!clean) return;
    setSelectedGroup(clean);
    localStorage.setItem('aitu_selected_group', clean);
    if (onUpdateProfile && profile) {
      const course = getCourseFromGroupName(clean);
      onUpdateProfile({
        ...profile,
        group: clean,
        course
      });
    }
    setShowGroupModal(false);
    triggerHaptic('success');
  };

  // Управление заданиями
  const handleAddTask = (subjectName) => {
    if (!newTaskInput.trim()) return;
    const taskText = newTaskInput.trim();
    const tempId = Date.now().toString();
    const currentSubjectTasks = tasks[subjectName] || [];
    const updated = {
      ...tasks,
      [subjectName]: [
        ...currentSubjectTasks,
        { id: tempId, text: taskText, done: false }
      ]
    };
    setTasks(updated);
    localStorage.setItem('aitu_pair_tasks', JSON.stringify(updated));
    setNewTaskInput('');
    triggerHaptic('success');

    const userId = profile?.telegramId || profile?.id;
    if (userId) {
      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          task_key: subjectName,
          text: taskText,
          is_done: false
        })
      }).then(res => res.ok ? res.json() : null).then(resData => {
        if (resData?.task?.id) {
          setTasks(prev => {
            const list = prev[subjectName] || [];
            const fresh = {
              ...prev,
              [subjectName]: list.map(t => t.id === tempId ? { ...t, id: String(resData.task.id) } : t)
            };
            localStorage.setItem('aitu_pair_tasks', JSON.stringify(fresh));
            return fresh;
          });
        }
      }).catch(e => console.warn('Offline task save', e));
    }
  };

  const handleToggleTask = (subjectName, taskId) => {
    const currentSubjectTasks = tasks[subjectName] || [];
    const targetTask = currentSubjectTasks.find(t => t.id === taskId);
    const newDone = targetTask ? !targetTask.done : true;

    const updated = {
      ...tasks,
      [subjectName]: currentSubjectTasks.map(t => 
        t.id === taskId ? { ...t, done: newDone } : t
      )
    };
    setTasks(updated);
    localStorage.setItem('aitu_pair_tasks', JSON.stringify(updated));
    triggerHaptic('selection');

    const userId = profile?.telegramId || profile?.id;
    if (userId && targetTask) {
      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: /^\d+$/.test(taskId) ? Number(taskId) : null,
          user_id: userId,
          task_key: subjectName,
          text: targetTask.text,
          is_done: newDone
        })
      }).catch(e => console.warn('Offline task update', e));
    }
  };

  const handleDeleteTask = (subjectName, taskId) => {
    const currentSubjectTasks = tasks[subjectName] || [];
    const updated = {
      ...tasks,
      [subjectName]: currentSubjectTasks.filter(t => t.id !== taskId)
    };
    setTasks(updated);
    localStorage.setItem('aitu_pair_tasks', JSON.stringify(updated));
    triggerHaptic('light');

    const userId = profile?.telegramId || profile?.id;
    if (userId && /^\d+$/.test(taskId)) {
      fetch(`/api/tasks/${taskId}?user_id=${userId}`, {
        method: 'DELETE'
      }).catch(e => console.warn('Offline task delete', e));
    }
  };

  // Управление заменами
  const handleSaveReplacement = (dateKey, pairNum, type, text) => {
    const updated = saveCustomReplacement(dateKey, pairNum, {
      type,
      text: text || (type === 'cancel' ? 'Пара отменена' : 'Замена пары'),
      author: 'Студент',
      group: selectedGroup
    });
    setReplacements({ ...updated });
    setShowAddReplacement(false);
    setRepText('');
    triggerHaptic('success');
  };

  const handleRemoveReplacement = (dateKey, pairNum) => {
    const existing = replacements[dateKey]?.[pairNum];
    const updated = removeCustomReplacement(dateKey, pairNum, existing?.id);
    setReplacements({ ...updated });
    triggerHaptic('light');
  };


  // Проверка активной замены на текущую пару в баннере
  const currentPairReplacement = currentStatus.type === 'in_pair' && currentStatus.num
    ? replacements[getTodayDateKey(now)]?.[currentStatus.num]
    : null;

  // Форматирование диапазона дат недели
  const formatShortDate = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  const weekRangeLabel = `${formatShortDate(displayedMonday)} — ${formatShortDate(displayedSunday)}`;

  return (
    <div className="space-y-4 pb-20 animate-fadeIn font-sans">
      {/* Offline Status Alert if device lost connection */}
      {!isOnline && (
        <div className="p-2.5 bg-zinc-900 border border-white/20 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-300">
            <WifiOff className="w-3.5 h-3.5 text-white" />
            <span>ОФЛАЙН-РЕЖИМ · ДАННЫЕ ИЗ КЭША</span>
          </div>
          <span className="text-[10px] text-zinc-500">PWA</span>
        </div>
      )}

      {/* Dynamic Status Banner with Pair Phase Calculation & Replacement alerts */}
      <div className="p-4 bg-[#0a0a0c] border border-white/10 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3 border-b border-white/[0.06] pb-2.5">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${currentStatus.type === 'in_pair' ? 'bg-white animate-pulse' : 'bg-zinc-500'}`} />
            <span className="font-mono text-[10px] font-bold tracking-widest text-white uppercase">
              {currentPairReplacement?.type === 'cancel' 
                ? 'ТЕКУЩАЯ ПАРА ОТМЕНЕНА' 
                : (currentPairReplacement?.type === 'replace' ? 'ИДЁТ ЗАМЕНА ПАРЫ' : currentStatus.title)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-zinc-500 uppercase">
              {currentCourse} КУРС
            </span>
            {currentStatus.time && (
              <span className="font-mono text-xs font-semibold text-zinc-300 tracking-wider">
                {currentStatus.time}
              </span>
            )}
          </div>
        </div>

        {/* If class is currently in session */}
        {currentStatus.type === 'in_pair' && currentStatus.pairData && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 uppercase">
                <span>ПРЕДМЕТ</span>
                {currentPairReplacement ? (
                  <span className={`px-1.5 py-0.2 border font-bold uppercase text-[9px] ${currentPairReplacement.type === 'cancel' ? 'border-red-500 text-red-300 bg-red-950/40' : 'border-amber-400 text-amber-300 bg-amber-950/40'}`}>
                    {currentPairReplacement.type === 'cancel' ? 'ОТМЕНА' : 'ЗАМЕНА'}
                  </span>
                ) : (
                  currentStatus.phaseTitle && (
                    <span className="px-1.5 py-0.2 border border-white/20 text-white font-bold">
                      {currentStatus.phaseTitle}
                    </span>
                  )
                )}
              </div>
              <h3 className={`text-base font-bold tracking-tight mt-0.5 ${currentPairReplacement?.type === 'cancel' ? 'line-through text-zinc-400' : 'text-white'}`}>
                {currentStatus.pairData.subject}
              </h3>
              {currentPairReplacement && (
                <div className="font-mono text-xs text-amber-300 font-semibold pt-0.5">
                  • {currentPairReplacement.text}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 pt-0.5">
                <span>{currentStatus.pairData.room}</span>
                <span className="text-zinc-600">//</span>
                <span>{currentStatus.pairData.teacher}</span>
              </div>
            </div>

            {/* Progress meter & Phase countdown */}
            <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
              <div className="flex justify-between font-mono text-[10px] text-zinc-400">
                <span className="tracking-wider">{currentStatus.phaseText || `ОСТАЛОСЬ ${currentStatus.remaining} МИН`}</span>
                <span className="text-white font-semibold tracking-wider">ПРОШЛО {currentStatus.progress}%</span>
              </div>
              <div className="w-full h-1 bg-zinc-900 border border-white/10 overflow-hidden">
                <div className="h-full bg-white transition-all duration-500" style={{ width: `${currentStatus.progress}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* If weekend, lunch break, or between classes */}
        {currentStatus.type !== 'in_pair' && (
          <div className="space-y-1 text-xs">
            <p className="text-zinc-300 font-sans leading-relaxed">
              {currentStatus.message}
            </p>
            {currentStatus.nextPair && currentStatus.nextPair.hasLesson && (
              <div className="font-mono text-[11px] text-zinc-400 pt-1">
                СЛЕДУЮЩАЯ: {currentStatus.nextPair.pair} · {currentStatus.nextPair.subject} ({currentStatus.nextPair.room})
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Switcher: Сегодня, Завтра, Неделя */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-[#09090b] border border-white/10">
        {[
          { id: 'today', label: `СЕГОДНЯ // ${DAYS_RU[todayIndex].short.toUpperCase()}` },
          { id: 'tomorrow', label: `ЗАВТРА // ${DAYS_RU[tomorrowIndex].short.toUpperCase()}` },
          { id: 'week', label: 'НЕДЕЛЯ // ВСЯ' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setViewMode(tab.id);
              triggerHaptic('selection');
            }}
            className={`py-2 text-[10px] font-mono font-bold tracking-wider transition-colors uppercase ${
              viewMode === tab.id
                ? 'bg-white text-black'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Control Bar: Multi-Group Selector, Teachers Directory & Parity/Week Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 font-mono text-[11px] px-1 text-zinc-400 border-b border-white/[0.06] pb-2">
        {/* Clickable Group Selector Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowGroupModal(true);
              triggerHaptic('light');
            }}
            className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900 border border-white/20 text-white font-mono text-[10px] font-bold tracking-wider uppercase hover:border-white transition-colors"
          >
            <Users className="w-3 h-3 text-zinc-400" />
            <span>ГРУППА // {selectedGroup} ({currentCourse} КУРС)</span>
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </button>
          <span className="text-zinc-600">·</span>
          <button
            onClick={() => {
              setAuditoriumInitialTab('rooms');
              setIsAuditoriumModalOpen(true);
              triggerHaptic('light');
            }}
            className="text-[10px] text-emerald-400 hover:text-emerald-300 uppercase underline font-semibold"
          >
            🏛 КАБИНЕТЫ
          </button>
          <span className="text-zinc-600">·</span>
          <button
            onClick={() => {
              setAuditoriumInitialTab('teachers');
              setIsAuditoriumModalOpen(true);
              triggerHaptic('light');
            }}
            className="text-[10px] text-zinc-400 hover:text-white uppercase underline"
          >
            ПРЕПОДАВАТЕЛИ
          </button>
          {onOpenProfile && (
            <>
              <span className="text-zinc-600">·</span>
              <button
                onClick={() => {
                  onOpenProfile();
                  triggerHaptic('light');
                }}
                className="text-[10px] text-zinc-300 hover:text-white uppercase underline font-semibold"
              >
                ПРОФИЛЬ
              </button>
            </>
          )}
        </div>

        {/* Parity badge */}
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 border border-white/20 text-white font-mono text-[10px] font-bold tracking-wider uppercase">
            [{parity === 'chislitel' ? 'ЧИСЛИТЕЛЬ' : 'ЗНАМЕНАТЕЛЬ'}]
          </span>
        </div>
      </div>

      {/* Week Navigation Bar (Active in Week view or anytime for exploring) */}
      {viewMode === 'week' && (
        <div className="p-2.5 bg-[#0a0a0c] border border-white/10 flex items-center justify-between font-mono text-xs">
          <button
            onClick={() => {
              setWeekOffset(prev => prev - 1);
              triggerHaptic('selection');
            }}
            className="p-1 hover:text-white text-zinc-400 flex items-center gap-1 text-[10px] uppercase border border-white/10 hover:border-white/30 px-2 py-0.5"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>ПРЕД.</span>
          </button>

          <div className="text-center">
            <div className="font-bold text-white text-[11px] tracking-wider">
              {weekRangeLabel}
            </div>
            <div className="text-[9px] text-zinc-500 uppercase">
              {weekOffset === 0 ? 'ТЕКУЩАЯ НЕДЕЛЯ' : `${Math.abs(weekOffset)} НЕД. ${weekOffset > 0 ? 'ВПЕРЁД' : 'НАЗАД'}`}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {weekOffset !== 0 && (
              <button
                onClick={() => {
                  setWeekOffset(0);
                  triggerHaptic('selection');
                }}
                className="px-1.5 py-0.5 text-[9px] text-zinc-400 hover:text-white border border-white/10"
                title="Вернуться к текущей неделе"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}

            <button
              onClick={() => {
                setWeekOffset(prev => prev + 1);
                triggerHaptic('selection');
              }}
              className="p-1 hover:text-white text-zinc-400 flex items-center gap-1 text-[10px] uppercase border border-white/10 hover:border-white/30 px-2 py-0.5"
            >
              <span>СЛЕД.</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 01 // Day View (Сегодня или Завтра) */}
      {viewMode !== 'week' ? (
        <div className="space-y-2">
          {/* Day Header Banner */}
          <div className="p-2.5 bg-[#0a0a0c] border border-white/10 flex items-center justify-between font-mono text-xs">
            <span className="font-bold text-white uppercase tracking-wider">
              {activeDayObj.name} · {viewMode === 'today' ? 'СЕГОДНЯ' : 'ЗАВТРА'}
            </span>
            <div className="flex items-center gap-2">
              {Object.keys(replacements[activeDateKey] || {}).length > 0 && (
                <span className="text-[9px] text-amber-300 border border-amber-500/40 bg-amber-950/40 px-1.5 py-0.2 uppercase font-bold">
                  ЗАМЕНЫ: {Object.keys(replacements[activeDateKey]).length}
                </span>
              )}
              <span className="text-[10px] text-zinc-400 uppercase">
                {activeDayObj.isWeekend ? 'ВЫХОДНОЙ' : `${activeDayPairs.filter(p => p.hasLesson).length} ПАР`}
              </span>
            </div>
          </div>

          {/* Weekend State */}
          {activeDayObj.isWeekend ? (
            <div className="p-8 border border-neutral-800 bg-[#0a0a0c] text-center space-y-2 font-mono">
              <Sun className="w-8 h-8 mx-auto text-zinc-500 stroke-[1.5]" />
              <div className="text-xs text-white uppercase tracking-wider font-bold">
                ВЫХОДНОЙ ДЕНЬ · ПАР НЕТ
              </div>
              <p className="text-[11px] text-zinc-500 font-sans max-w-xs mx-auto">
                В субботу и воскресенье по расписанию занятий нет. Готовьтесь к парам следующей недели.
              </p>
            </div>
          ) : (
            /* List of pairs for the day */
            <div className="space-y-2">
              {activeDayPairs.map((item) => {
                const pairTasks = tasks[item.subject] || [];
                const uncompletedTasks = pairTasks.filter(t => !t.done).length;
                const rep = replacements[activeDateKey]?.[item.num];

                return (
                  <div
                    key={item.num}
                    onClick={() => {
                      setSelectedPairDetail({ ...item, dateKey: activeDateKey });
                      triggerHaptic('light');
                    }}
                    className={`p-3.5 border transition-all cursor-pointer ${
                      rep?.type === 'cancel'
                        ? 'bg-red-950/10 border-red-500/30 hover:border-red-500/50'
                        : rep?.type === 'replace'
                          ? 'bg-amber-950/10 border-amber-500/30 hover:border-amber-500/50'
                          : !item.hasLesson
                            ? 'bg-[#08080a] border-white/[0.04] opacity-40'
                            : 'bg-[#0a0a0c] border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="px-1.5 py-0.5 bg-zinc-900 border border-white/15 text-white font-mono font-bold text-[11px]">
                          {item.pair}
                        </span>
                        <span className="font-mono text-xs text-zinc-400 tracking-wider">
                          {item.time}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {rep?.type === 'cancel' && (
                          <span className="font-mono text-[9px] bg-red-950 border border-red-500/50 text-red-300 font-bold px-1.5 py-0.2 uppercase">
                            ОТМЕНА
                          </span>
                        )}

                        {rep?.type === 'replace' && (
                          <span className="font-mono text-[9px] bg-amber-950 border border-amber-500/50 text-amber-300 font-bold px-1.5 py-0.2 uppercase">
                            ЗАМЕНА
                          </span>
                        )}

                        {uncompletedTasks > 0 && (
                          <span className="font-mono text-[9px] bg-white text-black font-bold px-1.5 py-0.2 uppercase">
                            {uncompletedTasks} ЗАДАН.
                          </span>
                        )}

                        {item.split && item.hasLesson && (
                          <span className="font-mono text-[9px] text-zinc-400 border border-white/15 px-1.5 py-0.2 uppercase">
                            {item.splitNote}
                          </span>
                        )}

                        {!item.hasLesson && (
                          <span className="font-mono text-[10px] tracking-wider text-zinc-600 uppercase">
                            НЕТ ПАРЫ
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`font-bold text-xs uppercase tracking-wide pl-8 ${rep?.type === 'cancel' ? 'line-through text-zinc-500' : 'text-white'}`}>
                      {item.subject}
                    </div>

                    {rep && (
                      <div className={`font-mono text-[11px] pl-8 mt-1 font-semibold ${rep.type === 'cancel' ? 'text-red-400' : 'text-amber-300'}`}>
                        {rep.type === 'cancel' ? `• ${rep.text || 'Пара отменена'}` : `• ЗАМЕНА: ${rep.text}`}
                      </div>
                    )}

                    {item.hasLesson && !rep && (
                      <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400 pl-8 mt-1 tracking-wider uppercase">
                        <span>{item.room}</span>
                        <span className="text-zinc-600">//</span>
                        <span>{item.teacher}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 02 // Full Week View with Expandable Accordions */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono px-1">
            <span className="text-zinc-400 uppercase tracking-wider">
              РАСПИСАНИЕ НА НЕДЕЛЮ ({parity === 'chislitel' ? 'ЧИСЛИТЕЛЬ' : 'ЗНАМЕНАТЕЛЬ'})
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => toggleAllDays(true)}
                className="text-[10px] text-zinc-500 hover:text-white uppercase underline"
              >
                РАСКРЫТЬ ВСЕ
              </button>
              <span className="text-zinc-700">·</span>
              <button 
                onClick={() => toggleAllDays(false)}
                className="text-[10px] text-zinc-500 hover:text-white uppercase underline"
              >
                СВЕРНУТЬ
              </button>
            </div>
          </div>

          {DAYS_RU.map((day) => {
            const isExpanded = !!expandedDays[day.id];
            const dayPairs = getPairsForDay(day.id, parity, selectedGroup);
            const lessonCount = dayPairs.filter(p => p.hasLesson).length;
            const dayDateKey = getDateKeyForDay(day.id);
            const dayDate = getDateForDay(day.id);
            const dayRepsCount = Object.keys(replacements[dayDateKey] || {}).length;

            return (
              <div 
                key={day.id}
                className="border border-white/10 bg-[#0a0a0c] overflow-hidden transition-all"
              >
                {/* Clickable Day Header */}
                <button
                  onClick={() => toggleDayAccordion(day.id)}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-white px-2 py-0.5 bg-zinc-900 border border-white/15">
                      {day.short}
                    </span>
                    <div>
                      <div className="font-mono font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                        <span>{day.name}</span>
                        <span className="text-[10px] text-zinc-500 font-normal">({formatShortDate(dayDate)})</span>
                        {dayRepsCount > 0 && (
                          <span className="text-[9px] bg-amber-950 border border-amber-500/40 text-amber-300 px-1 py-0.1 font-mono">
                            ЗАМЕН: {dayRepsCount}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">
                        {day.isWeekend ? 'ВЫХОДНОЙ ДЕНЬ' : `${lessonCount} ${lessonCount === 1 ? 'ПАРА' : 'ПАРЫ'}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {day.isWeekend ? (
                      <span className="font-mono text-[9px] text-zinc-500 border border-white/10 px-1.5 py-0.5 uppercase">
                        ПАР НЕТ
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] text-zinc-400 border border-white/10 px-1.5 py-0.5 uppercase">
                        09:00 — 16:15
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Pairs List */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] bg-[#070709] p-2 space-y-1.5 animate-fadeIn">
                    {day.isWeekend ? (
                      <div className="py-4 text-center font-mono text-xs text-zinc-500">
                        // ВЫХОДНОЙ ДЕНЬ · ЗАНЯТИЙ НЕТ
                      </div>
                    ) : (
                      dayPairs.map((pair) => {
                        const rep = replacements[dayDateKey]?.[pair.num];

                        return (
                          <div
                            key={pair.num}
                            onClick={() => {
                              setSelectedPairDetail({ ...pair, dateKey: dayDateKey });
                              triggerHaptic('light');
                            }}
                            className={`p-2.5 border transition-all cursor-pointer ${
                              rep?.type === 'cancel'
                                ? 'border-red-500/30 bg-red-950/10'
                                : rep?.type === 'replace'
                                  ? 'border-amber-500/30 bg-amber-950/10'
                                  : !pair.hasLesson
                                    ? 'border-white/[0.03] bg-black/40 opacity-40'
                                    : 'border-white/[0.08] bg-[#0b0b0e] hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white text-[10px] px-1 bg-zinc-900 border border-white/10">
                                  {pair.pair}
                                </span>
                                <span className="font-mono text-zinc-400 text-[10px]">
                                  {pair.time}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {rep?.type === 'cancel' && (
                                  <span className="text-[9px] font-mono bg-red-950 border border-red-500/40 text-red-300 px-1 font-bold">
                                    ОТМЕНА
                                  </span>
                                )}

                                {rep?.type === 'replace' && (
                                  <span className="text-[9px] font-mono bg-amber-950 border border-amber-500/40 text-amber-300 px-1 font-bold">
                                    ЗАМЕНА
                                  </span>
                                )}

                                {pair.split && pair.hasLesson && (
                                  <span className="text-[9px] font-mono text-zinc-400 border border-white/10 px-1">
                                    {pair.splitNote}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className={`font-bold text-xs pl-6 ${rep?.type === 'cancel' ? 'line-through text-zinc-500' : 'text-white'}`}>
                              {pair.subject}
                            </div>

                            {rep && (
                              <div className={`font-mono text-[10px] pl-6 mt-0.5 font-semibold ${rep.type === 'cancel' ? 'text-red-400' : 'text-amber-300'}`}>
                                {rep.type === 'cancel' ? `• ${rep.text || 'Пара отменена'}` : `• ЗАМЕНА: ${rep.text}`}
                              </div>
                            )}

                            {pair.hasLesson && !rep && (
                              <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400 pl-6 mt-0.5">
                                <span>{pair.room}</span>
                                <span className="text-zinc-600">//</span>
                                <span>{pair.teacher}</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Course Bells & Lunch Schedule Banner */}
      {showAllBellsTable ? (
        <div className="space-y-2">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setShowAllBellsTable(false);
                triggerHaptic('light');
              }}
              className="px-2 py-1 bg-zinc-900 border border-white/20 text-zinc-300 hover:text-white font-mono text-[10px] uppercase font-bold"
            >
              ← СВЕРНУТЬ К СВОЕМУ КУРСУ
            </button>
          </div>
          <AllCoursesBellTable currentCourse={currentCourse} />
        </div>
      ) : (
        <div className="p-3.5 bg-[#0a0a0c] border border-white/10 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
            <span className="font-mono font-bold text-[11px] tracking-widest uppercase text-white">
              РАСПИСАНИЕ ЗВОНКОВ // {currentCourse} КУРС
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-zinc-400 border border-white/15 px-1.5 py-0.5">
                ОБЕД: {lunchBreak.range}
              </span>
              <button
                onClick={() => {
                  setShowAllBellsTable(true);
                  triggerHaptic('selection');
                }}
                className="font-mono text-[10px] text-white underline hover:text-zinc-300 uppercase"
                title="Показать сводную таблицу звонков всех курсов"
              >
                ВСЕ КУРСЫ
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-zinc-400 pt-1">
            <div>
              <div className="text-white font-bold">1 ПАРА: {bellSchedule[1].range}</div>
              <div className="text-zinc-500">
                {currentCourse === 1 ? 'ОБЕД 35 МИН (10:35–11:10)' : 'Перемена 10 мин (10:35–10:45)'}
              </div>
            </div>
            <div>
              <div className="text-white font-bold">2 ПАРА: {bellSchedule[2].range}</div>
              <div className="text-zinc-300 font-bold">
                {currentCourse === 2 ? 'ОБЕД ВНУТРИ ПАРЫ 30 МИН' : (currentCourse === 1 ? 'Перемена 10 мин' : 'ОБЕД 35 МИН (12:20–12:55)')}
              </div>
            </div>
            <div>
              <div className="text-white font-bold">3 ПАРА: {bellSchedule[3].range}</div>
              <div className="text-zinc-500">Перемена 10 мин (14:30–14:40)</div>
            </div>
            <div>
              <div className="text-white font-bold">4 ПАРА: {bellSchedule[4].range}</div>
              <div className="text-zinc-500">Внутри пар 5-мин перерывы</div>
            </div>
          </div>
        </div>
      )}

      {/* Group Selector Modal */}
      {showGroupModal && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowGroupModal(false)}
        >
          <div 
            className="w-full max-w-md bg-[#0e0e11] border border-neutral-800 p-5 space-y-4 font-mono max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold text-white tracking-wider uppercase">
                ВЫБОР УЧЕБНОЙ ГРУППЫ // AITU
              </span>
              <button 
                onClick={() => setShowGroupModal(false)}
                className="text-xs text-neutral-400 hover:text-white px-1.5 py-0.5 border border-neutral-700"
              >
                [X]
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
              Выберите свою группу или введите название. Расписание звонков и обеденных перерывов автоматически адаптируется под соответствующий курс.
            </p>

            {/* Course Filter Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setGroupCourseFilter('all')}
                className={`px-2 py-1 text-[10px] font-mono whitespace-nowrap border transition-colors ${
                  groupCourseFilter === 'all'
                    ? 'bg-white text-black font-bold border-white'
                    : 'bg-black border-neutral-800 text-zinc-400 hover:text-white'
                }`}
              >
                ВСЕ ({ALL_COLLEGE_GROUPS.length})
              </button>
              {[1, 2, 3, 4].map((c) => (
                <button
                  key={c}
                  onClick={() => setGroupCourseFilter(c)}
                  className={`px-2 py-1 text-[10px] font-mono whitespace-nowrap border transition-colors ${
                    groupCourseFilter === c
                      ? 'bg-white text-black font-bold border-white'
                      : 'bg-black border-neutral-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {c} КУРС ({GROUPS_BY_COURSE[c]?.length || 0})
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={groupSearchQuery}
                onChange={(e) => setGroupSearchQuery(e.target.value)}
                placeholder="Поиск группы (например: 9РПО, 9ПО, 9ИС)..."
                className="w-full pl-8 pr-8 py-2 bg-black border border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-white placeholder:text-zinc-600"
              />
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              {groupSearchQuery && (
                <button
                  onClick={() => setGroupSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Groups Grid */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-wider">
                <span>СПИСОК ГРУПП</span>
                <span>
                  {ALL_COLLEGE_GROUPS.filter(g => {
                    if (groupCourseFilter !== 'all' && getCourseFromGroupName(g) !== groupCourseFilter) return false;
                    if (groupSearchQuery.trim()) return g.toLowerCase().includes(groupSearchQuery.trim().toLowerCase());
                    return true;
                  }).length} ИЗ {ALL_COLLEGE_GROUPS.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                {ALL_COLLEGE_GROUPS.filter(g => {
                  if (groupCourseFilter !== 'all' && getCourseFromGroupName(g) !== groupCourseFilter) return false;
                  if (groupSearchQuery.trim()) return g.toLowerCase().includes(groupSearchQuery.trim().toLowerCase());
                  return true;
                }).map((grp) => {
                  const grpCourse = getCourseFromGroupName(grp);
                  const isCur = selectedGroup === grp;
                  return (
                    <button
                      key={grp}
                      onClick={() => {
                        handleSelectGroup(grp);
                        setShowGroupModal(false);
                      }}
                      className={`p-2 border text-left flex items-center justify-between text-xs transition-colors ${
                        isCur 
                          ? 'bg-white text-black font-bold border-white shadow-xs' 
                          : 'bg-black border-neutral-800 text-zinc-300 hover:border-neutral-500'
                      }`}
                    >
                      <span className="font-mono">{grp}</span>
                      <span className={`text-[10px] ${isCur ? 'text-black font-bold' : 'text-zinc-500'}`}>
                        {isCur ? '✓' : `${grpCourse}к`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-1.5 pt-2 border-t border-neutral-800">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                ВВЕСТИ НАЗВАНИЕ ВРУЧНУЮ
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customGroupInput}
                  onChange={(e) => setCustomGroupInput(e.target.value.toUpperCase())}
                  placeholder="Например: 9ПО-11к"
                  className="flex-1 px-3 py-2 bg-black border border-neutral-700 text-white font-mono text-xs uppercase focus:outline-none focus:border-white"
                />
                <button
                  onClick={() => {
                    if (customGroupInput.trim()) {
                      handleSelectGroup(customGroupInput);
                      setCustomGroupInput('');
                      setShowGroupModal(false);
                    }
                  }}
                  className="px-3 py-2 bg-white text-black font-bold text-xs uppercase"
                >
                  ВЫБРАТЬ
                </button>
              </div>
            </div>

            <div className="p-2.5 bg-black border border-neutral-800 text-[10px] text-zinc-400 space-y-1">
              <div className="text-white font-bold uppercase">СЕТКА ОБЕДОВ ПО КУРСАМ:</div>
              <div>• 1 курс: 10:35 — 11:10 (после 1-й пары)</div>
              <div>• 2 курс: 11:30 — 12:00 (внутри 2-й пары)</div>
              <div>• 3 и 4 курсы: 12:20 — 12:55 (после 2-й пары)</div>
            </div>

            <button
              onClick={() => setShowGroupModal(false)}
              className="w-full py-2 bg-white text-black font-bold text-xs uppercase tracking-wider"
            >
              ГОТОВО
            </button>
          </div>
        </div>
      )}

      {/* Pair Details & Tasks Modal */}
      {selectedPairDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs animate-fadeIn"
          onClick={() => {
            setSelectedPairDetail(null);
            setShowAddReplacement(false);
          }}
        >
          <div 
            className="w-full max-w-md bg-[#0e0e11] border border-neutral-800 p-5 space-y-4 font-mono max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold text-white tracking-wider uppercase">
                {selectedPairDetail.pair}-Я ПАРА // {selectedPairDetail.time}
              </span>
              <button 
                onClick={() => {
                  setSelectedPairDetail(null);
                  setShowAddReplacement(false);
                }}
                className="text-xs text-neutral-400 hover:text-white px-1.5 py-0.5 border border-neutral-700"
              >
                [ЗАКРЫТЬ]
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] text-neutral-500 uppercase">ПРЕДМЕТ</div>
              <h4 className="text-sm font-bold text-white font-sans">
                {selectedPairDetail.subject}
              </h4>
            </div>

            {selectedPairDetail.hasLesson && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800 text-xs">
                <div className="p-2 bg-black border border-neutral-800">
                  <div className="text-[9px] text-neutral-500 uppercase">АУДИТОРИЯ</div>
                  <div className="text-white font-bold">{selectedPairDetail.room}</div>
                </div>
                <div className="p-2 bg-black border border-neutral-800">
                  <div className="text-[9px] text-neutral-500 uppercase">ПРЕПОДАВАТЕЛЬ</div>
                  <div className="text-white font-bold text-[11px] truncate">{selectedPairDetail.teacher}</div>
                </div>
              </div>
            )}

            <div className="p-2.5 bg-black border border-neutral-800 text-[10px] text-neutral-400 space-y-1">
              <div className="text-white font-bold uppercase">РЕЖИМ ЗАНЯТИЯ</div>
              <div>{selectedPairDetail.breakdown}</div>
            </div>

            {/* Replacements Manager Section */}
            {selectedPairDetail.hasLesson && (
              <div className="p-3 bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white uppercase font-bold tracking-wider">
                    ЗАМЕНА ИЛИ СТАТУС ПАРЫ
                  </span>
                  {replacements[selectedPairDetail.dateKey]?.[selectedPairDetail.num] && (
                    <button
                      onClick={() => handleRemoveReplacement(selectedPairDetail.dateKey, selectedPairDetail.num)}
                      className="text-[10px] text-red-400 hover:text-red-300 underline uppercase"
                    >
                      СБРОСИТЬ
                    </button>
                  )}
                </div>

                {replacements[selectedPairDetail.dateKey]?.[selectedPairDetail.num] ? (
                  <div className="p-2 border border-white/20 bg-black text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      {replacements[selectedPairDetail.dateKey][selectedPairDetail.num].type === 'cancel' ? (
                        <span className="text-red-400">🚫 ПАРА ОТМЕНЕНА</span>
                      ) : (
                        <span className="text-amber-300">⚠️ ЗАМЕНА ПАРЫ</span>
                      )}
                    </div>
                    <p className="text-zinc-200 text-[11px] font-sans">
                      {replacements[selectedPairDetail.dateKey][selectedPairDetail.num].text}
                    </p>
                  </div>
                ) : showAddReplacement ? (
                  <div className="space-y-2 pt-1 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setRepType('replace')}
                        className={`py-1 text-[10px] font-bold uppercase border ${repType === 'replace' ? 'bg-white text-black border-white' : 'border-neutral-700 text-zinc-400'}`}
                      >
                        Замена пары
                      </button>
                      <button
                        type="button"
                        onClick={() => setRepType('cancel')}
                        className={`py-1 text-[10px] font-bold uppercase border ${repType === 'cancel' ? 'bg-white text-black border-white' : 'border-neutral-700 text-zinc-400'}`}
                      >
                        Отмена пары
                      </button>
                    </div>
                    <input
                      type="text"
                      value={repText}
                      onChange={(e) => setRepText(e.target.value)}
                      placeholder={repType === 'cancel' ? "Причина отмены" : "Новый предмет, кабинет или преподаватель"}
                      className="w-full px-2.5 py-1.5 bg-black border border-neutral-700 text-white text-xs focus:outline-none focus:border-white font-sans"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowAddReplacement(false); setRepText(''); }}
                        className="px-2 py-1 text-[10px] text-zinc-400 hover:text-white"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveReplacement(selectedPairDetail.dateKey, selectedPairDetail.num, repType, repText)}
                        className="px-3 py-1 bg-white text-black font-bold text-[10px] uppercase"
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddReplacement(true)}
                    className="w-full py-1.5 border border-dashed border-neutral-700 hover:border-white text-neutral-400 hover:text-white text-[10px] uppercase tracking-wider transition-colors"
                  >
                    + Зафиксировать замену или отмену для этой пары
                  </button>
                )}
              </div>
            )}

            {/* Checklist: Tasks & Homework for this subject */}
            {selectedPairDetail.hasLesson && (
              <div className="p-3 bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white uppercase font-bold tracking-wider">
                    ЗАМЕТКИ И ДЕДЛАЙНЫ ПО ПРЕДМЕТУ
                  </span>
                  <span className="text-[9px] text-neutral-500">
                    {(tasks[selectedPairDetail.subject] || []).length} ЗАДАНИЙ
                  </span>
                </div>

                {/* List of current tasks */}
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {(tasks[selectedPairDetail.subject] || []).map(task => (
                    <div 
                      key={task.id}
                      className="flex items-center justify-between p-1.5 bg-black/60 border border-neutral-800 text-xs"
                    >
                      <button
                        onClick={() => handleToggleTask(selectedPairDetail.subject, task.id)}
                        className="flex items-center gap-2 text-left flex-1"
                      >
                        <div className={`w-3.5 h-3.5 border flex items-center justify-center ${task.done ? 'bg-white border-white text-black' : 'border-neutral-600'}`}>
                          {task.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className={`text-[11px] font-sans ${task.done ? 'line-through text-neutral-500' : 'text-neutral-200'}`}>
                          {task.text}
                        </span>
                      </button>

                      <button
                        onClick={() => handleDeleteTask(selectedPairDetail.subject, task.id)}
                        className="text-neutral-600 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {(!tasks[selectedPairDetail.subject] || tasks[selectedPairDetail.subject].length === 0) && (
                    <div className="text-[10px] text-neutral-500 py-1 font-sans">
                      Нет записанных заданий к этой паре. Добавьте задачу ниже.
                    </div>
                  )}
                </div>

                {/* Add new task input */}
                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTask(selectedPairDetail.subject);
                    }}
                    placeholder="Например: Сдать отчет по лабе..."
                    className="flex-1 px-2 py-1 bg-black border border-neutral-700 text-white font-sans text-xs focus:outline-none focus:border-white"
                  />
                  <button
                    onClick={() => handleAddTask(selectedPairDetail.subject)}
                    className="px-2.5 py-1 bg-white text-black font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setSelectedPairDetail(null);
                setShowAddReplacement(false);
              }}
              className="w-full py-2 bg-white text-black font-bold text-xs uppercase tracking-wider transition-colors hover:bg-neutral-200"
            >
              ПОНЯТНО
            </button>
          </div>
        </div>
      )}

      {/* Интерактивный навигатор свободных кабинетов и преподавателей */}
      <AuditoriumFinderModal
        isOpen={isAuditoriumModalOpen}
        onClose={() => setIsAuditoriumModalOpen(false)}
        initialTab={auditoriumInitialTab}
        currentParity={parity}
        currentDayIndex={todayIndex}
        currentPairNum={currentStatus?.currentPair?.pair || 1}
      />
    </div>
  );
}
