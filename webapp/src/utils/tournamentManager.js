// Менеджер турниров колледжа: регистрация команд, организация, генерация сеток и скоринг
import { OFFICIAL_BRACKET, TOURNAMENT_MATCHES, TOURNAMENTS_LIST } from '../data/cs2TournamentData';
import { sendDataToBot } from './telegram';

const TOURNAMENTS_STORAGE_KEY = 'aitu_tournaments_v2';
const REGISTRATIONS_STORAGE_KEY = 'aitu_tournament_registrations_v2';

// Базовый реестр турниров
const DEFAULT_SYSTEM_TOURNAMENTS = [
  ...TOURNAMENTS_LIST,
  {
    id: "winter_major_2026",
    title: "AITU CS2 Winter Championship 2026",
    subTitle: "Зимний кубок колледжа AITU · Регистрация открыта",
    type: "upcoming",
    status: "ПРИЁМ ЗАЯВОК",
    statusBadge: "bg-emerald-950/60 border-emerald-500/40 text-emerald-300 font-bold",
    date: "Ноябрь 2026 (по выходным)",
    format: "Single Elimination · Best of 3 (5v5)",
    discipline: "Counter-Strike 2",
    maxTeams: 8,
    registeredTeamsCount: 4,
    prizePool: "Кубок колледжа + Мерч кафедры + Медали",
    rules: [
      "К участию допускаются студенты всех курсов колледжа AITU (составы от одной группы или сборные).",
      "Формат матчей: Best of 3 (до двух побед по картам). Составы строго 5 на 5 (разрешен 1 запасной).",
      "Пул карт: Mirage, Inferno, Nuke, Anubis, Dust II, Ancient, Vertigo.",
      "Серверы: выделенный сервер колледжа с тикрейтом 128 / Sub-tick и записью GOTV-демо каждого раунда.",
      "Обязателен чекин капитанов в Telegram за 30 минут до начала каждого матча."
    ],
    initialRegisteredTeams: [
      {
        id: "reg_triq",
        teamName: "TRIQ",
        tag: "TRIQ",
        captainNick: "wxrry",
        captainTg: "@wxrry",
        group: "9ПО-43к",
        status: "ПОДТВЕРЖДЕНА",
        players: ["coldeph", "RAREMO", "Toxichniy", "Kalivan1703"],
        createdAt: "15.10.2026"
      },
      {
        id: "reg_ll",
        teamName: "LL TEAM",
        tag: "LL",
        captainNick: "shhh_11",
        captainTg: "@shhh_11",
        group: "9ПО-41к",
        status: "ПОДТВЕРЖДЕНА",
        players: ["t0ma999", "Flake(1337)", "Utopiya-", "MB_kot"],
        createdAt: "16.10.2026"
      },
      {
        id: "reg_void",
        teamName: "Team V0id",
        tag: "V0ID",
        captainNick: "m1hnessy_1",
        captainTg: "@m1hnessy",
        group: "9ПО-32к",
        status: "ПОДТВЕРЖДЕНА",
        players: ["sh3f1eld", "N1x0", "FeRtEx", "ion !"],
        createdAt: "16.10.2026"
      },
      {
        id: "reg_dodo",
        teamName: "DODO TEAM",
        tag: "DODO",
        captainNick: "Astronif",
        captainTg: "@astronif",
        group: "9ИС-21к",
        status: "ПОДТВЕРЖДЕНА",
        players: ["prokllat", "kotanye", "Ganzhubus", "yaponec_3"],
        createdAt: "17.10.2026"
      }
    ]
  }
];

// Получить все турниры (с автоматическим восстановлением системных турниров)
export function getAllTournaments() {
  let list = [];
  try {
    const raw = localStorage.getItem(TOURNAMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load custom tournaments", e);
  }

  if (list.length === 0) {
    list = [...DEFAULT_SYSTEM_TOURNAMENTS];
    saveAllTournaments(list);
    return list;
  }

  // Гарантируем, что базовые системные турниры (autumn_2026 и winter_major_2026) не пропадают
  let changed = false;
  DEFAULT_SYSTEM_TOURNAMENTS.forEach(defT => {
    if (!list.some(t => t.id === defT.id)) {
      list.unshift(defT);
      changed = true;
    }
  });

  if (changed) {
    saveAllTournaments(list);
  }

  return list;
}

// Принудительное восстановление системных турниров
export function restoreDefaultTournaments() {
  const list = [...DEFAULT_SYSTEM_TOURNAMENTS];
  saveAllTournaments(list);

  // Восстанавливаем заявки зимнего кубка
  const winter = DEFAULT_SYSTEM_TOURNAMENTS.find(t => t.id === "winter_major_2026");
  if (winter?.initialRegisteredTeams) {
    try {
      localStorage.setItem(`${REGISTRATIONS_STORAGE_KEY}_winter_major_2026`, JSON.stringify(winter.initialRegisteredTeams));
    } catch (e) {
      // ignore
    }
  }

  return list;
}

// Сохранить турниры
export function saveAllTournaments(tournaments) {
  try {
    localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(tournaments));
  } catch (e) {
    console.error("Failed to save tournaments", e);
  }
}

// Получить заявки на турнир
export function getTournamentRegistrations(tournamentId) {
  try {
    const raw = localStorage.getItem(`${REGISTRATIONS_STORAGE_KEY}_${tournamentId}`);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch (e) {
    console.warn("Failed to read registrations", e);
  }

  // Fallback to initial seeds
  const tourn = getAllTournaments().find(t => t.id === tournamentId);
  return tourn?.initialRegisteredTeams || [];
}

// Зарегистрировать команду на турнир
export function registerTeamForTournament(tournamentId, form) {
  const currentRegs = getTournamentRegistrations(tournamentId);

  const newEntry = {
    id: `reg_${Date.now()}`,
    tournamentId,
    teamName: form.teamName.trim(),
    tag: (form.tag || form.teamName.slice(0, 4)).trim().toUpperCase(),
    captainNick: form.captainNick.trim(),
    captainTg: form.captainTg.trim().startsWith('@') ? form.captainTg.trim() : `@${form.captainTg.trim()}`,
    captainSteamId: form.captainSteamId?.trim() || '',
    group: form.group?.trim() || 'Сборная',
    players: form.players.filter(Boolean).map(p => p.trim()),
    substitute: form.substitute?.trim() || '',
    status: 'ПОДТВЕРЖДЕНА',
    createdAt: new Date().toLocaleDateString('ru-RU')
  };

  const updatedRegs = [...currentRegs, newEntry];

  try {
    localStorage.setItem(`${REGISTRATIONS_STORAGE_KEY}_${tournamentId}`, JSON.stringify(updatedRegs));
  } catch (e) {
    console.error("Failed to store team registration", e);
  }

  // Обновляем счетчик команд в турнире
  const tournaments = getAllTournaments();
  const targetIdx = tournaments.findIndex(t => t.id === tournamentId);
  if (targetIdx !== -1) {
    tournaments[targetIdx].registeredTeamsCount = updatedRegs.length;
    saveAllTournaments(tournaments);
  }

  // Уведомление в бота
  sendDataToBot({
    action: 'tournament_registration',
    tournamentId,
    teamName: newEntry.teamName,
    captainNick: newEntry.captainNick,
    captainTg: newEntry.captainTg,
    group: newEntry.group,
    playersCount: newEntry.players.length + 1
  });

  return newEntry;
}

// Создать новый турнир (для организаторов)
export function createNewTournament(tournamentData) {
  const tournaments = getAllTournaments();

  const newTourn = {
    id: `tourn_${Date.now()}`,
    title: tournamentData.title.trim(),
    subTitle: tournamentData.subTitle?.trim() || "Официальный турнир колледжа AITU",
    type: "upcoming",
    status: "ПРИЁМ ЗАЯВОК",
    statusBadge: "bg-emerald-950/60 border-emerald-500/40 text-emerald-300 font-bold",
    date: tournamentData.date || "Скоро",
    format: tournamentData.format || "Single Elimination · Best of 3 (5v5)",
    discipline: tournamentData.discipline || "CS2",
    maxTeams: Number(tournamentData.maxTeams) || 8,
    registeredTeamsCount: 0,
    prizePool: tournamentData.prizePool || "Кубок колледжа + Дипломы",
    rules: tournamentData.rules || [
      "Турнир проводится по олимпийской системе (Single Elimination).",
      "Все матчи играются до 2-х побед по картам (Best of 3).",
      "Серверы предоставляются организаторами колледжа."
    ],
    initialRegisteredTeams: []
  };

  const updated = [newTourn, ...tournaments];
  saveAllTournaments(updated);
  return newTourn;
}

// Автоматическая генерация турнирной сетки на 4 или 8 команд
export function generateSingleEliminationBracket(teamNames) {
  const count = teamNames.length;
  if (count <= 4) {
    // Сетка на 4 команды (Полуфиналы + Финал + 3 место)
    const t = [...teamNames];
    while (t.length < 4) t.push(`TBD ${t.length + 1}`);

    return {
      title: "Плей-офф (4 команды)",
      round2: [],
      semifinals: [
        {
          matchId: "semi_1",
          team1: { name: t[0], seed: "#1", score: null, isWinner: false },
          team2: { name: t[3], seed: "#4", score: null, isWinner: false }
        },
        {
          matchId: "semi_2",
          team1: { name: t[1], seed: "#2", score: null, isWinner: false },
          team2: { name: t[2], seed: "#3", score: null, isWinner: false }
        }
      ],
      final: {
        matchId: "final",
        team1: { name: "Победитель 1/2 (1)", seed: "", score: null, isWinner: false },
        team2: { name: "Победитель 1/2 (2)", seed: "", score: null, isWinner: false }
      },
      thirdPlace: {
        team1: { name: "Проигравший 1/2 (1)", seed: "", score: null, isWinner: false },
        team2: { name: "Проигравший 1/2 (2)", seed: "", score: null, isWinner: false }
      }
    };
  }

  // Сетка на 8 команд (1/4 финала + 1/2 финала + Финал + 3 место)
  const t = [...teamNames];
  while (t.length < 8) t.push(`TBD ${t.length + 1}`);

  return {
    title: "Плей-офф (8 команд)",
    round2: [
      {
        matchId: "qf_1",
        team1: { name: t[0], seed: "#1", score: null, isWinner: false },
        team2: { name: t[7], seed: "#8", score: null, isWinner: false }
      },
      {
        matchId: "qf_2",
        team1: { name: t[3], seed: "#4", score: null, isWinner: false },
        team2: { name: t[4], seed: "#5", score: null, isWinner: false }
      },
      {
        matchId: "qf_3",
        team1: { name: t[1], seed: "#2", score: null, isWinner: false },
        team2: { name: t[6], seed: "#7", score: null, isWinner: false }
      },
      {
        matchId: "qf_4",
        team1: { name: t[2], seed: "#3", score: null, isWinner: false },
        team2: { name: t[5], seed: "#6", score: null, isWinner: false }
      }
    ],
    semifinals: [
      {
        matchId: "semi_1",
        team1: { name: "Победитель 1/4 (1)", seed: "", score: null, isWinner: false },
        team2: { name: "Победитель 1/4 (2)", seed: "", score: null, isWinner: false }
      },
      {
        matchId: "semi_2",
        team1: { name: "Победитель 1/4 (3)", seed: "", score: null, isWinner: false },
        team2: { name: "Победитель 1/4 (4)", seed: "", score: null, isWinner: false }
      }
    ],
    final: {
      matchId: "final",
      team1: { name: "Финалист (1)", seed: "", score: null, isWinner: false },
      team2: { name: "Финалист (2)", seed: "", score: null, isWinner: false }
    },
    thirdPlace: {
      team1: { name: "Бронза (1)", seed: "", score: null, isWinner: false },
      team2: { name: "Бронза (2)", seed: "", score: null, isWinner: false }
    }
  };
}

// Обновить турнир
export function updateTournament(tournamentId, patch) {
  const tournaments = getAllTournaments();
  const idx = tournaments.findIndex(t => t.id === tournamentId);
  if (idx !== -1) {
    tournaments[idx] = { ...tournaments[idx], ...patch };
    saveAllTournaments(tournaments);
    return tournaments[idx];
  }
  return null;
}

// Удалить турнир
export function deleteTournament(tournamentId) {
  const tournaments = getAllTournaments();
  const updated = tournaments.filter(t => t.id !== tournamentId);
  saveAllTournaments(updated);
  try {
    localStorage.removeItem(`${REGISTRATIONS_STORAGE_KEY}_${tournamentId}`);
  } catch (e) {
    // ignore
  }
  return updated;
}

// Удалить команду из турнира
export function deleteTournamentRegistration(tournamentId, teamId) {
  const regs = getTournamentRegistrations(tournamentId);
  const updated = regs.filter(r => r.id !== teamId);
  try {
    localStorage.setItem(`${REGISTRATIONS_STORAGE_KEY}_${tournamentId}`, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to delete team registration", e);
  }

  // Обновляем счетчик
  const tournaments = getAllTournaments();
  const idx = tournaments.findIndex(t => t.id === tournamentId);
  if (idx !== -1) {
    tournaments[idx].registeredTeamsCount = updated.length;
    saveAllTournaments(tournaments);
  }
  return updated;
}

// Добавить или обновить команду с поддержкой аватарки
export function saveTeamWithAvatar(tournamentId, teamData) {
  const currentRegs = getTournamentRegistrations(tournamentId);
  const existingIdx = currentRegs.findIndex(r => r.id === teamData.id || (teamData.id && r.id === teamData.id));

  const entry = {
    id: teamData.id || `reg_${Date.now()}`,
    tournamentId,
    teamName: teamData.teamName.trim(),
    tag: (teamData.tag || teamData.teamName.slice(0, 4)).trim().toUpperCase(),
    captainNick: teamData.captainNick?.trim() || 'wxrry',
    captainTg: teamData.captainTg?.trim() ? (teamData.captainTg.startsWith('@') ? teamData.captainTg.trim() : `@${teamData.captainTg.trim()}`) : '@captain',
    captainSteamId: teamData.captainSteamId?.trim() || '',
    group: teamData.group?.trim() || '9ПО-43к',
    players: (teamData.players || []).filter(Boolean).map(p => p.trim()),
    substitute: teamData.substitute?.trim() || '',
    avatarUrl: teamData.avatarUrl || null,
    avatarPreset: teamData.avatarPreset || null,
    status: teamData.status || 'ПОДТВЕРЖДЕНА',
    createdAt: teamData.createdAt || new Date().toLocaleDateString('ru-RU')
  };

  let updatedRegs;
  if (existingIdx !== -1) {
    updatedRegs = [...currentRegs];
    updatedRegs[existingIdx] = entry;
  } else {
    updatedRegs = [...currentRegs, entry];
  }

  try {
    localStorage.setItem(`${REGISTRATIONS_STORAGE_KEY}_${tournamentId}`, JSON.stringify(updatedRegs));
  } catch (e) {
    console.error("Failed to save team", e);
  }

  const tournaments = getAllTournaments();
  const targetIdx = tournaments.findIndex(t => t.id === tournamentId);
  if (targetIdx !== -1) {
    tournaments[targetIdx].registeredTeamsCount = updatedRegs.length;
    saveAllTournaments(tournaments);
  }

  return entry;
}

// Экспорт всех данных системы в JSON
export function exportAllTournamentData() {
  const tournaments = getAllTournaments();
  const allRegistrations = {};
  tournaments.forEach(t => {
    allRegistrations[t.id] = getTournamentRegistrations(t.id);
  });

  return JSON.stringify({
    timestamp: new Date().toISOString(),
    version: "v3.14",
    tournaments,
    registrations: allRegistrations
  }, null, 2);
}

// Импорт всех данных системы из JSON
export function importAllTournamentData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (data.tournaments && Array.isArray(data.tournaments)) {
      saveAllTournaments(data.tournaments);
      if (data.registrations) {
        Object.keys(data.registrations).forEach(tournId => {
          localStorage.setItem(`${REGISTRATIONS_STORAGE_KEY}_${tournId}`, JSON.stringify(data.registrations[tournId]));
        });
      }
      return { success: true, message: `Успешно импортировано ${data.tournaments.length} турниров` };
    }
    return { success: false, message: 'Неверный формат JSON' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
