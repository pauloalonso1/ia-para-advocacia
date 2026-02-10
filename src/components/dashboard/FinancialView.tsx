import { useState } from 'react';
import EmptyState from './EmptyState';
import { useFinancial } from '@/hooks/useFinancial';
import { useCases } from '@/hooks/useCases';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Trash2, Download, AlertCircle, Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import AddTransactionModal from './financial/AddTransactionModal';

const CHART_COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(142 71% 45%)',
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const FinancialView = () => {
  const {
    transactions, loading, metrics, monthlyData, categoryBreakdown,
    addTransaction, deleteTransaction, updateTransaction,
    REVENUE_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS,
  } = useFinancial();

  const { cases } = useCases();
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'revenue' | 'expense'>('all');

  const handleExportCSV = () => {
    const filtered = filteredTransactions;
    const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Status', 'Método'];
    const rows = filtered.map(t => [
      format(new Date(t.date), 'dd/MM/yyyy'),
      t.type === 'revenue' ? 'Receita' : 'Despesa',
      t.category, t.description, Number(t.amount).toFixed(2),
      t.is_paid ? 'Pago' : 'Pendente', t.payment_method || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeiro_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTransactions = transactions.filter(t =>
    filterType === 'all' ? true : t.type === filterType
  );

  const pieData = Object.entries(
    filterType === 'expense' ? categoryBreakdown.expenseByCategory : categoryBreakdown.revenueByCategory
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Financeiro
          </h1>
          <p className="text-sm text-muted-foreground">Controle financeiro do escritório</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-1.5" />
            Exportar CSV
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nova transação
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Receita do mês" value={formatCurrency(metrics.totalRevenue)} change={metrics.revenueChange} icon={<TrendingUp className="w-4 h-4" />} positive />
        <MetricCard title="Despesas do mês" value={formatCurrency(metrics.totalExpenses)} change={metrics.expenseChange} icon={<TrendingDown className="w-4 h-4" />} positive={false} />
        <MetricCard title="Lucro líquido" value={formatCurrency(metrics.profit)} icon={<DollarSign className="w-4 h-4" />} positive={metrics.profit >= 0} />
        <MetricCard title="A receber" value={formatCurrency(metrics.pending)} subtitle={metrics.overdue > 0 ? `${formatCurrency(metrics.overdue)} vencido` : undefined} icon={<AlertCircle className="w-4 h-4" />} positive />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas vs Despesas (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="revenue" name="Receitas" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Por categoria (mês atual)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Sem dados para o mês atual
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Transações
            </CardTitle>
            <div className="flex gap-1">
              {(['all', 'revenue', 'expense'] as const).map(t => (
                <Button key={t} variant={filterType === t ? 'default' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setFilterType(t)}>
                  {t === 'all' ? 'Todas' : t === 'revenue' ? 'Receitas' : 'Despesas'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs">Descrição</TableHead>
                <TableHead className="text-xs">Categoria</TableHead>
                <TableHead className="text-xs">Caso</TableHead>
                <TableHead className="text-xs text-right">Valor</TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
                <TableHead className="text-xs text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      icon={Receipt}
                      title="Nenhuma transação registrada"
                      description="Registre receitas e despesas para acompanhar a saúde financeira do seu escritório com gráficos e métricas."
                      actionLabel="Registrar Primeira Transação"
                      actionIcon={Plus}
                      onAction={() => setShowAddModal(true)}
                      nextSteps={[
                        { icon: TrendingUp, label: 'Registrar receita', description: 'Honorários e contratos' },
                        { icon: TrendingDown, label: 'Registrar despesa', description: 'Custos operacionais' },
                        { icon: Download, label: 'Exportar CSV', description: 'Relatórios financeiros' },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map(tx => {
                  const linkedCase = cases.find(c => c.id === tx.case_id);
                  return (
                    <TableRow key={tx.id} className="border-border">
                      <TableCell className="text-xs">{format(new Date(tx.date), 'dd/MM/yy', { locale: ptBR })}</TableCell>
                      <TableCell className="text-sm font-medium max-w-[200px] truncate">{tx.description}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{tx.category}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">{linkedCase?.client_name || '—'}</TableCell>
                      <TableCell className={cn("text-sm font-semibold text-right", tx.type === 'revenue' ? 'text-green-500' : 'text-destructive')}>
                        {tx.type === 'revenue' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => updateTransaction(tx.id, { is_paid: !tx.is_paid })}>
                          {tx.is_paid
                            ? <Badge className="bg-green-600/20 text-green-500 text-xs border-0">Pago</Badge>
                            : <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">Pendente</Badge>}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteTransaction(tx.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSubmit={addTransaction}
        cases={cases}
        revenueCategories={REVENUE_CATEGORIES}
        expenseCategories={EXPENSE_CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
      />
    </div>
  );
};

/* ─── Metric Card ─── */
const MetricCard = ({
  title, value, change, subtitle, icon, positive,
}: {
  title: string; value: string; change?: number; subtitle?: string; icon: React.ReactNode; positive: boolean;
}) => (
  <Card className="bg-card border-border">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{title}</span>
        <div className={cn("p-1.5 rounded-lg", positive ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive")}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {change !== undefined && (
        <p className={cn("text-xs mt-1", change >= 0 ? "text-green-500" : "text-destructive")}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% vs mês anterior
        </p>
      )}
      {subtitle && <p className="text-xs mt-1 text-amber-500">{subtitle}</p>}
    </CardContent>
  </Card>
);

export default FinancialView;
