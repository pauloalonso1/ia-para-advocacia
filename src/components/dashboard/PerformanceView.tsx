import { RefreshCw, Trophy, Users, TrendingUp, Target, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTeamPerformance, TeamMemberPerformance } from '@/hooks/useTeamPerformance';
import { cn } from '@/lib/utils';

const PerformanceView = () => {
  const { metrics, loading, refetch } = useTeamPerformance();

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (metrics.members.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
          <Users className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Nenhum membro na equipe
        </h2>
        <p className="text-muted-foreground text-center max-w-md">
          Adicione membros à sua equipe na seção "Equipe" para visualizar as métricas de performance individual.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            Performance da Equipe
          </h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho individual de cada membro
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Leads"
          value={metrics.totalLeads}
          icon={Users}
          description="Leads atribuídos à equipe"
        />
        <MetricCard
          title="Convertidos"
          value={metrics.totalConverted}
          icon={Target}
          description="Leads que viraram clientes"
          variant="success"
        />
        <MetricCard
          title="Taxa Média"
          value={`${metrics.avgConversionRate}%`}
          icon={TrendingUp}
          description="Conversão média da equipe"
        />
        <MetricCard
          title="Top Performer"
          value={metrics.topPerformer?.name || '-'}
          icon={Award}
          description={metrics.topPerformer ? `${metrics.topPerformer.conversionRate}% conversão` : 'Nenhum'}
          variant="highlight"
        />
      </div>

      {/* Team Performance Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Ranking de Performance</CardTitle>
          <CardDescription>
            Comparativo de desempenho entre membros da equipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b border-border">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Membro</div>
              <div className="col-span-2 text-center">Leads</div>
              <div className="col-span-2 text-center">Convertidos</div>
              <div className="col-span-2 text-center">Taxa</div>
              <div className="col-span-2">Progresso</div>
            </div>

            {/* Rows */}
            {metrics.members
              .sort((a, b) => b.conversionRate - a.conversionRate || b.totalLeads - a.totalLeads)
              .map((member, index) => (
                <PerformanceRow
                  key={member.id}
                  member={member}
                  rank={index + 1}
                  isTopPerformer={index === 0}
                  teamAvgRate={metrics.avgConversionRate}
                />
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Individual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.members.map((member) => (
          <MemberPerformanceCard key={member.id} member={member} />
        ))}
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  variant?: 'default' | 'success' | 'highlight';
}

const MetricCard = ({ title, value, icon: Icon, description, variant = 'default' }: MetricCardProps) => {
  const bgVariants = {
    default: 'bg-muted',
    success: 'bg-green-500/20',
    highlight: 'bg-primary/20',
  };
  
  const iconVariants = {
    default: 'text-muted-foreground',
    success: 'text-green-500',
    highlight: 'text-primary',
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', bgVariants[variant])}>
            <Icon className={cn('w-5 h-5', iconVariants[variant])} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface PerformanceRowProps {
  member: TeamMemberPerformance;
  rank: number;
  isTopPerformer: boolean;
  teamAvgRate: number;
}

const PerformanceRow = ({ member, rank, isTopPerformer, teamAvgRate }: PerformanceRowProps) => {
  const isAboveAverage = member.conversionRate >= teamAvgRate;
  
  return (
    <div className={cn(
      "grid grid-cols-12 gap-4 px-4 py-3 rounded-lg items-center transition-colors",
      isTopPerformer ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
    )}>
      <div className="col-span-1">
        {rank <= 3 ? (
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
            rank === 1 && "bg-yellow-500 text-yellow-950",
            rank === 2 && "bg-gray-300 text-gray-800",
            rank === 3 && "bg-amber-600 text-amber-100"
          )}>
            {rank}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">{rank}</span>
        )}
      </div>
      <div className="col-span-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{member.name}</span>
          {isTopPerformer && (
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-xs">
              Top
            </Badge>
          )}
        </div>
        {member.specialty && (
          <span className="text-xs text-muted-foreground">{member.specialty}</span>
        )}
      </div>
      <div className="col-span-2 text-center">
        <span className="font-semibold text-foreground">{member.totalLeads}</span>
        <span className="text-xs text-muted-foreground ml-1">
          ({member.activeLeads} ativos)
        </span>
      </div>
      <div className="col-span-2 text-center">
        <span className="font-semibold text-green-500">{member.convertedLeads}</span>
      </div>
      <div className="col-span-2 text-center">
        <Badge
          variant="outline"
          className={cn(
            isAboveAverage 
              ? "bg-green-500/20 text-green-500 border-green-500/30" 
              : "bg-muted text-muted-foreground"
          )}
        >
          {member.conversionRate}%
        </Badge>
      </div>
      <div className="col-span-2">
        <Progress 
          value={member.conversionRate} 
          className="h-2"
        />
      </div>
    </div>
  );
};

interface MemberPerformanceCardProps {
  member: TeamMemberPerformance;
}

const MemberPerformanceCard = ({ member }: MemberPerformanceCardProps) => {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-foreground">{member.name}</CardTitle>
            {member.specialty && (
              <CardDescription>{member.specialty}</CardDescription>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{member.conversionRate}%</div>
            <div className="text-xs text-muted-foreground">conversão</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total de leads</span>
            <span className="font-medium text-foreground">{member.totalLeads}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Leads ativos</span>
            <Badge variant="outline" className="bg-blue-500/20 text-blue-500 border-blue-500/30">
              {member.activeLeads}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Convertidos</span>
            <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/30">
              {member.convertedLeads}
            </Badge>
          </div>
          <Progress value={member.conversionRate} className="h-2 mt-2" />
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceView;
