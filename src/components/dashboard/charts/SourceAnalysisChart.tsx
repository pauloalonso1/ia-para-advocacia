import { Share2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { SourceMetric } from '@/hooks/useAdvancedMetrics';

const COLORS = [
  'hsl(205, 88%, 53%)',
  'hsl(160, 100%, 36%)',
  'hsl(43, 93%, 56%)',
  'hsl(280, 60%, 55%)',
  'hsl(356, 91%, 54%)',
  'hsl(180, 60%, 45%)',
  'hsl(30, 90%, 55%)',
];

interface SourceAnalysisChartProps {
  data: SourceMetric[];
}

const SourceAnalysisChart = ({ data }: SourceAnalysisChartProps) => {
  const total = data.reduce((acc, d) => acc + d.totalLeads, 0);

  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 h-full">
        <div className="flex items-center gap-2 mb-4">
          <Share2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Leads por Origem</h3>
        </div>
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Nenhum dado de origem disponível
        </div>
      </div>
    );
  }

  const chartData = data.slice(0, 7).map((d, i) => ({
    ...d,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Leads por Origem</h3>
      </div>

      <div className="flex items-start gap-4">
        <div className="relative w-36 h-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={60}
                paddingAngle={2}
                dataKey="totalLeads"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value} leads`, 'Leads']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-foreground">{total}</span>
            <span className="text-[10px] text-muted-foreground">total</span>
          </div>
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          {chartData.map((item) => (
            <div key={item.source} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground truncate">{item.source}</span>
                </div>
                <span className="text-xs font-medium text-foreground">{item.totalLeads}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(item.totalLeads / total) * 100}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
                <span className="text-[10px] text-primary font-semibold shrink-0">
                  {item.conversionRate}% conv.
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SourceAnalysisChart;
