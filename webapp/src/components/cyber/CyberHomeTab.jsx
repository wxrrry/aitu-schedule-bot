import React from 'react';
import { 
  Trophy, 
  Flame, 
  Target, 
  Crosshair, 
  ArrowRight, 
  ChevronRight, 
  Zap, 
  ShieldCheck, 
  Settings, 
  Plus, 
  ExternalLink 
} from 'lucide-react';
import { CS2_PLAYERS, TOURNAMENT_MATCHES, CS2_LEAGUE_STATS } from '../../data/cs2TournamentData';
import { triggerHaptic } from '../../utils/telegram';

export default function CyberHomeTab({ 
  onNavigate, 
  onOpenPlayer, 
  onOpenTeam, 
  onOpenMatch, 
  onOpenRegister, 
  onOpenOrganizer, 
  canOrganize 
}) {
  const topPlayers = [
    CS2_PLAYERS["t0ma999"] || { nick: "t0ma999", team: "LL TEAM", totalKills: 120, kdRatio: "1.54" },
    CS2_PLAYERS["wxrry"] || { nick: "wxrry", team: "TRIQ", totalKills: 118, kdRatio: "1.46" },
    CS2_PLAYERS["RAREMO"] || { nick: "RAREMO", team: "TRIQ", totalKills: 114, kdRatio: "1.52" },
  ];

  const grandFinalMatch = TOURNAMENT_MATCHES.find(m => m.id === "match_final_ll_vs_triq") || TOURNAMENT_MATCHES[TOURNAMENT_MATCHES.length - 1];
  const recentMatches = TOURNAMENT_MATCHES.slice().reverse().slice(0, 4);

  return (
    <div className="space-y-4 animate-fadeIn text-center">
      {/* Top Bar with Live Indicator & Organizer */}
      <div className="flex items-center justify-between gap-2 p-3 bg-[#111111] border border-[#212121] rounded-xl text-center">
        <div className="flex-1 flex items-center justify-center gap-2 text-center">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0ea5e9] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0ea5e9]" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider text-white text-center">
            AITU CYBER LEAGUE
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-[#1b1b1b] border border-[#2e2e2e] text-[#0ea5e9] font-bold uppercase">
            S1 PLAYOFFS
          </span>
        </div>

        {canOrganize ? (
          <button
            onClick={() => {
              onOpenOrganizer();
              triggerHaptic('medium');
            }}
            className="px-2.5 py-1 bg-[#181818] hover:bg-[#202020] border border-[#0ea5e9]/40 text-[#0ea5e9] hover:text-white text-[10px] uppercase font-bold flex items-center gap-1.5 rounded-md transition-all cursor-pointer shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>ОРГАНИЗАТОР</span>
          </button>
        ) : null}
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden p-5 sm:p-6 bg-gradient-to-br from-[#141414] via-[#111111] to-[#0e0e0e] border border-[#212121] rounded-2xl shadow-xl space-y-3.5 text-center flex flex-col items-center justify-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0ea5e9]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-center gap-2 mx-auto">
          <span className="px-2.5 py-0.5 rounded-full bg-[#0ea5e9]/15 border border-[#0ea5e9]/40 text-[#0ea5e9] text-[9px] font-extrabold uppercase tracking-widest">
            КИБЕРСПОРТ КОЛЛЕДЖА
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">CS2 // FASTCUP</span>
        </div>

        <div className="space-y-1.5 text-center max-w-xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-tight text-center">
            ТУРНИРЫ, ЛИДЕРБОРДЫ И МАТЧИ
          </h1>
          <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed text-center mx-auto">
            Официальные сетки плей-офф, подробная статистика матчей по картам, рейтинги игроков и аналитика команд колледжа.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 pt-1 flex-wrap mx-auto">
          <button
            onClick={() => onNavigate('tournaments')}
            className="px-3.5 py-2 bg-[#0ea5e9] hover:bg-[#38bdf8] text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 shadow-[0_4px_20px_rgba(14,165,233,0.35)] transition-all cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>СМОТРЕТЬ ТУРНИРЫ</span>
          </button>

          <button
            onClick={() => onNavigate('teams')}
            className="px-3.5 py-2 bg-[#1b1b1b] hover:bg-[#252525] border border-[#2e2e2e] text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#0ea5e9]" />
            <span>РЕЙТИНГ КОМАНД</span>
          </button>

          <button
            onClick={() => onNavigate('players')}
            className="px-3.5 py-2 bg-[#1b1b1b] hover:bg-[#252525] border border-[#2e2e2e] text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#0ea5e9]" />
            <span>ТОП ИГРОКОВ</span>
          </button>

          <button
            onClick={() => onOpenRegister()}
            className="px-3 py-2 bg-transparent hover:bg-white/[0.05] border border-white/10 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ПОДАТЬ ЗАЯВКУ</span>
          </button>
        </div>
      </div>

      {/* Quick League Stats (4 Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="p-3 bg-[#111111] border border-[#212121] rounded-xl space-y-1 text-center flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-1 text-zinc-500 text-[10px]">
            <Flame className="w-3.5 h-3.5 text-[#0ea5e9]" />
            <span className="uppercase font-bold tracking-wider">СУММАРНЫЙ УРОН</span>
          </div>
          <div className="text-lg font-black text-white font-mono text-center">
            {CS2_LEAGUE_STATS.totalDamage.toLocaleString('ru-RU')} <span className="text-[10px] text-zinc-500 font-normal">HP</span>
          </div>
          <div className="text-[9px] text-zinc-500 font-mono text-center">11 сыгранных карт</div>
        </div>

        <div className="p-3 bg-[#111111] border border-[#212121] rounded-xl space-y-1 text-center flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-1 text-zinc-500 text-[10px]">
            <Target className="w-3.5 h-3.5 text-[#0ea5e9]" />
            <span className="uppercase font-bold tracking-wider">ВСЕГО КИЛЛОВ</span>
          </div>
          <div className="text-lg font-black text-white font-mono text-center">
            {CS2_LEAGUE_STATS.totalKills}
          </div>
          <div className="text-[9px] text-zinc-500 font-mono text-center">184 раунда в сезоне</div>
        </div>

        <div className="p-3 bg-[#111111] border border-[#212121] rounded-xl space-y-1 text-center flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-1 text-zinc-500 text-[10px]">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="uppercase font-bold tracking-wider">МАТЧЕЙ В БАЗЕ</span>
          </div>
          <div className="text-lg font-black text-white font-mono text-center">
            {CS2_LEAGUE_STATS.totalMatches}
          </div>
          <div className="text-[9px] text-emerald-400 font-mono font-bold text-center">FastCup протоколы</div>
        </div>

        <div className="p-3 bg-[#111111] border border-[#212121] rounded-xl space-y-1 text-center flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-1 text-zinc-500 text-[10px]">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="uppercase font-bold tracking-wider">РЕКОРД ФРАГОВ</span>
          </div>
          <div className="text-lg font-black text-amber-300 font-mono text-center">
            63 <span className="text-[10px] text-zinc-500 font-normal">K</span>
          </div>
          <div className="text-[9px] text-zinc-400 font-mono truncate text-center">t0ma999 · Финал</div>
        </div>
      </div>

      {/* Featured Match Card (Матч дня / Гранд-Финал) */}
      {grandFinalMatch && (
        <div className="p-4 bg-[#111111] border border-[#212121] rounded-2xl space-y-3 shadow-lg relative overflow-hidden group text-center">
          <div className="flex items-center justify-center gap-2 border-b border-[#212121] pb-2 text-[10px] text-center flex-wrap">
            <span className="w-2 h-2 rounded-full bg-[#0ea5e9]" />
            <span className="text-white font-black uppercase tracking-wider text-center">
              МАТЧ ДНЯ // ГРАНД-ФИНАЛ
            </span>
            <span className="text-zinc-500 font-mono">
              · ДЛИТЕЛЬНОСТЬ: {grandFinalMatch.duration}
            </span>
          </div>

          {/* Teams vs Score */}
          <div className="flex items-center justify-between gap-3 p-3 bg-[#141414] border border-[#212121] rounded-xl text-center">
            {/* Team 1 */}
            <div 
              onClick={() => onOpenTeam(grandFinalMatch.team1.name)}
              className="flex-1 text-center cursor-pointer group/t1"
            >
              <div className="text-[9px] text-zinc-500 font-mono uppercase text-center">СИД {grandFinalMatch.team1.seed}</div>
              <div className="text-base sm:text-lg font-black text-white group-hover/t1:text-[#0ea5e9] transition-colors truncate text-center">
                {grandFinalMatch.team1.name}
              </div>
              <div className="text-[9px] text-zinc-400 font-mono text-center">Вице-чемпион 🥈</div>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center justify-center px-4 py-1.5 bg-[#181818] border border-[#2e2e2e] rounded-lg text-center shrink-0">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-widest text-center">
                {grandFinalMatch.team1.score} : {grandFinalMatch.team2.score}
              </div>
              <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider text-center">
                ЗАВЕРШЁН 🏆
              </span>
            </div>

            {/* Team 2 */}
            <div 
              onClick={() => onOpenTeam(grandFinalMatch.team2.name)}
              className="flex-1 text-center cursor-pointer group/t2"
            >
              <div className="text-[9px] text-zinc-500 font-mono uppercase text-center">СИД {grandFinalMatch.team2.seed}</div>
              <div className="text-base sm:text-lg font-black text-white group-hover/t2:text-amber-300 transition-colors truncate text-center">
                {grandFinalMatch.team2.name} 🏆
              </div>
              <div className="text-[9px] text-amber-400 font-mono font-bold text-center">Чемпион лиги</div>
            </div>
          </div>

          {/* Maps Pills */}
          {grandFinalMatch.maps && grandFinalMatch.maps.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 flex-wrap mx-auto text-center">
              <span className="text-[9px] text-zinc-500 uppercase font-bold mr-1">КАРТЫ:</span>
              {grandFinalMatch.maps.map((m, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-[#181818] border border-[#212121] text-[10px] font-mono text-zinc-300 text-center"
                >
                  <strong className="text-white">{m.name}</strong> ({m.score1}:{m.score2})
                </span>
              ))}
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-center gap-3 pt-2 border-t border-[#212121] text-[11px] flex-wrap text-center">
            <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-center">
              <span className="text-[9px] uppercase">MVP МАТЧА:</span>
              <span 
                onClick={() => onOpenPlayer("t0ma999")}
                className="text-amber-300 font-bold cursor-pointer hover:underline"
              >
                t0ma999 (63K · 1.54 KD)
              </span>
            </div>

            <button
              onClick={() => onOpenMatch(grandFinalMatch.id)}
              className="px-3 py-1.5 bg-[#0ea5e9]/15 hover:bg-[#0ea5e9] border border-[#0ea5e9]/50 text-[#0ea5e9] hover:text-white font-bold uppercase text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>РАЗОБРАТЬ МАТЧ</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Top 3 MVP Players Preview */}
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center gap-2 px-1 text-[11px] text-center">
          <span className="font-black text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-[#0ea5e9]" />
            <span>ТОП ИГРОКИ ПО КИЛЛАМ</span>
          </span>
          <button
            onClick={() => onNavigate('rankings')}
            className="text-[10px] text-[#0ea5e9] hover:text-[#38bdf8] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>ВСЕ ИГРОКИ</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {topPlayers.map((player, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;

            return (
              <div
                key={player.nick}
                onClick={() => onOpenPlayer(player.nick)}
                className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 group select-none text-center flex flex-col items-center justify-center ${
                  isFirst
                    ? 'bg-[#141414] border-amber-500/40 hover:border-amber-400 shadow-[0_4px_20px_rgba(252,194,81,0.1)]'
                    : isSecond
                    ? 'bg-[#141414] border-white/20 hover:border-white/40'
                    : 'bg-[#141414] border-amber-800/40 hover:border-amber-600'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 w-full text-center">
                  <span className={`text-[10px] font-mono font-black ${
                    isFirst ? 'text-amber-400' : isSecond ? 'text-zinc-300' : 'text-amber-600'
                  }`}>
                    {isFirst ? '🥇 #1' : isSecond ? '🥈 #2' : '🥉 #3'}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono">
                    {player.kdRatio ? `KD ${player.kdRatio}` : ''}
                  </span>
                </div>

                <div className="font-black text-white text-xs sm:text-sm font-mono truncate group-hover:text-[#0ea5e9] transition-colors text-center w-full">
                  {player.nick}
                </div>

                <div className="text-[9px] text-zinc-400 font-mono truncate text-center w-full">
                  {player.team}
                </div>

                <div className="text-base sm:text-lg font-black text-white font-mono pt-0.5 border-t border-[#212121] text-center w-full">
                  {player.totalKills} <span className="text-[9px] text-zinc-500 font-normal">K</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Matches List */}
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center gap-2 px-1 text-[11px] text-center">
          <span className="font-black text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0ea5e9]" />
            <span>ПОСЛЕДНИЕ ТУРНИРНЫЕ БОИ</span>
          </span>
          <button
            onClick={() => onNavigate('tournaments')}
            className="text-[10px] text-zinc-400 hover:text-white uppercase font-bold flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>СЕТКА И МАТЧИ</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2">
          {recentMatches.map((m) => (
            <div
              key={m.id}
              onClick={() => onOpenMatch(m.id)}
              className="p-3 bg-[#111111] hover:bg-[#151515] border border-[#212121] hover:border-[#2e2e2e] rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-3 group text-center"
            >
              <div className="min-w-0 space-y-0.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-sm bg-[#1b1b1b] border border-[#2e2e2e] text-[#0ea5e9] uppercase">
                    {m.stage}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono">{m.format}</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate text-center sm:text-left">
                  {m.team1.name} <span className="text-zinc-500">vs</span> {m.team2.name}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 shrink-0 text-center">
                <div className="text-center sm:text-right font-mono">
                  <div className="text-sm sm:text-base font-black text-white text-center">
                    {m.team1.score} : {m.team2.score}
                  </div>
                  <div className="text-[8px] text-emerald-400 font-bold uppercase text-center">
                    ПОБЕДА: {m.team1.score > m.team2.score ? m.team1.name : m.team2.name}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
