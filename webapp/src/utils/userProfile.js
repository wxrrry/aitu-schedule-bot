// Модуль управления профилем, авторизацией и привязкой к группе студента
import { DEFAULT_GROUP, getCourseFromGroupName } from '../data/scheduleData';
import { tg, sendDataToBot, cloudStorage } from './telegram';

const PROFILE_KEY = 'aitu_student_profile';

// Извлечение группы из стартовых параметров Telegram (например t.me/bot?start=grp_9po43k или URL ?group=9ПО-43к)
export function getStartParamGroup() {
  if (typeof window === 'undefined') return null;
  // 1. Telegram start_param
  const startParam = tg?.initDataUnsafe?.start_param;
  if (startParam) {
    if (startParam.startsWith('grp_')) {
      return decodeURIComponent(startParam.replace('grp_', ''));
    }
    return decodeURIComponent(startParam);
  }

  // 2. Query parameters (e.g. ?group=9ПО-43к or ?startapp=grp_9ПО-43к)
  try {
    const params = new URLSearchParams(window.location.search);
    const grp = params.get('group') || params.get('grp');
    if (grp) return decodeURIComponent(grp);
    
    const startApp = params.get('startapp') || params.get('tgWebAppStartParam');
    if (startApp) {
      if (startApp.startsWith('grp_')) {
        return decodeURIComponent(startApp.replace('grp_', ''));
      }
      return decodeURIComponent(startApp);
    }
  } catch (e) {
    // Ignore query parsing errors
  }

  return null;
}

// Список ID супер-администраторов (может передаваться через VITE_SUPERADMIN_IDS в .env)
const rawEnvAdmins = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPERADMIN_IDS) || '';
export const SUPERADMIN_IDS = rawEnvAdmins
  ? rawEnvAdmins.split(',').map(s => Number(s.trim())).filter(Boolean)
  : [];
export const KNOWN_ADMIN_IDS = SUPERADMIN_IDS;

export function isSuperAdmin(userId, role) {
  if (role === 'superadmin') return true;
  if (!userId || SUPERADMIN_IDS.length === 0) return false;
  return SUPERADMIN_IDS.includes(Number(userId));
}

// Роли студентов и старост валидируются исключительно сервером по Telegram initData
export function getVerifiedRoleFromParams(userId) {
  if (isSuperAdmin(userId)) {
    return 'superadmin';
  }
  return null;
}

export function isOrganizer(userId, role) {
  if (role === 'organizer' || role === 'admin' || role === 'superadmin') return true;
  if (isSuperAdmin(userId, role)) return true;
  return false;
}

export function setOrganizerMode(enabled) {
  try {
    if (enabled) {
      localStorage.setItem('aitu_organizer_mode', 'true');
    } else {
      localStorage.removeItem('aitu_organizer_mode');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aitu_role_changed'));
    }
  } catch (e) {}
}

export function getRoleDisplay(role = 'student') {
  switch (role) {
    case 'superadmin':
      return { 
        title: 'Главный администратор', 
        badge: '👑 SUPERADMIN', 
        icon: '👑', 
        color: 'text-amber-400',
        bgColor: 'bg-amber-950/40 border-amber-500/30'
      };
    case 'admin':
      return { 
        title: 'Администратор бота', 
        badge: '🛡 АДМИНИСТРАТОР', 
        icon: '🛡', 
        color: 'text-amber-400',
        bgColor: 'bg-amber-950/40 border-amber-500/30'
      };
    case 'organizer':
      return { 
        title: 'Организатор турниров', 
        badge: '🏆 ОРГАНИЗАТОР', 
        icon: '🏆', 
        color: 'text-amber-400',
        bgColor: 'bg-amber-950/40 border-amber-500/30'
      };
    case 'starosta':
      return { 
        title: 'Староста группы', 
        badge: '🎖 СТАРОСТА', 
        icon: '🎖', 
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-950/40 border-emerald-500/30'
      };
    case 'zam_starosty':
      return { 
        title: 'Зам. старосты группы', 
        badge: '🎗 ЗАМ. СТАРОСТЫ', 
        icon: '🎗', 
        color: 'text-blue-400',
        bgColor: 'bg-blue-950/40 border-blue-500/30'
      };
    case 'student':
    default:
      return { 
        title: 'Студент', 
        badge: '👨‍🎓 СТУДЕНТ', 
        icon: '👨‍🎓', 
        color: 'text-zinc-300',
        bgColor: 'bg-zinc-800/40 border-white/10'
      };
  }
}

export function getInitialUserProfile() {
  const tgUser = tg?.initDataUnsafe?.user;
  const startGrp = getStartParamGroup();
  const savedGroup = localStorage.getItem('aitu_selected_group');

  // Читаем сохраненный профиль
  let savedProfile = {};
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) savedProfile = JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse saved user profile', e);
  }

  const effectiveUserId = tgUser?.id || savedProfile.id || 849201948;
  const paramRole = getVerifiedRoleFromParams(effectiveUserId);
  const effectiveRole = paramRole || savedProfile.role || 'student';

  const effectiveGroup = startGrp || savedProfile.group || savedGroup || DEFAULT_GROUP;
  const effectiveCourse = getCourseFromGroupName(effectiveGroup);

  return {
    id: effectiveUserId,
    username: tgUser?.username || savedProfile.username || 'student_aitu',
    firstName: tgUser?.first_name || savedProfile.firstName || 'Студент',
    lastName: tgUser?.last_name || savedProfile.lastName || 'AITU',
    fullName: tgUser 
      ? `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() 
      : (savedProfile.fullName || 'Студент AITU'),
    photoUrl: tgUser?.photo_url || savedProfile.photoUrl || null,
    isPremium: tgUser?.is_premium || savedProfile.isPremium || false,
    languageCode: tgUser?.language_code || 'ru',
    isTelegramAuth: Boolean(tgUser),
    group: effectiveGroup,
    course: effectiveCourse,
    role: effectiveRole, // Роль привязывается к боту и назначается администраторами
    specialty: getSpecialtyByGroup(effectiveGroup),
    department: getDepartmentByCourse(effectiveCourse),
    remind10min: savedProfile.remind10min !== undefined ? savedProfile.remind10min : true,
    morningAlert: savedProfile.morningAlert !== undefined ? savedProfile.morningAlert : false,
    fiveMinBreaks: savedProfile.fiveMinBreaks !== undefined ? savedProfile.fiveMinBreaks : false,
    haptics: savedProfile.haptics !== undefined ? savedProfile.haptics : true
  };
}

export const getUserProfile = getInitialUserProfile;

export function saveUserProfile(profile) {
  try {
    const raw = JSON.stringify(profile);
    localStorage.setItem(PROFILE_KEY, raw);
    localStorage.setItem('aitu_selected_group', profile.group);

    // Асинхронная репликация в Telegram CloudStorage для кросс-девайсной синхронизации
    if (cloudStorage.isAvailable()) {
      cloudStorage.setItem(PROFILE_KEY, raw);
      cloudStorage.setItem('aitu_selected_group', profile.group);
    }
  } catch (e) {
    console.error('Failed to save user profile', e);
  }
}

// Загрузка сохраненного профиля из облака Telegram (при смене устройства или первом открытии)
export async function syncProfileFromCloud(onSynced) {
  if (!cloudStorage.isAvailable()) return;
  try {
    const cloudRaw = await cloudStorage.getItem(PROFILE_KEY);
    if (cloudRaw) {
      const parsed = JSON.parse(cloudRaw);
      if (parsed && (parsed.group || parsed.id)) {
        if (onSynced) onSynced(parsed);
      }
    }
  } catch (e) {
    console.warn('syncProfileFromCloud error', e);
  }
}

export function getSpecialtyByGroup(groupName) {
  if (!groupName) return '09.02.07 Информационные системы и программирование';
  const upper = groupName.toUpperCase();
  if (upper.includes('ПО')) return '09.02.07 Программирование в компьютерных системах';
  if (upper.includes('ИС')) return '09.02.07 Информационные системы и программирование';
  if (upper.includes('ВТ')) return '09.02.01 Компьютерные системы и комплексы';
  if (upper.includes('СА')) return '09.02.06 Сетевое и системное администрирование';
  return '09.02.07 Информационные системы и программирование';
}

export function getDepartmentByCourse(course) {
  return `Отделение информационных технологий (${course} курс)`;
}

export function syncProfileToBot(profile) {
  const payload = {
    action: 'sync_profile',
    user_id: profile.id,
    group: profile.group,
    course: profile.course,
    role: profile.role,
    settings: {
      remind10min: profile.remind10min,
      morningAlert: profile.morningAlert,
      fiveMinBreaks: profile.fiveMinBreaks
    },
    timestamp: Date.now()
  };

  sendDataToBot(payload);
}
