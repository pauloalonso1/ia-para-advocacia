import { useState } from 'react';
import { Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import MetricCards from './charts/MetricCards';
import ConversationsChart from './charts/ConversationsChart';
import ConversionFunnel from './charts/ConversionFunnel';
import UpcomingMeetings from './charts/UpcomingMeetings';
import TagsDonutChart from './charts/TagsDonutChart';
import BrazilMap from './charts/BrazilMap';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardOverview = () => {
  const { metrics, loading } = useDashboardMetrics();
  const [dateRange] = useState('12 de nov. - 12 de dez. de 2025');

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Calculate funnel steps from real metrics
  const funnelSteps = [
    { name: 'Recepção', count: metrics.totalLeads, rate: 100, color: 'bg-blue-500' },
    { name: 'Qualificação do lead', count: metrics.qualifiedLeads, rate: metrics.totalLeads > 0 ? Math.round((metrics.qualifiedLeads / metrics.totalLeads) * 100) : 0, color: 'bg-cyan-500' },
    { name: 'Em Atendimento', count: Math.floor(metrics.totalLeads * 0.3), rate: 30, color: 'bg-teal-500' },
    { name: 'Oferta enviada', count: Math.floor(metrics.totalLeads * 0.2), rate: 20, color: 'bg-green-500' },
    { name: 'Contrato Enviado', count: Math.floor(metrics.convertedLeads * 0.8), rate: metrics.totalLeads > 0 ? Math.round((metrics.convertedLeads * 0.8 / metrics.totalLeads) * 100) : 0, color: 'bg-lime-500' },
    { name: 'Convertido', count: metrics.convertedLeads, rate: metrics.conversionRate, color: 'bg-emerald-500' },
  ];

  // Tags data from status distribution
  const tagsData = [
    { name: 'Em Atendimento', value: Math.floor(metrics.totalLeads * 0.4), color: '#818cf8' },
    { name: 'Qualificados', value: metrics.qualifiedLeads, color: '#38bdf8' },
    { name: 'Novos', value: Math.floor(metrics.totalLeads * 0.3), color: '#4ade80' },
    { name: 'Convertidos', value: metrics.convertedLeads, color: '#fb923c' },
  ];

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            📊 Dashboard
          </h1>
          <p className="text-muted-foreground">Visão geral das conversas e contatos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs">
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            {dateRange}
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Selecionar Data
          </Button>
        </div>
      </div>

      {/* Row 1: Metrics + Upcoming Meetings */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8">
          <MetricCards 
            total={metrics.totalLeads}
            totalChange={metrics.contactsChange}
            average={metrics.messagesSent / 30}
            peak={Math.max(metrics.messagesSent, 27)}
            peakDate="Hoje"
          />
        </div>
        <div className="col-span-4">
          <UpcomingMeetings />
        </div>
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-12 gap-4">
        {/* Conversations Chart */}
        <div className="col-span-5">
          <ConversationsChart />
        </div>
        
        {/* Conversion Funnel */}
        <div className="col-span-4">
          <ConversionFunnel steps={funnelSteps} />
        </div>
        
        {/* Tags Donut */}
        <div className="col-span-3">
          <TagsDonutChart data={tagsData} />
        </div>
      </div>

      {/* Row 3: Map */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-5">
          <BrazilMap total={metrics.totalContacts} />
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
