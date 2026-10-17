import React, { useState, useEffect } from 'react';
import { 
  X, 
  Shield, 
  Users, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Send, 
  Plus, 
  Trash2, 
  Megaphone, 
  UserCheck, 
  FileText, 
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { useTelegramBackButton, triggerHaptic, openBotCommand, tg } from '../utils/telegram';
import { getRoleDisplay } from '../utils/userProfile';
import { 
  getStoredReplacements, 
  fetchReplacementsFromApi,
  saveCustomReplacement, 
  removeCustomReplacement, 
  getTodayDateKey 
} from '../data/replacementsData';
import { DAYS_RU, getBellSchedule } from '../data/scheduleData';

// Список студентов по умолчанию для группы (может редактироваться старостой)
const DEFAULT_STUDENT_ROSTER = [
  "Алексеев Даниил",
  "Бауыржанов Азамат",
  "Васильев Кирилл",
  "Григорьев Максим",
  "Даулетов Арман",
  "Ержанов Нурлан",
  "Жумабеков Дамир",
  "Иванов Александр",
  "Касымов Руслан",
  "Лебедев Роман",
  "Мухамеджанов Серик",
  "Николаев Артём",
  "Омаров Берик",
  "Петров Владислав",
  "Рахимов Тимур",
  "Смирнов Дмитрий",
  "Токтаров Айдын",
  "Усманов Рустам",
  "Федоров Денис",
  "Хамитов Алихан",
  "Чернов Арсений",
  "Юсупов Марат"
];

export default function StarostaModal({ isOpen, onClose, profile }) {
  useTelegramBackButton(isOpen, onClose);

  const [activeTab, setActiveTab] = useState('replacements'); // 'replacements', 'broadcast', 'attendance'
  const isAuthorizedStarosta = ['starosta', 'zam_starosty', 'admin', 'superadmin'].includes(profile?.role);
  const roleInfo = getRoleDisplay(profile?.role);
  const currentGroup = profile?.group || '9ПО-43к';
  const currentCourse = profile?.course || 4;

  // --- 1. ЗАМЕНЫ ПАР ---
  const [replacements, setReplacements] = useState(() => getStoredReplacements());
  const [repDate, setRepDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [repPair, setRepPair] = useState(1);
  const [repType, setRepType] = useState('replace'); // 'replace', 'cancel', 'room'
  const [repSubject, setRepSubject] = useState('');
  const [repRoom, setRepRoom] = useState('');
  const [repTeacher, setRepTeacher] = useState('');
  const [repReason, setRepReason] = useState('');
  const [copiedCmd, setCopiedCmd] = useState(null);

  // Синхронизация замен с базой данных при открытии
  useEffect(() => {
    if (isOpen && currentGroup) {
      fetchReplacementsFromApi(currentGroup).then(data => {
        if (data) setReplacements(data);
      }).catch(err => console.warn('Could not fetch replacements in StarostaModal', err));
    }
  }, [isOpen, currentGroup]);

  // --- 2. ОБЪЯВЛЕНИЯ СТАРОСТЫ ---
  const [noticeTag, setNoticeTag] = useState('ВАЖНО');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [noticeCopied, setNoticeCopied] = useState(false);

  // --- 3. ЖУРНАЛ ПОСЕЩАЕМОСТИ (РАПОРТИЧКА) ---
  const rosterStorageKey = `aitu_roster_${currentGroup}`;
  const [roster, setRoster] = useState(() => {
    try {
      const saved = localStorage.getItem(rosterStorageKey);
      return saved ? JSON.parse(saved) : DEFAULT_STUDENT_ROSTER;
    } catch (e) {
      return DEFAULT_STUDENT_ROSTER;
    }
  });

  const [newStudentName, setNewStudentName] = useState('');
  const [attendancePair, setAttendancePair] = useState(1);
  // Статусы посещаемости: { [studentName]: 'present' | 'absent' | 'excused' | 'late' }
  const [attendance, setAttendance] = useState(() => {
    const initial = {};
    DEFAULT_STUDENT_ROSTER.forEach(s => { initial[s] = 'present'; });
    return initial;
  });
  const [attendanceCopied, setAttendanceCopied] = useState(false);

  if (!isOpen) return null;

  // Обработчик добавления замены
  const handleAddReplacement = (e) => {
    e.preventDefault();
    if (!repDate) return;

    let text = '';
    if (repType === 'cancel') {
      text = `ОТМЕНА ПАРЫ${repReason ? ` (${repReason})` : ''}`;
    } else if (repType === 'room') {
      text = `СМЕНА КАБИНЕТА → ${repRoom || 'Каб. уточняется'}`;
    } else {
      text = `${repSubject || 'Замена'}${repRoom ? ` (каб. ${repRoom})` : ''}${repTeacher ? ` · ${repTeacher}` : ''}`;
    }

    const updated = saveCustomReplacement(repDate, repPair, {
      type: repType,
      text,
      subject: repSubject || text,
      room: repRoom || '—',
      teacher: repTeacher || '—',
      group: currentGroup,
      author: 'Староста'
    });
    setReplacements({ ...updated });
    triggerHaptic('success');

    // Очистка полей
    setRepSubject('');
    setRepRoom('');
    setRepTeacher('');
    setRepReason('');
  };

  const handleRemoveReplacement = (dateKey, pairNum) => {
    const existing = replacements[dateKey]?.[pairNum];
    const updated = removeCustomReplacement(dateKey, pairNum, existing?.id);
    setReplacements({ ...updated });
    triggerHaptic('light');
  };

  // Генерация команды для бота
  const generateBotCommand = (type, dateStr, pair, subject, room, teacher, reason) => {
    if (type === 'cancel') {
      return `/cancel_pair ${dateStr} ${pair} ${reason || 'По расписанию'}`;
    }
    if (type === 'room') {
      return `/edit_room 1 ${pair} ${room || '304'}`;
    }
    return `/add_zam ${dateStr} ${pair} ${subject || 'Замена'} ${room || '304'} ${teacher || ''}`.trim();
  };

  const handleCopyCommand = (cmd) => {
    navigator.clipboard?.writeText(cmd);
    setCopiedCmd(cmd);
    triggerHaptic('success');
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const handleSendToBot = (cmd) => {
    openBotCommand(cmd);
    triggerHaptic('medium');
  };

  // Копирование объявления
  const handleCopyNotice = () => {
    const fullNotice = `📢 [${noticeTag}] ${noticeTitle.toUpperCase()}\n\n${noticeBody}\n\n— Староста группы ${currentGroup}`;
    navigator.clipboard?.writeText(fullNotice);
    setNoticeCopied(true);
    triggerHaptic('success');
    setTimeout(() => setNoticeCopied(false), 2500);
  };

  const handleShareNotice = () => {
    const fullNotice = `📢 [${noticeTag}] ${noticeTitle.toUpperCase()}\n\n${noticeBody}\n\n— Староста группы ${currentGroup}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(fullNotice)}`;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
    triggerHaptic('medium');
  };

  // Посещаемость
  const toggleStudentStatus = (name) => {
    const cycle = {
      present: 'absent',
      absent: 'excused',
      excused: 'late',
      late: 'present'
    };
    const current = attendance[name] || 'present';
    const next = cycle[current] || 'present';
    setAttendance(prev => ({ ...prev, [name]: next }));
    triggerHaptic('selection');
  };

  const setAllPresent = () => {
    const all = {};
    roster.forEach(s => { all[s] = 'present'; });
    setAttendance(all);
    triggerHaptic('success');
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    const clean = newStudentName.trim();
    if (!roster.includes(clean)) {
      const next = [...roster, clean].sort();
      setRoster(next);
      localStorage.setItem(rosterStorageKey, JSON.stringify(next));
      setAttendance(prev => ({ ...prev, [clean]: 'present' }));
      setNewStudentName('');
      triggerHaptic('success');
    }
  };

  const handleRemoveStudent = (name) => {
    const next = roster.filter(s => s !== name);
    setRoster(next);
    localStorage.setItem(rosterStorageKey, JSON.stringify(next));
    triggerHaptic('light');
  };

  // Сбор статистики посещаемости
  const presentCount = roster.filter(s => (attendance[s] || 'present') === 'present').length;
  const absentCount = roster.filter(s => attendance[s] === 'absent').length;
  const excusedCount = roster.filter(s => attendance[s] === 'excused').length;
  const lateCount = roster.filter(s => attendance[s] === 'late').length;

  const handleCopyReport = () => {
    const d = new Date().toLocaleDateString('ru-RU');
    const absentList = roster.filter(s => attendance[s] === 'absent');
    const excusedList = roster.filter(s => attendance[s] === 'excused');
    const lateList = roster.filter(s => attendance[s] === 'late');

    let report = `📋 РАПОРТИЧКА // ${currentGroup}\n`;
    report += `📅 Дата: ${d} · Пара: №${attendancePair}\n`;
    report += `👥 Всего: ${roster.length} | Присутствуют: ${presentCount + lateCount} | Отсутствуют: ${absentCount + excusedCount}\n`;
    
    if (absentList.length > 0) {
      report += `\n❌ Не были (${absentList.length}):\n${absentList.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`;
    }
    if (excusedList.length > 0) {
      report += `\n🟡 Уважительная (${excusedList.length}):\n${excusedList.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`;
    }
    if (lateList.length > 0) {
      report += `\n⏱ Опоздали (${lateList.length}):\n${lateList.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`;
    }
    report += `\n— Староста: ${profile?.fullName || 'Староста группы'}`;

    navigator.clipboard?.writeText(report);
    setAttendanceCopied(true);
    triggerHaptic('success');
    setTimeout(() => setAttendanceCopied(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-[#0e0e11] border border-white/10 p-4 sm:p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.08] pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-amber-950/50 border border-amber-500/30 text-amber-400">
                <Shield className="w-4 h-4" />
              </span>
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                ПАНЕЛЬ СТАРОСТЫ // HUB
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
              <span className="text-white font-bold">{currentGroup}</span>
              <span>·</span>
              <span className={roleInfo.color}>{roleInfo.title}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 border border-white/10 hover:border-white text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning if not official starosta */}
        {!isAuthorizedStarosta && (
          <div className="p-2.5 bg-amber-950/30 border border-amber-500/30 flex items-start gap-2 text-[11px] font-mono text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span>Вы находитесь в режиме предварительного просмотра. Для публикации замен в общий бот группы требуется подтвержденный статус старосты от администраторов.</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-black/50 p-1 border border-white/10 font-mono text-[10px]">
          <button
            onClick={() => { setActiveTab('replacements'); triggerHaptic('selection'); }}
            className={`py-1.5 px-2 flex items-center justify-center gap-1.5 transition-colors uppercase ${
              activeTab === 'replacements' 
                ? 'bg-white text-black font-bold' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>Замены</span>
          </button>
          <button
            onClick={() => { setActiveTab('broadcast'); triggerHaptic('selection'); }}
            className={`py-1.5 px-2 flex items-center justify-center gap-1.5 transition-colors uppercase ${
              activeTab === 'broadcast' 
                ? 'bg-white text-black font-bold' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Megaphone className="w-3 h-3" />
            <span>Объявления</span>
          </button>
          <button
            onClick={() => { setActiveTab('attendance'); triggerHaptic('selection'); }}
            className={`py-1.5 px-2 flex items-center justify-center gap-1.5 transition-colors uppercase ${
              activeTab === 'attendance' 
                ? 'bg-white text-black font-bold' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            <span>Рапортичка</span>
          </button>
        </div>

        {/* TAB 1: ЗАМЕНЫ И ОТМЕНЫ */}
        {activeTab === 'replacements' && (
          <div className="space-y-4">
            {/* Форма создания замены */}
            <form onSubmit={handleAddReplacement} className="p-3 bg-zinc-950/70 border border-white/10 space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                  + ДОБАВИТЬ ЗАМЕНУ / ОТМЕНУ
                </span>
                <span className="text-[9px] text-zinc-500 uppercase">{currentGroup}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[9px] text-zinc-500 block mb-1">ДАТА:</label>
                  <input
                    type="date"
                    value={repDate}
                    onChange={(e) => setRepDate(e.target.value)}
                    className="w-full bg-black border border-white/10 px-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-500 block mb-1">НОМЕР ПАРЫ:</label>
                  <select
                    value={repPair}
                    onChange={(e) => setRepPair(Number(e.target.value))}
                    className="w-full bg-black border border-white/10 px-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-white"
                  >
                    <option value={1}>1 пара (09:00 — 10:35)</option>
                    <option value={2}>2 пара (расщепленная / обед)</option>
                    <option value={3}>3 пара (12:55 — 14:30)</option>
                    <option value={4}>4 пара (14:40 — 16:15)</option>
                  </select>
                </div>
              </div>

              {/* Тип замены */}
              <div>
                <label className="text-[9px] text-zinc-500 block mb-1">ТИП ИЗМЕНЕНИЯ:</label>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setRepType('replace')}
                    className={`py-1 border ${repType === 'replace' ? 'bg-amber-950/50 border-amber-500/50 text-amber-300 font-bold' : 'border-white/10 text-zinc-400'}`}
                  >
                    Замена предмета
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepType('cancel')}
                    className={`py-1 border ${repType === 'cancel' ? 'bg-red-950/50 border-red-500/50 text-red-300 font-bold' : 'border-white/10 text-zinc-400'}`}
                  >
                    Отмена пары
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepType('room')}
                    className={`py-1 border ${repType === 'room' ? 'bg-blue-950/50 border-blue-500/50 text-blue-300 font-bold' : 'border-white/10 text-zinc-400'}`}
                  >
                    Смена кабинета
                  </button>
                </div>
              </div>

              {/* Поля в зависимости от типа */}
              {repType === 'replace' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] text-zinc-500 block mb-0.5">НОВЫЙ ПРЕДМЕТ:</label>
                    <input
                      type="text"
                      placeholder="Напр. МДК 07.02 (лекция)"
                      value={repSubject}
                      onChange={(e) => setRepSubject(e.target.value)}
                      className="w-full bg-black border border-white/10 px-2 py-1 text-white text-xs focus:outline-none focus:border-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 block mb-0.5">АУДИТОРИЯ:</label>
                      <input
                        type="text"
                        placeholder="Каб. 304"
                        value={repRoom}
                        onChange={(e) => setRepRoom(e.target.value)}
                        className="w-full bg-black border border-white/10 px-2 py-1 text-white text-xs focus:outline-none focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 block mb-0.5">ПРЕПОДАВАТЕЛЬ:</label>
                      <input
                        type="text"
                        placeholder="Щербакова М.А."
                        value={repTeacher}
                        onChange={(e) => setRepTeacher(e.target.value)}
                        className="w-full bg-black border border-white/10 px-2 py-1 text-white text-xs focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {repType === 'cancel' && (
                <div>
                  <label className="text-[9px] text-zinc-500 block mb-0.5">ПРИЧИНА ОТМЕНЫ (НЕОБЯЗАТЕЛЬНО):</label>
                  <input
                    type="text"
                    placeholder="Напр. Болезнь преподавателя / конференция"
                    value={repReason}
                    onChange={(e) => setRepReason(e.target.value)}
                    className="w-full bg-black border border-white/10 px-2 py-1 text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>
              )}

              {repType === 'room' && (
                <div>
                  <label className="text-[9px] text-zinc-500 block mb-0.5">НОВЫЙ КАБИНЕТ:</label>
                  <input
                    type="text"
                    placeholder="Напр. 402 (актовый зал)"
                    value={repRoom}
                    onChange={(e) => setRepRoom(e.target.value)}
                    className="w-full bg-black border border-white/10 px-2 py-1 text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>
              )}

              {/* Кнопки сохранения и отправки в бот */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors"
                >
                  СОХРАНИТЬ В РАСПИСАНИЕ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cmd = generateBotCommand(repType, repDate, repPair, repSubject, repRoom, repTeacher, repReason);
                    handleSendToBot(cmd);
                  }}
                  className="px-3 py-1.5 bg-zinc-900 border border-white/20 text-white font-mono text-[10px] hover:border-white transition-colors flex items-center gap-1"
                  title="Отправить команду в Telegram бот"
                >
                  <Send className="w-3 h-3" />
                  <span>В БОТ</span>
                </button>
              </div>
            </form>

            {/* Активные замены */}
            <div className="space-y-2 font-mono">
              <span className="text-[10px] text-zinc-500 tracking-wider uppercase block px-1">
                АКТИВНЫЕ ЗАМЕНЫ В ПРИЛОЖЕНИИ:
              </span>
              {Object.keys(replacements).length === 0 ? (
                <div className="p-3 bg-black/40 border border-white/5 text-center text-xs text-zinc-600">
                  Активных замен нет. Все пары идут по стандартному расписанию.
                </div>
              ) : (
                Object.entries(replacements).map(([dateKey, pairs]) => (
                  <div key={dateKey} className="p-2.5 bg-black border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] border-b border-white/[0.06] pb-1">
                      <span className="font-bold text-amber-400">📅 {dateKey}</span>
                      <span className="text-zinc-500 text-[10px]">{Object.keys(pairs).length} изменения</span>
                    </div>
                    {Object.entries(pairs).map(([pNum, item]) => (
                      <div key={pNum} className="flex items-center justify-between text-xs py-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 bg-zinc-800 text-[10px] font-bold">№{pNum}</span>
                          <span className={item.type === 'cancel' ? 'text-red-400 font-semibold' : 'text-zinc-200'}>
                            {item.text}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveReplacement(dateKey, pNum)}
                          className="text-zinc-600 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ОБЪЯВЛЕНИЯ СТАРОСТЫ */}
        {activeTab === 'broadcast' && (
          <div className="space-y-3 font-mono">
            <div className="p-3 bg-zinc-950/70 border border-white/10 space-y-3">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold block border-b border-white/[0.06] pb-1.5">
                📢 КОНСТРУКТОР ОБЪЯВЛЕНИЯ В ЧАТ ГРУППЫ
              </span>

              {/* Теги */}
              <div>
                <label className="text-[9px] text-zinc-500 block mb-1">КАТЕГОРИЯ ОБЪЯВЛЕНИЯ:</label>
                <div className="flex flex-wrap gap-1.5">
                  {['ВАЖНО', 'СБОР', 'ДЕДЛАЙН', 'ИЗМЕНЕНИЕ ПАР', 'СЕССИЯ', 'ОПЛАТА'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNoticeTag(tag)}
                      className={`px-2 py-0.5 text-[10px] border transition-colors ${
                        noticeTag === tag 
                          ? 'bg-white text-black font-bold border-white' 
                          : 'border-white/10 text-zinc-400 hover:border-white/30'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 block mb-0.5">ЗАГОЛОВОК:</label>
                <input
                  type="text"
                  placeholder="Напр. Сдача лабораторной работы по МДК 07.02"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  className="w-full bg-black border border-white/10 px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 block mb-0.5">ТЕКСТ СООБЩЕНИЯ:</label>
                <textarea
                  rows={4}
                  placeholder="Напишите подробности для студентов вашей группы..."
                  value={noticeBody}
                  onChange={(e) => setNoticeBody(e.target.value)}
                  className="w-full bg-black border border-white/10 p-2 text-white text-xs focus:outline-none focus:border-white resize-none"
                />
              </div>

              {/* Превью */}
              {(noticeTitle || noticeBody) && (
                <div className="p-2.5 bg-black border border-white/20 space-y-1">
                  <span className="text-[9px] text-zinc-500 uppercase block">ПРЕДПРОСМОТР СООБЩЕНИЯ:</span>
                  <div className="text-xs text-white">
                    <span className="font-bold text-amber-400">📢 [{noticeTag}] {noticeTitle.toUpperCase()}</span>
                    <p className="text-zinc-300 text-[11px] whitespace-pre-wrap mt-1">{noticeBody}</p>
                    <span className="text-[9px] text-zinc-500 block mt-1">— Староста группы {currentGroup}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyNotice}
                  className="py-1.5 bg-zinc-900 border border-white/20 hover:border-white text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                >
                  {noticeCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{noticeCopied ? 'СКОПИРОВАНО' : 'СКОПИРОВАТЬ'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareNotice}
                  className="py-1.5 bg-white text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-neutral-200 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>В ЧАТ ГРУППЫ</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ЖУРНАЛ ПОСЕЩАЕМОСТИ (РАПОРТИЧКА) */}
        {activeTab === 'attendance' && (
          <div className="space-y-3 font-mono">
            {/* Панель управления парой и статистикой */}
            <div className="p-3 bg-zinc-950/70 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                    РАПОРТИЧКА // ПАРА №
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(p => (
                      <button
                        key={p}
                        onClick={() => { setAttendancePair(p); triggerHaptic('selection'); }}
                        className={`w-6 h-6 text-[10px] border font-bold ${
                          attendancePair === p 
                            ? 'bg-white text-black border-white' 
                            : 'border-white/10 text-zinc-400 hover:border-white/30'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={setAllPresent}
                  className="text-[9px] text-emerald-400 hover:text-emerald-300 uppercase underline"
                >
                  ВСЕ БЫЛИ [✓]
                </button>
              </div>

              {/* Статистика */}
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                <div className="p-1.5 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400">
                  <span className="block font-bold text-xs">{presentCount}</span>
                  <span className="text-[8px] uppercase">БЫЛИ (П)</span>
                </div>
                <div className="p-1.5 bg-red-950/30 border border-red-500/20 text-red-400">
                  <span className="block font-bold text-xs">{absentCount}</span>
                  <span className="text-[8px] uppercase">НЕ БЫЛИ (Н)</span>
                </div>
                <div className="p-1.5 bg-amber-950/30 border border-amber-500/20 text-amber-400">
                  <span className="block font-bold text-xs">{excusedCount}</span>
                  <span className="text-[8px] uppercase">УВАЖИТ. (У)</span>
                </div>
                <div className="p-1.5 bg-blue-950/30 border border-blue-500/20 text-blue-400">
                  <span className="block font-bold text-xs">{lateCount}</span>
                  <span className="text-[8px] uppercase">ОПОЗДАЛИ (О)</span>
                </div>
              </div>
            </div>

            {/* Список студентов с переключателем статуса */}
            <div className="space-y-1 max-h-[40vh] overflow-y-auto pr-1">
              {roster.map((student, idx) => {
                const status = attendance[student] || 'present';
                return (
                  <div 
                    key={student}
                    onClick={() => toggleStudentStatus(student)}
                    className="p-2 bg-black border border-white/5 hover:border-white/20 flex items-center justify-between cursor-pointer transition-colors select-none text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-zinc-600 font-mono w-4">{idx + 1}.</span>
                      <span className="text-zinc-200">{student}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {status === 'present' && (
                        <span className="px-1.5 py-0.5 bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-mono text-[9px] font-bold">
                          П // БЫЛ
                        </span>
                      )}
                      {status === 'absent' && (
                        <span className="px-1.5 py-0.5 bg-red-950 border border-red-500/40 text-red-400 font-mono text-[9px] font-bold">
                          Н // ОТСУТСТВОВАЛ
                        </span>
                      )}
                      {status === 'excused' && (
                        <span className="px-1.5 py-0.5 bg-amber-950 border border-amber-500/40 text-amber-400 font-mono text-[9px] font-bold">
                          У // УВАЖИТ.
                        </span>
                      )}
                      {status === 'late' && (
                        <span className="px-1.5 py-0.5 bg-blue-950 border border-blue-500/40 text-blue-400 font-mono text-[9px] font-bold">
                          О // ОПОЗДАЛ
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Добавление студента */}
            <form onSubmit={handleAddStudent} className="flex gap-2">
              <input
                type="text"
                placeholder="+ Добавить фамилию и имя..."
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                className="flex-1 bg-black border border-white/10 px-2 py-1 text-white text-xs focus:outline-none focus:border-white font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-zinc-900 border border-white/20 text-white text-xs hover:border-white font-mono"
              >
                ДОБАВИТЬ
              </button>
            </form>

            {/* Кнопка экспорта рапортички */}
            <button
              onClick={handleCopyReport}
              className="w-full py-2 bg-white text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-neutral-200 transition-colors"
            >
              {attendanceCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{attendanceCopied ? 'РАПОРТИЧКА СКОПИРОВАНА' : 'СКОПИРОВАТЬ РАПОРТИЧКУ ДЛЯ КУРАТОРА'}</span>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <span>СИНХРОНИЗАЦИЯ С БОТОМ AITU</span>
          <button 
            onClick={onClose}
            className="text-white hover:underline uppercase"
          >
            ЗАКРЫТЬ
          </button>
        </div>
      </div>
    </div>
  );
}
