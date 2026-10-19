import React from 'react';
import { 
  X, 
  Trophy, 
  Crosshair, 
  Flame, 
  Shield, 
  Target, 
  Zap, 
  Award, 
  ExternalLink 
} from 'lucide-react';
import { useTelegramBackButton, triggerHaptic } from '../utils/telegram';

export default function PlayerModal({ player, onClose, onSelectTeam }) {
  useTelegramBackButton(Boolean(player), onClose);

  if (!player) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[#0e0e11] border border-white/10 p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between border-b border-white/[0.08] pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-2xl font-black text-white font-mono tracking-tight">
                {player.nick}
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (onSelectTeam) {
                    onClose();
                    onSelectTeam(player.team || "TRIQ");
                  }
                }}
                className={`px-2 py-0.5 bg-zinc-900 border border-white/20 text-amber-300 font-mono text-[10px] font-bold uppercase transition-colors ${
                  onSelectTeam ? 'hover:border-amber-400 hover:text-white cursor-pointer' : ''
                }`}
                title="Открыть команду"
              >
                {player.team || "TRIQ"} →
              </button>
              <span className="px-1.5 py-0.5 bg-white text-black font-mono font-bold text-[9px] uppercase">
                {player.elo || 1000} ELO
              </span>
            </div>
            {player.isCaptain && (
              <p className="text-xs text-amber-400 font-mono font-semibold">
                Капитан команды
              </p>
            )}
            {player.steamId && (
              <p className="text-[10px] font-mono text-zinc-500">
                {player.steamId}
              </p>
            )}
          </div>

          <button 
            onClick={onClose}
            className="p-1 border border-white/10 hover:border-white text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Badges */}
        {player.badges && player.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 font-mono text-[9px]">
            {player.badges.map((b, i) => (
              <span 
                key={i}
                className="px-2 py-0.5 bg-amber-950/40 border border-amber-500/30 text-amber-300 font-bold uppercase flex items-center gap-1"
              >
                <Award className="w-3 h-3 text-amber-400" />
                <span>{b}</span>
              </span>
            ))}
          </div>
        )}

        {/* 4 Combat Metrics */}
        <div className="grid grid-cols-4 gap-2 font-mono text-center">
          <div className="p-2.5 bg-black border border-white/10">
            <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">K / D</span>
            <span className="text-base font-bold text-emerald-400">
              {player.kdRatio || "1.25"}
            </span>
          </div>
          <div className="p-2.5 bg-black border border-white/10">
            <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">HS %</span>
            <span className="text-base font-bold text-white">
              {player.hsPercentage || "50%"}
            </span>
          </div>
          <div className="p-2.5 bg-black border border-white/10">
            <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">ВИНРЕЙТ</span>
            <span className="text-base font-bold text-white">
              {player.winRate || "67%"}
            </span>
          </div>
          <div className="p-2.5 bg-black border border-white/10">
            <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">МАТЧЕЙ</span>
            <span className="text-base font-bold text-white">
              {player.matchesPlayed || "3"}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 bg-zinc-950 border border-white/10 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
              КОМАНДНЫЙ ПРОФИЛЬ
            </span>
            <span className="text-[9px] text-zinc-500 uppercase">CS2 COMPETITIVE</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-zinc-500 block text-[9px] uppercase">УЧЕБНАЯ ГРУППА:</span>
              <span className="text-white font-bold">{player.group || "9ПО-43к"}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[9px] uppercase">КОМАНДА:</span>
              <button
                type="button"
                onClick={() => {
                  if (onSelectTeam) {
                    onClose();
                    onSelectTeam(player.team || "TRIQ");
                  }
                }}
                className={`font-bold transition-colors ${
                  onSelectTeam ? 'text-amber-300 hover:underline cursor-pointer' : 'text-zinc-300'
                }`}
              >
                {player.team || "TRIQ"}
              </button>
            </div>
          </div>
        </div>

        {/* Tournament Total Stats */}
        <div className="p-3 bg-zinc-950 border border-white/10 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
              СТАТИСТИКА ОСЕННЕГО КУБКА КОЛЛЕДЖА
            </span>
            <span className="text-[9px] text-amber-400 uppercase font-bold">ИТОГ</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-1.5 bg-black border border-white/5">
              <span className="text-[9px] text-zinc-500 uppercase block">УБИЙСТВА</span>
              <span className="text-sm font-bold text-white">{player.totalKills || 0}</span>
            </div>
            <div className="p-1.5 bg-black border border-white/5">
              <span className="text-[9px] text-zinc-500 uppercase block">СМЕРТИ</span>
              <span className="text-sm font-bold text-zinc-400">{player.totalDeaths || 0}</span>
            </div>
            <div className="p-1.5 bg-black border border-white/5">
              <span className="text-[9px] text-zinc-500 uppercase block">АССИСТЫ</span>
              <span className="text-sm font-bold text-zinc-400">{player.totalAssists || 0}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-2 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors"
        >
          ЗАКРЫТЬ ПРОФИЛЬ ИГРОКА
        </button>
      </div>
    </div>
  );
}
