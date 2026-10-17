// Утилита анализа занятости и поиска свободных аудиторий колледжа AITU
import { COURSE_SCHEDULES } from '../data/scheduleData';

// Все основные учебные аудитории колледжа
export const ALL_COLLEGE_ROOMS = [
  "каб. 302",
  "каб. 304",
  "каб. 305",
  "каб. 308",
  "каб. 402",
  "каб. 405",
  "каб. 408",
  "каб. 410",
  "каб. 412",
  "каб. 505",
  "каб. 512",
  "каб. 514",
  "каб. 515",
  "каб. 520",
  "каб. 612",
  "каб. 616",
  "каб. 622"
];

/**
 * Возвращает занятые и свободные аудитории на выбранный день и пару
 * @param {number} dayIndex - 0 = Пн, 1 = Вт, 2 = Ср, 3 = Чт, 4 = Пт, 5 = Сб
 * @param {number} pairNum - 1..4
 * @param {string} parity - 'chislitel' | 'znamenatel'
 */
export function getRoomOccupancy(dayIndex = 0, pairNum = 1, parity = 'chislitel') {
  const occupiedMap = new Map(); // room -> { course, subject, teacher }

  // Проверяем все 4 курса
  [1, 2, 3, 4].forEach(course => {
    const courseSched = COURSE_SCHEDULES[course];
    if (!courseSched) return;
    const daySched = courseSched[dayIndex];
    if (!daySched) return;
    const pair = daySched[pairNum];
    if (!pair) return;

    let activeLesson = null;
    if (pair.split) {
      activeLesson = pair[parity] || pair.chislitel || pair.znamenatel;
    } else {
      activeLesson = pair;
    }

    if (activeLesson && activeLesson.room && activeLesson.room !== '—' && activeLesson.room !== 'С/з') {
      const cleanRoom = activeLesson.room.trim();
      occupiedMap.set(cleanRoom, {
        course,
        subject: activeLesson.subject,
        teacher: activeLesson.teacher || 'Кафедра'
      });
    }
  });

  const freeRooms = ALL_COLLEGE_ROOMS.filter(r => !occupiedMap.has(r));
  const occupiedRooms = ALL_COLLEGE_ROOMS.filter(r => occupiedMap.has(r)).map(r => ({
    room: r,
    ...occupiedMap.get(r)
  }));

  // Группировка свободных аудиторий по этажам (3, 4, 5, 6)
  const byFloor = {
    3: freeRooms.filter(r => r.includes('каб. 3')),
    4: freeRooms.filter(r => r.includes('каб. 4')),
    5: freeRooms.filter(r => r.includes('каб. 5')),
    6: freeRooms.filter(r => r.includes('каб. 6'))
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
