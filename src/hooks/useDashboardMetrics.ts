import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardMetrics {
  activeAgents: number;
  totalContacts: number;
  totalLeads: number;
  messagesSent: number;
  messagesReceived: number;
  conversionRate: number;
  qualifiedLeads: number;
  convertedLeads: number;
  agentsChange: number;
  contactsChange: number;
  messagesChange: number;
  conversionChange: number;
  // Real data for charts
  conversationsByDay: Array<{ date: string; count: number }>;
  funnelSteps: Array<{ name: string; count: number; rate: number; color: string }>;
  tagsData: Array<{ name: string; value: number; color: string }>;
  contactsByState: Array<{ state: string; count: number }>;
  peakDay: { count: number; date: string };
  averagePerDay: number;
}

const TAG_COLORS = [
  'hsl(205, 88%, 53%)',  // primary blue
  'hsl(160, 100%, 36%)', // green
  'hsl(43, 93%, 56%)',   // yellow
  'hsl(280, 60%, 55%)',  // purple
  'hsl(356, 91%, 54%)',  // red
  'hsl(180, 60%, 45%)',  // teal
  'hsl(30, 90%, 55%)',   // orange
];

const STATUS_CONFIG: Record<string, { order: number; color: string }> = {
  'Novo Contato': { order: 1, color: 'bg-chart-1' },
  'Recepção': { order: 1, color: 'bg-chart-1' },
  'Qualificação do lead': { order: 2, color: 'bg-chart-2' },
  'Qualificado': { order: 2, color: 'bg-chart-2' },
  'Análise de viabilidade': { order: 3, color: 'bg-chart-3' },
  'Oferta do contrato': { order: 4, color: 'bg-chart-4' },
  'Contrato Enviado': { order: 5, color: 'bg-chart-2' },
  'Agendamento feito': { order: 6, color: 'bg-chart-3' },
  'Reunião Feita': { order: 7, color: 'bg-chart-4' },
  'Convertido': { order: 8, color: 'bg-chart-2' },
  'Desqualificado': { order: 9, color: 'bg-chart-5' },
  'Não tem interesse': { order: 10, color: 'bg-chart-5' },
};

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeAgents: 0,
    totalContacts: 0,
    totalLeads: 0,
    messagesSent: 0,
    messagesReceived: 0,
    conversionRate: 0,
    qualifiedLeads: 0,
    convertedLeads: 0,
    agentsChange: 0,
    contactsChange: 0,
    messagesChange: 0,
    conversionChange: 0,
    conversationsByDay: [],
    funnelSteps: [],
    tagsData: [],
    contactsByState: [],
    peakDay: { count: 0, date: '' },
    averagePerDay: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchMetrics = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

      const [
        agentsResult,
        contactsResult,
        casesResult,
        messagesResult,
        lastMonthContactsResult,
        lastMonthMessagesResult,
        lastMonthCasesResult,
      ] = await Promise.all([
        supabase.from('agents').select('id', { count: 'exact' }).eq('user_id', user.id).eq('is_active', true),
        supabase.from('contacts').select('id, tags', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('cases').select('id, status, created_at').eq('user_id', user.id),
        supabase.from('conversation_history').select('id, role, created_at, case_id').gte('created_at', thirtyDaysAgo.toISOString()),
        supabase.from('contacts').select('id', { count: 'exact' }).eq('user_id', user.id).lt('created_at', startOfMonth).gte('created_at', startOfLastMonth),
        supabase.from('conversation_history').select('id, role').lt('created_at', startOfMonth).gte('created_at', startOfLastMonth),
        supabase.from('cases').select('id, status').eq('user_id', user.id).lt('created_at', startOfMonth).gte('created_at', startOfLastMonth),
      ]);

      const activeAgents = agentsResult.count || 0;
      const totalContacts = contactsResult.count || 0;
      const contacts = contactsResult.data || [];
      const cases = casesResult.data || [];
      const messages = messagesResult.data || [];

      const userCaseIds = new Set(cases.map(c => c.id));
      const userMessages = messages.filter(m => userCaseIds.has(m.case_id));

      const messagesSent = userMessages.filter(m => m.role === 'assistant').length;
      const messagesReceived = userMessages.filter(m => m.role === 'client').length;

      const totalLeads = cases.length;
      const qualifiedLeads = cases.filter(c => c.status === 'Qualificado').length;
      const convertedLeads = cases.filter(c => c.status === 'Convertido').length;
      const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

      // --- Conversations by day (last 30 days) ---
      const dayCounts: Record<string, number> = {};
      for (let i = 0; i < 30; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - (29 - i));
        dayCounts[d.toISOString().slice(0, 10)] = 0;
      }
      for (const c of cases) {
        const day = c.created_at.slice(0, 10);
        if (day in dayCounts) dayCounts[day]++;
      }
      const conversationsByDay = Object.entries(dayCounts).map(([date, count]) => ({
        date: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        count,
      }));

      // Peak day
      let peakCount = 0;
      let peakDate = '';
      for (const [date, count] of Object.entries(dayCounts)) {
        if (count > peakCount) {
          peakCount = count;
          peakDate = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        }
      }
      const daysWithData = Object.values(dayCounts).filter(c => c > 0).length || 1;
      const averagePerDay = parseFloat((totalLeads / Math.max(daysWithData, 1)).toFixed(1));

      // --- Funnel steps from case statuses ---
      const statusCounts: Record<string, number> = {};
      for (const c of cases) {
        const s = c.status || 'Novo Contato';
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      }
      const funnelSteps = Object.entries(statusCounts)
        .map(([name, count]) => ({
          name,
          count,
          rate: totalLeads > 0 ? parseFloat(((count / totalLeads) * 100).toFixed(1)) : 0,
          color: STATUS_CONFIG[name]?.color || 'bg-chart-1',
          order: STATUS_CONFIG[name]?.order || 99,
        }))
        .sort((a, b) => a.order - b.order)
        .map(({ order: _, ...rest }) => rest);

      // --- Tags from contacts ---
      const tagCounts: Record<string, number> = {};
      for (const contact of contacts) {
        const tags = contact.tags as string[] | null;
        if (tags) {
          for (const tag of tags) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        }
      }
      const tagsData = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([name, value], i) => ({
          name,
          value,
          color: TAG_COLORS[i % TAG_COLORS.length],
        }));

      // Month over month
      const lastMonthContacts = lastMonthContactsResult.count || 0;
      const lastMonthMessages = (lastMonthMessagesResult.data || []).length;
      const lastMonthCases = lastMonthCasesResult.data || [];
      const lastMonthConverted = lastMonthCases.filter(c => c.status === 'Convertido').length;
      const lastMonthConversionRate = lastMonthCases.length > 0 ? Math.round((lastMonthConverted / lastMonthCases.length) * 100) : 0;

      const contactsChange = lastMonthContacts > 0 ? Math.round(((totalContacts - lastMonthContacts) / lastMonthContacts) * 100) : totalContacts > 0 ? 100 : 0;
      const totalMessagesThisMonth = messagesSent + messagesReceived;
      const messagesChange = lastMonthMessages > 0 ? Math.round(((totalMessagesThisMonth - lastMonthMessages) / lastMonthMessages) * 100) : totalMessagesThisMonth > 0 ? 100 : 0;
      const conversionChange = lastMonthConversionRate > 0 ? conversionRate - lastMonthConversionRate : conversionRate > 0 ? conversionRate : 0;

      setMetrics({
        activeAgents,
        totalContacts,
        totalLeads,
        messagesSent,
        messagesReceived,
        conversionRate,
        qualifiedLeads,
        convertedLeads,
        agentsChange: 0,
        contactsChange,
        messagesChange,
        conversionChange,
        conversationsByDay,
        funnelSteps,
        tagsData,
        contactsByState: [],
        peakDay: { count: peakCount, date: peakDate },
        averagePerDay,
      });
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [user]);

  return { metrics, loading, refetch: fetchMetrics };
};
