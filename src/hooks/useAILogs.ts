import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export interface AILog {
  id: string;
  user_id: string;
  created_at: string;
  event_type: string;
  source: string;
  agent_id: string | null;
  agent_name: string | null;
  model: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  response_time_ms: number | null;
  status: string;
  error_message: string | null;
  contact_phone: string | null;
  metadata: Record<string, any> | null;
}

export interface AILogFilters {
  status?: string;
  source?: string;
  event_type?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useAILogs(filters: AILogFilters = {}) {
  const [realtimeLogs, setRealtimeLogs] = useState<AILog[]>([]);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['ai-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('ai_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.source && filters.source !== 'all') {
        query = query.eq('source', filters.source);
      }
      if (filters.event_type && filters.event_type !== 'all') {
        query = query.eq('event_type', filters.event_type);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AILog[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('ai-logs-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_logs',
      }, (payload) => {
        const newLog = payload.new as AILog;
        setRealtimeLogs(prev => {
          if (prev.some(l => l.id === newLog.id)) return prev;
          return [newLog, ...prev].slice(0, 50);
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Merge realtime logs with query data
  const allLogs = [...realtimeLogs, ...(logs || [])].reduce((acc, log) => {
    if (!acc.find((l: AILog) => l.id === log.id)) acc.push(log);
    return acc;
  }, [] as AILog[]).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { logs: allLogs, isLoading, refetch };
}

export function useAILogStats(days = 7) {
  return useQuery({
    queryKey: ['ai-log-stats', days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('ai_logs')
        .select('*')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      const logs = (data || []) as AILog[];

      const totalCalls = logs.length;
      const errors = logs.filter(l => l.status === 'error').length;
      const rateLimits = logs.filter(l => l.status === 'rate_limited').length;
      const timeouts = logs.filter(l => l.status === 'timeout').length;
      const successes = logs.filter(l => l.status === 'success').length;

      const avgResponseTime = logs
        .filter(l => l.response_time_ms)
        .reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / (logs.filter(l => l.response_time_ms).length || 1);

      const totalTokensIn = logs.reduce((sum, l) => sum + (l.tokens_input || 0), 0);
      const totalTokensOut = logs.reduce((sum, l) => sum + (l.tokens_output || 0), 0);

      // Group by day for chart
      const byDay: Record<string, { date: string; success: number; error: number; total: number }> = {};
      logs.forEach(l => {
        const day = l.created_at.split('T')[0];
        if (!byDay[day]) byDay[day] = { date: day, success: 0, error: 0, total: 0 };
        byDay[day].total++;
        if (l.status === 'success') byDay[day].success++;
        else byDay[day].error++;
      });

      // Group by source
      const bySource: Record<string, number> = {};
      logs.forEach(l => {
        bySource[l.source] = (bySource[l.source] || 0) + 1;
      });

      // Group by model
      const byModel: Record<string, number> = {};
      logs.forEach(l => {
        if (l.model) byModel[l.model] = (byModel[l.model] || 0) + 1;
      });

      // Group by agent
      const byAgent: Record<string, { name: string; count: number; errors: number }> = {};
      logs.forEach(l => {
        const key = l.agent_name || 'Sem agente';
        if (!byAgent[key]) byAgent[key] = { name: key, count: 0, errors: 0 };
        byAgent[key].count++;
        if (l.status !== 'success') byAgent[key].errors++;
      });

      return {
        totalCalls,
        successes,
        errors,
        rateLimits,
        timeouts,
        avgResponseTime: Math.round(avgResponseTime),
        totalTokensIn,
        totalTokensOut,
        chartData: Object.values(byDay),
        bySource: Object.entries(bySource).map(([name, value]) => ({ name, value })),
        byModel: Object.entries(byModel).map(([name, value]) => ({ name, value })),
        byAgent: Object.values(byAgent),
        recentErrors: logs.filter(l => l.status !== 'success').slice(-20).reverse(),
      };
    },
    refetchInterval: 30000,
  });
}
