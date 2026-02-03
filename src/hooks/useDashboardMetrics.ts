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
  // Month over month changes
  agentsChange: number;
  contactsChange: number;
  messagesChange: number;
  conversionChange: number;
}

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
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchMetrics = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const _endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

      // Fetch all data in parallel
      const [
        agentsResult,
        contactsResult,
        casesResult,
        messagesResult,
        lastMonthContactsResult,
        lastMonthMessagesResult,
        lastMonthCasesResult,
      ] = await Promise.all([
        // Active agents count
        supabase
          .from('agents')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('is_active', true),
        
        // Total contacts
        supabase
          .from('contacts')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id),
        
        // Cases (leads) with status
        supabase
          .from('cases')
          .select('id, status, created_at')
          .eq('user_id', user.id),
        
        // Messages this month
        supabase
          .from('conversation_history')
          .select('id, role, created_at, case_id')
          .gte('created_at', startOfMonth),
        
        // Last month contacts
        supabase
          .from('contacts')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .lt('created_at', startOfMonth)
          .gte('created_at', startOfLastMonth),
        
        // Last month messages
        supabase
          .from('conversation_history')
          .select('id, role')
          .lt('created_at', startOfMonth)
          .gte('created_at', startOfLastMonth),
        
        // Last month cases for conversion comparison
        supabase
          .from('cases')
          .select('id, status')
          .eq('user_id', user.id)
          .lt('created_at', startOfMonth)
          .gte('created_at', startOfLastMonth),
      ]);

      // Calculate metrics
      const activeAgents = agentsResult.count || 0;
      const totalContacts = contactsResult.count || 0;
      const cases = casesResult.data || [];
      const messages = messagesResult.data || [];
      
      // Filter messages by user's cases
      const userCaseIds = new Set(cases.map(c => c.id));
      const userMessages = messages.filter(m => userCaseIds.has(m.case_id));
      
      const messagesSent = userMessages.filter(m => m.role === 'assistant').length;
      const messagesReceived = userMessages.filter(m => m.role === 'client').length;
      
      const totalLeads = cases.length;
      const qualifiedLeads = cases.filter(c => c.status === 'Qualificado').length;
      const convertedLeads = cases.filter(c => c.status === 'Convertido').length;
      
      // Conversion rate: converted / total leads (or qualified / total)
      const conversionRate = totalLeads > 0 
        ? Math.round((convertedLeads / totalLeads) * 100) 
        : 0;

      // Month over month calculations
      const lastMonthContacts = lastMonthContactsResult.count || 0;
      const lastMonthMessages = (lastMonthMessagesResult.data || []).length;
      const lastMonthCases = lastMonthCasesResult.data || [];
      const lastMonthConverted = lastMonthCases.filter(c => c.status === 'Convertido').length;
      const lastMonthConversionRate = lastMonthCases.length > 0
        ? Math.round((lastMonthConverted / lastMonthCases.length) * 100)
        : 0;

      // Calculate percentage changes
      const contactsChange = lastMonthContacts > 0 
        ? Math.round(((totalContacts - lastMonthContacts) / lastMonthContacts) * 100)
        : totalContacts > 0 ? 100 : 0;
      
      const totalMessagesThisMonth = messagesSent + messagesReceived;
      const messagesChange = lastMonthMessages > 0
        ? Math.round(((totalMessagesThisMonth - lastMonthMessages) / lastMonthMessages) * 100)
        : totalMessagesThisMonth > 0 ? 100 : 0;
      
      const conversionChange = lastMonthConversionRate > 0
        ? conversionRate - lastMonthConversionRate
        : conversionRate > 0 ? conversionRate : 0;

      setMetrics({
        activeAgents,
        totalContacts,
        totalLeads,
        messagesSent,
        messagesReceived,
        conversionRate,
        qualifiedLeads,
        convertedLeads,
        agentsChange: 0, // Agents don't typically change month over month
        contactsChange,
        messagesChange,
        conversionChange,
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
