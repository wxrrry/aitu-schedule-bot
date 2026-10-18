import React, { useState } from 'react';
import { 
  User,
  ExternalLink, 
  Download, 
  Calendar as CalendarIcon, 
  Check, 
  Send, 
  Clock,
  Sparkles,
  RefreshCw,
  Sliders,
  ChevronRight,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { openBotCommand, triggerHaptic } from '../utils/telegram';
import { CHANGELOG_STAGES, APP_CURRENT_VERSION } from '../data/changelogData';
import { COURSE_SCHEDULES, getBellSchedule, getLunchBreak } from '../data/scheduleData';
import { syncProfileToBot, getRoleDisplay } from '../utils/userProfile';
import AllCoursesBellTable from './AllCoursesBellTable';
import AuditoriumFinderModal from './AuditoriumFinderModal';

export default function ServicesTab({ profile, onOpenProfile, onOpenChangelog, onOpenStarosta }) {
  const [quickSyncStatus, setQuickSyncStatus] = useState(null);
  const [isAuditoriumOpen, setIsAuditoriumOpen] = useState(false);
  const [auditoriumTab, setAuditoriumTab] = useState('floorplan');

  const studentCourse = profile?.course || 4;
  const studentGroup = profile?.group || '9ПО-43к';
  const lunchBreak = getLunchBreak(studentCourse);
  const roleInfo = getRoleDisplay(profile?.role);

  const handleQuickSync = () => {
    if (!profile) return;
    setQuickSyncStatus('syncing');
    triggerHaptic('medium');
    try {
      syncProfileToBot(profile);
      setTimeout(() => {
        setQuickSyncStatus('success');
        triggerHaptic('success');
        setTimeout(() => setQuickSyncStatus(null), 2500);
      }, 500);
    } catch (e) {
      setQuickSyncStatus(null);
    }
  };

  const handleExportIcs = () => {
    const course = profile?.course || 4;
    const group = profile?.group || '9ПО-43к';
    const schedule = COURSE_SCHEDULES[course] || COURSE_SCHEDULES[4];
    const bells = getBellSchedule(course);

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AITU//Schedule//RU',
      `X-WR-CALNAME:AITU ${group}`,
      'CALSCALE:GREGORIAN'
    ];

    [0, 1, 2, 3, 4].forEach(dayIdx => {
      const dayPairs = schedule[dayIdx] || {};
      Object.entries(dayPairs).forEach(([pairNum, pairData]) => {
        if (!pairData || !pairData.subject) return;
        const bell = bells[pairNum] || { start: '09:00', end: '10:35' };
        icsContent.push(
          'BEGIN:VEVENT',
          `SUMMARY:[${pairNum} пара] ${pairData.subject}`,
          `LOCATION:${pairData.room || 'Колледж AITU'}`,
          `DESCRIPTION:Преподаватель: ${pairData.teacher || 'Кафедра'}. Группа: ${group}`,
          'STATUS:CONFIRMED',
          'END:VEVENT'
        );
      });
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AITU_Расписание_${group}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    triggerHaptic('success');
  };

  return (
    <div className="space-y-4 pb-20 animate-fadeIn font-sans">
      
      {/* Компактный статус студента с переходом в профиль */}
      {profile && (
        <div 
          onClick={() => {
            if (onOpenProfile) onOpenProfile();
            triggerHaptic('selection');
          }}
          className="p-2.5 bg-[#0a0a0c] border border-white/10 hover:border-white/30 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xs bg-zinc-800 border border-white/20 flex items-center justify-center font-mono font-bold text-white text-xs flex-shrink-0">
              {profile.fullName ? profile.fullName[0].toUpperCase() : 'С'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-bold text-white text-xs truncate">
                  {profile.fullName}
                </span>
                <span className={`text-[9px] font-mono font-bold ${roleInfo.color}`}>
                  [{roleInfo.title}]
                </span>
              </div>
              <div className="text-[10px] font-mono text-zinc-400">
                Группа: <span className="text-white font-bold">{profile.group}</span> · {profile.course} курс
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-zinc-400 group-hover:text-white font-mono text-[10px] transition-colors flex-shrink-0">
            <span>ПРОФИЛЬ</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* 01 // Учебные сервисы и материалы */}
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5 px-1">
          <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase font-semibold">
            01 // УЧЕБНЫЕ СЕРВИСЫ И МАТЕРИАЛЫ
          </span>
          <span className="font-mono text-[10px] text-zinc-600 uppercase">AITU</span>
        </div>

        {/* Auditorium & Teacher Navigator Card */}
        <div 
          onClick={() => {
            setIsAuditoriumOpen(true);
            triggerHaptic('light');
          }}
          className="p-3 bg-[#0a0a0c] border border-white/10 hover:border-emerald-500/40 flex items-center justify-between cursor-pointer transition-all group"
        >
          <div className="space-y-0.5">
            <div className="font-mono text-[9px] text-emerald-400 tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              НАВИГАТОР // АУДИТОРИИ & ПРЕПОДАВАТЕЛИ
            </div>
            <div className="font-bold text-white text-xs tracking-tight group-hover:text-emerald-300 transition-colors">
              ГДЕ ОКНО? СВОБОДНЫЕ КАБИНЕТЫ
            </div>
            <div className="text-[10px] font-mono text-zinc-400">
              Поиск свободных кабинетов по этажам и карточки преподавателей
            </div>
          </div>
          <div className="px-2 py-1 bg-zinc-900 border border-white/10 group-hover:bg-emerald-500 group-hover:text-black group-hover:border-emerald-500 font-mono text-[10px] tracking-wider text-zinc-300 flex items-center gap-1 transition-all">
            <span>НАЙТИ</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Starosta Panel Card */}
        <div 
          onClick={() => {
            if (onOpenStarosta) onOpenStarosta();
            triggerHaptic('medium');
          }}
          className="p-3 bg-[#0a0a0c] border border-amber-500/20 hover:border-amber-500/50 flex items-center justify-between cursor-pointer transition-all group"
        >
          <div className="space-y-0.5">
            <div className="font-mono text-[9px] text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              СТАРОСТА // УПРАВЛЕНИЕ ГРУППОЙ
            </div>
            <div className="font-bold text-white text-xs tracking-tight group-hover:text-amber-300 transition-colors">
              ПАНЕЛЬ СТАРОСТЫ (HUB)
            </div>
            <div className="text-[10px] font-mono text-zinc-400">
              Замены пар, объявления в чат группы и рапортичка посещаемости
            </div>
          </div>
          <div className="px-2 py-1 bg-zinc-900 border border-amber-500/30 group-hover:bg-amber-400 group-hover:text-black font-mono text-[10px] tracking-wider text-amber-300 flex items-center gap-1 transition-all">
            <span>ОТКРЫТЬ</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Floorplan & Navigation Card */}
        <div 
          onClick={() => {
            setAuditoriumTab('floorplan');
            setIsAuditoriumOpen(true);
            triggerHaptic('light');
          }}
          className="p-3 bg-[#0a0a0c] border border-blue-500/20 hover:border-blue-500/50 flex items-center justify-between cursor-pointer transition-all group"
        >
          <div className="space-y-0.5">
            <div className="font-mono text-[9px] text-blue-400 tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              КОРПУС // НАВИГАЦИЯ
            </div>
            <div className="font-bold text-white text-xs tracking-tight group-hover:text-blue-300 transition-colors">
              ИНТЕРАКТИВНАЯ СХЕМА ЭТАЖЕЙ
            </div>
            <div className="text-[10px] font-mono text-zinc-400">
              1–7 этажи, столовая, гардероб, спортзал и свободные кабинеты
            </div>
          </div>
          <div className="px-2 py-1 bg-zinc-900 border border-blue-500/30 group-hover:bg-blue-500 group-hover:text-black font-mono text-[10px] tracking-wider text-blue-300 flex items-center gap-1 transition-all">
            <span>ОТКРЫТЬ</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Moodle Card */}
        <a
          href="https://do.eduhouse.ru"
          target="_blank"
          rel="noreferrer"
          className="p-3 bg-[#0a0a0c] border border-white/10 hover:border-white/30 flex items-center justify-between transition-all group"
        >
          <div className="space-y-0.5">
            <div className="font-mono text-[9px] text-zinc-500 tracking-wider uppercase">
              ПОРТАЛ // СДО
            </div>
            <div className="font-bold text-white text-xs tracking-tight group-hover:text-zinc-200">
              СДО MOODLE
            </div>
            <div className="text-[10px] font-mono text-zinc-400">
              do.eduhouse.ru · Оценки и задания
            </div>
          </div>
          <div className="px-2 py-1 bg-zinc-900 border border-white/10 group-hover:bg-white group-hover:text-black font-mono text-[10px] tracking-wider text-zinc-300 flex items-center gap-1 transition-colors">
            <span>ОТКРЫТЬ</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        </a>

        {/* Title Page Docx Card */}
        <div className="p-3 bg-[#0a0a0c] border border-white/10 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="font-mono text-[9px] text-zinc-500 tracking-wider uppercase">
              ДОКУМЕНТ // DOCX
            </div>
            <div className="font-bold text-white text-xs tracking-tight">
              МАКЕТ ТИТУЛЬНОГО ЛИСТА
            </div>
            <div className="text-[10px] font-mono text-zinc-400">
              Официальный бланк для ПЗ и ЛР колледжа
            </div>
          </div>
          <a
            href="/maket_titul_pz_lr.docx"
            download="maket_titul_pz_lr.docx"
            onClick={() => triggerHaptic('success')}
            className="px-2 py-1 bg-white text-black font-mono font-bold text-[10px] tracking-wider uppercase hover:bg-zinc-200 flex items-center gap-1 transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>СКАЧАТЬ</span>
          </a>
        </div>

        {/* iCalendar (.ics) Export Card */}
        <div className="p-3 bg-[#0a0a0c] border border-white/10 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="font-mono text-[9px] text-zinc-500 tracking-wider uppercase">
              СИНХРОНИЗАЦИЯ // КАЛЕНДАРЬ
            </div>
            <div className="font-bold text-white text-xs tracking-tight">
              КАЛЕНДАРЬ РАСПИСАНИЯ (.ICS)
            </div>
            <div className="text-[10px] font-mono text-zinc-400">
              Apple Calendar, Google Calendar, Outlook
            </div>
          </div>
          <button
            onClick={handleExportIcs}
            className="px-2 py-1 bg-zinc-900 border border-white/15 hover:bg-white hover:text-black font-mono font-bold text-[10px] tracking-wider uppercase text-zinc-200 flex items-center gap-1 transition-colors"
          >
            <CalendarIcon className="w-3 h-3" />
            <span>ЭКСПОРТ ДЛЯ {studentGroup}</span>
          </button>
        </div>
      </div>

      {/* 02 // График звонков и обедов всех курсов */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5 px-1">
          <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase font-semibold">
            02 // ГРАФИК ЗВОНКОВ И ОБЕДОВ (1–4 КУРСЫ)
          </span>
          <span className="font-mono text-[10px] text-emerald-400 uppercase">
            ОБЕД: {lunchBreak.range}
          </span>
        </div>

        {/* Интерактивная таблица всех курсов */}
        <AllCoursesBellTable currentCourse={studentCourse} />
      </div>

      {/* 03 // Бот, команды и замены */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5 px-1">
          <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase font-semibold">
            03 // TELEGRAM-БОТ И БЫСТРЫЕ КОМАНДЫ
          </span>
          <span className="font-mono text-[10px] text-zinc-600 uppercase">ИНТЕГРАЦИЯ</span>
        </div>

        <div className="p-3 bg-[#0a0a0c] border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-bold text-white text-xs">
                СИНХРОНИЗАЦИЯ С БОТОМ
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                Привязка группы {studentGroup} и расписания звонков
              </div>
            </div>
            <button
              onClick={handleQuickSync}
              disabled={quickSyncStatus === 'syncing'}
              className="px-3 py-1 bg-white text-black font-mono font-bold text-[10px] uppercase hover:bg-zinc-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {quickSyncStatus === 'syncing' ? (
                <RefreshCw className="w-3 h-3 animate-spin text-black" />
              ) : quickSyncStatus === 'success' ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Send className="w-3 h-3 text-black" />
              )}
              <span>{quickSyncStatus === 'success' ? 'ГОТОВО' : 'СИНХРОН'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] pt-1 border-t border-white/5">
            <button
              onClick={() => {
                openBotCommand('now');
                triggerHaptic('light');
              }}
              className="p-2 bg-black/40 border border-white/10 hover:border-white/30 text-left transition-colors"
            >
              <div className="font-bold text-white">/NOW</div>
              <div className="text-[9px] text-zinc-500">Текущая пара в чате</div>
            </button>

            <button
              onClick={() => {
                openBotCommand('starosta');
                triggerHaptic('light');
              }}
              className="p-2 bg-black/40 border border-white/10 hover:border-white/30 text-left transition-colors"
            >
              <div className="font-bold text-white">/STAROSTA</div>
              <div className="text-[9px] text-zinc-500">Кабинет старосты</div>
            </button>

            <button
              onClick={() => {
                openBotCommand('today');
                triggerHaptic('light');
              }}
              className="p-2 bg-black/40 border border-white/10 hover:border-white/30 text-left transition-colors"
            >
              <div className="font-bold text-white">/TODAY</div>
              <div className="text-[9px] text-zinc-500">Расписание на сегодня</div>
            </button>

            <button
              onClick={() => {
                openBotCommand('help');
                triggerHaptic('light');
              }}
              className="p-2 bg-black/40 border border-white/10 hover:border-white/30 text-left transition-colors"
            >
              <div className="font-bold text-white">/HELP</div>
              <div className="text-[9px] text-zinc-500">Помощь и куратор</div>
            </button>
          </div>
        </div>
      </div>

      {/* 04 // История обновлений */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5 px-1">
          <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase font-semibold">
            04 // ИСТОРИЯ ОБНОВЛЕНИЙ И ЭТАПЫ
          </span>
          <span className="font-mono text-[10px] text-zinc-400 border border-white/20 px-1.5 py-0.2 uppercase font-bold">
            {APP_CURRENT_VERSION}
          </span>
        </div>

        <div className="p-3 bg-[#0a0a0c] border border-white/10 space-y-2 font-mono">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">{CHANGELOG_STAGES[0].version}</span>
                <span className="text-[8px] bg-white text-black font-bold px-1 py-0.2 uppercase">{CHANGELOG_STAGES[0].tag}</span>
              </div>
              <h4 className="font-bold text-xs text-zinc-200 font-sans mt-0.5">
                {CHANGELOG_STAGES[0].title}
              </h4>
            </div>
            <button
              onClick={() => {
                if (onOpenChangelog) onOpenChangelog();
                triggerHaptic('light');
              }}
              className="text-[10px] text-white underline hover:text-zinc-300 uppercase"
            >
              ВСЯ ИСТОРИЯ
            </button>
          </div>
        </div>
      </div>

      {/* Интерактивный навигатор свободных кабинетов и преподавателей */}
      <AuditoriumFinderModal
        isOpen={isAuditoriumOpen}
        onClose={() => setIsAuditoriumOpen(false)}
        initialTab={auditoriumTab}
      />
    </div>
  );
}
