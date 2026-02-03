import { useState } from 'react';
import { Case } from '@/hooks/useCases';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Phone, 
  Calendar, 
  Clock, 
  Tag,
  Edit2,
  Check,
  X,
  Bot,
  ChevronRight,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CRMPanelProps {
  selectedCase: Case | null;
  onUpdateStatus: (caseId: string, status: string) => void;
  onUpdateName: (caseId: string, name: string) => void;
}

const crmStages = [
  { id: 'Novo Contato', label: 'Novo Contato', color: 'bg-blue-500', description: 'Lead acabou de entrar em contato' },
  { id: 'Em Atendimento', label: 'Em Atendimento', color: 'bg-amber-500', description: 'Atendimento em andamento pelo agente' },
  { id: 'Qualificado', label: 'Qualificado', color: 'bg-green-500', description: 'Lead tem potencial para converter' },
  { id: 'Não Qualificado', label: 'Não Qualificado', color: 'bg-destructive', description: 'Lead não tem perfil para o serviço' },
  { id: 'Convertido', label: 'Convertido', color: 'bg-purple-500', description: 'Cliente fechou contrato' },
  { id: 'Arquivado', label: 'Arquivado', color: 'bg-muted-foreground', description: 'Caso encerrado ou arquivado' },
];

const CRMPanel = ({ selectedCase, onUpdateStatus, onUpdateName }: CRMPanelProps) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  if (!selectedCase) {
    return (
      <div className="w-80 border-l border-border bg-card/50 flex items-center justify-center">
        <div className="text-center p-6">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Selecione uma conversa para ver os detalhes do CRM</p>
        </div>
      </div>
    );
  }

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    if (cleaned.length === 12) {
      return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
    }
    return phone;
  };

  const handleStartEditName = () => {
    setEditedName(selectedCase.client_name || '');
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (editedName.trim()) {
      onUpdateName(selectedCase.id, editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const currentStageIndex = crmStages.findIndex(s => s.id === (selectedCase.status || 'Novo Contato'));

  return (
    <div className="w-80 border-l border-border bg-card/50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          Detalhes do Lead
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Informações do Contato
            </h4>
            
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <User className="w-3 h-3" />
                Nome
              </Label>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-8 bg-muted border-border text-foreground text-sm"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveName} className="h-8 w-8 text-primary hover:text-primary/80">
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-foreground">
                    {selectedCase.client_name || 'Não informado'}
                  </span>
                  <Button size="icon" variant="ghost" onClick={handleStartEditName} className="h-6 w-6 text-muted-foreground hover:text-foreground">
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <Phone className="w-3 h-3" />
                Telefone
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-foreground">{formatPhone(selectedCase.client_phone)}</span>
                <a 
                  href={`https://wa.me/${selectedCase.client_phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 text-xs underline"
                >
                  Abrir WhatsApp
                </a>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Criado em
                </Label>
                <span className="text-foreground text-sm">
                  {format(new Date(selectedCase.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Atualizado
                </Label>
                <span className="text-foreground text-sm">
                  {format(new Date(selectedCase.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* CRM Pipeline */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Etapa do Funil
            </h4>
            
            <div className="space-y-2">
              {crmStages.map((stage, index) => {
                const isActive = stage.id === (selectedCase.status || 'Novo Contato');
                const isPast = index < currentStageIndex;
                
                return (
                  <button
                    key={stage.id}
                    onClick={() => onUpdateStatus(selectedCase.id, stage.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-left",
                      isActive 
                        ? "bg-accent border border-border" 
                        : "hover:bg-accent/50 border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "w-3 h-3 rounded-full shrink-0",
                      isActive || isPast ? stage.color : "bg-muted"
                    )} />
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        "text-sm font-medium block",
                        isActive ? "text-foreground" : isPast ? "text-foreground/80" : "text-muted-foreground"
                      )}>
                        {stage.label}
                      </span>
                      {isActive && (
                        <span className="text-xs text-muted-foreground">{stage.description}</span>
                      )}
                    </div>
                    {isActive && (
                      <ChevronRight className="w-4 h-4 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Agent Info */}
          {selectedCase.active_agent_id && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Agente Ativo
              </h4>
              <div className="p-3 bg-muted rounded-lg border border-border">
                <p className="text-muted-foreground text-sm">
                  ID: {selectedCase.active_agent_id.slice(0, 8)}...
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CRMPanel;
