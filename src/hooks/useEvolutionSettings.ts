import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface EvolutionSettings {
  id: string;
  user_id: string;
  api_url: string;
  api_key: string;
  instance_name: string | null;
  webhook_url: string | null;
  integration_type: string;
  qrcode_enabled: boolean;
  reject_call: boolean;
  msg_call: string;
  groups_ignore: boolean;
  always_online: boolean;
  read_messages: boolean;
  read_status: boolean;
  sync_full_history: boolean;
  is_connected: boolean;
  created_at: string;
  updated_at: string;
}

export interface EvolutionSettingsInput {
  api_url: string;
  api_key: string;
  instance_name?: string;
  webhook_url?: string;
  integration_type?: string;
  qrcode_enabled?: boolean;
  reject_call?: boolean;
  msg_call?: string;
  groups_ignore?: boolean;
  always_online?: boolean;
  read_messages?: boolean;
  read_status?: boolean;
  sync_full_history?: boolean;
  is_connected?: boolean;
}

export const useEvolutionSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<EvolutionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('evolution_api_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setSettings(data as EvolutionSettings | null);
    } catch (err) {
      console.error('Error fetching evolution settings:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save settings (create or update)
  const saveSettings = useCallback(async (input: EvolutionSettingsInput) => {
    if (!user) return null;
    
    setSaving(true);
    try {
      if (settings) {
        // Update existing
        const { data, error } = await supabase
          .from('evolution_api_settings')
          .update({
            ...input,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        setSettings(data as EvolutionSettings);
        
        toast({
          title: 'Configurações salvas',
          description: 'Suas configurações da Evolution API foram atualizadas'
        });
        
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('evolution_api_settings')
          .insert({
            user_id: user.id,
            ...input
          })
          .select()
          .single();

        if (error) throw error;
        setSettings(data as EvolutionSettings);
        
        toast({
          title: 'Configurações salvas',
          description: 'Suas configurações da Evolution API foram criadas'
        });
        
        return data;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar configurações';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setSaving(false);
    }
  }, [user, settings, toast]);

  // Update connection status
  const updateConnectionStatus = useCallback(async (isConnected: boolean) => {
    if (!user || !settings) return;
    
    try {
      const { error } = await supabase
        .from('evolution_api_settings')
        .update({ is_connected: isConnected })
        .eq('user_id', user.id);

      if (error) throw error;
      setSettings(prev => prev ? { ...prev, is_connected: isConnected } : null);
    } catch (err) {
      console.error('Error updating connection status:', err);
    }
  }, [user, settings]);

  // Delete settings
  const deleteSettings = useCallback(async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('evolution_api_settings')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setSettings(null);
      
      toast({
        title: 'Configurações removidas',
        description: 'Suas configurações da Evolution API foram removidas'
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover configurações';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, [user, toast]);

  return {
    settings,
    loading,
    saving,
    saveSettings,
    updateConnectionStatus,
    deleteSettings,
    refetch: fetchSettings
  };
};
