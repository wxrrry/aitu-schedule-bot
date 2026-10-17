import React, { useState } from 'react';
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
  Plus
} from 'lucide-react';
import { 
  TOURNAMENTS_LIST,
  CS2_PLAYERS,
  HLTV_TEAM_RANKINGS
} from '../data/cs2TournamentData';
import PlayerModal from './PlayerModal';
import TeamModal from './TeamModal';
import BracketTree from './BracketTree';
import { useTelegramBackButton, triggerHaptic, openBotCommand } from '../utils/telegram';

export default function HLTVTab() {
  const [selectedTournament, setSelectedTournament] = useState(null); // null or tournament object
  const [tournamentTab, setTournamentTab] = useState('bracket'); // 'bracket', 'matches', 'rules'
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [rootTab, setRootTab] = useState('tournaments'); // 'tournaments', 'players'

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
                  Выберите турнир, чтобы открыть турнирную сетку, протоколы матчей и статистику
                </p>
              </div>
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
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block px-1">
                АРХИВ ТУРНИРОВ:
              </span>

              {TOURNAMENTS_LIST.map(tourn => (
                <div
                  key={tourn.id}
                  onClick={() => handleOpenTournament(tourn)}
                  className="p-4 bg-[#0a0a0c] border border-white/10 hover:border-white/40 cursor-pointer transition-all space-y-3 group"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                    <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${tourn.statusBadge}`}>
                      {tourn.status}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {tourn.date}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-amber-300 transition-colors uppercase font-sans">
                      {tourn.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                      {tourn.subTitle} · {tourn.format}
                    </p>
                  </div>

                  {/* Highlights */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/[0.06] text-[10px]">
                    <div>
                      <span className="text-zinc-500 block text-[9px]">1 МЕСТО:</span>
                      <span className="text-amber-400 font-bold">{tourn.winner}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">2 МЕСТО:</span>
                      <span className="text-zinc-300 font-bold">{tourn.secondPlace}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">3 МЕСТО:</span>
                      <span className="text-zinc-400">{tourn.thirdPlace}</span>
                    </div>
                  </div>

                  {/* Open Bracket CTA */}
                  <div className="pt-2 flex items-center justify-between text-xs font-bold text-white group-hover:text-amber-300 transition-colors border-t border-white/[0.06]">
                    <span className="uppercase tracking-wider text-[10px]">
                      ОТКРЫТЬ СЕТКУ И СКОРБОРДЫ МАТЧЕЙ
                    </span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
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

          {/* TAB: КАТАЛОГ ИГРОКОВ */}
          {rootTab === 'players' && (
            <div className="space-y-3">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block px-1">
                ПРОФИЛИ УЧАСТНИКОВ:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.values(CS2_PLAYERS).map(p => (
                  <div
                    key={p.nick}
                    onClick={() => setSelectedPlayer(p)}
                    className="p-3 bg-black border border-white/10 hover:border-white/30 cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white group-hover:text-amber-300 transition-colors text-xs font-mono">
                          {p.nick}
                        </div>
                        <div className="text-[9px] text-zinc-400 font-mono">
                          {p.team}{p.isCaptain ? ' · Капитан' : ''}
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 bg-zinc-900 border border-white/20 text-white font-bold text-[9px]">
                        KD {p.kdRatio}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-white/[0.06] text-[9px] text-zinc-400">
                      <div>Фраги: <strong className="text-white">{p.totalKills}</strong></div>
                      <div>HS: <strong className="text-white">{p.hsPercentage}</strong></div>
                      <div>Винрейт: <strong className="text-white">{p.winRate}</strong></div>
                    </div>
                  </div>
                ))}
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
              {/* Если сетка формируется (для нового турнира) */}
              {selectedTournament.bracket?.isPending ? (
                <div className="p-8 bg-zinc-950 border border-white/10 text-center space-y-3 font-mono">
                  <div className="text-xs text-white uppercase tracking-wider font-bold">
                    {selectedTournament.bracket.title}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans max-w-sm mx-auto leading-relaxed">
                    {selectedTournament.bracket.pendingMessage}
                  </p>
                  <button
                    onClick={() => openBotCommand('start')}
                    className="px-4 py-2 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ПОДАТЬ ЗАЯВКУ В БОТЕ</span>
                  </button>
                </div>
              ) : (
                /* Полная интерактивная турнирная сетка плей-офф в аутентичном формате */
                <BracketTree 
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
                  <div className="grid grid-cols-3 gap-1.5 text-[10px]">
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
                      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 text-[10px]">
                        <span className="text-amber-400 uppercase font-bold tracking-wider">
                          {activeMatch.stage} · {activeMatch.format}
                        </span>
                        <span className="text-zinc-500">
                          ДЛИТЕЛЬНОСТЬ: {activeMatch.duration} · {activeMatch.region}
                        </span>
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

                      {/* Maps Played */}
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
    </div>
  );
}
