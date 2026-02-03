import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { Bot, MessageSquare, TrendingUp, ArrowUpRight, ArrowDownRight, Users, UserCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const DashboardOverview = () => {
  const { metrics, loading } = useDashboardMetrics();

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      label: 'Agentes Ativos',
      value: metrics.activeAgents,
      change: metrics.agentsChange,
      icon: Bot,
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
    },
    {
      label: 'Total de Leads',
      value: metrics.totalLeads,
      change: metrics.contactsChange,
      icon: Users,
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Mensagens Enviadas',
      value: metrics.messagesSent,
      change: metrics.messagesChange,
      icon: MessageSquare,
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-500',
    },
    {
      label: 'Taxa de Conversão',
      value: `${metrics.conversionRate}%`,
      change: metrics.conversionChange,
      icon: TrendingUp,
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-500',
      isPercentage: true,
    },
  ];

  const funnelStats = [
    { label: 'Leads Qualificados', value: metrics.qualifiedLeads, color: 'text-green-500' },
    { label: 'Convertidos', value: metrics.convertedLeads, color: 'text-purple-500' },
    { label: 'Mensagens Recebidas', value: metrics.messagesReceived, color: 'text-blue-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu escritório</p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", stat.iconBg)}>
                <stat.icon className={cn("w-6 h-6", stat.iconColor)} />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm">
              {stat.change >= 0 ? (
                <>
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">+{stat.change}{stat.isPercentage ? 'pp' : '%'}</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="w-4 h-4 text-destructive" />
                  <span className="text-destructive">{stat.change}{stat.isPercentage ? 'pp' : '%'}</span>
                </>
              )}
              <span className="text-muted-foreground">vs mês anterior</span>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {funnelStats.map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">{stat.label}</p>
              <UserCheck className={cn("w-5 h-5", stat.color)} />
            </div>
            <p className={cn("text-xl font-bold mt-2", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Welcome/Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">🚀 Dicas Rápidas</h2>
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li>• Configure as <strong>Regras do Agente</strong> para personalizar as respostas</li>
            <li>• Adicione <strong>FAQs</strong> para respostas automáticas a perguntas frequentes</li>
            <li>• Use o <strong>CRM Kanban</strong> para gerenciar seus leads visualmente</li>
            <li>• Ative <strong>Notificações</strong> para ser alertado sobre novos leads</li>
          </ul>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">📊 Funil de Vendas</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Novos Leads</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-muted rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${metrics.totalLeads > 0 ? 100 : 0}%` }}
                  />
                </div>
                <span className="text-foreground font-medium w-8 text-right">{metrics.totalLeads}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Qualificados</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-muted rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${metrics.totalLeads > 0 ? (metrics.qualifiedLeads / metrics.totalLeads) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-foreground font-medium w-8 text-right">{metrics.qualifiedLeads}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Convertidos</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-muted rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: `${metrics.totalLeads > 0 ? (metrics.convertedLeads / metrics.totalLeads) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-foreground font-medium w-8 text-right">{metrics.convertedLeads}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
