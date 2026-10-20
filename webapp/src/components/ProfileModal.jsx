import React, { useState } from 'react';
import { 
  X, 
  User, 
  Copy, 
  Check, 
  ShieldCheck, 
  Send, 
  Calendar, 
  Clock, 
  BookOpen, 
  ChevronRight,
  RefreshCw,
  Bell,
  Smartphone,
  ExternalLink,
  Trophy,
  Gamepad2,
  GraduationCap,
  Settings,
  Flame,
  Award,
  ArrowRight,
  Users
} from 'lucide-react';
import { 
  POPULAR_GROUPS, 
  getCourseFromGroupName 
} from '../data/scheduleData';
import { 
  saveUserProfile, 
  syncProfileToBot, 
  getSpecialtyByGroup, 
  getDepartmentByCourse,
  getRoleDisplay,
  isSuperAdmin,
  isOrganizer
} from '../utils/userProfile';
import { useTelegramBackButton, triggerHaptic, openBotCommand } from '../utils/telegram';
import { CS2_PLAYERS } from '../data/cs2TournamentData';

export default function ProfileModal({ 
  isOpen, 
  onClose, 
  profile, 
  onUpdateProfile, 
  onNavigateTab, 
  onOpenStarosta,
  onOpenTeam,
  onOpenPlayer
}) {
  useTelegramBackButton(isOpen, onClose);

  const [activeTab, setActiveTab] = useState('academy'); // 'academy', 'esports', 'settings'
  const [copiedId, setCopiedId] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // 'syncing', 'success', null
  const [customGroupInput, setCustomGroupInput] = useState('');
  const [showGroupSelector, setShowGroupSelector] = useState(false);

  if (!isOpen || !profile) return null;

  const currentCourse = getCourseFromGroupName(profile.group);
  const roleInfo = getRoleDisplay(profile.role);

  // Read lectures count from localStorage
  let readCount = 0;
  let favCount = 0;
  try {
    const r = JSON.parse(localStorage.getItem('aitu_lecture_read') || '[]');
    readCount = r.length;
    const f = JSON.parse(localStorage.getItem('aitu_lecture_favs') || '[]');
    favCount = f.length;
  } catch (e) {
    // ignore
  }

  // Find linked player profile (defaults to wxrry for captain or custom nick)
  const playerNick = profile.esportsNick || "wxrry";
  const playerStats = CS2_PLAYERS[playerNick] || CS2_PLAYERS["wxrry"] || {
    nick: "wxrry",
    team: "TRIQ",
    elo: 1000,
    kdRatio: "1.25",
    hsPercentage: "54%",
    winRate: "67%",
    badges: ["КАПИТАН TRIQ", "ФИНАЛИСТ"]
  };

  const handleCopyId = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(String(profile?.id || ''));
      setCopiedId(true);
      triggerHaptic('success');
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSelectGroup = (newGroup) => {
    const clean = newGroup.trim();
    if (!clean) return;
    const course = getCourseFromGroupName(clean);
    const specialty = getSpecialtyByGroup(clean);
    const department = getDepartmentByCourse(course);
    
    const updated = {
      ...profile,
      group: clean,
      course,
      specialty,
      department
    };
    
    saveUserProfile(updated);
    if (onUpdateProfile) onUpdateProfile(updated);
    setShowGroupSelector(false);
    setCustomGroupInput('');
    triggerHaptic('success');
  };

  const handleToggleSetting = (key) => {
    const updated = { ...profile, [key]: !profile[key] };
    saveUserProfile(updated);
    if (onUpdateProfile) onUpdateProfile(updated);
    triggerHaptic('light');
  };

  const handleSyncWithBot = () => {
    setSyncStatus('syncing');
    triggerHaptic('medium');
    
    try {
      syncProfileToBot(profile);
      setTimeout(() => {
        setSyncStatus('success');
        triggerHaptic('success');
        setTimeout(() => setSyncStatus(null), 3000);
      }, 600);
    } catch (e) {
      setSyncStatus(null);
    }
  };

  const handleQuickNav = (tab) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else if (onClose) {
      onClose();
    }
    triggerHaptic('selection');
  };

  // Monogram initials
  const initials = profile?.fullName 
    ? profile.fullName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'СТ';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans"
      onClick={() => {
        onClose();
        triggerHaptic('light');
      }}
    >
      <div 
        className="w-full max-w-md max-h-[90vh] bg-[#09090b] border border-white/15 flex flex-col shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0d0d10]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs tracking-wider text-white uppercase font-bold">
              ПРОФИЛЬ СТУДЕНТА // AITU
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

        {/* Segmented Tab Navigation */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-black border-b border-white/10 text-xs font-mono">
          <button
            onClick={() => { setActiveTab('academy'); triggerHaptic('selection'); }}
            className={`py-2 px-1 text-center font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'academy' 
                ? 'bg-white text-black' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>АКАДЕМИЯ</span>
          </button>

          <button
            onClick={() => { setActiveTab('esports'); triggerHaptic('selection'); }}
            className={`py-2 px-1 text-center font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'esports' 
                ? 'bg-white text-black' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>КИБЕРСПОРТ</span>
          </button>

          <button
            onClick={() => { setActiveTab('settings'); triggerHaptic('selection'); }}
            className={`py-2 px-1 text-center font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'settings' 
                ? 'bg-white text-black' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>НАСТРОЙКИ</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs font-sans">
          
          {/* TAB 1: АКАДЕМИЧЕСКИЙ ПРОФИЛЬ */}
          {activeTab === 'academy' && (
            <div className="space-y-3 animate-fadeIn">
              {/* Telegram Identity Card */}
              <div className="p-3 bg-neutral-900/60 border border-white/10">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xs bg-zinc-900 border border-white/20 flex items-center justify-center font-mono font-bold text-white text-sm shrink-0">
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm tracking-tight truncate">
                        {profile.fullName}
                      </span>
                      {profile.isPremium && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-[9px] text-amber-300 font-mono font-semibold">
                          ★ PREMIUM
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px]">
                      <span>@{profile.username}</span>
                      <span>·</span>
                      <button 
                        onClick={handleCopyId}
                        className="inline-flex items-center gap-1 hover:text-white transition-colors text-zinc-400"
                        title="Скопировать ID"
                      >
                        <span>ID: {profile.id}</span>
                        {copiedId ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-zinc-500" />
                        )}
                      </button>
                    </div>

                    <div className="pt-0.5">
                      {profile.isTelegramAuth ? (
                        <div className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>АВТОРИЗОВАН В TELEGRAM WEBAPP</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-[9px] font-mono text-zinc-400 bg-zinc-800/40 px-1.5 py-0.5 border border-white/10">
                          <User className="w-3 h-3 text-zinc-400" />
                          <span>АВТОНОМНЫЙ ПРОФИЛЬ</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Academic Binding & Group */}
              <div className="p-3 bg-neutral-900/60 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                  <span className="font-mono text-[10px] text-zinc-400 tracking-wider uppercase font-semibold">
                    01 // ПРИВЯЗКА К ГРУППЕ И СТАТУС
                  </span>
                  <button
                    onClick={() => setShowGroupSelector(!showGroupSelector)}
                    className="font-mono text-[10px] text-white underline hover:text-zinc-300 uppercase transition-colors"
                  >
                    {showGroupSelector ? 'СВЕРНУТЬ' : 'СМЕНИТЬ ГРУППУ'}
                  </button>
                </div>

                {/* Current Group Banner */}
                <div className="flex items-center justify-between p-2.5 bg-black/60 border border-white/10">
                  <div className="space-y-0.5">
                    <div className="font-mono text-[9px] text-zinc-500 uppercase">ТЕКУЩАЯ ГРУППА</div>
                    <div className="text-sm font-black tracking-tight text-white font-mono flex items-center gap-2">
                      <span>{profile.group}</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-white text-black font-mono font-bold tracking-widest uppercase">
                        {profile.course} КУРС
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[9px] text-zinc-500 uppercase">СТАТУС</div>
                    <div className={`text-xs font-bold font-mono ${roleInfo.color}`}>
                      {roleInfo.title}
                    </div>
                  </div>
                </div>

                {/* Specialty & Department */}
                <div className="space-y-0.5 text-[10px] font-mono text-zinc-400">
                  <div className="flex items-start gap-1.5">
                    <span className="text-zinc-600">СПЕЦ:</span>
                    <span className="text-zinc-300 truncate">{profile.specialty}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-zinc-600">ОТДЕЛ:</span>
                    <span className="text-zinc-400 truncate">{profile.department}</span>
                  </div>
                </div>

                {/* Group Selector Dropdown */}
                {showGroupSelector && (
                  <div className="pt-2 border-t border-white/[0.08] space-y-2 animate-fadeIn">
                    <div className="text-[10px] text-zinc-400 font-mono">
                      Выберите группу или введите вручную:
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {POPULAR_GROUPS.map((grp) => (
                        <button
                          key={grp}
                          onClick={() => handleSelectGroup(grp)}
                          className={`p-1 text-center font-mono text-[10px] border transition-colors ${
                            profile.group === grp 
                              ? 'bg-white text-black font-bold border-white' 
                              : 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/40'
                          }`}
                        >
                          {grp}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-1.5 pt-0.5">
                      <input
                        type="text"
                        value={customGroupInput}
                        onChange={(e) => setCustomGroupInput(e.target.value)}
                        placeholder="Например: 9ПО-21к"
                        className="flex-1 bg-black border border-white/20 px-2 py-1 font-mono text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white"
                      />
                      <button
                        onClick={() => handleSelectGroup(customGroupInput)}
                        disabled={!customGroupInput.trim()}
                        className="px-2.5 bg-white text-black font-mono font-bold text-xs uppercase hover:bg-zinc-200 disabled:opacity-40 transition-colors"
                      >
                        ОК
                      </button>
                    </div>
                  </div>
                )}

                {/* Verified Role Badge */}
                <div className={`p-2 border ${roleInfo.bgColor} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base select-none">{roleInfo.icon}</span>
                    <div>
                      <div className={`font-mono text-xs font-bold uppercase ${roleInfo.color}`}>
                        {roleInfo.title}
                      </div>
                      <div className="text-[9px] text-zinc-400 font-mono">
                        Управление правами и статусом
                      </div>
                    </div>
                  </div>
                  <span className={`px-1.5 py-0.5 font-mono text-[9px] font-bold border border-current uppercase ${roleInfo.color}`}>
                    {roleInfo.badge}
                  </span>
                </div>

                {/* Role Specific Actions: Admin OR Organizer OR Starosta OR Student Request */}
                {isSuperAdmin(profile?.id) || profile.role === 'superadmin' || profile.role === 'admin' ? (
                  <div className="space-y-1.5">
                    <button
                      onClick={() => {
                        onClose();
                        if (onNavigateTab) onNavigateTab('admin');
                        triggerHaptic('medium');
                      }}
                      className="w-full py-2.5 px-3 bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs uppercase font-black transition-all flex items-center justify-center gap-2 rounded-xs shadow-md cursor-pointer active:scale-95"
                    >
                      <ShieldCheck className="w-4 h-4 text-black" />
                      <span>👑 ПАНЕЛЬ АДМИНИСТРАТОРА (@controlleraitubot)</span>
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        if (onNavigateTab) onNavigateTab('esports');
                        triggerHaptic('medium');
                      }}
                      className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-amber-300 font-mono text-[10px] uppercase font-bold transition-all flex items-center justify-center gap-1.5 rounded-xs cursor-pointer"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>🏆 ОРГАНИЗАТОР CS2 ТУРНИРОВ</span>
                    </button>
                  </div>
                ) : profile.role === 'organizer' || isOrganizer(profile?.id, profile?.role) ? (
                  <button
                    onClick={() => {
                      onClose();
                      if (onNavigateTab) onNavigateTab('esports');
                      triggerHaptic('medium');
                    }}
                    className="w-full py-2.5 px-3 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/50 text-amber-300 font-mono text-xs uppercase font-bold transition-all flex items-center justify-center gap-2 rounded-xs active:scale-95 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>🏆 ПАНЕЛЬ ОРГАНИЗАТОРА ТУРНИРОВ</span>
                  </button>
                ) : ['starosta', 'zam_starosty'].includes(profile.role) ? (
                  onOpenStarosta && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenStarosta();
                        triggerHaptic('medium');
                      }}
                      className="w-full py-2.5 px-3 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 font-mono text-xs uppercase font-bold transition-all flex items-center justify-center gap-2 rounded-xs active:scale-95"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>🎖 ПАНЕЛЬ СТАРОСТЫ // HUB</span>
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => {
                      openBotCommand('starosta');
                      triggerHaptic('medium');
                    }}
                    className="w-full py-2 px-2.5 bg-black/60 hover:bg-neutral-800 border border-white/15 hover:border-white/40 text-zinc-300 hover:text-white font-mono text-[10px] uppercase font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 rounded-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                    <span>ЗАПРОСИТЬ ПРАВА СТАРОСТЫ В БОТЕ</span>
                  </button>
                )}
              </div>

              {/* Academic Progress Summary */}
              <div className="grid grid-cols-2 gap-2 font-mono text-center">
                <div className="p-2.5 bg-black border border-white/10 space-y-0.5">
                  <span className="text-[9px] text-zinc-500 uppercase block">ИЗУЧЕНО ЛЕКЦИЙ</span>
                  <span className="text-base font-bold text-white">{readCount}</span>
                </div>
                <div className="p-2.5 bg-black border border-white/10 space-y-0.5">
                  <span className="text-[9px] text-zinc-500 uppercase block">В ИЗБРАННОМ</span>
                  <span className="text-base font-bold text-amber-300">{favCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: КИБЕРСПОРТИВНЫЙ ПРОФИЛЬ */}
          {activeTab === 'esports' && (
            <div className="space-y-3 font-mono animate-fadeIn text-xs">
              {/* Esports Gamer Tag Banner */}
              <div className="p-3 bg-zinc-950 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                  <span className="text-[9px] text-amber-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span>ПАСПОРТ ИГРОКА CS2 // AITU</span>
                  </span>
                  <span className="px-1.5 py-0.2 bg-zinc-900 border border-white/20 text-white font-bold text-[9px]">
                    {playerStats.elo} ELO
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <h3 className="text-xl font-black text-white font-mono tracking-tight">
                      {playerStats.nick}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-sans mt-0.5">
                      <span>Команда:</span>
                      <strong className="text-amber-300 font-mono font-bold">
                        {playerStats.team || "TRIQ"}
                      </strong>
                      <span className="text-zinc-600">·</span>
                      <span className="text-amber-400 font-semibold">КАПИТАН (IGL)</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl">🥈</span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="px-1.5 py-0.5 bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[8px] font-bold uppercase">
                    КАПИТАН TRIQ (C)
                  </span>
                  <span className="px-1.5 py-0.5 bg-zinc-900 border border-white/20 text-zinc-200 text-[8px] font-bold uppercase">
                    ФИНАЛИСТ ОСЕННЕГО КУБКА
                  </span>
                  <span className="px-1.5 py-0.5 bg-zinc-900 border border-white/10 text-zinc-400 text-[8px] font-bold uppercase">
                    CS2 COMPETITIVE
                  </span>
                </div>
              </div>

              {/* Combat Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-black border border-white/10">
                  <span className="text-[8px] text-zinc-500 uppercase block">K / D RATIO</span>
                  <span className="text-sm font-bold text-emerald-400">{playerStats.kdRatio}</span>
                </div>
                <div className="p-2 bg-black border border-white/10">
                  <span className="text-[8px] text-zinc-500 uppercase block">HEADSHOT %</span>
                  <span className="text-sm font-bold text-white">{playerStats.hsPercentage}</span>
                </div>
                <div className="p-2 bg-black border border-white/10">
                  <span className="text-[8px] text-zinc-500 uppercase block">ВИНРЕЙТ</span>
                  <span className="text-sm font-bold text-white">{playerStats.winRate}</span>
                </div>
              </div>

              {/* Direct links to Team & Player cards */}
              <div className="space-y-1.5 pt-1">
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenPlayer) onOpenPlayer(playerStats.nick);
                    triggerHaptic('selection');
                  }}
                  className="w-full py-2 px-3 bg-black/60 hover:bg-neutral-800 border border-white/15 hover:border-white/40 text-white font-mono text-[10px] uppercase font-bold transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>ОТКРЫТЬ МОЙ ПРОФИЛЬ В HLTV</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  onClick={() => {
                    onClose();
                    if (onOpenTeam) onOpenTeam(playerStats.team || "TRIQ");
                    triggerHaptic('selection');
                  }}
                  className="w-full py-2 px-3 bg-black/60 hover:bg-neutral-800 border border-white/15 hover:border-white/40 text-white font-mono text-[10px] uppercase font-bold transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                    <span>ОБЗОР МОЕЙ КОМАНДЫ ({playerStats.team || "TRIQ"})</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  onClick={() => {
                    onClose();
                    handleQuickNav('esports');
                  }}
                  className="w-full py-2 px-3 bg-white text-black font-mono text-[10px] uppercase font-bold hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trophy className="w-3.5 h-3.5 text-black" />
                  <span>ПЕРЕЙТИ В ТУРНИРНЫЙ РАЗДЕЛ HLTV</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: НАСТРОЙКИ И УВЕДОМЛЕНИЯ */}
          {activeTab === 'settings' && (
            <div className="space-y-3 font-mono animate-fadeIn text-xs">
              <div className="p-3 bg-neutral-900/60 border border-white/10 space-y-2">
                <span className="text-[10px] text-zinc-400 tracking-wider uppercase font-semibold block border-b border-white/[0.08] pb-1.5">
                  НАСТРОЙКИ УВЕДОМЛЕНИЙ TELEGRAM
                </span>

                <div className="space-y-1.5">
                  {/* Remind 10 min */}
                  <div className="flex items-center justify-between p-2 bg-black/40 border border-white/5 font-sans">
                    <div>
                      <div className="font-medium text-white text-[11px]">Напоминание о парах за 10 мин</div>
                      <div className="text-[9px] text-zinc-500 font-mono">Оповещения перед звонком</div>
                    </div>
                    <button
                      onClick={() => handleToggleSetting('remind10min')}
                      className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 ${
                        profile.remind10min ? 'bg-white' : 'bg-zinc-800'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full transition-transform ${
                        profile.remind10min ? 'translate-x-3.5 bg-black' : 'translate-x-0 bg-zinc-400'
                      }`} />
                    </button>
                  </div>

                  {/* Morning Alert */}
                  <div className="flex items-center justify-between p-2 bg-black/40 border border-white/5 font-sans">
                    <div>
                      <div className="font-medium text-white text-[11px]">Утренняя сводка в 08:00</div>
                      <div className="text-[9px] text-zinc-500 font-mono">Расписание на сегодня и статус 1-й пары</div>
                    </div>
                    <button
                      onClick={() => handleToggleSetting('morningAlert')}
                      className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 ${
                        profile.morningAlert ? 'bg-white' : 'bg-zinc-800'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full transition-transform ${
                        profile.morningAlert ? 'translate-x-3.5 bg-black' : 'translate-x-0 bg-zinc-400'
                      }`} />
                    </button>
                  </div>

                  {/* Replacements Instant Alert */}
                  <div className="flex items-center justify-between p-2 bg-black/40 border border-white/5 font-sans">
                    <div>
                      <div className="font-medium text-white text-[11px]">Моментальные алерты о заменах</div>
                      <div className="text-[9px] text-zinc-500 font-mono">Срочные пуши об отменах и переносах кабинетов</div>
                    </div>
                    <button
                      onClick={() => handleToggleSetting('replacementsAlert')}
                      className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 ${
                        profile.replacementsAlert !== false ? 'bg-white' : 'bg-zinc-800'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full transition-transform ${
                        profile.replacementsAlert !== false ? 'translate-x-3.5 bg-black' : 'translate-x-0 bg-zinc-400'
                      }`} />
                    </button>
                  </div>

                  {/* Haptics */}
                  <div className="flex items-center justify-between p-2 bg-black/40 border border-white/5 font-sans">
                    <div>
                      <div className="font-medium text-white text-[11px]">Тактильный виброотклик (Haptics)</div>
                      <div className="text-[9px] text-zinc-500 font-mono">Вибрация при тапах</div>
                    </div>
                    <button
                      onClick={() => handleToggleSetting('haptics')}
                      className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 ${
                        profile.haptics ? 'bg-white' : 'bg-zinc-800'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full transition-transform ${
                        profile.haptics ? 'translate-x-3.5 bg-black' : 'translate-x-0 bg-zinc-400'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sync Button */}
              <button
                onClick={handleSyncWithBot}
                disabled={syncStatus === 'syncing'}
                className="w-full py-2.5 bg-white text-black font-mono font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>СИНХРОНИЗАЦИЯ...</span>
                  </>
                ) : syncStatus === 'success' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>СИНХРОНИЗИРОВАНО!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>СИНХРОНИЗИРОВАТЬ С БОТОМ</span>
                  </>
                )}
              </button>

              {/* Quick Nav Grid */}
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <span className="font-mono text-[9px] text-zinc-500 uppercase block text-center">
                  БЫСТРЫЙ ПЕРЕХОД ПО РАЗДЕЛАМ:
                </span>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-[9px]">
                  <button
                    onClick={() => handleQuickNav('schedule')}
                    className="p-1.5 bg-zinc-900 border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white uppercase flex items-center justify-center gap-1 transition-colors"
                  >
                    <Calendar className="w-3 h-3 text-zinc-500" />
                    <span>РАСПИСАНИЕ</span>
                  </button>
                  <button
                    onClick={() => handleQuickNav('services')}
                    className="p-1.5 bg-zinc-900 border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white uppercase flex items-center justify-center gap-1 transition-colors"
                  >
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span>ЗВОНКИ</span>
                  </button>
                  <button
                    onClick={() => handleQuickNav('lectures')}
                    className="p-1.5 bg-zinc-900 border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white uppercase flex items-center justify-center gap-1 transition-colors"
                  >
                    <BookOpen className="w-3 h-3 text-zinc-500" />
                    <span>КОНСПЕКТЫ</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
