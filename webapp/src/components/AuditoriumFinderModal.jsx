import React, { useState } from 'react';
import { 
  X, 
  Search, 
  MapPin, 
  Clock, 
  User, 
  Layers, 
  Check, 
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { TEACHERS_LIST } from '../data/teachersData';
import { DAYS_RU, getBellSchedule } from '../data/scheduleData';
import { getRoomOccupancy, findTeacherLiveStatus, getAllTeachersFromSchedule } from '../utils/classroomFinder';
import { useTelegramBackButton, triggerHaptic } from '../utils/telegram';

export default function AuditoriumFinderModal({ 
  isOpen, 
  onClose, 
  initialTab = 'rooms', // 'rooms' or 'teachers'
  currentParity = 'chislitel',
  currentDayIndex = 0,
  currentPairNum = 1
}) {
  useTelegramBackButton(isOpen, onClose);

  const [activeTab, setActiveTab] = useState(initialTab === 'floorplan' ? 'rooms' : initialTab);
  const [selectedDay, setSelectedDay] = useState(currentDayIndex >= 0 && currentDayIndex <= 5 ? currentDayIndex : 0);
  const [selectedPair, setSelectedPair] = useState(currentPairNum >= 1 && currentPairNum <= 4 ? currentPairNum : 1);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [showOccupiedList, setShowOccupiedList] = useState(false);

  if (!isOpen) return null;

  const occupancy = getRoomOccupancy(selectedDay, selectedPair, currentParity);
  const bell = getBellSchedule(4)[selectedPair] || { range: "09:00 — 10:35" };

  const filteredTeachers = TEACHERS_LIST.filter(t => {
    const q = teacherSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.shortName.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.code.toLowerCase().includes(q) ||
      t.rooms.some(r => r.toLowerCase().includes(q))
    );
  });

  const handleSelectNow = () => {
    setSelectedDay(currentDayIndex >= 0 && currentDayIndex <= 5 ? currentDayIndex : 0);
    setSelectedPair(currentPairNum >= 1 && currentPairNum <= 4 ? currentPairNum : 1);
    triggerHaptic('selection');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn font-sans"
      onClick={() => {
        onClose();
        triggerHaptic('light');
      }}
    >
      <div 
        className="w-full max-w-lg bg-[#0e0e11] border border-white/15 flex flex-col max-h-[90vh] shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0a0a0c]">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-white" />
            <span className="font-mono text-xs font-bold text-white tracking-wider uppercase">
              НАВИГАТОР АУДИТОРИЙ И ПРЕПОДАВАТЕЛЕЙ
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

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-black/60 border-b border-white/10 font-mono text-[11px] gap-1">
          <button
            onClick={() => {
              setActiveTab('rooms');
              triggerHaptic('selection');
            }}
            className={`py-1.5 uppercase font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'rooms' 
                ? 'bg-white text-black' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>СВОБОДНЫЕ КАБИНЕТЫ</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('teachers');
              triggerHaptic('selection');
            }}
            className={`py-1.5 uppercase font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'teachers' 
                ? 'bg-white text-black' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>ПРЕПОДАВАТЕЛИ ({TEACHERS_LIST.length})</span>
          </button>
        </div>

        {/* TAB 1: СВОБОДНЫЕ АУДИТОРИИ */}
        {activeTab === 'rooms' && (
          <div className="p-4 overflow-y-auto space-y-3.5 font-sans">
            
            {/* Day and Pair selectors */}
            <div className="space-y-2 p-3 bg-neutral-900/60 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-zinc-400 uppercase font-bold">
                  ВЫБОР ВРЕМЕНИ ДЛЯ ПОИСКА ОКНА:
                </span>
                <button
                  onClick={handleSelectNow}
                  className="px-2 py-0.5 bg-white text-black font-mono text-[9px] uppercase font-bold hover:bg-zinc-200 transition-colors"
                >
                  ⚡️ СЕЙЧАС
                </button>
              </div>

              {/* Day pills (Mon to Sat) */}
              <div className="grid grid-cols-6 gap-1 font-mono text-[10px]">
                {DAYS_RU.slice(0, 6).map(d => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedDay(d.id);
                      triggerHaptic('selection');
                    }}
                    className={`py-1 border text-center transition-colors uppercase ${
                      selectedDay === d.id
                        ? 'bg-white text-black font-bold border-white'
                        : 'bg-black/40 text-zinc-400 border-white/10 hover:border-white/30'
                    }`}
                  >
                    {d.short}
                  </button>
                ))}
              </div>

              {/* Pair pills */}
              <div className="grid grid-cols-4 gap-1 font-mono text-[10px]">
                {[1, 2, 3, 4].map(p => (
                  <button
                    key={p}
                    onClick={() => {
                      setSelectedPair(p);
                      triggerHaptic('selection');
                    }}
                    className={`py-1 border text-center transition-colors uppercase ${
                      selectedPair === p
                        ? 'bg-white text-black font-bold border-white'
                        : 'bg-black/40 text-zinc-400 border-white/10 hover:border-white/30'
                    }`}
                  >
                    {p} ПАРА
                  </button>
                ))}
              </div>

              <div className="text-[10px] font-mono text-zinc-400 pt-1 flex items-center justify-between border-t border-white/5">
                <span>{DAYS_RU[selectedDay].name} · {selectedPair} пара ({bell.range})</span>
                <span className="text-emerald-400 font-bold">{occupancy.freeCount} из {occupancy.totalCount} свободны</span>
              </div>
            </div>

            {/* Free Rooms Grouped by Floors */}
            <div className="space-y-2.5">
              <div className="font-mono text-[10px] text-zinc-400 uppercase font-semibold">
                🟢 СПИСОК СВОБОДНЫХ КАБИНЕТОВ (ПО ЭТАЖАМ):
              </div>

              {[2, 3, 4, 5, 6, 7, 9].map(floor => {
                const roomsOnFloor = occupancy.byFloor[floor] || [];
                return (
                  <div key={floor} className="p-2.5 bg-black/40 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="font-bold text-white uppercase">{floor}-Й ЭТАЖ</span>
                      <span className="text-zinc-500">
                        {roomsOnFloor.length > 0 ? `${roomsOnFloor.length} каб.` : 'нет свободных'}
                      </span>
                    </div>

                    {roomsOnFloor.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 font-mono text-[10px]">
                        {roomsOnFloor.map(rm => (
                          <div 
                            key={rm} 
                            className="p-1.5 bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-center font-bold"
                          >
                            {rm}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[9px] font-mono text-zinc-600 italic">
                        Все аудитории этажа заняты занятиями
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Occupied Rooms Summary & Accordion */}
            <div className="p-2.5 bg-black/30 border border-white/10 space-y-2 font-mono text-[10px]">
              <div 
                onClick={() => {
                  setShowOccupiedList(!showOccupiedList);
                  triggerHaptic('light');
                }}
                className="flex items-center justify-between cursor-pointer text-zinc-400 hover:text-white"
              >
                <span>ЗАНИМАЕМЫЕ АУДИТОРИИ ({occupancy.occupiedCount})</span>
                <span className="flex items-center gap-1 text-[9px] text-zinc-500">
                  {showOccupiedList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </div>

              {showOccupiedList && (
                <div className="grid grid-cols-1 gap-1 pt-1.5 max-h-48 overflow-y-auto">
                  {occupancy.occupiedRooms.map(o => (
                    <div key={o.room} className="p-1.5 bg-neutral-900/60 border border-white/5 flex items-center justify-between text-[9px]">
                      <span className="font-bold text-zinc-300">{o.room}</span>
                      <span className="text-zinc-400 truncate max-w-[140px]">{o.subject}</span>
                      <span className="text-amber-400">{o.group}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: ПРЕПОДАВАТЕЛИ (ОНЛАЙН-СТАТУС И ПОИСК ПО 57 ГРУППАМ) */}
        {activeTab === 'teachers' && (() => {
          const liveStatus = teacherSearch.trim().length >= 2
            ? findTeacherLiveStatus(teacherSearch, selectedDay, selectedPair, currentParity)
            : null;

          return (
            <div className="p-4 overflow-y-auto space-y-3 font-sans">
              {/* Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="Введите фамилию преподавателя..."
                  className="w-full pl-9 pr-3 py-2 bg-black border border-white/15 font-mono text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              {/* LIVE STATUS CARD IF SEARCHED */}
              {liveStatus && (
                <div className="p-3.5 bg-black border border-white/20 space-y-2.5 font-mono">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">
                      {liveStatus.matchedTeacher}
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      liveStatus.isTeachingNow
                        ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-300'
                        : 'bg-zinc-900 border border-zinc-700 text-zinc-400'
                    }`}>
                      {liveStatus.isTeachingNow ? '🟢 ВЕДЕТ ПАРУ СЕЙЧАС' : '⚪ СВОБОДЕН(НА)'}
                    </span>
                  </div>

                  {liveStatus.isTeachingNow && liveStatus.currentPairLesson && (
                    <div className="space-y-1.5 text-xs bg-zinc-950 p-2.5 border border-white/10">
                      <div className="flex items-center justify-between text-white font-bold">
                        <span>{liveStatus.currentPairLesson.pairNum}-я пара ({bell.range})</span>
                        <span className="px-1.5 py-0.2 bg-emerald-500 text-black font-black text-[10px]">
                          {liveStatus.currentPairLesson.room}
                        </span>
                      </div>
                      <div className="text-zinc-300 font-sans text-xs">
                        {liveStatus.currentPairLesson.subject}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        Группа: <span className="text-white font-bold">{liveStatus.currentPairLesson.group}</span> ({liveStatus.currentPairLesson.course} курс)
                      </div>
                    </div>
                  )}

                  {!liveStatus.isTeachingNow && (
                    <div className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                      {liveStatus.nextPairLesson ? (
                        <div>
                          Следующая пара: <span className="text-white font-bold">{liveStatus.nextPairLesson.pairNum}-я пара</span> · 
                          ауд. <span className="text-emerald-400 font-bold">{liveStatus.nextPairLesson.room}</span> ({liveStatus.nextPairLesson.group}, {liveStatus.nextPairLesson.subject})
                        </div>
                      ) : (
                        <div>На выбранный день ({DAYS_RU[selectedDay].name}) пар больше нет или преподаватель не ведет занятия.</div>
                      )}
                    </div>
                  )}

                  {/* Lessons today summary */}
                  {liveStatus.lessonsToday.length > 0 && (
                    <div className="pt-1.5 border-t border-white/[0.08] space-y-1">
                      <div className="text-[9px] text-zinc-500 uppercase tracking-wider">
                        ВСЕ ПАРЫ СЕГОДНЯ ({liveStatus.lessonsToday.length}):
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-[10px]">
                        {liveStatus.lessonsToday.map((ls, idx) => (
                          <div key={idx} className="flex items-center justify-between p-1.5 bg-[#0a0a0c] border border-white/5">
                            <span className="text-zinc-400">{ls.pairNum}-я пара</span>
                            <span className="text-white truncate max-w-[140px]">{ls.subject}</span>
                            <span className="text-emerald-400 font-bold">{ls.room}</span>
                            <span className="text-zinc-500">{ls.group}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fast Pick / Catalog list if no active search or general list */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  {teacherSearch ? 'ДРУГИЕ СОВПАДЕНИЯ:' : 'ПРЕПОДАВАТЕЛИ ВЫПУСКАЮЩИХ КАФЕДР:'}
                </div>
                <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-0.5">
                  {filteredTeachers.map(teacher => (
                    <div 
                      key={teacher.id}
                      onClick={() => {
                        setTeacherSearch(teacher.shortName || teacher.name);
                        triggerHaptic('light');
                      }}
                      className="p-2.5 bg-neutral-900/60 border border-white/10 hover:border-white/30 cursor-pointer space-y-1 font-sans transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-white text-xs">
                            {teacher.name}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono">
                            {teacher.subject}
                          </div>
                        </div>
                        <span className="font-mono text-[9px] px-1.5 py-0.2 bg-white/10 text-zinc-300 font-bold uppercase">
                          {teacher.code}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 font-mono text-[9px]">
                        <span className="text-zinc-500">Аудитории:</span>
                        {teacher.rooms.map(rm => (
                          <span 
                            key={rm}
                            className="px-1 py-0.2 bg-black border border-white/10 text-emerald-400"
                          >
                            {rm}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#0a0a0c] border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-zinc-500">
          <span>AITU COLLABORATIVE SCHEDULE</span>
          <span>{DAYS_RU[selectedDay].name.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
