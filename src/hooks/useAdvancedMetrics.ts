import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  avgResponseMinutes: number;
}

export interface SourceMetric {
  source: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
}

export interface FunnelTransition {
  from: string;
  to: string;
  avgDaysInStage: number;
  count: number;
}

export interface AdvancedMetrics {
  avgResponseTimeMinutes: number;
  overallConversionRate: number;
  agentPerformance: AgentPerformance[];
  sourceMetrics: SourceMetric[];
  avgTimeToConversion: number;
  respondedWithin5Min: number;
  respondedWithin30Min: number;
  respondedAfter30Min: number;
}

export const useAdvancedMetrics = (dateFrom?: Date, dateTo?: Date) => {
  const [metrics, setMetrics] = useState<AdvancedMetrics>({
    avgResponseTimeMinutes: 0,
    overallConversionRate: 0,
    agentPerformance: [],
    sourceMetrics: [],
    avgTimeToConversion: 0,
    respondedWithin5Min: 0,
    respondedWithin30Min: 0,
    respondedAfter30Min: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchAdvancedMetrics = async () => {
    if (!user) return;

    try {
      const now = dateTo ? new Date(dateTo.getTime()) : new Date();
      now.setHours(23, 59, 59, 999);
      const rangeStart = dateFrom ? new Date(dateFrom.getTime()) : new Date(now);
      if (!dateFrom) rangeStart.setDate(rangeStart.getDate() - 30);
      rangeStart.setHours(0, 0, 0, 0);

      const [casesResult, agentsResult, contactsResult] = await Promise.all([
        supabase
          .from('cases')
          .select('id, status, active_agent_id, client_phone, created_at, updated_at')
          .eq('user_id', user.id)
          .gte('created_at', rangeStart.toISOString())
          .lte('created_at', now.toISOString()),
        supabase
          .from('agents')
          .select('id, name')
          .eq('user_id', user.id),
        supabase
          .from('contacts')
          .select('phone, source')
          .eq('user_id', user.id),
      ]);

      const cases = casesResult.data || [];
      const agents = agentsResult.data || [];
      const contacts = contactsResult.data || [];

      // Build phone → source map
      const phoneSourceMap: Record<string, string> = {};
      for (const c of contacts) {
        if (c.source) phoneSourceMap[c.phone] = c.source;
      }

      // Fetch first assistant response per case for response time calc
      const caseIds = cases.map(c => c.id);
      let responseTimes: number[] = [];

      if (caseIds.length > 0) {
        // Get first client + first assistant message per case (batch)
        const { data: allMessages } = await supabase
          .from('conversation_history')
          .select('case_id, role, created_at')
          .in('case_id', caseIds.slice(0, 200))
          .in('role', ['client', 'assistant'])
          .order('created_at', { ascending: true });

        if (allMessages) {
          const firstClientMsg: Record<string, string> = {};
          const firstAssistantMsg: Record<string, string> = {};

          for (const msg of allMessages) {
            if (msg.role === 'client' && !firstClientMsg[msg.case_id]) {
              firstClientMsg[msg.case_id] = msg.created_at;
            }
            if (msg.role === 'assistant' && !firstAssistantMsg[msg.case_id]) {
              firstAssistantMsg[msg.case_id] = msg.created_at;
            }
          }

          for (const caseId of caseIds) {
            if (firstClientMsg[caseId] && firstAssistantMsg[caseId]) {
              const clientTime = new Date(firstClientMsg[caseId]).getTime();
              const assistantTime = new Date(firstAssistantMsg[caseId]).getTime();
              if (assistantTime > clientTime) {
                responseTimes.push((assistantTime - clientTime) / (1000 * 60));
              }
            }
          }
        }
      }

      const avgResponseTimeMinutes = responseTimes.length > 0
        ? parseFloat((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1))
        : 0;

      // Response time distribution
      const within5 = responseTimes.filter(t => t <= 5).length;
      const within30 = responseTimes.filter(t => t > 5 && t <= 30).length;
      const after30 = responseTimes.filter(t => t > 30).length;
      const totalResponses = responseTimes.length || 1;

      // Agent performance
      const agentMap = new Map(agents.map(a => [a.id, a.name]));
      const agentLeads: Record<string, { total: number; converted: number; responseTimes: number[] }> = {};

      for (const c of cases) {
        const agentId = c.active_agent_id;
        if (!agentId) continue;
        if (!agentLeads[agentId]) agentLeads[agentId] = { total: 0, converted: 0, responseTimes: [] };
        agentLeads[agentId].total++;
        if (c.status === 'Convertido') agentLeads[agentId].converted++;
      }

      const agentPerformance: AgentPerformance[] = Object.entries(agentLeads)
        .map(([agentId, data]) => ({
          agentId,
          agentName: agentMap.get(agentId) || 'Desconhecido',
          totalLeads: data.total,
          convertedLeads: data.converted,
          conversionRate: data.total > 0 ? parseFloat(((data.converted / data.total) * 100).toFixed(1)) : 0,
          avgResponseMinutes: 0,
        }))
        .sort((a, b) => b.totalLeads - a.totalLeads);

      // Source metrics
      const sourceLeads: Record<string, { total: number; converted: number }> = {};
      for (const c of cases) {
        const source = phoneSourceMap[c.client_phone] || 'Não informado';
        if (!sourceLeads[source]) sourceLeads[source] = { total: 0, converted: 0 };
        sourceLeads[source].total++;
        if (c.status === 'Convertido') sourceLeads[source].converted++;
      }

      const sourceMetrics: SourceMetric[] = Object.entries(sourceLeads)
        .map(([source, data]) => ({
          source,
          totalLeads: data.total,
          convertedLeads: data.converted,
          conversionRate: data.total > 0 ? parseFloat(((data.converted / data.total) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.totalLeads - a.totalLeads);

      // Avg time to conversion (days)
      const convertedCases = cases.filter(c => c.status === 'Convertido');
      const conversionTimes = convertedCases.map(c => {
        const created = new Date(c.created_at).getTime();
        const updated = new Date(c.updated_at).getTime();
        return (updated - created) / (1000 * 60 * 60 * 24);
      });
      const avgTimeToConversion = conversionTimes.length > 0
        ? parseFloat((conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length).toFixed(1))
        : 0;

      const totalLeads = cases.length;
      const convertedTotal = cases.filter(c => c.status === 'Convertido').length;

      setMetrics({
        avgResponseTimeMinutes,
        overallConversionRate: totalLeads > 0 ? parseFloat(((convertedTotal / totalLeads) * 100).toFixed(1)) : 0,
        agentPerformance,
        sourceMetrics,
        avgTimeToConversion,
        respondedWithin5Min: Math.round((within5 / totalResponses) * 100),
        respondedWithin30Min: Math.round((within30 / totalResponses) * 100),
        respondedAfter30Min: Math.round((after30 / totalResponses) * 100),
      });
    } catch (error) {
      console.error('Error fetching advanced metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvancedMetrics();
  }, [user, dateFrom?.getTime(), dateTo?.getTime()]);

  return { metrics, loading };
};
