import React, { useState } from 'react';
import { 
  X, 
  Trophy, 
  Plus, 
  Users, 
  GitBranch, 
  Calendar, 
  Check, 
  Settings, 
  AlertCircle 
} from 'lucide-react';
import { useTelegramBackButton, triggerHaptic } from '../utils/telegram';
import { 
  getAllTournaments, 
  saveAllTournaments, 
  getTournamentRegistrations, 
  createNewTournament,
  generateSingleEliminationBracket 
} from '../utils/tournamentManager';

export default function TournamentOrganizerModal({ isOpen, onClose, onTournamentsUpdated }) {
  useTelegramBackButton(isOpen, onClose);

  const [activeTab, setActiveTab] = useState('manage'); // 'manage' or 'create'
  const [tournaments, setTournaments] = useState(() => getAllTournaments());
  const [selectedTournId, setSelectedTournId] = useState(() => tournaments[0]?.id || 'winter_major_2026');

  // New Tournament Form State
  const [newTitle, setNewTitle] = useState('');
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newSlots, setNewSlots] = useState('8');
  const [newFormat, setNewFormat] = useState('Single Elimination · Best of 3 (5v5)');
  const [newPrize, setNewPrize] = useState('Кубок колледжа AITU + Медали');

  const [feedbackMsg, setFeedbackMsg] = useState('');

  if (!isOpen) return null;

  const currentTourn = tournaments.find(t => t.id === selectedTournId) || tournaments[0];
  const registeredTeams = currentTourn ? getTournamentRegistrations(currentTourn.id) : [];

  const handleCreateTournament = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created = createNewTournament({
      title: newTitle,
      subTitle: newSubTitle,
      date: newDate || 'Ноябрь 2026',
      maxTeams: Number(newSlots),
      format: newFormat,
      prizePool: newPrize
    });

    const refreshed = getAllTournaments();
    setTournaments(refreshed);
    setSelectedTournId(created.id);
    setActiveTab('manage');
    setFeedbackMsg(`Турнир «${created.title}» успешно создан!`);
    triggerHaptic('success');
    if (onTournamentsUpdated) onTournamentsUpdated(refreshed);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  const handleGenerateBracket = () => {
    if (registeredTeams.length < 2) {
      alert("Для генерации сетки необходимо минимум 2 зарегистрированные команды.");
      return;
    }

    const teamNames = registeredTeams.map(t => t.teamName);
    const bracket = generateSingleEliminationBracket(teamNames);

    const updatedTournaments = tournaments.map(t => {
      if (t.id === currentTourn.id) {
        return {
          ...t,
          status: "ИДЁТ ТУРНИР",
          statusBadge: "bg-amber-950/60 border-amber-500/50 text-amber-300 font-bold",
          bracket
        };
      }
      return t;
    });

    saveAllTournaments(updatedTournaments);
    setTournaments(updatedTournaments);
    setFeedbackMsg("Турнирная сетка плей-офф успешно сформирована!");
    triggerHaptic('success');
    if (onTournamentsUpdated) onTournamentsUpdated(updatedTournaments);
    setTimeout(() => setFeedbackMsg(''), 3000);
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
              <Settings className="w-3 h-3 text-amber-400" />
              <span>ПАНЕЛЬ ОРГАНИЗАТОРА ТУРНИРОВ</span>
            </span>
            <h3 className="text-lg font-black text-white font-sans tracking-tight">
              Управление чемпионатами колледжа
            </h3>
          </div>

          <button 
            onClick={onClose}
            className="p-1 border border-white/10 hover:border-white text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-black border border-white/10 text-xs font-mono">
          <button
            onClick={() => setActiveTab('manage')}
            className={`py-1.5 uppercase font-bold text-center transition-colors ${
              activeTab === 'manage' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            УПРАВЛЕНИЕ ЗАЯВКАМИ
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-1.5 uppercase font-bold text-center transition-colors flex items-center justify-center gap-1 ${
              activeTab === 'create' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>СОЗДАТЬ ТУРНИР</span>
          </button>
        </div>

        {feedbackMsg && (
          <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* TAB 1: MANAGE TOURNAMENT & BRACKET */}
        {activeTab === 'manage' && (
          <div className="space-y-3 font-mono text-xs">
            {/* Tournament Selector */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold block">
                ВЫБЕРИТЕ ТУРНИР ДЛЯ УПРАВЛЕНИЯ:
              </label>
              <select
                value={selectedTournId}
                onChange={(e) => setSelectedTournId(e.target.value)}
                className="w-full bg-black border border-white/20 p-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              >
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Current Tournament Info Card */}
            {currentTourn && (
              <div className="p-3 bg-zinc-950 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase ${currentTourn.statusBadge}`}>
                    {currentTourn.status}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Слотов: {registeredTeams.length} / {currentTourn.maxTeams || 8}
                  </span>
                </div>
                <div className="text-white font-sans font-bold text-sm">
                  {currentTourn.title}
                </div>
                <div className="text-[10px] text-zinc-400 font-sans">
                  {currentTourn.format} · {currentTourn.date}
                </div>
              </div>
            )}

            {/* Registered Teams List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase font-bold">
                <span>ПОДТВЕРЖДЕННЫЕ КОМАНДЫ ({registeredTeams.length}):</span>
                <span className="text-amber-400">CS2 ROSTERS</span>
              </div>

              {registeredTeams.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {registeredTeams.map((team, idx) => (
                    <div 
                      key={team.id || idx}
                      className="p-2 bg-black border border-white/10 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-400 font-bold">[{team.tag || team.teamName}]</span>
                          <span className="text-white font-bold font-sans">{team.teamName}</span>
                          <span className="text-[9px] text-zinc-500 font-mono">({team.group})</span>
                        </div>
                        <div className="text-[9px] text-zinc-400 mt-0.5">
                          Капитан: <strong className="text-zinc-200">{team.captainNick}</strong> ({team.captainTg})
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[8px] font-bold uppercase">
                        {team.status || 'OK'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-black/50 border border-white/5 text-center text-zinc-500 text-[10px]">
                  Пока нет зарегистрированных команд на этот турнир
                </div>
              )}
            </div>

            {/* Actions: Generate Bracket */}
            <div className="pt-2 border-t border-white/[0.08] space-y-2">
              <button
                onClick={handleGenerateBracket}
                disabled={registeredTeams.length < 2}
                className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>СГЕНЕРИРОВАТЬ СЕТКУ ПЛЕЙ-ОФФ</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: CREATE TOURNAMENT */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateTournament} className="space-y-3 font-mono text-xs">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold block">
                НАЗВАНИЕ ТУРНИРА *
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="AITU CS2 Winter Cup 2026"
                className="w-full bg-black border border-white/20 p-2 text-white font-sans text-xs focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold block">
                ПОДЗАГОЛОВОК / ОПИСАНИЕ
              </label>
              <input
                type="text"
                value={newSubTitle}
                onChange={(e) => setNewSubTitle(e.target.value)}
                placeholder="Первенство колледжа среди групп 1-4 курсов"
                className="w-full bg-black border border-white/20 p-2 text-white font-sans text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase font-bold block">
                  КОЛИЧЕСТВО СЛОТОВ
                </label>
                <select
                  value={newSlots}
                  onChange={(e) => setNewSlots(e.target.value)}
                  className="w-full bg-black border border-white/20 p-2 text-white text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="4">4 команды (1/2 + Финал)</option>
                  <option value="8">8 команд (1/4 + 1/2 + Финал)</option>
                  <option value="16">16 команд (1/8 + 1/4 + 1/2 + Финал)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase font-bold block">
                  ДАТА ПРОВЕДЕНИЯ
                </label>
                <input
                  type="text"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  placeholder="23-24 ноября 2026"
                  className="w-full bg-black border border-white/20 p-2 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold block">
                ФОРМАТ МАТЧЕЙ
              </label>
              <input
                type="text"
                value={newFormat}
                onChange={(e) => setNewFormat(e.target.value)}
                placeholder="Single Elimination · Best of 3 (5v5)"
                className="w-full bg-black border border-white/20 p-2 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold block">
                ПРИЗОВОЙ ФОНД
              </label>
              <input
                type="text"
                value={newPrize}
                onChange={(e) => setNewPrize(e.target.value)}
                placeholder="Кубок колледжа + Мерч + Медали"
                className="w-full bg-black border border-white/20 p-2 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5 mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ОПУБЛИКОВАТЬ ТУРНИР В СИСТЕМЕ</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
