import React from 'react';
import { Trophy } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';

export default function BracketTree({ onSelectMatch, onSelectTeam, bracketData }) {
  const handleTeamClick = (e, teamName) => {
    if (onSelectTeam && teamName && !teamName.startsWith('TBD') && !teamName.includes('Победитель') && !teamName.includes('Проигравший') && !teamName.includes('Финалист') && !teamName.includes('Бронза')) {
      e.stopPropagation();
      triggerHaptic('light');
      onSelectTeam(teamName);
    }
  };

  if (bracketData && (bracketData.semifinals || bracketData.round2)) {
    const hasQf = bracketData.round2 && bracketData.round2.length > 0;
    const cols = hasQf ? 'grid-cols-3' : 'grid-cols-2';
    const minWidth = hasQf ? 'min-w-[720px]' : 'min-w-[500px]';

    return (
      <div className="space-y-3 font-mono">
        <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1">
          <span className="uppercase tracking-wider">{bracketData.title || "СЕТКА ПЛЕЙ-ОФФ"}</span>
          <span className="text-zinc-400">← свайп сетки →</span>
        </div>

        <div className="w-full overflow-x-auto pb-4 pt-2 no-scrollbar bg-[#090f14] border border-[#1b2a38] rounded-xs shadow-inner">
          <div className={`${minWidth} p-5 space-y-6`}>
            <div className="text-center space-y-0.5 pb-2 border-b border-[#1b2a38]/60">
              <h2 className="text-xl font-black text-white tracking-widest font-sans">
                {bracketData.title || "ТУРНИРНАЯ СЕТКА CS2"}
              </h2>
              <div className="text-[11px] text-zinc-400 font-sans tracking-wide">
                Single Elimination · Плей-офф
              </div>
            </div>

            <div className={`grid ${cols} gap-6 text-[11px] text-zinc-400 font-mono tracking-widest uppercase border-b border-[#1b2a38] pb-2 text-center font-bold`}>
              {hasQf && <div>1/4 ФИНАЛА &gt;</div>}
              <div>ПОЛУФИНАЛ &gt;</div>
              <div>ГРАНД-ФИНАЛ &gt;</div>
            </div>

            <div className={`grid ${cols} gap-6 relative items-start`}>
              {hasQf && (
                <div className="space-y-6">
                  {bracketData.round2.map((m, idx) => (
                    <div 
                      key={m.matchId || idx}
                      onClick={() => onSelectMatch?.(m.matchId)}
                      className="space-y-1 p-1 bg-black/40 border border-white/5 rounded-xs hover:border-white/20 transition-all cursor-pointer"
                    >
                      <div 
                        onClick={(e) => handleTeamClick(e, m.team1.name)}
                        className={`px-3 py-2 border text-[11px] font-sans flex items-center justify-between rounded-xs transition-colors ${
                          m.team1.isWinner 
                            ? 'bg-[#162736] border-[#2a455e] text-white font-bold' 
                            : 'bg-[#101b26] border-[#1d3142] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {m.team1.seed && <span className="text-zinc-500 font-mono text-[10px]">{m.team1.seed}</span>}
                          <span className="truncate">{m.team1.name}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-zinc-300">
                          {m.team1.score !== null ? m.team1.score : '-'}
                        </span>
                      </div>

                      <div 
                        onClick={(e) => handleTeamClick(e, m.team2.name)}
                        className={`px-3 py-2 border text-[11px] font-sans flex items-center justify-between rounded-xs transition-colors ${
                          m.team2.isWinner 
                            ? 'bg-[#162736] border-[#2a455e] text-white font-bold' 
                            : 'bg-[#101b26] border-[#1d3142] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {m.team2.seed && <span className="text-zinc-500 font-mono text-[10px]">{m.team2.seed}</span>}
                          <span className="truncate">{m.team2.name}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-zinc-300">
                          {m.team2.score !== null ? m.team2.score : '-'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={`space-y-8 ${hasQf ? 'pt-8' : ''}`}>
                {bracketData.semifinals?.map((m, idx) => (
                  <div 
                    key={m.matchId || idx}
                    onClick={() => onSelectMatch?.(m.matchId)}
                    className="space-y-1 p-1 bg-black/40 border border-white/5 rounded-xs hover:border-white/20 transition-all cursor-pointer"
                  >
                    <div 
                      onClick={(e) => handleTeamClick(e, m.team1.name)}
                      className={`px-3 py-2 border text-[11px] font-sans flex items-center justify-between rounded-xs transition-colors ${
                        m.team1.isWinner 
                          ? 'bg-[#162736] border-[#2a455e] text-white font-bold' 
                          : 'bg-[#101b26] border-[#1d3142] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {m.team1.seed && <span className="text-zinc-500 font-mono text-[10px]">{m.team1.seed}</span>}
                        <span className="truncate">{m.team1.name}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-zinc-300">
                        {m.team1.score !== null ? m.team1.score : '-'}
                      </span>
                    </div>

                    <div 
                      onClick={(e) => handleTeamClick(e, m.team2.name)}
                      className={`px-3 py-2 border text-[11px] font-sans flex items-center justify-between rounded-xs transition-colors ${
                        m.team2.isWinner 
                          ? 'bg-[#162736] border-[#2a455e] text-white font-bold' 
                          : 'bg-[#101b26] border-[#1d3142] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {m.team2.seed && <span className="text-zinc-500 font-mono text-[10px]">{m.team2.seed}</span>}
                        <span className="truncate">{m.team2.name}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-zinc-300">
                        {m.team2.score !== null ? m.team2.score : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`space-y-12 ${hasQf ? 'pt-16' : 'pt-4'}`}>
                {bracketData.final && (
                  <div 
                    onClick={() => onSelectMatch?.(bracketData.final.matchId)}
                    className="space-y-1 p-1.5 bg-black/60 border border-amber-500/40 rounded-xs shadow-md cursor-pointer hover:border-amber-400 transition-all"
                  >
                    <div className="text-[9px] text-amber-400 font-mono font-bold uppercase tracking-wider px-1 pb-0.5">
                      ★ ГРАНД ФИНАЛ ★
                    </div>
                    <div 
                      onClick={(e) => handleTeamClick(e, bracketData.final.team1.name)}
                      className={`px-3.5 py-2.5 border text-xs font-sans flex items-center justify-between rounded-xs ${
                        bracketData.final.team1.isWinner
                          ? 'bg-[#1a3247] border-amber-400/60 text-white font-black'
                          : 'bg-[#162736] border-[#2a455e] text-zinc-300 hover:text-white'
                      }`}
                    >
                      <span className="font-bold truncate">{bracketData.final.team1.name}</span>
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {bracketData.final.team1.score !== null ? bracketData.final.team1.score : '-'}
                      </span>
                    </div>

                    <div 
                      onClick={(e) => handleTeamClick(e, bracketData.final.team2.name)}
                      className={`px-3.5 py-2.5 border text-xs font-sans flex items-center justify-between rounded-xs ${
                        bracketData.final.team2.isWinner
                          ? 'bg-[#1a3247] border-amber-400/60 text-white font-black'
                          : 'bg-[#162736] border-[#2a455e] text-zinc-300 hover:text-white'
                      }`}
                    >
                      <span className="font-bold truncate">{bracketData.final.team2.name}</span>
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {bracketData.final.team2.score !== null ? bracketData.final.team2.score : '-'}
                      </span>
                    </div>
                  </div>
                )}

                {bracketData.thirdPlace && (
                  <div className="space-y-1 p-1 bg-black/40 border border-white/5 rounded-xs">
                    <div className="text-[9px] text-zinc-400 font-mono font-bold uppercase tracking-wider px-1 pb-0.5">
                      Матч за 3-е место:
                    </div>
                    <div 
                      onClick={(e) => handleTeamClick(e, bracketData.thirdPlace.team1.name)}
                      className="px-3 py-2 bg-[#101b26] border border-[#1d3142] text-zinc-300 text-[11px] font-sans flex items-center justify-between rounded-xs cursor-pointer hover:border-white/30"
                    >
                      <span className="truncate">{bracketData.thirdPlace.team1.name}</span>
                      <span className="font-mono text-[10px] text-zinc-400">🥉</span>
                    </div>
                    <div 
                      onClick={(e) => handleTeamClick(e, bracketData.thirdPlace.team2.name)}
                      className="px-3 py-2 bg-[#101b26] border border-[#1d3142] text-zinc-300 text-[11px] font-sans flex items-center justify-between rounded-xs cursor-pointer hover:border-white/30"
                    >
                      <span className="truncate">{bracketData.thirdPlace.team2.name}</span>
                      <span className="font-mono text-[10px] text-zinc-500">4 место</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-mono">
      {/* Mobile Scroll Hint & Legend */}
      <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1">
        <span className="uppercase tracking-wider">СЕТКА ПЛЕЙ-ОФФ // SINGLE ELIMINATION</span>
        <span className="text-zinc-400">← свайп сетки →</span>
      </div>

      {/* Main Bracket Container with Horizontal Scroll */}
      <div className="w-full overflow-x-auto pb-4 pt-2 no-scrollbar bg-[#090f14] border border-[#1b2a38] rounded-xs shadow-inner">
        <div className="min-w-[880px] p-5 sm:p-7 space-y-6">
          {/* Header Title from Photo */}
          <div className="text-center space-y-0.5 pb-2 border-b border-[#1b2a38]/60">
            <h2 className="text-xl font-black text-white tracking-widest font-sans">
              CS 2
            </h2>
            <div className="text-[11px] text-zinc-400 font-sans tracking-wide">
              Single Elimination
            </div>
          </div>

          {/* 4 Column Headers */}
          <div className="grid grid-cols-4 gap-6 text-[11px] text-zinc-400 font-mono tracking-widest uppercase border-b border-[#1b2a38] pb-2 text-center font-bold">
            <div>ROUND 1 &gt;</div>
            <div>ROUND 2 &gt;</div>
            <div>SEMI-FINAL &gt;</div>
            <div>FINAL &gt;</div>
          </div>

          {/* Grid of Columns & Matches */}
          <div className="grid grid-cols-4 gap-6 relative items-start">
            
            {/* COLUMN 1: ROUND 1 */}
            <div className="space-y-4 pt-12">
              <div className="space-y-1 relative">
                {/* Horizontal branch line to Round 2 */}
                <div className="hidden sm:block absolute -right-6 top-1/2 w-6 h-[2px] bg-[#223d54]" />

                {/* Team 1 (adaptive - winner) */}
                <div 
                  onClick={(e) => handleTeamClick(e, "adaptive")}
                  className="px-3 py-2 bg-[#162736] border border-[#2a455e] hover:border-amber-400/60 text-white text-[11px] font-sans flex items-center justify-between rounded-xs shadow-sm cursor-pointer group"
                  title="Открыть команду adaptive"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-zinc-400 font-mono text-[10px]">#8</span>
                    <span className="font-bold truncate group-hover:text-amber-300 transition-colors">adaptive</span>
                  </div>
                  <span className="text-emerald-400 text-[10px] font-mono font-bold">✓</span>
                </div>

                {/* Team 2 (ckson) */}
                <div 
                  onClick={(e) => handleTeamClick(e, "ckson")}
                  className="px-3 py-2 bg-[#101b26] border border-[#1d3142] hover:border-white/30 text-zinc-400 text-[11px] font-sans flex items-center justify-between rounded-xs cursor-pointer group"
                  title="Открыть команду ckson"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-zinc-500 font-mono text-[10px]">#9</span>
                    <span className="truncate group-hover:text-zinc-200 transition-colors">ckson</span>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2: ROUND 2 (1/4 FINALS) */}
            <div className="space-y-8 relative">
              {/* Match 1: Aspect vs adaptive */}
              <div className="space-y-1 relative">
                <div 
                  onClick={(e) => handleTeamClick(e, "Aspect")}
                  className="px-3 py-2 bg-[#101b26] border border-[#1d3142] hover:border-white/30 text-zinc-400 text-[11px] font-sans flex items-center justify-between rounded-xs cursor-pointer group"
                  title="Открыть команду Aspect"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-zinc-500 font-mono text-[10px]">#1</span>
                    <span className="truncate group-hover:text-zinc-200 transition-colors">Aspect</span>
                  </div>
                </div>
                <div 
                  onClick={(e) => handleTeamClick(e, "adaptive")}
                  className="px-3 py-2 bg-[#162736] border border-[#2a455e] hover:border-amber-400/60 text-white text-[11px] font-sans flex items-center justify-between rounded-xs shadow-sm cursor-pointer group"
                  title="Открыть команду adaptive"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-zinc-400 font-mono text-[10px]">#8</span>
                    <span className="font-bold truncate group-hover:text-amber-300 transition-colors">adaptive</span>
                  </div>
                  <span className="text-emerald-400 text-[10px] font-mono font-bold">✓</span>
                </div>
              </div>

              {/* Match 2: LL TEAM vs 322DOBEG TEAM */}
              <div className="space-y-1 relative">
                <div 
                  onClick={(e) => handleTeamClick(e, "LL TEAM")}
                  className="px-3 py-2 bg-[#162736] border border-[#2a455e] hover:border-amber-400/60 text-white text-[11px] font-sans flex items-center justify-between rounded-xs shadow-sm cursor-pointer group"
                  title="Открыть команду LL TEAM"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-zinc-400 font-mono text-[10px]">#4</span>
                    <span className="font-bold truncate group-hover:text-amber-300 transition-colors">LL TEAM</span>
                  </div>
                  <span className="text-emerald-400 text-[10px] font-mono font-bold">✓</span>
                </div>
                <div 
                  onClick={(e) => handleTeamClick(e, "322DOBEG TEAM")}
                  className="px-3 py-2 bg-[#101b26] border border-[#1d3142] hover:border-white/30 text-zinc-400 text-[11px] font-sans flex items-center justify-between rounded-xs cursor-pointer group"
                  title="Открыть команду 322DOBEG TEAM"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-zinc-500 font-mono text-[10px]">#5</span>
                    <span className="truncate group-hover:text-zinc-200 transition-colors">322DOBEG TEAM</span>
                  </div>
                </div>
              </div>

              {/* Match 3: портфель adidas белый vs Team V0id */}
              <div className="space-y-1 relative">
                <div 
                  onClick={(e) => handleTeamClick(e, "портфель adidas белый")}
                  className="px-3 py-2 bg-[#101b26] border border-[#1d3142] hover:border-white/30 text-zinc-400 text-[11px] font-sans flex items-center justify-between rounded-xs cursor-pointer group"
                  title="Открыть команду портфель adidas белый"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-zinc-500 font-mono text-[10px]">#2</span>
                    <span className="truncate group-hover:text-zinc-200 transition-colors">портфель adidas белый</span>
                  </div>
                </div>
                <div 
                  onClick={(e) => handleTeamClick(e, "Team V0id")}
                  className="px-3 py-2 bg-[#162736] border border-[#2a455e] hover:border-amber-400/60 text-white text-[11px] font-sans flex items-center justify-between rounded-xs shadow-sm cursor-pointer group"
                  title="Открыть команду Team V0id"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-zinc-400 font-mono text-[10px]">#7</span>
                    <span className="font-bold truncate group-hover:text-amber-300 transition-colors">Team V0id</span>
                  </div>
                  <span className="text-emerald-400 text-[10px] font-mono font-bold">✓</span>
                </div>
              </div>

              {/* Match 4: DODO TEAM vs TRIQ */}
              <div 
                onClick={() => onSelectMatch?.('match_triq_vs_dodo')}
                className="space-y-1 relative cursor-pointer group transition-transform active:scale-[0.99]"
              >
                <div 
                  onClick={(e) => handleTeamClick(e, "DODO TEAM")}
                  className="px-3 py-2 bg-[#101b26] border border-[#1d3142] group-hover:border-white/30 text-zinc-400 text-[11px] font-sans flex items-center justify-between rounded-xs transition-colors hover:text-white"
                  title="Открыть команду DODO TEAM"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-zinc-500 font-mono text-[10px]">#3</span>
                    <span className="truncate">DODO TEAM</span>
                  </div>
                  <span className="text-zinc-500 text-[10px] font-mono">0</span>
                </div>
                <div 
                  onClick={(e) => handleTeamClick(e, "TRIQ")}
                  className="px-3 py-2 bg-[#162736] border border-[#2a455e] group-hover:border-amber-400/70 text-white text-[11px] font-sans flex items-center justify-between rounded-xs shadow-sm transition-colors hover:text-amber-200"
                  title="Открыть команду TRIQ"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-zinc-400 font-mono text-[10px]">#6</span>
                    <span className="font-bold text-amber-300 truncate">TRIQ</span>
                  </div>
                  <span className="text-emerald-400 text-[10px] font-mono font-bold">2 ✓</span>
                </div>
              </div>
            </div>

            {/* COLUMN 3: SEMI-FINAL */}
            <div className="space-y-24 pt-8 relative">
              {/* Semi 1: adaptive vs LL TEAM */}
              <div className="space-y-1 relative">
                <div 
                  onClick={(e) => handleTeamClick(e, "adaptive")}
                  className="px-3 py-2 bg-[#101b26] border border-[#1d3142] hover:border-white/30 text-zinc-400 text-[11px] font-sans flex items-center justify-between rounded-xs cursor-pointer group"
                  title="Открыть команду adaptive"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-zinc-500 font-mono text-[10px]">#8</span>
                    <span className="truncate group-hover:text-zinc-200 transition-colors">adaptive</span>
                  </div>
                </div>
                <div 
                  onClick={(e) => handleTeamClick(e, "LL TEAM")}
                  className="px-3 py-2 bg-[#162736] border border-[#2a455e] hover:border-amber-400/60 text-white text-[11px] font-sans flex items-center justify-between rounded-xs shadow-sm cursor-pointer group"
                  title="Открыть команду LL TEAM"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-zinc-400 font-mono text-[10px]">#4</span>
                    <span className="font-bold truncate group-hover:text-amber-300 transition-colors">LL TEAM</span>
                  </div>
                  <span className="text-emerald-400 text-[10px] font-mono font-bold">✓ В ФИНАЛ</span>
                </div>
              </div>

              {/* Semi 2: Team V0id vs TRIQ */}
              <div 
                onClick={() => onSelectMatch?.('match_triq_vs_teamb')}
                className="space-y-1 relative cursor-pointer group transition-transform active:scale-[0.99]"
              >
                <div 
                  onClick={(e) => handleTeamClick(e, "Team V0id")}
                  className="px-3 py-2 bg-[#101b26] border border-[#1d3142] group-hover:border-white/30 text-zinc-400 text-[11px] font-sans flex items-center justify-between rounded-xs transition-colors hover:text-white"
                  title="Открыть команду Team V0id"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-zinc-500 font-mono text-[10px]">#7</span>
                    <span className="truncate">Team V0id</span>
                  </div>
                  <span className="text-zinc-500 text-[10px] font-mono">0</span>
                </div>
                <div 
                  onClick={(e) => handleTeamClick(e, "TRIQ")}
                  className="px-3 py-2 bg-[#162736] border border-[#2a455e] group-hover:border-amber-400/70 text-white text-[11px] font-sans flex items-center justify-between rounded-xs shadow-sm transition-colors hover:text-amber-200"
                  title="Открыть команду TRIQ"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-zinc-400 font-mono text-[10px]">#6</span>
                    <span className="font-bold text-amber-300 truncate">TRIQ</span>
                  </div>
                  <span className="text-emerald-400 text-[10px] font-mono font-bold">2 ✓ В ФИНАЛ</span>
                </div>
              </div>
            </div>

            {/* COLUMN 4: FINAL & 3RD PLACE */}
            <div className="space-y-16 pt-20">
              {/* Grand Final Box */}
              <div 
                onClick={() => onSelectMatch?.('match_final_ll_vs_triq')}
                className="space-y-1 relative cursor-pointer group transition-transform active:scale-[0.99]"
              >
                {/* Team 1 Winner (LL TEAM) */}
                <div 
                  onClick={(e) => handleTeamClick(e, "LL TEAM")}
                  className="px-3.5 py-2.5 bg-[#1a3247] border border-amber-400/60 group-hover:border-amber-400 text-white text-xs font-sans flex items-center justify-between rounded-xs shadow-lg transition-colors hover:bg-[#203c54]"
                  title="Открыть команду LL TEAM"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-amber-400 font-mono text-[10px]">#4</span>
                    <span className="font-black text-amber-300 truncate">LL TEAM</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-amber-400 font-mono font-bold text-xs">2</span>
                    <Trophy className="w-3.5 h-3.5 text-amber-400 ml-0.5" />
                  </div>
                </div>

                {/* Team 2 Runner-up (TRIQ) */}
                <div 
                  onClick={(e) => handleTeamClick(e, "TRIQ")}
                  className="px-3.5 py-2.5 bg-[#162736] border border-[#2a455e] group-hover:border-white/30 text-zinc-300 text-xs font-sans flex items-center justify-between rounded-xs shadow-sm transition-colors hover:bg-[#1c3245]"
                  title="Открыть команду TRIQ"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-zinc-400 font-mono text-[10px]">#6</span>
                    <span className="font-bold truncate">TRIQ</span>
                  </div>
                  <span className="text-zinc-300 font-mono font-bold text-xs">1 🥈</span>
                </div>
              </div>

              {/* 3rd Place Match (exact position from photo) */}
              <div className="space-y-2 pt-6 border-t border-[#1b2a38]/60">
                <div className="text-[10px] text-zinc-400 font-mono tracking-wider font-bold">
                  Матч за 3-е место &gt;
                </div>
                <div className="space-y-1">
                  <div 
                    onClick={(e) => handleTeamClick(e, "adaptive")}
                    className="px-3 py-2 bg-[#162736] border border-[#2a455e] hover:border-amber-400/60 text-white text-[11px] font-sans flex items-center justify-between rounded-xs cursor-pointer group"
                    title="Открыть команду adaptive"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-400 font-mono text-[10px]">#8</span>
                      <span className="font-bold truncate group-hover:text-amber-300 transition-colors">adaptive</span>
                    </div>
                    <span className="text-emerald-400 text-[10px] font-mono font-bold">🥉</span>
                  </div>
                  <div 
                    onClick={(e) => handleTeamClick(e, "Team V0id")}
                    className="px-3 py-2 bg-[#101b26] border border-[#1d3142] hover:border-white/30 text-zinc-400 text-[11px] font-sans flex items-center justify-between rounded-xs cursor-pointer group"
                    title="Открыть команду Team V0id"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-500 font-mono text-[10px]">#7</span>
                      <span className="truncate group-hover:text-zinc-200 transition-colors">Team V0id</span>
                    </div>
                    <span className="text-zinc-500 text-[10px] font-mono">4 место</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
