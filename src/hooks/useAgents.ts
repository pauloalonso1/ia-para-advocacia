import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

export interface AgentRules {
  id: string;
  agent_id: string;
  system_prompt: string | null;
  agent_rules: string | null;
  forbidden_actions: string | null;
  welcome_message: string | null;
}

export interface ScriptStep {
  id: string;
  agent_id: string;
  step_order: number;
  situation: string | null;
  message_to_send: string;
}

export interface FAQ {
  id: string;
  agent_id: string;
  question: string;
  answer: string;
}

export const useAgents = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar agentes',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      setAgents(data || []);
    }
    setLoading(false);
  };

  const createAgent = async (name: string, description: string, category: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('agents')
      .insert({
        user_id: user.id,
        name,
        description,
        category
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erro ao criar agente',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }

    // Create default rules
    await supabase.from('agent_rules').insert({
      agent_id: data.id,
      system_prompt: '',
      agent_rules: '',
      forbidden_actions: '',
      welcome_message: ''
    });

    await fetchAgents();
    toast({
      title: 'Agente criado!',
      description: `${name} foi criado com sucesso.`
    });
    return data;
  };

  const updateAgent = async (id: string, updates: Partial<Agent>) => {
    const { error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao atualizar agente',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }

    await fetchAgents();
    return true;
  };

  const deleteAgent = async (id: string) => {
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao excluir agente',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }

    await fetchAgents();
    toast({
      title: 'Agente excluído',
      description: 'O agente foi removido com sucesso.'
    });
    return true;
  };

  useEffect(() => {
    fetchAgents();
  }, [user]);

  return {
    agents,
    loading,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent
  };
};

export const useAgentDetails = (agentId: string | null) => {
  const [rules, setRules] = useState<AgentRules | null>(null);
  const [steps, setSteps] = useState<ScriptStep[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDetails = async () => {
    if (!agentId) return;

    setLoading(true);

    // Fetch rules
    const { data: rulesData } = await supabase
      .from('agent_rules')
      .select('*')
      .eq('agent_id', agentId)
      .maybeSingle();

    setRules(rulesData);

    // Fetch steps
    const { data: stepsData } = await supabase
      .from('agent_script_steps')
      .select('*')
      .eq('agent_id', agentId)
      .order('step_order', { ascending: true });

    setSteps(stepsData || []);

    // Fetch FAQs
    const { data: faqsData } = await supabase
      .from('agent_faqs')
      .select('*')
      .eq('agent_id', agentId);

    setFaqs(faqsData || []);
    setLoading(false);
  };

  const updateRules = async (updates: Partial<AgentRules>) => {
    if (!agentId) return false;

    if (rules) {
      const { error } = await supabase
        .from('agent_rules')
        .update(updates)
        .eq('agent_id', agentId);

      if (error) {
        toast({
          title: 'Erro ao salvar regras',
          description: error.message,
          variant: 'destructive'
        });
        return false;
      }
    } else {
      const { error } = await supabase
        .from('agent_rules')
        .insert({ agent_id: agentId, ...updates });

      if (error) {
        toast({
          title: 'Erro ao criar regras',
          description: error.message,
          variant: 'destructive'
        });
        return false;
      }
    }

    await fetchDetails();
    toast({ title: 'Regras salvas!' });
    return true;
  };

  const addStep = async (situation: string, message: string) => {
    if (!agentId) return false;

    const nextOrder = steps.length > 0 ? Math.max(...steps.map(s => s.step_order)) + 1 : 1;

    const { error } = await supabase
      .from('agent_script_steps')
      .insert({
        agent_id: agentId,
        step_order: nextOrder,
        situation,
        message_to_send: message
      });

    if (error) {
      toast({
        title: 'Erro ao adicionar etapa',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }

    await fetchDetails();
    toast({ title: 'Etapa adicionada!' });
    return true;
  };

  const updateStep = async (stepId: string, updates: { situation?: string; message_to_send?: string }) => {
    const { error } = await supabase
      .from('agent_script_steps')
      .update(updates)
      .eq('id', stepId);

    if (error) {
      toast({
        title: 'Erro ao atualizar etapa',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }

    await fetchDetails();
    return true;
  };

  const deleteStep = async (stepId: string) => {
    const { error } = await supabase
      .from('agent_script_steps')
      .delete()
      .eq('id', stepId);

    if (error) {
      toast({
        title: 'Erro ao excluir etapa',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }

    await fetchDetails();
    return true;
  };

  const reorderSteps = async (fromIndex: number, toIndex: number) => {
    if (!agentId) return false;

    const newSteps = [...steps];
    const [movedStep] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, movedStep);

    // Update step_order for all affected steps
    const updates = newSteps.map((step, index) => ({
      id: step.id,
      step_order: index + 1
    }));

    for (const update of updates) {
      await supabase
        .from('agent_script_steps')
        .update({ step_order: update.step_order })
        .eq('id', update.id);
    }

    await fetchDetails();
    return true;
  };

  const addFaq = async (question: string, answer: string) => {
    if (!agentId) return false;

    const { error } = await supabase
      .from('agent_faqs')
      .insert({
        agent_id: agentId,
        question,
        answer
      });

    if (error) {
      toast({
        title: 'Erro ao adicionar FAQ',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }

    await fetchDetails();
    toast({ title: 'FAQ adicionada!' });
    return true;
  };

  const updateFaq = async (faqId: string, updates: { question?: string; answer?: string }) => {
    const { error } = await supabase
      .from('agent_faqs')
      .update(updates)
      .eq('id', faqId);

    if (error) {
      toast({
        title: 'Erro ao atualizar FAQ',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }

    await fetchDetails();
    return true;
  };

  const deleteFaq = async (faqId: string) => {
    const { error } = await supabase
      .from('agent_faqs')
      .delete()
      .eq('id', faqId);

    if (error) {
      toast({
        title: 'Erro ao excluir FAQ',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }

    await fetchDetails();
    return true;
  };

  useEffect(() => {
    fetchDetails();
  }, [agentId]);

  return {
    rules,
    steps,
    faqs,
    loading,
    fetchDetails,
    updateRules,
    addStep,
    updateStep,
    deleteStep,
    reorderSteps,
    addFaq,
    updateFaq,
    deleteFaq
  };
};
