import React from 'react';
import { Crosshair, Trophy, Search, Flame, ArrowRight, ChevronRight } from 'lucide-react';
import { HLTV_TEAM_RANKINGS, CS2_PLAYERS } from '../../data/cs2TournamentData';
import { triggerHaptic } from '../../utils/telegram';

export default function CyberRankingsTab({
  sortedPlayersList,
  playerSearch,
  setPlayerSearch,
  playerSort,
  setPlayerSort,
  rankingSubTab,
  setRankingSubTab,
  onOpenPlayer,
  onOpenTeam
}) {
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Subtabs Switcher */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#111111] border border-[#212121] rounded-xl font-bold text-xs select-none">
        <button
          onClick={() => {
            setRankingSubTab('players');
            triggerHaptic('selection');
          }}
          className={`py-2 rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            rankingSubTab === 'players'
              ? 'bg-[#1c1c22] text-white border border-white/10 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5 text-[#e81c5a]" />
          <span>ИГРОКИ ({sortedPlayersList.length})</span>
        </button>

        <button
          onClick={() => {
            setRankingSubTab('teams');
            triggerHaptic('selection');
          }}
          className={`py-2 rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            rankingSubTab === 'teams'
              ? 'bg-[#1c1c22] text-white border border-white/10 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>КОМАНДЫ ({HLTV_TEAM_RANKINGS.length})</span>
        </button>
      </div>

      {/* 1. PLAYERS TAB */}
      {rankingSubTab === 'players' && (
        <div className="space-y-3.5">
          {/* Header & Stats bar */}
          <div className="flex items-center justify-between px-1 flex-wrap gap-2">
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#e81c5a]" />
                <span>РЕЙТИНГ ИГРОКОВ ПО КИЛЛАМ</span>
              </h3>
              <span className="text-[9px] text-zinc-500 font-mono uppercase">
                УЧАСТНИКОВ В БАЗЕ: {sortedPlayersList.length} · ВЕРИФИЦИРОВАНО FASTCUP
              </span>
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-1 p-0.5 bg-[#141414] border border-[#212121] rounded-lg text-[9px] font-mono">
              <button
                onClick={() => { setPlayerSort('kills'); triggerHaptic('light'); }}
                className={`px-2 py-1 font-bold uppercase rounded-md transition-colors ${
                  playerSort === 'kills' ? 'bg-[#e81c5a] text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                КИЛЛЫ
              </button>
              <button
                onClick={() => { setPlayerSort('kd'); triggerHaptic('light'); }}
                className={`px-2 py-1 font-bold uppercase rounded-md transition-colors ${
                  playerSort === 'kd' ? 'bg-[#e81c5a] text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                K/D
              </button>
              <button
                onClick={() => { setPlayerSort('hs'); triggerHaptic('light'); }}
                className={`px-2 py-1 font-bold uppercase rounded-md transition-colors ${
                  playerSort === 'hs' ? 'bg-[#e81c5a] text-white' : 'text-zinc-400 hover:text-white'
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
              className="w-full bg-[#111111] border border-[#212121] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#e81c5a] font-sans transition-colors"
            />
            {playerSearch && (
              <button
                onClick={() => setPlayerSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Podium for TOP 3 Fraggers */}
          {!playerSearch && playerSort === 'kills' && sortedPlayersList.length >= 3 && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {/* #2 Rank - Silver */}
              <div
                onClick={() => { onOpenPlayer(sortedPlayersList[1]); triggerHaptic('selection'); }}
                className="p-3 bg-[#111111] border border-white/20 hover:border-white/40 rounded-xl transition-all text-center space-y-1.5 cursor-pointer relative group select-none"
              >
                <div className="text-[10px] font-mono font-bold text-zinc-300">
                  🥈 #2 СЕРЕБРО
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
                onClick={() => { onOpenPlayer(sortedPlayersList[0]); triggerHaptic('selection'); }}
                className="p-3 bg-[#141414] border-2 border-amber-400/60 hover:border-amber-400 rounded-xl transition-all text-center space-y-1.5 cursor-pointer relative group shadow-lg shadow-amber-500/10 select-none"
              >
                <div className="text-[10px] font-mono font-bold text-amber-300 flex items-center justify-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>🥇 #1 MVP</span>
                </div>
                <div className="font-bold text-white text-xs truncate group-hover:text-amber-300 transition-colors font-mono">
                  {sortedPlayersList[0].nick}
                </div>
                <div className="text-[9px] text-amber-400/80 font-mono font-bold">
                  {sortedPlayersList[0].team}
                </div>
                <div className="text-lg font-black text-amber-300 font-mono">
                  {sortedPlayersList[0].totalKills} <span className="text-[9px] text-zinc-400 font-normal">K</span>
                </div>
                <div className="text-[8px] text-emerald-400 font-mono font-bold">
                  KD {sortedPlayersList[0].kdRatio} · HS {sortedPlayersList[0].hsPercentage}
                </div>
              </div>

              {/* #3 Rank - Bronze */}
              <div
                onClick={() => { onOpenPlayer(sortedPlayersList[2]); triggerHaptic('selection'); }}
                className="p-3 bg-[#111111] border border-amber-800/50 hover:border-amber-600 rounded-xl transition-all text-center space-y-1.5 cursor-pointer relative group select-none"
              >
                <div className="text-[10px] font-mono font-bold text-amber-600">
                  🥉 #3 БРОНЗА
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
              const kdNum = parseFloat(p.kdRatio || 0);

              return (
                <div
                  key={p.nick}
                  onClick={() => { onOpenPlayer(p); triggerHaptic('selection'); }}
                  className={`p-3 bg-[#111111] hover:bg-[#151515] border rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2.5 group select-none ${
                    rank === 1
                      ? 'border-amber-400/40'
                      : rank === 2
                      ? 'border-zinc-400/30'
                      : rank === 3
                      ? 'border-amber-800/30'
                      : 'border-[#212121] hover:border-[#2e2e2e]'
                  }`}
                >
                  {/* Left: Rank & Nick */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                      rank === 1 
                        ? 'bg-amber-400 text-black font-black' 
                        : rank === 2 
                        ? 'bg-zinc-300 text-black font-black' 
                        : rank === 3 
                        ? 'bg-amber-800 text-white font-black' 
                        : 'bg-[#181818] text-zinc-400 border border-[#2e2e2e] text-[11px]'
                    }`}>
                      {rank <= 3 ? (rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉') : `#${rank}`}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-xs font-mono group-hover:text-[#e81c5a] transition-colors truncate">
                          {p.nick}
                        </span>
                        {p.isCaptain && (
                          <span className="text-[8px] bg-amber-950/80 border border-amber-500/40 text-amber-400 px-1 font-bold font-mono rounded-xs">
                            (C)
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTeam(p.team);
                          }}
                          className="text-[9px] text-zinc-400 hover:text-amber-300 font-mono underline decoration-dotted transition-colors"
                        >
                          {p.team}
                        </button>
                      </div>

                      {p.badges && p.badges.length > 0 && (
                        <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                          {p.badges.slice(0, 2).map((b, bIdx) => (
                            <span key={bIdx} className="text-[8px] text-zinc-400 font-mono uppercase bg-[#181818] px-1.5 py-0.2 rounded-xs border border-white/5">
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

      {/* 2. TEAMS TAB (HLTV WORLD RANKING) */}
      {rankingSubTab === 'teams' && (
        <div className="space-y-3">
          {/* Header card */}
          <div className="p-3.5 bg-[#111111] border border-[#212121] rounded-2xl flex items-center justify-between text-[10px]">
            <div>
              <span className="font-black text-white uppercase block">
                HLTV WORLD RANKING // AITU CS2
              </span>
              <span className="text-zinc-500 text-[9px] font-mono">
                Обновлено: 11 октября 2026 (по итогам AITU PRO LEAGUE SEASON 1)
              </span>
            </div>
            <span className="px-2 py-0.5 bg-[#181818] border border-[#2e2e2e] text-amber-300 font-bold uppercase text-[9px] rounded-md">
              {HLTV_TEAM_RANKINGS.length} КОМАНД
            </span>
          </div>

          {/* Ranking List */}
          <div className="space-y-2">
            {HLTV_TEAM_RANKINGS.map(team => (
              <div
                key={team.rank}
                className="p-3.5 bg-[#111111] border border-[#212121] hover:border-[#2e2e2e] rounded-xl transition-all space-y-2.5"
              >
                {/* Top row */}
                <div 
                  onClick={() => onOpenTeam(team)}
                  className="flex items-center justify-between gap-2 cursor-pointer group/team"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 flex items-center justify-center font-black text-sm rounded-lg border shrink-0 ${
                      team.rank === 1
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                        : team.rank === 2
                        ? 'bg-zinc-800 text-white border-white/40'
                        : team.rank === 3
                        ? 'bg-amber-900/30 text-amber-500 border-amber-700/40'
                        : 'bg-[#181818] text-zinc-400 border-[#2e2e2e]'
                    }`}>
                      #{team.rank}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-sm font-sans tracking-tight truncate group-hover/team:text-[#e81c5a] transition-colors">
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

                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-white font-mono">
                      {team.points} <span className="text-[10px] text-zinc-500 font-normal">pts</span>
                    </div>
                    <span className={`px-1.5 py-0.2 border text-[8px] font-bold uppercase tracking-wider rounded-xs ${team.badgeColor}`}>
                      {team.rank === 1 ? 'ЧЕМПИОН' : team.rank === 2 ? 'ФИНАЛ' : team.rank === 3 ? 'БРОНЗА' : `ТОП ${team.rank}`}
                    </span>
                  </div>
                </div>

                {/* Progress Points Bar */}
                <div className="w-full bg-[#181818] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      team.rank === 1 
                        ? 'bg-amber-400' 
                        : team.rank === 2 
                        ? 'bg-zinc-300' 
                        : team.rank === 3 
                        ? 'bg-amber-600' 
                        : 'bg-[#e81c5a]'
                    }`}
                    style={{ width: `${(team.points / 1000) * 100}%` }}
                  />
                </div>

                {/* Lineup / Roster tags */}
                <div className="pt-1 border-t border-[#212121] flex items-center justify-between gap-1.5 flex-wrap text-[10px]">
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
                              onOpenPlayer(player.nick);
                            }}
                            className={`px-1.5 py-0.5 rounded-md border text-[9px] transition-colors ${
                              hasFullProfile
                                ? 'bg-[#181818] border-[#2e2e2e] text-zinc-200 hover:border-[#e81c5a] hover:text-white cursor-pointer'
                                : 'bg-[#141414] border-[#212121] text-zinc-400 hover:text-zinc-200 cursor-pointer'
                            }`}
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
                    onClick={() => onOpenTeam(team)}
                    className="px-2 py-0.5 bg-[#181818] hover:bg-[#252525] border border-[#2e2e2e] text-zinc-300 hover:text-white font-mono text-[9px] uppercase font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer"
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
    </div>
  );
}
