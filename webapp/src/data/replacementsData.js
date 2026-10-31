import { apiFetch } from "../utils/api";
// Хранилище и утилиты для системы замен пар
// Совместимо со структурой замен Telegram-бота AITU и REST API /api/replacements

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

/**
 * Загружает активные замены из REST API PostgreSQL для выбранной группы
 * и объединяет с локальными кэшированными данными.
 */
export const fetchReplacementsFromApi = async (groupName = '') => {
  try {
    const url = `/api/replacements?group=${encodeURIComponent(groupName || '')}`;
    const res = await apiFetch(url);
    if (!res.ok) {
      return getStoredReplacements();
    }
    const data = await res.json();
    const serverReps = data.replacements || [];
    
    // Получаем текущие данные из localStorage
    const local = getStoredReplacements();
    const merged = { ...local };

    for (const rep of serverReps) {
      const dKey = rep.date;
      const pNum = rep.pair_num;
      if (!merged[dKey]) {
        merged[dKey] = {};
      }
      merged[dKey][pNum] = {
        id: rep.id,
        type: rep.action_type || 'replace',
        text: rep.raw_text || rep.subject || '',
        subject: rep.subject || '',
        room: rep.room || '—',
        teacher: rep.teacher || '—',
        group: rep.group,
        author: rep.created_by ? 'Администрация / Бот' : 'Староста',
        serverSynced: true,
        updatedAt: new Date().toISOString()
      };
    }

    localStorage.setItem('aitu_replacements', JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn('Could not fetch replacements from API, falling back to local storage', err);
    return getStoredReplacements();
  }
};

/**
 * Сохраняет замену локально и асинхронно отправляет в PostgreSQL через API.
 * Поддерживает как объектный вызов saveCustomReplacement(date, pair, {type, text, ...}),
 * так и позиционный saveCustomReplacement(date, pair, type, text).
 */
export const saveCustomReplacement = (dateKey, pairNum, replacementOrType, maybeText = '') => {
  const all = getStoredReplacements();
  if (!all[dateKey]) {
    all[dateKey] = {};
  }

  let repObj = {};
  if (typeof replacementOrType === 'object' && replacementOrType !== null) {
    repObj = { ...replacementOrType };
  } else {
    repObj = {
      type: replacementOrType || 'replace',
      text: maybeText || (replacementOrType === 'cancel' ? 'Пара отменена' : 'Замена пары'),
      author: 'Староста'
    };
  }

  all[dateKey][pairNum] = {
    ...repObj,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem('aitu_replacements', JSON.stringify(all));

  // Синхронизация с сервером
  const currentGroup = repObj.group || localStorage.getItem('aitu_selected_group') || '';
  apiFetch('/api/replacements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: dateKey,
      pair_num: Number(pairNum),
      action_type: repObj.type || 'replace',
      subject: repObj.subject || repObj.text || '',
      room: repObj.room || '—',
      teacher: repObj.teacher || '—',
      raw_text: repObj.text || '',
      group: currentGroup
    })
  }).then(async (res) => {
    if (res.ok) {
      const data = await res.json();
      if (data?.replacement?.id) {
        const fresh = getStoredReplacements();
        if (fresh[dateKey]?.[pairNum]) {
          fresh[dateKey][pairNum].id = data.replacement.id;
          fresh[dateKey][pairNum].serverSynced = true;
          localStorage.setItem('aitu_replacements', JSON.stringify(fresh));
        }
      }
    }
  }).catch((err) => {
    console.warn('Failed to sync replacement to server (offline mode)', err);
  });

  return all;
};

/**
 * Удаляет замену локально и из базы данных PostgreSQL.
 */
export const removeCustomReplacement = (dateKey, pairNum, replacementId = null) => {
  const all = getStoredReplacements();
  const target = all[dateKey]?.[pairNum];
  const repId = replacementId || target?.id;

  if (all[dateKey] && all[dateKey][pairNum]) {
    delete all[dateKey][pairNum];
    if (Object.keys(all[dateKey]).length === 0) {
      delete all[dateKey];
    }
    localStorage.setItem('aitu_replacements', JSON.stringify(all));
  }

  if (repId) {
    apiFetch(`/api/replacements/${repId}`, {
      method: 'DELETE'
    }).catch((err) => {
      console.warn('Failed to delete replacement on server', err);
    });
  }

  return all;
};

// Получение замен на определенную дату
export const getReplacementsForDate = (dateKey) => {
  const local = getStoredReplacements();
  return local[dateKey] || {};
};
