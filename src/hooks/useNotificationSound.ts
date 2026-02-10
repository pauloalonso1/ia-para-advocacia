import { useCallback, useRef, useEffect } from 'react';

const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

interface SoundNotificationOptions {
  enabled?: boolean;
  soundEnabled?: boolean;
  pushEnabled?: boolean;
}

export const useNotificationSound = (options: SoundNotificationOptions = {}) => {
  const { enabled = true, soundEnabled = true, pushEnabled = true } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const permissionRef = useRef<NotificationPermission>('default');

  // Pre-load audio
  useEffect(() => {
    if (soundEnabled) {
      const audio = new Audio(NOTIFICATION_SOUND_URL);
      audio.volume = 0.5;
      audio.preload = 'auto';
      audioRef.current = audio;
    }
    return () => {
      audioRef.current = null;
    };
  }, [soundEnabled]);

  // Request notification permission
  useEffect(() => {
    if (pushEnabled && 'Notification' in window) {
      permissionRef.current = Notification.permission;
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(perm => {
          permissionRef.current = perm;
        });
      }
    }
  }, [pushEnabled]);

  const playSound = useCallback(() => {
    if (!enabled || !soundEnabled || !audioRef.current) return;
    
    const audio = audioRef.current;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Browser may block autoplay - ignore silently
    });
  }, [enabled, soundEnabled]);

  const showPushNotification = useCallback((title: string, body: string, icon?: string) => {
    if (!enabled || !pushEnabled) return;
    if (!('Notification' in window)) return;
    if (permissionRef.current !== 'granted') return;

    // Don't show if page is focused
    if (document.hasFocus()) {
      // Still play sound even when focused
      playSound();
      return;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        tag: 'lexia-message',
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch {
      // Fallback - just play sound
    }

    playSound();
  }, [enabled, pushEnabled, playSound]);

  const notifyNewMessage = useCallback((clientName: string | null, message: string) => {
    const title = clientName || 'Nova mensagem';
    const body = message.length > 100 ? message.slice(0, 100) + '...' : message;
    showPushNotification(title, body);
  }, [showPushNotification]);

  const notifyNewLead = useCallback((clientName: string | null, phone: string) => {
    const title = '🟢 Novo lead';
    const body = clientName ? `${clientName} (${phone})` : phone;
    showPushNotification(title, body);
  }, [showPushNotification]);

  return {
    playSound,
    showPushNotification,
    notifyNewMessage,
    notifyNewLead,
  };
};
