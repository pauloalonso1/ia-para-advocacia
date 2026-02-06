import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  highlight?: boolean;
}

const MetricCard = ({ label, value, change, changeLabel, highlight }: MetricCardProps) => {
  const isPositive = change !== undefined && change >= 0;
  
  return (
    <div className={cn(
      "bg-card border border-border rounded-lg p-4",
      highlight && "border-accent"
    )}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-0.5 text-xs",
            isPositive ? "text-chart-2" : "text-destructive"
          )}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{isPositive ? '+' : ''}{change}%</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {changeLabel && (
        <p className="text-xs text-muted-foreground mt-0.5">{changeLabel}</p>
      )}
    </div>
  );
};

interface MetricCardsProps {
  total: number;
  totalChange?: number;
  average: number;
  peak: number;
  peakDate?: string;
}

const MetricCards = ({ total, totalChange, average, peak, peakDate }: MetricCardsProps) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      <MetricCard 
        label="TOTAL" 
        value={total} 
        change={totalChange}
        changeLabel={totalChange !== undefined ? "vs ant." : undefined}
      />
      <MetricCard 
        label="MÉDIA" 
        value={average.toFixed(1)} 
        changeLabel="Contatos/dia"
      />
      <MetricCard 
        label="⬆ PICO" 
        value={peak} 
        changeLabel={peakDate}
        highlight
      />
    </div>
  );
};

export default MetricCards;
