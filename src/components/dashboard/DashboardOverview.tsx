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
  const [dateRange] = useState(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fmt(thirtyDaysAgo)} - ${fmt(now)}`;
  });

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
        {/* Left Column */}
        <div className="col-span-5 space-y-6">
          <MetricCards 
            total={metrics.totalLeads}
            totalChange={metrics.contactsChange}
            average={metrics.averagePerDay}
            peak={metrics.peakDay.count}
            peakDate={metrics.peakDay.date}
          />
          <ConversationsChart data={metrics.conversationsByDay} />
          <BrazilMap total={metrics.totalContacts} />
        </div>
        
        {/* Center Column */}
        <div className="col-span-4">
          <ConversionFunnel steps={metrics.funnelSteps.length > 0 ? metrics.funnelSteps : undefined} />
        </div>
        
        {/* Right Column */}
        <div className="col-span-3 space-y-6">
          <UpcomingMeetings />
          <TagsDonutChart data={metrics.tagsData.length > 0 ? metrics.tagsData : undefined} />
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
