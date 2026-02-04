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
import { Search, MessageSquare, Phone, MoreVertical, Trash2, Bot, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversationsListProps {
  cases: Case[];
  selectedCaseId: string | null;
  onSelectCase: (caseItem: Case) => void;
  onDeleteCase: (caseId: string) => Promise<boolean>;
  loading: boolean;
  typingCases?: Set<string>;
}

const statusColors: Record<string, string> = {
  'Novo Contato': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Em Atendimento': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Qualificado': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Não Qualificado': 'bg-destructive/20 text-destructive border-destructive/30',
  'Convertido': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Arquivado': 'bg-muted text-muted-foreground border-border',
};

const statusFilters = [
  { id: 'all', label: 'Todos' },
  { id: 'Novo Contato', label: 'Novos' },
  { id: 'Em Atendimento', label: 'Em Atendimento' },
  { id: 'Qualificado', label: 'Qualificados' },
  { id: 'Convertido', label: 'Convertidos' },
  { id: 'Arquivado', label: 'Arquivados' },
];

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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.client_phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Count cases by status
  const statusCounts = cases.reduce((acc, c) => {
    const status = c.status || 'Novo Contato';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalUnread = cases.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  const getInitials = (name: string | null, phone: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
    return phone.slice(-2);
  };

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

  const truncateMessage = (message: string | null, maxLength: number = 40) => {
    if (!message) return '';
    return message.length > maxLength ? message.slice(0, maxLength) + '...' : message;
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
      <div className="w-80 border-r border-border flex flex-col bg-card/50">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Conversas
              {totalUnread > 0 && (
                <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0 min-w-[20px] h-5">
                  {totalUnread}
                </Badge>
              )}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "h-8 w-8",
                showFilters && "bg-primary/20 text-primary"
              )}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar conversa..."
              className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>

          {/* Status Filters */}
          {showFilters && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {statusFilters.map((filter) => {
                const count = filter.id === 'all' 
                  ? cases.length 
                  : statusCounts[filter.id] || 0;
                const isActive = statusFilter === filter.id;
                
                return (
                  <button
                    key={filter.id}
                    onClick={() => setStatusFilter(filter.id)}
                    className={cn(
                      "px-2 py-1 text-xs rounded-full transition-colors flex items-center gap-1",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {filter.label}
                    {count > 0 && (
                      <span className={cn(
                        "text-[10px] px-1 rounded-full",
                        isActive ? "bg-primary-foreground/20" : "bg-foreground/10"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Active filter indicator */}
          {statusFilter !== 'all' && !showFilters && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {statusFilters.find(f => f.id === statusFilter)?.label}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStatusFilter('all')}
                className="h-5 w-5"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-12 h-12 rounded-full bg-muted" />
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
                {searchTerm || statusFilter !== 'all' 
                  ? 'Nenhuma conversa encontrada' 
                  : 'Nenhuma conversa ainda'}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredCases.map((caseItem) => {
                const isTyping = typingCases.has(caseItem.id);
                const hasUnread = (caseItem.unread_count || 0) > 0;
                
                return (
                  <div
                    key={caseItem.id}
                    className={cn(
                      "group relative w-full p-3 rounded-xl text-left transition-all duration-200 mb-1 cursor-pointer",
                      "hover:bg-accent",
                      selectedCaseId === caseItem.id 
                        ? "bg-primary/10 border border-primary/30" 
                        : "bg-transparent border border-transparent",
                      hasUnread && selectedCaseId !== caseItem.id && "bg-primary/5"
                    )}
                    onClick={() => onSelectCase(caseItem)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar with unread indicator */}
                      <div className="relative">
                        <Avatar className={cn(
                          "w-11 h-11 border-2 shrink-0",
                          hasUnread ? "border-primary" : "border-border"
                        )}>
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-medium text-sm">
                            {getInitials(caseItem.client_name, caseItem.client_phone)}
                          </AvatarFallback>
                        </Avatar>
                        {hasUnread && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                            {caseItem.unread_count > 9 ? '9+' : caseItem.unread_count}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Row 1: Name + Bot icon + Time */}
                        <div className="flex items-center justify-between gap-1.5 mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={cn(
                              "truncate text-sm",
                              hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground"
                            )}>
                              {caseItem.client_name || 'Sem nome'}
                            </span>
                            {caseItem.active_agent_id && (
                              <Bot className="w-3.5 h-3.5 text-primary shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                            {formatDistanceToNow(new Date(caseItem.last_message_at || caseItem.updated_at), { 
                              addSuffix: false, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                        
                        {/* Row 2: Last message or typing indicator */}
                        <div className="mb-1.5">
                          {isTyping ? (
                            <div className="flex items-center gap-1">
                              <span className="text-primary text-xs font-medium">digitando</span>
                              <span className="flex gap-0.5">
                                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </span>
                            </div>
                          ) : caseItem.last_message ? (
                            <p className={cn(
                              "text-xs truncate",
                              hasUnread ? "text-foreground/90" : "text-muted-foreground"
                            )}>
                              {truncateMessage(caseItem.last_message)}
                            </p>
                          ) : (
                            <div className="flex items-center gap-1 text-muted-foreground text-xs">
                              <Phone className="w-3 h-3 shrink-0" />
                              <span className="truncate">{formatPhone(caseItem.client_phone)}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Row 3: Badge */}
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] font-medium px-1.5 py-0",
                            statusColors[caseItem.status || 'Novo Contato'] || statusColors['Novo Contato']
                          )}
                        >
                          {caseItem.status || 'Novo Contato'}
                        </Badge>
                      </div>

                      {/* Menu button */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mt-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
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
                );
              })}
            </div>
          )}
        </ScrollArea>
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
