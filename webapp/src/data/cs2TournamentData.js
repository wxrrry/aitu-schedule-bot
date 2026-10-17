// Реальные данные турниров колледжа по CS2 и статистика игроков

export const CS2_PLAYERS = {
  "wxrry": {
    nick: "wxrry",
    isCaptain: true,
    team: "TRIQ",
    elo: 1000,
    steamId: "STEAM_0:1:44920194",
    favWeapon: "AK-47 / Desert Eagle",
    totalKills: 118,
    totalDeaths: 81,
    totalAssists: 36,
    kdRatio: "1.46",
    hsPercentage: "58%",
    matchesPlayed: 3,
    winRate: "67%",
    badges: ["КАПИТАН TRIQ", "ФИНАЛИСТ КУБКА"]
  },
  "coldeph": {
    nick: "coldeph",
    team: "TRIQ",
    elo: 1000,
    steamId: "STEAM_0:1:51928410",
    favWeapon: "AWP / Glock-18",
    totalKills: 104,
    totalDeaths: 65,
    totalAssists: 27,
    kdRatio: "1.60",
    hsPercentage: "42%",
    matchesPlayed: 3,
    winRate: "67%",
    badges: ["TOP FRAGGER", "ФИНАЛИСТ"]
  },
  "RAREMO": {
    nick: "RAREMO",
    team: "TRIQ",
    elo: 1000,
    steamId: "STEAM_0:0:63910284",
    favWeapon: "AK-47 / Galil AR",
    totalKills: 115,
    totalDeaths: 75,
    totalAssists: 32,
    kdRatio: "1.53",
    hsPercentage: "62%",
    matchesPlayed: 3,
    winRate: "67%",
    badges: ["ФИНАЛИСТ"]
  },
  "Toxichniy": {
    nick: "Toxichniy",
    team: "TRIQ",
    elo: 1000,
    steamId: "STEAM_0:1:78291039",
    favWeapon: "M4A1-S / MP9",
    totalKills: 87,
    totalDeaths: 82,
    totalAssists: 24,
    kdRatio: "1.06",
    hsPercentage: "54%",
    matchesPlayed: 3,
    winRate: "67%",
    badges: ["CLUTCH PLAYER", "ФИНАЛИСТ"]
  },
  "Kalivan1703": {
    nick: "Kalivan1703",
    team: "TRIQ",
    elo: 1000,
    steamId: "STEAM_0:0:91028374",
    favWeapon: "M4A4 / USP-S",
    totalKills: 74,
    totalDeaths: 74,
    totalAssists: 25,
    kdRatio: "1.00",
    hsPercentage: "49%",
    matchesPlayed: 3,
    winRate: "67%",
    badges: ["ФИНАЛИСТ"]
  },
  "shhh_11": {
    nick: "shhh_11",
    isCaptain: true,
    team: "LL TEAM",
    elo: 1000,
    steamId: "STEAM_0:1:31849102",
    favWeapon: "AK-47 / AWP",
    totalKills: 50,
    totalDeaths: 39,
    totalAssists: 20,
    kdRatio: "1.28",
    hsPercentage: "55%",
    matchesPlayed: 1,
    winRate: "100%",
    badges: ["ЧЕМПИОН КУБКА 🏆", "КАПИТАН"]
  },
  "t0ma999": {
    nick: "t0ma999",
    team: "LL TEAM",
    elo: 1000,
    steamId: "STEAM_0:0:19284019",
    favWeapon: "AK-47 / Deagle",
    totalKills: 63,
    totalDeaths: 44,
    totalAssists: 21,
    kdRatio: "1.43",
    hsPercentage: "64%",
    matchesPlayed: 1,
    winRate: "100%",
    badges: ["MVP ФИНАЛА ⭐️", "ЧЕМПИОН 🏆"]
  },
  "Flake(1337)": {
    nick: "Flake(1337)",
    team: "LL TEAM",
    elo: 1000,
    steamId: "STEAM_0:1:40192834",
    favWeapon: "M4A1-S",
    totalKills: 42,
    totalDeaths: 41,
    totalAssists: 17,
    kdRatio: "1.02",
    hsPercentage: "51%",
    matchesPlayed: 1,
    winRate: "100%",
    badges: ["ЧЕМПИОН 🏆"]
  },
  "MB_kot": {
    nick: "MB_kot",
    team: "LL TEAM",
    elo: 1000,
    steamId: "STEAM_0:0:58192038",
    favWeapon: "Galil AR / MP9",
    totalKills: 37,
    totalDeaths: 48,
    totalAssists: 20,
    kdRatio: "0.77",
    hsPercentage: "48%",
    matchesPlayed: 1,
    winRate: "100%",
    badges: ["ЧЕМПИОН 🏆"]
  },
  "Utopiya-": {
    nick: "Utopiya-",
    team: "LL TEAM",
    elo: 1000,
    steamId: "STEAM_0:1:77192048",
    favWeapon: "AK-47 / USP-S",
    totalKills: 42,
    totalDeaths: 45,
    totalAssists: 14,
    kdRatio: "0.93",
    hsPercentage: "52%",
    matchesPlayed: 1,
    winRate: "100%",
    badges: ["ЧЕМПИОН 🏆"]
  }
};

// Реальные матчи прошедшего турнира колледжа
export const TOURNAMENT_MATCHES = [
  {
    id: "match_final_ll_vs_triq",
    title: "ФИНАЛ: TRIQ vs LL TEAM",
    stage: "ГРАНД-ФИНАЛ",
    format: "Best of 3 (5v5)",
    duration: "02:05:29",
    region: "Москва (Custom / Без античита)",
    team1: {
      name: "TRIQ",
      seed: "#6",
      score: 1,
      isWinner: false,
      elo: 1000,
      players: [
        { nick: "wxrry", isCaptain: true, elo: 1000, k: 47, d: 48, a: 17 },
        { nick: "Toxichniy", elo: 1000, k: 39, d: 50, a: 8 },
        { nick: "RAREMO", elo: 1000, k: 44, d: 47, a: 18 },
        { nick: "Kalivan1703", elo: 1000, k: 34, d: 47, a: 10 },
        { nick: "coldeph", elo: 1000, k: 51, d: 42, a: 11 }
      ]
    },
    team2: {
      name: "LL TEAM",
      seed: "#4",
      score: 2,
      isWinner: true,
      elo: 1000,
      players: [
        { nick: "shhh_11", isCaptain: true, elo: 1000, k: 50, d: 39, a: 20 },
        { nick: "Flake(1337)", elo: 1000, k: 42, d: 41, a: 17 },
        { nick: "MB_kot", elo: 1000, k: 37, d: 48, a: 20 },
        { nick: "Utopiya-", elo: 1000, k: 42, d: 45, a: 14 },
        { nick: "t0ma999", elo: 1000, k: 63, d: 44, a: 21 }
      ]
    },
    maps: [
      { name: "Vertigo", score1: 13, score2: 9, duration: "02:06:11", winner: "TRIQ" },
      { name: "Anubis", score1: 4, score2: 13, duration: "30:31", winner: "LL TEAM" },
      { name: "Cache", score1: 10, score2: 13, duration: "41:12", winner: "LL TEAM" }
    ]
  },
  {
    id: "match_triq_vs_dodo",
    title: "1/4 ФИНАЛА: TRIQ vs DODO TEAM",
    stage: "РАУНД 2 (1/4 ФИНАЛА)",
    format: "Best of 3 (5v5)",
    duration: "43:09",
    region: "Москва (Custom / Без античита)",
    team1: {
      name: "TRIQ",
      seed: "#6",
      score: 2,
      isWinner: true,
      elo: 1000,
      players: [
        { nick: "wxrry", isCaptain: true, elo: 1000, k: 35, d: 9, a: 7 },
        { nick: "coldeph", elo: 1000, k: 20, d: 6, a: 5 },
        { nick: "Kalivan1703", elo: 1000, k: 17, d: 10, a: 7 },
        { nick: "RAREMO", elo: 1000, k: 39, d: 10, a: 8 },
        { nick: "Toxichniy", elo: 1000, k: 23, d: 12, a: 8 }
      ]
    },
    team2: {
      name: "DODO TEAM",
      seed: "#3",
      score: 0,
      isWinner: false,
      elo: 1000,
      players: [
        { nick: "prokllat", elo: 1000, k: 1, d: 28, a: 2 },
        { nick: "Astronif", isCaptain: true, elo: 1000, k: 5, d: 27, a: 3 },
        { nick: "kotanye", elo: 1000, k: 12, d: 26, a: 3 },
        { nick: "Ganzhubus", elo: 1000, k: 7, d: 27, a: 4 },
        { nick: "yaponec_3", elo: 1000, k: 20, d: 27, a: 4 }
      ]
    },
    maps: [
      { name: "Vertigo", score1: 13, score2: 0, duration: "43:17", winner: "TRIQ" },
      { name: "Mirage", score1: 13, score2: 1, duration: "18:58", winner: "TRIQ" }
    ]
  },
  {
    id: "match_triq_vs_teamb",
    title: "ПОЛУФИНАЛ: TRIQ vs Team V0id",
    stage: "1/2 ФИНАЛА (ПОЛУФИНАЛ)",
    format: "Best of 3 (5v5)",
    duration: "01:03:10",
    region: "Москва (Custom / Без античита)",
    team1: {
      name: "TRIQ",
      seed: "#6",
      score: 2,
      isWinner: true,
      elo: 1000,
      players: [
        { nick: "wxrry", isCaptain: true, elo: 1000, k: 36, d: 24, a: 12 },
        { nick: "Toxichniy", elo: 1000, k: 25, d: 20, a: 8 },
        { nick: "Kalivan1703", elo: 1000, k: 23, d: 17, a: 8 },
        { nick: "RAREMO", elo: 1000, k: 32, d: 18, a: 6 },
        { nick: "coldeph", elo: 1000, k: 33, d: 17, a: 11 }
      ]
    },
    team2: {
      name: "Team V0id",
      seed: "#7",
      score: 0,
      isWinner: false,
      elo: 989,
      players: [
        { nick: "m1hnessy_1", isCaptain: true, elo: 1000, k: 16, d: 30, a: 6 },
        { nick: "sh3f1eld", elo: 991, k: 19, d: 30, a: 4 },
        { nick: "N1x0", elo: 970, k: 24, d: 30, a: 5 },
        { nick: "FeRtEx", elo: 988, k: 17, d: 31, a: 9 },
        { nick: "ion !", elo: 1000, k: 17, d: 30, a: 6 }
      ]
    },
    maps: [
      { name: "Mirage", score1: 13, score2: 3, duration: "01:03:48", winner: "TRIQ" },
      { name: "Inferno", score1: 13, score2: 6, duration: "28:58", winner: "TRIQ" }
    ]
  }
];

// Полная сетка турнира (Single Elimination по официальной схеме)
export const OFFICIAL_BRACKET = {
  title: "CS 2 Single Elimination",
  date: "Прошедшее воскресенье · 12.10.2026",
  round1: [
    {
      matchId: "r1_m1",
      team1: { name: "adaptive", seed: "#8", isWinner: true },
      team2: { name: "ckson", seed: "#9", isWinner: false }
    }
  ],
  round2: [
    {
      matchId: "r2_m1",
      team1: { name: "Aspect", seed: "#1", isWinner: false },
      team2: { name: "adaptive", seed: "#8", isWinner: true }
    },
    {
      matchId: "r2_m2",
      team1: { name: "LL TEAM", seed: "#4", isWinner: true },
      team2: { name: "322DOBEG TEAM", seed: "#5", isWinner: false }
    },
    {
      matchId: "r2_m3",
      team1: { name: "портфель adidas белый", seed: "#2", isWinner: false },
      team2: { name: "Team V0id", seed: "#7", isWinner: true }
    },
    {
      matchId: "r2_m4",
      team1: { name: "DODO TEAM", seed: "#3", isWinner: false, score: "0" },
      team2: { name: "TRIQ", seed: "#6", isWinner: true, score: "2" }
    }
  ],
  semifinals: [
    {
      matchId: "semi_m1",
      team1: { name: "adaptive", seed: "#8", isWinner: false },
      team2: { name: "LL TEAM", seed: "#4", isWinner: true }
    },
    {
      matchId: "semi_m2",
      team1: { name: "Team V0id", seed: "#7", isWinner: false, score: "0" },
      team2: { name: "TRIQ", seed: "#6", isWinner: true, score: "2" }
    }
  ],
  final: {
    matchId: "final",
    team1: { name: "LL TEAM", seed: "#4", isWinner: true, score: "2 🏆" },
    team2: { name: "TRIQ", seed: "#6", isWinner: false, score: "1" }
  },
  thirdPlace: {
    team1: { name: "adaptive", seed: "#8", isWinner: true },
    team2: { name: "Team V0id", seed: "#7", isWinner: false }
  }
};

// Реестр турниров колледжа (сетка доступна только внутри выбранного турнира)
export const TOURNAMENTS_LIST = [
  {
    id: "autumn_2026",
    title: "AITU CS2 Autumn Cup",
    subTitle: "Турнир прошедшего воскресенья",
    type: "past",
    status: "ЗАВЕРШЁН",
    statusBadge: "bg-zinc-800 border-white/20 text-zinc-300",
    date: "12.10.2026 (прошлое воскресенье)",
    format: "Single Elimination · Best of 3 (5v5)",
    teamsCount: "9 команд",
    winner: "LL TEAM 🏆",
    secondPlace: "TRIQ 🥈",
    thirdPlace: "adaptive 🥉",
    bracket: OFFICIAL_BRACKET,
    matches: TOURNAMENT_MATCHES,
    rules: [
      "Формат турнира: Single Elimination (плей-офф на выбывание с матчем за 3-е место).",
      "Формат матчей: Best of 3 (до двух побед по картам). Составы 5 на 5.",
      "Серверы: Москва, выделенный Custom-сервер колледжа.",
      "Карты турнира: Mirage, Vertigo, Anubis, Inferno, Cache, Nuke, Dust II."
    ]
  }
];

// Рейтинг команд колледжа в стиле HLTV World Ranking
export const HLTV_TEAM_RANKINGS = [
  {
    rank: 1,
    change: "+3",
    changeType: "up",
    name: "LL TEAM",
    points: 1000,
    status: "ЧЕМПИОН КУБКА",
    badgeColor: "text-amber-400 border-amber-400/40 bg-amber-950/30",
    trophy: "🏆",
    record: "3-0 (Побед: 100%)",
    roster: [
      { nick: "shhh_11", isCaptain: true },
      { nick: "t0ma999" },
      { nick: "Flake(1337)" },
      { nick: "Utopiya-" },
      { nick: "MB_kot" }
    ]
  },
  {
    rank: 2,
    change: "+4",
    changeType: "up",
    name: "TRIQ",
    points: 748,
    status: "ФИНАЛИСТ КУБКА",
    badgeColor: "text-zinc-200 border-white/30 bg-zinc-800/40",
    trophy: "🥈",
    record: "2-1 (Побед: 67%)",
    roster: [
      { nick: "wxrry", isCaptain: true },
      { nick: "coldeph" },
      { nick: "RAREMO" },
      { nick: "Toxichniy" },
      { nick: "Kalivan1703" }
    ]
  },
  {
    rank: 3,
    change: "+2",
    changeType: "up",
    name: "adaptive",
    points: 520,
    status: "ТОП-3 // БРОНЗА",
    badgeColor: "text-amber-600 border-amber-700/40 bg-amber-950/20",
    trophy: "🥉",
    record: "2-1",
    roster: null
  },
  {
    rank: 4,
    change: "+1",
    changeType: "up",
    name: "Team V0id",
    points: 395,
    status: "ТОП-4 ПОЛУФИНАЛ",
    badgeColor: "text-zinc-400 border-white/10 bg-zinc-900/40",
    trophy: "",
    record: "1-2",
    roster: [
      { nick: "m1hnessy_1", isCaptain: true },
      { nick: "sh3f1eld" },
      { nick: "N1x0" },
      { nick: "FeRtEx" },
      { nick: "ion !" }
    ]
  },
  {
    rank: 5,
    change: "-2",
    changeType: "down",
    name: "DODO TEAM",
    points: 280,
    status: "1/4 ФИНАЛА",
    badgeColor: "text-zinc-500 border-white/10 bg-zinc-900/20",
    trophy: "",
    record: "0-1",
    roster: [
      { nick: "Astronif", isCaptain: true },
      { nick: "prokllat" },
      { nick: "kotanye" },
      { nick: "Ganzhubus" },
      { nick: "yaponec_3" }
    ]
  },
  {
    rank: 6,
    change: "-1",
    changeType: "down",
    name: "322DOBEG TEAM",
    points: 245,
    status: "1/4 ФИНАЛА",
    badgeColor: "text-zinc-500 border-white/10 bg-zinc-900/20",
    trophy: "",
    record: "0-1",
    roster: null
  },
  {
    rank: 7,
    change: "-1",
    changeType: "down",
    name: "портфель adidas белый",
    points: 235,
    status: "1/4 ФИНАЛА",
    badgeColor: "text-zinc-500 border-white/10 bg-zinc-900/20",
    trophy: "",
    record: "0-1",
    roster: null
  },
  {
    rank: 8,
    change: "-3",
    changeType: "down",
    name: "Aspect",
    points: 220,
    status: "1/4 ФИНАЛА",
    badgeColor: "text-zinc-500 border-white/10 bg-zinc-900/20",
    trophy: "",
    record: "0-1",
    roster: null
  },
  {
    rank: 9,
    change: "-",
    changeType: "same",
    name: "ckson",
    points: 150,
    status: "РАУНД 1",
    badgeColor: "text-zinc-600 border-white/5 bg-zinc-950",
    trophy: "",
    record: "0-1",
    roster: null
  }
];

