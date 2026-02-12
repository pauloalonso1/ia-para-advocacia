import { useState } from 'react';
import { Case } from '@/hooks/useCases';
import { useAgents } from '@/hooks/useAgents';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  User, 
  Phone, 
  Calendar, 
  Clock, 
  Bot,
  MessageSquare,
  ExternalLink,
  Zap,
  FileSignature
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import SendDocumentModal from './SendDocumentModal';

interface LeadDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCase: Case | null;
  onUpdateStatus: (caseId: string, status: string) => void;
  onAssignAgent: (caseId: string, agentId: string | null) => void;
  onOpenConversation: (caseItem: Case) => void;
}

const crmStages = [
  { id: 'Novo Contato', label: 'Novo Contato', color: 'bg-blue-500' },
  { id: 'Em Atendimento', label: 'Em Atendimento', color: 'bg-amber-500' },
  { id: 'Qualificado', label: 'Qualificado', color: 'bg-green-500' },
  { id: 'Convertido', label: 'Convertido', color: 'bg-purple-500' },
  { id: 'Não Qualificado', label: 'Não Qualificado', color: 'bg-destructive' },
  { id: 'Arquivado', label: 'Arquivado', color: 'bg-muted-foreground' },
];

const LeadDetailModal = ({ 
  open, 
  onOpenChange, 
  selectedCase, 
  onUpdateStatus, 
  onAssignAgent,
  onOpenConversation 
}: LeadDetailModalProps) => {
  const { agents } = useAgents();
  const activeAgents = agents.filter(a => a.is_active);
  const [showDocModal, setShowDocModal] = useState(false);

  if (!selectedCase) return null;

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

  const currentStage = crmStages.find(s => s.id === selectedCase.status) || crmStages[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Detalhes do Lead
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 pr-1">
          {/* Lead Info */}
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Nome</label>
              <p className="text-foreground font-medium mt-1">
                {selectedCase.client_name || 'Não informado'}
              </p>
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Telefone</label>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{formatPhone(selectedCase.client_phone)}</span>
                <a 
                  href={`https://wa.me/${selectedCase.client_phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  WhatsApp
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Criado em
                </label>
                <p className="text-foreground text-sm mt-1">
                  {format(new Date(selectedCase.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Atualizado
                </label>
                <p className="text-foreground text-sm mt-1">
                  {format(new Date(selectedCase.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>

          {/* Case Description */}
          {selectedCase.case_description && (
            <>
              <Separator className="bg-border" />
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <FileSignature className="w-3 h-3" />
                  Descrição do Caso
                </label>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedCase.case_description}
                  </p>
                </div>
              </div>
            </>
          )}

          <Separator className="bg-border" />

          {/* Status */}
          <div className="space-y-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Etapa do Funil</label>
            <Select 
              value={selectedCase.status || 'Novo Contato'} 
              onValueChange={(value) => onUpdateStatus(selectedCase.id, value)}
            >
              <SelectTrigger className="bg-muted border-border">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", currentStage.color)} />
                    {currentStage.label}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {crmStages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id} className="text-foreground">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", stage.color)} />
                      {stage.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agent Assignment */}
          <div className="space-y-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Bot className="w-3 h-3" />
              Agente IA
            </label>
            <Select 
              value={selectedCase.active_agent_id || 'none'} 
              onValueChange={(value) => onAssignAgent(selectedCase.id, value === 'none' ? null : value)}
            >
              <SelectTrigger className="bg-muted border-border">
                <SelectValue placeholder="Selecione um agente">
                  {selectedCase.active_agent_id ? (
                    <div className="flex items-center gap-2">
                      <Zap className="w-3 h-3 text-primary" />
                      {activeAgents.find(a => a.id === selectedCase.active_agent_id)?.name || 'Agente'}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Atendimento manual</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="none" className="text-foreground">
                  <span className="text-muted-foreground">Atendimento manual</span>
                </SelectItem>
                {activeAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id} className="text-foreground">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3 h-3 text-primary" />
                      {agent.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-border" />

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              className="flex-1"
              onClick={() => {
                onOpenConversation(selectedCase);
                onOpenChange(false);
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Ver Conversa
            </Button>
            <Button
              variant="outline"
              className="border-border"
              onClick={() => setShowDocModal(true)}
            >
              <FileSignature className="w-4 h-4 mr-2" />
              Contrato
            </Button>
          </div>
        </div>
      </DialogContent>

      <SendDocumentModal
        open={showDocModal}
        onOpenChange={setShowDocModal}
        clientName={selectedCase.client_name || ''}
        clientPhone={selectedCase.client_phone}
        caseId={selectedCase.id}
      />
    </Dialog>
  );
};

export default LeadDetailModal;
