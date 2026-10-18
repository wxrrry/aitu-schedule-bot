// Утилита анализа занятости и поиска свободных аудиторий колледжа AITU
// Анализирует все 51 группу колледжа из официального расписания
import allGroupsSchedule from '../data/allGroupsSchedule.json';

// Полный реестр учебных аудиторий колледжа AITU (55 аудиторий по 7 этажам)
export const ALL_COLLEGE_ROOMS = [
  "каб. 205", "каб. 216", "каб. 217", 
  "каб. 301", "каб. 304", "каб. 305", "каб. 308", "каб. 309",
  "каб. 404", "каб. 409", "каб. 422", "каб. 424", "каб. 431", "каб. 434", 
  "каб. 505", "каб. 506", "каб. 507", "каб. 510", "каб. 512", "каб. 513", 
  "каб. 514", "каб. 515", "каб. 516", "каб. 517", "каб. 520", "каб. 521", 
  "каб. 601", "каб. 605", "каб. 606", "каб. 607", "каб. 608", "каб. 609", 
  "каб. 610", "каб. 611", "каб. 612", "каб. 613", "каб. 614", "каб. 615", 
  "каб. 616", "каб. 618", "каб. 622", 
  "каб. 701", "каб. 706", "каб. 710", "каб. 711", "каб. 712", "каб. 713", 
  "каб. 714", "каб. 715", "каб. 716", "каб. 718", "каб. 722",
  "каб. 906", "каб. 907", "каб. 908"
];

/**
 * Нормализует номер кабинета в вид "каб. XXX"
 */
function normalizeRoom(raw) {
  if (!raw || raw === '—' || raw === 'С/з') return [];
  const rooms = [];
  String(raw).split(',').forEach(part => {
    const cleanNum = part.trim().replace(/^каб\.?\s*/i, '');
    if (cleanNum && !isNaN(cleanNum)) {
      rooms.push(`каб. ${cleanNum}`);
    }
  });
  return rooms;
}

/**
 * Возвращает занятые и свободные аудитории на выбранный день и пару
 * @param {number} dayIndex - 0 = Пн ... 5 = Сб
 * @param {number} pairNum - 1..4
 * @param {string} parity - 'chislitel' | 'znamenatel'
 */
export function getRoomOccupancy(dayIndex = 0, pairNum = 1, parity = 'chislitel') {
  const occupiedMap = new Map(); // room -> { group, course, subject, teacher }

  const dayKey = String(dayIndex);
  const pairKey = String(pairNum);

  // Сканируем расписание всех 51 групп
  Object.entries(allGroupsSchedule).forEach(([groupName, groupData]) => {
    const dayData = groupData?.days?.[dayKey];
    if (!dayData) return;

    const pair = dayData[pairKey];
    if (!pair) return;

    let activeLesson = null;
    if (pair.split) {
      activeLesson = pair[parity] || pair.chislitel || pair.znamenatel;
    } else {
      activeLesson = pair;
    }

    if (activeLesson && activeLesson.room && activeLesson.room !== '—' && activeLesson.room !== 'С/з') {
      const parsedRooms = normalizeRoom(activeLesson.room);
      parsedRooms.forEach(rm => {
        if (!occupiedMap.has(rm)) {
          occupiedMap.set(rm, {
            group: groupName,
            course: groupData.course || 1,
            subject: activeLesson.subject || 'Занятие',
            teacher: activeLesson.teacher || 'Преподаватель'
          });
        }
      });
    }
  });

  const freeRooms = ALL_COLLEGE_ROOMS.filter(r => !occupiedMap.has(r));
  const occupiedRooms = ALL_COLLEGE_ROOMS.filter(r => occupiedMap.has(r)).map(r => ({
    room: r,
    ...occupiedMap.get(r)
  }));

  // Группировка свободных аудиторий по этажам (2, 3, 4, 5, 6, 7, 9)
  const byFloor = {
    2: freeRooms.filter(r => r.startsWith('каб. 2')),
    3: freeRooms.filter(r => r.startsWith('каб. 3')),
    4: freeRooms.filter(r => r.startsWith('каб. 4')),
    5: freeRooms.filter(r => r.startsWith('каб. 5')),
    6: freeRooms.filter(r => r.startsWith('каб. 6')),
    7: freeRooms.filter(r => r.startsWith('каб. 7')),
    9: freeRooms.filter(r => r.startsWith('каб. 9'))
  };

  return {
    dayIndex,
    pairNum,
    parity,
    freeRooms,
    occupiedRooms,
    byFloor,
    freeCount: freeRooms.length,
    occupiedCount: occupiedRooms.length,
    totalCount: ALL_COLLEGE_ROOMS.length
  };
}

// Кэшированный список преподавателей в памяти для мгновенного поиска
let _cachedTeachersList = null;

/**
 * Извлекает полный список всех преподавателей колледжа из расписания всех групп
 */
export function getAllTeachersFromSchedule() {
  if (_cachedTeachersList) return _cachedTeachersList;

  const teacherMap = new Map();

  Object.entries(allGroupsSchedule).forEach(([groupName, groupData]) => {
    if (!groupData?.days) return;
    Object.entries(groupData.days).forEach(([dayKey, dayData]) => {
      Object.entries(dayData).forEach(([pairKey, pair]) => {
        const checkLesson = (l) => {
          if (!l || !l.teacher || l.teacher === '—') return;
          const tName = l.teacher.trim();
          if (!teacherMap.has(tName)) {
            teacherMap.set(tName, {
              name: tName,
              subjects: new Set(),
              rooms: new Set(),
              groups: new Set()
            });
          }
          const tObj = teacherMap.get(tName);
          if (l.subject && l.subject !== '—') tObj.subjects.add(l.subject.trim());
          if (l.room && l.room !== '—') tObj.rooms.add(l.room.trim());
          tObj.groups.add(groupName);
        };

        if (pair.split) {
          checkLesson(pair.chislitel);
          checkLesson(pair.znamenatel);
        } else {
          checkLesson(pair);
        }
      });
    });
  });

  _cachedTeachersList = Array.from(teacherMap.values()).map(t => ({
    name: t.name,
    subjects: Array.from(t.subjects),
    rooms: Array.from(t.rooms),
    groups: Array.from(t.groups)
  })).sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  return _cachedTeachersList;
}

/**
 * Ищет текущий статус и расписание преподавателя в реальном времени
 */
export function findTeacherLiveStatus(teacherNameQuery, dayIndex = 0, currentPairNum = 1, parity = 'chislitel') {
  if (!teacherNameQuery || !teacherNameQuery.trim()) return null;
  const q = teacherNameQuery.toLowerCase().trim();

  const dayKey = String(dayIndex);
  const lessonsToday = [];
  const weeklyLessons = [];

  Object.entries(allGroupsSchedule).forEach(([groupName, groupData]) => {
    if (!groupData?.days) return;

    Object.entries(groupData.days).forEach(([dKey, dayData]) => {
      Object.entries(dayData).forEach(([pKey, pair]) => {
        const pairNum = Number(pKey);
        let activeLesson = null;
        if (pair.split) {
          activeLesson = pair[parity] || pair.chislitel || pair.znamenatel;
        } else {
          activeLesson = pair;
        }

        if (activeLesson && activeLesson.teacher && activeLesson.teacher.toLowerCase().includes(q)) {
          const item = {
            dayIndex: Number(dKey),
            pairNum,
            group: groupName,
            course: groupData.course || 1,
            subject: activeLesson.subject || 'Занятие',
            room: activeLesson.room || '—',
            teacher: activeLesson.teacher
          };
          weeklyLessons.push(item);
          if (dKey === dayKey) {
            lessonsToday.push(item);
          }
        }
      });
    });
  });

  lessonsToday.sort((a, b) => a.pairNum - b.pairNum);
  weeklyLessons.sort((a, b) => a.dayIndex === b.dayIndex ? a.pairNum - b.pairNum : a.dayIndex - b.dayIndex);

  const currentPairLesson = lessonsToday.find(l => l.pairNum === currentPairNum) || null;
  const nextPairLesson = lessonsToday.find(l => l.pairNum > currentPairNum) || null;

  return {
    query: teacherNameQuery,
    matchedTeacher: lessonsToday[0]?.teacher || weeklyLessons[0]?.teacher || teacherNameQuery,
    isTeachingNow: Boolean(currentPairLesson),
    currentPairLesson,
    nextPairLesson,
    lessonsToday,
    weeklyLessons,
    totalPairsThisWeek: weeklyLessons.length
  };
}
