import { TelegramUser } from '../types';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe?: {
          user?: TelegramUser;
          query_id?: string;
          auth_date?: string;
          hash?: string;
        };
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        expand: () => void;
        close: () => void;
        ready: () => void;
        sendData: (data: string) => void;
        openTelegramLink: (url: string) => void;
        openLink: (url: string) => void;
        showPopup: (
          params: { title?: string; message: string; buttons?: Array<{ id?: string; type?: string; text?: string }> },
          callback?: (buttonId: string) => void
        ) => void;
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (fn: () => void) => void;
          offClick: (fn: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
        };
      };
    };
  }
}

export const getTelegramWebApp = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
};

export const initTelegramApp = () => {
  const tg = getTelegramWebApp();
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      if (tg.backgroundColor) {
        tg.backgroundColor = '#0a0a0f';
      }
      if (tg.headerColor) {
        tg.headerColor = '#0a0a0f';
      }
    } catch (e) {
      console.warn('Telegram WebApp init warning:', e);
    }
  }
};

export const hapticImpact = (style: 'light' | 'medium' | 'heavy' | 'soft' = 'light') => {
  const tg = getTelegramWebApp();
  try {
    tg?.HapticFeedback?.impactOccurred(style);
  } catch (e) {
    // Ignore if not supported
  }
};

export const hapticNotification = (type: 'success' | 'warning' | 'error' = 'success') => {
  const tg = getTelegramWebApp();
  try {
    tg?.HapticFeedback?.notificationOccurred(type);
  } catch (e) {
    // Ignore
  }
};

export const hapticSelection = () => {
  const tg = getTelegramWebApp();
  try {
    tg?.HapticFeedback?.selectionChanged();
  } catch (e) {
    // Ignore
  }
};

export const showTelegramAlert = (message: string, title?: string) => {
  const tg = getTelegramWebApp();
  if (tg && tg.showPopup) {
    tg.showPopup({ title: title || 'Puff Paradise', message, buttons: [{ type: 'ok', text: 'OK' }] });
  } else {
    alert(`${title ? title + '\n\n' : ''}${message}`);
  }
};

export const openTelegramOrWeb = (url: string) => {
  const tg = getTelegramWebApp();
  if (url.startsWith('https://t.me/') && tg?.openTelegramLink) {
    tg.openTelegramLink(url);
  } else if (tg?.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, '_blank');
  }
};
