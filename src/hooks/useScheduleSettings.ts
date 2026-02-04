import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ScheduleSettings {
  id: string;
  user_id: string;
  work_start_hour: number;
  work_end_hour: number;
  lunch_start_hour: number | null;
  lunch_end_hour: number | null;
  appointment_duration_minutes: number;
  work_days: number[];
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<ScheduleSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  work_start_hour: 9,
  work_end_hour: 18,
  lunch_start_hour: null,
  lunch_end_hour: null,
  appointment_duration_minutes: 60,
  work_days: [1, 2, 3, 4, 5], // Monday to Friday
};

export const useScheduleSettings = () => {
  const [settings, setSettings] = useState<ScheduleSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('schedule_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error: any) {
      console.error('Error fetching schedule settings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (newSettings: Partial<Omit<ScheduleSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    if (!user) return false;
    
    setSaving(true);
    try {
      const dataToSave = {
        user_id: user.id,
        work_start_hour: newSettings.work_start_hour ?? DEFAULT_SETTINGS.work_start_hour,
        work_end_hour: newSettings.work_end_hour ?? DEFAULT_SETTINGS.work_end_hour,
        lunch_start_hour: newSettings.lunch_start_hour ?? null,
        lunch_end_hour: newSettings.lunch_end_hour ?? null,
        appointment_duration_minutes: newSettings.appointment_duration_minutes ?? DEFAULT_SETTINGS.appointment_duration_minutes,
        work_days: newSettings.work_days ?? DEFAULT_SETTINGS.work_days,
      };

      const { data, error } = await supabase
        .from('schedule_settings')
        .upsert(dataToSave, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) throw error;
      
      setSettings(data);
      toast({
        title: 'Configurações salvas!',
        description: 'Seu horário comercial foi atualizado.',
      });
      return true;
    } catch (error: any) {
      console.error('Error saving schedule settings:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    return saveSettings(DEFAULT_SETTINGS);
  };

  // Computed values with defaults
  const effectiveSettings = settings || {
    work_start_hour: DEFAULT_SETTINGS.work_start_hour,
    work_end_hour: DEFAULT_SETTINGS.work_end_hour,
    lunch_start_hour: DEFAULT_SETTINGS.lunch_start_hour,
    lunch_end_hour: DEFAULT_SETTINGS.lunch_end_hour,
    appointment_duration_minutes: DEFAULT_SETTINGS.appointment_duration_minutes,
    work_days: DEFAULT_SETTINGS.work_days,
  };

  return {
    settings,
    effectiveSettings,
    loading,
    saving,
    saveSettings,
    resetToDefaults,
    refetch: fetchSettings,
  };
};
