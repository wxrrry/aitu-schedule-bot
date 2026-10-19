import React, { useState } from 'react';
import { 
  X, 
  Trophy, 
  Plus, 
  Users, 
  GitBranch, 
  Calendar, 
  Check, 
  Settings, 
  AlertCircle,
  Award,
  Crown,
  Trash2,
  ChevronDown,
  ChevronUp,
  Shield,
  Flame,
  Zap,
  Target,
  UserCheck,
  ExternalLink,
  Edit2
} from 'lucide-react';
import { useTelegramBackButton, triggerHaptic } from '../utils/telegram';
import { 
  getAllTournaments, 
  saveAllTournaments, 
  getTournamentRegistrations, 
  createNewTournament,
  generateSingleEliminationBracket,
  approveTeamRegistration,
  rejectTeamRegistration,
  setTeamSeed,
  deleteTournamentRegistration,
  deleteTournament,
  updateTournament
} from '../utils/tournamentManager';

// Пресеты баннеров и аватарок турниров
const TOURNAMENT_AVATARS = [
  { id: 'gold_cup', icon: '🏆', name: 'Золотой Кубок' },
  { id: 'shield', icon: '🛡️', name: 'Чемпионский Щит' },
  { id: 'cyber', icon: '⚡', name: 'Cyber Major' },
  { id: 'phoenix', icon: '🦅', name: 'Phoenix Trophy' },
  { id: 'flame', icon: '🔥', name: 'Fire Battle' },
  { id: 'crown', icon: '👑', name: 'Royal Championship' },
  { id: 'target', icon: '🎯', name: 'Sniper Arena' }
];

export default function TournamentOrganizerModal({ isOpen, onClose, onTournamentsUpdated }) {
  useTelegramBackButton(isOpen, onClose);

  const [activeTab, setActiveTab] = useState('manage'); // 'manage' or 'create'
  const [tournaments, setTournaments] = useState(() => getAllTournaments());
  const [selectedTournId, setSelectedTournId] = useState(() => tournaments[0]?.id || '');
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  // New Tournament Form State
  const [newTitle, setNewTitle] = useState('');
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newSlots, setNewSlots] = useState('8');
  const [newFormat, setNewFormat] = useState('Single Elimination · Best of 3 (5v5)');
  const [newAvatar, setNewAvatar] = useState('🏆');
  const [newCustomAvatarUrl, setNewCustomAvatarUrl] = useState('');
  
  // Призы
  const [prize1st, setPrize1st] = useState('Кубок колледжа AITU + Золотые медали + 50 000 ₸');
  const [prize2nd, setPrize2nd] = useState('Серебряные медали + Грамоты + 25 000 ₸');
  const [prize3rd, setPrize3rd] = useState('Бронзовые медали + Грамоты');
  const [prizeMvp, setPrizeMvp] = useState('Индивидуальная статуэтка MVP турнира');

  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [editingSeedTeamId, setEditingSeedTeamId] = useState(null);
  const [tempSeed, setTempSeed] = useState('1');

  if (!isOpen) return null;

  const currentTourn = tournaments.find(t => t.id === selectedTournId) || tournaments[0];
  const registeredTeams = currentTourn ? getTournamentRegistrations(currentTourn.id) : [];

  const refreshData = () => {
    const list = getAllTournaments();
    setTournaments(list);
    if (onTournamentsUpdated) onTournamentsUpdated(list);
  };

  const handleCreateTournament = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const fullPrizeString = `1 место: ${prize1st} | 2 место: ${prize2nd} | 3 место: ${prize3rd} | MVP: ${prizeMvp}`;

    const created = createNewTournament({
      title: newTitle,
      subTitle: newSubTitle || 'Официальный турнир колледжа AITU',
      date: newDate || 'Ноябрь 2026',
      maxTeams: Number(newSlots),
      format: newFormat,
      avatar: newCustomAvatarUrl.trim() || newAvatar,
      prizePool: fullPrizeString,
      prizeDetails: {
        firstPlace: prize1st,
        secondPlace: prize2nd,
        thirdPlace: prize3rd,
        mvp: prizeMvp
      }
    });

    const refreshed = getAllTournaments();
    setTournaments(refreshed);
    setSelectedTournId(created.id);
    setActiveTab('manage');
    setFeedbackMsg(`Турнир «${created.title}» успешно создан!`);
    triggerHaptic('success');
    if (onTournamentsUpdated) onTournamentsUpdated(refreshed);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  const handleGenerateBracket = () => {
    if (registeredTeams.length < 2) {
      alert("Для генерации сетки необходимо минимум 2 зарегистрированные команды.");
      return;
    }

    // Фильтруем подтвержденные команды, если есть, иначе берем все
    const approvedTeams = registeredTeams.filter(t => t.status !== 'ОТКЛОНЕНА');
    const teamsForBracket = approvedTeams.length >= 2 ? approvedTeams : registeredTeams;

    const bracket = generateSingleEliminationBracket(teamsForBracket);

    const updatedTournaments = tournaments.map(t => {
      if (t.id === currentTourn.id) {
        return {
          ...t,
          status: "ИДЁТ ТУРНИР",
          statusBadge: "bg-amber-950/60 border-amber-500/50 text-amber-300 font-bold",
          bracket,
          bracketData: bracket
        };
      }
      return t;
    });

    saveAllTournaments(updatedTournaments);
    setTournaments(updatedTournaments);
    setFeedbackMsg("Турнирная сетка плей-офф с учетом посева успешно сформирована!");
    triggerHaptic('success');
    if (onTournamentsUpdated) onTournamentsUpdated(updatedTournaments);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  const handleStatusChange = (newStatus) => {
    if (!currentTourn) return;
    let badge = 'bg-zinc-800 border-zinc-700 text-zinc-400';
    let type = 'upcoming';

    if (newStatus === 'ПРИЁМ ЗАЯВОК') {
      badge = 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 font-bold';
      type = 'upcoming';
    } else if (newStatus === 'ИДЁТ ТУРНИР') {
      badge = 'bg-amber-950/60 border-amber-500/40 text-amber-300 font-bold';
      type = 'ongoing';
    } else if (newStatus === 'ЗАВЕРШЁН') {
      badge = 'bg-zinc-800 border-zinc-700 text-zinc-400';
      type = 'past';
    }

    const updated = updateTournament(currentTourn.id, {
      status: newStatus,
      statusBadge: badge,
      type
    });

    refreshData();
    triggerHaptic('medium');
    setFeedbackMsg(`Статус турнира изменён на: ${newStatus}`);
    setTimeout(() => setFeedbackMsg(''), 2500);
  };

  const handleDeleteCurrentTournament = () => {
    if (!currentTourn) return;
    if (currentTourn.id === 'season_1_2026') {
      alert("Исторический турнир AITU PRO LEAGUE SEASON 1 защищён от удаления.");
      return;
    }
    if (window.confirm(`Вы уверены, что хотите удалить турнир «${currentTourn.title}»?`)) {
      const remaining = deleteTournament(currentTourn.id);
      setTournaments(remaining);
      setSelectedTournId(remaining[0]?.id || '');
      triggerHaptic('warning');
      setFeedbackMsg('Турнир удалён');
      setTimeout(() => setFeedbackMsg(''), 2500);
    }
  };

  const handleApproveTeam = (teamId) => {
    approveTeamRegistration(currentTourn.id, teamId);
    refreshData();
    triggerHaptic('success');
  };

  const handleRejectTeam = (teamId) => {
    rejectTeamRegistration(currentTourn.id, teamId);
    refreshData();
    triggerHaptic('warning');
  };

  const handleDeleteTeam = (teamId) => {
    if (window.confirm('Удалить эту команду из турнирного реестра?')) {
      deleteTournamentRegistration(currentTourn.id, teamId);
      refreshData();
      triggerHaptic('warning');
    }
  };

  const handleSaveSeed = (teamId) => {
    setTeamSeed(currentTourn.id, teamId, tempSeed);
    setEditingSeedTeamId(null);
    refreshData();
    triggerHaptic('success');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-[#0e0e11] border border-white/10 p-5 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.08] pb-3">
          <div className="space-y-0.5">
            <span className="font-mono text-[9px] text-amber-400 tracking-wider uppercase font-bold flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>ПАНЕЛЬ ОРГАНИЗАТОРА ТУРНИРОВ // AITU CS2</span>
            </span>
            <h3 className="text-lg font-black text-white font-sans tracking-tight uppercase">
              Управление чемпионатами колледжа
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">
              Модерация заявок, посев команд, призовые и генерация сеток плей-офф
            </p>
          </div>

          <button 
            onClick={onClose}
            className="p-1 border border-white/10 hover:border-white text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-black border border-white/10 text-xs font-mono">
          <button
            onClick={() => { setActiveTab('manage'); triggerHaptic('selection'); }}
            className={`py-1.5 uppercase font-bold text-center transition-colors cursor-pointer ${
              activeTab === 'manage' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            УПРАВЛЕНИЕ ЗАЯВКАМИ И СЕТКОЙ
          </button>
          <button
            onClick={() => { setActiveTab('create'); triggerHaptic('selection'); }}
            className={`py-1.5 uppercase font-bold text-center transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'create' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>СОЗДАТЬ НОВЫЙ ТУРНИР</span>
          </button>
        </div>

        {feedbackMsg && (
          <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* ========================================================
            TAB 1: УПРАВЛЕНИЕ ТУРНИРОМ, ЗАЯВКАМИ И СЕТКОЙ
            ======================================================== */}
        {activeTab === 'manage' && (
          <div className="space-y-4 font-mono text-xs">
            {/* Tournament Selector */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold block">
                ВЫБЕРИТЕ ТУРНИР ДЛЯ УПРАВЛЕНИЯ:
              </label>
              <select
                value={selectedTournId}
                onChange={(e) => {
                  setSelectedTournId(e.target.value);
                  triggerHaptic('light');
                }}
                className="w-full bg-black border border-white/20 p-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              >
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title} [{t.status}] · {t.date}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Tournament Control Card */}
            {currentTourn && (
              <div className="p-3 bg-zinc-950 border border-white/10 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{currentTourn.avatar || '🏆'}</span>
                    <div>
                      <h4 className="text-white font-sans font-bold text-sm">
                        {currentTourn.title}
                      </h4>
                      <p className="text-[10px] text-zinc-400 font-sans">
                        {currentTourn.format} · {currentTourn.date}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase ${currentTourn.statusBadge}`}>
                    {currentTourn.status}
                  </span>
                </div>

                {/* Status Switcher Toolbar */}
                <div className="p-2 bg-black border border-white/5 space-y-1.5">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold block">
                    СМЕНИТЬ СТАТУС ТУРНИРА:
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {['ПРИЁМ ЗАЯВОК', 'ИДЁТ ТУРНИР', 'ЗАВЕРШЁН'].map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleStatusChange(st)}
                        className={`py-1 text-[9px] uppercase font-bold border transition-colors cursor-pointer ${
                          currentTourn.status === st
                            ? 'bg-amber-400 text-black border-amber-400'
                            : 'bg-zinc-900 text-zinc-400 border-white/10 hover:text-white'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prize Pool Display */}
                {currentTourn.prizePool && (
                  <div className="p-2 bg-black border border-amber-500/20 text-[10px] text-zinc-300 font-sans space-y-1">
                    <span className="text-amber-400 font-mono font-bold uppercase block text-[9px]">
                      ПРИЗОВОЙ ФОНД И НАГРАДЫ:
                    </span>
                    <p className="leading-relaxed">{currentTourn.prizePool}</p>
                  </div>
                )}
              </div>
            )}

            {/* Registered Teams Moderation List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase font-bold">
                <span>ПОДАННЫЕ ЗАЯВКИ КОМАНД ({registeredTeams.length} / {currentTourn?.maxTeams || 8}):</span>
                <span className="text-amber-400">МОДЕРАЦИЯ И ПОСЕВ</span>
              </div>

              {registeredTeams.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {registeredTeams.map((team, idx) => {
                    const isExpanded = expandedTeamId === team.id;
                    const hasRoster = team.roster && Array.isArray(team.roster) && team.roster.length > 0;

                    return (
                      <div 
                        key={team.id || idx}
                        className="p-3 bg-black border border-white/10 hover:border-white/20 transition-all space-y-2"
                      >
                        {/* Main Summary Row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Seed Badge */}
                            {editingSeedTeamId === team.id ? (
                              <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                <input
                                  type="number"
                                  min="1"
                                  max="16"
                                  value={tempSeed}
                                  onChange={e => setTempSeed(e.target.value)}
                                  className="w-10 bg-zinc-900 border border-amber-400 text-white font-mono text-center text-xs p-0.5"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveSeed(team.id)}
                                  className="px-1 bg-emerald-600 text-white text-[9px] font-bold"
                                >
                                  OK
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSeedTeamId(team.id);
                                  setTempSeed(String(team.seed || idx + 1));
                                }}
                                className="w-7 h-7 bg-zinc-900 border border-white/20 hover:border-amber-400 text-amber-300 font-bold font-mono text-[10px] flex items-center justify-center shrink-0 cursor-pointer"
                                title="Нажмите, чтобы изменить посев"
                              >
                                #{team.seed || (idx + 1)}
                              </button>
                            )}

                            {/* Avatar & Team Info */}
                            <span className="text-base select-none">{team.avatar || '🛡️'}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-amber-400 font-bold font-mono">[{team.tag || team.teamName}]</span>
                                <span className="text-white font-bold font-sans text-xs truncate">{team.teamName}</span>
                                <span className="text-[9px] text-zinc-500 font-mono">({team.group})</span>
                              </div>
                              <div className="text-[9px] text-zinc-400 mt-0.5">
                                Капитан: <strong className="text-zinc-200">{team.captainNick}</strong> ({team.captainTg})
                              </div>
                            </div>
                          </div>

                          {/* Status Badge & Expand */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase border ${
                              team.status === 'ПОДТВЕРЖДЕНА'
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                : team.status === 'ОТКЛОНЕНА'
                                ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                            }`}>
                              {team.status || 'OK'}
                            </span>

                            <button
                              type="button"
                              onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                              className="p-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title="Подробнее о составе"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Detailed Roster Accordion */}
                        {isExpanded && (
                          <div className="p-2.5 bg-zinc-950 border-t border-white/[0.06] space-y-2 text-[10px] animate-fadeIn">
                            <div className="font-bold text-amber-300 uppercase tracking-wider text-[9px]">
                              ПОЛНЫЙ СОСТАВ И ДАННЫЕ FACEIT:
                            </div>

                            {hasRoster ? (
                              <div className="space-y-1">
                                {team.roster.map((p, pIdx) => (
                                  <div key={pIdx} className="flex items-center justify-between p-1 bg-black/60 border border-white/5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-zinc-500 font-mono text-[9px]">{pIdx + 1}.</span>
                                      <strong className="text-white">{p.nick}</strong>
                                      {p.isCaptain && <span className="text-amber-400 text-[8px] font-bold">(C)</span>}
                                      <span className="text-zinc-500 text-[9px]">[{p.role}]</span>
                                    </div>
                                    <div className="text-zinc-400 text-[9px] font-mono flex items-center gap-2">
                                      <span>Faceit: {p.faceit || '—'}</span>
                                      <span className="text-zinc-600">·</span>
                                      <span>Группа: {p.group || '—'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-zinc-400">
                                Игроки: {team.captainNick}, {(team.players || []).join(', ')}
                              </div>
                            )}

                            {/* Action Buttons for this team */}
                            <div className="flex items-center gap-2 pt-1 border-t border-white/[0.04]">
                              <button
                                type="button"
                                onClick={() => handleApproveTeam(team.id)}
                                className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-bold text-[9px] uppercase transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>ОДОБРИТЬ</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRejectTeam(team.id)}
                                className="px-2 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-bold text-[9px] uppercase transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                                <span>ОТКЛОНИТЬ</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteTeam(team.id)}
                                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white font-bold text-[9px] uppercase transition-colors flex items-center gap-1 ml-auto cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>УДАЛИТЬ</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-black/50 border border-white/5 text-center text-zinc-500 text-[10px]">
                  Пока нет зарегистрированных команд на этот турнир
                </div>
              )}
            </div>

            {/* Actions: Generate Bracket & Danger Zone */}
            <div className="pt-3 border-t border-white/[0.08] space-y-2">
              <button
                type="button"
                onClick={handleGenerateBracket}
                disabled={registeredTeams.length < 2}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-lg"
              >
                <GitBranch className="w-4 h-4" />
                <span>СГЕНЕРИРОВАТЬ СЕТКУ ПЛЕЙ-ОФФ ПО ПОСЕВУ</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteCurrentTournament}
                className="w-full py-1.5 bg-zinc-950 hover:bg-rose-950/60 border border-white/10 hover:border-rose-500/40 text-zinc-500 hover:text-rose-400 text-[10px] uppercase font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>УДАЛИТЬ ТУРНИР ИЗ СИСТЕМЫ</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: СОЗДАНИЕ НОВОГО ТУРНИРА
            ======================================================== */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateTournament} className="space-y-3 font-mono text-xs">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold block">
                НАЗВАНИЕ ТУРНИРА *
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="AITU CS2 Winter Cup 2026"
                className="w-full bg-black border border-white/20 p-2 text-white font-sans text-xs focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold block">
                ПОДЗАГОЛОВОК / ОПИСАНИЕ
              </label>
              <input
                type="text"
                value={newSubTitle}
                onChange={(e) => setNewSubTitle(e.target.value)}
                placeholder="Первенство колледжа среди групп 1-4 курсов"
                className="w-full bg-black border border-white/20 p-2 text-white font-sans text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Выбор аватарки турнира */}
            <div className="p-2.5 bg-zinc-950 border border-white/10 space-y-1.5">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                АВАТАРКА / ТРОФЕЙ ТУРНИРА:
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {TOURNAMENT_AVATARS.map(av => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      setNewAvatar(av.icon);
                      setNewCustomAvatarUrl('');
                      triggerHaptic('light');
                    }}
                    className={`p-2 border rounded-xs text-center transition-all cursor-pointer ${
                      newAvatar === av.icon && !newCustomAvatarUrl
                        ? 'bg-amber-950/60 border-amber-400 text-amber-300 scale-105'
                        : 'bg-black border-white/10 text-white hover:border-white/30'
                    }`}
                  >
                    <div className="text-xl">{av.icon}</div>
                    <div className="text-[8px] text-zinc-400 truncate mt-0.5">{av.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase font-bold block">
                  КОЛИЧЕСТВО СЛОТОВ
                </label>
                <select
                  value={newSlots}
                  onChange={(e) => setNewSlots(e.target.value)}
                  className="w-full bg-black border border-white/20 p-2 text-white text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="4">4 команды (1/2 + Финал)</option>
                  <option value="8">8 команд (1/4 + 1/2 + Финал)</option>
                  <option value="16">16 команд (1/8 + 1/4 + 1/2 + Финал)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase font-bold block">
                  ДАТА ПРОВЕДЕНИЯ
                </label>
                <input
                  type="text"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  placeholder="23-24 ноября 2026"
                  className="w-full bg-black border border-white/20 p-2 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold block">
                ФОРМАТ МАТЧЕЙ
              </label>
              <input
                type="text"
                value={newFormat}
                onChange={(e) => setNewFormat(e.target.value)}
                placeholder="Single Elimination · Best of 3 (5v5)"
                className="w-full bg-black border border-white/20 p-2 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Назначение призов */}
            <div className="p-3 bg-zinc-950 border border-amber-500/30 space-y-2">
              <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block border-b border-white/[0.08] pb-1">
                НАЗНАЧЕНИЕ ПРИЗОВОГО ФОНДА:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 uppercase block">1 МЕСТО (ЧЕМПИОН):</label>
                  <input
                    type="text"
                    value={prize1st}
                    onChange={(e) => setPrize1st(e.target.value)}
                    placeholder="Кубок колледжа + Золотые медали"
                    className="w-full bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 uppercase block">2 МЕСТО (ФИНАЛИСТ):</label>
                  <input
                    type="text"
                    value={prize2nd}
                    onChange={(e) => setPrize2nd(e.target.value)}
                    placeholder="Серебряные медали + Грамоты"
                    className="w-full bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 uppercase block">3 МЕСТО (БРОНЗА):</label>
                  <input
                    type="text"
                    value={prize3rd}
                    onChange={(e) => setPrize3rd(e.target.value)}
                    placeholder="Бронзовые медали"
                    className="w-full bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 uppercase block">MVP ТУРНИРА:</label>
                  <input
                    type="text"
                    value={prizeMvp}
                    onChange={(e) => setPrizeMvp(e.target.value)}
                    placeholder="Статуэтка MVP"
                    className="w-full bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5 mt-2 cursor-pointer shadow-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ОПУБЛИКОВАТЬ ТУРНИР В СИСТЕМЕ</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
