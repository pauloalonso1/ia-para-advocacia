import { Bot, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { AgentPerformance } from '@/hooks/useAdvancedMetrics';

const COLORS = [
  'hsl(205, 88%, 53%)',
  'hsl(160, 100%, 36%)',
  'hsl(280, 60%, 55%)',
  'hsl(43, 93%, 56%)',
  'hsl(356, 91%, 54%)',
  'hsl(180, 60%, 45%)',
];

interface AgentPerformanceChartProps {
  data: AgentPerformance[];
}

const AgentPerformanceChart = ({ data }: AgentPerformanceChartProps) => {
  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 h-full">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Performance por Agente</h3>
        </div>
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Nenhum dado de agente disponível
        </div>
      </div>
    );
  }

  const chartData = data.slice(0, 6).map((a) => ({
    name: a.agentName.length > 12 ? a.agentName.slice(0, 12) + '…' : a.agentName,
    fullName: a.agentName,
    leads: a.totalLeads,
    converted: a.convertedLeads,
    rate: a.conversionRate,
  }));

  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Performance por Agente</h3>
        </div>
        {data.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Trophy className="w-3 h-3 text-amber-500" />
            {data[0]?.agentName}
          </div>
        )}
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'hsl(var(--foreground))',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number, name: string) => {
                if (name === 'leads') return [value, 'Leads'];
                if (name === 'converted') return [value, 'Convertidos'];
                return [value, name];
              }}
              labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
            />
            <Bar dataKey="leads" radius={[4, 4, 0, 0]} name="leads">
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.3} />
              ))}
            </Bar>
            <Bar dataKey="converted" radius={[4, 4, 0, 0]} name="converted">
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Agent stats table */}
      <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
        {data.map((agent, i) => (
          <div key={agent.agentId} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-muted-foreground truncate max-w-[120px]">{agent.agentName}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-foreground font-medium">{agent.totalLeads} leads</span>
              <span className="text-primary font-semibold">{agent.conversionRate}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentPerformanceChart;
