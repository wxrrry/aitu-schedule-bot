// Хранилище и утилиты для системы замен пар (zameny.json)
// Совместимо со структурой замен Telegram-бота AITU

export const getTodayDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getStoredReplacements = () => {
  try {
    const raw = localStorage.getItem('aitu_replacements');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to parse replacements from localStorage', e);
    return {};
  }
};

export const saveCustomReplacement = (dateKey, pairNum, replacement) => {
  const all = getStoredReplacements();
  if (!all[dateKey]) {
    all[dateKey] = {};
  }
  all[dateKey][pairNum] = {
    ...replacement,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem('aitu_replacements', JSON.stringify(all));
  return all;
};

export const removeCustomReplacement = (dateKey, pairNum) => {
  const all = getStoredReplacements();
  if (all[dateKey] && all[dateKey][pairNum]) {
    delete all[dateKey][pairNum];
    if (Object.keys(all[dateKey]).length === 0) {
      delete all[dateKey];
    }
    localStorage.setItem('aitu_replacements', JSON.stringify(all));
  }
  return all;
};

// Получение замен на определенную дату с объединением локальных и серверных
export const getReplacementsForDate = (dateKey) => {
  const local = getStoredReplacements();
  return local[dateKey] || {};
};
