import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import InfoTooltip from '../InfoTooltip';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  highlight?: boolean;
  tooltip?: string;
}

const MetricCard = ({ label, value, change, changeLabel, highlight, tooltip }: MetricCardProps) => {
  const isPositive = change !== undefined && change >= 0;
  
  return (
    <div className={cn(
      "bg-card border border-border rounded-lg p-4 overflow-hidden card-hover",
      highlight && "border-accent"
    )}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          {label}
          {tooltip && <InfoTooltip content={tooltip} />}
        </span>
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
  const cards = [
    { label: "TOTAL", value: total, change: totalChange, changeLabel: totalChange !== undefined ? "vs ant." : undefined, tooltip: "Total de leads/contatos no período selecionado" },
    { label: "MÉDIA", value: average.toFixed(1), changeLabel: "Contatos/dia", tooltip: "Média diária de novos contatos no período" },
    { label: "⬆ PICO", value: peak, changeLabel: peakDate, highlight: true, tooltip: "Dia com maior número de novos contatos" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.4, delay: i * 0.1, ease: 'easeOut' }}
        >
          <MetricCard {...card} />
        </motion.div>
      ))}
    </div>
  );
};

export default MetricCards;
