import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Case {
  id: string;
  user_id: string;
  client_name: string | null;
  client_phone: string;
  status: string | null;
  active_agent_id: string | null;
  current_step_id: string | null;
  created_at: string;
  updated_at: string;
  unread_count: number;
  last_message: string | null;
  last_message_at: string | null;
  is_agent_paused: boolean;
  assigned_to: string | null;
  case_description: string | null;
}

export interface Message {
  id: string;
  case_id: string;
  role: string;
  content: string;
  created_at: string;
  message_status?: string;
  external_message_id?: string;
}

export const useCases = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCases = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar casos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (caseId: string): Promise<Message[]> => {
    try {
      const { data, error } = await supabase
        .from('conversation_history')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar mensagens',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
  };

  const updateCaseStatus = async (caseId: string, status: string) => {
    if (!user) return;
    try {
      // Check if there's a funnel agent assignment for the new stage
      const { data: assignment } = await supabase
        .from('funnel_agent_assignments')
        .select('agent_id')
        .eq('user_id', user.id)
        .eq('stage_name', status)
        .maybeSingle();

      const updatePayload: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Auto-switch agent if funnel assignment exists
      if (assignment?.agent_id) {
        updatePayload.active_agent_id = assignment.agent_id;
        updatePayload.is_agent_paused = false;
        updatePayload.current_step_id = null; // Reset script step for new agent
      }

      const { error } = await supabase
        .from('cases')
        .update(updatePayload)
        .eq('id', caseId);

      if (error) throw error;
      
      setCases(prev => prev.map(c => 
        c.id === caseId ? { ...c, ...updatePayload } : c
      ));

      toast({
        title: 'Status atualizado',
        description: assignment?.agent_id 
          ? `Status alterado para "${status}" — agente trocado automaticamente`
          : `Status alterado para "${status}"`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateCaseName = async (caseId: string, client_name: string) => {
    try {
      const { error } = await supabase
        .from('cases')
        .update({ client_name, updated_at: new Date().toISOString() })
        .eq('id', caseId);

      if (error) throw error;
      
      setCases(prev => prev.map(c => 
        c.id === caseId ? { ...c, client_name, updated_at: new Date().toISOString() } : c
      ));
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar nome',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchCases();
  }, [user]);

  // Setup realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('cases-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cases',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCases(prev => [payload.new as Case, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setCases(prev => prev.map(c => 
              c.id === (payload.new as Case).id ? payload.new as Case : c
            ));
          } else if (payload.eventType === 'DELETE') {
            setCases(prev => prev.filter(c => c.id !== (payload.old as Case).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const deleteCase = async (caseId: string) => {
    try {
      // Delete all related records that reference this case (foreign keys)
      const deletions = [
        supabase.from('conversation_history').delete().eq('case_id', caseId),
        supabase.from('case_followups').delete().eq('case_id', caseId),
        supabase.from('signed_documents').delete().eq('case_id', caseId),
        supabase.from('financial_transactions').delete().eq('case_id', caseId),
      ];
      
      const results = await Promise.all(deletions);
      for (const result of results) {
        if (result.error) {
          console.warn('Warning deleting related record:', result.error.message);
        }
      }

      // Then delete the case
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', caseId);

      if (error) throw error;
      
      setCases(prev => prev.filter(c => c.id !== caseId));

      toast({
        title: 'Conversa excluída',
        description: 'A conversa foi removida com sucesso.',
      });
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir conversa',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const assignAgentToCase = async (caseId: string, agentId: string | null) => {
    try {
      const { error } = await supabase
        .from('cases')
        .update({ active_agent_id: agentId, updated_at: new Date().toISOString() })
        .eq('id', caseId);

      if (error) throw error;
      
      setCases(prev => prev.map(c => 
        c.id === caseId ? { ...c, active_agent_id: agentId, updated_at: new Date().toISOString() } : c
      ));

      toast({
        title: agentId ? 'Agente ativado' : 'Agente desativado',
        description: agentId ? 'O agente IA foi ativado para esta conversa.' : 'O atendimento agora é manual.',
      });
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao atribuir agente',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const pauseAgentForCase = async (caseId: string) => {
    try {
      const { error } = await supabase
        .from('cases')
        .update({ is_agent_paused: true, updated_at: new Date().toISOString() })
        .eq('id', caseId);

      if (error) throw error;
      
      setCases(prev => prev.map(c => 
        c.id === caseId ? { ...c, is_agent_paused: true, updated_at: new Date().toISOString() } : c
      ));

      toast({
        title: 'Agente pausado',
        description: 'O agente IA foi pausado. O atendimento agora é manual.',
      });
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao pausar agente',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const markAsRead = async (caseId: string) => {
    try {
      const { error } = await supabase
        .from('cases')
        .update({ unread_count: 0 })
        .eq('id', caseId);

      if (error) throw error;
      
      setCases(prev => prev.map(c => 
        c.id === caseId ? { ...c, unread_count: 0 } : c
      ));
    } catch (error: any) {
      console.error('Error marking as read:', error);
    }
  };

  return {
    cases,
    loading,
    fetchMessages,
    updateCaseStatus,
    updateCaseName,
    deleteCase,
    assignAgentToCase,
    pauseAgentForCase,
    markAsRead,
    refetch: fetchCases,
  };
};

export const useMessages = (caseId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = async () => {
    if (!caseId) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('conversation_history')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [caseId]);

  // Realtime messages
  useEffect(() => {
    if (!caseId) return;

    const channel = supabase
      .channel(`messages-${caseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_history',
          filter: `case_id=eq.${caseId}`,
        },
        (payload) => {
          setMessages(prev => {
            const newMsg = payload.new as Message;
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_history',
          filter: `case_id=eq.${caseId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId]);

  return { messages, loading, refetch: fetchMessages };
};
