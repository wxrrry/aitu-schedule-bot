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
  Sparkles
} from 'lucide-react';
import { TEACHERS_LIST } from '../data/teachersData';
import { DAYS_RU, getBellSchedule } from '../data/scheduleData';
import { getRoomOccupancy } from '../utils/classroomFinder';
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

  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedDay, setSelectedDay] = useState(currentDayIndex >= 0 && currentDayIndex <= 4 ? currentDayIndex : 0);
  const [selectedPair, setSelectedPair] = useState(currentPairNum >= 1 && currentPairNum <= 4 ? currentPairNum : 1);
  const [teacherSearch, setTeacherSearch] = useState('');

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
    setSelectedDay(currentDayIndex >= 0 && currentDayIndex <= 4 ? currentDayIndex : 0);
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

              {/* Day pills */}
              <div className="grid grid-cols-5 gap-1 font-mono text-[10px]">
                {DAYS_RU.slice(0, 5).map(d => (
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

              {[3, 4, 5, 6].map(floor => {
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
                      <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
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

            {/* Occupied Rooms Summary */}
            <div className="p-2.5 bg-black/20 border border-white/5 space-y-1 font-mono text-[9px] text-zinc-500">
              <div>* Занятые кабинеты на этот слот: {occupancy.occupiedRooms.map(o => o.room).join(', ')}</div>
            </div>

          </div>
        )}

        {/* TAB 2: ПРЕПОДАВАТЕЛИ */}
        {activeTab === 'teachers' && (
          <div className="p-4 overflow-y-auto space-y-3 font-sans">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Поиск по ФИО, предмету, аудитории..."
                className="w-full pl-9 pr-3 py-2 bg-black border border-white/15 font-mono text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* Teachers Cards List */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
              {filteredTeachers.map(teacher => (
                <div 
                  key={teacher.id}
                  className="p-3 bg-neutral-900/60 border border-white/10 space-y-2 font-sans"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-xs">
                        {teacher.name}
                      </h4>
                      <div className="text-[11px] text-zinc-300 mt-0.5">
                        {teacher.subject}
                      </div>
                    </div>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 bg-zinc-800 text-zinc-300 border border-white/10 whitespace-nowrap">
                      {teacher.code}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 font-mono text-[10px]">
                    <div>
                      <span className="text-zinc-500 block text-[9px]">КАБИНЕТЫ:</span>
                      <span className="text-emerald-400 font-bold">{teacher.rooms.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">ДНИ:</span>
                      <span className="text-zinc-300">{teacher.days.join(', ')}</span>
                    </div>
                  </div>

                  {teacher.notes && (
                    <div className="text-[10px] text-zinc-400 font-sans border-t border-white/5 pt-1">
                      {teacher.notes}
                    </div>
                  )}
                </div>
              ))}

              {filteredTeachers.length === 0 && (
                <div className="p-6 text-center font-mono text-xs text-zinc-500">
                  Преподаватель или аудитория не найдены.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
