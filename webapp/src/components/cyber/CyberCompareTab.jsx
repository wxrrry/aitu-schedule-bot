import React, { useState } from 'react';
import { Swords, Users, Crosshair, Trophy, Shield, ArrowRight, Check } from 'lucide-react';
import { CS2_PLAYERS, HLTV_TEAM_RANKINGS } from '../../data/cs2TournamentData';
import { triggerHaptic } from '../../utils/telegram';

export default function CyberCompareTab({ onOpenPlayer, onOpenTeam }) {
  const [compareMode, setCompareMode] = useState('players'); // 'players' | 'teams'

  const allPlayers = Object.values(CS2_PLAYERS);
  const [player1Nick, setPlayer1Nick] = useState('t0ma999');
  const [player2Nick, setPlayer2Nick] = useState('wxrry');

  const p1 = CS2_PLAYERS[player1Nick] || allPlayers[0];
  const p2 = CS2_PLAYERS[player2Nick] || allPlayers[1];

  const allTeams = HLTV_TEAM_RANKINGS;
  const [team1Name, setTeam1Name] = useState('LL TEAM');
  const [team2Name, setTeam2Name] = useState('TRIQ');

  const t1 = allTeams.find(t => t.name === team1Name) || allTeams[0];
  const t2 = allTeams.find(t => t.name === team2Name) || allTeams[1];

  const renderPlayerMetric = (label, val1, val2, suffix = '', higherIsBetter = true) => {
    const num1 = parseFloat(val1) || 0;
    const num2 = parseFloat(val2) || 0;
    const total = num1 + num2;
    const pct1 = total > 0 ? (num1 / total) * 100 : 50;
    const pct2 = total > 0 ? (num2 / total) * 100 : 50;

    const p1Wins = higherIsBetter ? num1 > num2 : num1 < num2;
    const p2Wins = higherIsBetter ? num2 > num1 : num2 < num1;

    return (
      <div className="space-y-1 p-2.5 bg-[#141414] border border-[#212121] rounded-xl font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className={`font-black ${p1Wins ? 'text-emerald-400' : 'text-zinc-300'}`}>
            {val1}{suffix} {p1Wins && '✓'}
          </span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans font-bold">
            {label}
          </span>
          <span className={`font-black ${p2Wins ? 'text-emerald-400' : 'text-zinc-300'}`}>
            {p2Wins && '✓ '} {val2}{suffix}
          </span>
        </div>

        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden flex gap-0.5">
          <div 
            className={`h-full transition-all duration-300 ${p1Wins ? 'bg-emerald-500' : 'bg-zinc-700'}`}
            style={{ width: `${pct1}%` }}
          />
          <div 
            className={`h-full transition-all duration-300 ${p2Wins ? 'bg-[#e81c5a]' : 'bg-zinc-700'}`}
            style={{ width: `${pct2}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="p-4 bg-[#111111] border border-[#212121] rounded-2xl space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-[#e81c5a] font-black uppercase tracking-wider flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5" />
            <span>ДУЭЛИ И СРАВНЕНИЕ HEAD-TO-HEAD</span>
          </span>
          <span className="text-zinc-500 font-mono">СТАТИСТИКА</span>
        </div>
        <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
          СРАВНЕНИЕ УЧАСТНИКОВ
        </h2>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Выберите двух любых игроков или две команды колледжа для подробного сопоставления показателей и боевой эффективности.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#111111] border border-[#212121] rounded-xl font-bold text-xs">
        <button
          onClick={() => {
            setCompareMode('players');
            triggerHaptic('selection');
          }}
          className={`py-2 rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            compareMode === 'players'
              ? 'bg-[#1e1e24] text-white border border-white/10 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5 text-[#e81c5a]" />
          <span>СРАВНИТЬ ИГРОКОВ</span>
        </button>

        <button
          onClick={() => {
            setCompareMode('teams');
            triggerHaptic('selection');
          }}
          className={`py-2 rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            compareMode === 'teams'
              ? 'bg-[#1e1e24] text-white border border-white/10 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>СРАВНИТЬ КОМАНДЫ</span>
        </button>
      </div>

      {/* 1. COMPARE PLAYERS */}
      {compareMode === 'players' && (
        <div className="space-y-4">
          {/* Selectors */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block">
                ИГРОК 1
              </label>
              <select
                value={player1Nick}
                onChange={(e) => {
                  setPlayer1Nick(e.target.value);
                  triggerHaptic('light');
                }}
                className="w-full bg-[#141414] border border-[#212121] text-white text-xs font-bold rounded-xl p-2.5 focus:border-[#e81c5a] focus:outline-none"
              >
                {allPlayers.map((p) => (
                  <option key={p.nick} value={p.nick}>
                    {p.nick} ({p.team})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block">
                ИГРОК 2
              </label>
              <select
                value={player2Nick}
                onChange={(e) => {
                  setPlayer2Nick(e.target.value);
                  triggerHaptic('light');
                }}
                className="w-full bg-[#141414] border border-[#212121] text-white text-xs font-bold rounded-xl p-2.5 focus:border-[#e81c5a] focus:outline-none"
              >
                {allPlayers.map((p) => (
                  <option key={p.nick} value={p.nick}>
                    {p.nick} ({p.team})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cards Showcase */}
          <div className="grid grid-cols-2 gap-2">
            {/* Player 1 Card */}
            <div 
              onClick={() => onOpenPlayer?.(p1.nick)}
              className="p-3.5 bg-[#111111] border border-emerald-500/30 rounded-xl space-y-1.5 cursor-pointer hover:border-emerald-500/60 transition-all text-center select-none"
            >
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold uppercase">
                {p1.team}
              </span>
              <div className="text-sm sm:text-base font-black text-white font-mono truncate">
                {p1.nick} {p1.isCaptain ? '(C)' : ''}
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                ELO {p1.elo || 1000} · {p1.favWeapon || 'AK-47'}
              </div>
            </div>

            {/* Player 2 Card */}
            <div 
              onClick={() => onOpenPlayer?.(p2.nick)}
              className="p-3.5 bg-[#111111] border border-[#e81c5a]/40 rounded-xl space-y-1.5 cursor-pointer hover:border-[#e81c5a]/70 transition-all text-center select-none"
            >
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#e81c5a]/10 text-[#e81c5a] font-bold uppercase">
                {p2.team}
              </span>
              <div className="text-sm sm:text-base font-black text-white font-mono truncate">
                {p2.nick} {p2.isCaptain ? '(C)' : ''}
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                ELO {p2.elo || 1000} · {p2.favWeapon || 'AK-47'}
              </div>
            </div>
          </div>

          {/* Comparison Metrics */}
          <div className="space-y-1.5">
            {renderPlayerMetric('КИЛЛЫ (ВСЕГО)', p1.totalKills, p2.totalKills)}
            {renderPlayerMetric('СМЕРТИ (МЕНЬШЕ ЛУЧШЕ)', p1.totalDeaths, p2.totalDeaths, '', false)}
            {renderPlayerMetric('K/D RATIO', p1.kdRatio, p2.kdRatio)}
            {renderPlayerMetric('HEADSHOT %', parseInt(p1.hsPercentage || 0), parseInt(p2.hsPercentage || 0), '%')}
            {renderPlayerMetric('WINRATE %', parseInt(p1.winRate || 0), parseInt(p2.winRate || 0), '%')}
            {renderPlayerMetric('СЫГРАНО МАТЧЕЙ', p1.matchesPlayed, p2.matchesPlayed)}
          </div>
        </div>
      )}

      {/* 2. COMPARE TEAMS */}
      {compareMode === 'teams' && (
        <div className="space-y-4">
          {/* Selectors */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block">
                КОМАНДА 1
              </label>
              <select
                value={team1Name}
                onChange={(e) => {
                  setTeam1Name(e.target.value);
                  triggerHaptic('light');
                }}
                className="w-full bg-[#141414] border border-[#212121] text-white text-xs font-bold rounded-xl p-2.5 focus:border-[#e81c5a] focus:outline-none"
              >
                {allTeams.map((t) => (
                  <option key={t.name} value={t.name}>
                    #{t.rank} {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block">
                КОМАНДА 2
              </label>
              <select
                value={team2Name}
                onChange={(e) => {
                  setTeam2Name(e.target.value);
                  triggerHaptic('light');
                }}
                className="w-full bg-[#141414] border border-[#212121] text-white text-xs font-bold rounded-xl p-2.5 focus:border-[#e81c5a] focus:outline-none"
              >
                {allTeams.map((t) => (
                  <option key={t.name} value={t.name}>
                    #{t.rank} {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Teams Showcase */}
          <div className="grid grid-cols-2 gap-2">
            <div 
              onClick={() => onOpenTeam?.(t1.name)}
              className="p-3.5 bg-[#111111] border border-amber-500/40 rounded-xl space-y-1.5 cursor-pointer text-center select-none"
            >
              <span className="text-[9px] font-black text-amber-400 font-mono">
                РАНГ #{t1.rank}
              </span>
              <div className="text-sm sm:text-base font-black text-white truncate">
                {t1.name} {t1.trophy || ''}
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                {t1.points} PTS · {t1.status}
              </div>
            </div>

            <div 
              onClick={() => onOpenTeam?.(t2.name)}
              className="p-3.5 bg-[#111111] border border-[#e81c5a]/40 rounded-xl space-y-1.5 cursor-pointer text-center select-none"
            >
              <span className="text-[9px] font-black text-[#e81c5a] font-mono">
                РАНГ #{t2.rank}
              </span>
              <div className="text-sm sm:text-base font-black text-white truncate">
                {t2.name} {t2.trophy || ''}
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                {t2.points} PTS · {t2.status}
              </div>
            </div>
          </div>

          {/* Team Metrics */}
          <div className="space-y-1.5">
            {renderPlayerMetric('ОЧКИ HLTV (POINTS)', t1.points, t2.points)}
            {renderPlayerMetric('МЕСТО В РЕЙТИНГЕ', t1.rank, t2.rank, '', false)}
          </div>
        </div>
      )}
    </div>
  );
}
