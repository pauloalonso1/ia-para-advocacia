import { useState } from 'react';
import { Case } from '@/hooks/useCases';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, MessageSquare, MoreVertical, Trash2, Bot, RefreshCw, Plus, Volume2, CheckCheck, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationsListProps {
  cases: Case[];
  selectedCaseId: string | null;
  onSelectCase: (caseItem: Case) => void;
  onDeleteCase: (caseId: string) => Promise<boolean>;
  loading: boolean;
  typingCases?: Set<string>;
}

const statusColors: Record<string, string> = {
  'Novo Contato': 'bg-blue-500',
  'Em Atendimento': 'bg-amber-500',
  'Qualificado': 'bg-green-500',
  'Não Qualificado': 'bg-destructive',
  'Convertido': 'bg-purple-500',
  'Arquivado': 'bg-muted-foreground',
};

const statusBadgeColors: Record<string, string> = {
  'Novo Contato': 'bg-blue-500/20 text-blue-400',
  'Em Atendimento': 'bg-amber-500/20 text-amber-400',
  'Qualificado': 'bg-green-500/20 text-green-400',
  'Não Qualificado': 'bg-destructive/20 text-destructive',
  'Convertido': 'bg-purple-500/20 text-purple-400',
  'Arquivado': 'bg-muted text-muted-foreground',
};

const ConversationsList = ({ 
  cases, 
  selectedCaseId, 
  onSelectCase, 
  onDeleteCase, 
  loading,
  typingCases = new Set()
}: ConversationsListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<Case | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('pinned-conversations');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const togglePin = (caseId: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId); else next.add(caseId);
      localStorage.setItem('pinned-conversations', JSON.stringify([...next]));
      return next;
    });
  };

  // Count cases by filter
  const casesWithAI = cases.filter(c => c.active_agent_id);
  const casesUnread = cases.filter(c => (c.unread_count || 0) > 0);
  const _totalUnread = cases.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.client_phone.includes(searchTerm) ||
      c.last_message?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === 'ai') matchesTab = !!c.active_agent_id;
    if (activeTab === 'unread') matchesTab = (c.unread_count || 0) > 0;
    
    return matchesSearch && matchesTab;
  }).sort((a, b) => {
    const aPinned = pinnedIds.has(a.id) ? 0 : 1;
    const bPinned = pinnedIds.has(b.id) ? 0 : 1;
    return aPinned - bPinned;
  });

  const getInitials = (name: string | null, phone: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
    return phone.slice(-2);
  };

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

  const truncateMessage = (message: string | null, maxLength: number = 35) => {
    if (!message) return '';
    return message.length > maxLength ? message.slice(0, maxLength) + '...' : message;
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, caseItem: Case) => {
    e.stopPropagation();
    setCaseToDelete(caseItem);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!caseToDelete) return;
    setIsDeleting(true);
    await onDeleteCase(caseToDelete.id);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setCaseToDelete(null);
  };

  return (
    <>
      <div className="w-80 border-r border-border flex flex-col bg-card">
        {/* Top Bar with Search and Actions */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar conversas..."
                className="pl-9 h-10 bg-background border-border text-foreground placeholder:text-muted-foreground text-sm"
              />
            </div>
            <Button variant="outline" size="sm" className="h-10 px-3 text-xs gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Follow-up
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-3 py-2 border-b border-border">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === 'all' 
                  ? "bg-muted text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tudo
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                activeTab === 'ai' 
                  ? "bg-muted text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              IA ativa
              <Badge className="bg-primary/20 text-primary text-[10px] px-1.5 py-0 h-4">
                {casesWithAI.length}
              </Badge>
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                activeTab === 'unread' 
                  ? "bg-muted text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Não lidas
              <Badge className="bg-destructive/20 text-destructive text-[10px] px-1.5 py-0 h-4">
                {casesUnread.length}
              </Badge>
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </p>
            </div>
          ) : (
            <div className="py-1">
              {filteredCases.map((caseItem) => {
                const isTyping = typingCases.has(caseItem.id);
                const hasUnread = (caseItem.unread_count || 0) > 0;
                const isSelected = selectedCaseId === caseItem.id;
                const hasAudio = caseItem.last_message?.includes('[Áudio]');
                const isPinned = pinnedIds.has(caseItem.id);
                
                return (
                  <div
                    key={caseItem.id}
                    className={cn(
                      "group relative w-full px-3 py-2.5 text-left transition-all cursor-pointer border-l-4",
                      isSelected 
                        ? "bg-primary/10 border-l-primary" 
                        : "border-l-transparent hover:bg-accent/50",
                      hasUnread && !isSelected && "bg-primary/5"
                    )}
                    onClick={() => onSelectCase(caseItem)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarFallback className={cn(
                          "text-white font-medium text-sm",
                          statusColors[caseItem.status || 'Novo Contato'] || 'bg-primary'
                        )}>
                          {getInitials(caseItem.client_name, caseItem.client_phone)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        {/* Row 1: Name + Phone + Time */}
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isPinned && <Pin className="w-3 h-3 text-primary shrink-0 -rotate-45" />}
                            <span className={cn(
                              "truncate text-sm",
                              hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground"
                            )}>
                              {caseItem.client_name || 'Sem nome'}
                            </span>
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {formatPhone(caseItem.client_phone).split(' ').slice(0, 2).join(' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge className="bg-primary/20 text-primary text-[10px] px-1 py-0 h-4">
                              SDR
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {formatTime(caseItem.last_message_at || caseItem.updated_at)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Row 2: Last message with icons */}
                        <div className="flex items-center gap-1 mb-1">
                          {hasAudio ? (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Volume2 className="w-3.5 h-3.5" />
                              <span className="text-xs">Áudio</span>
                            </div>
                          ) : isTyping ? (
                            <div className="flex items-center gap-1">
                              <span className="text-primary text-xs font-medium">digitando</span>
                              <span className="flex gap-0.5">
                                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </span>
                            </div>
                          ) : caseItem.last_message ? (
                            <div className="flex items-center gap-1 min-w-0">
                              <CheckCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className={cn(
                                "text-xs truncate",
                                hasUnread ? "text-foreground" : "text-muted-foreground"
                              )}>
                                {truncateMessage(caseItem.last_message)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Nova conversa</span>
                          )}
                          
                          {/* Unread badge */}
                          {hasUnread && (
                            <Badge className="ml-auto bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 h-4 shrink-0">
                              {caseItem.unread_count}
                            </Badge>
                          )}
                          
                          {/* AI indicator */}
                          {caseItem.active_agent_id && (
                            <Bot className="w-3.5 h-3.5 text-primary ml-1 shrink-0" />
                          )}
                        </div>
                        
                        {/* Row 3: Stage badge + 3-dot menu */}
                        <div className="flex items-center justify-between">
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-[10px] font-normal px-1.5 py-0 h-4",
                              statusBadgeColors[caseItem.status || 'Novo Contato'] || statusBadgeColors['Novo Contato']
                            )}
                          >
                            {caseItem.status || 'Recepção - S...'}
                          </Badge>
                          
                          {/* Menu 3 dots */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border z-50">
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); togglePin(caseItem.id); }}
                                className="text-foreground focus:bg-accent"
                              >
                                <Pin className={cn("w-4 h-4 mr-2", pinnedIds.has(caseItem.id) && "text-primary")} />
                                {pinnedIds.has(caseItem.id) ? 'Desafixar conversa' : 'Fixar conversa'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => handleDeleteClick(e, caseItem)}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir conversa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* New Conversation Button */}
        <div className="p-3 border-t border-border">
          <Button className="w-full gap-2" size="sm">
            <Plus className="w-4 h-4" />
            Nova conversa
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Esta ação não pode ser desfeita. A conversa com{' '}
              <span className="font-medium text-foreground">
                {caseToDelete?.client_name || formatPhone(caseToDelete?.client_phone || '')}
              </span>{' '}
              e todo o histórico de mensagens serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted/80">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ConversationsList;
