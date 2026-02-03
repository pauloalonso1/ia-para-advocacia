import { useState, useEffect, useCallback } from 'react';
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
}

interface AvailableSlot {
  start: string;
  end: string;
}

export const useGoogleCalendar = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Check connection status
  const checkStatus = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'status' },
      });

      if (error) throw error;
      setIsConnected(data.connected);
    } catch (error: any) {
      console.error('Error checking calendar status:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Get OAuth URL to start authorization
  const getAuthUrl = async (): Promise<string | null> => {
    try {
      setConnecting(true);
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'auth-url' },
      });

      if (error) throw error;
      return data.authUrl;
    } catch (error: any) {
      toast({
        title: 'Erro ao iniciar conexão',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setConnecting(false);
    }
  };

  // Exchange authorization code for tokens
  const handleCallback = async (code: string): Promise<boolean> => {
    try {
      setConnecting(true);
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'callback', code },
      });

      if (error) throw error;
      
      if (data.success) {
        setIsConnected(true);
        toast({
          title: 'Conectado!',
          description: 'Google Calendar conectado com sucesso.',
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
      setConnecting(false);
    }
  };

  // List calendar events
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

  // Get available slots
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

  // Create a calendar event
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
          description: 'Conecte seu Google Calendar nas configurações.',
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

  // Disconnect calendar
  const disconnect = async (): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;
      
      setIsConnected(false);
      setEvents([]);
      setAvailableSlots([]);
      
      toast({
        title: 'Desconectado',
        description: 'Google Calendar foi desconectado.',
      });
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao desconectar',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    isConnected,
    loading,
    connecting,
    events,
    availableSlots,
    checkStatus,
    getAuthUrl,
    handleCallback,
    listEvents,
    getAvailableSlots,
    createEvent,
    disconnect,
  };
};
