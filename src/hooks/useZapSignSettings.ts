import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ZapSignSettings {
  id: string;
  api_token: string;
  sandbox_mode: boolean;
  is_enabled: boolean;
}

export const useZapSignSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<ZapSignSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('zapsign_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (err) {
      console.error('Error fetching ZapSign settings:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (data: { api_token: string; sandbox_mode: boolean; is_enabled: boolean }) => {
    if (!user) return;
    setSaving(true);
    try {
      if (settings) {
        const { error } = await supabase
          .from('zapsign_settings')
          .update({ ...data })
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('zapsign_settings')
          .insert({ ...data, user_id: user.id });
        if (error) throw error;
      }
      await fetchSettings();
      toast({ title: 'Salvo!', description: 'Configurações da ZapSign salvas com sucesso.' });
    } catch (err) {
      console.error('Error saving ZapSign settings:', err);
      toast({ title: 'Erro', description: 'Erro ao salvar configurações.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('zapsign_settings')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
      setSettings(null);
      toast({ title: 'Removido!', description: 'Integração ZapSign removida.' });
    } catch (err) {
      console.error('Error deleting ZapSign settings:', err);
      toast({ title: 'Erro', description: 'Erro ao remover configurações.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return { settings, loading, saving, saveSettings, deleteSettings };
};
