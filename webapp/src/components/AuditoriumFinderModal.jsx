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
  ChevronUp,
  Building,
  Coffee,
  Utensils,
  Navigation,
  Compass,
  Footprints,
  Info
} from 'lucide-react';
import { TEACHERS_LIST } from '../data/teachersData';
import { DAYS_RU, getBellSchedule } from '../data/scheduleData';
import { getRoomOccupancy, findTeacherLiveStatus, getAllTeachersFromSchedule } from '../utils/classroomFinder';
import { useTelegramBackButton, triggerHaptic } from '../utils/telegram';

const FLOOR_CONFIG = {
  1: {
    title: "1-Й ЭТАЖ // ВХОД, СТОЛОВАЯ И ГАРДЕРОБ",
    description: "Входная группа с турникетами, гардеробные зоны, студенческая столовая и спортзал",
    amenities: [
      { name: "Главный вход & Турникеты", zone: "Центральный вестибюль", desc: "Пропускная система по картам/Face ID" },
      { name: "Студенческий гардероб", zone: "Левое крыло", desc: "Прием и выдача верхней одежды" },
      { name: "Столовая и буфет AITU", zone: "Правое крыло", desc: "Горячие обеды, выпечка и кофейный автомат", highlight: true },
      { name: "Спортивный зал (С/з)", zone: "Северный переход", desc: "Игровой зал и раздевалки для физкультуры" },
      { name: "Медицинский пункт", zone: "Около турникетов", desc: "Первая медицинская помощь" },
      { name: "Лестничные марши А, Б и Лифты", zone: "Вестибюль", desc: "Подъем на 2–9 этажи колледжа" }
    ],
    rooms: []
  },
  2: {
    title: "2-Й ЭТАЖ // АДМИНИСТРАЦИЯ И АКТОГВЫЙ ЗАЛ",
    description: "Деканат, учебная часть, приёмная директора и большой актовый зал",
    amenities: [
      { name: "Большой актовый зал", zone: "Центральное фойе" },
      { name: "Деканат и учебная часть", zone: "Западное крыло" },
      { name: "Лестничный марш и санузлы", zone: "По торцам" }
    ],
    rooms: ["каб. 205", "каб. 216", "каб. 217"]
  },
  3: {
    title: "3-Й ЭТАЖ // IT-ЛАБОРАТОРИИ И ПРОГРАММИРОВАНИЕ",
    description: "Компьютерные классы кафедры разработки ПО, серверные и сетевые аудитории",
    amenities: [
      { name: "Серверный узел колледжа", zone: "каб. 305" },
      { name: "IT-коворкинг", zone: "Центральный холл" },
      { name: "Лестницы А/Б и санузлы", zone: "По торцам" }
    ],
    rooms: ["каб. 301", "каб. 304", "каб. 305", "каб. 308", "каб. 309"]
  },
  4: {
    title: "4-Й ЭТАЖ // СЕТЕВОЕ АДМИНИСТРИРОВАНИЕ И ФИЗИКА",
    description: "Лаборатории монтажа сетей, схемотехники и аудитории точных наук",
    amenities: [
      { name: "Сетевой полигон", zone: "каб. 422" },
      { name: "Зона отдыха", zone: "Холл" },
      { name: "Лестницы и санузлы", zone: "По торцам" }
    ],
    rooms: ["каб. 404", "каб. 409", "каб. 422", "каб. 424", "каб. 431", "каб. 434"]
  },
  5: {
    title: "5-Й ЭТАЖ // ОБЩЕОБРАЗОВАТЕЛЬНЫЕ ДИСЦИПЛИНЫ",
    description: "Аудитории общеобразовательных предметов, гуманитарных дисциплин и истории",
    amenities: [
      { name: "Преподавательская", zone: "каб. 510" },
      { name: "Лестницы и санузлы", zone: "По торцам" }
    ],
    rooms: [
      "каб. 505", "каб. 506", "каб. 507", "каб. 510", "каб. 512", "каб. 513", 
      "каб. 514", "каб. 515", "каб. 516", "каб. 517", "каб. 520", "каб. 521"
    ]
  },
  6: {
    title: "6-Й ЭТАЖ // МАТЕМАТИКА И СПЕЦИАЛЬНЫЕ ДИСЦИПЛИНЫ",
    description: "Аудитории математического анализа, алгоритмов и иностранных языков",
    amenities: [
      { name: "Языковой медиа-класс", zone: "каб. 614" },
      { name: "Лестницы и санузлы", zone: "По торцам" }
    ],
    rooms: [
      "каб. 601", "каб. 605", "каб. 606", "каб. 607", "каб. 608", "каб. 609", 
      "каб. 610", "каб. 611", "каб. 612", "каб. 613", "каб. 614", "каб. 615", 
      "каб. 616", "каб. 618", "каб. 622"
    ]
  },
  7: {
    title: "7-Й ЭТАЖ // ПОТОЧНЫЕ АУДИТОРИИ СТАРШИХ КУРСОВ",
    description: "Большие лекционные аудитории, курсовое проектирование и дипломные группы",
    amenities: [
      { name: "Поточная лекционная", zone: "каб. 701" },
      { name: "Лестницы и санузлы", zone: "По торцам" }
    ],
    rooms: [
      "каб. 701", "каб. 706", "каб. 710", "каб. 711", "каб. 712", "каб. 713", 
      "каб. 714", "каб. 715", "каб. 716", "каб. 718", "каб. 722"
    ]
  },
  9: {
    title: "9-Й ЭТАЖ // ПРОЕКТНЫЕ ЛАБОРАТОРИИ",
    description: "Кабинеты проектной деятельности, хакатон-зоны и дипломного наставничества",
    amenities: [
      { name: "Проектные офисы", zone: "Центральное крыло" }
    ],
    rooms: ["каб. 906", "каб. 907", "каб. 908"]
  }
};

export default function AuditoriumFinderModal({ 
  isOpen, 
  onClose, 
  initialTab = 'rooms', // 'rooms', 'floorplan' or 'teachers'
  currentParity = 'chislitel',
  currentDayIndex = 0,
  currentPairNum = 1
}) {
  useTelegramBackButton(isOpen, onClose);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedDay, setSelectedDay] = useState(currentDayIndex >= 0 && currentDayIndex <= 5 ? currentDayIndex : 0);
  const [selectedPair, setSelectedPair] = useState(currentPairNum >= 1 && currentPairNum <= 4 ? currentPairNum : 1);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [showOccupiedList, setShowOccupiedList] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(3);
  const [activeRoomDetail, setActiveRoomDetail] = useState(null);

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
        <div className="grid grid-cols-3 p-1.5 bg-black/60 border-b border-white/10 font-mono text-[10px] gap-1">
          <button
            onClick={() => {
              setActiveTab('rooms');
              triggerHaptic('selection');
            }}
            className={`py-1.5 uppercase font-bold transition-all text-center flex items-center justify-center gap-1 ${
              activeTab === 'rooms' 
                ? 'bg-white text-black' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3 h-3" />
            <span className="truncate">Кабинеты</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('floorplan');
              triggerHaptic('selection');
            }}
            className={`py-1.5 uppercase font-bold transition-all text-center flex items-center justify-center gap-1 ${
              activeTab === 'floorplan' 
                ? 'bg-white text-black' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Building className="w-3 h-3" />
            <span className="truncate">Схема этажей</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('teachers');
              triggerHaptic('selection');
            }}
            className={`py-1.5 uppercase font-bold transition-all text-center flex items-center justify-center gap-1 ${
              activeTab === 'teachers' 
                ? 'bg-white text-black' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <User className="w-3 h-3" />
            <span className="truncate">Преподаватели</span>
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

        {/* TAB 2: ИНТЕРАКТИВНАЯ СХЕМА ЭТАЖЕЙ И НАВИГАЦИЯ */}
        {activeTab === 'floorplan' && (() => {
          const currentConfig = FLOOR_CONFIG[selectedFloor] || FLOOR_CONFIG[3];
          const roomsForFloor = currentConfig.rooms || [];
          
          return (
            <div className="p-3 sm:p-4 overflow-y-auto space-y-3.5 font-sans">
              {/* Floor Selector Bar */}
              <div className="space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase">
                  <span>ВЫБЕРИТЕ ЭТАЖ:</span>
                  <span className="text-zinc-500">{DAYS_RU[selectedDay].short} · {selectedPair} пара</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 text-[11px]">
                  {[1, 2, 3, 4, 5, 6, 7, 9].map(fl => (
                    <button
                      key={fl}
                      onClick={() => {
                        setSelectedFloor(fl);
                        setActiveRoomDetail(null);
                        triggerHaptic('selection');
                      }}
                      className={`py-1.5 border text-center font-bold transition-all ${
                        selectedFloor === fl
                          ? 'bg-white text-black border-white shadow-sm'
                          : 'bg-black/50 text-zinc-400 border-white/10 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {fl} ЭТ.
                    </button>
                  ))}
                </div>
              </div>

              {/* Floor Header Badge */}
              <div className="p-3 bg-neutral-900/70 border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white uppercase flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-zinc-400" />
                    {currentConfig.title}
                  </span>
                  <span className="font-mono text-[9px] px-1.5 py-0.2 bg-white/10 text-zinc-300">
                    КОРПУС AITU
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                  {currentConfig.description}
                </p>
              </div>

              {/* Floor 1 Specific Blueprint: Amenities & Services */}
              {selectedFloor === 1 ? (
                <div className="space-y-2">
                  <div className="font-mono text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
                    <Compass className="w-3 h-3 text-zinc-400" />
                    <span>ИНФРАСТРУКТУРА ПЕРВОГО ЭТАЖА:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentConfig.amenities.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3 border transition-colors ${
                          item.highlight 
                            ? 'bg-amber-950/20 border-amber-500/40' 
                            : 'bg-black/40 border-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`font-mono text-xs font-bold ${item.highlight ? 'text-amber-300' : 'text-white'}`}>
                            {item.name}
                          </span>
                          <span className="font-mono text-[9px] px-1.5 py-0.2 bg-white/5 border border-white/10 text-zinc-400 uppercase">
                            {item.zone}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-sans mt-1">
                          {item.desc}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 bg-blue-950/20 border border-blue-500/30 flex items-start gap-2 text-[11px] font-mono text-blue-300">
                    <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Для перехода на учебные этажи (2–9) воспользуйтесь лестничными пролетами по обе стороны холла либо лифтовой группой.</span>
                  </div>
                </div>
              ) : (
                /* Floors 2..9 Corridor Blueprint & Live Rooms */
                <div className="space-y-3 font-mono">
                  {/* Corridor Layout Bar */}
                  <div className="p-2 bg-black/60 border border-white/10 flex items-center justify-between text-[9px] text-zinc-400 uppercase font-bold">
                    <span>[ лестница а ]</span>
                    <span className="text-zinc-500 flex items-center gap-1">
                      <Footprints className="w-3 h-3 text-zinc-500" />
                      ЦЕНТРАЛЬНЫЙ КОРИДОР · ЭТАЖ {selectedFloor}
                    </span>
                    <span>[ лестница б ]</span>
                  </div>

                  {/* Interactive Rooms Matrix */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase font-bold">
                      <span>АУДИТОРИИ ЭТАЖА (НАЖМИТЕ ДЛЯ ДЕТАЛЕЙ):</span>
                      <span className="text-emerald-400">
                        {roomsForFloor.filter(r => occupancy.freeRooms.includes(r)).length} свободно
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {roomsForFloor.map(rm => {
                        const isFree = occupancy.freeRooms.includes(rm);
                        const occInfo = occupancy.occupiedRooms.find(o => o.room === rm);
                        const isSelected = activeRoomDetail?.room === rm;

                        return (
                          <div
                            key={rm}
                            onClick={() => {
                              setActiveRoomDetail({
                                room: rm,
                                isFree,
                                occInfo
                              });
                              triggerHaptic('light');
                            }}
                            className={`p-2.5 border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-white text-black border-white ring-2 ring-white/50'
                                : isFree
                                  ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400'
                                  : 'bg-black/60 border-white/10 hover:border-white/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold font-mono ${isSelected ? 'text-black' : 'text-white'}`}>
                                {rm}
                              </span>
                              <span className={`text-[8px] font-bold px-1.5 py-0.2 uppercase ${
                                isSelected
                                  ? 'bg-black text-white'
                                  : isFree
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {isFree ? 'СВОБОДЕН' : 'ЗАНЯТ'}
                              </span>
                            </div>

                            <div className={`text-[10px] truncate mt-1 ${isSelected ? 'text-zinc-800' : 'text-zinc-400'}`}>
                              {isFree ? 'Окно для занятий' : (occInfo?.group || 'Занятие')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Room Detailed Popover */}
                  {activeRoomDetail && (
                    <div className="p-3 bg-black border border-white/20 space-y-2 animate-fadeIn font-mono">
                      <div className="flex items-start justify-between border-b border-white/10 pb-2">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                            {activeRoomDetail.room} · {selectedFloor}-Й ЭТАЖ
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            {activeRoomDetail.isFree 
                              ? '🟢 Аудитория свободна на эту пару' 
                              : `🔴 Занято группой ${activeRoomDetail.occInfo?.group || '—'}`}
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveRoomDetail(null)}
                          className="text-zinc-500 hover:text-white text-xs p-1"
                        >
                          ✕
                        </button>
                      </div>

                      {!activeRoomDetail.isFree && activeRoomDetail.occInfo && (
                        <div className="grid grid-cols-2 gap-2 text-[10px] bg-neutral-900/60 p-2 border border-white/5">
                          <div>
                            <span className="text-zinc-500 block">ПРЕДМЕТ:</span>
                            <span className="text-white font-bold truncate block">{activeRoomDetail.occInfo.subject}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">ПРЕПОДАВАТЕЛЬ:</span>
                            <span className="text-amber-400 truncate block">{activeRoomDetail.occInfo.teacher}</span>
                          </div>
                        </div>
                      )}

                      <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 pt-1">
                        <Navigation className="w-3 h-3 text-zinc-500" />
                        <span>Навигация: выход из лестницы {selectedFloor}-го этажа, по указателям в коридоре.</span>
                      </div>
                    </div>
                  )}

                  {/* Floor Amenities */}
                  <div className="p-2.5 bg-black/40 border border-white/10 space-y-1.5 text-[10px]">
                    <div className="text-zinc-500 uppercase font-bold flex items-center gap-1">
                      <Layers className="w-3 h-3 text-zinc-400" />
                      <span>ЗОНЫ И СЕРВИСЫ {selectedFloor}-ГО ЭТАЖА:</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-zinc-300">
                      {currentConfig.amenities.map((a, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-neutral-900 border border-white/10 text-[9px]">
                          {a.name} ({a.zone})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 3: ПРЕПОДАВАТЕЛИ (ОНЛАЙН-СТАТУС И ПОИСК ПО 57 ГРУППАМ) */}
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
