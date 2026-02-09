import { Clock, Zap, Timer, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import InfoTooltip from '../InfoTooltip';

interface ResponseTimeCardProps {
  avgMinutes: number;
  within5Pct: number;
  within30Pct: number;
  after30Pct: number;
  avgDaysToConversion: number;
  overallConversionRate: number;
}

const ResponseTimeCard = ({
  avgMinutes,
  within5Pct,
  within30Pct,
  after30Pct,
  avgDaysToConversion,
  overallConversionRate,
}: ResponseTimeCardProps) => {
  const formatTime = (minutes: number) => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getSpeedColor = (minutes: number) => {
    if (minutes <= 5) return 'text-green-500';
    if (minutes <= 30) return 'text-amber-500';
    return 'text-destructive';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Tempo de Resposta & Conversão</h3>
        <InfoTooltip content="Métricas de velocidade de resposta e taxa de conversão dos seus leads no período selecionado." />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Avg response time */}
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <Timer className={cn("w-4 h-4 mx-auto mb-1", getSpeedColor(avgMinutes))} />
          <p className={cn("text-lg font-bold", getSpeedColor(avgMinutes))}>
            {formatTime(avgMinutes)}
          </p>
          <p className="text-[10px] text-muted-foreground">Tempo médio</p>
        </div>

        {/* Conversion rate */}
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <Zap className="w-4 h-4 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold text-primary">{overallConversionRate}%</p>
          <p className="text-[10px] text-muted-foreground">Taxa conversão</p>
        </div>

        {/* Avg days to conversion */}
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <AlertCircle className="w-4 h-4 mx-auto mb-1 text-amber-500" />
          <p className="text-lg font-bold text-foreground">
            {avgDaysToConversion > 0 ? `${avgDaysToConversion}d` : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground">Dias p/ converter</p>
        </div>
      </div>

      {/* Response time distribution */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Distribuição de resposta</p>
        <div className="flex h-2 rounded-full overflow-hidden bg-muted">
          {within5Pct > 0 && (
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${within5Pct}%` }}
              title={`≤ 5min: ${within5Pct}%`}
            />
          )}
          {within30Pct > 0 && (
            <div
              className="bg-amber-500 transition-all"
              style={{ width: `${within30Pct}%` }}
              title={`5-30min: ${within30Pct}%`}
            />
          )}
          {after30Pct > 0 && (
            <div
              className="bg-destructive transition-all"
              style={{ width: `${after30Pct}%` }}
              title={`> 30min: ${after30Pct}%`}
            />
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            ≤ 5min ({within5Pct}%)
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            5-30min ({within30Pct}%)
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
            {'>'} 30min ({after30Pct}%)
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResponseTimeCard;
