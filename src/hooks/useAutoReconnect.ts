import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEvolutionSettings } from '@/hooks/useEvolutionSettings';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'checking' | 'idle';

const CHECK_INTERVAL_MS = 60_000; // Check every 60s
const RECONNECT_COOLDOWN_MS = 120_000; // Wait 2min between reconnect attempts
const MAX_CONSECUTIVE_FAILURES = 3;

export const useAutoReconnect = () => {
  const { user } = useAuth();
  const { settings, updateConnectionStatus } = useEvolutionSettings();
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const lastReconnectAttempt = useRef<number>(0);
  const consecutiveFailures = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const instanceName = settings?.instance_name;
  const isConfigured = !!settings?.api_url && !!settings?.api_key && !!instanceName;

  const checkStatus = useCallback(async (): Promise<'connected' | 'disconnected' | 'connecting'> => {
    if (!user || !isConfigured) return 'disconnected';

    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'status', instanceName }
      });

      if (error) return 'disconnected';
      if (data?.code === 'INSTANCE_NOT_FOUND') return 'disconnected';

      const state = data?.state || data?.instance?.state;
      if (state === 'open' || state === 'connected') return 'connected';
      if (state === 'connecting' || state === 'qrcode') return 'connecting';
      return 'disconnected';
    } catch {
      return 'disconnected';
    }
  }, [user, isConfigured, instanceName]);

  const attemptReconnect = useCallback(async (): Promise<boolean> => {
    if (!user || !isConfigured) return false;

    const now = Date.now();
    if (now - lastReconnectAttempt.current < RECONNECT_COOLDOWN_MS) return false;
    if (consecutiveFailures.current >= MAX_CONSECUTIVE_FAILURES) return false;

    lastReconnectAttempt.current = now;
    setStatus('reconnecting');

    try {
      console.log('[AutoReconnect] Attempting restart for instance:', instanceName);
      
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'restart', instanceName }
      });

      if (error) {
        consecutiveFailures.current++;
        console.error('[AutoReconnect] Restart failed:', error);
        return false;
      }

      // Wait and check if it reconnected
      await new Promise(resolve => setTimeout(resolve, 5000));
      const newStatus = await checkStatus();

      if (newStatus === 'connected') {
        consecutiveFailures.current = 0;
        setReconnectCount(prev => prev + 1);
        await updateConnectionStatus(true);
        console.log('[AutoReconnect] Successfully reconnected!');
        return true;
      }

      consecutiveFailures.current++;
      return false;
    } catch {
      consecutiveFailures.current++;
      return false;
    }
  }, [user, isConfigured, instanceName, checkStatus, updateConnectionStatus]);

  const runCheck = useCallback(async () => {
    if (!isConfigured || !settings?.is_connected) {
      setStatus('idle');
      return;
    }

    setStatus('checking');
    const currentStatus = await checkStatus();
    setLastChecked(new Date());

    if (currentStatus === 'connected') {
      setStatus('connected');
      consecutiveFailures.current = 0;
      // Sync DB if needed
      if (!settings.is_connected) {
        await updateConnectionStatus(true);
      }
    } else if (currentStatus === 'disconnected') {
      console.log('[AutoReconnect] Detected disconnection, attempting reconnect...');
      const success = await attemptReconnect();
      setStatus(success ? 'connected' : 'disconnected');
      if (!success && settings.is_connected) {
        await updateConnectionStatus(false);
      }
    } else {
      setStatus('checking');
    }
  }, [isConfigured, settings?.is_connected, checkStatus, attemptReconnect, updateConnectionStatus]);

  // Start periodic checks
  useEffect(() => {
    if (!user || !isConfigured) {
      setStatus('idle');
      return;
    }

    // Initial check after 5s
    const initialTimeout = setTimeout(() => {
      runCheck();
    }, 5000);

    // Periodic checks
    intervalRef.current = setInterval(runCheck, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, isConfigured, runCheck]);

  // Reset failures when settings change
  useEffect(() => {
    consecutiveFailures.current = 0;
  }, [settings?.instance_name]);

  return {
    status,
    lastChecked,
    reconnectCount,
    isConfigured,
    forceCheck: runCheck,
  };
};
