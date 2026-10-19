import React, { useState } from 'react';
import { Map, Shield, Swords, Target, Crosshair, Award, Flame, Info } from 'lucide-react';
import { CS2_MAP_POOL } from '../../data/cs2TournamentData';
import { triggerHaptic } from '../../utils/telegram';

export default function CyberMapsTab({ onOpenPlayer }) {
  const [selectedMapId, setSelectedMapId] = useState(CS2_MAP_POOL[0]?.id || 'mirage');

  const activeMap = CS2_MAP_POOL.find(m => m.id === selectedMapId) || CS2_MAP_POOL[0];

  const handleSelectMap = (id) => {
    setSelectedMapId(id);
    triggerHaptic('selection');
  };

  return (
    <div className="space-y-4 animate-fadeIn text-center">
      {/* Header card */}
      <div className="p-4 bg-[#111111] border border-[#212121] rounded-2xl space-y-2 text-center flex flex-col items-center justify-center">
        <div className="flex items-center justify-center gap-2 text-[10px] mx-auto flex-wrap">
          <span className="text-[#0ea5e9] font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Map className="w-3.5 h-3.5" />
            <span>СОРЕВНОВАТЕЛЬНЫЙ МАППУЛ CS2</span>
          </span>
          <span className="text-zinc-500 font-mono">· СЕЗОН 1 · FASTCUP</span>
        </div>
        <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight text-center">
          МЕТА И РАЗВЕДКА КАРТ
        </h2>
        <p className="text-[11px] text-zinc-400 leading-relaxed text-center max-w-xl mx-auto">
          Баланс сторон CT и T, процент выбора карт в турнире, ключевые тактические зоны и лучшие игроки на каждой локации.
        </p>
      </div>

      {/* Map Selector Chips */}
      <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none flex-wrap">
        {CS2_MAP_POOL.map((m) => {
          const isActive = selectedMapId === m.id;
          return (
            <button
              key={m.id}
              onClick={() => handleSelectMap(m.id)}
              className={`px-3 py-1.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#0ea5e9] text-white shadow-[0_2px_12px_rgba(14,165,233,0.4)] border border-[#38bdf8]'
                  : 'bg-[#141414] hover:bg-[#1c1c1c] text-zinc-400 hover:text-white border border-[#212121]'
              }`}
            >
              {m.name}
            </button>
          );
        })}
      </div>

      {/* Active Map Detail View */}
      {activeMap && (
        <div className="p-4 bg-[#111111] border border-[#212121] rounded-2xl space-y-4 shadow-lg text-center">
          {/* Map Header */}
          <div className="flex flex-col items-center justify-center border-b border-[#212121] pb-3 gap-2 text-center">
            <div className="flex items-center justify-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 rounded-sm bg-[#181818] border border-[#2e2e2e] text-[#0ea5e9] text-[9px] font-black uppercase tracking-widest">
                {activeMap.status}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {activeMap.pickRate} ПУЛА
              </span>
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight text-center">
              {activeMap.name}
            </h3>
            <div className="text-center font-mono text-[10px]">
              <span className="text-zinc-500 uppercase mr-1">ФОРМАТ:</span>
              <span className="font-bold text-[#0ea5e9]">5v5 Competitive</span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-300 leading-relaxed text-center max-w-xl mx-auto">
            {activeMap.description}
          </p>

          {/* CT vs T Winrate Balance */}
          <div className="p-3.5 bg-[#141414] border border-[#212121] rounded-xl space-y-2 text-center">
            <div className="flex items-center justify-between text-xs font-bold uppercase font-mono">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <Shield className="w-3.5 h-3.5" />
                <span>CT ЗАЩИТА: {activeMap.ctWinrate}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400">
                <span>T АТАКА: {activeMap.tWinrate}%</span>
                <Swords className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Split Progress Bar */}
            <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden flex border border-[#2e2e2e]">
              <div 
                className="bg-cyan-500 h-full transition-all duration-300"
                style={{ width: `${activeMap.ctWinrate}%` }}
              />
              <div 
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${activeMap.tWinrate}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono">
              <span>Спецназ (Counter-Terrorists)</span>
              <span>Террористы (Terrorists)</span>
            </div>
          </div>

          {/* 4 Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-3 bg-[#141414] border border-[#212121] rounded-xl space-y-0.5">
              <span className="text-[9px] text-zinc-500 uppercase block">ЧАСТОТА ВЫБОРА</span>
              <span className="text-base font-black text-white font-mono">{activeMap.pickRate}</span>
            </div>
            <div className="p-3 bg-[#141414] border border-[#212121] rounded-xl space-y-0.5">
              <span className="text-[9px] text-zinc-500 uppercase block">МАТЧЕЙ В СЕЗОНЕ</span>
              <span className="text-base font-black text-white font-mono">{activeMap.matchesCount}</span>
            </div>
            <div className="p-3 bg-[#141414] border border-[#212121] rounded-xl space-y-0.5">
              <span className="text-[9px] text-zinc-500 uppercase block">СРЕДНЕЕ РАУНДОВ</span>
              <span className="text-base font-black text-white font-mono">{activeMap.avgRounds}</span>
            </div>
            <div 
              onClick={() => onOpenPlayer?.(activeMap.topPlayer)}
              className="p-3 bg-[#141414] border border-[#212121] hover:border-[#0ea5e9]/50 rounded-xl space-y-0.5 cursor-pointer transition-colors group"
            >
              <span className="text-[9px] text-zinc-500 uppercase block">MVP КАРТЫ</span>
              <span className="text-xs font-black text-[#0ea5e9] group-hover:text-[#38bdf8] font-mono truncate block">
                {activeMap.topPlayer}
              </span>
            </div>
          </div>

          {/* Key Zones & Callouts */}
          {activeMap.callouts && activeMap.callouts.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#212121]">
              <span className="text-[10px] text-white font-black uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#0ea5e9]" />
                <span>ТАКТИЧЕСКИЙ РАЗБОР ЗОН КАРТЫ</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {activeMap.callouts.map((c, i) => (
                  <div key={i} className="p-3 bg-[#141414] border border-[#212121] rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-white uppercase">{c.name}</span>
                      <span className="text-cyan-400 font-mono text-[10px]">CT {c.ctWin}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                      {c.tip}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
