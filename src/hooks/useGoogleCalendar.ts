import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: { email: string }[];
  hangoutLink?: string;
}

interface AvailableSlot {
  start: string;
  end: string;
}

export const useGoogleCalendar = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [calendarEmail, setCalendarEmail] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [connectionMode, setConnectionMode] = useState<'oauth' | 'calendar-id' | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const checkStatus = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'status' },
      });
      if (error) throw error;
      setIsConnected(data.connected);
      if (data.calendarId) setCalendarId(data.calendarId);
      if (data.email) setCalendarEmail(data.email);
      setConnectionMode(data.mode || null);
    } catch (error: any) {
      console.error('Error checking calendar status:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const getOAuthUrl = async (): Promise<string | null> => {
    try {
      const redirectUri = `${window.location.origin}/dashboard?tab=settings&calendar_callback=true`;
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'auth-url', redirectUri },
      });
      if (error) throw error;
      return data.authUrl;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar a URL de autenticação.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleOAuthCallback = async (code: string): Promise<boolean> => {
    try {
      setSaving(true);
      const redirectUri = `${window.location.origin}/dashboard?tab=settings&calendar_callback=true`;
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'callback', code, redirectUri },
      });
      if (error) throw error;
      if (data.success) {
        setIsConnected(true);
        setCalendarEmail(data.email || '');
        setCalendarId(data.calendarId || '');
        setConnectionMode('oauth');
        toast({
          title: 'Google Calendar conectado!',
          description: 'Sua conta Google foi vinculada com sucesso.',
        });
        return true;
      }
      return false;
    } catch (error: any) {
      toast({
        title: 'Erro ao conectar',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveCalendarId = async (email: string, calId: string): Promise<boolean> => {
    try {
      setSaving(true);
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'save-calendar-id', email, calendarId: calId },
      });
      if (error) throw error;
      if (data.success) {
        setIsConnected(true);
        setCalendarEmail(email);
        setCalendarId(calId);
        setConnectionMode('calendar-id');
        toast({
          title: 'Agenda vinculada!',
          description: 'Seu Google Calendar foi vinculado com sucesso.',
        });
        return true;
      }
      return false;
    } catch (error: any) {
      toast({
        title: 'Erro ao vincular',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const listEvents = async (startDate?: string, endDate?: string): Promise<CalendarEvent[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'list-events', startDate, endDate },
      });
      if (error) throw error;
      if (data.error && data.code === 'NOT_CONNECTED') {
        setIsConnected(false);
        return [];
      }
      setEvents(data.events || []);
      return data.events || [];
    } catch (error: any) {
      console.error('Error listing events:', error);
      return [];
    }
  };

  const getAvailableSlots = async (startDate?: string, endDate?: string): Promise<AvailableSlot[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'available-slots', startDate, endDate },
      });
      if (error) throw error;
      if (data.error && data.code === 'NOT_CONNECTED') {
        setIsConnected(false);
        return [];
      }
      setAvailableSlots(data.slots || []);
      return data.slots || [];
    } catch (error: any) {
      console.error('Error getting available slots:', error);
      return [];
    }
  };

  const createEvent = async (event: {
    summary: string;
    description?: string;
    startDateTime: string;
    endDateTime: string;
    attendeeEmail?: string;
  }): Promise<CalendarEvent | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'create-event', event },
      });
      if (error) throw error;
      if (data.error && data.code === 'NOT_CONNECTED') {
        setIsConnected(false);
        toast({
          title: 'Calendário não conectado',
          description: 'Vincule seu Google Calendar nas configurações.',
          variant: 'destructive',
        });
        return null;
      }
      if (data.success) {
        toast({
          title: 'Evento criado!',
          description: `"${event.summary}" foi agendado com sucesso.`,
        });
        return data.event;
      }
      return null;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar evento',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const disconnect = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'disconnect' },
      });
      if (error) throw error;
      setIsConnected(false);
      setEvents([]);
      setAvailableSlots([]);
      setCalendarEmail('');
      setCalendarId('');
      setConnectionMode(null);
      toast({
        title: 'Desvinculado',
        description: 'Google Calendar foi desvinculado.',
      });
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao desvincular',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    isConnected,
    loading,
    saving,
    events,
    availableSlots,
    calendarEmail,
    calendarId,
    connectionMode,
    checkStatus,
    getOAuthUrl,
    handleOAuthCallback,
    saveCalendarId,
    listEvents,
    getAvailableSlots,
    createEvent,
    disconnect,
  };
};
