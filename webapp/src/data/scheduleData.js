// Расписание занятий колледжа AITU
// Соответствует реальным официальным расписаниям всех 4 курсов и 51 группы
import allGroupsSchedule from './allGroupsSchedule.json';

export const DEFAULT_GROUP = "9ПО-43к";
export const GROUP_NAME = DEFAULT_GROUP;

export const ALL_GROUPS_SCHEDULE = allGroupsSchedule;
export const ALL_COLLEGE_GROUPS = Object.keys(ALL_GROUPS_SCHEDULE);

export const GROUPS_BY_COURSE = {
  1: [],
  2: [],
  3: [],
  4: []
};

Object.entries(ALL_GROUPS_SCHEDULE).forEach(([grp, data]) => {
  const c = data.course || 4;
  if (GROUPS_BY_COURSE[c]) {
    GROUPS_BY_COURSE[c].push(grp);
  } else {
    GROUPS_BY_COURSE[c] = [grp];
  }
});

Object.keys(GROUPS_BY_COURSE).forEach(c => {
  GROUPS_BY_COURSE[c].sort();
});

export const POPULAR_GROUPS = ALL_COLLEGE_GROUPS;

export function getCourseFromGroupName(groupName) {
  if (!groupName) return 4;
  if (ALL_GROUPS_SCHEDULE[groupName]?.course) {
    return ALL_GROUPS_SCHEDULE[groupName].course;
  }
  const m = groupName.match(/-([1-4])/);
  if (m) {
    const c = parseInt(m[1], 10);
    if (!isNaN(c) && c >= 1 && c <= 4) return c;
  }
  const m2 = groupName.match(/[^0-9]([1-4])\d/);
  if (m2) {
    const c = parseInt(m2[1], 10);
    if (!isNaN(c) && c >= 1 && c <= 4) return c;
  }
  return 4;
}

// Расписание звонков по курсам (1..4) в точном соответствии с официальным графиком колледжа AITU
export const COURSE_BELL_SCHEDULE = {
  1: {
    1: { 
      range: "09:00 — 10:35", 
      start: "09:00", 
      end: "10:35", 
      part1: "09:00 – 09:45",
      break: "09:45 – 09:50 (5 мин)",
      part2: "09:50 – 10:35",
      breakdown: "09:00–09:45 • перерыв 5 мин • 09:50–10:35" 
    },
    2: { 
      range: "11:10 — 12:45", 
      start: "11:10", 
      end: "12:45", 
      part1: "11:10 – 11:55",
      break: "11:55 – 12:00 (5 мин)",
      part2: "12:00 – 12:45",
      breakdown: "11:10–11:55 • перерыв 5 мин • 12:00–12:45" 
    },
    3: { 
      range: "12:55 — 14:30", 
      start: "12:55", 
      end: "14:30", 
      part1: "12:55 – 13:40",
      break: "13:40 – 13:45 (5 мин)",
      part2: "13:45 – 14:30",
      breakdown: "12:55–13:40 • перерыв 5 мин • 13:45–14:30" 
    },
    4: { 
      range: "14:40 — 16:15", 
      start: "14:40", 
      end: "16:15", 
      part1: "14:40 – 15:25",
      break: "15:25 – 15:30 (5 мин)",
      part2: "15:30 – 16:15",
      breakdown: "14:40–15:25 • перерыв 5 мин • 15:30–16:15" 
    },
  },
  2: {
    1: { 
      range: "09:00 — 10:35", 
      start: "09:00", 
      end: "10:35", 
      part1: "09:00 – 09:45",
      break: "09:45 – 09:50 (5 мин)",
      part2: "09:50 – 10:35",
      breakdown: "09:00–09:45 • перерыв 5 мин • 09:50–10:35" 
    },
    2: { 
      range: "10:45 — 12:45", 
      start: "10:45", 
      end: "12:45", 
      part1: "10:45 – 11:30",
      lunch: "11:30 – 12:00 (ОБЕД 30 мин)",
      part2: "12:00 – 12:45",
      breakdown: "10:45–11:30 • ОБЕД 30 мин • 12:00–12:45" 
    },
    3: { 
      range: "12:55 — 14:30", 
      start: "12:55", 
      end: "14:30", 
      part1: "12:55 – 13:40",
      break: "13:40 – 13:45 (5 мин)",
      part2: "13:45 – 14:30",
      breakdown: "12:55–13:40 • перерыв 5 мин • 13:45–14:30" 
    },
    4: { 
      range: "14:40 — 16:15", 
      start: "14:40", 
      end: "16:15", 
      part1: "14:40 – 15:25",
      break: "15:25 – 15:30 (5 мин)",
      part2: "15:30 – 16:15",
      breakdown: "14:40–15:25 • перерыв 5 мин • 15:30–16:15" 
    },
  },
  3: {
    1: { 
      range: "09:00 — 10:35", 
      start: "09:00", 
      end: "10:35", 
      part1: "09:00 – 09:45",
      break: "09:45 – 09:50 (5 мин)",
      part2: "09:50 – 10:35",
      breakdown: "09:00–09:45 • перерыв 5 мин • 09:50–10:35" 
    },
    2: { 
      range: "10:45 — 12:20", 
      start: "10:45", 
      end: "12:20", 
      part1: "10:45 – 11:30",
      break: "11:30 – 11:35 (5 мин)",
      part2: "11:35 – 12:20",
      breakdown: "10:45–11:30 • перерыв 5 мин • 11:35–12:20" 
    },
    3: { 
      range: "12:55 — 14:30", 
      start: "12:55", 
      end: "14:30", 
      part1: "12:55 – 13:40",
      break: "13:40 – 13:45 (5 мин)",
      part2: "13:45 – 14:30",
      breakdown: "12:55–13:40 • перерыв 5 мин • 13:45–14:30" 
    },
    4: { 
      range: "14:40 — 16:15", 
      start: "14:40", 
      end: "16:15", 
      part1: "14:40 – 15:25",
      break: "15:25 – 15:30 (5 мин)",
      part2: "15:30 – 16:15",
      breakdown: "14:40–15:25 • перерыв 5 мин • 15:30–16:15" 
    },
  },
  4: {
    1: { 
      range: "09:00 — 10:35", 
      start: "09:00", 
      end: "10:35", 
      part1: "09:00 – 09:45",
      break: "09:45 – 09:50 (5 мин)",
      part2: "09:50 – 10:35",
      breakdown: "09:00–09:45 • перерыв 5 мин • 09:50–10:35" 
    },
    2: { 
      range: "10:45 — 12:20", 
      start: "10:45", 
      end: "12:20", 
      part1: "10:45 – 11:30",
      break: "11:30 – 11:35 (5 мин)",
      part2: "11:35 – 12:20",
      breakdown: "10:45–11:30 • перерыв 5 мин • 11:35–12:20" 
    },
    3: { 
      range: "12:55 — 14:30", 
      start: "12:55", 
      end: "14:30", 
      part1: "12:55 – 13:40",
      break: "13:40 – 13:45 (5 мин)",
      part2: "13:45 – 14:30",
      breakdown: "12:55–13:40 • перерыв 5 мин • 13:45–14:30" 
    },
    4: { 
      range: "14:40 — 16:15", 
      start: "14:40", 
      end: "16:15", 
      part1: "14:40 – 15:25",
      break: "15:25 – 15:30 (5 мин)",
      part2: "15:30 – 16:15",
      breakdown: "14:40–15:25 • перерыв 5 мин • 15:30–16:15" 
    },
  }
};

export const COURSE_LUNCH = {
  1: { start: "10:35", end: "11:10", range: "10:35 — 11:10", duration: "35 минут", desc: "Обед после 1-й пары (10:35 — 11:10)" },
  2: { start: "11:30", end: "12:00", range: "11:30 — 12:00", duration: "30 минут", desc: "Обед внутри 2-й пары (11:30 — 12:00)" },
  3: { start: "12:20", end: "12:55", range: "12:20 — 12:55", duration: "35 минут", desc: "Обед после 2-й пары (12:20 — 12:55)" },
  4: { start: "12:20", end: "12:55", range: "12:20 — 12:55", duration: "35 минут", desc: "Обед после 2-й пары (12:20 — 12:55)" }
};

// Сводная матрица всех 4 курсов в точном соответствии с фото расписания звонков
export const PHOTO_BELL_MATRIX = [
  {
    id: "p1",
    label: "1 пара",
    type: "pair",
    rows: [
      { c1: "9.00 - 9.45", c2: "9.00 - 9.45", c3: "9.00 - 9.45", c4: "9.00 - 9.45" },
      { c1: "9.50 - 10.35", c2: "9.50 - 10.35", c3: "9.50 - 10.35", c4: "9.50 - 10.35" }
    ]
  },
  {
    id: "lunch1",
    label: "обед",
    type: "lunch",
    c1Lunch: "обед 10.35 - 11.10",
    c2Lunch: null,
    c3Lunch: null,
    c4Lunch: null
  },
  {
    id: "p2_top",
    label: "2 пара",
    type: "pair_top",
    rows: [
      { c1: "11.10 - 11.55", c2: "10.45 - 11.30", c3: "10.45 - 11.30", c4: "10.45 - 11.30" },
      { c1: "12.00 - 12.45", c2: null, c3: "11.35 - 12.20", c4: "11.35 - 12.20" }
    ]
  },
  {
    id: "lunch2",
    label: "обед",
    type: "lunch",
    c1Lunch: null,
    c2Lunch: "обед 11.30 - 12.00",
    c3Lunch: null,
    c4Lunch: null
  },
  {
    id: "p2_bottom_and_lunch",
    label: "2 пара / обед",
    type: "pair_bottom_lunch",
    c1: null,
    c2: "12.00 - 12.45",
    c3Lunch: "обед 12.20 - 12.55",
    c4Lunch: "обед 12.20 - 12.55"
  },
  {
    id: "p3",
    label: "3 пара",
    type: "pair",
    rows: [
      { c1: "12.55 - 13.40", c2: "12.55 - 13.40", c3: "12.55 - 13.40", c4: "12.55 - 13.40" },
      { c1: "13.45 - 14.30", c2: "13.45 - 14.30", c3: "13.45 - 14.30", c4: "13.45 - 14.30" }
    ]
  },
  {
    id: "p4",
    label: "4 пара",
    type: "pair",
    rows: [
      { c1: "14.40 - 15.25", c2: "14.40 - 15.25", c3: "14.40 - 15.25", c4: "14.40 - 15.25" },
      { c1: "15.30 - 16.15", c2: "15.30 - 16.15", c3: "15.30 - 16.15", c4: "15.30 - 16.15" }
    ]
  }
];

export function getBellSchedule(course = 4) {
  return COURSE_BELL_SCHEDULE[course] || COURSE_BELL_SCHEDULE[4];
}

export function getLunchBreak(course = 4) {
  return COURSE_LUNCH[course] || COURSE_LUNCH[4];
}

export const BELL_SCHEDULE = COURSE_BELL_SCHEDULE[4];
export const LUNCH_BREAK = COURSE_LUNCH[4];

export const DAYS_RU = [
  { id: 0, name: "Понедельник", short: "Пн", code: "MON" },
  { id: 1, name: "Вторник", short: "Вт", code: "TUE" },
  { id: 2, name: "Среда", short: "Ср", code: "WED" },
  { id: 3, name: "Четверг", short: "Чт", code: "THU" },
  { id: 4, name: "Пятница", short: "Пт", code: "FRI" },
  { id: 5, name: "Суббота", short: "Сб", code: "SAT", isWeekend: true },
  { id: 6, name: "Воскресенье", short: "Вс", code: "SUN", isWeekend: true }
];

// Реальное расписание занятий группы (0 = Пн, ..., 6 = Вс)
export const RAW_SCHEDULE = {
  0: { // Понедельник
    1: {
      split: true,
      chislitel: {
        subject: "МДК 04.01 Внедрение и поддержка КС",
        room: "каб. 305",
        teacher: "Смирнова Анастасия Владимировна"
      },
      znamenatel: {
        subject: "Физическая культура",
        room: "С/з",
        teacher: "Червинский Виталий Иванович"
      }
    },
    2: {
      split: false,
      subject: "Психология общения",
      room: "каб. 520",
      teacher: "Ерошкина Марина Юрьевна"
    },
    3: {
      split: false,
      subject: "Безопасность жизнедеятельности (БЖД)",
      room: "каб. 505",
      teacher: "Осипов Денис Леонидович"
    },
    4: {
      split: false,
      subject: "Безопасность жизнедеятельности (БЖД)",
      room: "каб. 505",
      teacher: "Осипов Денис Леонидович"
    }
  },
  1: { // Вторник
    1: {
      split: false,
      subject: "Безопасность жизнедеятельности (БЖД)",
      room: "каб. 505",
      teacher: "Осипов Денис Леонидович"
    },
    2: {
      split: true,
      chislitel: {
        subject: "Менеджмент в ПД",
        room: "каб. 612",
        teacher: "Избасарова А.К."
      },
      znamenatel: {
        subject: "МДК 07.02 Сертификация ИС",
        room: "каб. 622",
        teacher: "Щербакова Мария Александровна"
      }
    },
    3: {
      split: false,
      subject: "МДК 04.01 Внедрение и поддержка КС",
      room: "каб. 305",
      teacher: "Смирнова Анастасия Владимировна"
    },
    4: {
      split: true,
      chislitel: {
        subject: "Иностранный язык",
        room: "каб. 515",
        teacher: "Клещева Елена Георгиевна"
      },
      znamenatel: null
    }
  },
  2: { // Среда
    2: {
      split: false,
      subject: "Менеджмент в ПД",
      room: "каб. 612",
      teacher: "Избасарова А.К."
    },
    3: {
      split: true,
      chislitel: {
        subject: "МДК 07.02 Сертификация ИС",
        room: "каб. 622",
        teacher: "Щербакова Мария Александровна"
      },
      znamenatel: {
        subject: "МДК 04.01 Внедрение и поддержка КС",
        room: "каб. 305",
        teacher: "Смирнова Анастасия Владимировна"
      }
    },
    4: {
      split: false,
      subject: "Иностранный язык",
      room: "каб. 515",
      teacher: "Клещева Елена Георгиевна"
    }
  },
  3: { // Четверг
    1: {
      split: false,
      subject: "Физическая культура",
      room: "С/з",
      teacher: "Червинский Виталий Иванович"
    },
    2: {
      split: false,
      subject: "Иностранный язык",
      room: "каб. 515",
      teacher: "Клещева Елена Георгиевна"
    },
    3: {
      split: false,
      subject: "МДК 07.02 Сертификация ИС",
      room: "каб. 304",
      teacher: "Щербакова Мария Александровна"
    },
    4: {
      split: true,
      chislitel: null,
      znamenatel: {
        subject: "Психология общения",
        room: "каб. 609",
        teacher: "Ерошкина Марина Юрьевна"
      }
    }
  },
  4: { // Пятница
    1: {
      split: false,
      subject: "Физическая культура",
      room: "С/з",
      teacher: "Червинский Виталий Иванович"
    },
    2: {
      split: false,
      subject: "МДК 07.02 Сертификация ИС",
      room: "каб. 622",
      teacher: "Щербакова Мария Александровна"
    },
    3: {
      split: false,
      subject: "Экономика отрасли",
      room: "каб. 616",
      teacher: "Шевченко Татьяна Анатольевна"
    },
    4: {
      split: false,
      subject: "Экономика отрасли",
      room: "каб. 616",
      teacher: "Шевченко Татьяна Анатольевна"
    }
  }
};

export const COURSE_SCHEDULES = {
  1: {
    0: {
      1: { subject: "Математика", room: "каб. 410", teacher: "Кузнецова В.И." },
      2: { subject: "Информатика", room: "каб. 302", teacher: "Смирнова Анастасия Владимировна" },
      3: { subject: "Физика", room: "каб. 408", teacher: "Николаев Д.С." },
      4: { subject: "Физическая культура", room: "С/з", teacher: "Червинский Виталий Иванович" },
    },
    1: {
      1: { subject: "История", room: "каб. 512", teacher: "Романов С.П." },
      2: { subject: "Русский язык", room: "каб. 514", teacher: "Морозова Е.А." },
      3: { subject: "Литературное чтение / Литература", room: "каб. 514", teacher: "Морозова Е.А." },
      4: { subject: "Иностранный язык", room: "каб. 515", teacher: "Клещева Елена Георгиевна" },
    },
    2: {
      2: { subject: "Математика", room: "каб. 410", teacher: "Кузнецова В.И." },
      3: { subject: "Информатика", room: "каб. 302", teacher: "Смирнова Анастасия Владимировна" },
      4: { subject: "Обществознание", room: "каб. 512", teacher: "Романов С.П." },
    },
    3: {
      1: { subject: "Физика", room: "каб. 408", teacher: "Николаев Д.С." },
      2: { subject: "География", room: "каб. 405", teacher: "Васильева О.Н." },
      3: { subject: "ОБЖ", room: "каб. 505", teacher: "Осипов Денис Леонидович" },
      4: { subject: "Физическая культура", room: "С/з", teacher: "Червинский Виталий Иванович" },
    },
    4: {
      1: { subject: "Математика", room: "каб. 410", teacher: "Кузнецова В.И." },
      2: { subject: "Литература", room: "каб. 514", teacher: "Морозова Е.А." },
      3: { subject: "Информатика", room: "каб. 302", teacher: "Смирнова Анастасия Владимировна" },
      4: { subject: "Иностранный язык", room: "каб. 515", teacher: "Клещева Елена Георгиевна" },
    },
    5: {},
    6: {}
  },
  2: {
    0: {
      1: { subject: "Основы алгоритмизации и программирования", room: "каб. 305", teacher: "Смирнова Анастасия Владимировна" },
      2: { subject: "Архитектура аппаратных средств", room: "каб. 412", teacher: "Ковалев И.М." },
      3: { subject: "Дискретная математика", room: "каб. 410", teacher: "Кузнецова В.И." },
      4: { subject: "Физическая культура", room: "С/з", teacher: "Червинский Виталий Иванович" },
    },
    1: {
      1: { subject: "Элементы высшей математики", room: "каб. 410", teacher: "Кузнецова В.И." },
      2: { subject: "Основы алгоритмизации и программирования", room: "каб. 305", teacher: "Смирнова Анастасия Владимировна" },
      3: { subject: "Операционные системы", room: "каб. 304", teacher: "Воронов А.С." },
      4: { subject: "Иностранный язык", room: "каб. 515", teacher: "Клещева Елена Георгиевна" },
    },
    2: {
      2: { subject: "Архитектура аппаратных средств", room: "каб. 412", teacher: "Ковалев И.М." },
      3: { subject: "Базы данных", room: "каб. 622", teacher: "Щербакова Мария Александровна" },
      4: { subject: "Инженерная графика", room: "каб. 402", teacher: "Соколов П.В." },
    },
    3: {
      1: { subject: "Дискретная математика", room: "каб. 410", teacher: "Кузнецова В.И." },
      2: { subject: "Операционные системы", room: "каб. 304", teacher: "Воронов А.С." },
      3: { subject: "Физическая культура", room: "С/з", teacher: "Червинский Виталий Иванович" },
      4: { subject: "Элементы высшей математики", room: "каб. 410", teacher: "Кузнецова В.И." },
    },
    4: {
      1: { subject: "Основы алгоритмизации и программирования", room: "каб. 305", teacher: "Смирнова Анастасия Владимировна" },
      2: { subject: "Базы данных", room: "каб. 622", teacher: "Щербакова Мария Александровна" },
      3: { subject: "Иностранный язык", room: "каб. 515", teacher: "Клещева Елена Георгиевна" },
      4: { subject: "Безопасность жизнедеятельности", room: "каб. 505", teacher: "Осипов Денис Леонидович" },
    },
    5: {},
    6: {}
  },
  3: {
    0: {
      1: { subject: "МДК 01.01 Разработка программных модулей", room: "каб. 305", teacher: "Смирнова Анастасия Владимировна" },
      2: { subject: "Компьютерные сети", room: "каб. 308", teacher: "Григорьев В.А." },
      3: { subject: "Информационная безопасность", room: "каб. 505", teacher: "Осипов Денис Леонидович" },
      4: { subject: "Физическая культура", room: "С/з", teacher: "Червинский Виталий Иванович" },
    },
    1: {
      1: { subject: "Компьютерные сети", room: "каб. 308", teacher: "Григорьев В.А." },
      2: { subject: "МДК 01.02 Поддержка и тестирование ПО", room: "каб. 622", teacher: "Щербакова Мария Александровна" },
      3: { subject: "Базы данных", room: "каб. 622", teacher: "Щербакова Мария Александровна" },
      4: { subject: "Иностранный язык", room: "каб. 515", teacher: "Клещева Елена Георгиевна" },
    },
    2: {
      2: { subject: "МДК 01.01 Разработка программных модулей", room: "каб. 305", teacher: "Смирнова Анастасия Владимировна" },
      3: { subject: "Проектирование архитектуры ПО", room: "каб. 612", teacher: "Избасарова А.К." },
      4: { subject: "Инструментальные средства разработки", room: "каб. 304", teacher: "Воронов А.С." },
    },
    3: {
      1: { subject: "Базы данных (лаб.)", room: "каб. 622", teacher: "Щербакова Мария Александровна" },
      2: { subject: "Инструментальные средства разработки", room: "каб. 304", teacher: "Воронов А.С." },
      3: { subject: "Физическая культура", room: "С/з", teacher: "Червинский Виталий Иванович" },
      4: { subject: "Системное программирование", room: "каб. 305", teacher: "Смирнова Анастасия Владимировна" },
    },
    4: {
      1: { subject: "МДК 01.02 Поддержка и тестирование ПО", room: "каб. 622", teacher: "Щербакова Мария Александровна" },
      2: { subject: "Информационная безопасность", room: "каб. 505", teacher: "Осипов Денис Леонидович" },
      3: { subject: "Инструментальные средства разработки", room: "каб. 304", teacher: "Воронов А.С." },
      4: { subject: "Иностранный язык", room: "каб. 515", teacher: "Клещева Елена Георгиевна" },
    },
    5: {},
    6: {}
  },
  4: RAW_SCHEDULE
};

// Расчет четности недели относительно якорной даты 12.10.2026 (Понедельник, Числитель)
export function getWeekParity(targetDate = new Date()) {
  const anchor = new Date(2026, 9, 12);
  const anchorMonday = new Date(anchor);
  anchorMonday.setHours(0, 0, 0, 0);

  const t = new Date(targetDate);
  t.setHours(0, 0, 0, 0);

  const diffTime = t.getTime() - anchorMonday.getTime();
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  const normalized = Math.abs(diffWeeks);
  return normalized % 2 === 0 ? "chislitel" : "znamenatel";
}

// Получить пары для дня с учетом конкретной группы и расписания звонков курса
export function getPairsForDay(dayIndex, parity = 'chislitel', groupOrCourse = DEFAULT_GROUP) {
  let groupName = DEFAULT_GROUP;
  let course = 4;

  if (typeof groupOrCourse === 'string') {
    groupName = groupOrCourse;
    course = getCourseFromGroupName(groupName);
  } else if (typeof groupOrCourse === 'number') {
    course = groupOrCourse;
    const repGroups = { 1: "9РПО-11", 2: "9ПО-21", 3: "9ПО-31", 4: "9ПО-43к" };
    groupName = repGroups[course] || DEFAULT_GROUP;
  }

  const grpData = ALL_GROUPS_SCHEDULE[groupName] || ALL_GROUPS_SCHEDULE[DEFAULT_GROUP];
  const daySchedule = grpData?.days?.[String(dayIndex)] || grpData?.days?.[dayIndex] || {};
  const bells = getBellSchedule(course);
  const result = [];

  const formatRoom = (rm) => {
    if (!rm || rm === '—') return '—';
    const s = String(rm).trim();
    if (s.startsWith('каб.') || s.includes('С/з') || s.includes(',')) return s;
    return `каб. ${s}`;
  };

  for (let num = 1; num <= 4; num++) {
    const rawPair = daySchedule[String(num)] || daySchedule[num];
    const bell = bells[num] || COURSE_BELL_SCHEDULE[4][num];

    if (!rawPair) {
      result.push({
        num,
        pair: num,
        time: bell.range,
        start: bell.start,
        end: bell.end,
        breakdown: bell.breakdown,
        subject: "Нет пары",
        room: "—",
        teacher: "—",
        hasLesson: false,
        split: false
      });
      continue;
    }

    if (rawPair.split) {
      const lesson = parity === 'chislitel' ? rawPair.chislitel : rawPair.znamenatel;
      if (!lesson) {
        result.push({
          num,
          pair: num,
          time: bell.range,
          start: bell.start,
          end: bell.end,
          breakdown: bell.breakdown,
          subject: "Нет пары",
          room: "—",
          teacher: "—",
          hasLesson: false,
          split: true,
          splitNote: parity === 'chislitel' ? "Числитель" : "Знаменатель"
        });
        continue;
      }

      result.push({
        num,
        pair: num,
        time: bell.range,
        start: bell.start,
        end: bell.end,
        breakdown: bell.breakdown,
        subject: lesson.subject,
        room: formatRoom(lesson.room),
        teacher: lesson.teacher || "—",
        hasLesson: true,
        split: true,
        splitNote: parity === 'chislitel' ? "Числитель" : "Знаменатель"
      });
    } else {
      result.push({
        num,
        pair: num,
        time: bell.range,
        start: bell.start,
        end: bell.end,
        breakdown: bell.breakdown,
        subject: rawPair.subject,
        room: formatRoom(rawPair.room),
        teacher: rawPair.teacher || "—",
        hasLesson: true,
        split: false
      });
    }
  }

  return result;
}

// Расчет статуса текущей пары с учетом курса и расписания группы студента
export function getCurrentPairStatus(now = new Date(), parity = 'chislitel', groupOrCourse = DEFAULT_GROUP) {
  let groupName = DEFAULT_GROUP;
  let course = 4;

  if (typeof groupOrCourse === 'string') {
    groupName = groupOrCourse;
    course = getCourseFromGroupName(groupName);
  } else if (typeof groupOrCourse === 'number') {
    course = groupOrCourse;
    const repGroups = { 1: "9РПО-11", 2: "9ПО-21", 3: "9ПО-31", 4: "9ПО-43к" };
    groupName = repGroups[course] || DEFAULT_GROUP;
  }

  const jsDay = now.getDay();
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon..6=Sun
  const bells = getBellSchedule(course);
  const lunch = getLunchBreak(course);

  if (dayIndex >= 5) {
    return {
      type: "weekend",
      title: "ВЫХОДНОЙ ДЕНЬ",
      message: "Пар нет. Отдыхайте и восстанавливайте силы."
    };
  }

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const pairs = getPairsForDay(dayIndex, parity, groupName);

  const parseMins = (str) => {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  };

  // Интервалы по звонкам конкретного курса
  const p1 = { start: parseMins(bells[1].start), end: parseMins(bells[1].end) };
  const p2 = { start: parseMins(bells[2].start), end: parseMins(bells[2].end) };
  const p3 = { start: parseMins(bells[3].start), end: parseMins(bells[3].end) };
  const p4 = { start: parseMins(bells[4].start), end: parseMins(bells[4].end) };
  const lunchInterval = { start: parseMins(lunch.start), end: parseMins(lunch.end) };

  if (currentMinutes < p1.start) {
    const firstPair = pairs.find(p => p.hasLesson);
    return {
      type: "before_classes",
      title: "ЗАНЯТИЯ ЕЩЁ НЕ НАЧАЛИСЬ",
      message: `Начало в ${bells[1].start} · Первая пара: ${firstPair?.subject || "Нет пары"}`,
      nextPair: firstPair
    };
  }

  if (currentMinutes >= p4.end) {
    return {
      type: "after_classes",
      title: "ПАРЫ НА СЕГОДНЯ ЗАВЕРШЕНЫ",
      message: "Учебный день окончен. До встречи на следующих парах!"
    };
  }

  // Обед курса
  if (currentMinutes >= lunchInterval.start && currentMinutes < lunchInterval.end) {
    const remaining = lunchInterval.end - currentMinutes;
    const elapsed = currentMinutes - lunchInterval.start;
    const total = lunchInterval.end - lunchInterval.start;
    const progress = Math.min(100, Math.round((elapsed / total) * 100));
    const nextPairNum = course === 1 ? 2 : 3;
    const nextPair = pairs.find(p => p.num === nextPairNum);
    return {
      type: "lunch",
      title: "ОБЕДЕННЫЙ ПЕРЕРЫВ",
      remaining,
      elapsed,
      total,
      progress,
      time: lunch.range,
      message: `Осталось ${remaining} мин (${lunch.desc}) · Далее: ${nextPair?.subject || `${nextPairNum}-я пара`}`,
      nextPair,
      nextPairNum
    };
  }

  // Проверка активных пар
  const intervals = [
    { num: 1, ...p1 },
    { num: 2, ...p2 },
    { num: 3, ...p3 },
    { num: 4, ...p4 },
  ];

  for (const interval of intervals) {
    if (currentMinutes >= interval.start && currentMinutes <= interval.end) {
      const pairData = pairs.find(p => p.num === interval.num);
      const elapsed = currentMinutes - interval.start;
      const total = interval.end - interval.start;
      const remaining = interval.end - currentMinutes;
      const progress = Math.min(100, Math.round((elapsed / total) * 100));

      const breakStart = interval.start + 45;
      const breakEnd = interval.start + 50;

      let phase = "first_half";
      let phaseTitle = "1-я половина (45 мин)";
      let phaseRemaining = breakStart - currentMinutes;
      let phaseText = `До пятиминутки: ${phaseRemaining} мин`;

      if (currentMinutes >= breakStart && currentMinutes < breakEnd) {
        phase = "micro_break";
        phaseTitle = "Пятиминутка внутри пары";
        phaseRemaining = breakEnd - currentMinutes;
        phaseText = `До 2-й половины: ${phaseRemaining} мин`;
      } else if (currentMinutes >= breakEnd) {
        phase = "second_half";
        phaseTitle = "2-я половина (45 мин)";
        phaseRemaining = interval.end - currentMinutes;
        phaseText = `До звонка с пары: ${phaseRemaining} мин`;
      }

      return {
        type: "in_pair",
        num: interval.num,
        title: `СЕЙЧАС ИДЁТ ${interval.num}-Я ПАРА`,
        time: bells[interval.num].range,
        pairData,
        remaining,
        progress,
        elapsed,
        phase,
        phaseTitle,
        phaseRemaining,
        phaseText
      };
    }
  }

  // Перемены между парами
  const breaks = [
    { fromPair: 1, toPair: 2, start: p1.end, end: p2.start },
    { fromPair: 2, toPair: 3, start: p2.end, end: p3.start },
    { fromPair: 3, toPair: 4, start: p3.end, end: p4.start }
  ];

  for (const b of breaks) {
    if (currentMinutes >= b.start && currentMinutes < b.end) {
      const remaining = b.end - currentMinutes;
      const elapsed = currentMinutes - b.start;
      const total = b.end - b.start;
      const progress = Math.min(100, Math.round((elapsed / Math.max(1, total)) * 100));
      const nextPair = pairs.find(p => p.num === b.toPair);

      return {
        type: "break",
        title: `ПЕРЕМЕНА ПЕРЕД ${b.toPair}-Й ПАРОЙ`,
        remaining,
        elapsed,
        total,
        progress,
        fromPair: b.fromPair,
        toPair: b.toPair,
        nextPair,
        message: `До звонка на ${b.toPair}-ю пару: ${remaining} мин · Далее: ${nextPair?.subject || `${b.toPair}-я пара`}`
      };
    }
  }

  // Перемены общий фоллбэк
  return {
    type: "break",
    title: "ПЕРЕМЕНА",
    message: "Перерыв между занятиями. Следите за звонками."
  };
}
