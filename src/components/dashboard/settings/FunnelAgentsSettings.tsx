import { useAgents } from '@/hooks/useAgents';
import { useFunnelAssignments } from '@/hooks/useFunnelAssignments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, GitBranch, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

const stageColors: Record<string, string> = {
  'Novo Contato': 'bg-blue-500',
  'Em Atendimento': 'bg-amber-500',
  'Qualificado': 'bg-green-500',
  'Consulta Marcada': 'bg-cyan-500',
  'Não Qualificado': 'bg-destructive',
  'Convertido': 'bg-purple-500',
  'Arquivado': 'bg-muted-foreground',
};

const FunnelAgentsSettings = () => {
  const { agents } = useAgents();
  const { stages, getAgentForStage, saveAssignment, loading, saving } = useFunnelAssignments();

  const activeAgents = agents.filter(a => a.is_active);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          Funil Multi-Agente
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Configure qual agente de IA será ativado automaticamente em cada etapa do funil.
          Ao mudar a etapa de um lead, o agente correspondente será atribuído automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeAgents.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum agente ativo encontrado. Crie um agente primeiro.
          </p>
        )}

        {stages.map((stage) => {
          const currentAgentId = getAgentForStage(stage);
          return (
            <div key={stage} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 min-w-[160px]">
                <div className={cn("w-3 h-3 rounded-full", stageColors[stage] || 'bg-muted-foreground')} />
                <span className="text-sm font-medium text-foreground">{stage}</span>
              </div>
              <div className="flex-1">
                <Select
                  value={currentAgentId || 'none'}
                  onValueChange={(v) => saveAssignment(stage, v === 'none' ? null : v)}
                  disabled={saving || activeAgents.length === 0}
                >
                  <SelectTrigger className="h-9 bg-background border-border text-sm">
                    <SelectValue placeholder="Sem agente automático" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="none">
                      <span className="text-muted-foreground">Sem agente automático</span>
                    </SelectItem>
                    {activeAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <Bot className="w-3.5 h-3.5 text-primary" />
                          {agent.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}

        <div className="mt-4 p-3 rounded-lg border border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            <strong>Como funciona:</strong> Quando o status de um lead muda (manualmente ou pela IA), 
            o agente configurado para a nova etapa será automaticamente ativado. 
            Todos os agentes compartilham a mesma memória da conversa.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FunnelAgentsSettings;
