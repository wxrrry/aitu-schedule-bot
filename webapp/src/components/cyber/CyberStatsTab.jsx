import React from 'react';
import { Activity, Trophy, Zap, Shield, Swords, Flame, Users, Award } from 'lucide-react';
import { CS2_LEAGUE_STATS } from '../../data/cs2TournamentData';
import { triggerHaptic } from '../../utils/telegram';

export default function CyberStatsTab({ onOpenPlayer, onOpenTeam }) {
  const stats = CS2_LEAGUE_STATS;

  return (
    <div className="space-y-4 animate-fadeIn text-center">
      {/* Header */}
      <div className="p-4 bg-[#111111] border border-[#212121] rounded-2xl space-y-2 text-center flex flex-col items-center justify-center">
        <div className="flex items-center justify-center gap-2 text-[10px] mx-auto flex-wrap">
          <span className="text-[#0ea5e9] font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            <span>АНАЛИТИКА КИБЕРСПОРТИВНОЙ ЛИГИ</span>
          </span>
          <span className="text-zinc-500 font-mono">· СЕЗОН 1</span>
        </div>
        <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight text-center">
          СВОДНАЯ СТАТИСТИКА И РЕКОРДЫ
        </h2>
        <p className="text-[11px] text-zinc-400 leading-relaxed text-center max-w-xl mx-auto">
          Официальные рекорды чемпионата, активность по учебным группам колледжа и глобальный баланс сторон.
        </p>
      </div>

      {/* Global Highlights Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="p-3 bg-[#111111] border border-[#212121] rounded-xl space-y-1 text-center flex flex-col items-center justify-center">
          <span className="text-[9px] text-zinc-500 uppercase block font-bold text-center">СЫГРАНО РАУНДОВ</span>
          <div className="text-xl font-black text-white font-mono text-center">{stats.totalRounds}</div>
          <span className="text-[9px] text-zinc-500 font-mono text-center">11 официальных карт</span>
        </div>
        <div className="p-3 bg-[#111111] border border-[#212121] rounded-xl space-y-1 text-center flex flex-col items-center justify-center">
          <span className="text-[9px] text-zinc-500 uppercase block font-bold text-center">СУММАРНЫЙ УРОН</span>
          <div className="text-xl font-black text-[#0ea5e9] font-mono text-center">
            {stats.totalDamage.toLocaleString('ru-RU')}
          </div>
          <span className="text-[9px] text-zinc-500 font-mono text-center">HP нанесено</span>
        </div>
        <div className="p-3 bg-[#111111] border border-[#212121] rounded-xl space-y-1 text-center flex flex-col items-center justify-center">
          <span className="text-[9px] text-zinc-500 uppercase block font-bold text-center">ВСЕГО АССИСТОВ</span>
          <div className="text-xl font-black text-amber-300 font-mono text-center">{stats.totalAssists}</div>
          <span className="text-[9px] text-zinc-500 font-mono text-center">помощь союзникам</span>
        </div>
        <div className="p-3 bg-[#111111] border border-[#212121] rounded-xl space-y-1 text-center flex flex-col items-center justify-center">
          <span className="text-[9px] text-zinc-500 uppercase block font-bold text-center">СРЕДНЕЕ ВРЕМЯ</span>
          <div className="text-xl font-black text-cyan-400 font-mono text-center">{stats.avgMatchDuration}</div>
          <span className="text-[9px] text-zinc-500 font-mono text-center">длительность карты</span>
        </div>
      </div>

      {/* Sides Winrate Bar */}
      <div className="p-4 bg-[#111111] border border-[#212121] rounded-2xl space-y-2 text-center">
        <div className="flex items-center justify-between text-xs font-bold uppercase font-mono">
          <span className="text-cyan-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>CT ЗАЩИТА: {stats.ctWinrate}%</span>
          </span>
          <span className="text-amber-400 flex items-center gap-1.5">
            <span>T АТАКА: {stats.tWinrate}%</span>
            <Swords className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden flex border border-[#2e2e2e]">
          <div 
            className="bg-cyan-500 h-full transition-all duration-300"
            style={{ width: `${stats.ctWinrate}%` }}
          />
          <div 
            className="bg-amber-500 h-full transition-all duration-300"
            style={{ width: `${stats.tWinrate}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono">
          <span>Спецназ выиграл 95 раундов</span>
          <span>Террористы выиграли 89 раундов</span>
        </div>
      </div>

      {/* League Records Grid */}
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center gap-2 px-1 text-[11px] text-center">
          <span className="font-black text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>РЕКОРДЫ ЛИГИ КОЛЛЕДЖА</span>
          </span>
          <span className="text-[9px] text-zinc-500 font-mono">· AITU PRO LEAGUE S1</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {stats.records.map((rec, idx) => (
            <div
              key={idx}
              onClick={() => {
                onOpenPlayer?.(rec.holder);
                triggerHaptic('selection');
              }}
              className="p-3 bg-[#111111] hover:bg-[#151515] border border-[#212121] hover:border-amber-500/40 rounded-xl space-y-1.5 cursor-pointer transition-all group select-none text-center flex flex-col items-center justify-center"
            >
              <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block text-center">
                {rec.title}
              </span>
              <div className="text-lg font-black text-white group-hover:text-amber-300 transition-colors font-mono text-center">
                {rec.value}
              </div>
              <div className="flex items-center justify-center gap-2 text-[10px] pt-1 border-t border-[#212121] font-mono text-center w-full">
                <span className="text-amber-400 font-bold">{rec.holder}</span>
                <span className="text-zinc-500">· {rec.team} · {rec.match}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* College Groups Breakdown */}
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center gap-2 px-1 text-[11px] text-center">
          <span className="font-black text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#0ea5e9]" />
            <span>АКТИВНОСТЬ УЧЕБНЫХ ГРУПП</span>
          </span>
          <span className="text-[9px] text-zinc-500 font-mono">· {stats.collegeGroups.length} ГРУПП</span>
        </div>

        <div className="space-y-1.5">
          {stats.collegeGroups.map((g, idx) => {
            const isTop1 = idx === 0;

            return (
              <div
                key={g.group}
                className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-3 text-center ${
                  isTop1
                    ? 'bg-[#141414] border-amber-500/40 shadow-sm'
                    : 'bg-[#111111] border-[#212121]'
                }`}
              >
                <div className="space-y-0.5 min-w-0 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs font-black text-white font-mono">
                      {g.group}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-[#1b1b1b] border border-[#2e2e2e] text-[#0ea5e9] font-bold">
                      {g.playersCount} ИГРОКОВ
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono truncate text-center sm:text-left">
                    {g.teams} · <span className="text-amber-300 font-bold">{g.trophies}</span>
                  </div>
                </div>

                <div className="text-center sm:text-right shrink-0 font-mono">
                  <div className="text-xs sm:text-sm font-black text-white text-center sm:text-right">
                    {g.totalKills} <span className="text-[9px] text-zinc-500 font-normal">K</span>
                  </div>
                  <div className="text-[9px] text-emerald-400 font-bold text-center sm:text-right">
                    WINRATE {g.winRate}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
