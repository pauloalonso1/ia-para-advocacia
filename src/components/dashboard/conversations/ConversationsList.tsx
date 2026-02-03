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
import { Search, MessageSquare, Phone, MoreVertical, Trash2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversationsListProps {
  cases: Case[];
  selectedCaseId: string | null;
  onSelectCase: (caseItem: Case) => void;
  onDeleteCase: (caseId: string) => Promise<boolean>;
  loading: boolean;
}

const statusColors: Record<string, string> = {
  'Novo Contato': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Em Atendimento': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Qualificado': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Não Qualificado': 'bg-destructive/20 text-destructive border-destructive/30',
  'Convertido': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Arquivado': 'bg-muted text-muted-foreground border-border',
};

const ConversationsList = ({ cases, selectedCaseId, onSelectCase, onDeleteCase, loading }: ConversationsListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<Case | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredCases = cases.filter(c => 
    c.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.client_phone.includes(searchTerm)
  );

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
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Conversas
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar conversa..."
              className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>
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
                {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredCases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className={cn(
                    "group relative w-full p-3 rounded-xl text-left transition-all duration-200 mb-1 cursor-pointer",
                    "hover:bg-accent",
                    selectedCaseId === caseItem.id 
                      ? "bg-primary/10 border border-primary/30" 
                      : "bg-transparent border border-transparent"
                  )}
                  onClick={() => onSelectCase(caseItem)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 border-2 border-border">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-medium">
                        {getInitials(caseItem.client_name, caseItem.client_phone)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground truncate flex items-center gap-1.5">
                          {caseItem.client_name || 'Sem nome'}
                          {caseItem.active_agent_id && (
                            <Bot className="w-3.5 h-3.5 text-primary" />
                          )}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(caseItem.updated_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
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
                      
                      <div className="flex items-center gap-1 text-muted-foreground text-sm mb-2">
                        <Phone className="w-3 h-3" />
                        <span className="truncate">{formatPhone(caseItem.client_phone)}</span>
                      </div>
                      
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs font-medium",
                          statusColors[caseItem.status || 'Novo Contato'] || statusColors['Novo Contato']
                        )}
                      >
                        {caseItem.status || 'Novo Contato'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
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
