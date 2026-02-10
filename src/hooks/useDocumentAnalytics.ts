import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PeriodFilter = '7d' | '30d' | '90d' | 'custom';

interface AnalyticsData {
  totalDocs: number;
  totalDocsPrev: number;
  totalFavorites: number;
  avgGenerationChars: number;
  avgGenerationCharsPrev: number;
  docsByDay: Array<{ date: string; count: number; type: string }>;
  docsByType: Array<{ name: string; value: number }>;
  recentDocs: Array<{ id: string; title: string | null; document_type: string; created_at: string; chars: number }>;
}

export function useDocumentAnalytics(period: PeriodFilter, customFrom?: Date, customTo?: Date) {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData>({
    totalDocs: 0,
    totalDocsPrev: 0,
    totalFavorites: 0,
    avgGenerationChars: 0,
    avgGenerationCharsPrev: 0,
    docsByDay: [],
    docsByType: [],
    recentDocs: [],
  });
  const [loading, setLoading] = useState(true);

  const { rangeStart, rangeEnd, prevStart, prevEnd } = useMemo(() => {
    const now = customTo ? new Date(customTo) : new Date();
    now.setHours(23, 59, 59, 999);
    let start: Date;
    if (period === 'custom' && customFrom) {
      start = new Date(customFrom);
    } else {
      start = new Date(now);
      const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
      start.setDate(start.getDate() - days);
    }
    start.setHours(0, 0, 0, 0);
    const diff = now.getTime() - start.getTime();
    const pEnd = new Date(start.getTime() - 1);
    const pStart = new Date(pEnd.getTime() - diff);
    return { rangeStart: start, rangeEnd: now, prevStart: pStart, prevEnd: pEnd };
  }, [period, customFrom?.getTime(), customTo?.getTime()]);

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [currentRes, prevRes] = await Promise.all([
        supabase
          .from('legal_document_history')
          .select('id, document_type, title, output_data, is_favorite, created_at')
          .eq('user_id', user.id)
          .gte('created_at', rangeStart.toISOString())
          .lte('created_at', rangeEnd.toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('legal_document_history')
          .select('id, output_data', { count: 'exact' })
          .eq('user_id', user.id)
          .gte('created_at', prevStart.toISOString())
          .lte('created_at', prevEnd.toISOString()),
      ]);

      const docs = currentRes.data || [];
      const prevDocs = prevRes.data || [];

      const totalDocs = docs.length;
      const totalDocsPrev = prevDocs.length;
      const totalFavorites = docs.filter(d => d.is_favorite).length;

      const totalChars = docs.reduce((sum, d) => sum + (d.output_data?.length || 0), 0);
      const avgGenerationChars = totalDocs > 0 ? Math.round(totalChars / totalDocs) : 0;
      const prevTotalChars = prevDocs.reduce((sum, d) => sum + ((d as any).output_data?.length || 0), 0);
      const avgGenerationCharsPrev = prevDocs.length > 0 ? Math.round(prevTotalChars / prevDocs.length) : 0;

      // Docs by day (grouped by type)
      const dayTypeMap: Record<string, Record<string, number>> = {};
      for (const d of docs) {
        const day = d.created_at.slice(0, 10);
        const type = d.document_type || 'Outro';
        if (!dayTypeMap[day]) dayTypeMap[day] = {};
        dayTypeMap[day][type] = (dayTypeMap[day][type] || 0) + 1;
      }
      const docsByDay: AnalyticsData['docsByDay'] = [];
      for (const [date, types] of Object.entries(dayTypeMap)) {
        for (const [type, count] of Object.entries(types)) {
          docsByDay.push({
            date: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            count,
            type,
          });
        }
      }

      // Docs by type
      const typeCounts: Record<string, number> = {};
      for (const d of docs) {
        const t = d.document_type || 'Outro';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      }
      const docsByType = Object.entries(typeCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Recent docs
      const recentDocs = docs.slice(0, 10).map(d => ({
        id: d.id,
        title: d.title,
        document_type: d.document_type,
        created_at: d.created_at,
        chars: d.output_data?.length || 0,
      }));

      setData({
        totalDocs,
        totalDocsPrev,
        totalFavorites,
        avgGenerationChars,
        avgGenerationCharsPrev,
        docsByDay,
        docsByType,
        recentDocs,
      });
    } catch (e) {
      console.error('Error fetching document analytics:', e);
    } finally {
      setLoading(false);
    }
  }, [user, rangeStart.getTime(), rangeEnd.getTime()]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { data, loading, refetch: fetchAnalytics };
}
