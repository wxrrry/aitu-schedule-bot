import React, { useState } from 'react';
import { 
  X, 
  Trophy, 
  Users, 
  Send, 
  Check, 
  AlertCircle, 
  Shield, 
  Sword, 
  Flame, 
  Zap, 
  Target, 
  Crown, 
  Crosshair,
  UserCheck,
  Image as ImageIcon
} from 'lucide-react';
import { useTelegramBackButton, triggerHaptic } from '../utils/telegram';
import { registerTeamForTournament } from '../utils/tournamentManager';

// Пресеты логотипов/аватарок команд
const AVATAR_PRESETS = [
  { id: 'shield', name: 'Кибер-Щит', icon: '🛡️', color: 'from-amber-500 to-yellow-600', border: 'border-amber-400' },
  { id: 'swords', name: 'Клинки', icon: '⚔️', color: 'from-rose-600 to-red-700', border: 'border-red-400' },
  { id: 'phoenix', name: 'Феникс', icon: '🦅', color: 'from-orange-500 to-amber-600', border: 'border-orange-400' },
  { id: 'flame', name: 'Огонь', icon: '🔥', color: 'from-red-500 to-amber-500', border: 'border-amber-400' },
  { id: 'dragon', name: 'Дракон', icon: '🐲', color: 'from-emerald-600 to-teal-700', border: 'border-emerald-400' },
  { id: 'lightning', name: 'Молния', icon: '⚡', color: 'from-cyan-500 to-blue-600', border: 'border-cyan-400' },
  { id: 'target', name: 'Снайпер', icon: '🎯', color: 'from-purple-600 to-indigo-700', border: 'border-purple-400' },
  { id: 'crown', name: 'Корона', icon: '👑', color: 'from-amber-400 to-yellow-500', border: 'border-yellow-300' }
];

export default function TeamRegistrationModal({ isOpen, onClose, tournament, profile, onRegistered }) {
  useTelegramBackButton(isOpen, onClose);

  // Основная информация о команде
  const [teamName, setTeamName] = useState('');
  const [tag, setTag] = useState('');
  const [group, setGroup] = useState(profile?.group || '9ПО-43к');
  const [selectedAvatarPreset, setSelectedAvatarPreset] = useState('shield');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [avatarTab, setAvatarTab] = useState('presets'); // 'presets' | 'url'

  // Капитан
  const [captainNick, setCaptainNick] = useState(profile?.username ? (profile.username === 'student_aitu' ? '' : profile.username) : '');
  const [captainTg, setCaptainTg] = useState(profile?.username ? (profile.username.startsWith('@') ? profile.username : `@${profile.username}`) : '');
  const [captainFaceit, setCaptainFaceit] = useState('');
  const [captainGroup, setCaptainGroup] = useState(profile?.group || '9ПО-43к');

  // Игроки основного состава (4 игрока)
  const [player2, setPlayer2] = useState({ nick: '', faceit: '', group: profile?.group || '9ПО-43к', role: 'Снайпер (AWP)' });
  const [player3, setPlayer3] = useState({ nick: '', faceit: '', group: profile?.group || '9ПО-43к', role: 'Рифлер (Entry)' });
  const [player4, setPlayer4] = useState({ nick: '', faceit: '', group: profile?.group || '9ПО-43к', role: 'Опорник (Anchor)' });
  const [player5, setPlayer5] = useState({ nick: '', faceit: '', group: profile?.group || '9ПО-43к', role: 'Саппорт (Support)' });

  // Запасной игрок (опционально)
  const [substitute, setSubstitute] = useState({ nick: '', faceit: '', group: profile?.group || '9ПО-43к' });

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

    const otherPlayers = [player2, player3, player4, player5];
    const missing = otherPlayers.filter(p => !p.nick.trim());
    if (missing.length > 0) {
      setError('Необходимо указать никнеймы всех 4 основных игроков команды (всего 5 вместе с капитаном)');
      triggerHaptic('error');
      return;
    }

    // Собираем аватар
    let avatarUrl = customAvatarUrl.trim();
    const preset = AVATAR_PRESETS.find(p => p.id === selectedAvatarPreset);

    // Собираем полный ростер с Faceit и учебными группами
    const roster = [
      {
        nick: captainNick.trim(),
        faceit: captainFaceit.trim() || '—',
        group: captainGroup.trim() || group.trim(),
        role: 'Капитан (IGL)',
        isCaptain: true
      },
      {
        nick: player2.nick.trim(),
        faceit: player2.faceit.trim() || '—',
        group: player2.group.trim() || group.trim(),
        role: player2.role || 'Снайпер (AWP)'
      },
      {
        nick: player3.nick.trim(),
        faceit: player3.faceit.trim() || '—',
        group: player3.group.trim() || group.trim(),
        role: player3.role || 'Рифлер (Entry)'
      },
      {
        nick: player4.nick.trim(),
        faceit: player4.faceit.trim() || '—',
        group: player4.group.trim() || group.trim(),
        role: player4.role || 'Опорник (Anchor)'
      },
      {
        nick: player5.nick.trim(),
        faceit: player5.faceit.trim() || '—',
        group: player5.group.trim() || group.trim(),
        role: player5.role || 'Саппорт (Support)'
      }
    ];

    const simplePlayersList = [
      player2.nick.trim(),
      player3.nick.trim(),
      player4.nick.trim(),
      player5.nick.trim()
    ];

    const subEntry = substitute.nick.trim() ? {
      nick: substitute.nick.trim(),
      faceit: substitute.faceit.trim() || '—',
      group: substitute.group.trim() || group.trim(),
      role: 'Запасной'
    } : null;

    const newTeam = registerTeamForTournament(tournament.id, {
      teamName: teamName.trim(),
      tag: (tag || teamName.slice(0, 4)).trim().toUpperCase(),
      group: group.trim() || 'Сборная',
      avatar: avatarUrl || preset?.icon || '🛡️',
      avatarUrl: avatarUrl || null,
      avatarPreset: selectedAvatarPreset,
      captainNick: captainNick.trim(),
      captainTg: captainTg.trim(),
      captainFaceit: captainFaceit.trim(),
      captainGroup: captainGroup.trim(),
      players: simplePlayersList,
      roster,
      substitute: subEntry ? subEntry.nick : ''
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
        className="w-full max-w-lg bg-[#0e0e11] border border-white/10 p-5 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.08] pb-3">
          <div className="space-y-0.5">
            <span className="font-mono text-[9px] text-amber-400 tracking-wider uppercase font-bold flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>АНКЕТА РЕГИСТРАЦИИ КОМАНДЫ НА ТУРНИР</span>
            </span>
            <h3 className="text-lg font-black text-white font-sans tracking-tight uppercase">
              {tournament.title}
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">
              Дисциплина: CS2 · 5x5 + 1 Запасной · Призы: {tournament.prizePool || "Кубок + Медали"}
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
                Команда внесена в турнирный реестр со статусом <strong>ПОДТВЕРЖДЕНА</strong>. Организатор турнира распределит посев и сформирует сетку плей-офф.
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
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
            {error && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-center gap-2 text-[11px]">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* БЛОК 1: Название, Тэг и Группа */}
            <div className="p-3 bg-zinc-950 border border-white/10 space-y-2.5">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block border-b border-white/[0.06] pb-1">
                01 // ОСНОВНАЯ ИНФОРМАЦИЯ О КОМАНДЕ
              </span>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold">НАЗВАНИЕ КОМАНДЫ *</label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Например: TRIQ или Phoenix"
                    className="w-full bg-black border border-white/15 p-2 text-white font-sans text-xs focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold">КЛАН-ТЕГ</label>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value.toUpperCase())}
                    placeholder="TRIQ"
                    maxLength={6}
                    className="w-full bg-black border border-white/15 p-2 text-white font-mono text-xs uppercase focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase block font-bold">ОСНОВНАЯ УЧЕБНАЯ ГРУППА КОМАНДЫ</label>
                <input
                  type="text"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  placeholder="9ПО-43к (или Сборная колледжа)"
                  className="w-full bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Выбор аватарки/логотипа команды */}
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-400 uppercase font-bold">АВАТАРКА / ЛОГОТИП КОМАНДЫ:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAvatarTab('presets')}
                      className={`px-1.5 py-0.5 text-[9px] font-bold uppercase ${avatarTab === 'presets' ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white'}`}
                    >
                      ПРЕСЕТЫ
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarTab('url')}
                      className={`px-1.5 py-0.5 text-[9px] font-bold uppercase ${avatarTab === 'url' ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white'}`}
                    >
                      URL
                    </button>
                  </div>
                </div>

                {avatarTab === 'presets' ? (
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {AVATAR_PRESETS.map((preset) => {
                      const isSelected = selectedAvatarPreset === preset.id && !customAvatarUrl;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSelectedAvatarPreset(preset.id);
                            setCustomAvatarUrl('');
                            triggerHaptic('light');
                          }}
                          className={`p-2 rounded-xs border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? 'bg-zinc-800 border-amber-400 shadow-md scale-105'
                              : 'bg-black/60 border-white/10 hover:border-white/30'
                          }`}
                          title={preset.name}
                        >
                          <span className="text-lg select-none">{preset.icon}</span>
                          <span className="text-[8px] font-mono text-zinc-400 truncate max-w-full">
                            {preset.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="url"
                      value={customAvatarUrl}
                      onChange={(e) => setCustomAvatarUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                    />
                    <span className="text-[9px] text-zinc-500 block">Прямая ссылка на PNG/JPG логотип команды</span>
                  </div>
                )}
              </div>
            </div>

            {/* БЛОК 2: Капитан Команды */}
            <div className="p-3 bg-zinc-950 border border-amber-500/40 space-y-2.5">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-1">
                <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>02 // КАПИТАН КОМАНДЫ (IGL)</span>
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">СВЯЗЬ И КООРДИНАЦИЯ</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-400 uppercase block font-bold">НИКНЕЙМ КАПИТАНА *</label>
                  <input
                    type="text"
                    value={captainNick}
                    onChange={(e) => setCaptainNick(e.target.value)}
                    placeholder="wxrry"
                    className="w-full bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-400 uppercase block font-bold">TELEGRAM ДЛЯ СВЯЗИ *</label>
                  <input
                    type="text"
                    value={captainTg}
                    onChange={(e) => setCaptainTg(e.target.value)}
                    placeholder="@username"
                    className="w-full bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold">FACEIT ПРОФИЛЬ / ELO</label>
                  <input
                    type="text"
                    value={captainFaceit}
                    onChange={(e) => setCaptainFaceit(e.target.value)}
                    placeholder="faceit.com/ru/players/... или 2100 ELO"
                    className="w-full bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold">ГРУППА КАПИТАНА</label>
                  <input
                    type="text"
                    value={captainGroup}
                    onChange={(e) => setCaptainGroup(e.target.value)}
                    placeholder="9ПО-43к"
                    className="w-full bg-black border border-white/15 p-1.5 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* БЛОК 3: Игроки 2, 3, 4, 5 (Основной состав) */}
            <div className="p-3 bg-zinc-950 border border-white/10 space-y-2.5">
              <span className="text-[10px] text-zinc-300 uppercase font-bold tracking-wider block border-b border-white/[0.08] pb-1">
                03 // ОСНОВНОЙ СОСТАВ (4 ИГРОКА: НИК, FACEIT, ГРУППА)
              </span>

              {/* Игрок 2 */}
              <div className="p-2 bg-black border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[9px] text-zinc-400 uppercase font-bold">
                  <span>ИГРОК 2:</span>
                  <select
                    value={player2.role}
                    onChange={(e) => setPlayer2({ ...player2, role: e.target.value })}
                    className="bg-zinc-900 border border-white/15 text-amber-300 text-[9px] px-1 py-0.5"
                  >
                    <option value="Снайпер (AWP)">Снайпер (AWP)</option>
                    <option value="Рифлер (Entry)">Рифлер (Entry)</option>
                    <option value="Опорник (Anchor)">Опорник (Anchor)</option>
                    <option value="Саппорт (Support)">Саппорт (Support)</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    value={player2.nick}
                    onChange={(e) => setPlayer2({ ...player2, nick: e.target.value })}
                    placeholder="Никнейм *"
                    className="bg-zinc-950 border border-white/15 p-1 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={player2.faceit}
                    onChange={(e) => setPlayer2({ ...player2, faceit: e.target.value })}
                    placeholder="Faceit ник / ELO"
                    className="bg-zinc-950 border border-white/15 p-1 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={player2.group}
                    onChange={(e) => setPlayer2({ ...player2, group: e.target.value })}
                    placeholder="Группа (9ПО-43к)"
                    className="bg-zinc-950 border border-white/15 p-1 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Игрок 3 */}
              <div className="p-2 bg-black border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[9px] text-zinc-400 uppercase font-bold">
                  <span>ИГРОК 3:</span>
                  <select
                    value={player3.role}
                    onChange={(e) => setPlayer3({ ...player3, role: e.target.value })}
                    className="bg-zinc-900 border border-white/15 text-amber-300 text-[9px] px-1 py-0.5"
                  >
                    <option value="Рифлер (Entry)">Рифлер (Entry)</option>
                    <option value="Снайпер (AWP)">Снайпер (AWP)</option>
                    <option value="Опорник (Anchor)">Опорник (Anchor)</option>
                    <option value="Саппорт (Support)">Саппорт (Support)</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    value={player3.nick}
                    onChange={(e) => setPlayer3({ ...player3, nick: e.target.value })}
                    placeholder="Никнейм *"
                    className="bg-zinc-950 border border-white/15 p-1 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={player3.faceit}
                    onChange={(e) => setPlayer3({ ...player3, faceit: e.target.value })}
                    placeholder="Faceit ник / ELO"
                    className="bg-zinc-950 border border-white/15 p-1 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={player3.group}
                    onChange={(e) => setPlayer3({ ...player3, group: e.target.value })}
                    placeholder="Группа (9ПО-43к)"
                    className="bg-zinc-950 border border-white/15 p-1 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Игрок 4 */}
              <div className="p-2 bg-black border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[9px] text-zinc-400 uppercase font-bold">
                  <span>ИГРОК 4:</span>
                  <select
                    value={player4.role}
                    onChange={(e) => setPlayer4({ ...player4, role: e.target.value })}
                    className="bg-zinc-900 border border-white/15 text-amber-300 text-[9px] px-1 py-0.5"
                  >
                    <option value="Опорник (Anchor)">Опорник (Anchor)</option>
                    <option value="Снайпер (AWP)">Снайпер (AWP)</option>
                    <option value="Рифлер (Entry)">Рифлер (Entry)</option>
                    <option value="Саппорт (Support)">Саппорт (Support)</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    value={player4.nick}
                    onChange={(e) => setPlayer4({ ...player4, nick: e.target.value })}
                    placeholder="Никнейм *"
                    className="bg-zinc-950 border border-white/15 p-1 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={player4.faceit}
                    onChange={(e) => setPlayer4({ ...player4, faceit: e.target.value })}
                    placeholder="Faceit ник / ELO"
                    className="bg-zinc-950 border border-white/15 p-1 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={player4.group}
                    onChange={(e) => setPlayer4({ ...player4, group: e.target.value })}
                    placeholder="Группа (9ПО-43к)"
                    className="bg-zinc-950 border border-white/15 p-1 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Игрок 5 */}
              <div className="p-2 bg-black border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[9px] text-zinc-400 uppercase font-bold">
                  <span>ИГРОК 5:</span>
                  <select
                    value={player5.role}
                    onChange={(e) => setPlayer5({ ...player5, role: e.target.value })}
                    className="bg-zinc-900 border border-white/15 text-amber-300 text-[9px] px-1 py-0.5"
                  >
                    <option value="Саппорт (Support)">Саппорт (Support)</option>
                    <option value="Опорник (Anchor)">Опорник (Anchor)</option>
                    <option value="Снайпер (AWP)">Снайпер (AWP)</option>
                    <option value="Рифлер (Entry)">Рифлер (Entry)</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    value={player5.nick}
                    onChange={(e) => setPlayer5({ ...player5, nick: e.target.value })}
                    placeholder="Никнейм *"
                    className="bg-zinc-950 border border-white/15 p-1 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={player5.faceit}
                    onChange={(e) => setPlayer5({ ...player5, faceit: e.target.value })}
                    placeholder="Faceit ник / ELO"
                    className="bg-zinc-950 border border-white/15 p-1 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={player5.group}
                    onChange={(e) => setPlayer5({ ...player5, group: e.target.value })}
                    placeholder="Группа (9ПО-43к)"
                    className="bg-zinc-950 border border-white/15 p-1 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* БЛОК 4: Запасной игрок (опционально) */}
            <div className="p-3 bg-zinc-950 border border-white/10 space-y-2">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">
                04 // ЗАПАСНОЙ ИГРОК (ОПЦИОНАЛЬНО)
              </span>

              <div className="grid grid-cols-3 gap-1.5">
                <input
                  type="text"
                  value={substitute.nick}
                  onChange={(e) => setSubstitute({ ...substitute, nick: e.target.value })}
                  placeholder="Запасной: ник"
                  className="bg-black border border-white/15 p-1.5 text-zinc-300 text-xs font-mono focus:border-amber-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={substitute.faceit}
                  onChange={(e) => setSubstitute({ ...substitute, faceit: e.target.value })}
                  placeholder="Faceit ник / ELO"
                  className="bg-black border border-white/15 p-1.5 text-zinc-300 text-xs font-mono focus:border-amber-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={substitute.group}
                  onChange={(e) => setSubstitute({ ...substitute, group: e.target.value })}
                  placeholder="Группа запасного"
                  className="bg-black border border-white/15 p-1.5 text-zinc-300 text-xs font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ПОДАТЬ ЗАЯВКУ КОМАНДЫ НА ТУРНИР</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
