import { Agent } from '@/hooks/useAgents';
import { Card, CardContent } from '@/components/ui/card';
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
  'Outro': { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
};

const AgentCard = ({ agent, onEdit, onDelete, onToggleActive, onSetDefault }: AgentCardProps) => {
  const categoryStyle = categoryColors[agent.category || 'Outro'] || categoryColors['Outro'];

  return (
    <Card className={cn(
      "group relative bg-gradient-to-br from-slate-800/80 to-slate-800/40 border-slate-700/50",
      "hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5",
      "transition-all duration-300",
      agent.is_default && "ring-2 ring-emerald-500/30"
    )}>
      {/* Default indicator */}
      {agent.is_default && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
            <Star className="w-4 h-4 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Status indicator bar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1 rounded-t-lg",
        agent.is_active 
          ? "bg-gradient-to-r from-emerald-500 to-teal-500" 
          : "bg-slate-600"
      )} />

      <CardContent className="p-5 pt-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br from-emerald-500/20 to-teal-500/20",
              "border border-emerald-500/20"
            )}>
              <Bot className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg leading-tight">{agent.name}</h3>
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
                className="h-8 w-8 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem 
                onClick={() => onEdit(agent)}
                className="text-slate-200 focus:bg-slate-700 focus:text-white"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurar
              </DropdownMenuItem>
              {onSetDefault && !agent.is_default && (
                <DropdownMenuItem 
                  onClick={() => onSetDefault(agent.id)}
                  className="text-slate-200 focus:bg-slate-700 focus:text-white"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Definir como Padrão
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem 
                onClick={() => onDelete(agent.id)}
                className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-400 line-clamp-2 mb-4 min-h-[40px]">
          {agent.description || 'Sem descrição configurada para este agente.'}
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex flex-col items-center p-2 bg-slate-700/30 rounded-lg">
            <FileText className="w-4 h-4 text-slate-500 mb-1" />
            <span className="text-xs text-slate-400">Regras</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-slate-700/30 rounded-lg">
            <Zap className="w-4 h-4 text-slate-500 mb-1" />
            <span className="text-xs text-slate-400">Roteiro</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-slate-700/30 rounded-lg">
            <MessageSquare className="w-4 h-4 text-slate-500 mb-1" />
            <span className="text-xs text-slate-400">FAQs</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <Switch
              checked={agent.is_active}
              onCheckedChange={(checked) => onToggleActive(agent.id, checked)}
              className="data-[state=checked]:bg-emerald-500"
            />
            <span className={cn(
              "text-sm font-medium",
              agent.is_active ? "text-emerald-400" : "text-slate-500"
            )}>
              {agent.is_active ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(agent)}
            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
          >
            <Settings className="w-4 h-4 mr-1.5" />
            Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentCard;
