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
  password?: string;
  phone?: string;
  oab_number?: string;
  specialty?: string;
  role?: string;
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
      // Use edge function to create auth user + team member + role
      const { data, error } = await supabase.functions.invoke('manage-team-user', {
        body: {
          action: 'create',
          name: input.name,
          email: input.email,
          password: input.password,
          phone: input.phone || null,
          oab_number: input.oab_number || null,
          specialty: input.specialty || null,
          role: input.role || 'lawyer',
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const newMember = data.member as TeamMember;
      setMembers(prev => {
        const exists = prev.some(m => m.id === newMember.id);
        return exists ? prev : [...prev, newMember];
      });
      
      toast({
        title: 'Usuário criado',
        description: `${input.name} foi cadastrado com acesso à plataforma.`,
      });

      return newMember;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao criar usuário',
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
      // Use edge function to delete auth user + team member
      const { data, error } = await supabase.functions.invoke('manage-team-user', {
        body: { action: 'delete', team_member_id: id },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setMembers(prev => prev.filter(m => m.id !== id));

      toast({
        title: 'Usuário removido',
        description: 'O usuário e seu acesso foram removidos.',
      });

      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao remover usuário',
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
            // Avoid duplicates - only add if not already in the list
            const newMember = payload.new as TeamMember;
            setMembers(prev => {
              const exists = prev.some(m => m.id === newMember.id);
              return exists ? prev : [...prev, newMember];
            });
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
