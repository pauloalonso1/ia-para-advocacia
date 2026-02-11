import { useState, useEffect } from 'react';
import { Case } from '@/hooks/useCases';
import { useAgents } from '@/hooks/useAgents';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAISummary } from '@/hooks/useAISummary';
import { useAuth } from '@/contexts/AuthContext';
import TagsManager from '@/components/dashboard/crm/TagsManager';
import AppointmentManager from '@/components/dashboard/crm/AppointmentManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  
  Edit2,
  Check,
  X,
  Bot,
  FileText,
  Info,
  Image,
  StickyNote,
  ExternalLink,
  Play,
  Pause,
  Power,
  Filter,
  Plus,
  Building2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface CRMPanelProps {
  selectedCase: Case | null;
  onUpdateStatus: (caseId: string, status: string) => void;
  onUpdateName: (caseId: string, name: string) => void;
  onAssignAgent: (caseId: string, agentId: string | null) => void;
  profilePictureUrl?: string | null;
  isMobile?: boolean;
}

const crmStages = [
  { id: 'Novo Contato', label: 'Recepção', color: 'bg-blue-500' },
  { id: 'Em Atendimento', label: 'Em Atendimento', color: 'bg-amber-500' },
  { id: 'Qualificado', label: 'Qualificado', color: 'bg-green-500' },
  { id: 'Não Qualificado', label: 'Não Qualificado', color: 'bg-destructive' },
  { id: 'Convertido', label: 'Convertido', color: 'bg-purple-500' },
  { id: 'Arquivado', label: 'Arquivado', color: 'bg-muted-foreground' },
];

const CRMPanel = ({ selectedCase, onUpdateStatus, onUpdateName, onAssignAgent, profilePictureUrl, isMobile }: CRMPanelProps) => {
  const { agents } = useAgents();
  const { activeMembers } = useTeamMembers();
  const { loading: summaryLoading, summary, generateSummary, clearSummary } = useAISummary();
  const { user } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [aiStatus, setAiStatus] = useState<'active' | 'paused' | 'disabled'>('disabled');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedResponsibleId, setSelectedResponsibleId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('info');

  // Clear summary when case changes
  useEffect(() => {
    clearSummary();
  }, [selectedCase?.id]);

  useEffect(() => {
    if (selectedCase) {
      // Determine AI status based on active_agent_id and is_agent_paused
      if (selectedCase.active_agent_id) {
        // Check if paused - need to get from case data
        const isPaused = (selectedCase as any).is_agent_paused;
        setAiStatus(isPaused ? 'paused' : 'active');
        setSelectedAgentId(selectedCase.active_agent_id);
      } else {
        setAiStatus('disabled');
        setSelectedAgentId('');
      }
      // Set responsible
      setSelectedResponsibleId((selectedCase as any).assigned_to || '');
    }
  }, [selectedCase]);

  const activeAgents = agents.filter(a => a.is_active);

  if (!selectedCase) {
    if (isMobile) return null;
    return (
      <div className="w-80 border-l border-border bg-card flex items-center justify-center">
        <div className="text-center p-6">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Selecione uma conversa para ver os detalhes</p>
        </div>
      </div>
    );
  }

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    if (cleaned.length === 12) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
    }
    return phone;
  };

  const getInitials = (name: string | null, phone: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
    return phone.slice(-2);
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

  const handleAiStatusChange = async (status: 'active' | 'paused' | 'disabled') => {
    if (!selectedCase) return;
    setAiStatus(status);
    
    if (status === 'disabled') {
      // Disable agent completely
      onAssignAgent(selectedCase.id, null);
      setSelectedAgentId('');
      await supabase
        .from('cases')
        .update({ is_agent_paused: false })
        .eq('id', selectedCase.id);
    } else if (status === 'paused') {
      // Pause but keep agent assigned
      await supabase
        .from('cases')
        .update({ is_agent_paused: true })
        .eq('id', selectedCase.id);
    } else if (status === 'active') {
      // Activate agent
      if (!selectedAgentId && activeAgents.length > 0) {
        const defaultAgent = activeAgents.find(a => a.is_default) || activeAgents[0];
        setSelectedAgentId(defaultAgent.id);
        onAssignAgent(selectedCase.id, defaultAgent.id);
      } else if (selectedAgentId) {
        onAssignAgent(selectedCase.id, selectedAgentId);
      }
      await supabase
        .from('cases')
        .update({ is_agent_paused: false, current_step_id: null })
        .eq('id', selectedCase.id);
    }
  };

  const handleResponsibleChange = async (memberId: string) => {
    if (!selectedCase) return;
    const assignedTo = memberId === 'none' ? null : memberId;
    setSelectedResponsibleId(memberId);
    
    await supabase
      .from('cases')
      .update({ assigned_to: assignedTo })
      .eq('id', selectedCase.id);
  };

  const handleAgentChange = (agentId: string) => {
    if (!selectedCase) return;
    setSelectedAgentId(agentId);
    onAssignAgent(selectedCase.id, agentId);
    // Also ensure agent is active when changing
    if (aiStatus !== 'active') {
      setAiStatus('active');
      supabase
        .from('cases')
        .update({ is_agent_paused: false })
        .eq('id', selectedCase.id);
    }
  };

  return (
    <div className={cn(isMobile ? "flex flex-col h-full" : "w-80 border-l border-border bg-card flex flex-col")}>
      {/* Tabs Header */}
      <div className="border-b border-border">
        <div className="flex items-center">
          <button
            onClick={() => setActiveTab('info')}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5",
              activeTab === 'info' 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Info className="w-4 h-4" />
            Informações
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5",
              activeTab === 'media' 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Image className="w-4 h-4" />
            Mídias
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5",
              activeTab === 'notes' 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <StickyNote className="w-4 h-4" />
            Notas
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {activeTab === 'info' && (
          <div className="p-4 space-y-5">
            {/* Contact Card */}
            <div className="flex items-center gap-3">
              <Avatar className="w-14 h-14">
                {profilePictureUrl && (
                  <AvatarImage src={profilePictureUrl} alt={selectedCase.client_name || 'Contact'} className="object-cover" />
                )}
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-lg font-semibold">
                  {getInitials(selectedCase.client_name, selectedCase.client_phone)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="h-7 text-sm bg-muted border-border"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={handleSaveName} className="h-7 w-7">
                      <Check className="w-3.5 h-3.5 text-primary" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-7 w-7">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-foreground truncate">
                      {selectedCase.client_name || 'Sem nome'}
                    </h3>
                    <Button size="icon" variant="ghost" onClick={handleStartEditName} className="h-5 w-5">
                      <Edit2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{formatPhone(selectedCase.client_phone)}</span>
                </div>
                <a 
                  href="#" 
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ver detalhes completos
                </a>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Agent Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-muted-foreground" />
                <Select value={selectedAgentId || 'none'} onValueChange={(v) => v !== 'none' && handleAgentChange(v)}>
                  <SelectTrigger className="flex-1 h-9 bg-background border-border text-sm">
                    <SelectValue placeholder="Recepção - SC Advogados (Principal)" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {activeAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* AI Status Buttons */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status: <span className={cn(
                  "font-medium",
                  aiStatus === 'active' && "text-green-500",
                  aiStatus === 'paused' && "text-amber-500",
                  aiStatus === 'disabled' && "text-muted-foreground"
                )}>
                  {aiStatus === 'active' && 'Ativa'}
                  {aiStatus === 'paused' && 'Pausada'}
                  {aiStatus === 'disabled' && 'Desativada'}
                </span></Label>
                <div className="flex gap-2">
                  <Button
                    variant={aiStatus === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleAiStatusChange('active')}
                    className={cn(
                      "flex-1 h-8 text-xs",
                      aiStatus === 'active' && "bg-green-600 hover:bg-green-700"
                    )}
                    disabled={activeAgents.length === 0}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Ativar
                  </Button>
                  <Button
                    variant={aiStatus === 'paused' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleAiStatusChange('paused')}
                    className={cn(
                      "flex-1 h-8 text-xs",
                      aiStatus === 'paused' && "bg-amber-600 hover:bg-amber-700"
                    )}
                    disabled={activeAgents.length === 0}
                  >
                    <Pause className="w-3 h-3 mr-1" />
                    Pausar
                  </Button>
                  <Button
                    variant={aiStatus === 'disabled' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleAiStatusChange('disabled')}
                    className={cn(
                      "flex-1 h-8 text-xs",
                      aiStatus === 'disabled' && "bg-destructive hover:bg-destructive/90"
                    )}
                  >
                    <Power className="w-3 h-3 mr-1" />
                    Desativar
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Responsavel & Funil */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Responsável
                </Label>
                <Select 
                  value={selectedResponsibleId || 'none'} 
                  onValueChange={handleResponsibleChange}
                >
                  <SelectTrigger className="h-8 bg-background border-border text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="none">Não atribuído</SelectItem>
                    {activeMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  Funil
                </Label>
                <Select defaultValue="trabalhista">
                  <SelectTrigger className="h-8 bg-background border-border text-xs">
                    <SelectValue placeholder="Trabalhista" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="trabalhista">Trabalhista</SelectItem>
                    <SelectItem value="civel">Cível</SelectItem>
                    <SelectItem value="previdenciario">Previdenciário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Etapa */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Etapa</Label>
              <Select 
                value={selectedCase.status || 'Novo Contato'} 
                onValueChange={(value) => onUpdateStatus(selectedCase.id, value)}
              >
                <SelectTrigger className="h-9 bg-background border-border text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {crmStages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                        {stage.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator className="bg-border" />

            {/* Etiquetas */}
            {user && (
              <TagsManager clientPhone={selectedCase.client_phone} userId={user.id} />
            )}

            {/* Departamentos */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                Departamentos
              </Label>
              <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start text-muted-foreground">
                <Plus className="w-3 h-3 mr-1.5" />
                Adicionar departamento
              </Button>
            </div>

            <Separator className="bg-border" />

            {/* Agendamentos */}
            <AppointmentManager caseId={selectedCase.id} />

            <Separator className="bg-border" />

            {/* Descrição do Caso */}
            {selectedCase.case_description && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Descrição do caso
                </Label>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{selectedCase.case_description}</p>
                </div>
              </div>
            )}

            <Separator className="bg-border" />

            {/* Resumo do Atendimento */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Resumo do atendimento
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => generateSummary(selectedCase.id)}
                  disabled={summaryLoading}
                  className="h-6 px-2 text-xs"
                >
                  {summaryLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Gerar
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Pode levar cerca de 1 minuto para gerar um resumo.
              </p>
              <div className="p-3 bg-muted/50 rounded-lg min-h-[60px]">
                {summaryLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Analisando conversa...</p>
                  </div>
                ) : summary ? (
                  <p className="text-xs text-foreground whitespace-pre-wrap">{summary}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Resumo da negociação com {selectedCase.client_name || 'o cliente'}...
                  </p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Criado em
                </Label>
                <span className="text-xs text-foreground">
                  {format(new Date(selectedCase.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Atualizado
                </Label>
                <span className="text-xs text-foreground">
                  {format(new Date(selectedCase.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="p-4">
            <div className="text-center py-8">
              <Image className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma mídia compartilhada</p>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="p-4">
            <div className="text-center py-8">
              <StickyNote className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm mb-3">Nenhuma nota adicionada</p>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Adicionar nota
              </Button>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default CRMPanel;
