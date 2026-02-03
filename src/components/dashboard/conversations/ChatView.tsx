import { useEffect, useRef } from 'react';
import { Case, Message } from '@/hooks/useCases';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, MessageSquare, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatViewProps {
  selectedCase: Case | null;
  messages: Message[];
  loading: boolean;
}

const ChatView = ({ selectedCase, messages, loading }: ChatViewProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!selectedCase) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900/50">
        <div className="text-center">
          <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-12 h-12 text-slate-600" />
          </div>
          <h3 className="text-xl font-medium text-slate-300 mb-2">Selecione uma conversa</h3>
          <p className="text-slate-500">Escolha uma conversa ao lado para visualizar as mensagens</p>
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

  const getInitials = (name: string | null, phone: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
    return phone.slice(-2);
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    messages.forEach(msg => {
      const msgDate = format(new Date(msg.created_at), 'yyyy-MM-dd');
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Hoje';
    }
    if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Ontem';
    }
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex-1 flex flex-col bg-slate-900/30">
      {/* Chat Header */}
      <div className="h-16 px-4 border-b border-slate-700 flex items-center gap-3 bg-slate-800/50">
        <Avatar className="w-10 h-10 border-2 border-emerald-500/30">
          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-medium">
            {getInitials(selectedCase.client_name, selectedCase.client_phone)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium text-white">
            {selectedCase.client_name || 'Sem nome'}
          </h3>
          <p className="text-xs text-slate-400">{formatPhone(selectedCase.client_phone)}</p>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn("flex gap-2", i % 2 === 0 && "justify-end")}>
                <div className={cn(
                  "animate-pulse rounded-2xl p-4",
                  i % 2 === 0 ? "bg-emerald-500/20 w-2/3" : "bg-slate-700/50 w-1/2"
                )}>
                  <div className="h-4 bg-slate-600 rounded w-full mb-2" />
                  <div className="h-4 bg-slate-600 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nenhuma mensagem ainda</p>
              <p className="text-slate-500 text-sm">As mensagens aparecerão aqui quando o cliente iniciar a conversa</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messageGroups.map((group, groupIdx) => (
              <div key={groupIdx}>
                {/* Date Separator */}
                <div className="flex items-center justify-center mb-4">
                  <span className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-400">
                    {formatDateHeader(group.date)}
                  </span>
                </div>

                {/* Messages */}
                <div className="space-y-3">
                  {group.messages.map((msg) => {
                    const isAssistant = msg.role === 'assistant';
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-2",
                          isAssistant ? "justify-start" : "justify-end"
                        )}
                      >
                        {isAssistant && (
                          <Avatar className="w-8 h-8 mt-1">
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600">
                              <Bot className="w-4 h-4 text-white" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2.5",
                          isAssistant 
                            ? "bg-slate-700/70 rounded-tl-sm" 
                            : "bg-emerald-600 rounded-tr-sm"
                        )}>
                          <p className="text-white text-sm whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                          <p className={cn(
                            "text-[10px] mt-1 text-right",
                            isAssistant ? "text-slate-400" : "text-emerald-200"
                          )}>
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </p>
                        </div>

                        {!isAssistant && (
                          <Avatar className="w-8 h-8 mt-1">
                            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600">
                              <User className="w-4 h-4 text-white" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input Area - Read Only */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/30">
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700">
          <span className="text-slate-500 text-sm flex-1">
            As mensagens são recebidas automaticamente via WhatsApp
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
