// AITU Mini App Centralized Authenticated API Client
import { tg } from './telegram';

export function getTelegramInitData() {
  if (typeof window === 'undefined') return '';
  if (tg?.initData && typeof tg.initData === 'string' && tg.initData.trim().length > 0) {
    return tg.initData;
  }
  try {
    const hash = window.location.hash || '';
    if (hash.includes('tgWebAppData=')) {
      const params = new URLSearchParams(hash.substring(1));
      const val = params.get('tgWebAppData');
      if (val) return val;
    }
  } catch (e) {}
  return '';
}

export async function apiFetch(url, options = {}) {
  const initData = getTelegramInitData();
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };
  
  if (initData && !headers['Authorization']) {
    headers['Authorization'] = `tma ${initData}`;
  }

  return fetch(url, {
    ...options,
    headers
  });
}
