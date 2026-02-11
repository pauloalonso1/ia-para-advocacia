import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAILogs, useAILogStats, type AILog, type AILogFilters } from '@/hooks/useAILogs';
import { Activity, AlertTriangle, CheckCircle2, Cpu, Download, RefreshCw, Zap, XCircle, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-green-500/10 text-green-500 border-green-500/20',
  error: 'bg-destructive/10 text-destructive border-destructive/20',
  rate_limited: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  timeout: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  success: 'Sucesso',
  error: 'Erro',
  rate_limited: 'Rate Limit',
  timeout: 'Timeout',
};

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', '#f59e0b', '#8b5cf6', '#06b6d4'];

const MonitoringView = () => {
  const [filters, setFilters] = useState<AILogFilters>({});
  const [period, setPeriod] = useState(7);
  const { logs, isLoading, refetch } = useAILogs(filters);
  const { data: stats } = useAILogStats(period);

  const handleExport = () => {
    if (!logs.length) return;
    const headers = ['Data', 'Tipo', 'Fonte', 'Agente', 'Modelo', 'Status', 'Tempo (ms)', 'Tokens In', 'Tokens Out', 'Erro'];
    const rows = logs.map(l => [
      format(new Date(l.created_at), 'dd/MM/yyyy HH:mm:ss'),
      l.event_type,
      l.source,
      l.agent_name || '-',
      l.model || '-',
      l.status,
      l.response_time_ms || '-',
      l.tokens_input || '-',
      l.tokens_output || '-',
      l.error_message || '-',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitoramento IA</h1>
          <p className="text-muted-foreground text-sm">Acompanhe o uso e performance dos agentes em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(period)} onValueChange={v => setPeriod(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Hoje</SelectItem>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard icon={<Activity className="h-4 w-4" />} label="Total Chamadas" value={stats?.totalCalls || 0} />
        <MetricCard icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} label="Sucessos" value={stats?.successes || 0} />
        <MetricCard icon={<XCircle className="h-4 w-4 text-destructive" />} label="Erros" value={stats?.errors || 0} />
        <MetricCard icon={<Zap className="h-4 w-4 text-yellow-500" />} label="Rate Limits" value={stats?.rateLimits || 0} />
        <MetricCard icon={<Timer className="h-4 w-4 text-orange-500" />} label="Tempo Médio" value={`${stats?.avgResponseTime || 0}ms`} />
        <MetricCard icon={<Cpu className="h-4 w-4 text-primary" />} label="Tokens" value={`${((stats?.totalTokensIn || 0) + (stats?.totalTokensOut || 0)).toLocaleString()}`} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="errors">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Usage over time */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Chamadas por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats?.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => format(new Date(v + 'T12:00:00'), 'dd/MM')} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                      labelFormatter={v => format(new Date(v + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR })}
                    />
                    <Bar dataKey="success" name="Sucesso" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="error" name="Erro" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* By source */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Por Fonte</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={stats?.bySource || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                      {(stats?.bySource || []).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* By model */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Por Modelo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats?.byModel || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                    <Bar dataKey="value" name="Chamadas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* By agent */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Por Agente</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[220px]">
                  <div className="space-y-2">
                    {(stats?.byAgent || []).sort((a, b) => b.count - a.count).map(agent => (
                      <div key={agent.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <span className="text-sm font-medium truncate flex-1">{agent.name}</span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{agent.count} chamadas</span>
                          {agent.errors > 0 && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              {agent.errors} erros
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!stats?.byAgent || stats.byAgent.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-3">
                <Select value={filters.status || 'all'} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="error">Erro</SelectItem>
                    <SelectItem value="rate_limited">Rate Limit</SelectItem>
                    <SelectItem value="timeout">Timeout</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.source || 'all'} onValueChange={v => setFilters(f => ({ ...f, source: v }))}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Fonte" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Fontes</SelectItem>
                    <SelectItem value="whatsapp-webhook">WhatsApp</SelectItem>
                    <SelectItem value="legal-documents">Documentos</SelectItem>
                    <SelectItem value="generate-summary">Resumos</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  className="w-40"
                  value={filters.dateFrom || ''}
                  onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                  placeholder="De"
                />
                <Input
                  type="date"
                  className="w-40"
                  value={filters.dateTo || ''}
                  onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                  placeholder="Até"
                />
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      <th className="p-3">Data</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Fonte</th>
                      <th className="p-3 hidden md:table-cell">Agente</th>
                      <th className="p-3 hidden lg:table-cell">Modelo</th>
                      <th className="p-3 hidden md:table-cell">Tempo</th>
                      <th className="p-3 hidden lg:table-cell">Tokens</th>
                      <th className="p-3">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>
                    ) : logs.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum log encontrado</td></tr>
                    ) : logs.map(log => (
                      <LogRow key={log.id} log={log} />
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Erros Recentes ({stats?.recentErrors?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {(stats?.recentErrors || []).map(log => (
                    <div key={log.id} className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge className={STATUS_COLORS[log.status]}>{STATUS_LABELS[log.status] || log.status}</Badge>
                          <span className="text-xs text-muted-foreground">{log.source}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd/MM HH:mm:ss")}
                        </span>
                      </div>
                      {log.agent_name && <p className="text-xs text-muted-foreground">Agente: {log.agent_name}</p>}
                      {log.error_message && (
                        <p className="text-xs mt-1 font-mono bg-muted/30 p-2 rounded break-all">{log.error_message}</p>
                      )}
                    </div>
                  ))}
                  {(!stats?.recentErrors || stats.recentErrors.length === 0) && (
                    <div className="text-center py-12">
                      <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum erro no período</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function LogRow({ log }: { log: AILog }) {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors">
      <td className="p-3 text-xs whitespace-nowrap">
        {format(new Date(log.created_at), 'dd/MM HH:mm:ss')}
      </td>
      <td className="p-3">
        <Badge className={`text-[10px] ${STATUS_COLORS[log.status] || ''}`}>
          {STATUS_LABELS[log.status] || log.status}
        </Badge>
      </td>
      <td className="p-3 text-xs">{log.source}</td>
      <td className="p-3 text-xs hidden md:table-cell truncate max-w-[120px]">{log.agent_name || '-'}</td>
      <td className="p-3 text-xs hidden lg:table-cell truncate max-w-[100px]">{log.model || '-'}</td>
      <td className="p-3 text-xs hidden md:table-cell">{log.response_time_ms ? `${log.response_time_ms}ms` : '-'}</td>
      <td className="p-3 text-xs hidden lg:table-cell">
        {log.tokens_input || log.tokens_output
          ? `${log.tokens_input || 0}/${log.tokens_output || 0}`
          : '-'}
      </td>
      <td className="p-3 text-xs text-muted-foreground truncate max-w-[150px]">
        {log.error_message || (log.contact_phone ? `📱 ${log.contact_phone.slice(-4)}` : '-')}
      </td>
    </tr>
  );
}

export default MonitoringView;
