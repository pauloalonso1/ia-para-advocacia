import { Agent } from '@/hooks/useAgents';
import { Card, CardContent } from '@/components/ui/card';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Bot, 
  Settings, 
  Trash2, 
  MoreVertical,
  Zap,
  MessageSquare,
  FileText,
  Star
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onSetDefault?: (id: string) => void;
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  'Imobiliário': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'Família': { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  'Trabalhista': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  'Criminal': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  'Empresarial': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  'Tributário': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'Consumidor': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  'Outro': { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
};

const AgentCard = ({ agent, onEdit, onDelete, onToggleActive, onSetDefault }: AgentCardProps) => {
  const categoryStyle = categoryColors[agent.category || 'Outro'] || categoryColors['Outro'];

  return (
    <div className="relative list-none">
      <div className={cn(
        "relative rounded-[1.25rem] border-[0.75px] border-border p-2",
        agent.is_default && "ring-2 ring-primary/30"
      )}>
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={3}
        />
        <Card className={cn(
          "group relative bg-card border-border rounded-xl",
          "transition-all duration-300",
        )}>
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1 rounded-t-lg",
        agent.is_active 
          ? "bg-gradient-to-r from-primary to-primary/70" 
          : "bg-muted"
      )} />

      <CardContent className="p-5 pt-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br from-primary/20 to-primary/10",
              "border border-primary/20"
            )}>
              <Bot className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg leading-tight">{agent.name}</h3>
              {agent.category && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "mt-1.5 text-xs font-medium border",
                    categoryStyle.bg,
                    categoryStyle.text,
                    categoryStyle.border
                  )}
                >
                  {agent.category}
                </Badge>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem 
                onClick={() => onEdit(agent)}
                className="text-foreground focus:bg-accent focus:text-foreground"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurar
              </DropdownMenuItem>
              {onSetDefault && !agent.is_default && (
                <DropdownMenuItem 
                  onClick={() => onSetDefault(agent.id)}
                  className="text-foreground focus:bg-accent focus:text-foreground"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Definir como Padrão
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                onClick={() => onDelete(agent.id)}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[40px]">
          {agent.description || 'Sem descrição configurada para este agente.'}
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg">
            <FileText className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">Regras</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg">
            <Zap className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">Roteiro</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg">
            <MessageSquare className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">FAQs</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Switch
              checked={agent.is_active}
              onCheckedChange={(checked) => onToggleActive(agent.id, checked)}
              className="data-[state=checked]:bg-primary"
            />
            <span className={cn(
              "text-sm font-medium",
              agent.is_active ? "text-primary" : "text-muted-foreground"
            )}>
              {agent.is_active ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(agent)}
            className="text-primary hover:text-primary/80 hover:bg-primary/10"
          >
            <Settings className="w-4 h-4 mr-1.5" />
            Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
      </div>
    </div>
  );
};

export default AgentCard;
