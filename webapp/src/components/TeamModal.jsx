import React from 'react';
import { 
  X, 
  Trophy, 
  Users, 
  Calendar, 
  Shield, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ChevronRight,
  Target,
  ArrowRight
} from 'lucide-react';
import { useTelegramBackButton, triggerHaptic } from '../utils/telegram';
import { 
  HLTV_TEAM_RANKINGS, 
  CS2_PLAYERS, 
  TOURNAMENT_MATCHES, 
  OFFICIAL_BRACKET 
} from '../data/cs2TournamentData';

export default function TeamModal({ team, onClose, onSelectPlayer, onSelectMatch }) {
  useTelegramBackButton(Boolean(team), onClose);

  if (!team) return null;

  // Retrieve team ranking record by name or fallback
  const teamName = typeof team === 'string' ? team : team.name;
  const rankingData = HLTV_TEAM_RANKINGS.find(
    t => t.name.toLowerCase() === teamName.toLowerCase()
  ) || (typeof team === 'object' ? team : { name: teamName });

  const rank = rankingData.rank || null;
  const points = rankingData.points || null;
  const status = rankingData.status || "УЧАСТНИК КУБКА";
  const trophy = rankingData.trophy || "";
  const record = rankingData.record || "—";
  const change = rankingData.change || "—";
  const changeType = rankingData.changeType || "same";
  const roster = rankingData.roster || null;

  // Find all detailed matches for this team in the tournament
  const teamMatches = TOURNAMENT_MATCHES.filter(
    m => m.team1.name.toLowerCase() === teamName.toLowerCase() || 
         m.team2.name.toLowerCase() === teamName.toLowerCase()
  );

  // Derive tournament bracket history for this team from OFFICIAL_BRACKET
  const bracketHistory = [];

  // Round 1
  OFFICIAL_BRACKET.round1?.forEach(m => {
    if (m.team1.name.toLowerCase() === teamName.toLowerCase() || m.team2.name.toLowerCase() === teamName.toLowerCase()) {
      const isTeam1 = m.team1.name.toLowerCase() === teamName.toLowerCase();
      const me = isTeam1 ? m.team1 : m.team2;
      const opp = isTeam1 ? m.team2 : m.team1;
      bracketHistory.push({
        stage: "РАУНД 1 (1/8 ФИНАЛА)",
        opponent: opp.name,
        oppSeed: opp.seed,
        mySeed: me.seed,
        isWinner: me.isWinner,
        score: me.score && opp.score ? `${me.score}:${opp.score}` : null,
        detailedMatchId: null
      });
    }
  });

  // Round 2 (1/4 Finals)
  OFFICIAL_BRACKET.round2?.forEach(m => {
    if (m.team1.name.toLowerCase() === teamName.toLowerCase() || m.team2.name.toLowerCase() === teamName.toLowerCase()) {
      const isTeam1 = m.team1.name.toLowerCase() === teamName.toLowerCase();
      const me = isTeam1 ? m.team1 : m.team2;
      const opp = isTeam1 ? m.team2 : m.team1;
      const detailedMatch = teamMatches.find(tm => tm.stage.includes("1/4"));
      bracketHistory.push({
        stage: "1/4 ФИНАЛА (ЧЕТВЕРТЬФИНАЛ)",
        opponent: opp.name,
        oppSeed: opp.seed,
        mySeed: me.seed,
        isWinner: me.isWinner,
        score: detailedMatch ? (isTeam1 ? `${detailedMatch.team1.score}:${detailedMatch.team2.score}` : `${detailedMatch.team2.score}:${detailedMatch.team1.score}`) : (me.score && opp.score ? `${me.score}:${opp.score}` : null),
        detailedMatchId: detailedMatch?.id || null
      });
    }
  });

  // Semifinals
  OFFICIAL_BRACKET.semifinals?.forEach(m => {
    if (m.team1.name.toLowerCase() === teamName.toLowerCase() || m.team2.name.toLowerCase() === teamName.toLowerCase()) {
      const isTeam1 = m.team1.name.toLowerCase() === teamName.toLowerCase();
      const me = isTeam1 ? m.team1 : m.team2;
      const opp = isTeam1 ? m.team2 : m.team1;
      const detailedMatch = teamMatches.find(tm => tm.stage.includes("1/2"));
      bracketHistory.push({
        stage: "1/2 ФИНАЛА (ПОЛУФИНАЛ)",
        opponent: opp.name,
        oppSeed: opp.seed,
        mySeed: me.seed,
        isWinner: me.isWinner,
        score: detailedMatch ? (isTeam1 ? `${detailedMatch.team1.score}:${detailedMatch.team2.score}` : `${detailedMatch.team2.score}:${detailedMatch.team1.score}`) : (me.score && opp.score ? `${me.score}:${opp.score}` : null),
        detailedMatchId: detailedMatch?.id || null
      });
    }
  });

  // Grand Final
  if (OFFICIAL_BRACKET.final) {
    const f = OFFICIAL_BRACKET.final;
    if (f.team1.name.toLowerCase() === teamName.toLowerCase() || f.team2.name.toLowerCase() === teamName.toLowerCase()) {
      const isTeam1 = f.team1.name.toLowerCase() === teamName.toLowerCase();
      const me = isTeam1 ? f.team1 : f.team2;
      const opp = isTeam1 ? f.team2 : f.team1;
      const detailedMatch = teamMatches.find(tm => tm.stage.includes("ФИНАЛ") && !tm.stage.includes("1/"));
      bracketHistory.push({
        stage: "ГРАНД-ФИНАЛ ЧЕМПИОНАТА",
        opponent: opp.name,
        oppSeed: opp.seed,
        mySeed: me.seed,
        isWinner: me.isWinner,
        score: detailedMatch ? (isTeam1 ? `${detailedMatch.team1.score}:${detailedMatch.team2.score}` : `${detailedMatch.team2.score}:${detailedMatch.team1.score}`) : "1:2",
        detailedMatchId: detailedMatch?.id || "match_final_ll_vs_triq"
      });
    }
  }

  // 3rd Place Match
  if (OFFICIAL_BRACKET.thirdPlace) {
    const tp = OFFICIAL_BRACKET.thirdPlace;
    if (tp.team1.name.toLowerCase() === teamName.toLowerCase() || tp.team2.name.toLowerCase() === teamName.toLowerCase()) {
      const isTeam1 = tp.team1.name.toLowerCase() === teamName.toLowerCase();
      const me = isTeam1 ? tp.team1 : tp.team2;
      const opp = isTeam1 ? tp.team2 : tp.team1;
      bracketHistory.push({
        stage: "МАТЧ ЗА 3-Е МЕСТО (БРОНЗА)",
        opponent: opp.name,
        oppSeed: opp.seed,
        mySeed: me.seed,
        isWinner: me.isWinner,
        score: null,
        detailedMatchId: null
      });
    }
  }

  return (
    <div 
      className="fixed inset-0 z-45 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[#0e0e11] border border-white/10 p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between border-b border-white/[0.08] pb-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {rank && (
                <span className={`px-2 py-0.5 font-mono text-xs font-black rounded-xs border ${
                  rank === 1
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : rank === 2
                    ? 'bg-zinc-800 text-white border-white/40'
                    : rank === 3
                    ? 'bg-amber-900/30 text-amber-500 border-amber-700/40'
                    : 'bg-zinc-950 text-zinc-400 border-white/10'
                }`}>
                  #{rank} HLTV
                </span>
              )}
              <h3 className="text-2xl font-black text-white font-sans tracking-tight truncate">
                {teamName}
              </h3>
              {trophy && <span className="text-lg">{trophy}</span>}
              {change && change !== '—' && (
                <span className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${
                  changeType === 'up'
                    ? 'text-emerald-400'
                    : changeType === 'down'
                    ? 'text-rose-400'
                    : 'text-zinc-500'
                }`}>
                  {changeType === 'up' && <TrendingUp className="w-3 h-3" />}
                  {changeType === 'down' && <TrendingDown className="w-3 h-3" />}
                  {changeType === 'same' && <Minus className="w-3 h-3" />}
                  <span>{change}</span>
                </span>
              )}
            </div>

            <p className="text-xs text-amber-400 font-mono font-semibold uppercase tracking-wider">
              {status} · {record}
            </p>
          </div>

          <button 
            onClick={() => {
              onClose();
              triggerHaptic('light');
            }}
            className="p-1 border border-white/10 hover:border-white text-zinc-400 hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-4 gap-2 font-mono text-center">
          <div className="p-2 bg-black border border-white/10">
            <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">РАНГ</span>
            <span className="text-sm sm:text-base font-bold text-white">
              {rank ? `#${rank}` : "—"}
            </span>
          </div>
          <div className="p-2 bg-black border border-white/10">
            <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">ОЧКИ</span>
            <span className="text-sm sm:text-base font-bold text-amber-300">
              {points ? `${points}` : "—"}
            </span>
          </div>
          <div className="p-2 bg-black border border-white/10">
            <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">МАТЧИ</span>
            <span className="text-sm sm:text-base font-bold text-white">
              {record.split(' ')[0] || "—"}
            </span>
          </div>
          <div className="p-2 bg-black border border-white/10">
            <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">ДИВИЗИОН</span>
            <span className="text-sm sm:text-base font-bold text-zinc-300">
              AITU
            </span>
          </div>
        </div>

        {/* Points Progress */}
        {points && (
          <div className="p-3 bg-zinc-950 border border-white/10 space-y-1.5 font-mono text-xs">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-zinc-400 uppercase tracking-wider font-semibold">
                РЕЙТИНГОВАЯ СИСТЕМА HLTV
              </span>
              <span className="text-amber-400 font-bold">{points} / 1000 PTS</span>
            </div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-xs overflow-hidden">
              <div 
                className={`h-full ${
                  rank === 1 ? 'bg-amber-400' : rank === 2 ? 'bg-zinc-300' : rank === 3 ? 'bg-amber-600' : 'bg-zinc-500'
                }`}
                style={{ width: `${(points / 1000) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Section: ACTIVE ROSTER */}
        <div className="p-3 bg-zinc-950 border border-white/10 space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                СОСТАВ КОМАНДЫ
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 uppercase">
              {roster ? `${roster.length} ИГРОКОВ` : "НЕ ПОДТВЕРЖДЕН"}
            </span>
          </div>

          {roster && roster.length > 0 ? (
            <div className="space-y-1.5">
              {roster.map((player, idx) => {
                const fullProfile = CS2_PLAYERS[player.nick];
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (onSelectPlayer) {
                        onSelectPlayer(player.nick);
                        triggerHaptic('light');
                      }
                    }}
                    className={`p-2 bg-black border transition-all flex items-center justify-between group ${
                      fullProfile
                        ? 'border-white/15 hover:border-amber-400/80 cursor-pointer'
                        : 'border-white/10 hover:border-white/30 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-zinc-600 text-[10px] w-3 text-right">
                        {idx + 1}.
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white text-xs group-hover:text-amber-300 transition-colors truncate">
                            {player.nick}
                          </span>
                          {player.isCaptain && (
                            <span className="px-1 py-0.2 bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[8px] font-bold uppercase">
                              КАПИТАН (C)
                            </span>
                          )}
                        </div>
                        {fullProfile && (
                          <div className="text-[9px] text-zinc-500 font-sans mt-0.5">
                            K/D: <strong className="text-emerald-400 font-mono">{fullProfile.kdRatio}</strong> · Убийств: <strong className="text-white font-mono">{fullProfile.totalKills}</strong> · HS: <strong className="text-zinc-300 font-mono">{fullProfile.hsPercentage}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {fullProfile?.elo && (
                        <span className="px-1.5 py-0.5 bg-zinc-900 border border-white/10 text-zinc-300 text-[9px] font-mono font-bold">
                          {fullProfile.elo} ELO
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 bg-black/50 border border-white/5 text-center space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                СОСТАВ НЕ ЗАФИКСИРОВАН
              </span>
              <p className="text-[10px] text-zinc-500 font-sans leading-relaxed">
                Никнеймы игроков данной команды не фигурировали в опубликованных протоколах матчей турнира.
              </p>
            </div>
          )}
        </div>

        {/* Section: TOURNAMENT PATH / MATCHES */}
        <div className="p-3 bg-zinc-950 border border-white/10 space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                МАТЧИ НА AITU CS2 AUTUMN CUP
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 uppercase">СЕТКА ПЛЕЙ-ОФФ</span>
          </div>

          {bracketHistory.length > 0 ? (
            <div className="space-y-2">
              {bracketHistory.map((m, mIdx) => (
                <div 
                  key={mIdx}
                  className="p-2.5 bg-black border border-white/10 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-zinc-500 uppercase tracking-wide">
                      {m.stage}
                    </span>
                    <span className={`px-1.5 py-0.2 border text-[8px] font-bold uppercase ${
                      m.isWinner 
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                        : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    }`}>
                      {m.isWinner ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-sans">{teamName}</span>
                      {m.score && (
                        <span className="px-1.5 py-0.5 bg-zinc-900 border border-white/20 text-amber-300 font-mono text-[11px]">
                          {m.score}
                        </span>
                      )}
                      <span className="text-zinc-400 font-sans font-normal text-[11px]">
                        vs {m.opponent}
                      </span>
                    </div>

                    {m.detailedMatchId && onSelectMatch && (
                      <button
                        onClick={() => {
                          onSelectMatch(m.detailedMatchId);
                          triggerHaptic('medium');
                        }}
                        className="px-2 py-1 bg-white text-black text-[9px] font-bold uppercase hover:bg-neutral-200 transition-colors flex items-center gap-1 shrink-0"
                      >
                        <span>ПРОТОКОЛ</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-black/50 border border-white/5 text-center text-zinc-500 text-[10px]">
              Протоколы матчей в архиве
            </div>
          )}
        </div>

        {/* Footer Close */}
        <button
          onClick={() => {
            onClose();
            triggerHaptic('light');
          }}
          className="w-full py-2 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors"
        >
          ЗАКРЫТЬ ОБЗОР КОМАНДЫ
        </button>
      </div>
    </div>
  );
}
