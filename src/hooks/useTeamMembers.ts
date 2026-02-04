import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TeamMember {
  id: string;
  owner_id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  oab_number: string | null;
  specialty: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberInput {
  name: string;
  email: string;
  phone?: string;
  oab_number?: string;
  specialty?: string;
  is_active?: boolean;
}

export const useTeamMembers = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchMembers = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setMembers((data as TeamMember[]) || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Error fetching team members:', errorMessage);
      toast({
        title: 'Erro ao carregar equipe',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createMember = async (input: TeamMemberInput): Promise<TeamMember | null> => {
    if (!user) return null;
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          owner_id: user.id,
          name: input.name,
          email: input.email,
          phone: input.phone || null,
          oab_number: input.oab_number || null,
          specialty: input.specialty || null,
          is_active: input.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      const newMember = data as TeamMember;
      setMembers(prev => [...prev, newMember]);
      
      toast({
        title: 'Membro adicionado',
        description: `${input.name} foi adicionado à equipe.`,
      });

      return newMember;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao adicionar membro',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateMember = async (id: string, updates: Partial<TeamMemberInput>): Promise<boolean> => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('team_members')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setMembers(prev => prev.map(m => 
        m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m
      ));

      toast({
        title: 'Membro atualizado',
        description: 'As informações foram atualizadas com sucesso.',
      });

      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao atualizar membro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteMember = async (id: string): Promise<boolean> => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.id !== id));

      toast({
        title: 'Membro removido',
        description: 'O membro foi removido da equipe.',
      });

      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao remover membro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean): Promise<boolean> => {
    return updateMember(id, { is_active: isActive });
  };

  useEffect(() => {
    fetchMembers();
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('team-members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMembers(prev => [...prev, payload.new as TeamMember]);
          } else if (payload.eventType === 'UPDATE') {
            setMembers(prev => prev.map(m => 
              m.id === (payload.new as TeamMember).id ? payload.new as TeamMember : m
            ));
          } else if (payload.eventType === 'DELETE') {
            setMembers(prev => prev.filter(m => m.id !== (payload.old as TeamMember).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Get active members for dropdowns
  const activeMembers = members.filter(m => m.is_active);

  return {
    members,
    activeMembers,
    loading,
    saving,
    createMember,
    updateMember,
    deleteMember,
    toggleActive,
    refetch: fetchMembers,
  };
};
