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
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5 space-y-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-64" />
            <Skeleton className="h-80" />
          </div>
          <div className="col-span-4">
            <Skeleton className="h-[600px]" />
          </div>
          <div className="col-span-3 space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  // Funnel steps based on reference image
  const funnelSteps = [
    { name: 'Recepção', count: 51, rate: 45.9, color: 'bg-blue-500' },
    { name: 'Qualificação do lead', count: 9, rate: 8.1, color: 'bg-cyan-500' },
    { name: 'Análise de viabilidade', count: 9, rate: 8.1, color: 'bg-teal-500' },
    { name: 'Oferta do contrato', count: 10, rate: 9.0, color: 'bg-green-500' },
    { name: 'Contrato Enviado', count: 4, rate: 3.6, color: 'bg-lime-500' },
    { name: 'Agendamento feito', count: 5, rate: 4.5, color: 'bg-yellow-500' },
    { name: 'Desqualificado', count: 5, rate: 4.5, color: 'bg-orange-500' },
    { name: 'Não tem interesse', count: 9, rate: 8.1, color: 'bg-red-500' },
    { name: 'Reunião Feita', count: 1, rate: 0.9, color: 'bg-purple-500' },
  ];

  // Tags data from reference image
  const tagsData = [
    { name: 'Rescisão Indireta', value: 14, color: '#818cf8' },
    { name: 'Reconhecimento de vínculo', value: 13, color: '#38bdf8' },
    { name: 'Aguardando documentação', value: 4, color: '#fb923c' },
    { name: 'Novo Lead', value: 3, color: '#4ade80' },
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
        <div className="flex items-center gap-3">
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

      {/* Main 3-column layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Metrics + Chart + Map */}
        <div className="col-span-5 space-y-6">
          <MetricCards 
            total={111}
            totalChange={56}
            average={3.8}
            peak={27}
            peakDate="18/11"
          />
          <ConversationsChart />
          <BrazilMap total={89} />
        </div>
        
        {/* Center Column: Conversion Funnel */}
        <div className="col-span-4">
          <ConversionFunnel steps={funnelSteps} />
        </div>
        
        {/* Right Column: Meetings + Tags */}
        <div className="col-span-3 space-y-6">
          <UpcomingMeetings />
          <TagsDonutChart data={tagsData} />
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
