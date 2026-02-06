import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FunnelStep {
  name: string;
  count: number;
  rate: number;
  color: string;
}

interface ConversionFunnelProps {
  steps?: FunnelStep[];
}

const defaultSteps: FunnelStep[] = [
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

const ConversionFunnel = ({ steps = defaultSteps }: ConversionFunnelProps) => {
  const maxCount = Math.max(...steps.map(s => s.count));
  
  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Funil de Conversão</h3>
      </div>
      
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={step.name} className="flex items-center gap-3">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0",
              step.color
            )}>
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground truncate">{step.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-foreground">{step.count}</span>
                  <span className="text-xs text-muted-foreground">contatos</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Taxa de conversão: {step.rate}%</span>
              </div>
              <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all", step.color)}
                  style={{ width: `${(step.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversionFunnel;
