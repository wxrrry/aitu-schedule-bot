import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronRight, 
  ChevronLeft,
  Crosshair, 
  ShieldCheck, 
  Award,
  Zap,
  ArrowRight,
  Plus,
  Settings,
  GitBranch,
  Camera,
  Copy,
  Check,
  Upload,
  Maximize2,
  ExternalLink,
  Search,
  Flame,
  Target,
  X
} from 'lucide-react';
import { 
  TOURNAMENTS_LIST,
  CS2_PLAYERS,
  HLTV_TEAM_RANKINGS
} from '../data/cs2TournamentData';
import PlayerModal from './PlayerModal';
import TeamModal from './TeamModal';
import BracketTree from './BracketTree';
import TeamRegistrationModal from './TeamRegistrationModal';
import TournamentOrganizerModal from './TournamentOrganizerModal';
import { 
  getAllTournaments, 
  getTournamentRegistrations,
  syncTournamentsFromApi,
  confirmMatchScoreAndAdvance
} from '../utils/tournamentManager';
import { getUserProfile, isSuperAdmin, isOrganizer, setOrganizerMode } from '../utils/userProfile';
import { useTelegramBackButton, triggerHaptic, openBotCommand } from '../utils/telegram';

export default function HLTVTab() {
  const [tournamentsList, setTournamentsList] = useState(() => getAllTournaments());
  const [selectedTournament, setSelectedTournament] = useState(null); // null or tournament object
  const [tournamentTab, setTournamentTab] = useState('bracket'); // 'bracket', 'matches', 'rules'
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [rootTab, setRootTab] = useState('tournaments'); // 'tournaments', 'players'
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerSort, setPlayerSort] = useState('kills'); // 'kills', 'kd', 'hs'

  const sortedPlayersList = useMemo(() => {
    let list = Object.values(CS2_PLAYERS);
    if (playerSearch.trim()) {
      const q = playerSearch.trim().toLowerCase();
      list = list.filter(p => 
        p.nick.toLowerCase().includes(q) || 
        (p.team && p.team.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      if (playerSort === 'kd') {
        return parseFloat(b.kdRatio || 0) - parseFloat(a.kdRatio || 0);
      }
      if (playerSort === 'hs') {
        return parseInt(b.hsPercentage || 0) - parseInt(a.hsPercentage || 0);
      }
      return b.totalKills - a.totalKills;
    });
  }, [playerSearch, playerSort]);

  // Match screenshot & scoring state
  const [viewingScreenshot, setViewingScreenshot] = useState(null);
  const [editingScoreMatchId, setEditingScoreMatchId] = useState(null);
  const [scoreTeam1, setScoreTeam1] = useState('2');
  const [scoreTeam2, setScoreTeam2] = useState('0');
  const [scoreScreenshot, setScoreScreenshot] = useState(null);
  const [copiedMatchId, setCopiedMatchId] = useState(null);

  // Tournament organization modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isOrganizerModalOpen, setIsOrganizerModalOpen] = useState(false);
  const [registerTournament, setRegisterTournament] = useState(null);

  const profile = getUserProfile();
  const isSuper = isSuperAdmin(profile?.id);
  const [organizerMode, setOrganizerModeState] = useState(() => isOrganizer(profile?.id, profile?.role));
  const canOrganize = organizerMode || isSuper || isOrganizer(profile?.id, profile?.role);

  useEffect(() => {
    syncTournamentsFromApi();

    const handleRoleChanged = () => {
      setOrganizerModeState(isOrganizer(profile?.id, profile?.role));
    };

    const handleUpdated = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setTournamentsList(e.detail);
        if (selectedTournament) {
          const refreshedSelected = e.detail.find(t => t.id === selectedTournament.id);
          if (refreshedSelected) setSelectedTournament(refreshedSelected);
        }
      }
    };
    window.addEventListener('aitu_tournaments_updated', handleUpdated);
    window.addEventListener('aitu_role_changed', handleRoleChanged);
    return () => {
      window.removeEventListener('aitu_tournaments_updated', handleUpdated);
      window.removeEventListener('aitu_role_changed', handleRoleChanged);
    };
  }, [selectedTournament, profile]);

  const handleTournamentsUpdated = (updatedList) => {
    setTournamentsList(updatedList);
    if (selectedTournament) {
      const refreshedSelected = updatedList.find(t => t.id === selectedTournament.id);
      if (refreshedSelected) setSelectedTournament(refreshedSelected);
    }
  };

  const handleTeamRegistered = () => {
    const refreshed = getAllTournaments();
    setTournamentsList(refreshed);
    if (selectedTournament) {
      const refreshedSelected = refreshed.find(t => t.id === selectedTournament.id);
      if (refreshedSelected) setSelectedTournament(refreshedSelected);
    }
  };

  // Привязка нативной кнопки Назад в Telegram для выхода из турнира в общий список
  useTelegramBackButton(Boolean(selectedTournament), () => {
    setSelectedTournament(null);
    triggerHaptic('light');
  });

  const handleOpenTeam = (teamOrName) => {
    let teamObj = null;
    if (typeof teamOrName === 'string') {
      teamObj = HLTV_TEAM_RANKINGS.find(
        t => t.name.toLowerCase() === teamOrName.toLowerCase()
      ) || { name: teamOrName };
    } else {
      teamObj = teamOrName;
    }
    setSelectedTeam(teamObj);
    triggerHaptic('selection');
  };

  const handleOpenTournament = (tourn) => {
    setSelectedTournament(tourn);
    setTournamentTab('bracket');
    if (tourn.matches && tourn.matches.length > 0) {
      setSelectedMatchId(tourn.matches[0].id);
    } else {
      setSelectedMatchId(null);
    }
    triggerHaptic('medium');
  };

  const handleOpenPlayer = (playerNick) => {
    const p = CS2_PLAYERS[playerNick] || {
      nick: playerNick,
      team: "AITU",
      elo: 1000,
      kdRatio: "1.00",
      hsPercentage: "50%",
      winRate: "50%",
      matchesPlayed: 1,
      totalKills: 20,
      totalDeaths: 20,
      totalAssists: 5,
      badges: ["УЧАСТНИК ТУРНИРА"]
    };
    setSelectedPlayer(p);
    triggerHaptic('selection');
  };

  const handleCopyMatchResult = (match) => {
    if (!match) return;
    const winner = match.team1.score > match.team2.score ? match.team1.name : match.team2.name;
    const text = `🏆 AITU CS2: ${match.team1.name} [${match.team1.score}:${match.team2.score}] ${match.team2.name} (${match.stage})\nПобедитель матча: ${winner} 🏆`;
    navigator.clipboard?.writeText(text);
    setCopiedMatchId(match.id);
    triggerHaptic('selection');
    setTimeout(() => setCopiedMatchId(null), 2500);
  };

// Клиентское сжатие скриншотов через Canvas для оптимизации localStorage (снижает размер с 5-10 МБ до ~120 КБ)
const compressImageFile = (file, maxWidth = 1280, quality = 0.82) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target.result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

  const handleScreenshotFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImageFile(file, 1280, 0.82);
      if (compressedDataUrl) {
        setScoreScreenshot(compressedDataUrl);
        triggerHaptic('light');
      }
    } catch (err) {
      console.warn('Screenshot compression error:', err);
    }
  };

  const handleConfirmMatchScore = (matchId) => {
    if (!selectedTournament || !matchId) return;
    const updated = confirmMatchScoreAndAdvance(
      selectedTournament.id,
      matchId,
      scoreTeam1,
      scoreTeam2,
      scoreScreenshot
    );
    if (updated) {
      setSelectedTournament({ ...updated });
      setEditingScoreMatchId(null);
      setScoreScreenshot(null);
      triggerHaptic('success');
    }
  };

  const activeMatch = selectedTournament?.matches?.find(m => m.id === selectedMatchId) || selectedTournament?.matches?.[0];

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* ЕСЛИ ТУРНИР НЕ ВЫБРАН: СПИСОК ТУРНИРОВ И КАТАЛОГ ИГРОКОВ */}
      {!selectedTournament ? (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="p-4 bg-[#0a0a0c] border border-white/10 space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 text-[10px]">
              <span className="text-zinc-400 uppercase tracking-widest font-bold">
                AITU CYBERSPORT // CS2 HLTV
              </span>
              <span className="text-zinc-500">СЕЗОН 2026</span>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight font-sans uppercase">
                  ТУРНИРЫ КОЛЛЕДЖА ПО CS2
                </h2>
                <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                  Турнирная платформа колледжа: регистрация команд, сетка плей-офф и протоколы
                </p>
              </div>

              {canOrganize ? (
                <button
                  onClick={() => {
                    setIsOrganizerModalOpen(true);
                    triggerHaptic('medium');
                  }}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-amber-300 font-mono text-[10px] uppercase font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-amber-400" />
                  <span>ОРГАНИЗАТОР // ПАНЕЛЬ</span>
                </button>
              ) : isSuper ? (
                <button
                  onClick={() => {
                    setOrganizerMode(true);
                    setOrganizerModeState(true);
                    setIsOrganizerModalOpen(true);
                    triggerHaptic('medium');
                  }}
                  className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-900 border border-amber-500/30 text-zinc-300 hover:text-amber-300 font-mono text-[10px] uppercase font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-amber-400" />
                  <span>РЕЖИМ ОРГАНИЗАТОРА</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Root Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-black/60 border border-white/10 text-xs font-mono">
            <button
              onClick={() => { setRootTab('tournaments'); triggerHaptic('selection'); }}
              className={`py-2 px-1 uppercase tracking-wider font-bold transition-colors text-center text-[10px] sm:text-xs ${
                rootTab === 'tournaments' 
                  ? 'bg-white text-black' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ТУРНИР
            </button>
            <button
              onClick={() => { setRootTab('rankings'); triggerHaptic('selection'); }}
              className={`py-2 px-1 uppercase tracking-wider font-bold transition-colors text-center text-[10px] sm:text-xs flex items-center justify-center gap-1 ${
                rootTab === 'rankings' 
                  ? 'bg-white text-black' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>РЕЙТИНГ HLTV</span>
            </button>
            <button
              onClick={() => { setRootTab('players'); triggerHaptic('selection'); }}
              className={`py-2 px-1 uppercase tracking-wider font-bold transition-colors text-center text-[10px] sm:text-xs ${
                rootTab === 'players' 
                  ? 'bg-white text-black' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ИГРОКИ
            </button>
          </div>

          {/* TAB 1: СПИСОК ТУРНИРОВ */}
          {rootTab === 'tournaments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">
                  СПИСОК И АРХИВ ТУРНИРОВ:
                </span>
                {canOrganize ? (
                  <button
                    onClick={() => {
                      setIsOrganizerModalOpen(true);
                      triggerHaptic('light');
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 uppercase tracking-wider font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>СОЗДАТЬ ТУРНИР</span>
                  </button>
                ) : isSuper ? (
                  <button
                    onClick={() => {
                      setOrganizerMode(true);
                      setOrganizerModeState(true);
                      setIsOrganizerModalOpen(true);
                      triggerHaptic('light');
                    }}
                    className="text-[10px] text-zinc-400 hover:text-amber-300 uppercase tracking-wider font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>СОЗДАТЬ ТУРНИР (ОРГ)</span>
                  </button>
                ) : null}
              </div>

              {tournamentsList.map(tourn => {
                const isUpcoming = tourn.type === 'upcoming' || tourn.status === 'ПРИЁМ ЗАЯВОК';
                const regs = getTournamentRegistrations(tourn.id);
                const slotsCount = regs.length;
                const maxSlots = tourn.maxTeams || 8;

                return (
                  <div
                    key={tourn.id}
                    className="p-4 bg-[#0a0a0c] border border-white/10 hover:border-white/40 transition-all space-y-3 group"
                  >
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                      <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${tourn.statusBadge}`}>
                        {tourn.status}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {tourn.date}
                      </span>
                    </div>

                    <div onClick={() => handleOpenTournament(tourn)} className="cursor-pointer">
                      <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-amber-300 transition-colors uppercase font-sans">
                        {tourn.title}
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                        {tourn.subTitle} · {tourn.format}
                      </p>
                    </div>

                    {/* Highlights / Info */}
                    {isUpcoming ? (
                      <div className="p-2.5 bg-zinc-950 border border-white/5 space-y-2 text-[10px]">
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>ЗАРЕГИСТРИРОВАНО КОМАНД:</span>
                          <span className="font-bold text-amber-300 font-mono">{slotsCount} / {maxSlots}</span>
                        </div>
                        <div className="w-full bg-zinc-900 h-1.5 overflow-hidden">
                          <div 
                            className="bg-amber-400 h-full transition-all"
                            style={{ width: `${Math.min(100, (slotsCount / maxSlots) * 100)}%` }}
                          />
                        </div>
                        {tourn.prizePool && (
                          <div className="text-[10px] text-zinc-400 font-sans">
                            Призы: <span className="text-zinc-200 font-medium">{tourn.prizePool}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/[0.06] text-[10px]">
                        <div>
                          <span className="text-zinc-500 block text-[9px]">1 МЕСТО:</span>
                          <span className="text-amber-400 font-bold">{tourn.winner || "—"}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[9px]">2 МЕСТО:</span>
                          <span className="text-zinc-300 font-bold">{tourn.secondPlace || "—"}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[9px]">3 МЕСТО:</span>
                          <span className="text-zinc-400">{tourn.thirdPlace || "—"}</span>
                        </div>
                      </div>
                    )}

                    {/* Action Row */}
                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/[0.06]">
                      {isUpcoming && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRegisterTournament(tourn);
                            setIsRegisterModalOpen(true);
                            triggerHaptic('medium');
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-neutral-200 text-black font-bold font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>ПОДАТЬ ЗАЯВКУ</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenTournament(tourn)}
                        className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors uppercase tracking-wider text-[10px] flex items-center gap-1 ml-auto cursor-pointer"
                      >
                        <span>{isUpcoming ? 'ОТКРЫТЬ ТУРНИР / СЕТКУ' : 'ОТКРЫТЬ СЕТКУ И МАТЧИ'}</span>
                        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: РЕЙТИНГ КОМАНД HLTV */}
          {rootTab === 'rankings' && (
            <div className="space-y-3">
              {/* Header card */}
              <div className="p-3 bg-[#0e0e11] border border-white/10 flex items-center justify-between text-[10px]">
                <div>
                  <span className="font-bold text-white uppercase block">
                    HLTV WORLD RANKING // AITU CS2
                  </span>
                  <span className="text-zinc-500 text-[9px]">
                    Обновлено: 13 октября 2026 (по итогам осеннего кубка)
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-zinc-900 border border-white/20 text-amber-300 font-bold uppercase text-[9px]">
                  {HLTV_TEAM_RANKINGS.length} КОМАНД
                </span>
              </div>

              {/* Ranking List */}
              <div className="space-y-2">
                {HLTV_TEAM_RANKINGS.map(team => (
                  <div
                    key={team.rank}
                    className="p-3.5 bg-black border border-white/10 hover:border-white/30 transition-all space-y-2.5"
                  >
                    {/* Top row: Rank, Change, Team Name, Points */}
                    <div 
                      onClick={() => handleOpenTeam(team)}
                      className="flex items-center justify-between gap-2 cursor-pointer group/team"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Rank Badge */}
                        <div className={`w-8 h-8 flex items-center justify-center font-black text-sm rounded-xs border shrink-0 ${
                          team.rank === 1
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                            : team.rank === 2
                            ? 'bg-zinc-800 text-white border-white/40'
                            : team.rank === 3
                            ? 'bg-amber-900/30 text-amber-500 border-amber-700/40'
                            : 'bg-zinc-950 text-zinc-400 border-white/10'
                        }`}>
                          #{team.rank}
                        </div>

                        {/* Team Name & Change */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-sm font-sans tracking-tight truncate group-hover/team:text-amber-300 transition-colors">
                              {team.name}
                            </span>
                            {team.trophy && <span className="text-xs">{team.trophy}</span>}
                            <span className={`text-[10px] font-mono font-bold ${
                              team.changeType === 'up'
                                ? 'text-emerald-400'
                                : team.changeType === 'down'
                                ? 'text-rose-400'
                                : 'text-zinc-500'
                            }`}>
                              ({team.change})
                            </span>
                          </div>
                          <div className="text-[9px] text-zinc-500 uppercase tracking-wide">
                            {team.status} · {team.record}
                          </div>
                        </div>
                      </div>

                      {/* Points */}
                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-white font-mono">
                          {team.points} <span className="text-[10px] text-zinc-500 font-normal">pts</span>
                        </div>
                        <span className={`px-1.5 py-0.2 border text-[8px] font-bold uppercase tracking-wider ${team.badgeColor}`}>
                          {team.rank === 1 ? 'ЧЕМПИОН' : team.rank === 2 ? 'ФИНАЛ' : team.rank === 3 ? 'БРОНЗА' : `ТОП ${team.rank}`}
                        </span>
                      </div>
                    </div>

                    {/* Progress Points Bar */}
                    <div className="w-full bg-zinc-900 h-1 rounded-xs overflow-hidden">
                      <div 
                        className={`h-full ${
                          team.rank === 1 
                            ? 'bg-amber-400' 
                            : team.rank === 2 
                            ? 'bg-zinc-300' 
                            : team.rank === 3 
                            ? 'bg-amber-600' 
                            : 'bg-zinc-600'
                        }`}
                        style={{ width: `${(team.points / 1000) * 100}%` }}
                      />
                    </div>

                    {/* Lineup / Roster tags & action row */}
                    <div className="pt-1 border-t border-white/[0.06] flex items-center justify-between gap-1.5 flex-wrap text-[10px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-zinc-500 text-[9px] uppercase font-mono mr-0.5">СОСТАВ:</span>
                        {team.roster && team.roster.length > 0 ? (
                          team.roster.map((player, pIdx) => {
                            const hasFullProfile = Boolean(CS2_PLAYERS[player.nick]);
                            return (
                              <button
                                key={pIdx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPlayer(player.nick);
                                }}
                                className={`px-1.5 py-0.5 rounded-xs border text-[9px] transition-colors ${
                                  hasFullProfile
                                    ? 'bg-zinc-900 border-white/20 text-zinc-200 hover:border-amber-400 hover:text-white cursor-pointer'
                                    : 'bg-black border-white/10 text-zinc-400 hover:text-zinc-200 cursor-pointer'
                                }`}
                                title={hasFullProfile ? "Нажмите для открытия профиля игрока" : player.nick}
                              >
                                {player.nick}
                                {player.isCaptain && <span className="text-amber-400 ml-0.5 font-bold">(C)</span>}
                              </button>
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-zinc-500 font-mono italic">
                            неизвестно
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenTeam(team)}
                        className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-white/15 hover:border-white/40 text-amber-300 hover:text-white font-mono text-[9px] uppercase font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>ОБЗОР</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: КАТАЛОГ И ОБЩИЙ ТОП ИГРОКОВ */}
          {rootTab === 'players' && (
            <div className="space-y-3.5">
              {/* Header & Stats bar */}
              <div className="flex items-center justify-between px-1 flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider font-sans flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>ОБЩИЙ ТОП ИГРОКОВ ПО КИЛЛАМ</span>
                  </h3>
                  <span className="text-[9px] text-zinc-500 font-mono uppercase">
                    УЧАСТНИКОВ В БАЗЕ: {sortedPlayersList.length} · ВЕРИФИЦИРОВАНО FASTCUP
                  </span>
                </div>

                {/* Sort Toggle */}
                <div className="flex items-center gap-1 p-0.5 bg-black border border-white/10 text-[9px] font-mono">
                  <button
                    onClick={() => { setPlayerSort('kills'); triggerHaptic('light'); }}
                    className={`px-2 py-1 font-bold uppercase transition-colors ${
                      playerSort === 'kills' ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    КИЛЛЫ
                  </button>
                  <button
                    onClick={() => { setPlayerSort('kd'); triggerHaptic('light'); }}
                    className={`px-2 py-1 font-bold uppercase transition-colors ${
                      playerSort === 'kd' ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    K/D
                  </button>
                  <button
                    onClick={() => { setPlayerSort('hs'); triggerHaptic('light'); }}
                    className={`px-2 py-1 font-bold uppercase transition-colors ${
                      playerSort === 'hs' ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    HS%
                  </button>
                </div>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  placeholder="Поиск по нику или команде (например: wxrry, TRIQ, adaptive)..."
                  className="w-full bg-black border border-white/10 pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-sans transition-colors"
                />
                {playerSearch && (
                  <button
                    onClick={() => setPlayerSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Podium for TOP 3 Fraggers (shown if no search query and sorted by kills) */}
              {!playerSearch && playerSort === 'kills' && sortedPlayersList.length >= 3 && (
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {/* #2 Rank - Silver */}
                  <div
                    onClick={() => { setSelectedPlayer(sortedPlayersList[1]); triggerHaptic('selection'); }}
                    className="p-2.5 bg-black border border-zinc-400/50 hover:border-white transition-all text-center space-y-1.5 cursor-pointer relative group"
                  >
                    <div className="text-[10px] font-mono font-bold text-zinc-300">
                      🥈 #2 ТОП
                    </div>
                    <div className="font-bold text-white text-xs truncate group-hover:text-amber-300 transition-colors font-mono">
                      {sortedPlayersList[1].nick}
                    </div>
                    <div className="text-[9px] text-zinc-400 font-mono">
                      {sortedPlayersList[1].team}
                    </div>
                    <div className="text-base font-black text-white font-mono">
                      {sortedPlayersList[1].totalKills} <span className="text-[9px] text-zinc-500 font-normal">K</span>
                    </div>
                    <div className="text-[8px] text-emerald-400 font-mono font-bold">
                      KD {sortedPlayersList[1].kdRatio}
                    </div>
                  </div>

                  {/* #1 Rank - Gold Leader */}
                  <div
                    onClick={() => { setSelectedPlayer(sortedPlayersList[0]); triggerHaptic('selection'); }}
                    className="p-2.5 bg-amber-950/30 border-2 border-amber-400 hover:border-amber-300 transition-all text-center space-y-1.5 cursor-pointer relative group shadow-lg shadow-amber-500/10"
                  >
                    <div className="text-[10px] font-mono font-bold text-amber-300 flex items-center justify-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span>🥇 #1 MVP</span>
                    </div>
                    <div className="font-black text-amber-300 text-sm truncate group-hover:text-white transition-colors font-mono">
                      {sortedPlayersList[0].nick}
                    </div>
                    <div className="text-[9px] text-zinc-300 font-mono">
                      {sortedPlayersList[0].team}
                    </div>
                    <div className="text-xl font-black text-amber-400 font-mono">
                      {sortedPlayersList[0].totalKills} <span className="text-[10px] text-amber-400/70 font-normal">K</span>
                    </div>
                    <div className="text-[8px] text-emerald-400 font-mono font-bold">
                      KD {sortedPlayersList[0].kdRatio} · HS {sortedPlayersList[0].hsPercentage}
                    </div>
                  </div>

                  {/* #3 Rank - Bronze */}
                  <div
                    onClick={() => { setSelectedPlayer(sortedPlayersList[2]); triggerHaptic('selection'); }}
                    className="p-2.5 bg-black border border-amber-700/50 hover:border-amber-600 transition-all text-center space-y-1.5 cursor-pointer relative group"
                  >
                    <div className="text-[10px] font-mono font-bold text-amber-600">
                      🥉 #3 ТОП
                    </div>
                    <div className="font-bold text-white text-xs truncate group-hover:text-amber-300 transition-colors font-mono">
                      {sortedPlayersList[2].nick}
                    </div>
                    <div className="text-[9px] text-zinc-400 font-mono">
                      {sortedPlayersList[2].team}
                    </div>
                    <div className="text-base font-black text-white font-mono">
                      {sortedPlayersList[2].totalKills} <span className="text-[9px] text-zinc-500 font-normal">K</span>
                    </div>
                    <div className="text-[8px] text-emerald-400 font-mono font-bold">
                      KD {sortedPlayersList[2].kdRatio}
                    </div>
                  </div>
                </div>
              )}

              {/* Full Leaderboard List */}
              <div className="space-y-1.5 pt-1">
                {sortedPlayersList.map((p, idx) => {
                  const rank = idx + 1;
                  const isTop3 = rank <= 3;
                  const kdNum = parseFloat(p.kdRatio || 0);

                  return (
                    <div
                      key={p.nick}
                      onClick={() => { setSelectedPlayer(p); triggerHaptic('selection'); }}
                      className={`p-2.5 bg-black border transition-all cursor-pointer flex items-center justify-between gap-2.5 group select-none ${
                        rank === 1
                          ? 'border-amber-400/50 hover:border-amber-400 bg-amber-950/10'
                          : rank === 2
                          ? 'border-zinc-400/40 hover:border-white'
                          : rank === 3
                          ? 'border-amber-700/40 hover:border-amber-500'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      {/* Left: Rank & Nick */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                          rank === 1 
                            ? 'bg-amber-400 text-black font-black' 
                            : rank === 2 
                            ? 'bg-zinc-300 text-black font-black' 
                            : rank === 3 
                            ? 'bg-amber-700 text-white font-black' 
                            : 'bg-zinc-900 text-zinc-400 border border-white/10 text-[11px]'
                        }`}>
                          {rank <= 3 ? (rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉') : `#${rank}`}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-xs font-mono group-hover:text-amber-300 transition-colors truncate">
                              {p.nick}
                            </span>
                            {p.isCaptain && (
                              <span className="text-[8px] bg-amber-950/80 border border-amber-500/40 text-amber-400 px-1 font-bold font-mono">
                                (C)
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTeam(p.team);
                              }}
                              className="text-[9px] text-zinc-400 hover:text-amber-300 font-mono underline decoration-dotted transition-colors"
                            >
                              {p.team}
                            </button>
                          </div>

                          {/* Badges preview */}
                          {p.badges && p.badges.length > 0 && (
                            <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                              {p.badges.slice(0, 2).map((b, bIdx) => (
                                <span key={bIdx} className="text-[8px] text-zinc-500 font-mono uppercase bg-zinc-900/60 px-1 py-0.2 border border-white/5">
                                  {b}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Stats Columns */}
                      <div className="flex items-center gap-3 shrink-0 font-mono text-right">
                        <div className="min-w-[46px]">
                          <div className="text-sm font-black text-amber-400">
                            {p.totalKills} <span className="text-[9px] text-zinc-500 font-normal">K</span>
                          </div>
                          <div className="text-[8px] text-zinc-500">
                            {p.totalDeaths} D · {p.totalAssists} A
                          </div>
                        </div>

                        <div className="min-w-[40px] hidden xs:block">
                          <div className={`text-xs font-bold ${kdNum >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {p.kdRatio}
                          </div>
                          <div className="text-[8px] text-zinc-500">
                            K/D
                          </div>
                        </div>

                        <div className="min-w-[34px] hidden sm:block">
                          <div className="text-xs font-bold text-zinc-300">
                            {p.hsPercentage}
                          </div>
                          <div className="text-[8px] text-zinc-500">
                            HS
                          </div>
                        </div>

                        <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  );
                })}

                {sortedPlayersList.length === 0 && (
                  <div className="p-8 text-center text-zinc-500 text-xs font-mono">
                    Игроки по запросу «{playerSearch}» не найдены
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================
           КОГДА ТУРНИР ВЫБРАН: ЭКРАН ТУРНИРА С СЕТКОЙ И МАТЧАМИ
           ======================================================== */
        <div className="space-y-4 animate-fadeIn">
          {/* Back button and Tournament Header */}
          <div className="p-3.5 bg-[#0a0a0c] border border-white/10 space-y-2.5">
            <button
              onClick={() => {
                setSelectedTournament(null);
                triggerHaptic('light');
              }}
              className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white font-mono text-[10px] uppercase font-bold transition-colors pb-1 border-b border-white/[0.06]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>← НАЗАД КО ВСЕМ ТУРНИРАМ</span>
            </button>

            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.2 text-[8px] font-bold border uppercase tracking-wider ${selectedTournament.statusBadge}`}>
                    {selectedTournament.status}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {selectedTournament.date}
                  </span>
                </div>
                <h2 className="text-base font-black text-white uppercase tracking-tight font-sans">
                  {selectedTournament.title}
                </h2>
                <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                  {selectedTournament.format}
                </p>
              </div>

              {selectedTournament.winner && selectedTournament.type === 'past' && (
                <div className="px-2.5 py-1.5 bg-amber-950/40 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold">
                  ЧЕМПИОН: {selectedTournament.winner}
                </div>
              )}
            </div>
          </div>

          {/* Tournament Subtabs: СЕТКА, МАТЧИ, РЕГЛАМЕНТ */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-black/60 border border-white/10 text-[10px] font-mono">
            <button
              onClick={() => { setTournamentTab('bracket'); triggerHaptic('selection'); }}
              className={`py-1.5 px-1 uppercase tracking-wider font-bold transition-colors ${
                tournamentTab === 'bracket' 
                  ? 'bg-white text-black' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ТУРНИРНАЯ СЕТКА
            </button>
            <button
              onClick={() => { setTournamentTab('matches'); triggerHaptic('selection'); }}
              className={`py-1.5 px-1 uppercase tracking-wider font-bold transition-colors ${
                tournamentTab === 'matches' 
                  ? 'bg-white text-black' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              МАТЧИ ({selectedTournament.matches?.length || 0})
            </button>
            <button
              onClick={() => { setTournamentTab('rules'); triggerHaptic('selection'); }}
              className={`py-1.5 px-1 uppercase tracking-wider font-bold transition-colors ${
                tournamentTab === 'rules' 
                  ? 'bg-white text-black' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              РЕГЛАМЕНТ
            </button>
          </div>

          {/* 1. ВКЛАДКА: СЕТКА ВЫБРАННОГО ТУРНИРА */}
          {tournamentTab === 'bracket' && (
            <div className="space-y-4">
              {/* Если турнирная сетка уже сформирована (есть матчи 1/4 или полуфиналов) */}
              {selectedTournament.bracket && (selectedTournament.bracket.round2?.length > 0 || selectedTournament.bracket.semifinals?.length > 0) ? (
                <BracketTree 
                  bracketData={selectedTournament.bracket}
                  onSelectMatch={(matchId) => {
                    setSelectedMatchId(matchId);
                    setTournamentTab('matches');
                    triggerHaptic('selection');
                  }} 
                  onSelectTeam={(teamName) => {
                    handleOpenTeam(teamName);
                  }}
                />
              ) : selectedTournament.bracket?.isPending || selectedTournament.type === 'upcoming' ? (
                <div className="space-y-4">
                  {/* Pending Banner */}
                  <div className="p-6 bg-zinc-950 border border-white/10 text-center space-y-3 font-mono">
                    <div className="w-10 h-10 mx-auto rounded-full bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-white uppercase tracking-wider font-bold">
                      {selectedTournament.bracket?.title || "ИДЁТ ПРИЁМ ЗАЯВОК И РЕГИСТРАЦИЯ КОМАНД"}
                    </div>
                    <p className="text-[11px] text-zinc-400 font-sans max-w-sm mx-auto leading-relaxed">
                      {selectedTournament.bracket?.pendingMessage || "Сетка плей-офф формируется автоматически после регистрации команд. Капитаны могут зарегистрировать состав прямо сейчас."}
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                      <button
                        onClick={() => {
                          setRegisterTournament(selectedTournament);
                          setIsRegisterModalOpen(true);
                          triggerHaptic('medium');
                        }}
                        className="px-4 py-2 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>ПОДАТЬ ЗАЯВКУ КОМАНДЫ</span>
                      </button>

                      {canOrganize && (
                        <button
                          onClick={() => {
                            setIsOrganizerModalOpen(true);
                            triggerHaptic('light');
                          }}
                          className="px-4 py-2 bg-zinc-900 border border-white/20 text-white font-bold text-xs uppercase tracking-wider hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Settings className="w-3.5 h-3.5 text-amber-400" />
                          <span>ПАНЕЛЬ ОРГАНИЗАТОРА</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Registered Teams Preview in this tournament */}
                  {(() => {
                    const regs = getTournamentRegistrations(selectedTournament.id);
                    return (
                      <div className="p-4 bg-[#0a0a0c] border border-white/10 space-y-3 font-mono">
                        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 text-[10px]">
                          <span className="text-zinc-400 uppercase font-bold tracking-wider">
                            ЗАРЕГИСТРИРОВАННЫЕ КОМАНДЫ ({regs.length} / {selectedTournament.maxTeams || 8})
                          </span>
                          <span className="text-amber-400">CS2 ROSTERS</span>
                        </div>

                        {regs.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {regs.map((team, idx) => (
                              <div 
                                key={team.id || idx}
                                className="p-3 bg-black border border-white/10 space-y-2 hover:border-white/20 transition-all"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-base select-none">{team.avatar || '🛡️'}</span>
                                    <span className="text-amber-400 font-bold font-mono">[{team.tag || team.teamName}]</span>
                                    <span className="text-white font-bold font-sans text-xs truncate">{team.teamName}</span>
                                  </div>
                                  <span className={`px-1.5 py-0.2 text-[8px] font-bold uppercase border shrink-0 ${
                                    team.status === 'ПОДТВЕРЖДЕНА'
                                      ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                                      : team.status === 'ОТКЛОНЕНА'
                                      ? 'bg-rose-950/60 border-rose-500/30 text-rose-300'
                                      : 'bg-amber-950/60 border-amber-500/30 text-amber-300'
                                  }`}>
                                    {team.status || 'ПОДТВЕРЖДЕНА'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-zinc-400">
                                  Группа: <span className="text-zinc-200">{team.group}</span> · Капитан: <span className="text-amber-300">{team.captainNick}</span> {team.captainTg ? `(${team.captainTg})` : ''}
                                </div>
                                {team.roster && Array.isArray(team.roster) && team.roster.length > 0 ? (
                                  <div className="text-[9px] text-zinc-400 pt-1 border-t border-white/[0.04] space-y-0.5">
                                    <div className="flex flex-wrap gap-1">
                                      {team.roster.map((p, pI) => (
                                        <span key={pI} className="bg-zinc-900 border border-white/10 px-1 py-0.2 text-[8px] text-zinc-300 font-mono">
                                          {p.nick} {p.isCaptain ? '(C)' : ''} {p.faceit && p.faceit !== '—' ? `[${p.faceit}]` : ''}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ) : team.players && (
                                  <div className="text-[9px] text-zinc-500 truncate pt-0.5 border-t border-white/[0.04]">
                                    Состав: {team.captainNick}, {team.players.join(', ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-zinc-500 text-xs">
                            Пока нет зарегистрированных команд. Станьте первыми!
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Полная интерактивная турнирная сетка плей-офф в аутентичном формате */
                <BracketTree 
                  bracketData={selectedTournament?.bracket}
                  onSelectMatch={(matchId) => {
                    setSelectedMatchId(matchId);
                    setTournamentTab('matches');
                    triggerHaptic('selection');
                  }} 
                  onSelectTeam={(teamName) => {
                    handleOpenTeam(teamName);
                  }}
                />
              )}
            </div>
          )}

          {/* 2. ВКЛАДКА: МАТЧИ И СКОРБОРДЫ */}
          {tournamentTab === 'matches' && (
            <div className="space-y-4">
              {(!selectedTournament.matches || selectedTournament.matches.length === 0) ? (
                <div className="p-8 bg-black/60 border border-white/10 text-center space-y-2 font-mono">
                  <div className="text-xs text-white uppercase font-bold">
                    МАТЧИ ЕЩЁ НЕ НАЧАЛИСЬ
                  </div>
                  <p className="text-[11px] text-zinc-500 font-sans">
                    Расписание матчей и live-протоколы появятся здесь после старта турнира.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Match Selector Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
                    {selectedTournament.matches.map(match => (
                      <button
                        key={match.id}
                        onClick={() => {
                          setSelectedMatchId(match.id);
                          triggerHaptic('light');
                        }}
                        className={`p-2 border text-left transition-all ${
                          selectedMatchId === match.id
                            ? 'bg-white text-black font-bold border-white shadow-md'
                            : 'bg-[#0a0a0c] border-white/10 text-zinc-400 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        <div className="text-[8px] uppercase tracking-wider opacity-70 mb-0.5">
                          {match.stage}
                        </div>
                        <div className="font-bold truncate text-[11px]">
                          {match.team1.name} {match.team1.score}:{match.team2.score} {match.team2.name}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Active Match Card */}
                  {activeMatch && (
                    <div className="p-4 bg-[#0a0a0c] border border-white/10 space-y-4">
                      {/* Meta */}
                      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 text-[10px] flex-wrap gap-2">
                        <span className="text-amber-400 uppercase font-bold tracking-wider">
                          {activeMatch.stage} · {activeMatch.format}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500">
                            ДЛИТЕЛЬНОСТЬ: {activeMatch.duration} · {activeMatch.region}
                          </span>
                          {activeMatch.fastcupUrl && (
                            <a
                              href={activeMatch.fastcupUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 bg-orange-950/70 hover:bg-orange-900 border border-orange-500/50 text-orange-400 hover:text-white font-mono text-[9px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>FASTCUP</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Scoreboard Big Banner */}
                      <div className="p-4 bg-black border border-white/10 flex items-center justify-between">
                        {/* Team 1 */}
                        <button 
                          onClick={() => handleOpenTeam(activeMatch.team1.name)}
                          className="text-left space-y-1 group cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <div className="text-zinc-500 text-[10px]">СИД {activeMatch.team1.seed}</div>
                          <h3 className="text-lg font-black text-white group-hover:text-amber-300 tracking-tight transition-colors">
                            {activeMatch.team1.name}
                          </h3>
                          <span className="text-[9px] text-amber-400/90 group-hover:text-amber-300 font-mono uppercase tracking-wider block">
                            ОБЗОР КОМАНДЫ →
                          </span>
                        </button>

                        {/* Score */}
                        <div className="text-center px-4 py-1 bg-zinc-900 border border-white/20">
                          <div className="text-2xl font-black text-white font-mono tracking-widest">
                            {activeMatch.team1.score} : {activeMatch.team2.score}
                          </div>
                          <div className="text-[9px] text-emerald-400 uppercase font-bold mt-0.5">
                            ПОБЕДИТЕЛЬ: {activeMatch.team1.score > activeMatch.team2.score ? activeMatch.team1.name : activeMatch.team2.name} 🏆
                          </div>
                        </div>

                        {/* Team 2 */}
                        <button 
                          onClick={() => handleOpenTeam(activeMatch.team2.name)}
                          className="text-right space-y-1 group cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <div className="text-zinc-500 text-[10px]">СИД {activeMatch.team2.seed}</div>
                          <h3 className="text-lg font-black text-white group-hover:text-amber-300 tracking-tight transition-colors">
                            {activeMatch.team2.name}
                          </h3>
                          <span className="text-[9px] text-amber-400/90 group-hover:text-amber-300 font-mono uppercase tracking-wider block">
                            ← ОБЗОР КОМАНДЫ
                          </span>
                        </button>
                      </div>

                      {/* Match Actions Toolbar: Copy for Telegram & Admin Score Entry */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-white/[0.06] text-[10px]">
                        <button
                          onClick={() => handleCopyMatchResult(activeMatch)}
                          className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/20 text-white font-bold uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedMatchId === activeMatch.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">СКОПИРОВАНО!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-amber-400" />
                              <span>СКОПИРОВАТЬ ИТОГ В ТЕЛЕГРАМ</span>
                            </>
                          )}
                        </button>

                        {(isSuper || selectedTournament.type === 'upcoming' || selectedTournament.status === 'ИДЁТ' || selectedTournament.status === 'ПРИЁМ ЗАЯВОК') && (
                          <button
                            onClick={() => {
                              if (editingScoreMatchId === activeMatch.id) {
                                setEditingScoreMatchId(null);
                              } else {
                                setEditingScoreMatchId(activeMatch.id);
                                setScoreTeam1(String(activeMatch.team1.score || '2'));
                                setScoreTeam2(String(activeMatch.team2.score || '0'));
                                setScoreScreenshot(activeMatch.screenshotUrl || null);
                              }
                              triggerHaptic('light');
                            }}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer ml-auto"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{editingScoreMatchId === activeMatch.id ? 'ЗАКРЫТЬ ФОРМУ' : '⚡ ВНЕСТИ СЧЁТ И СЕТКУ'}</span>
                          </button>
                        )}
                      </div>

                      {/* Score Confirmation & Automatic Bracket Advance Form */}
                      {editingScoreMatchId === activeMatch.id && (
                        <div className="p-3 bg-zinc-950 border border-amber-500/40 space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between text-[10px] border-b border-white/[0.08] pb-1.5">
                            <span className="font-bold text-amber-300 uppercase flex items-center gap-1">
                              <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                              <span>ФИКСАЦИЯ СЧЁТА И ПРОДВИЖЕНИЕ ПО СЕТКЕ</span>
                            </span>
                            <span className="text-zinc-500">ADMIN PANEL</span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs">
                              <div className="flex-1">
                                <span className="text-[10px] text-zinc-400 block truncate mb-1">{activeMatch.team1.name}:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="3"
                                  value={scoreTeam1}
                                  onChange={(e) => setScoreTeam1(e.target.value)}
                                  className="w-full bg-black border border-white/20 p-1.5 text-center text-white font-bold"
                                />
                              </div>
                              <span className="text-zinc-500 font-bold text-lg pt-4">:</span>
                              <div className="flex-1">
                                <span className="text-[10px] text-zinc-400 block truncate mb-1">{activeMatch.team2.name}:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="3"
                                  value={scoreTeam2}
                                  onChange={(e) => setScoreTeam2(e.target.value)}
                                  className="w-full bg-black border border-white/20 p-1.5 text-center text-white font-bold"
                                />
                              </div>
                            </div>

                            {/* Preset Buttons */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <span className="text-[9px] text-zinc-500 uppercase mr-1">БЫСТРО:</span>
                              {[
                                { s1: '2', s2: '0' },
                                { s1: '2', s2: '1' },
                                { s1: '1', s2: '2' },
                                { s1: '0', s2: '2' }
                              ].map((p, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setScoreTeam1(p.s1);
                                    setScoreTeam2(p.s2);
                                    triggerHaptic('light');
                                  }}
                                  className="px-2 py-0.5 bg-zinc-900 border border-white/10 hover:border-amber-400 text-zinc-300 text-[10px] font-bold cursor-pointer"
                                >
                                  {p.s1}:{p.s2}
                                </button>
                              ))}
                            </div>

                            {/* Attach Screenshot File */}
                            <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                              <span className="text-[10px] text-zinc-400 block uppercase font-bold">
                                СКРИНШОТ ИТОГОВ ТАБЛО (SCOREBOARD):
                              </span>
                              <label className="flex items-center justify-center gap-2 p-2 bg-black border border-dashed border-white/20 hover:border-white/50 text-zinc-300 text-[10px] cursor-pointer">
                                <Upload className="w-3.5 h-3.5 text-amber-400" />
                                <span>{scoreScreenshot ? '✓ СКРИНШОТ ВЫБРАН (НАЖМИТЕ ДЛЯ СМЕНЫ)' : 'ВЫБРАТЬ ИЗОБРАЖЕНИЕ СКРИНШОТА'}</span>
                                <input type="file" accept="image/*" onChange={handleScreenshotFile} className="hidden" />
                              </label>
                              {scoreScreenshot && (
                                <div className="h-20 bg-black border border-white/10 overflow-hidden rounded-xs flex items-center justify-center">
                                  <img src={scoreScreenshot} alt="Превью" className="h-full object-contain" />
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleConfirmMatchScore(activeMatch.id)}
                              className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                            >
                              <Check className="w-4 h-4" />
                              <span>ПОДТВЕРДИТЬ СЧЁТ И ПРОДВИНУТЬ В СЕТКЕ</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Official Scoreboard Screenshot Section */}
                      {(activeMatch.screenshotUrl || activeMatch.screenshot) ? (
                        <div className="p-3 bg-black border border-white/10 space-y-2">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-zinc-400 font-bold uppercase flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-cyan-400" />
                              <span>ОФИЦИАЛЬНЫЙ СКРИНШОТ ТАБЛО МАТЧА (SCOREBOARD)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setViewingScreenshot(activeMatch.screenshotUrl || activeMatch.screenshot);
                                triggerHaptic('selection');
                              }}
                              className="text-cyan-400 hover:text-cyan-300 uppercase font-bold text-[9px] flex items-center gap-1 cursor-pointer"
                            >
                              <span>УВЕЛИЧИТЬ</span>
                              <Maximize2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div
                            onClick={() => {
                              setViewingScreenshot(activeMatch.screenshotUrl || activeMatch.screenshot);
                              triggerHaptic('selection');
                            }}
                            className="w-full h-36 bg-zinc-950 border border-white/5 rounded-xs overflow-hidden flex items-center justify-center cursor-pointer group relative"
                          >
                            <img
                              src={activeMatch.screenshotUrl || activeMatch.screenshot}
                              alt="Скриншот матча"
                              className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1 font-sans">
                              <Maximize2 className="w-4 h-4 text-cyan-400" />
                              <span>НАЖМИТЕ ДЛЯ ПОЛНОЭКРАННОГО ПРОСМОТРА</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-zinc-950 border border-dashed border-white/10 flex items-center justify-between gap-2 text-[10px]">
                          <span className="text-zinc-500 font-mono">
                            📷 Скриншот итогового табло матча ещё не прикреплен
                          </span>
                          <label className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-white/20 text-white font-bold uppercase inline-flex items-center gap-1 cursor-pointer shrink-0">
                            <Upload className="w-3 h-3 text-cyan-400" />
                            <span>ПРИКРЕПИТЬ</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                handleScreenshotFile(e);
                                setEditingScoreMatchId(activeMatch.id);
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}

                      {/* Maps Played */}
                      {activeMatch.maps && activeMatch.maps.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">
                            РЕЗУЛЬТАТЫ ПО КАРТАМ:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {activeMatch.maps.map((map, i) => (
                              <div key={i} className="p-2.5 bg-black border border-white/10 space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-bold text-white uppercase">{map.name}</span>
                                  <span className="text-zinc-500 text-[9px]">{map.duration}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold">
                                  <span className={map.score1 > map.score2 ? "text-emerald-400" : "text-zinc-400"}>
                                    {activeMatch.team1.name}: {map.score1}
                                  </span>
                                  <span className="text-zinc-600">·</span>
                                  <span className={map.score2 > map.score1 ? "text-emerald-400" : "text-zinc-400"}>
                                    {activeMatch.team2.name}: {map.score2}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Players Scoreboard Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/[0.08]">
                        {/* Team 1 Scoreboard */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 border-b border-white/[0.06] pb-1">
                            <button
                              onClick={() => handleOpenTeam(activeMatch.team1.name)}
                              className="hover:text-amber-300 transition-colors uppercase font-mono flex items-center gap-1 cursor-pointer"
                            >
                              <span>{activeMatch.team1.name} (РОСТЕР)</span>
                              <span className="text-[9px] text-zinc-500 font-normal">→ ОБЗОР</span>
                            </button>
                            <span>K / D / A</span>
                          </div>
                          <div className="space-y-1">
                            {activeMatch.team1.players.map((p, idx) => (
                              <div 
                                key={idx}
                                onClick={() => handleOpenPlayer(p.nick)}
                                className="p-2 bg-black border border-white/5 hover:border-white/30 flex items-center justify-between cursor-pointer transition-colors group select-none"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-zinc-600">0{idx + 1}</span>
                                  <span className="font-bold text-white group-hover:text-amber-300 transition-colors">
                                    {p.nick}
                                  </span>
                                  {p.isCaptain && (
                                    <span className="text-[8px] bg-amber-950 border border-amber-500/40 text-amber-400 px-1 font-bold">
                                      КАПИТАН
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-zinc-300 font-bold">{p.k}/{p.d}/{p.a}</span>
                                  <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-white transition-colors" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Team 2 Scoreboard */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 border-b border-white/[0.06] pb-1">
                            <button
                              onClick={() => handleOpenTeam(activeMatch.team2.name)}
                              className="hover:text-amber-300 transition-colors uppercase font-mono flex items-center gap-1 cursor-pointer"
                            >
                              <span>{activeMatch.team2.name} (РОСТЕР)</span>
                              <span className="text-[9px] text-zinc-500 font-normal">→ ОБЗОР</span>
                            </button>
                            <span>K / D / A</span>
                          </div>
                          <div className="space-y-1">
                            {activeMatch.team2.players.map((p, idx) => (
                              <div 
                                key={idx}
                                onClick={() => handleOpenPlayer(p.nick)}
                                className="p-2 bg-black border border-white/5 hover:border-white/30 flex items-center justify-between cursor-pointer transition-colors group select-none"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-zinc-600">0{idx + 1}</span>
                                  <span className="font-bold text-white group-hover:text-amber-300 transition-colors">
                                    {p.nick}
                                  </span>
                                  {p.isCaptain && (
                                    <span className="text-[8px] bg-amber-950 border border-amber-500/40 text-amber-400 px-1 font-bold">
                                      КАПИТАН
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-zinc-300 font-bold">{p.k}/{p.d}/{p.a}</span>
                                  <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-white transition-colors" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-zinc-500 text-center font-mono pt-1">
                        💡 Нажмите на любого игрока в таблице, чтобы открыть его детальный профиль
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. ВКЛАДКА: РЕГЛАМЕНТ ТУРНИРА */}
          {tournamentTab === 'rules' && (
            <div className="p-4 bg-[#0a0a0c] border border-white/10 space-y-3 font-mono text-xs">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold block border-b border-white/[0.08] pb-1.5">
                РЕГЛАМЕНТ: {selectedTournament.title.toUpperCase()}
              </span>

              <div className="space-y-2 text-zinc-300 font-sans leading-relaxed text-[11px]">
                {selectedTournament.rules?.map((rule, idx) => (
                  <p key={idx}>• {rule}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team Modal */}
      {selectedTeam && (
        <TeamModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
          onSelectPlayer={(playerNick) => {
            handleOpenPlayer(playerNick);
          }}
          onSelectMatch={(matchId) => {
            setSelectedTeam(null);
            setSelectedTournament(TOURNAMENTS_LIST[0]);
            setSelectedMatchId(matchId);
            setTournamentTab('matches');
            triggerHaptic('selection');
          }}
        />
      )}

      {/* Player Modal */}
      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onSelectTeam={(teamName) => {
            handleOpenTeam(teamName);
          }}
        />
      )}

      {/* Team Registration Modal */}
      {isRegisterModalOpen && (
        <TeamRegistrationModal
          isOpen={isRegisterModalOpen}
          onClose={() => {
            setIsRegisterModalOpen(false);
            setRegisterTournament(null);
          }}
          tournament={registerTournament || tournamentsList.find(t => t.type === 'upcoming') || tournamentsList[0]}
          profile={profile}
          onRegistered={handleTeamRegistered}
        />
      )}

      {/* Tournament Organizer Modal */}
      {isOrganizerModalOpen && (
        <TournamentOrganizerModal
          isOpen={isOrganizerModalOpen}
          onClose={() => setIsOrganizerModalOpen(false)}
          onTournamentsUpdated={handleTournamentsUpdated}
        />
      )}

      {/* Fullscreen Screenshot Zoom Modal */}
      {viewingScreenshot && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/95 backdrop-blur-sm animate-fadeIn font-mono"
          onClick={() => setViewingScreenshot(null)}
        >
          <div 
            className="relative max-w-3xl w-full bg-[#0e0e11] border border-neutral-700 p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>ТАБЛО МАТЧА · SCOREBOARD ПРОТОКОЛ</span>
              </div>
              <button
                onClick={() => setViewingScreenshot(null)}
                className="text-xs text-neutral-400 hover:text-white px-2 py-1 border border-neutral-700 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                ✕ ЗАКРЫТЬ
              </button>
            </div>

            <div className="bg-black border border-neutral-800 rounded-xs overflow-hidden flex items-center justify-center p-1 max-h-[75vh]">
              <img 
                src={viewingScreenshot} 
                alt="Итоги матча CS2" 
                className="w-full h-full max-h-[72vh] object-contain block select-none"
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-sans pt-1">
              <span>Официальный скриншот матча</span>
              <a
                href={viewingScreenshot}
                target="_blank"
                rel="noreferrer"
                download="cs2_match_scoreboard.png"
                className="text-cyan-400 hover:underline uppercase font-bold"
              >
                СКАЧАТЬ В ИСХОДНОМ КАЧЕСТВЕ
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
