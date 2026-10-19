import React from 'react';
import { 
  Trophy, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Settings, 
  ArrowRight, 
  ExternalLink, 
  Copy, 
  Check, 
  Award, 
  Crosshair, 
  Upload, 
  Camera, 
  Maximize2 
} from 'lucide-react';
import BracketTree from '../BracketTree';
import { getTournamentRegistrations } from '../../utils/tournamentManager';
import { triggerHaptic } from '../../utils/telegram';

export default function CyberTournamentsTab({
  tournamentsList,
  selectedTournament,
  setSelectedTournament,
  tournamentTab,
  setTournamentTab,
  selectedMatchId,
  setSelectedMatchId,
  canOrganize,
  isSuper,
  onOpenRegisterModal,
  onOpenOrganizerModal,
  onOpenTeam,
  onOpenPlayer,
  onViewScreenshot,
  handleScreenshotFile,
  scoreScreenshot,
  editingScoreMatchId,
  setEditingScoreMatchId,
  scoreTeam1,
  setScoreTeam1,
  scoreTeam2,
  setScoreTeam2,
  handleConfirmMatchScore,
  handleCopyMatchResult,
  copiedMatchId
}) {
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

  const activeMatch = selectedTournament?.matches?.find(m => m.id === selectedMatchId) || selectedTournament?.matches?.[0];

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 1. ЕСЛИ ТУРНИР НЕ ВЫБРАН: СПИСОК ТУРНИРОВ */}
      {!selectedTournament ? (
        <div className="space-y-4 animate-fadeIn text-center">
          {/* Header Banner */}
          <div className="p-4 bg-[#111111] border border-[#212121] rounded-2xl space-y-2 text-center flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-2 text-[10px] mx-auto flex-wrap">
              <span className="text-[#0ea5e9] font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                <span>AITU CYBER LEAGUE // ТУРНИРЫ</span>
              </span>
              <span className="text-zinc-500 font-mono">· СЕЗОН 2026</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight text-center">
              ЧЕМПИОНАТЫ И КУБКИ КОЛЛЕДЖА
            </h2>
            <p className="text-[11px] text-zinc-400 leading-relaxed text-center max-w-xl mx-auto">
              Турнирная платформа колледжа: регистрация команд, олимпийская сетка плей-офф и протоколы матчей FastCup.
            </p>

            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap mx-auto">
              {canOrganize ? (
                <button
                  onClick={() => {
                    onOpenOrganizerModal();
                    triggerHaptic('medium');
                  }}
                  className="px-3.5 py-2 bg-[#0ea5e9] hover:bg-[#38bdf8] text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_2px_12px_rgba(14,165,233,0.35)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>СОЗДАТЬ ТУРНИР (ОРГ)</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Tournaments List Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                СПИСОК ТУРНИРОВ:
              </span>
              {canOrganize && (
                <button
                  onClick={() => {
                    onOpenOrganizerModal();
                    triggerHaptic('light');
                  }}
                  className="text-[10px] text-[#0ea5e9] hover:text-[#38bdf8] uppercase tracking-wider font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>СОЗДАТЬ ТУРНИР</span>
                </button>
              )}
            </div>

            {tournamentsList.map(tourn => {
              const isUpcoming = tourn.type === 'upcoming' || tourn.status === 'ПРИЁМ ЗАЯВОК';
              const regs = getTournamentRegistrations(tourn.id);
              const slotsCount = regs.length;
              const maxSlots = tourn.maxTeams || 8;

              return (
                <div
                  key={tourn.id}
                  className="p-4 bg-[#111111] hover:bg-[#141414] border border-[#212121] hover:border-[#2e2e2e] rounded-2xl transition-all space-y-3 group"
                >
                  <div className="flex items-center justify-between border-b border-[#212121] pb-2">
                    <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-md uppercase tracking-wider ${tourn.statusBadge}`}>
                      {tourn.status}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {tourn.date}
                    </span>
                  </div>

                  <div onClick={() => handleOpenTournament(tourn)} className="cursor-pointer text-center">
                    <h3 className="text-base font-black text-white tracking-tight group-hover:text-[#0ea5e9] transition-colors uppercase font-sans text-center">
                      {tourn.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-sans mt-0.5 text-center">
                      {tourn.subTitle} · {tourn.format}
                    </p>
                  </div>

                  {/* Highlights / Info */}
                  {isUpcoming ? (
                    <div className="p-3 bg-[#181818] border border-[#212121] rounded-xl space-y-2 text-[10px] text-center">
                      <div className="flex items-center justify-between text-zinc-400 font-mono">
                        <span>ЗАРЕГИСТРИРОВАНО КОМАНД:</span>
                        <span className="font-bold text-amber-300">{slotsCount} / {maxSlots}</span>
                      </div>
                      <div className="w-full bg-[#111111] h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#0ea5e9] h-full transition-all"
                          style={{ width: `${Math.min(100, (slotsCount / maxSlots) * 100)}%` }}
                        />
                      </div>
                      {tourn.prizePool && (
                        <div className="text-[10px] text-zinc-400 font-sans text-center">
                          Награды: <span className="text-zinc-200 font-medium">{tourn.prizePool}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#212121] text-[10px] font-mono text-center">
                      <div className="text-center">
                        <span className="text-zinc-500 block text-[9px]">1 МЕСТО:</span>
                        <span className="text-amber-400 font-bold">{tourn.winner || "—"}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-zinc-500 block text-[9px]">2 МЕСТО:</span>
                        <span className="text-zinc-300 font-bold">{tourn.secondPlace || "—"}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-zinc-500 block text-[9px]">3 МЕСТО:</span>
                        <span className="text-zinc-400">{tourn.thirdPlace || "—"}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Row */}
                  <div className="pt-2 flex items-center justify-center gap-2 border-t border-[#212121] flex-wrap">
                    {isUpcoming && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenRegisterModal(tourn);
                          triggerHaptic('medium');
                        }}
                        className="px-3 py-1.5 bg-[#0ea5e9] hover:bg-[#38bdf8] text-white font-bold font-mono text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>ПОДАТЬ ЗАЯВКУ</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenTournament(tourn)}
                      className="text-xs font-bold text-white group-hover:text-[#0ea5e9] transition-colors uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>{isUpcoming ? 'ОТКРЫТЬ ТУРНИР / СЕТКУ' : 'ОТКРЫТЬ СЕТКУ И МАТЧИ'}</span>
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 2. КОГДА ТУРНИР ВЫБРАН: ЭКРАН ТУРНИРА С СЕТКОЙ И МАТЧАМИ */
        <div className="space-y-4 animate-fadeIn text-center">
          {/* Back button and Tournament Header */}
          <div className="p-4 bg-[#111111] border border-[#212121] rounded-2xl space-y-2.5 text-center flex flex-col items-center justify-center">
            <div className="w-full flex items-center justify-between pb-2 border-b border-[#212121]">
              <button
                onClick={() => {
                  setSelectedTournament(null);
                  triggerHaptic('light');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#18181f] hover:bg-[#23232c] border border-[#2e2e38] text-zinc-200 hover:text-white font-mono text-xs uppercase font-bold rounded-lg transition-all cursor-pointer shadow-sm"
              >
                <ChevronLeft className="w-4 h-4 text-[#0ea5e9]" />
                <span>← НАЗАД КО ВСЕМ ТУРНИРАМ</span>
              </button>
              <button
                onClick={() => {
                  setSelectedTournament(null);
                  triggerHaptic('light');
                }}
                className="text-zinc-500 hover:text-zinc-300 font-mono text-[10px] uppercase cursor-pointer"
              >
                ✕ ВЫЙТИ
              </button>
            </div>

            <div className="flex flex-col items-center justify-center gap-2 pt-1 text-center w-full">
              <div className="flex items-center justify-center gap-2 mb-0.5">
                <span className={`px-2 py-0.2 text-[8px] font-bold border uppercase tracking-wider rounded-md ${selectedTournament.statusBadge}`}>
                  {selectedTournament.status}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {selectedTournament.date}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight font-sans text-center">
                {selectedTournament.title}
              </h2>
              <p className="text-[11px] text-zinc-400 font-sans text-center">
                {selectedTournament.format}
              </p>

              {selectedTournament.winner && selectedTournament.type === 'past' && (
                <div className="px-3 py-1 bg-amber-950/40 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold rounded-lg mt-1">
                  ЧЕМПИОН: {selectedTournament.winner}
                </div>
              )}
            </div>
          </div>

          {/* Tournament Subtabs: СЕТКА, МАТЧИ, РЕГЛАМЕНТ */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#111111] border border-[#212121] rounded-xl text-[10px] font-mono">
            <button
              onClick={() => { setTournamentTab('bracket'); triggerHaptic('selection'); }}
              className={`py-2 px-1 uppercase tracking-wider font-bold transition-colors rounded-lg ${
                tournamentTab === 'bracket' 
                  ? 'bg-[#1c1c22] text-white border border-white/10 shadow-sm' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ТУРНИРНАЯ СЕТКА
            </button>
            <button
              onClick={() => { setTournamentTab('matches'); triggerHaptic('selection'); }}
              className={`py-2 px-1 uppercase tracking-wider font-bold transition-colors rounded-lg ${
                tournamentTab === 'matches' 
                  ? 'bg-[#1c1c22] text-white border border-white/10 shadow-sm' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              МАТЧИ ({selectedTournament.matches?.length || 0})
            </button>
            <button
              onClick={() => { setTournamentTab('rules'); triggerHaptic('selection'); }}
              className={`py-2 px-1 uppercase tracking-wider font-bold transition-colors rounded-lg ${
                tournamentTab === 'rules' 
                  ? 'bg-[#1c1c22] text-white border border-white/10 shadow-sm' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              РЕГЛАМЕНТ
            </button>
          </div>

          {/* 1. ВКЛАДКА: СЕТКА ПЛЕЙ-ОФФ */}
          {tournamentTab === 'bracket' && (
            <div className="space-y-4">
              {(!selectedTournament.bracket || (!selectedTournament.bracket.round1?.length && !selectedTournament.bracket.round2?.length && !selectedTournament.bracket.semifinals?.length && !selectedTournament.bracket.final)) ? (
                <div className="p-5 bg-[#111111] border border-[#212121] rounded-2xl text-center space-y-3">
                  <div className="text-xs text-white uppercase font-bold font-mono">
                    {selectedTournament.bracket?.title || "ИДЁТ ПРИЁМ ЗАЯВОК И РЕГИСТРАЦИЯ КОМАНД"}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans max-w-md mx-auto">
                    {selectedTournament.bracket?.pendingMessage || "Сетка плей-офф формируется автоматически после регистрации команд. Капитаны могут зарегистрировать состав прямо сейчас."}
                  </p>
                  <button
                    onClick={() => {
                      onOpenRegisterModal(selectedTournament);
                      triggerHaptic('medium');
                    }}
                    className="px-4 py-2 bg-[#0ea5e9] hover:bg-[#38bdf8] text-white font-bold font-mono text-xs uppercase tracking-wider rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ЗАРЕГИСТРИРОВАТЬ КОМАНДУ</span>
                  </button>

                  {/* Registered teams preview */}
                  {(() => {
                    const regs = getTournamentRegistrations(selectedTournament.id);
                    return (
                      <div className="pt-3 border-t border-[#212121] text-left space-y-2">
                        <span className="text-[10px] text-zinc-400 uppercase font-mono font-bold block">
                          ЗАРЕГИСТРИРОВАННЫЕ КОМАНДЫ ({regs.length} / {selectedTournament.maxTeams || 8}):
                        </span>
                        {regs.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {regs.map((team, idx) => (
                              <div key={team.id || idx} className="p-2.5 bg-[#141414] border border-[#212121] rounded-xl space-y-1">
                                <div className="flex items-center justify-between text-xs font-bold text-white">
                                  <span>{team.name}</span>
                                  <span className="text-[9px] text-[#0ea5e9] font-mono">СЛОТ #{idx + 1}</span>
                                </div>
                                <div className="text-[10px] text-zinc-400 font-mono">
                                  Капитан: {team.captainNick}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 text-center text-zinc-500 text-xs font-mono">
                            Пока нет зарегистрированных команд. Станьте первыми!
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <BracketTree 
                  bracketData={selectedTournament?.bracket}
                  onSelectMatch={(matchId) => {
                    setSelectedMatchId(matchId);
                    setTournamentTab('matches');
                    triggerHaptic('selection');
                  }} 
                  onSelectTeam={(teamName) => {
                    onOpenTeam(teamName);
                  }}
                />
              )}
            </div>
          )}

          {/* 2. ВКЛАДКА: МАТЧИ И СКОРБОРДЫ */}
          {tournamentTab === 'matches' && (
            <div className="space-y-4">
              {(!selectedTournament.matches || selectedTournament.matches.length === 0) ? (
                <div className="p-8 bg-[#111111] border border-[#212121] rounded-2xl text-center space-y-2 font-mono">
                  <div className="text-xs text-white uppercase font-bold">
                    МАТЧИ ЕЩЁ НЕ НАЧАЛИСЬ
                  </div>
                  <p className="text-[11px] text-zinc-500 font-sans">
                    Расписание матчей и live-протоколы появятся здесь после старта турнира.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Match Subnav Back bar */}
                  <div className="flex items-center justify-between p-2.5 bg-[#141418] border border-[#26262f] rounded-xl text-xs font-mono">
                    <button
                      onClick={() => {
                        setTournamentTab('bracket');
                        triggerHaptic('light');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1c24] hover:bg-[#252530] text-zinc-200 hover:text-white font-bold uppercase rounded-lg border border-[#30303e] transition-colors cursor-pointer shadow-sm"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-[#0ea5e9]" />
                      <span>← НАЗАД К СЕТКЕ ТУРНИРА</span>
                    </button>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      МАТЧЕЙ: {selectedTournament.matches.length}
                    </span>
                  </div>

                  {/* Match Selector Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
                    {selectedTournament.matches.map(match => (
                      <button
                        key={match.id}
                        onClick={() => {
                          setSelectedMatchId(match.id);
                          triggerHaptic('light');
                        }}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedMatchId === match.id
                            ? 'bg-[#1c1c22] text-white font-bold border-[#0ea5e9] shadow-md'
                            : 'bg-[#111111] border-[#212121] text-zinc-400 hover:border-[#2e2e2e] hover:text-white'
                        }`}
                      >
                        <div className="text-[8px] uppercase tracking-wider opacity-70 mb-0.5 text-[#0ea5e9]">
                          {match.stage}
                        </div>
                        <div className="font-bold truncate text-[11px] text-white">
                          {match.team1.name} {match.team1.score}:{match.team2.score} {match.team2.name}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Active Match Card */}
                  {activeMatch && (
                    <div className="p-4 bg-[#111111] border border-[#212121] rounded-2xl space-y-4">
                      {/* Meta */}
                      <div className="flex items-center justify-between border-b border-[#212121] pb-2 text-[10px] flex-wrap gap-2">
                        <span className="text-[#0ea5e9] uppercase font-bold tracking-wider">
                          {activeMatch.stage} · {activeMatch.format}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 font-mono">
                            ДЛИТЕЛЬНОСТЬ: {activeMatch.duration} · {activeMatch.region}
                          </span>
                          {activeMatch.fastcupUrl && (
                            <a
                              href={activeMatch.fastcupUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 bg-orange-950/70 hover:bg-orange-900 border border-orange-500/50 text-orange-400 hover:text-white font-mono text-[9px] font-bold uppercase transition-all flex items-center gap-1 rounded-sm cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>FASTCUP</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Scoreboard Big Banner */}
                      <div className="p-4 bg-[#141414] border border-[#212121] rounded-xl flex items-center justify-between">
                        {/* Team 1 */}
                        <button 
                          onClick={() => onOpenTeam(activeMatch.team1.name)}
                          className="text-left space-y-1 group cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <div className="text-zinc-500 text-[10px] font-mono">СИД {activeMatch.team1.seed}</div>
                          <h3 className="text-base sm:text-lg font-black text-white group-hover:text-[#0ea5e9] tracking-tight transition-colors">
                            {activeMatch.team1.name}
                          </h3>
                          <span className="text-[9px] text-[#0ea5e9] font-mono uppercase tracking-wider block">
                            ОБЗОР КОМАНДЫ →
                          </span>
                        </button>

                        {/* Score */}
                        <div className="text-center px-4 py-1.5 bg-[#181818] border border-[#2e2e2e] rounded-lg">
                          <div className="text-2xl font-black text-white font-mono tracking-widest">
                            {activeMatch.team1.score} : {activeMatch.team2.score}
                          </div>
                          <div className="text-[9px] text-emerald-400 uppercase font-bold mt-0.5">
                            ПОБЕДИТЕЛЬ: {activeMatch.team1.score > activeMatch.team2.score ? activeMatch.team1.name : activeMatch.team2.name} 🏆
                          </div>
                        </div>

                        {/* Team 2 */}
                        <button 
                          onClick={() => onOpenTeam(activeMatch.team2.name)}
                          className="text-right space-y-1 group cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <div className="text-zinc-500 text-[10px] font-mono">СИД {activeMatch.team2.seed}</div>
                          <h3 className="text-base sm:text-lg font-black text-white group-hover:text-[#0ea5e9] tracking-tight transition-colors">
                            {activeMatch.team2.name}
                          </h3>
                          <span className="text-[9px] text-[#0ea5e9] font-mono uppercase tracking-wider block">
                            ← ОБЗОР КОМАНДЫ
                          </span>
                        </button>
                      </div>

                      {/* Match Actions Toolbar */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-[#212121] text-[10px]">
                        <button
                          onClick={() => handleCopyMatchResult(activeMatch)}
                          className="px-2.5 py-1.5 bg-[#181818] hover:bg-[#202020] border border-[#2e2e2e] text-white font-bold uppercase rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedMatchId === activeMatch.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">СКОПИРОВАНО!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#0ea5e9]" />
                              <span>СКОПИРОВАТЬ ИТОГ В ТЕЛЕГРАМ</span>
                            </>
                          )}
                        </button>

                        {(canOrganize || isSuper) && (
                          <button
                            onClick={() => {
                              if (editingScoreMatchId === activeMatch.id) {
                                setEditingScoreMatchId(null);
                              } else {
                                setEditingScoreMatchId(activeMatch.id);
                                setScoreTeam1(String(activeMatch.team1.score || '2'));
                                setScoreTeam2(String(activeMatch.team2.score || '0'));
                              }
                              triggerHaptic('light');
                            }}
                            className="px-2.5 py-1.5 bg-[#0ea5e9] hover:bg-[#38bdf8] text-white font-bold uppercase rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer ml-auto"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{editingScoreMatchId === activeMatch.id ? 'ЗАКРЫТЬ ФОРМУ' : '⚡ ВНЕСТИ СЧЁТ И СЕТКУ'}</span>
                          </button>
                        )}
                      </div>

                      {/* Score Confirmation Form */}
                      {editingScoreMatchId === activeMatch.id && (
                        <div className="p-3 bg-[#181818] border border-[#0ea5e9]/40 rounded-xl space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between text-[10px] border-b border-[#2e2e2e] pb-1.5">
                            <span className="font-bold text-[#0ea5e9] uppercase flex items-center gap-1">
                              <Crosshair className="w-3.5 h-3.5" />
                              <span>ФИКСАЦИЯ СЧЁТА И ПРОДВИЖЕНИЕ ПО СЕТКЕ</span>
                            </span>
                            <span className="text-zinc-500 font-mono">ADMIN PANEL</span>
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
                                  className="w-full bg-[#111111] border border-[#2e2e2e] p-1.5 text-center text-white font-bold rounded-lg"
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
                                  className="w-full bg-[#111111] border border-[#2e2e2e] p-1.5 text-center text-white font-bold rounded-lg"
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
                                  className="px-2 py-0.5 bg-[#141414] border border-[#2e2e2e] hover:border-[#0ea5e9] text-zinc-300 text-[10px] font-bold rounded-md cursor-pointer"
                                >
                                  {p.s1}:{p.s2}
                                </button>
                              ))}
                            </div>

                            {/* Attach Screenshot File */}
                            <div className="pt-2 border-t border-[#2e2e2e] space-y-1.5">
                              <span className="text-[10px] text-zinc-400 block uppercase font-bold">
                                СКРИНШОТ ИТОГОВ ТАБЛО (SCOREBOARD):
                              </span>
                              <label className="flex items-center justify-center gap-2 p-2 bg-[#141414] border border-dashed border-[#2e2e2e] hover:border-white/50 text-zinc-300 text-[10px] rounded-lg cursor-pointer">
                                <Upload className="w-3.5 h-3.5 text-[#0ea5e9]" />
                                <span>{scoreScreenshot ? '✓ СКРИНШОТ ВЫБРАН (НАЖМИТЕ ДЛЯ СМЕНЫ)' : 'ВЫБРАТЬ ИЗОБРАЖЕНИЕ СКРИНШОТА'}</span>
                                <input type="file" accept="image/*" onChange={handleScreenshotFile} className="hidden" />
                              </label>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleConfirmMatchScore(activeMatch.id)}
                              className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                            >
                              <Check className="w-4 h-4" />
                              <span>ПОДТВЕРДИТЬ СЧЁТ И ПРОДВИНУТЬ В СЕТКЕ</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Official Scoreboard Screenshot Section */}
                      {(activeMatch.screenshotUrl || activeMatch.screenshot) ? (
                        <div className="p-3 bg-[#141414] border border-[#212121] rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-zinc-400 font-bold uppercase flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-cyan-400" />
                              <span>ОФИЦИАЛЬНЫЙ СКРИНШОТ ТАБЛО МАТЧА</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => onViewScreenshot(activeMatch.screenshotUrl || activeMatch.screenshot)}
                              className="text-cyan-400 hover:text-cyan-300 uppercase font-bold text-[9px] flex items-center gap-1 cursor-pointer"
                            >
                              <span>УВЕЛИЧИТЬ</span>
                              <Maximize2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div
                            onClick={() => onViewScreenshot(activeMatch.screenshotUrl || activeMatch.screenshot)}
                            className="w-full h-36 bg-[#0e0e0e] border border-[#212121] rounded-lg overflow-hidden flex items-center justify-center cursor-pointer group relative"
                          >
                            <img
                              src={activeMatch.screenshotUrl || activeMatch.screenshot}
                              alt="Скриншот матча"
                              className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1 font-sans">
                              <Maximize2 className="w-4 h-4 text-cyan-400" />
                              <span>НАЖМИТЕ ДЛЯ ПОЛНОЭКРАННОГО ПРОСМОТРА</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-[#141414] border border-dashed border-[#212121] rounded-xl flex items-center justify-between gap-2 text-[10px]">
                          <span className="text-zinc-500 font-mono">
                            📷 Скриншот итогового табло матча ещё не прикреплен
                          </span>
                          <label className="px-2.5 py-1 bg-[#181818] hover:bg-[#202020] border border-[#2e2e2e] text-white font-bold uppercase rounded-lg inline-flex items-center gap-1 cursor-pointer shrink-0">
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
                          <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-mono">
                            РЕЗУЛЬТАТЫ ПО КАРТАМ:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {activeMatch.maps.map((map, i) => (
                              <div key={i} className="p-2.5 bg-[#141414] border border-[#212121] rounded-xl space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-bold text-white uppercase">{map.name}</span>
                                  <span className="text-zinc-500 text-[9px] font-mono">{map.duration}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold font-mono">
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#212121]">
                        {/* Team 1 Scoreboard */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 border-b border-[#212121] pb-1">
                            <button
                              onClick={() => onOpenTeam(activeMatch.team1.name)}
                              className="hover:text-[#0ea5e9] transition-colors uppercase font-mono flex items-center gap-1 cursor-pointer"
                            >
                              <span>{activeMatch.team1.name} (РОСТЕР)</span>
                              <span className="text-[9px] text-zinc-500 font-normal">→ ОБЗОР</span>
                            </button>
                            <span className="font-mono">K / D / A</span>
                          </div>
                          <div className="space-y-1">
                            {activeMatch.team1.players.map((p, idx) => (
                              <div 
                                key={idx}
                                onClick={() => onOpenPlayer(p.nick)}
                                className="p-2 bg-[#141414] border border-[#212121] hover:border-[#2e2e2e] rounded-lg flex items-center justify-between cursor-pointer transition-colors group select-none"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-zinc-600 font-mono">0{idx + 1}</span>
                                  <span className="font-bold text-white group-hover:text-[#0ea5e9] transition-colors font-mono">
                                    {p.nick}
                                  </span>
                                  {p.isCaptain && (
                                    <span className="text-[8px] bg-amber-950 border border-amber-500/40 text-amber-400 px-1 font-bold rounded-xs font-mono">
                                      КАПИТАН
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 font-mono">
                                  <span className="text-zinc-300 font-bold">{p.k}/{p.d}/{p.a}</span>
                                  <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-white transition-colors" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Team 2 Scoreboard */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 border-b border-[#212121] pb-1">
                            <button
                              onClick={() => onOpenTeam(activeMatch.team2.name)}
                              className="hover:text-[#0ea5e9] transition-colors uppercase font-mono flex items-center gap-1 cursor-pointer"
                            >
                              <span>{activeMatch.team2.name} (РОСТЕР)</span>
                              <span className="text-[9px] text-zinc-500 font-normal">→ ОБЗОР</span>
                            </button>
                            <span className="font-mono">K / D / A</span>
                          </div>
                          <div className="space-y-1">
                            {activeMatch.team2.players.map((p, idx) => (
                              <div 
                                key={idx}
                                onClick={() => onOpenPlayer(p.nick)}
                                className="p-2 bg-[#141414] border border-[#212121] hover:border-[#2e2e2e] rounded-lg flex items-center justify-between cursor-pointer transition-colors group select-none"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-zinc-600 font-mono">0{idx + 1}</span>
                                  <span className="font-bold text-white group-hover:text-[#0ea5e9] transition-colors font-mono">
                                    {p.nick}
                                  </span>
                                  {p.isCaptain && (
                                    <span className="text-[8px] bg-amber-950 border border-amber-500/40 text-amber-400 px-1 font-bold rounded-xs font-mono">
                                      КАПИТАН
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 font-mono">
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

                      {/* Match Footer Back button */}
                      <div className="pt-2 border-t border-[#212121]">
                        <button
                          onClick={() => {
                            setTournamentTab('bracket');
                            triggerHaptic('light');
                          }}
                          className="w-full py-2 bg-[#18181f] hover:bg-[#22222b] text-zinc-200 hover:text-white font-bold font-mono text-xs uppercase rounded-xl border border-[#2e2e3a] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                          <ChevronLeft className="w-3.5 h-3.5 text-[#0ea5e9]" />
                          <span>ВЕРНУТЬСЯ К ТУРНИРНОЙ СЕТКЕ</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. ВКЛАДКА: РЕГЛАМЕНТ ТУРНИРА */}
          {tournamentTab === 'rules' && (
            <div className="p-4 bg-[#111111] border border-[#212121] rounded-2xl space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#212121] pb-2">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold block">
                  РЕГЛАМЕНТ: {selectedTournament.title.toUpperCase()}
                </span>
                <button
                  onClick={() => {
                    setTournamentTab('bracket');
                    triggerHaptic('light');
                  }}
                  className="inline-flex items-center gap-1 text-[10px] text-zinc-300 hover:text-white px-2 py-1 bg-[#18181f] border border-[#2e2e3a] rounded-md font-bold uppercase transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3 h-3 text-[#0ea5e9]" />
                  <span>К СЕТКЕ</span>
                </button>
              </div>

              <div className="space-y-2 text-zinc-300 font-sans leading-relaxed text-[11px]">
                {selectedTournament.rules?.map((rule, idx) => (
                  <p key={idx}>• {rule}</p>
                ))}
              </div>

              <div className="pt-2 border-t border-[#212121]">
                <button
                  onClick={() => {
                    setTournamentTab('bracket');
                    triggerHaptic('light');
                  }}
                  className="w-full py-2 bg-[#18181f] hover:bg-[#22222b] text-zinc-200 hover:text-white font-bold font-mono text-xs uppercase rounded-xl border border-[#2e2e3a] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-[#0ea5e9]" />
                  <span>ВЕРНУТЬСЯ К ТУРНИРНОЙ СЕТКЕ</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
