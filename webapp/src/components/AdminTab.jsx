import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Trophy, 
  Users, 
  GitBranch, 
  Plus, 
  Trash2, 
  Edit3, 
  Upload, 
  Image as ImageIcon, 
  ExternalLink, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  FileText, 
  Send, 
  Download, 
  Terminal, 
  Flame,
  Award,
  ChevronRight,
  Camera,
  X,
  Activity,
  Cpu,
  HardDrive,
  Server,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { 
  getAllTournaments, 
  saveAllTournaments, 
  getTournamentRegistrations, 
  createNewTournament,
  updateTournament,
  deleteTournament,
  deleteTournamentRegistration,
  saveTeamWithAvatar,
  generateSingleEliminationBracket,
  exportAllTournamentData,
  importAllTournamentData,
  restoreDefaultTournaments,
  syncTournamentsFromApi
} from '../utils/tournamentManager';
import { isSuperAdmin, SUPERADMIN_IDS } from '../utils/userProfile';
import { triggerHaptic, openBotCommand, tg } from '../utils/telegram';
import BracketTree from './BracketTree';

export default function AdminTab({ profile }) {
  const isAuthorized = isSuperAdmin(profile?.id);

  // Tabs inside Admin Panel: 'tournaments', 'teams', 'bracket', 'broadcast', 'system'
  const [adminTab, setAdminTab] = useState('tournaments');

  // Tournaments state
  const [tournaments, setTournaments] = useState(() => getAllTournaments());
  const [selectedTournId, setSelectedTournId] = useState(() => tournaments[0]?.id || '');

  // Notification message
  const [alertMsg, setAlertMsg] = useState(null);

  // System Metrics & Controller Monitoring State
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthResults, setHealthResults] = useState(null);

  const fetchSystemMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const res = await fetch('/api/admin/system');
      if (res.ok) {
        const data = await res.json();
        setSystemMetrics(data);
      }
    } catch (e) {
      console.warn('Failed to load system metrics', e);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const runApiDiagnostics = async () => {
    setIsCheckingHealth(true);
    triggerHaptic('medium');
    const endpoints = [
      { name: '/health (Liveness)', path: '/health' },
      { name: '/api/health (REST API)', path: '/api/health' },
      { name: '/api/stats (Database Stats)', path: '/api/stats' },
      { name: '/api/groups (College Groups)', path: '/api/groups' },
      { name: '/api/tournaments (Tournaments DB)', path: '/api/tournaments' },
      { name: '/api/admin/system (Metrics Engine)', path: '/api/admin/system' }
    ];

    const results = [];
    for (const ep of endpoints) {
      const start = performance.now();
      try {
        const res = await fetch(ep.path);
        const latency = Math.round(performance.now() - start);
        results.push({
          name: ep.name,
          path: ep.path,
          status: res.status,
          ok: res.ok,
          latency
        });
      } catch (err) {
        results.push({
          name: ep.name,
          path: ep.path,
          status: 'ERR',
          ok: false,
          latency: Math.round(performance.now() - start)
        });
      }
    }
    setHealthResults(results);
    setIsCheckingHealth(false);
    triggerHaptic('success');
  };

  useEffect(() => {
    if (adminTab === 'system') {
      fetchSystemMetrics();
    }
  }, [adminTab]);

  // New / Edit Tournament Form
  const [isEditingTourn, setIsEditingTourn] = useState(false);
  const [tournForm, setTournForm] = useState({
    title: '',
    subTitle: '',
    discipline: 'CS2',
    date: 'Ноябрь 2026',
    format: 'Single Elimination · Best of 3 (5v5)',
    maxTeams: 8,
    prizePool: 'Кубок колледжа + Мерч + Медали',
    status: 'ПРИЁМ ЗАЯВОК',
    statusBadge: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 font-bold',
    winner: '',
    secondPlace: '',
    thirdPlace: ''
  });

  // Team Form
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({
    id: null,
    teamName: '',
    tag: '',
    group: '9ПО-43к',
    captainNick: '',
    captainTg: '',
    captainSteamId: '',
    player1: '',
    player2: '',
    player3: '',
    player4: '',
    substitute: '',
    avatarUrl: null,
    avatarPreset: 'triq',
    status: 'ПОДТВЕРЖДЕНА'
  });

  // Announcements state
  const [announcements, setAnnouncements] = useState(() => {
    try {
      const saved = localStorage.getItem('aitu_admin_announcements');
      return saved ? JSON.parse(saved) : [
        {
          id: 'ann_1',
          title: 'Официальный старт AITU CS2 Winter Championship',
          text: 'Регистрация открыта через Mini App. Капитанам подтвердить составы.',
          date: '17.10.2026',
          type: 'tournament'
        }
      ];
    } catch (e) {
      return [];
    }
  });
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnText, setNewAnnText] = useState('');
  const [newAnnType, setNewAnnType] = useState('tournament');

  const notify = (text, type = 'success') => {
    setAlertMsg({ text, type });
    triggerHaptic(type === 'success' ? 'success' : 'error');
    setTimeout(() => setAlertMsg(null), 3500);
  };

  const currentTourn = tournaments.find(t => t.id === selectedTournId) || tournaments[0];
  const registeredTeams = currentTourn ? getTournamentRegistrations(currentTourn.id) : [];

  const refreshTournaments = () => {
    const list = getAllTournaments();
    setTournaments(list);
  };

  useEffect(() => {
    syncTournamentsFromApi();

    const handleUpdated = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setTournaments(e.detail);
      }
    };
    window.addEventListener('aitu_tournaments_updated', handleUpdated);
    return () => window.removeEventListener('aitu_tournaments_updated', handleUpdated);
  }, []);

  // 1. Управление турнирами
  const handleSaveTournament = (e) => {
    e.preventDefault();
    if (!tournForm.title.trim()) {
      notify('Укажите название турнира', 'error');
      return;
    }

    if (isEditingTourn && selectedTournId) {
      updateTournament(selectedTournId, {
        ...tournForm,
        maxTeams: Number(tournForm.maxTeams)
      });
      notify(`Турнир «${tournForm.title}» обновлен!`);
    } else {
      const created = createNewTournament({
        ...tournForm,
        maxTeams: Number(tournForm.maxTeams)
      });
      setSelectedTournId(created.id);
      notify(`Турнир «${created.title}» создан!`);
    }

    refreshTournaments();
    setIsEditingTourn(false);
  };

  const handleDeleteCurrentTournament = () => {
    if (!currentTourn) return;
    if (confirm(`Вы уверены, что хотите удалить турнир «${currentTourn.title}»?`)) {
      deleteTournament(currentTourn.id);
      const remaining = getAllTournaments();
      setTournaments(remaining);
      setSelectedTournId(remaining[0]?.id || '');
      notify('Турнир удален', 'error');
    }
  };

  // 2. Управление командами и аватарками
  const handleAvatarFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      notify('Размер изображения не должен превышать 2 МБ', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setTeamForm(prev => ({
        ...prev,
        avatarUrl: reader.result,
        avatarPreset: null
      }));
      notify('Логотип команды успешно загружен!');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTeam = (e) => {
    e.preventDefault();
    if (!currentTourn) {
      notify('Сначала выберите или создайте турнир', 'error');
      return;
    }
    if (!teamForm.teamName.trim()) {
      notify('Укажите название команды', 'error');
      return;
    }

    const players = [teamForm.player1, teamForm.player2, teamForm.player3, teamForm.player4].filter(Boolean);

    saveTeamWithAvatar(currentTourn.id, {
      id: teamForm.id,
      teamName: teamForm.teamName,
      tag: teamForm.tag || teamForm.teamName.slice(0, 4),
      group: teamForm.group,
      captainNick: teamForm.captainNick || 'Captain',
      captainTg: teamForm.captainTg || '@captain',
      captainSteamId: teamForm.captainSteamId,
      players,
      substitute: teamForm.substitute,
      avatarUrl: teamForm.avatarUrl,
      avatarPreset: teamForm.avatarPreset,
      status: teamForm.status
    });

    notify(`Команда «${teamForm.teamName}» сохранена!`);
    setIsEditingTeam(false);
    refreshTournaments();
    setTeamForm({
      id: null,
      teamName: '',
      tag: '',
      group: '9ПО-43к',
      captainNick: '',
      captainTg: '',
      captainSteamId: '',
      player1: '',
      player2: '',
      player3: '',
      player4: '',
      substitute: '',
      avatarUrl: null,
      avatarPreset: 'triq',
      status: 'ПОДТВЕРЖДЕНА'
    });
  };

  const handleDeleteTeam = (teamId, teamName) => {
    if (confirm(`Удалить команду «${teamName}» из турнира?`)) {
      deleteTournamentRegistration(currentTourn.id, teamId);
      refreshTournaments();
      notify(`Команда «${teamName}» удалена`);
    }
  };

  // 3. Генерация сетки и скоринг
  const handleGenerateBracket = () => {
    if (!currentTourn) return;
    if (registeredTeams.length < 2) {
      notify('Необходимо минимум 2 зарегистрированные команды', 'error');
      return;
    }

    const teamNames = registeredTeams.map(t => t.teamName);
    const bracket = generateSingleEliminationBracket(teamNames);

    updateTournament(currentTourn.id, {
      status: 'ИДЁТ ТУРНИР',
      statusBadge: 'bg-amber-950/60 border-amber-500/50 text-amber-300 font-bold',
      bracket
    });

    refreshTournaments();
    notify('Турнирная сетка плей-офф сгенерирована!');
  };

  // Обновление счета в сгенерированной сетке
  const handleUpdateBracketMatchScore = (roundKey, matchIdx, score1, score2) => {
    if (!currentTourn?.bracket) return;

    const newBracket = JSON.parse(JSON.stringify(currentTourn.bracket));
    const roundMatches = roundKey === 'final' ? [newBracket.final] : newBracket[roundKey];
    if (!roundMatches || !roundMatches[matchIdx]) return;

    const targetMatch = roundMatches[matchIdx];
    targetMatch.team1.score = Number(score1);
    targetMatch.team2.score = Number(score2);
    targetMatch.team1.isWinner = Number(score1) > Number(score2);
    targetMatch.team2.isWinner = Number(score2) > Number(score1);

    // Автоматическое продвижение в финал если это полуфиналы
    if (roundKey === 'semifinals' && newBracket.final) {
      const winnerName = targetMatch.team1.isWinner ? targetMatch.team1.name : (targetMatch.team2.isWinner ? targetMatch.team2.name : null);
      if (winnerName) {
        if (matchIdx === 0) newBracket.final.team1.name = winnerName;
        if (matchIdx === 1) newBracket.final.team2.name = winnerName;
      }
    }

    // Если обновлен финал - устанавливаем чемпиона
    if (roundKey === 'final') {
      const winnerName = targetMatch.team1.isWinner ? targetMatch.team1.name : (targetMatch.team2.isWinner ? targetMatch.team2.name : null);
      if (winnerName) {
        updateTournament(currentTourn.id, {
          winner: winnerName,
          status: 'ЗАВЕРШЕН',
          statusBadge: 'bg-zinc-900 border-white/20 text-zinc-300'
        });
      }
    }

    updateTournament(currentTourn.id, { bracket: newBracket });
    refreshTournaments();
    notify('Счет матча обновлен!');
  };

  // Прикрепление скриншота итогов матча (табло счёта)
  const handleUploadMatchScreenshot = (roundKey, matchIdx, file) => {
    if (!file || !currentTourn?.bracket) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const newBracket = JSON.parse(JSON.stringify(currentTourn.bracket));
      const roundMatches = roundKey === 'final' ? [newBracket.final] : newBracket[roundKey];
      if (roundMatches && roundMatches[matchIdx]) {
        roundMatches[matchIdx].screenshotUrl = dataUrl;
        updateTournament(currentTourn.id, { bracket: newBracket });
        refreshTournaments();
        notify('Скриншот итогов матча успешно прикреплен!');
      }
    };
    reader.readAsDataURL(file);
  };

  // 4. Объявления
  const handleAddAnnouncement = (e) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnText.trim()) return;

    const newEntry = {
      id: `ann_${Date.now()}`,
      title: newAnnTitle.trim(),
      text: newAnnText.trim(),
      date: new Date().toLocaleDateString('ru-RU'),
      type: newAnnType
    };

    const updated = [newEntry, ...announcements];
    setAnnouncements(updated);
    try {
      localStorage.setItem('aitu_admin_announcements', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }

    setNewAnnTitle('');
    setNewAnnText('');
    notify('Объявление опубликовано во всех разделах Mini App!');
  };

  const handleDeleteAnnouncement = (id) => {
    const updated = announcements.filter(a => a.id !== id);
    setAnnouncements(updated);
    try {
      localStorage.setItem('aitu_admin_announcements', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
    notify('Объявление удалено');
  };

  // Если пользователь не в списке суперадминов
  if (!isAuthorized) {
    return (
      <div className="p-6 bg-[#0e0e11] border border-rose-500/30 text-center space-y-4 font-mono animate-fadeIn">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-950/60 border border-rose-500/60 flex items-center justify-center text-rose-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white uppercase tracking-tight">
            ДОСТУП ОГРАНИЧЕН // СУПЕРАДМИНИСТРАТОР
          </h3>
          <p className="text-[11px] text-zinc-400 font-sans leading-relaxed max-w-sm mx-auto">
            Данный раздел доступен исключительно авторизованным администраторам системы управления <strong>@controlleraitubot</strong>.
          </p>
          <div className="pt-2 text-[10px] text-zinc-500">
            Ваш текущий ID: <span className="text-zinc-300 font-bold">{profile?.id || 'не определен'}</span>
          </div>
        </div>
        <a
          href="https://t.me/controlleraitubot"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-white/20 hover:border-amber-400 text-amber-300 text-xs uppercase font-bold transition-colors"
        >
          <span>ОТКРЫТЬ @controlleraitubot</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-mono text-xs pb-16 animate-fadeIn">
      {/* 1. Header Banner & Controller Bot status */}
      <div className="p-4 bg-[#0a0a0c] border border-amber-500/40 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 text-[10px]">
          <span className="text-amber-400 uppercase tracking-widest font-black flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>ROOT ADMIN PANEL // @controlleraitubot</span>
          </span>
          <span className="px-1.5 py-0.2 bg-amber-950 border border-amber-500/40 text-amber-300 font-bold text-[9px] uppercase">
            SUPERADMIN: {profile?.id}
          </span>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight font-sans uppercase">
              ЦЕНТР УПРАВЛЕНИЯ ТУРНИРАМИ И СИСТЕМОЙ
            </h2>
            <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
              Организация CS2 чемпионатов, кастомные аватарки, генератор сеток и администрирование сети
            </p>
          </div>

          <a
            href="https://t.me/controlleraitubot"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-mono text-[10px] uppercase font-black transition-colors flex items-center gap-1.5"
          >
            <span>БОТ @controlleraitubot</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Alert toast */}
      {alertMsg && (
        <div className={`p-2.5 border text-[11px] flex items-center gap-2 animate-fadeIn ${
          alertMsg.type === 'error' 
            ? 'bg-rose-950/60 border-rose-500/60 text-rose-300' 
            : 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
        }`}>
          {alertMsg.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* 2. Admin Navigation Subtabs */}
      <div className="grid grid-cols-5 gap-1 p-1 bg-black/60 border border-white/10 text-[10px] font-mono">
        <button
          onClick={() => { setAdminTab('tournaments'); triggerHaptic('selection'); }}
          className={`py-2 px-1 uppercase tracking-wider font-bold transition-colors text-center truncate ${
            adminTab === 'tournaments' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          ТУРНИРЫ
        </button>
        <button
          onClick={() => { setAdminTab('teams'); triggerHaptic('selection'); }}
          className={`py-2 px-1 uppercase tracking-wider font-bold transition-colors text-center truncate ${
            adminTab === 'teams' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          КОМАНДЫ
        </button>
        <button
          onClick={() => { setAdminTab('bracket'); triggerHaptic('selection'); }}
          className={`py-2 px-1 uppercase tracking-wider font-bold transition-colors text-center truncate ${
            adminTab === 'bracket' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          СЕТКА
        </button>
        <button
          onClick={() => { setAdminTab('broadcast'); triggerHaptic('selection'); }}
          className={`py-2 px-1 uppercase tracking-wider font-bold transition-colors text-center truncate ${
            adminTab === 'broadcast' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          ИНФО
        </button>
        <button
          onClick={() => { setAdminTab('system'); triggerHaptic('selection'); }}
          className={`py-2 px-1 uppercase tracking-wider font-bold transition-colors text-center truncate ${
            adminTab === 'system' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          СИСТЕМА
        </button>
      </div>

      {/* ========================================================
          SUBTAB 1: ТУРНИРЫ (ДОБАВЛЕНИЕ, РЕДАКТИРОВАНИЕ, СТАТУСЫ)
          ======================================================== */}
      {adminTab === 'tournaments' && (
        <div className="space-y-4">
          {/* Active Tournament Selector Bar */}
          <div className="p-3 bg-[#0e0e11] border border-white/10 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">
                ВЫБЕРИТЕ ТУРНИР ДЛЯ УПРАВЛЕНИЯ:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const list = restoreDefaultTournaments();
                    setTournaments(list);
                    setSelectedTournId(list[0]?.id || 'aitu_pro_league_s1');
                    notify('Официальный турнир AITU PRO LEAGUE S1 успешно восстановлен!');
                  }}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 uppercase font-bold flex items-center gap-1 cursor-pointer"
                  title="Восстановить системные турниры"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>ВОССТАНОВИТЬ</span>
                </button>
                <button
                  onClick={() => {
                    setIsEditingTourn(true);
                    setTournForm({
                      title: '',
                      subTitle: 'Официальный турнир колледжа AITU',
                      discipline: 'CS2',
                      date: 'Декабрь 2026',
                      format: 'Single Elimination · Best of 3 (5v5)',
                      maxTeams: 8,
                      prizePool: 'Кубок колледжа + Медали',
                      status: 'ПРИЁМ ЗАЯВОК',
                      statusBadge: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 font-bold',
                      winner: '',
                      secondPlace: '',
                      thirdPlace: ''
                    });
                    triggerHaptic('light');
                  }}
                  className="text-[10px] text-amber-300 hover:text-white uppercase font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ НОВЫЙ ТУРНИР</span>
                </button>
              </div>
            </div>

            <select
              value={selectedTournId}
              onChange={(e) => setSelectedTournId(e.target.value)}
              className="w-full bg-black border border-white/20 p-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
            >
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title} [{t.status}]
                </option>
              ))}
            </select>
          </div>

          {/* Current Tournament Card */}
          {currentTourn && !isEditingTourn && (
            <div className="p-4 bg-[#0a0a0c] border border-white/10 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${currentTourn.statusBadge}`}>
                  {currentTourn.status}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {currentTourn.date}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white uppercase font-sans">
                  {currentTourn.title}
                </h3>
                <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                  {currentTourn.subTitle} · {currentTourn.format}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 bg-zinc-950 border border-white/5 text-[10px]">
                <div>
                  <span className="text-zinc-500 block">СЛОТЫ КОМАНД:</span>
                  <span className="text-amber-300 font-bold font-mono">
                    {registeredTeams.length} / {currentTourn.maxTeams || 8}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">ПРИЗОВОЙ ФОНД:</span>
                  <span className="text-zinc-200 font-sans truncate block">{currentTourn.prizePool}</span>
                </div>
              </div>

              {currentTourn.winner && (
                <div className="p-2 bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[10px] flex items-center justify-between">
                  <span>🏆 ЧЕМПИОН: <strong>{currentTourn.winner}</strong></span>
                  {currentTourn.secondPlace && <span>🥈 2 место: {currentTourn.secondPlace}</span>}
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/[0.06]">
                <button
                  onClick={() => {
                    setIsEditingTourn(true);
                    setTournForm({
                      title: currentTourn.title,
                      subTitle: currentTourn.subTitle || '',
                      discipline: currentTourn.discipline || 'CS2',
                      date: currentTourn.date || '',
                      format: currentTourn.format || '',
                      maxTeams: currentTourn.maxTeams || 8,
                      prizePool: currentTourn.prizePool || '',
                      status: currentTourn.status || 'ПРИЁМ ЗАЯВОК',
                      statusBadge: currentTourn.statusBadge || 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 font-bold',
                      winner: currentTourn.winner || '',
                      secondPlace: currentTourn.secondPlace || '',
                      thirdPlace: currentTourn.thirdPlace || ''
                    });
                    triggerHaptic('light');
                  }}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/20 text-white font-mono text-[10px] uppercase font-bold flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>РЕДАКТИРОВАТЬ</span>
                </button>

                <button
                  onClick={handleDeleteCurrentTournament}
                  className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 font-mono text-[10px] uppercase font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>УДАЛИТЬ</span>
                </button>
              </div>
            </div>
          )}

          {/* Tournament Form (Create / Edit) */}
          {isEditingTourn && (
            <form onSubmit={handleSaveTournament} className="p-4 bg-[#0a0a0c] border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <span className="text-amber-400 font-bold uppercase text-[10px]">
                  {tournForm.title ? `РЕДАКТИРОВАНИЕ: ${tournForm.title}` : 'СОЗДАНИЕ НОВОГО ТУРНИРА'}
                </span>
                <button 
                  type="button" 
                  onClick={() => setIsEditingTourn(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase block">НАЗВАНИЕ ТУРНИРА *</label>
                <input
                  type="text"
                  value={tournForm.title}
                  onChange={(e) => setTournForm({ ...tournForm, title: e.target.value })}
                  placeholder="AITU CS2 Winter Championship 2026"
                  className="w-full bg-black border border-white/20 p-2 text-white text-xs font-sans focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase block">ПОДЗАГОЛОВОК</label>
                <input
                  type="text"
                  value={tournForm.subTitle}
                  onChange={(e) => setTournForm({ ...tournForm, subTitle: e.target.value })}
                  placeholder="Зимний кубок колледжа среди всех отделений"
                  className="w-full bg-black border border-white/20 p-2 text-white text-xs font-sans focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase block">СТАТУС ТУРНИРА</label>
                  <select
                    value={tournForm.status}
                    onChange={(e) => {
                      const val = e.target.value;
                      let badge = 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 font-bold';
                      if (val === 'ИДЁТ ТУРНИР') badge = 'bg-amber-950/60 border-amber-500/50 text-amber-300 font-bold';
                      if (val === 'ЗАВЕРШЕН') badge = 'bg-zinc-900 border-white/20 text-zinc-300';
                      setTournForm({ ...tournForm, status: val, statusBadge: badge });
                    }}
                    className="w-full bg-black border border-white/20 p-2 text-white text-xs font-mono focus:border-amber-400"
                  >
                    <option value="ПРИЁМ ЗАЯВОК">ПРИЁМ ЗАЯВОК</option>
                    <option value="ИДЁТ ТУРНИР">ИДЁТ ТУРНИР</option>
                    <option value="ЗАВЕРШЕН">ЗАВЕРШЕН</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase block">КОЛИЧЕСТВО СЛОТОВ</label>
                  <select
                    value={tournForm.maxTeams}
                    onChange={(e) => setTournForm({ ...tournForm, maxTeams: Number(e.target.value) })}
                    className="w-full bg-black border border-white/20 p-2 text-white text-xs font-mono focus:border-amber-400"
                  >
                    <option value="4">4 команды (1/2 + Финал)</option>
                    <option value="8">8 команд (1/4 + 1/2 + Финал)</option>
                    <option value="16">16 команд (1/8 + 1/4 + 1/2 + Финал)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase block">ДАТЫ</label>
                  <input
                    type="text"
                    value={tournForm.date}
                    onChange={(e) => setTournForm({ ...tournForm, date: e.target.value })}
                    placeholder="Ноябрь 2026"
                    className="w-full bg-black border border-white/20 p-2 text-white text-xs font-mono focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase block">ФОРМАТ</label>
                  <input
                    type="text"
                    value={tournForm.format}
                    onChange={(e) => setTournForm({ ...tournForm, format: e.target.value })}
                    placeholder="Single Elimination · Best of 3"
                    className="w-full bg-black border border-white/20 p-2 text-white text-xs font-mono focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase block">ПРИЗОВОЙ ФОНД</label>
                <input
                  type="text"
                  value={tournForm.prizePool}
                  onChange={(e) => setTournForm({ ...tournForm, prizePool: e.target.value })}
                  placeholder="Кубок колледжа + Мерч + Медали"
                  className="w-full bg-black border border-white/20 p-2 text-white text-xs font-sans focus:border-amber-400"
                />
              </div>

              {tournForm.status === 'ЗАВЕРШЕН' && (
                <div className="grid grid-cols-3 gap-2 p-2 bg-zinc-950 border border-white/10">
                  <div className="space-y-1">
                    <label className="text-[8px] text-amber-400 uppercase block">1 МЕСТО</label>
                    <input
                      type="text"
                      value={tournForm.winner}
                      onChange={(e) => setTournForm({ ...tournForm, winner: e.target.value })}
                      placeholder="TRIQ"
                      className="w-full bg-black border border-white/15 p-1 text-white text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-zinc-300 uppercase block">2 МЕСТО</label>
                    <input
                      type="text"
                      value={tournForm.secondPlace}
                      onChange={(e) => setTournForm({ ...tournForm, secondPlace: e.target.value })}
                      placeholder="LL TEAM"
                      className="w-full bg-black border border-white/15 p-1 text-white text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-zinc-500 uppercase block">3 МЕСТО</label>
                    <input
                      type="text"
                      value={tournForm.thirdPlace}
                      onChange={(e) => setTournForm({ ...tournForm, thirdPlace: e.target.value })}
                      placeholder="Team V0id"
                      className="w-full bg-black border border-white/15 p-1 text-white text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-white text-black font-bold text-xs uppercase hover:bg-neutral-200 transition-colors"
                >
                  СОХРАНИТЬ ТУРНИР
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTourn(false)}
                  className="px-3 py-2 bg-zinc-900 border border-white/20 text-zinc-400 hover:text-white text-xs uppercase"
                >
                  ОТМЕНА
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ========================================================
          SUBTAB 2: КОМАНДЫ, СОСТАВЫ И ЗАГРУЗКА АВАТАРОК
          ======================================================== */}
      {adminTab === 'teams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-zinc-400 uppercase font-bold">
              КОМАНДЫ В ТУРНИРЕ «{currentTourn?.title || '—'}» ({registeredTeams.length}):
            </span>
            <button
              onClick={() => {
                setIsEditingTeam(true);
                setTeamForm({
                  id: null,
                  teamName: '',
                  tag: '',
                  group: '9ПО-43к',
                  captainNick: '',
                  captainTg: '',
                  captainSteamId: '',
                  player1: '',
                  player2: '',
                  player3: '',
                  player4: '',
                  substitute: '',
                  avatarUrl: null,
                  avatarPreset: 'triq',
                  status: 'ПОДТВЕРЖДЕНА'
                });
                triggerHaptic('light');
              }}
              className="text-[10px] text-amber-300 hover:text-white uppercase font-bold flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>+ ДОБАВИТЬ КОМАНДУ</span>
            </button>
          </div>

          {/* Team Edit / Add Modal/Form */}
          {isEditingTeam && (
            <form onSubmit={handleSaveTeam} className="p-4 bg-[#0a0a0c] border border-amber-500/40 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <span className="text-amber-400 font-bold uppercase text-[10px]">
                  {teamForm.id ? `РЕДАКТИРОВАНИЕ: ${teamForm.teamName}` : 'ДОБАВЛЕНИЕ НОВОЙ КОМАНДЫ'}
                </span>
                <button 
                  type="button" 
                  onClick={() => setIsEditingTeam(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Название и Клан-тег */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase block">НАЗВАНИЕ КОМАНДЫ *</label>
                  <input
                    type="text"
                    value={teamForm.teamName}
                    onChange={(e) => setTeamForm({ ...teamForm, teamName: e.target.value })}
                    placeholder="TRIQ"
                    className="w-full bg-black border border-white/20 p-2 text-white text-xs font-sans focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase block">ТЕГ</label>
                  <input
                    type="text"
                    value={teamForm.tag}
                    onChange={(e) => setTeamForm({ ...teamForm, tag: e.target.value.toUpperCase() })}
                    placeholder="TRIQ"
                    maxLength={6}
                    className="w-full bg-black border border-white/20 p-2 text-white text-xs font-mono uppercase focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* ЗАГРУЗКА АВАТАРКИ / ЛОГОТИПА КОМАНДЫ */}
              <div className="p-3 bg-zinc-950 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>АВАТАРКА / ЛОГОТИП КОМАНДЫ</span>
                  </span>
                  <span className="text-[9px] text-zinc-500">PNG, JPG, SVG, WebP</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Preview avatar */}
                  <div className="w-14 h-14 rounded-xs border border-white/20 bg-black flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {teamForm.avatarUrl ? (
                      <img src={teamForm.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-mono font-bold">
                        {teamForm.tag || teamForm.teamName?.slice(0, 3) || 'ЛОГО'}
                      </span>
                    )}
                  </div>

                  {/* Upload button and clear */}
                  <div className="space-y-1.5 flex-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold uppercase cursor-pointer transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>ЗАГРУЗИТЬ ФАЙЛ С УСТРОЙСТВА</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarFileUpload} 
                        className="hidden" 
                      />
                    </label>

                    {teamForm.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setTeamForm(prev => ({ ...prev, avatarUrl: null }))}
                        className="block text-[9px] text-rose-400 hover:text-rose-300 uppercase underline cursor-pointer"
                      >
                        Удалить аватарку
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Капитан и Группа */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase block">НИК КАПИТАНА</label>
                  <input
                    type="text"
                    value={teamForm.captainNick}
                    onChange={(e) => setTeamForm({ ...teamForm, captainNick: e.target.value })}
                    placeholder="wxrry"
                    className="w-full bg-black border border-white/20 p-1.5 text-white text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase block">TELEGRAM</label>
                  <input
                    type="text"
                    value={teamForm.captainTg}
                    onChange={(e) => setTeamForm({ ...teamForm, captainTg: e.target.value })}
                    placeholder="@wxrry"
                    className="w-full bg-black border border-white/20 p-1.5 text-white text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase block">ГРУППА</label>
                  <input
                    type="text"
                    value={teamForm.group}
                    onChange={(e) => setTeamForm({ ...teamForm, group: e.target.value })}
                    placeholder="9ПО-43к"
                    className="w-full bg-black border border-white/20 p-1.5 text-white text-xs font-mono"
                  />
                </div>
              </div>

              {/* 4 игрока ростера */}
              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase block">ОСНОВНОЙ РОСТЕР (4 ИГРОКА)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={teamForm.player1}
                    onChange={(e) => setTeamForm({ ...teamForm, player1: e.target.value })}
                    placeholder="Игрок 2: ник"
                    className="bg-black border border-white/20 p-1.5 text-white text-xs font-mono"
                  />
                  <input
                    type="text"
                    value={teamForm.player2}
                    onChange={(e) => setTeamForm({ ...teamForm, player2: e.target.value })}
                    placeholder="Игрок 3: ник"
                    className="bg-black border border-white/20 p-1.5 text-white text-xs font-mono"
                  />
                  <input
                    type="text"
                    value={teamForm.player3}
                    onChange={(e) => setTeamForm({ ...teamForm, player3: e.target.value })}
                    placeholder="Игрок 4: ник"
                    className="bg-black border border-white/20 p-1.5 text-white text-xs font-mono"
                  />
                  <input
                    type="text"
                    value={teamForm.player4}
                    onChange={(e) => setTeamForm({ ...teamForm, player4: e.target.value })}
                    placeholder="Игрок 5: ник"
                    className="bg-black border border-white/20 p-1.5 text-white text-xs font-mono"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-white text-black font-bold text-xs uppercase hover:bg-neutral-200 transition-colors"
                >
                  СОХРАНИТЬ КОМАНДУ
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTeam(false)}
                  className="px-3 py-2 bg-zinc-900 border border-white/20 text-zinc-400 hover:text-white text-xs uppercase"
                >
                  ОТМЕНА
                </button>
              </div>
            </form>
          )}

          {/* List of Registered Teams */}
          <div className="space-y-2">
            {registeredTeams.map((team, idx) => {
              return (
                <div
                  key={team.id || idx}
                  className="p-3 bg-[#0a0a0c] border border-white/10 hover:border-white/30 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Team Avatar */}
                    <div className="w-10 h-10 rounded-xs border border-white/20 bg-black flex items-center justify-center overflow-hidden shrink-0">
                      {team.avatarUrl ? (
                        <img src={team.avatarUrl} alt={team.teamName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-amber-400 font-mono text-xs">{team.tag || '#'}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-amber-400 font-bold font-mono">[{team.tag || team.teamName}]</span>
                        <span className="font-bold text-white font-sans text-xs truncate">{team.teamName}</span>
                        <span className="text-[9px] text-zinc-500 font-mono">({team.group})</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                        Капитан: <strong className="text-zinc-200">{team.captainNick}</strong> ({team.captainTg})
                      </div>
                      {team.players && team.players.length > 0 && (
                        <div className="text-[9px] text-zinc-500 truncate">
                          Состав: {team.captainNick}, {team.players.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setIsEditingTeam(true);
                        setTeamForm({
                          id: team.id,
                          teamName: team.teamName,
                          tag: team.tag || '',
                          group: team.group || '9ПО-43к',
                          captainNick: team.captainNick || '',
                          captainTg: team.captainTg || '',
                          captainSteamId: team.captainSteamId || '',
                          player1: team.players?.[0] || '',
                          player2: team.players?.[1] || '',
                          player3: team.players?.[2] || '',
                          player4: team.players?.[3] || '',
                          substitute: team.substitute || '',
                          avatarUrl: team.avatarUrl || null,
                          avatarPreset: team.avatarPreset || 'triq',
                          status: team.status || 'ПОДТВЕРЖДЕНА'
                        });
                        triggerHaptic('light');
                      }}
                      className="p-1.5 border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white"
                      title="Редактировать"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteTeam(team.id, team.teamName)}
                      className="p-1.5 border border-rose-500/20 hover:border-rose-500 text-rose-400 hover:text-rose-200"
                      title="Удалить команду"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          SUBTAB 3: ГЕНЕРАТОР СЕТОК И СКОРИНГ МАТЧЕЙ
          ======================================================== */}
      {adminTab === 'bracket' && (
        <div className="space-y-4">
          <div className="p-3 bg-[#0e0e11] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">
                СЕТКА ДЛЯ ТУРНИРА: {currentTourn?.title}
              </span>
              <span className="text-[10px] text-amber-300">
                {registeredTeams.length} команд готово
              </span>
            </div>

            <button
              onClick={handleGenerateBracket}
              disabled={registeredTeams.length < 2}
              className="w-full py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>{currentTourn?.bracket ? 'ПЕРЕСОЗДАТЬ СЕТКУ ПЛЕЙ-ОФФ' : 'СГЕНЕРИРОВАТЬ СЕТКУ ПЛЕЙ-ОФФ'}</span>
            </button>
          </div>

          {/* Bracket Score Editor */}
          {currentTourn?.bracket ? (
            <div className="space-y-3">
              <div className="p-3 bg-zinc-950 border border-white/10 space-y-2">
                <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block">
                  РЕДАКТОР СЧЕТА МАТЧЕЙ СЕТКИ // LIVE SCORING
                </span>
                <p className="text-[10px] text-zinc-400 font-sans">
                  Укажите счет матчей (например 2:0) для автоматического определения победителя и продвижения команды в следующий раунд:
                </p>

                {/* 1/4 Finals matches scoring if present */}
                {currentTourn.bracket.round2 && currentTourn.bracket.round2.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold">МАТЧИ 1/4 ФИНАЛА:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentTourn.bracket.round2.map((m, idx) => (
                        <div key={idx} className="p-2 bg-black border border-white/10 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-zinc-300 font-bold truncate">{m.team1.name}</span>
                            <input
                              type="number"
                              min="0"
                              max="3"
                              defaultValue={m.team1.score !== null ? m.team1.score : ''}
                              placeholder="0"
                              onBlur={(e) => handleUpdateBracketMatchScore('round2', idx, e.target.value, m.team2.score || 0)}
                              className="w-10 bg-zinc-900 border border-white/20 text-center text-white text-xs font-mono"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-zinc-300 font-bold truncate">{m.team2.name}</span>
                            <input
                              type="number"
                              min="0"
                              max="3"
                              defaultValue={m.team2.score !== null ? m.team2.score : ''}
                              placeholder="0"
                              onBlur={(e) => handleUpdateBracketMatchScore('round2', idx, m.team1.score || 0, e.target.value)}
                              className="w-10 bg-zinc-900 border border-white/20 text-center text-white text-xs font-mono"
                            />
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
                            <label className="flex items-center gap-1 text-[9px] text-zinc-400 hover:text-cyan-400 cursor-pointer">
                              <Camera className="w-3 h-3 text-cyan-400" />
                              <span>{m.screenshotUrl ? 'Скриншот ✓' : '+ Скриншот'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleUploadMatchScreenshot('round2', idx, e.target.files[0])}
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Semifinals matches scoring */}
                {currentTourn.bracket.semifinals && currentTourn.bracket.semifinals.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold">ПОЛУФИНАЛЫ (1/2):</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentTourn.bracket.semifinals.map((m, idx) => (
                        <div key={idx} className="p-2 bg-black border border-white/10 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-zinc-300 font-bold truncate">{m.team1.name}</span>
                            <input
                              type="number"
                              min="0"
                              max="3"
                              defaultValue={m.team1.score !== null ? m.team1.score : ''}
                              placeholder="0"
                              onBlur={(e) => handleUpdateBracketMatchScore('semifinals', idx, e.target.value, m.team2.score || 0)}
                              className="w-10 bg-zinc-900 border border-white/20 text-center text-white text-xs font-mono"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-zinc-300 font-bold truncate">{m.team2.name}</span>
                            <input
                              type="number"
                              min="0"
                              max="3"
                              defaultValue={m.team2.score !== null ? m.team2.score : ''}
                              placeholder="0"
                              onBlur={(e) => handleUpdateBracketMatchScore('semifinals', idx, m.team1.score || 0, e.target.value)}
                              className="w-10 bg-zinc-900 border border-white/20 text-center text-white text-xs font-mono"
                            />
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
                            <label className="flex items-center gap-1 text-[9px] text-zinc-400 hover:text-cyan-400 cursor-pointer">
                              <Camera className="w-3 h-3 text-cyan-400" />
                              <span>{m.screenshotUrl ? 'Скриншот ✓' : '+ Скриншот'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleUploadMatchScreenshot('semifinals', idx, e.target.files[0])}
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grand Final scoring */}
                {currentTourn.bracket.final && (
                  <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                    <span className="text-[9px] text-amber-400 uppercase font-bold">ГРАНД-ФИНАЛ:</span>
                    <div className="p-2 bg-black border border-amber-500/30 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-white font-bold truncate">{currentTourn.bracket.final.team1.name}</span>
                        <input
                          type="number"
                          min="0"
                          max="3"
                          defaultValue={currentTourn.bracket.final.team1.score !== null ? currentTourn.bracket.final.team1.score : ''}
                          placeholder="0"
                          onBlur={(e) => handleUpdateBracketMatchScore('final', 0, e.target.value, currentTourn.bracket.final.team2.score || 0)}
                          className="w-10 bg-zinc-900 border border-white/20 text-center text-white text-xs font-mono"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-white font-bold truncate">{currentTourn.bracket.final.team2.name}</span>
                        <input
                          type="number"
                          min="0"
                          max="3"
                          defaultValue={currentTourn.bracket.final.team2.score !== null ? currentTourn.bracket.final.team2.score : ''}
                          placeholder="0"
                          onBlur={(e) => handleUpdateBracketMatchScore('final', 0, currentTourn.bracket.final.team1.score || 0, e.target.value)}
                          className="w-10 bg-zinc-900 border border-white/20 text-center text-white text-xs font-mono"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-amber-500/20">
                        <label className="flex items-center gap-1 text-[9px] text-amber-300 hover:text-amber-200 cursor-pointer">
                          <Camera className="w-3 h-3 text-amber-400" />
                          <span>{currentTourn.bracket.final.screenshotUrl ? 'Скриншот финала ✓' : '+ Скриншот финала'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleUploadMatchScreenshot('final', 0, e.target.files[0])}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Render dynamic bracket view */}
              <BracketTree bracketData={currentTourn.bracket} />
            </div>
          ) : (
            <div className="p-8 bg-black/60 border border-white/10 text-center text-zinc-500 font-mono text-xs">
              Сетка для данного турнира еще не создана. Нажмите кнопку выше для генерации.
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          SUBTAB 4: ОБЪЯВЛЕНИЯ И ОПОВЕЩЕНИЯ ДЛЯ СЕТИ
          ======================================================== */}
      {adminTab === 'broadcast' && (
        <div className="space-y-4">
          <form onSubmit={handleAddAnnouncement} className="p-4 bg-[#0a0a0c] border border-white/10 space-y-3">
            <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block">
              СОЗДАТЬ ОБЪЯВЛЕНИЕ // BROADCAST ANNOUNCEMENT
            </span>

            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 uppercase block">ЗАГОЛОВОК ОБЪЯВЛЕНИЯ *</label>
              <input
                type="text"
                value={newAnnTitle}
                onChange={(e) => setNewAnnTitle(e.target.value)}
                placeholder="Внимание: чек-ин капитанов CS2"
                className="w-full bg-black border border-white/20 p-2 text-white text-xs font-sans focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 uppercase block">ТЕКСТ СООБЩЕНИЯ *</label>
              <textarea
                value={newAnnText}
                onChange={(e) => setNewAnnText(e.target.value)}
                rows={3}
                placeholder="Матчи начнутся в 12:00. Всем капитанам подключиться к дискорду и подтвердить готовность..."
                className="w-full bg-black border border-white/20 p-2 text-white text-xs font-sans focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <select
                value={newAnnType}
                onChange={(e) => setNewAnnType(e.target.value)}
                className="bg-black border border-white/20 p-1.5 text-white text-xs font-mono"
              >
                <option value="tournament">Турнир (🏆)</option>
                <option value="schedule">Расписание (📅)</option>
                <option value="important">Важно (⚡)</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 bg-white text-black font-bold text-xs uppercase hover:bg-neutral-200 transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ОПУБЛИКОВАТЬ</span>
              </button>
            </div>
          </form>

          {/* Announcements list */}
          <div className="space-y-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block px-1">
              АКТИВНЫЕ ОБЪЯВЛЕНИЯ В MINI APP:
            </span>

            {announcements.map((ann) => (
              <div 
                key={ann.id}
                className="p-3 bg-black border border-white/10 flex items-start justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.2 bg-zinc-900 border border-white/20 text-amber-300 text-[8px] font-bold uppercase font-mono">
                      {ann.type}
                    </span>
                    <span className="text-white font-bold font-sans text-xs">{ann.title}</span>
                    <span className="text-[9px] text-zinc-500 font-mono">{ann.date}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    {ann.text}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteAnnouncement(ann.id)}
                  className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                  title="Удалить"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          SUBTAB 5: СИСТЕМА, ДИАГНОСТИКА И ЭКСПОРТ/ИМПОРТ
          ======================================================== */}
      {adminTab === 'system' && (
        <div className="space-y-4 font-mono text-xs">
          {/* Header & Controller Bot Supervisor Card */}
          <div className="p-4 bg-zinc-950 border border-white/10 space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 text-[10px]">
              <span className="text-white font-bold uppercase flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>SUPERVISOR CONTROLLER: @controlleraitubot</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold uppercase text-[9px] bg-emerald-950/60 px-2 py-0.5 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  WATCHDOG ACTIVE
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
              Интеграция со сторожевым ботом контроллера (<a href="https://github.com/Fomaro/aitu-schedule-controller" target="_blank" rel="noreferrer" className="text-amber-400 underline">aitu-schedule-controller</a>). Мониторинг фоновых служб systemd, ресурсов сервера и диагностика задержек API в режиме реального времени.
            </p>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                onClick={fetchSystemMetrics}
                disabled={isLoadingMetrics}
                className="px-3 py-1.5 bg-zinc-900 border border-white/20 text-white font-bold text-xs uppercase hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
                <span>{isLoadingMetrics ? 'ОБНОВЛЕНИЕ...' : 'ОБНОВИТЬ МЕТРИКИ'}</span>
              </button>

              <button
                onClick={runApiDiagnostics}
                disabled={isCheckingHealth}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-pulse' : ''}`} />
                <span>{isCheckingHealth ? 'ТЕСТИРОВАНИЕ API...' : '🩺 ДИАГНОСТИКА API & СЛУЖБ'}</span>
              </button>

              <a
                href="https://t.me/controlleraitubot"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-zinc-900 border border-white/20 text-zinc-300 font-bold text-xs uppercase hover:text-white hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5"
              >
                <span>ОТКРЫТЬ @controlleraitubot</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
            </div>
          </div>

          {/* Watchdog Alert Status Banner */}
          {systemMetrics?.alerts && systemMetrics.alerts.length > 0 ? (
            <div className="space-y-1.5">
              {systemMetrics.alerts.map((al, idx) => (
                <div
                  key={idx}
                  className={`p-3 border flex items-start gap-2.5 text-xs font-mono ${
                    al.level === 'critical'
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                      : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  }`}
                >
                  <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${al.level === 'critical' ? 'text-rose-400' : 'text-amber-400'}`} />
                  <div>
                    <span className="font-bold uppercase tracking-wider text-[10px] block opacity-80">
                      ВНИМАНИЕ: [{al.source}]
                    </span>
                    <span>{al.message}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-400 font-mono">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>СТОРОЖЕВОЙ МОНИТОРИНГ: ВСЕ ПОКАЗАТЕЛИ В НОРМЕ (0 АЛЕРТОВ)</span>
              </span>
              <span className="text-[10px] text-emerald-500/80 font-bold">WATCHDOG OK</span>
            </div>
          )}

          {/* Hardware & Resources Gauges */}
          <div className="p-4 bg-[#0a0a0c] border border-white/10 space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5 text-[10px]">
              <span className="text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>РЕСУРСЫ СЕРВЕРА И АППАРАТНАЯ НАГРУЗКА</span>
              </span>
              {systemMetrics?.metrics?.uptime && (
                <span className="text-zinc-500 text-[10px]">
                  UPTIME: <span className="text-white font-bold">{systemMetrics.metrics.uptime}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* CPU Gauge */}
              <div className="p-3 bg-black border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-400 uppercase font-bold flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-sky-400" />
                    <span>ПРОЦЕССОР</span>
                  </span>
                  <span className="text-zinc-500 font-mono">
                    {systemMetrics?.metrics?.cpu_cores ? `${systemMetrics.metrics.cpu_cores} vCPU` : 'vCPU'}
                  </span>
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  {systemMetrics?.metrics?.cpu_usage !== undefined ? `${systemMetrics.metrics.cpu_usage}%` : '—'}
                </div>
                <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      (systemMetrics?.metrics?.cpu_usage || 0) > 80
                        ? 'bg-rose-500'
                        : (systemMetrics?.metrics?.cpu_usage || 0) > 50
                        ? 'bg-amber-400'
                        : 'bg-sky-400'
                    }`}
                    style={{ width: `${Math.min(100, systemMetrics?.metrics?.cpu_usage || 0)}%` }}
                  />
                </div>
              </div>

              {/* RAM Gauge */}
              <div className="p-3 bg-black border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-400 uppercase font-bold flex items-center gap-1">
                    <Server className="w-3.5 h-3.5 text-amber-400" />
                    <span>ОПЕРАТИВНАЯ ПАМЯТЬ</span>
                  </span>
                  <span className="text-zinc-500 font-mono">
                    {systemMetrics?.metrics?.ram_used_gb ? `${systemMetrics.metrics.ram_used_gb} / ${systemMetrics.metrics.ram_total_gb} ГБ` : 'RAM'}
                  </span>
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  {systemMetrics?.metrics?.ram_percent !== undefined ? `${systemMetrics.metrics.ram_percent}%` : '—'}
                </div>
                <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      (systemMetrics?.metrics?.ram_percent || 0) > 85
                        ? 'bg-rose-500'
                        : (systemMetrics?.metrics?.ram_percent || 0) > 65
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, systemMetrics?.metrics?.ram_percent || 0)}%` }}
                  />
                </div>
              </div>

              {/* Disk Gauge */}
              <div className="p-3 bg-black border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-400 uppercase font-bold flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ДИСКОВОЕ ХРАНИЛИЩЕ</span>
                  </span>
                  <span className="text-zinc-500 font-mono">
                    {systemMetrics?.metrics?.disk_free_gb ? `Свободно: ${systemMetrics.metrics.disk_free_gb} ГБ` : 'SSD'}
                  </span>
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  {systemMetrics?.metrics?.disk_percent !== undefined ? `${systemMetrics.metrics.disk_percent}%` : '—'}
                </div>
                <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      (systemMetrics?.metrics?.disk_percent || 0) > 85
                        ? 'bg-rose-500'
                        : (systemMetrics?.metrics?.disk_percent || 0) > 70
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, systemMetrics?.metrics?.disk_percent || 0)}%` }}
                  />
                </div>
              </div>
            </div>

            {systemMetrics?.metrics?.os && (
              <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-500 border-t border-white/[0.04]">
                <span>ОС СЕРВЕРА: {systemMetrics.metrics.os}</span>
                <span>PYTHON: {systemMetrics.metrics.python}</span>
              </div>
            )}
          </div>

          {/* Systemd Services Health Status */}
          <div className="p-4 bg-zinc-950 border border-white/10 space-y-3">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block border-b border-white/[0.08] pb-1.5">
              СЛУЖБЫ СИСТЕМЫ (SYSTEMD & КОНТЕЙНЕРЫ)
            </span>

            <div className="space-y-2">
              {(systemMetrics?.services || [
                { id: "bot", name: "AITU Schedule Bot", unit: "aitu-bot.service", status: "active", role: "Основной бот расписания" },
                { id: "caddy", name: "Caddy Web Server", unit: "caddy.service", status: "active", role: "HTTPS Reverse Proxy / Static" },
                { id: "controller", name: "Supervisor Controller", unit: "aitu-controller.service", status: "active", role: "Сторожевой таймер и аудитор" },
                { id: "db", name: "PostgreSQL Database", unit: "aitu-postgres", status: "active", role: "Реляционное хранилище данных" }
              ]).map((srv) => {
                const isActive = srv.status === 'active';
                return (
                  <div key={srv.id} className="p-2.5 bg-black border border-white/5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{srv.name}</span>
                        <span className="text-[9px] text-zinc-500 font-mono">[{srv.unit}]</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate mt-0.5">{srv.role}</div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider flex items-center gap-1 ${
                        isActive
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        {srv.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive API Diagnostics Results Table */}
          {healthResults && (
            <div className="p-4 bg-zinc-950 border border-white/10 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5 text-[10px]">
                <span className="text-zinc-300 font-bold uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>РЕЗУЛЬТАТЫ ДИАГНОСТИКИ API ЭНДПОИНТОВ</span>
                </span>
                <span className="text-zinc-500 text-[9px]">
                  УСПЕШНО: {healthResults.filter(r => r.ok).length} / {healthResults.length}
                </span>
              </div>

              <div className="space-y-1.5">
                {healthResults.map((r, i) => (
                  <div key={i} className="p-2 bg-black border border-white/5 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${r.ok ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span className="text-white truncate font-bold">{r.name}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-[10px]">
                      <span className={r.latency < 50 ? 'text-emerald-400' : r.latency < 200 ? 'text-amber-400' : 'text-rose-400'}>
                        {r.latency} мс
                      </span>
                      <span className={`px-1.5 py-0.2 border font-bold uppercase ${
                        r.ok ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Backup / Export / Import JSON */}
          <div className="p-4 bg-[#0a0a0c] border border-white/10 space-y-3">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">
              РЕЗЕРВНОЕ КОПИРОВАНИЕ ТУРНИРНОЙ БАЗЫ ДАННЫХ
            </span>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const jsonStr = exportAllTournamentData();
                  const blob = new Blob([jsonStr], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `aitu_tournaments_backup_${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  notify('Резервная копия скачана!');
                }}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/20 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>СКАЧАТЬ БЭКАП (JSON)</span>
              </button>

              <label className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/20 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>ИМПОРТИРОВАТЬ JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const res = importAllTournamentData(reader.result);
                      if (res.success) {
                        refreshTournaments();
                        notify(res.message);
                      } else {
                        notify(res.message, 'error');
                      }
                    };
                    reader.readAsText(file);
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <button
              onClick={() => {
                const list = restoreDefaultTournaments();
                setTournaments(list);
                setSelectedTournId(list[0]?.id || 'aitu_pro_league_s1');
                notify('Официальный турнир AITU PRO LEAGUE S1 успешно восстановлен!');
              }}
              className="w-full py-2 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>⚡ ВОССТАНОВИТЬ ОФИЦИАЛЬНЫЙ ТУРНИР (AITU PRO LEAGUE S1)</span>
            </button>
          </div>

          {/* Authorized Superadmins status */}
          <div className="p-4 bg-zinc-950 border border-white/10 space-y-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">
              СТАТУС СЕССИИ УПРАВЛЕНИЯ:
            </span>
            <div className="flex items-center justify-between p-2 bg-black border border-white/5">
              <span className="font-mono text-zinc-300 font-bold">СЕССИЯ: АВТОРИЗОВАНА</span>
              <span className="text-amber-400 text-[10px] font-bold uppercase">ROOT ADMIN ACCESS</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
