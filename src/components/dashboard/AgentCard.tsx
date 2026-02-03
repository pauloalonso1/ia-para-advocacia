import { Agent } from '@/hooks/useAgents';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Edit, Trash2, Power, PowerOff } from 'lucide-react';

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const AgentCard = ({ agent, onEdit, onDelete, onToggleActive }: AgentCardProps) => {
  return (
    <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{agent.name}</h3>
              {agent.category && (
                <Badge variant="secondary" className="bg-slate-700 text-slate-300 text-xs mt-1">
                  {agent.category}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-emerald-400"
              onClick={() => onToggleActive(agent.id, !agent.is_active)}
            >
              {agent.is_active ? (
                <Power className="w-4 h-4" />
              ) : (
                <PowerOff className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white"
              onClick={() => onEdit(agent)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-red-400"
              onClick={() => onDelete(agent.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-400 line-clamp-2">
          {agent.description || 'Sem descrição'}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Badge 
            variant={agent.is_active ? 'default' : 'secondary'}
            className={agent.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}
          >
            {agent.is_active ? 'Ativo' : 'Inativo'}
          </Badge>
          {agent.is_default && (
            <Badge className="bg-blue-500/20 text-blue-400">
              Padrão
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentCard;
