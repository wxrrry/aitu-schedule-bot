import { useEffect } from 'react';

export const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;

// Хук для привязки нативной кнопки Telegram "Назад" к закрытию модалок
export function useTelegramBackButton(isOpen, onClose) {
  useEffect(() => {
    if (!tg?.BackButton) return;

    if (isOpen) {
      tg.BackButton.show();
      const handleClick = () => {
        if (onClose) onClose();
      };
      tg.BackButton.onClick(handleClick);

      return () => {
        tg.BackButton.offClick(handleClick);
        tg.BackButton.hide();
      };
    } else {
      tg.BackButton.hide();
    }
  }, [isOpen, onClose]);
}

// Безопасный вызов тактильного отклика
export function triggerHaptic(type = 'light') {
  if (!tg?.HapticFeedback) return;
  try {
    if (type === 'selection') {
      tg.HapticFeedback.selectionChanged();
    } else if (type === 'success' || type === 'error' || type === 'warning') {
      tg.HapticFeedback.notificationOccurred(type);
    } else {
      tg.HapticFeedback.impactOccurred(type); // 'light', 'medium', 'heavy', 'rigid', 'soft'
    }
  } catch (e) {
    // игнорируем ошибку на десктопе или старых версиях TG
  }
}

// Открытие чата бота с командой
export function openBotCommand(command) {
  const cleanCmd = command.startsWith('/') ? command.substring(1) : command;
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(`https://t.me/aituraspisaniebot?start=${cleanCmd}`);
  } else {
    window.open(`https://t.me/aituraspisaniebot?start=${cleanCmd}`, '_blank');
  }
}

// Отправка данных боту через WebApp.sendData
export function sendDataToBot(data) {
  if (tg?.sendData) {
    try {
      tg.sendData(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('sendData error', e);
    }
  }
  return false;
}

// Telegram CloudStorage API обертка с кэшированием в localStorage
export const cloudStorage = {
  isAvailable: () => Boolean(tg?.CloudStorage),

  setItem: (key, value) => {
    return new Promise((resolve) => {
      const strVal = typeof value === 'string' ? value : JSON.stringify(value);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, strVal);
        }
      } catch (e) {
        console.warn('localStorage setItem failed', e);
      }

      if (tg?.CloudStorage) {
        try {
          tg.CloudStorage.setItem(key, strVal, (err, success) => {
            if (err) {
              console.warn('Telegram CloudStorage setItem error', err);
              resolve(false);
            } else {
              resolve(Boolean(success));
            }
          });
        } catch (e) {
          resolve(false);
        }
      } else {
        resolve(true);
      }
    });
  },

  getItem: (key) => {
    return new Promise((resolve) => {
      const localVal = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (tg?.CloudStorage) {
        try {
          tg.CloudStorage.getItem(key, (err, val) => {
            if (!err && val !== undefined && val !== null && val !== '') {
              try {
                localStorage.setItem(key, val);
              } catch (e) {}
              resolve(val);
            } else {
              resolve(localVal);
            }
          });
        } catch (e) {
          resolve(localVal);
        }
      } else {
        resolve(localVal);
      }
    });
  },

  removeItem: (key) => {
    return new Promise((resolve) => {
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch (e) {}

      if (tg?.CloudStorage) {
        try {
          tg.CloudStorage.removeItem(key, (err, success) => {
            resolve(!err && Boolean(success));
          });
        } catch (e) {
          resolve(false);
        }
      } else {
        resolve(true);
      }
    });
  }
};


// Проверка, запущено ли приложение внутри Telegram Mini App
export function isInsideTelegram() {
  if (typeof window === 'undefined') return true;

  // 1. Проверяем URL параметры (query и hash), которые Telegram всегда добавляет
  try {
    const searchParams = new URLSearchParams(window.location.search);
    // Возможность предпросмотра для администратора/разработчика через ?preview=1 или ?dev=1
    if (searchParams.get('preview') === '1' || searchParams.get('dev') === '1') {
      return true;
    }
    if (
      searchParams.has('tgWebAppPlatform') ||
      searchParams.has('tgWebAppData') ||
      searchParams.has('tgWebAppVersion') ||
      searchParams.has('tgWebAppThemeParams')
    ) {
      return true;
    }

    if (
      window.location.hash.includes('tgWebAppData=') ||
      window.location.hash.includes('tgWebAppPlatform=') ||
      window.location.hash.includes('tgWebAppThemeParams=')
    ) {
      return true;
    }
  } catch (e) {
    // ignore
  }

  // 2. Telegram WebApp SDK объект
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return false;

  // В реальном клиенте Telegram передается непустая строка initData
  if (typeof webApp.initData === 'string' && webApp.initData.trim().length > 0) {
    return true;
  }

  // initDataUnsafe содержит данные пользователя, чата или запроса
  if (
    webApp.initDataUnsafe &&
    (webApp.initDataUnsafe.user || webApp.initDataUnsafe.query_id || webApp.initDataUnsafe.start_param)
  ) {
    return true;
  }

  // Платформа Telegram (ios, android, tdesktop, macos, web, weba) не равна 'unknown'
  if (webApp.platform && webApp.platform !== 'unknown') {
    return true;
  }

  return false;
}

