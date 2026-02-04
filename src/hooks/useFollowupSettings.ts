import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FollowupSettings {
  id: string;
  user_id: string;
  is_enabled: boolean;
  inactivity_hours: number;
  max_followups: number;
  followup_message_1: string;
  followup_message_2: string;
  followup_message_3: string;
  respect_business_hours: boolean;
  created_at: string;
  updated_at: string;
}

export interface FollowupSettingsInput {
  is_enabled?: boolean;
  inactivity_hours?: number;
  max_followups?: number;
  followup_message_1?: string;
  followup_message_2?: string;
  followup_message_3?: string;
  respect_business_hours?: boolean;
}

export function useFollowupSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<FollowupSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('followup_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error: any) {
      console.error('Error fetching followup settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (input: FollowupSettingsInput) => {
    if (!user) return false;

    try {
      setSaving(true);

      if (settings) {
        // Update existing settings
        const { data, error } = await supabase
          .from('followup_settings')
          .update({
            ...input,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        setSettings(data);
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('followup_settings')
          .insert({
            user_id: user.id,
            ...input
          })
          .select()
          .single();

        if (error) throw error;
        setSettings(data);
      }

      toast({
        title: 'Sucesso!',
        description: 'Configurações de follow-up salvas com sucesso'
      });

      return true;
    } catch (error: any) {
      console.error('Error saving followup settings:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações de follow-up',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteSettings = async () => {
    if (!user || !settings) return false;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('followup_settings')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setSettings(null);

      toast({
        title: 'Sucesso!',
        description: 'Configurações de follow-up removidas'
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting followup settings:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover configurações',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    saveSettings,
    deleteSettings,
    refetch: fetchSettings
  };
}
