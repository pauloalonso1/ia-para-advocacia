import { useState } from 'react';
import { Case } from '@/hooks/useCases';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, MessageSquare, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversationsListProps {
  cases: Case[];
  selectedCaseId: string | null;
  onSelectCase: (caseItem: Case) => void;
  loading: boolean;
}

const statusColors: Record<string, string> = {
  'Novo Contato': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Em Atendimento': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Qualificado': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Não Qualificado': 'bg-red-500/20 text-red-400 border-red-500/30',
  'Convertido': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Arquivado': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const ConversationsList = ({ cases, selectedCaseId, onSelectCase, loading }: ConversationsListProps) => {
  const [searchTerm, setSearchTerm] = useState('');

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
    // Format Brazilian phone: +5511999999999 -> (11) 99999-9999
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    if (cleaned.length === 12) {
      return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
    }
    return phone;
  };

  return (
    <div className="w-80 border-r border-slate-700 flex flex-col bg-slate-800/30">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-400" />
          Conversas
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar conversa..."
            className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-slate-800/30">
                <div className="w-12 h-12 rounded-full bg-slate-700" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filteredCases.map((caseItem) => (
              <button
                key={caseItem.id}
                onClick={() => onSelectCase(caseItem)}
                className={cn(
                  "w-full p-3 rounded-xl text-left transition-all duration-200 mb-1",
                  "hover:bg-slate-700/50",
                  selectedCaseId === caseItem.id 
                    ? "bg-emerald-500/10 border border-emerald-500/30" 
                    : "bg-transparent border border-transparent"
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12 border-2 border-slate-600">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-medium">
                      {getInitials(caseItem.client_name, caseItem.client_phone)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white truncate">
                        {caseItem.client_name || 'Sem nome'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(caseItem.updated_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-slate-400 text-sm mb-2">
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
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ConversationsList;
