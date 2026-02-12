import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface FunnelAssignment {
  id: string;
  user_id: string;
  stage_name: string;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
}

const FUNNEL_STAGES = [
  'Novo Contato',
  'Em Atendimento',
  'Qualificado',
  'Consulta Marcada',
  'Não Qualificado',
  'Convertido',
  'Arquivado',
];

export const useFunnelAssignments = () => {
  const [assignments, setAssignments] = useState<FunnelAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchAssignments = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('funnel_agent_assignments')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setAssignments(data || []);
    } catch (error: any) {
      console.error('Error fetching funnel assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [user]);

  const getAgentForStage = (stageName: string): string | null => {
    const assignment = assignments.find(a => a.stage_name === stageName);
    return assignment?.agent_id || null;
  };

  const saveAssignment = async (stageName: string, agentId: string | null) => {
    if (!user) return;
    setSaving(true);

    try {
      const existing = assignments.find(a => a.stage_name === stageName);

      if (existing) {
        if (agentId === null) {
          const { error } = await supabase
            .from('funnel_agent_assignments')
            .delete()
            .eq('id', existing.id);
          if (error) throw error;
          setAssignments(prev => prev.filter(a => a.id !== existing.id));
        } else {
          const { data, error } = await supabase
            .from('funnel_agent_assignments')
            .update({ agent_id: agentId })
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          setAssignments(prev => prev.map(a => a.id === existing.id ? data : a));
        }
      } else if (agentId) {
        const { data, error } = await supabase
          .from('funnel_agent_assignments')
          .insert({ user_id: user.id, stage_name: stageName, agent_id: agentId })
          .select()
          .single();
        if (error) throw error;
        setAssignments(prev => [...prev, data]);
      }

      toast({ title: 'Salvo', description: `Agente atualizado para "${stageName}"` });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return {
    assignments,
    loading,
    saving,
    stages: FUNNEL_STAGES,
    getAgentForStage,
    saveAssignment,
    refetch: fetchAssignments,
  };
};
