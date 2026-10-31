import { apiFetch } from "./api";
// Менеджер турниров колледжа: регистрация команд, организация, генерация сеток и скоринг с полной поддержкой базы данных
import { OFFICIAL_BRACKET, TOURNAMENT_MATCHES, TOURNAMENTS_LIST } from '../data/cs2TournamentData';
import { sendDataToBot } from './telegram';

const TOURNAMENTS_STORAGE_KEY = 'aitu_tournaments_v5';
const REGISTRATIONS_STORAGE_KEY = 'aitu_tournament_registrations_v5';
const DELETED_TOURNAMENTS_KEY = 'aitu_deleted_tournaments_v5';

// Автоматическая очистка устаревших ключей кэша
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('aitu_tournaments_v3');
    localStorage.removeItem('aitu_tournaments_v4');
    localStorage.removeItem('aitu_tournament_registrations_v3_winter_major_2026');
  }
} catch (e) {}

const API_BASE = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';

// Список удаленных пользователем турниров (черный список для предотвращения повторного появления)
export function getDeletedTournamentIds() {
  try {
    const list = JSON.parse(localStorage.getItem(DELETED_TOURNAMENTS_KEY) || '[]');
    if (!list.includes('winter_major_2026')) list.push('winter_major_2026');
    if (!list.includes('autumn_2026')) list.push('autumn_2026');
    return list;
  } catch (e) {
    return ['winter_major_2026', 'autumn_2026'];
  }
}

export function markTournamentAsDeleted(id) {
  try {
    const list = getDeletedTournamentIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(DELETED_TOURNAMENTS_KEY, JSON.stringify(list));
    }
  } catch (e) {}
}

export function unmarkTournamentAsDeleted(id) {
  try {
    const list = getDeletedTournamentIds().filter(x => x !== id);
    localStorage.setItem(DELETED_TOURNAMENTS_KEY, JSON.stringify(list));
  } catch (e) {}
}

// Базовый реестр турниров по умолчанию (для первого запуска)
const DEFAULT_SYSTEM_TOURNAMENTS = [
  ...TOURNAMENTS_LIST
];

// Синхронизация турниров и команд напрямую из базы данных
export async function syncTournamentsFromApi() {
  try {
    const res = await apiFetch(`${API_BASE}/api/tournaments`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && Array.isArray(data.tournaments)) {
      const deletedIds = getDeletedTournamentIds();
      const serverTournaments = data.tournaments
        .filter(t => !deletedIds.includes(t.id) && t.id !== 'autumn_2026' && t.id !== 'winter_major_2026' && !t.id?.includes('winter'))
        .map(t => {
        let rulesArr = t.rules;
        if (typeof rulesArr === 'string') {
          try { rulesArr = JSON.parse(rulesArr); } catch (e) { rulesArr = []; }
        }
        let bracketObj = t.bracketData;
        if (typeof bracketObj === 'string') {
          try { bracketObj = JSON.parse(bracketObj); } catch (e) { bracketObj = {}; }
        }
        let teamsArr = t.teams || [];
        teamsArr = teamsArr.map(tm => {
          let pList = tm.players;
          if (typeof pList === 'string') {
            try { pList = JSON.parse(pList); } catch (e) { pList = []; }
          }
          return {
            id: tm.id,
            teamName: tm.teamName || tm.name,
            tag: tm.tag,
            captainNick: tm.captainNick || tm.captain_nick,
            captainTg: tm.captainTg || tm.captain_tg,
            group: tm.group || tm.group_name,
            avatar: tm.avatar || '',
            avatarUrl: tm.avatar || null,
            players: pList,
            status: tm.status || 'ПОДТВЕРЖДЕНА',
            seed: tm.seed || 0,
            score: tm.score || 0
          };
        });

        // Сохраняем команды турнира в локальный кэш
        try {
          localStorage.setItem(`${REGISTRATIONS_STORAGE_KEY}_${t.id}`, JSON.stringify(teamsArr));
        } catch (e) {
          // ignore
        }

        return {
          id: t.id,
          title: t.title,
          subTitle: t.subTitle || t.sub_title,
          type: t.status === 'completed' ? 'past' : (t.status === 'ongoing' ? 'ongoing' : 'upcoming'),
          status: t.status === 'registration' ? 'ПРИЁМ ЗАЯВОК' : (t.status === 'ongoing' ? 'ИДЁТ' : (t.status === 'completed' ? 'ЗАВЕРШЁН' : t.status)),
          statusBadge: t.status === 'registration'
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 font-bold'
            : (t.status === 'ongoing' ? 'bg-amber-950/60 border-amber-500/40 text-amber-300 font-bold' : 'bg-zinc-800 border-zinc-700 text-zinc-400'),
          date: t.date || t.dates,
          format: t.format,
          discipline: t.discipline || t.game || 'CS2',
          maxTeams: t.maxTeams || t.max_teams || 8,
          registeredTeamsCount: teamsArr.length,
          prizePool: t.prizePool || t.prize_pool,
          rules: Array.isArray(rulesArr) ? rulesArr : [],
          bracketData: bracketObj || {},
          initialRegisteredTeams: teamsArr
        };
      });

      if (serverTournaments.length > 0) {
        saveAllTournaments(serverTournaments);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('aitu_tournaments_updated', { detail: serverTournaments }));
        }
        return serverTournaments;
      }
    }
  } catch (err) {
    console.warn("Could not sync tournaments from API:", err);
  }
  return null;
}

// Получить все турниры (возвращает актуальный локальный кэш и синхронизирует с БД)
export function getAllTournaments() {
  let list = [];
  const deletedIds = getDeletedTournamentIds();
  try {
    const raw = localStorage.getItem(TOURNAMENTS_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
        // Подмешиваем системные турниры, если их еще нет в кэше пользователя
        const cachedIds = new Set(parsed.map(t => t.id));
        const missingSystem = DEFAULT_SYSTEM_TOURNAMENTS.filter(st => !cachedIds.has(st.id) && !deletedIds.includes(st.id));

        list = [...parsed, ...missingSystem]
          .filter(t => !deletedIds.includes(t.id) && t.id !== 'autumn_2026' && t.id !== 'winter_major_2026' && !t.id?.includes('winter'))
          .map(t => {
            const sys = DEFAULT_SYSTEM_TOURNAMENTS.find(s => s.id === t.id);
            if (sys) {
              return {
                ...t,
                title: sys.title,
                subTitle: sys.subTitle,
                type: sys.type,
                status: sys.status,
                statusBadge: sys.statusBadge,
                matches: sys.matches,
                bracket: sys.bracket,
                rules: sys.rules,
                winner: sys.winner,
                secondPlace: sys.secondPlace,
                thirdPlace: sys.thirdPlace,
                date: sys.date,
                teamsCount: sys.teamsCount,
                maxTeams: sys.maxTeams,
                prizePool: sys.prizePool
              };
            }
            return t;
          });
        saveAllTournaments(list);
        return list;
    }
  } catch (e) {
    console.warn("Failed to load custom tournaments", e);
  }

  // Первичный запуск на новом клиенте
  list = DEFAULT_SYSTEM_TOURNAMENTS.filter(t => !deletedIds.includes(t.id));
  saveAllTournaments(list);

  // Фоновая синхронизация с базой данных на сервере
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      syncTournamentsFromApi();
    }, 50);
  }

  return list;
}

// Принудительное восстановление системных турниров
export function restoreDefaultTournaments() {
  const list = [...DEFAULT_SYSTEM_TOURNAMENTS];
  saveAllTournaments(list);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aitu_tournaments_updated', { detail: list }));
  }

  return list;
}

// Сохранить турниры в локальный кэш
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

// Зарегистрировать команду на турнир (сохранение в БД)
export function registerTeamForTournament(tournamentId, form) {
  const currentRegs = getTournamentRegistrations(tournamentId);

  const newEntry = {
    id: form.id || `reg_${Date.now()}`,
    tournamentId,
    teamName: form.teamName.trim(),
    tag: (form.tag || form.teamName.slice(0, 4)).trim().toUpperCase(),
    avatar: form.avatar || form.avatarUrl || '🛡️',
    avatarUrl: form.avatarUrl || form.avatar || null,
    avatarPreset: form.avatarPreset || 'shield',
    captainNick: form.captainNick.trim(),
    captainTg: form.captainTg.trim().startsWith('@') ? form.captainTg.trim() : `@${form.captainTg.trim()}`,
    captainSteamId: form.captainSteamId?.trim() || '',
    captainFaceit: form.captainFaceit?.trim() || '',
    captainGroup: form.captainGroup?.trim() || form.group?.trim() || '9ПО-43к',
    group: form.group?.trim() || 'Сборная',
    players: form.players || [],
    roster: form.roster || [],
    substitute: form.substitute || '',
    status: form.status || 'ПОДТВЕРЖДЕНА',
    seed: form.seed || (currentRegs.length + 1),
    score: 0,
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

  // Сохраняем команду в базу данных на VPS
  apiFetch(`${API_BASE}/api/tournaments/${encodeURIComponent(tournamentId)}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: newEntry.id,
      teamName: newEntry.teamName,
      tag: newEntry.tag,
      captainNick: newEntry.captainNick,
      captainTg: newEntry.captainTg,
      group: newEntry.group,
      avatar: newEntry.avatar || '',
      players: newEntry.roster && newEntry.roster.length > 0 ? newEntry.roster : newEntry.players,
      status: newEntry.status,
      seed: newEntry.seed,
      score: 0
    })
  }).catch(err => console.warn("Failed to persist team to DB:", err));

  // Уведомление в бота
  sendDataToBot({
    action: 'tournament_registration',
    tournamentId,
    teamName: newEntry.teamName,
    captainNick: newEntry.captainNick,
    captainTg: newEntry.captainTg,
    group: newEntry.group,
    playersCount: (newEntry.roster?.length || newEntry.players.length + 1)
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aitu_tournaments_updated', { detail: tournaments }));
  }

  return newEntry;
}

// Обновить данные заявки команды (статус, посев, состав)
export function updateTeamRegistration(tournamentId, teamId, patch) {
  const currentRegs = getTournamentRegistrations(tournamentId);
  const idx = currentRegs.findIndex(r => r.id === teamId);
  if (idx === -1) return null;

  currentRegs[idx] = { ...currentRegs[idx], ...patch };

  try {
    localStorage.setItem(`${REGISTRATIONS_STORAGE_KEY}_${tournamentId}`, JSON.stringify(currentRegs));
  } catch (e) {
    console.error("Failed to update team registration", e);
  }

  // Обновляем в БД на VPS
  apiFetch(`${API_BASE}/api/tournaments/${encodeURIComponent(tournamentId)}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: currentRegs[idx].id,
      teamName: currentRegs[idx].teamName,
      tag: currentRegs[idx].tag,
      captainNick: currentRegs[idx].captainNick,
      captainTg: currentRegs[idx].captainTg,
      group: currentRegs[idx].group,
      avatar: currentRegs[idx].avatar || '',
      players: currentRegs[idx].roster || currentRegs[idx].players,
      status: currentRegs[idx].status,
      seed: currentRegs[idx].seed || 0,
      score: currentRegs[idx].score || 0
    })
  }).catch(() => {});

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aitu_tournaments_updated', { detail: getAllTournaments() }));
  }

  return currentRegs[idx];
}

export function approveTeamRegistration(tournamentId, teamId) {
  return updateTeamRegistration(tournamentId, teamId, { status: 'ПОДТВЕРЖДЕНА' });
}

export function rejectTeamRegistration(tournamentId, teamId) {
  return updateTeamRegistration(tournamentId, teamId, { status: 'ОТКЛОНЕНА' });
}

export function setTeamSeed(tournamentId, teamId, seed) {
  return updateTeamRegistration(tournamentId, teamId, { seed: Number(seed) });
}

// Создать новый турнир (сохранение в БД)
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
    prizeDetails: tournamentData.prizeDetails || {
      firstPlace: "Кубок колледжа AITU + Золотые медали",
      secondPlace: "Серебряные медали + Грамоты",
      thirdPlace: "Бронзовые медали",
      mvp: "Индивидуальная статуэтка MVP Турнира"
    },
    avatar: tournamentData.avatar || '🏆',
    bannerPreset: tournamentData.bannerPreset || 'gold',
    rules: tournamentData.rules || [
      "Турнир проводится по олимпийской системе (Single Elimination).",
      "Все матчи играются до 2-х побед по картам (Best of 3).",
      "Серверы предоставляются организаторами колледжа.",
      "Обязательно присутствие капитана в Telegram за 15 минут до матча."
    ],
    initialRegisteredTeams: []
  };

  const updated = [newTourn, ...tournaments];
  saveAllTournaments(updated);

  // Сохраняем в базу данных PostgreSQL на VPS
  apiFetch(`${API_BASE}/api/tournaments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: newTourn.id,
      title: newTourn.title,
      subTitle: newTourn.subTitle,
      game: newTourn.discipline,
      status: 'registration',
      date: newTourn.date,
      format: newTourn.format,
      maxTeams: newTourn.maxTeams,
      prizePool: newTourn.prizePool,
      rules: newTourn.rules,
      bracketData: {}
    })
  }).catch(err => console.warn("Failed to persist tournament to DB:", err));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aitu_tournaments_updated', { detail: updated }));
  }

  return newTourn;
}

// Автоматическая генерация турнирной сетки на 4 или 8 команд с учетом посева (seeding)
export function generateSingleEliminationBracket(teamsInput) {
  // Нормализуем массив команд: может быть массивом строк или объектов { teamName, seed, tag }
  let teams = teamsInput.map((t, idx) => {
    if (typeof t === 'string') {
      return { name: t, seed: idx + 1 };
    }
    return {
      name: t.teamName || t.name || `Команда ${idx + 1}`,
      seed: Number(t.seed) || (idx + 1),
      tag: t.tag || ''
    };
  });

  // Сортируем по посеву
  teams.sort((a, b) => a.seed - b.seed);

  const count = teams.length;

  // Формат на 4 команды
  if (count <= 4) {
    while (teams.length < 4) {
      teams.push({ name: `TBD ${teams.length + 1}`, seed: teams.length + 1 });
    }

    const t = teams;
    return {
      title: "Плей-офф (4 команды)",
      isCustom: true,
      round2: [],
      semifinals: [
        {
          matchId: "semi_1",
          team1: { name: t[0].name, seed: `#${t[0].seed}`, score: null, isWinner: false },
          team2: { name: t[3].name, seed: `#${t[3].seed}`, score: null, isWinner: false }
        },
        {
          matchId: "semi_2",
          team1: { name: t[1].name, seed: `#${t[1].seed}`, score: null, isWinner: false },
          team2: { name: t[2].name, seed: `#${t[2].seed}`, score: null, isWinner: false }
        }
      ],
      final: {
        matchId: "final",
        team1: { name: "Победитель 1/2 (1)", seed: "", score: null, isWinner: false },
        team2: { name: "Победитель 1/2 (2)", seed: "", score: null, isWinner: false }
      },
      thirdPlace: {
        matchId: "third_place",
        team1: { name: "Проигравший 1/2 (1)", seed: "", score: null, isWinner: false },
        team2: { name: "Проигравший 1/2 (2)", seed: "", score: null, isWinner: false }
      }
    };
  }

  // Формат на 8 команд (стандарт олимпийской системы: #1 vs #8, #4 vs #5, #2 vs #7, #3 vs #6)
  while (teams.length < 8) {
    teams.push({ name: `TBD ${teams.length + 1}`, seed: teams.length + 1 });
  }

  const t = teams;
  return {
    title: "Плей-офф (8 команд)",
    isCustom: true,
    round2: [
      {
        matchId: "qf_1",
        team1: { name: t[0].name, seed: `#${t[0].seed}`, score: null, isWinner: false },
        team2: { name: t[7].name, seed: `#${t[7].seed}`, score: null, isWinner: false }
      },
      {
        matchId: "qf_2",
        team1: { name: t[3].name, seed: `#${t[3].seed}`, score: null, isWinner: false },
        team2: { name: t[4].name, seed: `#${t[4].seed}`, score: null, isWinner: false }
      },
      {
        matchId: "qf_3",
        team1: { name: t[1].name, seed: `#${t[1].seed}`, score: null, isWinner: false },
        team2: { name: t[6].name, seed: `#${t[6].seed}`, score: null, isWinner: false }
      },
      {
        matchId: "qf_4",
        team1: { name: t[2].name, seed: `#${t[2].seed}`, score: null, isWinner: false },
        team2: { name: t[5].name, seed: `#${t[5].seed}`, score: null, isWinner: false }
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
      matchId: "third_place",
      team1: { name: "Бронза (1)", seed: "", score: null, isWinner: false },
      team2: { name: "Бронза (2)", seed: "", score: null, isWinner: false }
    }
  };
}

// Подтверждение результатов матча, сохранение скриншота и автоматическое продвижение по сетке
export function confirmMatchScoreAndAdvance(tournamentId, matchId, score1, score2, screenshotUrl = null) {
  const tournaments = getAllTournaments();
  const tourn = tournaments.find(t => t.id === tournamentId);
  if (!tourn) return null;

  const num1 = parseInt(score1, 10) || 0;
  const num2 = parseInt(score2, 10) || 0;
  const isWinner1 = num1 > num2;
  const isWinner2 = num2 > num1;

  // 1. Обновление матча в массиве matches
  if (!tourn.matches) tourn.matches = [];
  let mIdx = tourn.matches.findIndex(m => m.id === matchId);
  
  if (mIdx !== -1) {
    const m = tourn.matches[mIdx];
    m.team1.score = num1;
    m.team2.score = num2;
    m.team1.isWinner = isWinner1;
    m.team2.isWinner = isWinner2;
    if (screenshotUrl) m.screenshotUrl = screenshotUrl;
  }

  // 2. Обновление сетки bracket
  const bracket = tourn.bracket || tourn.bracketData;
  if (bracket) {
    let targetMatch = null;
    let stage = null;
    let matchIndex = -1;

    // Ищем в round2 (1/4 финала)
    if (bracket.round2) {
      const idx = bracket.round2.findIndex(m => m.matchId === matchId);
      if (idx !== -1) {
        targetMatch = bracket.round2[idx];
        stage = 'round2';
        matchIndex = idx;
      }
    }
    // Ищем в semifinals (1/2 финала)
    if (!targetMatch && bracket.semifinals) {
      const idx = bracket.semifinals.findIndex(m => m.matchId === matchId);
      if (idx !== -1) {
        targetMatch = bracket.semifinals[idx];
        stage = 'semifinals';
        matchIndex = idx;
      }
    }
    // Ищем в final
    if (!targetMatch && bracket.final && bracket.final.matchId === matchId) {
      targetMatch = bracket.final;
      stage = 'final';
    }
    // Ищем в thirdPlace
    if (!targetMatch && bracket.thirdPlace && bracket.thirdPlace.matchId === matchId) {
      targetMatch = bracket.thirdPlace;
      stage = 'thirdPlace';
    }

    if (targetMatch) {
      targetMatch.team1.score = num1;
      targetMatch.team2.score = num2;
      targetMatch.team1.isWinner = isWinner1;
      targetMatch.team2.isWinner = isWinner2;
      if (screenshotUrl) targetMatch.screenshotUrl = screenshotUrl;

      const winnerTeam = isWinner1 ? targetMatch.team1 : targetMatch.team2;
      const loserTeam = isWinner1 ? targetMatch.team2 : targetMatch.team1;

      // Автоматическое продвижение победителя по сетке
      if (stage === 'round2' && bracket.semifinals) {
        if (matchIndex === 0 && bracket.semifinals[0]) {
          bracket.semifinals[0].team1 = { name: winnerTeam.name, seed: winnerTeam.seed || '', score: null, isWinner: false };
        } else if (matchIndex === 1 && bracket.semifinals[0]) {
          bracket.semifinals[0].team2 = { name: winnerTeam.name, seed: winnerTeam.seed || '', score: null, isWinner: false };
        } else if (matchIndex === 2 && bracket.semifinals[1]) {
          bracket.semifinals[1].team1 = { name: winnerTeam.name, seed: winnerTeam.seed || '', score: null, isWinner: false };
        } else if (matchIndex === 3 && bracket.semifinals[1]) {
          bracket.semifinals[1].team2 = { name: winnerTeam.name, seed: winnerTeam.seed || '', score: null, isWinner: false };
        }
      } else if (stage === 'semifinals') {
        if (matchIndex === 0) {
          if (bracket.final) bracket.final.team1 = { name: winnerTeam.name, seed: winnerTeam.seed || '', score: null, isWinner: false };
          if (bracket.thirdPlace) bracket.thirdPlace.team1 = { name: loserTeam.name, seed: loserTeam.seed || '', score: null, isWinner: false };
        } else if (matchIndex === 1) {
          if (bracket.final) bracket.final.team2 = { name: winnerTeam.name, seed: winnerTeam.seed || '', score: null, isWinner: false };
          if (bracket.thirdPlace) bracket.thirdPlace.team2 = { name: loserTeam.name, seed: loserTeam.seed || '', score: null, isWinner: false };
        }
      } else if (stage === 'final') {
        tourn.winner = `${winnerTeam.name} 🏆`;
        tourn.secondPlace = `${loserTeam.name} 🥈`;
        tourn.status = 'ЗАВЕРШЁН';
        tourn.type = 'past';
      } else if (stage === 'thirdPlace') {
        tourn.thirdPlace = `${winnerTeam.name} 🥉`;
      }
    }
  }

  // Если матча еще не было в tourn.matches, добавляем его в список
  if (mIdx === -1 && bracket) {
    const allMatches = [...(bracket.round2 || []), ...(bracket.semifinals || []), bracket.final, bracket.thirdPlace].filter(Boolean);
    const found = allMatches.find(m => m.matchId === matchId);
    if (found) {
      tourn.matches.push({
        id: matchId,
        title: `${found.team1?.name} vs ${found.team2?.name}`,
        stage: matchId.includes('qf') ? '1/4 ФИНАЛА' : (matchId.includes('semi') ? '1/2 ФИНАЛА' : (matchId.includes('final') ? 'ГРАНД ФИНАЛ' : 'ПЛЕЙ-ОФФ')),
        format: 'Best of 3 (5v5)',
        duration: 'Завершён',
        region: 'Москва (Custom)',
        screenshotUrl,
        team1: {
          name: found.team1?.name,
          seed: found.team1?.seed || '#1',
          score: num1,
          isWinner: isWinner1,
          players: []
        },
        team2: {
          name: found.team2?.name,
          seed: found.team2?.seed || '#2',
          score: num2,
          isWinner: isWinner2,
          players: []
        },
        maps: [
          { name: 'Карта 1', score1: isWinner1 ? 13 : 8, score2: isWinner1 ? 8 : 13, duration: '28:10' }
        ]
      });
    }
  }

  updateTournament(tournamentId, {
    bracket: tourn.bracket,
    bracketData: tourn.bracketData,
    matches: tourn.matches,
    winner: tourn.winner,
    secondPlace: tourn.secondPlace,
    thirdPlace: tourn.thirdPlace,
    status: tourn.status,
    type: tourn.type
  });

  return tourn;
}

// Обновить турнир (в БД и локально)
export function updateTournament(tournamentId, patch) {
  const tournaments = getAllTournaments();
  const idx = tournaments.findIndex(t => t.id === tournamentId);
  if (idx !== -1) {
    tournaments[idx] = { ...tournaments[idx], ...patch };
    saveAllTournaments(tournaments);

    // Сохраняем изменения в БД на VPS
    apiFetch(`${API_BASE}/api/tournaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: tournamentId,
        ...patch
      })
    }).catch(err => console.warn("Failed to update tournament in DB:", err));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aitu_tournaments_updated', { detail: tournaments }));
    }

    return tournaments[idx];
  }
  return null;
}

// Удалить турнир (из БД и локально)
export function deleteTournament(tournamentId) {
  markTournamentAsDeleted(tournamentId);
  const tournaments = getAllTournaments();
  const updated = tournaments.filter(t => t.id !== tournamentId);
  saveAllTournaments(updated);
  try {
    localStorage.removeItem(`${REGISTRATIONS_STORAGE_KEY}_${tournamentId}`);
  } catch (e) {
    // ignore
  }

  // Удаляем турнир из базы данных на VPS
  apiFetch(`${API_BASE}/api/tournaments/${encodeURIComponent(tournamentId)}`, {
    method: 'DELETE'
  }).catch(err => console.warn("Failed to delete tournament from DB:", err));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aitu_tournaments_updated', { detail: updated }));
  }

  return updated;
}

// Удалить команду из турнира (из БД и локально)
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

  // Удаляем команду из базы данных на VPS
  apiFetch(`${API_BASE}/api/tournaments/${encodeURIComponent(tournamentId)}/teams/${encodeURIComponent(teamId)}`, {
    method: 'DELETE'
  }).catch(err => console.warn("Failed to delete team from DB:", err));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aitu_tournaments_updated', { detail: tournaments }));
  }

  return updated;
}

// Добавить или обновить команду с поддержкой аватарки (сохранение в БД)
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
    avatarUrl: teamData.avatarUrl || teamData.avatar || null,
    avatar: teamData.avatarUrl || teamData.avatar || '',
    avatarPreset: teamData.avatarPreset || null,
    status: teamData.status || 'ПОДТВЕРЖДЕНА',
    seed: teamData.seed || (existingIdx !== -1 ? currentRegs[existingIdx].seed : currentRegs.length + 1),
    score: teamData.score || 0,
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

  // Сохраняем команду в базу данных PostgreSQL на VPS
  apiFetch(`${API_BASE}/api/tournaments/${encodeURIComponent(tournamentId)}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: entry.id,
      teamName: entry.teamName,
      tag: entry.tag,
      captainNick: entry.captainNick,
      captainTg: entry.captainTg,
      group: entry.group,
      avatar: entry.avatarUrl || entry.avatar || '',
      players: entry.players,
      status: entry.status,
      seed: entry.seed || 0,
      score: entry.score || 0
    })
  }).catch(err => console.warn("Failed to persist team with avatar to DB:", err));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aitu_tournaments_updated', { detail: tournaments }));
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
    version: "v3.16",
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
      // Также синхронизируем импортированные турниры в БД
      data.tournaments.forEach(t => {
        apiFetch(`${API_BASE}/api/tournaments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(t)
        }).catch(() => {});
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('aitu_tournaments_updated', { detail: data.tournaments }));
      }
      return { success: true, message: `Успешно импортировано ${data.tournaments.length} турниров в БД` };
    }
    return { success: false, message: 'Неверный формат JSON' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
