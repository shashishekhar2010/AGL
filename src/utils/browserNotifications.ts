import { COMPANY_LOGO_URL } from '../data/alorixContent';

export type BrowserNotifPermission =
  | 'granted'
  | 'denied'
  | 'default'
  | 'unsupported';

export function getBrowserNotificationPermission(): BrowserNotifPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotifPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (window.Notification.permission === 'granted') {
    return 'granted';
  }
  if (window.Notification.permission === 'denied') {
    return 'denied';
  }
  try {
    const result = await window.Notification.requestPermission();
    return result;
  } catch {
    return window.Notification.permission;
  }
}

export function playNotificationChime(urgent = false): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes = urgent ? [880, 1174.66, 880] : [659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      gain.gain.setValueAtTime(0.001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.09, now + idx * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.14);
    });
    window.setTimeout(() => {
      void ctx.close().catch(() => undefined);
    }, 800);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

export function showBrowserNotification(options: {
  title: string;
  body: string;
  tag?: string;
  urgent?: boolean;
  onClick?: () => void;
}): void {
  playNotificationChime(Boolean(options.urgent));

  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    window.Notification.permission !== 'granted'
  ) {
    return;
  }

  try {
    const notif = new window.Notification(options.title, {
      body: options.body,
      icon: COMPANY_LOGO_URL,
      badge: COMPANY_LOGO_URL,
      tag: options.tag,
      requireInteraction: Boolean(options.urgent),
    });
    notif.onclick = () => {
      try {
        window.focus();
      } catch {
        // ignore
      }
      if (options.onClick) {
        options.onClick();
      }
      notif.close();
    };
  } catch {
    // Ignore notification display errors inside restricted contexts
  }
}
