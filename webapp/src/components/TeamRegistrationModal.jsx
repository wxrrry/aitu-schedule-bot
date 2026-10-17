import React, { useState } from 'react';
import { 
  X, 
  Trophy, 
  Users, 
  Send, 
  Check, 
  AlertCircle, 
  Plus, 
  Trash2, 
  ShieldCheck 
} from 'lucide-react';
import { useTelegramBackButton, triggerHaptic } from '../utils/telegram';
import { registerTeamForTournament } from '../utils/tournamentManager';

export default function TeamRegistrationModal({ isOpen, onClose, tournament, profile, onRegistered }) {
  useTelegramBackButton(isOpen, onClose);

  const [teamName, setTeamName] = useState('');
  const [tag, setTag] = useState('');
  const [captainNick, setCaptainNick] = useState(profile?.username ? (profile.username === 'student_aitu' ? '' : profile.username) : '');
  const [captainTg, setCaptainTg] = useState(profile?.username ? (profile.username.startsWith('@') ? profile.username : `@${profile.username}`) : '');
  const [captainSteamId, setCaptainSteamId] = useState('');
  const [group, setGroup] = useState(profile?.group || '9ПО-43к');
  
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [player3, setPlayer3] = useState('');
  const [player4, setPlayer4] = useState('');
  const [substitute, setSubstitute] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !tournament) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!teamName.trim()) {
      setError('Укажите название команды');
      triggerHaptic('error');
      return;
    }
    if (!captainNick.trim()) {
      setError('Укажите никнейм капитана команды');
      triggerHaptic('error');
      return;
    }
    if (!captainTg.trim()) {
      setError('Укажите Telegram для связи с капитаном');
      triggerHaptic('error');
      return;
    }

    const mainPlayers = [player1, player2, player3, player4].filter(p => p.trim());
    if (mainPlayers.length < 4) {
      setError('Необходимо указать никнеймы всех 4 основных игроков команды (всего 5 вместе с капитаном)');
      triggerHaptic('error');
      return;
    }

    const newTeam = registerTeamForTournament(tournament.id, {
      teamName,
      tag: tag || teamName.slice(0, 4).toUpperCase(),
      captainNick,
      captainTg,
      captainSteamId,
      group,
      players: mainPlayers,
      substitute
    });

    setSubmitted(true);
    triggerHaptic('success');
    if (onRegistered) onRegistered(newTeam);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[#0e0e11] border border-white/10 p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.08] pb-3">
          <div className="space-y-0.5">
            <span className="font-mono text-[9px] text-amber-400 tracking-wider uppercase font-bold flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>РЕГИСТРАЦИЯ КОМАНДЫ НА ТУРНИР</span>
            </span>
            <h3 className="text-lg font-black text-white font-sans tracking-tight">
              {tournament.title}
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">
              Дисциплина: {tournament.discipline || "CS2"} · Формат: 5x5
            </p>
          </div>

          <button 
            onClick={onClose}
            className="p-1 border border-white/10 hover:border-white text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 bg-black border border-emerald-500/40 text-center space-y-3 font-mono animate-fadeIn">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-950/60 border border-emerald-500/60 flex items-center justify-center text-emerald-400">
              <Check className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white uppercase">
                ЗАЯВКА КОМАНДЫ «{teamName}» ПРИНЯТА!
              </h4>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                Команда внесена в турнирный реестр со статусом <strong>ПОДТВЕРЖДЕНА</strong>. Чек-ин капитанов и распределение сетки будут доступны перед началом матчей.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors"
            >
              ВЕРНУТЬСЯ К ТУРНИРУ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-mono">
            {error && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-center gap-2 text-[11px]">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Название и Клан-тег */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase font-bold block">
                  НАЗВАНИЕ КОМАНДЫ *
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Например: TRIQ или Phoenix"
                  className="w-full bg-black border border-white/20 p-2 text-white font-sans text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase font-bold block">
                  ТЕГ (КЛАН)
                </label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value.toUpperCase())}
                  placeholder="TRIQ"
                  maxLength={6}
                  className="w-full bg-black border border-white/20 p-2 text-white font-mono text-xs uppercase focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* 2. Данные Капитана */}
            <div className="p-3 bg-zinc-950 border border-white/10 space-y-2">
              <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block">
                01 // КАПИТАН КОМАНДЫ (IGL)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase block">НИКНЕЙМ КАПИТАНА *</label>
                  <input
                    type="text"
                    value={captainNick}
                    onChange={(e) => setCaptainNick(e.target.value)}
                    placeholder="wxrry"
                    className="w-full bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase block">TELEGRAM ДЛЯ СВЯЗИ *</label>
                  <input
                    type="text"
                    value={captainTg}
                    onChange={(e) => setCaptainTg(e.target.value)}
                    placeholder="@username"
                    className="w-full bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase block">ГРУППА / ОТДЕЛЕНИЕ</label>
                  <input
                    type="text"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    placeholder="9ПО-43к"
                    className="w-full bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase block">STEAM ID (ОПЦИОНАЛЬНО)</label>
                  <input
                    type="text"
                    value={captainSteamId}
                    onChange={(e) => setCaptainSteamId(e.target.value)}
                    placeholder="STEAM_0:1:..."
                    className="w-full bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. Основной состав (4 игрока) */}
            <div className="p-3 bg-zinc-950 border border-white/10 space-y-2">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">
                02 // ОСНОВНОЙ СОСТАВ (4 ИГРОКА)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={player1}
                  onChange={(e) => setPlayer1(e.target.value)}
                  placeholder="Игрок 2: никнейм *"
                  className="bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={player2}
                  onChange={(e) => setPlayer2(e.target.value)}
                  placeholder="Игрок 3: никнейм *"
                  className="bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={player3}
                  onChange={(e) => setPlayer3(e.target.value)}
                  placeholder="Игрок 4: никнейм *"
                  className="bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={player4}
                  onChange={(e) => setPlayer4(e.target.value)}
                  placeholder="Игрок 5: никнейм *"
                  className="bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-1">
                <input
                  type="text"
                  value={substitute}
                  onChange={(e) => setSubstitute(e.target.value)}
                  placeholder="Запасной игрок (опционально)"
                  className="w-full bg-black border border-white/15 p-1.5 text-zinc-300 text-xs font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ОТПРАВИТЬ ЗАЯВКУ НА ТУРНИР</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
