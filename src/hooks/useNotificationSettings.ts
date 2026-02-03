import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface NotificationSettings {
  id: string;
  user_id: string;
  notification_phone: string;
  is_enabled: boolean;
  notify_new_lead: boolean;
  notify_qualified_lead: boolean;
  notify_meeting_scheduled: boolean;
  notify_contract_sent: boolean;
  notify_contract_signed: boolean;
  created_at: string;
  updated_at: string;
}

export const useNotificationSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching notification settings:', error);
    }
    
    setSettings(data);
    setLoading(false);
  }, [user]);

  const saveSettings = async (newSettings: Partial<NotificationSettings> & { notification_phone: string }) => {
    if (!user) return false;
    
    setSaving(true);
    
    try {
      if (settings) {
        // Update existing settings
        const { error } = await supabase
          .from('notification_settings')
          .update({
            notification_phone: newSettings.notification_phone,
            is_enabled: newSettings.is_enabled ?? true,
            notify_new_lead: newSettings.notify_new_lead ?? true,
            notify_qualified_lead: newSettings.notify_qualified_lead ?? true,
            notify_meeting_scheduled: newSettings.notify_meeting_scheduled ?? true,
            notify_contract_sent: newSettings.notify_contract_sent ?? true,
            notify_contract_signed: newSettings.notify_contract_signed ?? true,
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Insert new settings
        const { error } = await supabase
          .from('notification_settings')
          .insert({
            user_id: user.id,
            notification_phone: newSettings.notification_phone,
            is_enabled: newSettings.is_enabled ?? true,
            notify_new_lead: newSettings.notify_new_lead ?? true,
            notify_qualified_lead: newSettings.notify_qualified_lead ?? true,
            notify_meeting_scheduled: newSettings.notify_meeting_scheduled ?? true,
            notify_contract_sent: newSettings.notify_contract_sent ?? true,
            notify_contract_signed: newSettings.notify_contract_signed ?? true,
          });

        if (error) throw error;
      }

      await fetchSettings();
      toast({
        title: 'Configurações salvas',
        description: 'Suas configurações de notificação foram atualizadas.'
      });
      return true;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteSettings = async () => {
    if (!user || !settings) return false;
    
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('notification_settings')
        .delete()
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(null);
      toast({
        title: 'Notificações desativadas',
        description: 'Você não receberá mais notificações automáticas.'
      });
      return true;
    } catch (error) {
      console.error('Error deleting notification settings:', error);
      toast({
        title: 'Erro ao desativar',
        description: 'Não foi possível desativar as notificações.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    saving,
    saveSettings,
    deleteSettings,
    fetchSettings
  };
};
