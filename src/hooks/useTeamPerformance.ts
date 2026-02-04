import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TeamMemberPerformance {
  id: string;
  name: string;
  specialty: string | null;
  totalLeads: number;
  activeLeads: number;
  convertedLeads: number;
  conversionRate: number;
  avgResponseTimeMinutes: number | null;
  lastActivityAt: string | null;
}

export interface TeamPerformanceMetrics {
  totalLeads: number;
  totalConverted: number;
  avgConversionRate: number;
  avgResponseTime: number | null;
  topPerformer: TeamMemberPerformance | null;
  members: TeamMemberPerformance[];
}

export const useTeamPerformance = () => {
  const [metrics, setMetrics] = useState<TeamPerformanceMetrics>({
    totalLeads: 0,
    totalConverted: 0,
    avgConversionRate: 0,
    avgResponseTime: null,
    topPerformer: null,
    members: [],
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPerformanceMetrics = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch team members
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('id, name, specialty')
        .eq('is_active', true);

      if (teamError) throw teamError;

      if (!teamMembers || teamMembers.length === 0) {
        setMetrics({
          totalLeads: 0,
          totalConverted: 0,
          avgConversionRate: 0,
          avgResponseTime: null,
          topPerformer: null,
          members: [],
        });
        setLoading(false);
        return;
      }

      // Fetch all cases with their assignments
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select('id, assigned_to, status, created_at, updated_at');

      if (casesError) throw casesError;

      // Calculate metrics for each team member
      const memberPerformance: TeamMemberPerformance[] = teamMembers.map((member) => {
        const memberCases = (cases || []).filter(c => c.assigned_to === member.id);
        const convertedCases = memberCases.filter(c => 
          c.status?.toLowerCase().includes('convertido') || 
          c.status?.toLowerCase().includes('contrato assinado')
        );
        const activeCases = memberCases.filter(c => 
          !c.status?.toLowerCase().includes('convertido') && 
          !c.status?.toLowerCase().includes('perdido')
        );

        // Find most recent activity
        const sortedCases = [...memberCases].sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

        return {
          id: member.id,
          name: member.name,
          specialty: member.specialty,
          totalLeads: memberCases.length,
          activeLeads: activeCases.length,
          convertedLeads: convertedCases.length,
          conversionRate: memberCases.length > 0 
            ? Math.round((convertedCases.length / memberCases.length) * 100) 
            : 0,
          avgResponseTimeMinutes: null, // Would require conversation_history analysis
          lastActivityAt: sortedCases[0]?.updated_at || null,
        };
      });

      // Sort by conversion rate to find top performer
      const sortedByPerformance = [...memberPerformance].sort((a, b) => {
        // First by conversion rate, then by total leads as tiebreaker
        if (b.conversionRate !== a.conversionRate) {
          return b.conversionRate - a.conversionRate;
        }
        return b.totalLeads - a.totalLeads;
      });

      // Calculate team totals
      const totalLeads = memberPerformance.reduce((sum, m) => sum + m.totalLeads, 0);
      const totalConverted = memberPerformance.reduce((sum, m) => sum + m.convertedLeads, 0);
      const avgConversionRate = totalLeads > 0 
        ? Math.round((totalConverted / totalLeads) * 100) 
        : 0;

      setMetrics({
        totalLeads,
        totalConverted,
        avgConversionRate,
        avgResponseTime: null,
        topPerformer: sortedByPerformance[0] || null,
        members: memberPerformance,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Error fetching team performance:', errorMessage);
      toast({
        title: 'Erro ao carregar métricas',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceMetrics();
  }, [user]);

  return {
    metrics,
    loading,
    refetch: fetchPerformanceMetrics,
  };
};
