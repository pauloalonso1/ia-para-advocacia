import { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useAdvancedMetrics } from '@/hooks/useAdvancedMetrics';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import MetricCards from './charts/MetricCards';
import ConversationsChart from './charts/ConversationsChart';
import ConversionFunnel from './charts/ConversionFunnel';
import UpcomingMeetings from './charts/UpcomingMeetings';
import TagsDonutChart from './charts/TagsDonutChart';
import BrazilMap from './charts/BrazilMap';
import ResponseTimeCard from './charts/ResponseTimeCard';
import AgentPerformanceChart from './charts/AgentPerformanceChart';
import SourceAnalysisChart from './charts/SourceAnalysisChart';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

const DashboardOverview = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from, to };
  });

  const { metrics, loading } = useDashboardMetrics(dateRange?.from, dateRange?.to);
  const { metrics: advMetrics, loading: advLoading } = useAdvancedMetrics(dateRange?.from, dateRange?.to);
  const { isConnected, events, listEvents } = useGoogleCalendar();

  useEffect(() => {
    if (isConnected) {
      listEvents();
    }
  }, [isConnected]);

  const calendarMeetings = useMemo(() => {
    return events.map((evt) => {
      const startStr = evt.start?.dateTime || evt.start?.date || '';
      const endStr = evt.end?.dateTime || evt.end?.date || '';
      const startDate = new Date(startStr);
      const endDate = endStr ? new Date(endStr) : startDate;
      const time = evt.start?.dateTime
        ? `${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}`
        : 'Dia inteiro';
      const attendee = evt.attendees && evt.attendees.length > 0
        ? evt.attendees[0].email
        : '';
      return {
        id: evt.id,
        title: evt.summary || 'Sem título',
        date: startDate,
        time,
        attendee,
      };
    });
  }, [events]);

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "dd MMM yyyy", { locale: ptBR })} - ${format(dateRange.to, "dd MMM yyyy", { locale: ptBR })}`
      : format(dateRange.from, "dd MMM yyyy", { locale: ptBR })
    : 'Selecionar período';

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
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("text-xs", !dateRange && "text-muted-foreground")}>
              <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
              {dateLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
              disabled={(date) => date > new Date()}
            />
          </PopoverContent>
        </Popover>
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
        <div className="col-span-3 flex flex-col gap-6">
          <UpcomingMeetings meetings={calendarMeetings} />
          <div className="flex-1 min-h-0">
            <TagsDonutChart data={metrics.tagsData.length > 0 ? metrics.tagsData : undefined} />
          </div>
        </div>
      </div>

      {/* Advanced Analytics Row */}
      {!advLoading && (
        <div className="grid grid-cols-12 gap-6">
          {/* Response Time & Conversion */}
          <div className="col-span-4">
            <ResponseTimeCard
              avgMinutes={advMetrics.avgResponseTimeMinutes}
              within5Pct={advMetrics.respondedWithin5Min}
              within30Pct={advMetrics.respondedWithin30Min}
              after30Pct={advMetrics.respondedAfter30Min}
              avgDaysToConversion={advMetrics.avgTimeToConversion}
              overallConversionRate={advMetrics.overallConversionRate}
            />
          </div>

          {/* Agent Performance */}
          <div className="col-span-5">
            <AgentPerformanceChart data={advMetrics.agentPerformance} />
          </div>

          {/* Source Analysis */}
          <div className="col-span-3">
            <SourceAnalysisChart data={advMetrics.sourceMetrics} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;
