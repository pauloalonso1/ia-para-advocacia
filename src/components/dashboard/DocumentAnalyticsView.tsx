import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Star, TrendingUp, ArrowUpRight, ArrowDownRight, BarChart3, Clock } from 'lucide-react';
import { useDocumentAnalytics, PeriodFilter } from '@/hooks/useDocumentAnalytics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import InfoTooltip from './InfoTooltip';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from 'recharts';

const COLORS = [
  'hsl(205, 88%, 53%)',
  'hsl(160, 100%, 36%)',
  'hsl(43, 93%, 56%)',
  'hsl(280, 60%, 55%)',
  'hsl(356, 91%, 54%)',
];

const TYPE_LABELS: Record<string, string> = {
  peticao: 'Petição',
  contrato: 'Contrato',
  parecer: 'Parecer',
  analise: 'Análise',
};

const KPICard = ({
  icon: Icon,
  label,
  value,
  change,
  sub,
  tooltip,
  delay,
}: {
  icon: any;
  label: string;
  value: string | number;
  change?: number;
  sub?: string;
  tooltip?: string;
  delay: number;
}) => {
  const isPositive = change !== undefined && change >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    >
      <Card className="p-4 card-hover overflow-visible">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Icon className="w-3.5 h-3.5" />
            {label}
            {tooltip && <InfoTooltip content={tooltip} />}
          </span>
          {change !== undefined && (
            <div className={cn('flex items-center gap-0.5 text-xs', isPositive ? 'text-chart-2' : 'text-destructive')}>
              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{isPositive ? '+' : ''}{change}%</span>
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </Card>
    </motion.div>
  );
};

const ChartCard = ({ title, children, delay, className }: { title: string; children: React.ReactNode; delay: number; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    className={className}
  >
    <Card className="p-5 h-full">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </Card>
  </motion.div>
);

const DocumentAnalyticsView = () => {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const { data, loading } = useDocumentAnalytics(period);

  const docsChange = data.totalDocsPrev > 0
    ? Math.round(((data.totalDocs - data.totalDocsPrev) / data.totalDocsPrev) * 100)
    : data.totalDocs > 0 ? 100 : 0;

  const charsChange = data.avgGenerationCharsPrev > 0
    ? Math.round(((data.avgGenerationChars - data.avgGenerationCharsPrev) / data.avgGenerationCharsPrev) * 100)
    : data.avgGenerationChars > 0 ? 100 : 0;

  // Aggregate docsByDay for the line chart (collapse types into total per date)
  const lineData: Record<string, number> = {};
  for (const d of data.docsByDay) {
    lineData[d.date] = (lineData[d.date] || 0) + d.count;
  }
  const lineChartData = Object.entries(lineData).map(([date, count]) => ({ date, count }));

  const periodLabel = period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : period === '90d' ? '3 meses' : 'Personalizado';

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Analytics de Documentos
          </h1>
          <p className="text-sm text-muted-foreground">Métricas e insights sobre seus documentos jurídicos</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 3 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          icon={FileText}
          label="Documentos Gerados"
          value={data.totalDocs}
          change={docsChange}
          sub={`vs. ${periodLabel} anterior`}
          tooltip="Total de documentos gerados no período selecionado"
          delay={0}
        />
        <KPICard
          icon={BarChart3}
          label="Caracteres Médios"
          value={data.avgGenerationChars.toLocaleString('pt-BR')}
          change={charsChange}
          sub="por documento"
          tooltip="Média de caracteres por documento gerado"
          delay={0.1}
        />
        <KPICard
          icon={Star}
          label="Favoritados"
          value={data.totalFavorites}
          sub="documentos marcados"
          tooltip="Quantidade de documentos marcados como favoritos"
          delay={0.2}
        />
        <KPICard
          icon={TrendingUp}
          label="Tipos Distintos"
          value={data.docsByType.length}
          sub="categorias usadas"
          tooltip="Quantidade de tipos distintos de documentos"
          delay={0.3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Documentos por Dia" delay={0.4}>
          {lineChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="hsl(205, 88%, 53%)" strokeWidth={2} dot={{ r: 3 }} name="Documentos" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
              Nenhum documento no período
            </div>
          )}
        </ChartCard>

        <ChartCard title="Distribuição por Tipo" delay={0.5}>
          {data.docsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.docsByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${TYPE_LABELS[name] || name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.docsByType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value: number, name: string) => [value, TYPE_LABELS[name] || name]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </ChartCard>
      </div>

      {/* Bar chart */}
      <ChartCard title="Documentos por Tipo (Ranking)" delay={0.6}>
        {data.docsByType.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.docsByType.slice(0, 5)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => TYPE_LABELS[v] || v}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value: number, name: string) => [value, 'Documentos']}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {data.docsByType.slice(0, 5).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            Nenhum dado disponível
          </div>
        )}
      </ChartCard>

      {/* Recent Documents Table */}
      <motion.div
        initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.4, delay: 0.7, ease: 'easeOut' }}
      >
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Últimos Documentos</h3>
          {data.recentDocs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="pb-2 font-medium">Título</th>
                    <th className="pb-2 font-medium">Tipo</th>
                    <th className="pb-2 font-medium">Data</th>
                    <th className="pb-2 font-medium text-right">Caracteres</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentDocs.map((doc) => (
                    <tr key={doc.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 text-foreground truncate max-w-[250px]">
                        {doc.title || 'Sem título'}
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {TYPE_LABELS[doc.document_type] || doc.document_type}
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-2.5 text-muted-foreground text-right">
                        {doc.chars.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum documento gerado no período</p>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default DocumentAnalyticsView;
