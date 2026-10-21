import React, { useState, useRef } from 'react';
import { 
  Trophy, 
  Camera, 
  X, 
  Award, 
  ChevronRight, 
  Swords, 
  Sparkles, 
  Shield, 
  Maximize2, 
  Minimize2, 
  Columns3, 
  Layers, 
  Target, 
  Zap, 
  ArrowRight,
  ChevronLeft
} from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';

export default function BracketTree({ onSelectMatch, onSelectTeam, bracketData }) {
  const [activeScreenshot, setActiveScreenshot] = useState(null);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'stages'
  const [activeStageFilter, setActiveStageFilter] = useState('all'); // 'all' | 'final' | 'semi' | 'qf' | 'r1'
  const [isFit, setIsFit] = useState(false);
  const scrollRef = useRef(null);

  const handleTeamClick = (e, teamName) => {
    if (
      onSelectTeam && 
      teamName && 
      !teamName.startsWith('TBD') && 
      !teamName.includes('Победитель') && 
      !teamName.includes('Проигравший') && 
      !teamName.includes('Финалист') && 
      !teamName.includes('Бронза')
    ) {
      e.stopPropagation();
      triggerHaptic('light');
      onSelectTeam(teamName);
    }
  };

  const scrollToStage = (stageName) => {
    if (!scrollRef.current) return;
    const offsets = {
      r1: 0,
      qf: 235,
      semi: 470,
      final: 710
    };
    scrollRef.current.scrollTo({
      left: offsets[stageName] !== undefined ? offsets[stageName] : 0,
      behavior: 'smooth'
    });
    triggerHaptic('selection');
  };

  // 1. КАСТОМНАЯ СЕТКА (ГЕНЕРАЦИЯ ОРГАНИЗАТОРОМ: 4 / 8 / 16 КОМАНД)
  if (bracketData && bracketData.isCustom && (bracketData.semifinals || bracketData.round2)) {
    const hasQf = bracketData.round2 && bracketData.round2.length > 0;
    const cols = hasQf ? 'grid-cols-3' : 'grid-cols-2';
    const minWidth = hasQf ? 'min-w-[760px]' : 'min-w-[540px]';

    return (
      <div className="space-y-3 font-sans">
        {/* Navigation & Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 bg-[#121216] border border-[#23232c] rounded-xl text-xs font-mono">
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-black/60 border border-white/10 rounded-lg">
            <button
              onClick={() => { setViewMode('tree'); triggerHaptic('selection'); }}
              className={`px-3 py-1.5 rounded-md uppercase font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all ${
                viewMode === 'tree' 
                  ? 'bg-[#1e1e28] text-white border border-[#0ea5e9]/40 shadow-sm' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5 text-[#0ea5e9]" />
              <span>ДЕРЕВО СЕТКИ</span>
            </button>
            <button
              onClick={() => { setViewMode('stages'); triggerHaptic('selection'); }}
              className={`px-3 py-1.5 rounded-md uppercase font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all ${
                viewMode === 'stages' 
                  ? 'bg-[#1e1e28] text-white border border-[#0ea5e9]/40 shadow-sm' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#0ea5e9]" />
              <span>ПО СТАДИЯМ</span>
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-wrap">
            <button
              onClick={() => {
                setIsFit(!isFit);
                triggerHaptic('medium');
              }}
              className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg border flex items-center gap-1 transition-all ${
                isFit 
                  ? 'bg-[#0ea5e9]/20 border-[#0ea5e9] text-[#0ea5e9]' 
                  : 'bg-[#181820] hover:bg-[#22222d] border-white/10 text-zinc-300'
              }`}
            >
              {isFit ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              <span>{isFit ? '100% МАСШТАБ' : 'ВМЕСТИТЬ СЕТКУ'}</span>
            </button>
          </div>
        </div>

        {/* Custom Bracket Content */}
        <div 
          ref={scrollRef}
          className={`w-full ${isFit ? 'overflow-hidden flex justify-center py-2' : 'overflow-x-auto pb-4 pt-1 no-scrollbar'} bg-[#0e0e10] border border-[#212121] rounded-2xl shadow-xl relative`}
        >
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#0ea5e9]/5 rounded-full blur-3xl pointer-events-none" />

          <div 
            style={isFit ? { transform: 'scale(0.55)', transformOrigin: 'top center', width: minWidth.replace('min-w-[', '').replace(']', ''), marginBottom: '-180px' } : {}}
            className={`${minWidth} p-5 space-y-6 relative transition-transform duration-300`}
          >
            {/* Header Title */}
            <div className="text-center space-y-1 pb-3 border-b border-[#212121]">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 text-[#0ea5e9] text-[9px] font-black uppercase tracking-widest">
                СОРЕВНОВАТЕЛЬНЫЙ ПЛЕЙ-ОФФ
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                {bracketData.title || "ОЛИМПИЙСКАЯ СЕТКА CS2"}
              </h2>
              <div className="text-[10px] text-zinc-500 font-mono">
                Single Elimination · Официальные результаты
              </div>
            </div>

            {/* Column Round Headers */}
            <div className={`grid ${cols} gap-6 text-[11px] uppercase tracking-wider text-center font-black`}>
              {hasQf && (
                <div className="p-2 rounded-xl bg-[#141417] border border-[#212121] text-zinc-300">
                  1/4 ФИНАЛА (BO3)
                </div>
              )}
              <div className="p-2 rounded-xl bg-[#141417] border border-[#212121] text-zinc-300">
                1/2 ФИНАЛА (BO3)
              </div>
              <div className="p-2 rounded-xl bg-[#1a1712] border border-amber-500/40 text-amber-300 flex items-center justify-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>ГРАНД-ФИНАЛ (BO3)</span>
              </div>
            </div>

            {/* Match Grids */}
            <div className={`grid ${cols} gap-6 relative items-start`}>
              {/* Quarterfinals */}
              {hasQf && (
                <div className="space-y-6">
                  {bracketData.round2.map((m, idx) => (
                    <div 
                      key={m.matchId || idx}
                      onClick={() => onSelectMatch?.(m.matchId)}
                      className="p-2.5 bg-[#141417] hover:bg-[#18181d] border border-[#212121] hover:border-[#0ea5e9]/50 rounded-xl transition-all cursor-pointer shadow-md group space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pb-1 border-b border-[#212121]">
                        <span>МАТЧ QF #{idx + 1}</span>
                        <span className="text-[#0ea5e9] group-hover:underline">ПРОТОКОЛ →</span>
                      </div>

                      <div 
                        onClick={(e) => handleTeamClick(e, m.team1.name)}
                        className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                          m.team1.isWinner 
                            ? 'bg-[#182330] border-[#0ea5e9]/50 text-white font-bold' 
                            : 'bg-[#101012] border-[#1e1e22] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {m.team1.seed && <span className="text-zinc-500 font-mono text-[10px]">#{m.team1.seed}</span>}
                          <span className="truncate">{m.team1.name}</span>
                        </div>
                        <span className="font-mono text-xs font-bold">
                          {m.team1.score !== null ? m.team1.score : '-'}
                        </span>
                      </div>

                      <div 
                        onClick={(e) => handleTeamClick(e, m.team2.name)}
                        className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                          m.team2.isWinner 
                            ? 'bg-[#182330] border-[#0ea5e9]/50 text-white font-bold' 
                            : 'bg-[#101012] border-[#1e1e22] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {m.team2.seed && <span className="text-zinc-500 font-mono text-[10px]">#{m.team2.seed}</span>}
                          <span className="truncate">{m.team2.name}</span>
                        </div>
                        <span className="font-mono text-xs font-bold">
                          {m.team2.score !== null ? m.team2.score : '-'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Semifinals */}
              <div className="space-y-12 pt-4">
                {bracketData.semifinals?.map((m, idx) => (
                  <div 
                    key={m.matchId || idx}
                    onClick={() => onSelectMatch?.(m.matchId)}
                    className="p-3 bg-[#141417] hover:bg-[#18181d] border border-[#212121] hover:border-[#0ea5e9]/50 rounded-xl transition-all cursor-pointer shadow-md group space-y-2"
                  >
                    <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pb-1 border-b border-[#212121]">
                      <span>ПОЛУФИНАЛ #{idx + 1}</span>
                      <span className="text-[#0ea5e9] group-hover:underline">ПРОТОКОЛ →</span>
                    </div>

                    <div 
                      onClick={(e) => handleTeamClick(e, m.team1.name)}
                      className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                        m.team1.isWinner 
                          ? 'bg-[#182330] border-[#0ea5e9]/60 text-white font-bold' 
                          : 'bg-[#101012] border-[#1e1e22] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="font-bold truncate">{m.team1.name}</span>
                      <span className="font-mono text-xs font-bold">
                        {m.team1.score !== null ? m.team1.score : '-'}
                      </span>
                    </div>

                    <div 
                      onClick={(e) => handleTeamClick(e, m.team2.name)}
                      className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                        m.team2.isWinner 
                          ? 'bg-[#182330] border-[#0ea5e9]/60 text-white font-bold' 
                          : 'bg-[#101012] border-[#1e1e22] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="font-bold truncate">{m.team2.name}</span>
                      <span className="font-mono text-xs font-bold">
                        {m.team2.score !== null ? m.team2.score : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Finals */}
              <div className="space-y-6 pt-10">
                {bracketData.final && (
                  <div 
                    onClick={() => onSelectMatch?.(bracketData.final.matchId || 'final')}
                    className="p-3.5 bg-gradient-to-b from-[#1c1810] to-[#121216] border-2 border-amber-400/70 hover:border-amber-400 rounded-2xl shadow-xl shadow-amber-500/10 cursor-pointer group transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-amber-400 font-mono font-bold uppercase tracking-wider border-b border-amber-500/20 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span>ГРАНД-ФИНАЛ</span>
                      </span>
                      <span className="px-2 py-0.2 bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[9px] font-black rounded-sm">
                        BO3
                      </span>
                    </div>

                    <div 
                      onClick={(e) => handleTeamClick(e, bracketData.final.team1.name)}
                      className={`px-3.5 py-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                        bracketData.final.team1.isWinner
                          ? 'bg-amber-950/40 border-amber-400/70 text-white font-black'
                          : 'bg-[#141416] border-[#242428] text-zinc-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {bracketData.final.team1.isWinner && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        <span className="font-bold truncate">{bracketData.final.team1.name}</span>
                      </div>
                      <span className="font-mono text-sm font-black text-amber-300">
                        {bracketData.final.team1.score !== null ? bracketData.final.team1.score : '-'}
                      </span>
                    </div>

                    <div 
                      onClick={(e) => handleTeamClick(e, bracketData.final.team2.name)}
                      className={`px-3.5 py-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                        bracketData.final.team2.isWinner
                          ? 'bg-amber-950/40 border-amber-400/70 text-white font-black'
                          : 'bg-[#141416] border-[#242428] text-zinc-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {bracketData.final.team2.isWinner && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        <span className="font-bold truncate">{bracketData.final.team2.name}</span>
                      </div>
                      <span className="font-mono text-sm font-black text-amber-300">
                        {bracketData.final.team2.score !== null ? bracketData.final.team2.score : '-'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 3rd place match if present */}
                {bracketData.thirdPlace && (
                  <div className="p-2.5 bg-[#141417] border border-amber-800/40 rounded-xl space-y-1.5">
                    <div className="text-[9px] text-amber-600 font-mono font-bold uppercase tracking-wider pb-1 border-b border-[#212121]">
                      МАТЧ ЗА 3-Е МЕСТО (БРОНЗА):
                    </div>
                    <div 
                      onClick={(e) => handleTeamClick(e, bracketData.thirdPlace.team1.name)}
                      className="px-3 py-1.5 bg-[#101012] border border-[#1e1e22] text-zinc-200 text-xs flex items-center justify-between rounded-lg cursor-pointer hover:border-white/20"
                    >
                      <span className="truncate">{bracketData.thirdPlace.team1.name}</span>
                      <span className="font-mono text-[10px] text-amber-500 font-bold">🥉</span>
                    </div>
                    <div 
                      onClick={(e) => handleTeamClick(e, bracketData.thirdPlace.team2.name)}
                      className="px-3 py-1.5 bg-[#101012] border border-[#1e1e22] text-zinc-400 text-xs flex items-center justify-between rounded-lg cursor-pointer hover:border-white/20"
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

  // 2. ГЛАВНАЯ ОФИЦИАЛЬНАЯ СЕТКА (AITU PRO LEAGUE SEASON 1 / FASTCUP)
  return (
    <div className="space-y-3 font-sans">
      {/* View Mode & Fit Controls Top Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 bg-[#111115] border border-[#23232c] rounded-xl text-xs font-mono shadow-md">
        {/* Switch between Tree and Stages */}
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-black/60 border border-white/10 rounded-lg shrink-0">
          <button
            onClick={() => { setViewMode('tree'); triggerHaptic('selection'); }}
            className={`px-3 py-1.5 rounded-md uppercase font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'tree' 
                ? 'bg-[#1e1e28] text-white border border-[#0ea5e9]/40 shadow-sm' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Columns3 className="w-3.5 h-3.5 text-[#0ea5e9]" />
            <span>ДЕРЕВО СЕТКИ</span>
          </button>
          <button
            onClick={() => { setViewMode('stages'); triggerHaptic('selection'); }}
            className={`px-3 py-1.5 rounded-md uppercase font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'stages' 
                ? 'bg-[#1e1e28] text-white border border-[#0ea5e9]/40 shadow-sm' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#0ea5e9]" />
            <span>ПО СТАДИЯМ (МОБИЛЬНЫЙ)</span>
          </button>
        </div>

        {/* Action Controls for Active Mode */}
        {viewMode === 'tree' ? (
          <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-wrap">
            {/* Quick Stage Jump Buttons */}
            <div className="flex items-center gap-1 text-[9px]">
              <button
                onClick={() => scrollToStage('r1')}
                className="px-2 py-1 bg-[#181820] hover:bg-[#22222d] border border-white/10 text-zinc-300 rounded font-bold transition-colors cursor-pointer"
                title="Перейти к 1/8 финала"
              >
                1/8
              </button>
              <button
                onClick={() => scrollToStage('qf')}
                className="px-2 py-1 bg-[#181820] hover:bg-[#22222d] border border-white/10 text-zinc-300 rounded font-bold transition-colors cursor-pointer"
                title="Перейти к 1/4 финала"
              >
                1/4
              </button>
              <button
                onClick={() => scrollToStage('semi')}
                className="px-2 py-1 bg-[#181820] hover:bg-[#22222d] border border-white/10 text-zinc-300 rounded font-bold transition-colors cursor-pointer"
                title="Перейти к 1/2 финала"
              >
                1/2
              </button>
              <button
                onClick={() => scrollToStage('final')}
                className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded font-bold transition-colors cursor-pointer"
                title="Перейти к финалу"
              >
                ФИНАЛ 🏆
              </button>
            </div>

            {/* Fit to Screen Button */}
            <button
              onClick={() => {
                setIsFit(!isFit);
                triggerHaptic('medium');
              }}
              className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                isFit 
                  ? 'bg-[#0ea5e9]/20 border-[#0ea5e9] text-[#0ea5e9] shadow-[0_0_12px_rgba(14,165,233,0.3)]' 
                  : 'bg-[#181820] hover:bg-[#22222d] border-white/10 text-zinc-300'
              }`}
              title="Вместить всю олимпийскую сетку на экран"
            >
              {isFit ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              <span>{isFit ? '100% МАСШТАБ' : 'ВМЕСТИТЬ ВСЮ СЕТКУ'}</span>
            </button>
          </div>
        ) : (
          /* Stage Filter Pills for Mobile Stages View */
          <div className="flex items-center gap-1 text-[9px] overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => { setActiveStageFilter('all'); triggerHaptic('selection'); }}
              className={`px-2.5 py-1 rounded-md font-bold border transition-all cursor-pointer ${
                activeStageFilter === 'all'
                  ? 'bg-[#0ea5e9] text-white border-[#0ea5e9]'
                  : 'bg-[#181820] text-zinc-400 border-white/10 hover:text-white'
              }`}
            >
              ВСЕ СТАДИИ
            </button>
            <button
              onClick={() => { setActiveStageFilter('final'); triggerHaptic('selection'); }}
              className={`px-2.5 py-1 rounded-md font-bold border transition-all cursor-pointer ${
                activeStageFilter === 'final'
                  ? 'bg-amber-500 text-black border-amber-400 font-black'
                  : 'bg-[#181820] text-amber-400 border-amber-500/30 hover:text-white'
              }`}
            >
              🏆 ФИНАЛ
            </button>
            <button
              onClick={() => { setActiveStageFilter('semi'); triggerHaptic('selection'); }}
              className={`px-2.5 py-1 rounded-md font-bold border transition-all cursor-pointer ${
                activeStageFilter === 'semi'
                  ? 'bg-[#0ea5e9] text-white border-[#0ea5e9]'
                  : 'bg-[#181820] text-zinc-300 border-white/10 hover:text-white'
              }`}
            >
              ⚡ 1/2
            </button>
            <button
              onClick={() => { setActiveStageFilter('qf'); triggerHaptic('selection'); }}
              className={`px-2.5 py-1 rounded-md font-bold border transition-all cursor-pointer ${
                activeStageFilter === 'qf'
                  ? 'bg-[#0ea5e9] text-white border-[#0ea5e9]'
                  : 'bg-[#181820] text-zinc-300 border-white/10 hover:text-white'
              }`}
            >
              ⚔️ 1/4
            </button>
            <button
              onClick={() => { setActiveStageFilter('r1'); triggerHaptic('selection'); }}
              className={`px-2.5 py-1 rounded-md font-bold border transition-all cursor-pointer ${
                activeStageFilter === 'r1'
                  ? 'bg-[#0ea5e9] text-white border-[#0ea5e9]'
                  : 'bg-[#181820] text-zinc-300 border-white/10 hover:text-white'
              }`}
            >
              🎯 1/8
            </button>
          </div>
        )}
      </div>

      {/* =========================================================
          VIEW MODE 1: КОМПАКТНЫЙ МОБИЛЬНЫЙ ВИД ПО СТАДИЯМ (БЕЗ СКРОЛЛА)
          ========================================================= */}
      {viewMode === 'stages' && (
        <div className="space-y-4 animate-fadeIn">
          {/* 1. ГРАНД-ФИНАЛ И МАТЧ ЗА 3-Е МЕСТО */}
          {(activeStageFilter === 'all' || activeStageFilter === 'final') && (
            <div className="p-4 bg-[#111115] border border-amber-500/30 rounded-2xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <span className="text-xs font-black text-amber-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>ГРАНД-ФИНАЛ И МАТЧ ЗА 3-Е МЕСТО</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">11.10.2026</span>
              </div>

              {/* Grand Final Card */}
              <div 
                onClick={() => onSelectMatch?.('match_final_ll_vs_triq')}
                className="p-3.5 bg-gradient-to-b from-[#1c1810] via-[#151310] to-[#101014] border-2 border-amber-400/80 rounded-xl space-y-2.5 cursor-pointer hover:border-amber-300 transition-all shadow-md group"
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-amber-400 font-bold uppercase tracking-wider">ГРАНД-ФИНАЛ · BEST OF 3</span>
                  <span className="text-cyan-400 group-hover:underline font-bold">ПРОТОКОЛ МАТЧА →</span>
                </div>

                <div 
                  onClick={(e) => handleTeamClick(e, "LL TEAM")}
                  className="px-3.5 py-2.5 bg-amber-950/50 border border-amber-400/70 text-white text-xs flex items-center justify-between rounded-lg cursor-pointer hover:border-amber-300 transition-colors"
                  title="Открыть команду LL TEAM"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-mono text-xs font-bold">#4</span>
                    <span className="font-black text-amber-300 text-sm">LL TEAM</span>
                    <span className="text-[9px] bg-amber-400 text-black px-1.5 py-0.2 rounded font-black font-mono uppercase">
                      ЧЕМПИОН
                    </span>
                  </div>
                  <span className="text-amber-300 font-mono font-black text-sm px-2 py-0.5 bg-amber-400/20 border border-amber-400/50 rounded">
                    2 🏆
                  </span>
                </div>

                <div 
                  onClick={(e) => handleTeamClick(e, "TRIQ")}
                  className="px-3.5 py-2.5 bg-[#141418] border border-[#262630] text-zinc-300 text-xs flex items-center justify-between rounded-lg cursor-pointer hover:border-zinc-400 transition-colors"
                  title="Открыть команду TRIQ"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-mono text-xs">#6</span>
                    <span className="font-bold text-sm text-zinc-200">TRIQ</span>
                    <span className="text-[9px] bg-zinc-700 text-zinc-200 px-1.5 py-0.2 rounded font-mono uppercase">
                      ФИНАЛИСТ
                    </span>
                  </div>
                  <span className="text-zinc-300 font-mono font-bold text-sm px-2 py-0.5 bg-black/40 border border-white/10 rounded">
                    1 🥈
                  </span>
                </div>

                <div className="text-[10px] text-zinc-400 font-mono text-center pt-1 border-t border-white/5">
                  Карты: Vertigo (13:9 TRIQ) · Anubis (4:13 LL) · Cache (10:13 LL)
                </div>
              </div>

              {/* 3rd Place Match Card */}
              <div className="p-3 bg-[#141417] border border-amber-800/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pb-1 border-b border-[#212121]">
                  <span className="flex items-center gap-1.5 text-amber-500 font-bold uppercase">
                    <Award className="w-3.5 h-3.5" />
                    <span>МАТЧ ЗА 3-Е МЕСТО (БРОНЗА)</span>
                  </span>
                  <span className="text-zinc-500">BO1</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div 
                    onClick={(e) => handleTeamClick(e, "adaptive")}
                    className="px-3 py-2 bg-[#182330] border border-[#0ea5e9]/50 text-white text-xs flex items-center justify-between rounded-lg cursor-pointer group"
                    title="Открыть команду adaptive"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-zinc-400 font-mono text-[10px]">#8</span>
                      <span className="font-bold truncate group-hover:text-amber-300">adaptive</span>
                    </div>
                    <span className="text-amber-400 text-xs font-mono font-black px-1.5 py-0.5 bg-amber-950/40 border border-amber-600/50 rounded">
                      13 🥉 (3 место)
                    </span>
                  </div>

                  <div 
                    onClick={(e) => handleTeamClick(e, "Team V0id")}
                    className="px-3 py-2 bg-[#101012] border border-[#1e1e22] text-zinc-400 text-xs flex items-center justify-between rounded-lg cursor-pointer group"
                    title="Открыть команду Team V0id"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-zinc-500 font-mono text-[10px]">#7</span>
                      <span className="truncate group-hover:text-zinc-200">Team V0id</span>
                    </div>
                    <span className="text-zinc-500 text-xs font-mono px-1.5 py-0.5 bg-black/30 rounded">
                      7 (4 место)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. ПОЛУФИНАЛЫ (1/2 ФИНАЛА) */}
          {(activeStageFilter === 'all' || activeStageFilter === 'semi') && (
            <div className="p-4 bg-[#111115] border border-[#212121] rounded-2xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-[#212121] pb-2 text-xs font-black text-white font-mono uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>1/2 ФИНАЛА (ПОЛУФИНАЛЫ · BO3)</span>
                </span>
                <span className="text-[10px] text-zinc-500">2 МАТЧА</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Semi 1: adaptive vs LL TEAM */}
                <div 
                  onClick={() => onSelectMatch?.('match_sf_adaptive_vs_ll')}
                  className="p-3 bg-[#141417] hover:bg-[#18181d] border border-[#212121] hover:border-[#0ea5e9]/50 rounded-xl transition-all cursor-pointer shadow-md group space-y-2"
                >
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pb-1 border-b border-[#212121]">
                    <span>ПОЛУФИНАЛ #1 · BO3</span>
                    <span className="text-[#0ea5e9] group-hover:underline font-bold">ПРОТОКОЛ →</span>
                  </div>

                  <div 
                    onClick={(e) => handleTeamClick(e, "LL TEAM")}
                    className="px-3 py-2 bg-[#182330] border border-[#0ea5e9]/60 text-white text-xs flex items-center justify-between rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-400 font-mono text-[10px]">#4</span>
                      <span className="font-bold text-amber-300 truncate">LL TEAM</span>
                    </div>
                    <span className="text-emerald-400 text-xs font-mono font-black px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded">
                      2 ✓ В ФИНАЛ
                    </span>
                  </div>

                  <div 
                    onClick={(e) => handleTeamClick(e, "adaptive")}
                    className="px-3 py-2 bg-[#101012] border border-[#1e1e22] text-zinc-400 text-xs flex items-center justify-between rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-500 font-mono text-[10px]">#8</span>
                      <span className="truncate">adaptive</span>
                    </div>
                    <span className="text-zinc-500 text-xs font-mono px-1.5 py-0.5 bg-black/30 rounded">0</span>
                  </div>
                </div>

                {/* Semi 2: Team V0id vs TRIQ */}
                <div 
                  onClick={() => onSelectMatch?.('match_triq_vs_teamb')}
                  className="p-3 bg-[#141417] hover:bg-[#18181d] border border-[#212121] hover:border-[#0ea5e9]/50 rounded-xl transition-all cursor-pointer shadow-md group space-y-2"
                >
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pb-1 border-b border-[#212121]">
                    <span>ПОЛУФИНАЛ #2 · BO3</span>
                    <span className="text-[#0ea5e9] group-hover:underline font-bold">ПРОТОКОЛ →</span>
                  </div>

                  <div 
                    onClick={(e) => handleTeamClick(e, "TRIQ")}
                    className="px-3 py-2 bg-[#182330] border border-[#0ea5e9]/60 text-white text-xs flex items-center justify-between rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-400 font-mono text-[10px]">#6</span>
                      <span className="font-bold text-amber-300 truncate">TRIQ</span>
                    </div>
                    <span className="text-emerald-400 text-xs font-mono font-black px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded">
                      2 ✓ В ФИНАЛ
                    </span>
                  </div>

                  <div 
                    onClick={(e) => handleTeamClick(e, "Team V0id")}
                    className="px-3 py-2 bg-[#101012] border border-[#1e1e22] text-zinc-400 text-xs flex items-center justify-between rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-500 font-mono text-[10px]">#7</span>
                      <span className="truncate">Team V0id</span>
                    </div>
                    <span className="text-zinc-500 text-xs font-mono px-1.5 py-0.5 bg-black/30 rounded">0</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. ЧЕТВЕРТЬФИНАЛЫ (1/4 ФИНАЛА) */}
          {(activeStageFilter === 'all' || activeStageFilter === 'qf') && (
            <div className="p-4 bg-[#111115] border border-[#212121] rounded-2xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-[#212121] pb-2 text-xs font-black text-white font-mono uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-zinc-200">
                  <Swords className="w-4 h-4 text-[#0ea5e9]" />
                  <span>1/4 ФИНАЛА (ЧЕТВЕРТЬФИНАЛЫ · BO3)</span>
                </span>
                <span className="text-[10px] text-zinc-500">4 МАТЧА</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* QF 1: Aspect vs adaptive */}
                <div 
                  onClick={() => onSelectMatch?.('match_qf_aspect_vs_adaptive')}
                  className="p-3 bg-[#141417] hover:bg-[#18181d] border border-[#212121] hover:border-[#0ea5e9]/50 rounded-xl transition-all cursor-pointer shadow-md group space-y-2"
                >
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pb-1 border-b border-[#212121]">
                    <span>МАТЧ QF #1</span>
                    <span className="text-[#0ea5e9] group-hover:underline font-bold">ПРОТОКОЛ →</span>
                  </div>
                  <div 
                    onClick={(e) => handleTeamClick(e, "adaptive")}
                    className="px-3 py-2 bg-[#182330] border border-[#0ea5e9]/50 text-white text-xs flex items-center justify-between rounded-lg cursor-pointer"
                  >
                    <span className="font-bold text-amber-300">#8 adaptive</span>
                    <span className="text-emerald-400 font-mono font-bold">2 ✓</span>
                  </div>
                  <div 
                    onClick={(e) => handleTeamClick(e, "Aspect")}
                    className="px-3 py-2 bg-[#101012] border border-[#1e1e22] text-zinc-400 text-xs flex items-center justify-between rounded-lg cursor-pointer"
                  >
                    <span>#1 Aspect</span>
                    <span className="text-zinc-500 font-mono">0</span>
                  </div>
                </div>

                {/* QF 2: LL TEAM vs 322DOBEG */}
                <div className="p-3 bg-[#141417] border border-[#212121] rounded-xl shadow-md space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pb-1 border-b border-[#212121]">
                    <span>МАТЧ QF #2</span>
                    <span className="text-emerald-400 font-bold">ТЕХ. ПОБЕДА</span>
                  </div>
                  <div 
                    onClick={(e) => handleTeamClick(e, "LL TEAM")}
                    className="px-3 py-2 bg-[#182330] border border-[#0ea5e9]/50 text-white text-xs flex items-center justify-between rounded-lg cursor-pointer"
                  >
                    <span className="font-bold text-amber-300">#4 LL TEAM</span>
                    <span className="text-emerald-400 font-mono font-bold">✓</span>
                  </div>
                  <div 
                    onClick={(e) => handleTeamClick(e, "322DOBEG TEAM")}
                    className="px-3 py-2 bg-[#101012] border border-[#1e1e22] text-zinc-400 text-xs flex items-center justify-between rounded-lg cursor-pointer"
                  >
                    <span>#5 322DOBEG TEAM</span>
                    <span className="text-zinc-500 font-mono">0</span>
                  </div>
                </div>

                {/* QF 3: портфель adidas vs Team V0id */}
                <div className="p-3 bg-[#141417] border border-[#212121] rounded-xl shadow-md space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pb-1 border-b border-[#212121]">
                    <span>МАТЧ QF #3</span>
                    <span className="text-emerald-400 font-bold">ТЕХ. ПОБЕДА</span>
                  </div>
                  <div 
                    onClick={(e) => handleTeamClick(e, "Team V0id")}
                    className="px-3 py-2 bg-[#182330] border border-[#0ea5e9]/50 text-white text-xs flex items-center justify-between rounded-lg cursor-pointer"
                  >
                    <span className="font-bold text-amber-300">#7 Team V0id</span>
                    <span className="text-emerald-400 font-mono font-bold">✓</span>
                  </div>
                  <div 
                    onClick={(e) => handleTeamClick(e, "портфель adidas белый")}
                    className="px-3 py-2 bg-[#101012] border border-[#1e1e22] text-zinc-400 text-xs flex items-center justify-between rounded-lg cursor-pointer"
                  >
                    <span className="truncate">#2 портфель adidas</span>
                    <span className="text-zinc-500 font-mono">0</span>
                  </div>
                </div>

                {/* QF 4: DODO TEAM vs TRIQ */}
                <div 
                  onClick={() => onSelectMatch?.('match_triq_vs_dodo')}
                  className="p-3 bg-[#141417] hover:bg-[#18181d] border border-[#212121] hover:border-[#0ea5e9]/50 rounded-xl transition-all cursor-pointer shadow-md group space-y-2"
                >
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pb-1 border-b border-[#212121]">
                    <span>МАТЧ QF #4</span>
                    <span className="text-[#0ea5e9] group-hover:underline font-bold">ПРОТОКОЛ →</span>
                  </div>
                  <div 
                    onClick={(e) => handleTeamClick(e, "TRIQ")}
                    className="px-3 py-2 bg-[#182330] border border-[#0ea5e9]/50 text-white text-xs flex items-center justify-between rounded-lg cursor-pointer"
                  >
                    <span className="font-bold text-amber-300">#6 TRIQ</span>
                    <span className="text-emerald-400 font-mono font-bold">2 ✓</span>
                  </div>
                  <div 
                    onClick={(e) => handleTeamClick(e, "DODO TEAM")}
                    className="px-3 py-2 bg-[#101012] border border-[#1e1e22] text-zinc-400 text-xs flex items-center justify-between rounded-lg cursor-pointer"
                  >
                    <span>#3 DODO TEAM</span>
                    <span className="text-zinc-500 font-mono">0</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. 1/8 ФИНАЛА (РАУНД 1) */}
          {(activeStageFilter === 'all' || activeStageFilter === 'r1') && (
            <div className="p-4 bg-[#111115] border border-[#212121] rounded-2xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-[#212121] pb-2 text-xs font-black text-white font-mono uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <Target className="w-4 h-4 text-[#0ea5e9]" />
                  <span>1/8 ФИНАЛА (РАУНД 1 · BO1)</span>
                </span>
                <span className="text-[10px] text-zinc-500">1 МАТЧ</span>
              </div>

              <div 
                onClick={() => onSelectMatch?.('match_r1_adaptive_vs_ckson')}
                className="p-3 bg-[#141417] hover:bg-[#18181d] border border-[#212121] hover:border-[#0ea5e9]/50 rounded-xl transition-all cursor-pointer shadow-md group space-y-2 max-w-lg mx-auto"
              >
                <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pb-1 border-b border-[#212121]">
                  <span>МАТЧ #1 · BO1</span>
                  <span className="text-[#0ea5e9] group-hover:underline font-bold">ПРОТОКОЛ КАРТЫ →</span>
                </div>

                <div 
                  onClick={(e) => handleTeamClick(e, "adaptive")}
                  className="px-3 py-2 bg-[#182330] border border-[#0ea5e9]/50 text-white text-xs flex items-center justify-between rounded-lg cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 font-mono text-[10px]">#8</span>
                    <span className="font-bold text-amber-300">adaptive</span>
                  </div>
                  <span className="text-emerald-400 font-mono font-bold text-xs px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded">
                    13 ✓
                  </span>
                </div>

                <div 
                  onClick={(e) => handleTeamClick(e, "ckson")}
                  className="px-3 py-2 bg-[#101012] border border-[#1e1e22] text-zinc-400 text-xs flex items-center justify-between rounded-lg cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-mono text-[10px]">#9</span>
                    <span>ckson</span>
                  </div>
                  <span className="text-zinc-500 font-mono text-xs px-1.5 py-0.5 bg-black/30 rounded">
                    7
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          VIEW MODE 2: КЛАССИЧЕСКОЕ ДЕРЕВО СЕТКИ С ГОРИЗОНТАЛЬНЫМ СКРОЛЛОМ
          ========================================================= */}
      {viewMode === 'tree' && (
        <div 
          ref={scrollRef}
          className={`w-full ${isFit ? 'overflow-hidden flex justify-center py-2' : 'overflow-x-auto pb-5 pt-2 no-scrollbar'} bg-[#0e0e10] border border-[#212121] rounded-2xl shadow-2xl relative`}
        >
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#0ea5e9]/5 rounded-full blur-3xl pointer-events-none" />

          <div 
            style={isFit ? { transform: 'scale(0.48)', transformOrigin: 'top center', width: '940px', marginBottom: '-380px' } : {}}
            className="min-w-[940px] p-5 sm:p-7 space-y-6 relative transition-transform duration-300"
          >
            {/* Header Title */}
            <div className="text-center space-y-1.5 pb-3 border-b border-[#212121]">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 text-[#0ea5e9] text-[9px] font-black uppercase tracking-widest">
                СОРЕВНОВАТЕЛЬНЫЙ ПЛЕЙ-ОФФ
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                AITU PRO LEAGUE SEASON 1
              </h2>
              <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400 font-mono">
                <span>Single Elimination</span>
                <span>·</span>
                <span className="text-emerald-400 font-bold">11 ОКТЯБРЯ 2026 (ЗАВЕРШЁН)</span>
                <span>·</span>
                <span className="text-amber-400 font-bold">🏆 ЧЕМПИОН: LL TEAM</span>
              </div>
            </div>

            {/* 4 Column Round Headers */}
            <div className="grid grid-cols-4 gap-6 text-[11px] uppercase tracking-wider text-center font-black">
              <div className="p-2.5 rounded-xl bg-[#141417] border border-[#212121] text-zinc-300">
                1/8 ФИНАЛА (BO1)
              </div>
              <div className="p-2.5 rounded-xl bg-[#141417] border border-[#212121] text-zinc-300">
                1/4 ФИНАЛА (BO3)
              </div>
              <div className="p-2.5 rounded-xl bg-[#141417] border border-[#212121] text-zinc-300">
                1/2 ФИНАЛА (BO3)
              </div>
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#181510] to-[#1e1910] border border-amber-500/40 text-amber-300 flex items-center justify-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>ГРАНД-ФИНАЛ</span>
              </div>
            </div>

            {/* Grid of Columns & Matches */}
            <div className="grid grid-cols-4 gap-6 relative items-start">
              
              {/* COLUMN 1: ROUND 1 (1/8 ФИНАЛА) */}
              <div className="space-y-4 pt-10">
                <div 
                  onClick={() => onSelectMatch?.('match_r1_adaptive_vs_ckson')}
                  className="p-2.5 bg-[#141417] hover:bg-[#18181d] border border-[#212121] hover:border-[#0ea5e9]/50 rounded-xl transition-all cursor-pointer shadow-md group space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pb-1 border-b border-[#212121]">
                    <span>МАТЧ #1 · BO1</span>
                    <span className="text-[#0ea5e9] group-hover:underline">РАЗБОР →</span>
                  </div>

                  {/* Team 1 (adaptive - winner) */}
                  <div 
                    onClick={(e) => handleTeamClick(e, "adaptive")}
                    className="px-3 py-2 bg-[#182330] border border-[#0ea5e9]/50 text-white text-xs flex items-center justify-between rounded-lg cursor-pointer group/t"
                    title="Открыть команду adaptive"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-400 font-mono text-[10px]">#8</span>
                      <span className="font-bold truncate group-hover/t:text-amber-300 transition-colors">adaptive</span>
                    </div>
                    <span className="text-emerald-400 text-xs font-mono font-black px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded">
                      13 ✓
                    </span>
                  </div>

                  {/* Team 2 (ckson) */}
                  <div 
                    onClick={(e) => handleTeamClick(e, "ckson")}
                    className="px-3 py-2 bg-[#101012] border border-[#1e1e22] text-zinc-400 text-xs flex items-center justify-between rounded-lg cursor-pointer group/t"
                    title="Открыть команду ckson"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-500 font-mono text-[10px]">#9</span>
                      <span className="truncate group-hover/t:text-zinc-200 transition-colors">ckson</span>
                    </div>
                    <span className="text-zinc-500 text-xs font-mono px-1.5 py-0.5 bg-black/30 rounded">
                      7
                    </span>
                  </div>
                </div>
              </div>

              {/* COLUMN 2: ROUND 2 (1/4 ФИНАЛА) */}
              <div className="space-y-6 relative">
                {/* Match 1: Aspect vs adaptive */}
                <div 
                  onClick={() => onSelectMatch?.('match_qf_aspect_vs_adaptive')}
                  className="p-2.5 bg-[#141417] hover:bg-[#18181d] border border-[#212121] hover:border-[#0ea5e9]/50 rounded-xl transition-all cursor-pointer shadow-md group space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pb-1 border-b border-[#212121]">
                    <span>МАТЧ QF #1 · BO3</span>
                    <span className="text-[#0ea5e9] group-hover:underline">РАЗБОР →</span>
                  </div>

                  <div 
                    onClick={(e) => handleTeamClick(e, "Aspect")}
                    className="px-3 py-2 bg-[#101012] border border-[#1e1e22] text-zinc-400 text-xs flex items-center justify-between rounded-lg cursor-pointer group/t"
                    title="Открыть команду Aspect"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-500 font-mono text-[10px]">#1</span>
                      <span className="truncate group-hover/t:text-zinc-200 transition-colors">Aspect</span>
                    </div>
                    <span className="text-zinc-500 text-xs font-mono px-1.5 py-0.5 bg-black/30 rounded">0</span>
                  </div>

                  <div 
                    onClick={(e) => handleTeamClick(e, "adaptive")}
                    className="px-3 py-2 bg-[#182330] border border-[#0ea5e9]/50 text-white text-xs flex items-center justify-between rounded-lg cursor-pointer group/t"
                    title="Открыть команду adaptive"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-400 font-mono text-[10px]">#8</span>
                      <span className="font-bold truncate group-hover/t:text-amber-300 transition-colors">adaptive</span>
                    </div>
                    <span className="text-emerald-400 text-xs font-mono font-black px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded">
                      2 ✓
                    </span>
                  </div>
                </div>

                {/* Match 2: LL TEAM vs 322DOBEG TEAM */}
                <div className="p-2.5 bg-[#141417] border border-[#212121] rounded-xl shadow-md space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pb-1 border-b border-[#212121]">
                    <span>МАТЧ QF #2 · BO3</span>
                    <span className="text-emerald-400">ТЕХ. ПОБЕДА</span>
                  </div>

                  <div 
                    onClick={(e) => handleTeamClick(e, "LL TEAM")}
                    className="px-3 py-2 bg-[#182330] border border-[#0ea5e9]/50 text-white text-xs flex items-center justify-between rounded-lg cursor-pointer group/t"
                    title="Открыть команду LL TEAM"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-400 font-mono text-[10px]">#4</span>
                      <span className="font-bold truncate group-hover/t:text-amber-300 transition-colors">LL TEAM</span>
                    </div>
                    <span className="text-emerald-400 text-xs font-mono font-black px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded">
                      ✓
                    </span>
                  </div>

                  <div 
                    onClick={(e) => handleTeamClick(e, "322DOBEG TEAM")}
                    className="px-3 py-2 bg-[#101012] border border-[#1e1e22] text-zinc-400 text-xs flex items-center justify-between rounded-lg cursor-pointer group/t"
                    title="Открыть команду 322DOBEG TEAM"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-500 font-mono text-[10px]">#5</span>
                      <span className="truncate group-hover/t:text-zinc-200 transition-colors">322DOBEG TEAM</span>
                    </div>
                    <span className="text-zinc-500 text-[10px] font-mono">0</span>
                  </div>
                </div>

                {/* Match 3: портфель adidas белый vs Team V0id */}
                <div className="p-2.5 bg-[#141417] border border-[#212121] rounded-xl shadow-md space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pb-1 border-b border-[#212121]">
                    <span>МАТЧ QF #3 · BO3</span>
                    <span className="text-emerald-400">ТЕХ. ПОБЕДА</span>
                  </div>

                  <div 
                    onClick={(e) => handleTeamClick(e, "портфель adidas белый")}
                    className="px-3 py-2 bg-[#101012] border border-[#1e1e22] text-zinc-400 text-xs flex items-center justify-between rounded-lg cursor-pointer group/t"
                    title="Открыть команду портфель adidas белый"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-500 font-mono text-[10px]">#2</span>
                      <span className="truncate group-hover/t:text-zinc-200 transition-colors">портфель adidas</span>
                    </div>
                    <span className="text-zinc-500 text-[10px] font-mono">0</span>
                  </div>

                  <div 
                    onClick={(e) => handleTeamClick(e, "Team V0id")}
                    className="px-3 py-2 bg-[#182330] border border-[#0ea5e9]/50 text-white text-xs flex items-center justify-between rounded-lg cursor-pointer group/t"
                    title="Открыть команду Team V0id"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-400 font-mono text-[10px]">#7</span>
                      <span className="font-bold truncate group-hover/t:text-amber-300 transition-colors">Team V0id</span>
                    </div>
                    <span className="text-emerald-400 text-xs font-mono font-black px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded">
                      ✓
                    </span>
                  </div>
                </div>

                {/* Match 4: DODO TEAM vs TRIQ */}
                <div 
                  onClick={() => onSelectMatch?.('match_triq_vs_dodo')}
                  className="p-2.5 bg-[#141417] hover:bg-[#18181d] border border-[#212121] hover:border-[#0ea5e9]/50 rounded-xl transition-all cursor-pointer shadow-md group space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pb-1 border-b border-[#212121]">
                    <span>МАТЧ QF #4 · BO3</span>
                    <span className="text-[#0ea5e9] group-hover:underline">РАЗБОР →</span>
                  </div>

                  <div 
                    onClick={(e) => handleTeamClick(e, "DODO TEAM")}
                    className="px-3 py-2 bg-[#101012] border border-[#1e1e22] text-zinc-400 text-xs flex items-center justify-between rounded-lg cursor-pointer group/t"
                    title="Открыть команду DODO TEAM"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-500 font-mono text-[10px]">#3</span>
                      <span className="truncate group-hover/t:text-zinc-200 transition-colors">DODO TEAM</span>
                    </div>
                    <span className="text-zinc-500 text-xs font-mono px-1.5 py-0.5 bg-black/30 rounded">0</span>
                  </div>

                  <div 
                    onClick={(e) => handleTeamClick(e, "TRIQ")}
                    className="px-3 py-2 bg-[#182330] border border-[#0ea5e9]/50 text-white text-xs flex items-center justify-between rounded-lg cursor-pointer group/t"
                    title="Открыть команду TRIQ"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-400 font-mono text-[10px]">#6</span>
                      <span className="font-bold text-amber-300 truncate group-hover/t:text-white transition-colors">TRIQ</span>
                    </div>
                    <span className="text-emerald-400 text-xs font-mono font-black px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded">
                      2 ✓
                    </span>
                  </div>
                </div>
              </div>

              {/* COLUMN 3: SEMI-FINAL (1/2 ФИНАЛА) */}
              <div className="space-y-16 pt-8 relative">
                {/* Semi 1: adaptive vs LL TEAM */}
                <div 
                  onClick={() => onSelectMatch?.('match_sf_adaptive_vs_ll')}
                  className="p-3 bg-[#141417] hover:bg-[#18181d] border border-[#212121] hover:border-[#0ea5e9]/50 rounded-xl transition-all cursor-pointer shadow-md group space-y-2"
                >
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pb-1 border-b border-[#212121]">
                    <span>ПОЛУФИНАЛ #1 · BO3</span>
                    <span className="text-[#0ea5e9] group-hover:underline">РАЗБОР →</span>
                  </div>

                  <div 
                    onClick={(e) => handleTeamClick(e, "adaptive")}
                    className="px-3 py-2 bg-[#101012] border border-[#1e1e22] text-zinc-400 text-xs flex items-center justify-between rounded-lg cursor-pointer group/t"
                    title="Открыть команду adaptive"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-500 font-mono text-[10px]">#8</span>
                      <span className="truncate group-hover/t:text-zinc-200 transition-colors">adaptive</span>
                    </div>
                    <span className="text-zinc-500 text-xs font-mono px-1.5 py-0.5 bg-black/30 rounded">0</span>
                  </div>

                  <div 
                    onClick={(e) => handleTeamClick(e, "LL TEAM")}
                    className="px-3 py-2 bg-[#182330] border border-[#0ea5e9]/60 text-white text-xs flex items-center justify-between rounded-lg cursor-pointer group/t"
                    title="Открыть команду LL TEAM"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-400 font-mono text-[10px]">#4</span>
                      <span className="font-bold truncate group-hover/t:text-amber-300 transition-colors">LL TEAM</span>
                    </div>
                    <span className="text-emerald-400 text-xs font-mono font-black px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded flex items-center gap-1">
                      2 ✓ В ФИНАЛ
                    </span>
                  </div>
                </div>

                {/* Semi 2: Team V0id vs TRIQ */}
                <div 
                  onClick={() => onSelectMatch?.('match_triq_vs_teamb')}
                  className="p-3 bg-[#141417] hover:bg-[#18181d] border border-[#212121] hover:border-[#0ea5e9]/50 rounded-xl transition-all cursor-pointer shadow-md group space-y-2"
                >
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pb-1 border-b border-[#212121]">
                    <span>ПОЛУФИНАЛ #2 · BO3</span>
                    <span className="text-[#0ea5e9] group-hover:underline">РАЗБОР →</span>
                  </div>

                  <div 
                    onClick={(e) => handleTeamClick(e, "Team V0id")}
                    className="px-3 py-2 bg-[#101012] border border-[#1e1e22] text-zinc-400 text-xs flex items-center justify-between rounded-lg cursor-pointer group/t"
                    title="Открыть команду Team V0id"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-500 font-mono text-[10px]">#7</span>
                      <span className="truncate group-hover/t:text-zinc-200 transition-colors">Team V0id</span>
                    </div>
                    <span className="text-zinc-500 text-xs font-mono px-1.5 py-0.5 bg-black/30 rounded">0</span>
                  </div>

                  <div 
                    onClick={(e) => handleTeamClick(e, "TRIQ")}
                    className="px-3 py-2 bg-[#182330] border border-[#0ea5e9]/60 text-white text-xs flex items-center justify-between rounded-lg cursor-pointer group/t"
                    title="Открыть команду TRIQ"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-400 font-mono text-[10px]">#6</span>
                      <span className="font-bold text-amber-300 truncate group-hover/t:text-white transition-colors">TRIQ</span>
                    </div>
                    <span className="text-emerald-400 text-xs font-mono font-black px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded flex items-center gap-1">
                      2 ✓ В ФИНАЛ
                    </span>
                  </div>
                </div>
              </div>

              {/* COLUMN 4: FINAL & 3RD PLACE */}
              <div className="space-y-8 pt-10">
                {/* Grand Final Box */}
                <div 
                  onClick={() => onSelectMatch?.('match_final_ll_vs_triq')}
                  className="p-3.5 bg-gradient-to-b from-[#1c1810] via-[#151310] to-[#101014] border-2 border-amber-400/70 hover:border-amber-400 rounded-2xl shadow-xl shadow-amber-500/10 cursor-pointer group transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between text-[10px] text-amber-400 font-mono font-bold uppercase tracking-wider border-b border-amber-500/20 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>ГРАНД-ФИНАЛ</span>
                    </span>
                    <span className="px-2 py-0.2 bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[9px] font-black rounded-sm">
                      BO3
                    </span>
                  </div>

                  {/* Team 1 Winner (LL TEAM) */}
                  <div 
                    onClick={(e) => handleTeamClick(e, "LL TEAM")}
                    className="px-3.5 py-2.5 bg-amber-950/40 border border-amber-400/70 group-hover:border-amber-300 text-white text-xs flex items-center justify-between rounded-xl shadow-md transition-colors"
                    title="Открыть команду LL TEAM"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-amber-400 font-mono text-[10px] font-bold">#4</span>
                      <span className="font-black text-amber-300 truncate text-sm">LL TEAM</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-300 font-mono font-black text-sm px-2 py-0.5 bg-amber-400/20 border border-amber-400/50 rounded-md">
                        2 🏆
                      </span>
                    </div>
                  </div>

                  {/* Team 2 Runner-up (TRIQ) */}
                  <div 
                    onClick={(e) => handleTeamClick(e, "TRIQ")}
                    className="px-3.5 py-2.5 bg-[#141418] border border-[#262630] group-hover:border-zinc-400 text-zinc-300 text-xs flex items-center justify-between rounded-xl transition-colors"
                    title="Открыть команду TRIQ"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-zinc-500 font-mono text-[10px]">#6</span>
                      <span className="font-bold truncate text-sm">TRIQ</span>
                    </div>
                    <span className="text-zinc-300 font-mono font-bold text-xs px-2 py-0.5 bg-black/40 border border-white/10 rounded-md">
                      1 🥈
                    </span>
                  </div>

                  <div className="text-[9px] text-center text-zinc-500 font-mono pt-1">
                    Нажмите для просмотра протокола карт
                  </div>
                </div>

                {/* 3rd Place Match */}
                <div className="p-3 bg-[#141417] border border-amber-800/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider pb-1 border-b border-[#212121]">
                    <span className="flex items-center gap-1 text-amber-600">
                      <Award className="w-3.5 h-3.5" />
                      <span>МАТЧ ЗА 3-Е МЕСТО</span>
                    </span>
                    <span className="text-[9px] text-zinc-500">BO1</span>
                  </div>

                  <div className="space-y-1.5">
                    <div 
                      onClick={(e) => handleTeamClick(e, "adaptive")}
                      className="px-3 py-2 bg-[#182330] border border-[#0ea5e9]/50 text-white text-xs flex items-center justify-between rounded-lg cursor-pointer group"
                      title="Открыть команду adaptive"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-zinc-400 font-mono text-[10px]">#8</span>
                        <span className="font-bold truncate group-hover:text-amber-300 transition-colors">adaptive</span>
                      </div>
                      <span className="text-amber-400 text-xs font-mono font-black px-1.5 py-0.5 bg-amber-950/40 border border-amber-600/50 rounded">
                        13 🥉
                      </span>
                    </div>

                    <div 
                      onClick={(e) => handleTeamClick(e, "Team V0id")}
                      className="px-3 py-2 bg-[#101012] border border-[#1e1e22] text-zinc-400 text-xs flex items-center justify-between rounded-lg cursor-pointer group"
                      title="Открыть команду Team V0id"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-zinc-500 font-mono text-[10px]">#7</span>
                        <span className="truncate group-hover:text-zinc-200 transition-colors">Team V0id</span>
                      </div>
                      <span className="text-zinc-500 text-xs font-mono px-1.5 py-0.5 bg-black/30 rounded">
                        7 (4 место)
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
