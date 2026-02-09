import { useEffect, useRef, useState } from 'react';
import { Case, Message } from '@/hooks/useCases';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bot, User, MessageSquare, Clock, Paperclip, Mic, Smile, Send, Image, FileText, Camera, X, Loader2, Check, CheckCheck } from 'lucide-react';
import MediaMessage from './MediaMessage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface ChatViewProps {
  selectedCase: Case | null;
  messages: Message[];
  loading: boolean;
  onPauseAgent?: (caseId: string) => void;
}

const commonEmojis = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
  '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋',
  '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👋', '🙏',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💯', '✨',
];

const ChatView = ({ selectedCase, messages, loading, onPauseAgent }: ChatViewProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messageInput, setMessageInput] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ file: File; preview: string; type: 'image' | 'document' } | null>(null);
  const [sending, setSending] = useState(false);
  const [isContactTyping, setIsContactTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!selectedCase) return;

    const channel = supabase.channel('typing-indicators')
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { phone, isTyping } = payload.payload as { phone: string; isTyping: boolean };
        if (phone === selectedCase.client_phone) {
          setIsContactTyping(isTyping);
          // Auto-clear after 5 seconds
          if (isTyping) {
            setTimeout(() => setIsContactTyping(false), 5000);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setIsContactTyping(false);
    };
  }, [selectedCase?.id, selectedCase?.client_phone]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  };

  // Scroll to bottom when messages change (new message or conversation opened)
  useEffect(() => {
    // Small delay to ensure DOM is updated
    const timer = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timer);
  }, [messages, selectedCase?.id]);

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
    setEmojiOpen(false);
    textareaRef.current?.focus();
  };

  const handleSendMessage = async () => {
    if (!selectedCase || !messageInput.trim() || sending) return;

    setSending(true);
    try {
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada', { description: 'Faça login novamente' });
        return;
      }

      // Pause the agent if active
      if (selectedCase.active_agent_id && onPauseAgent) {
        onPauseAgent(selectedCase.id);
      }

      // Send message via Evolution API edge function
      const response = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'send-text',
          phone: selectedCase.client_phone,
          message: messageInput.trim(),
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao enviar mensagem');
      }

      // Save message to conversation history
      const { error: historyError } = await supabase
        .from('conversation_history')
        .insert({
          case_id: selectedCase.id,
          role: 'assistant',
          content: messageInput.trim(),
        });

      if (historyError) {
        console.error('Error saving to history:', historyError);
      }

      // Update case updated_at
      await supabase
        .from('cases')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedCase.id);

      setMessageInput('');
      clearSelectedFile();
      toast.success('Mensagem enviada!');
    } catch (error: any) {
      console.error('Send message error:', error);
      toast.error('Erro ao enviar mensagem', {
        description: error.message || 'Tente novamente',
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande', {
        description: 'O tamanho máximo é 16MB'
      });
      return;
    }

    const preview = type === 'image' ? URL.createObjectURL(file) : '';
    setSelectedFile({ file, preview, type });
    setAttachmentOpen(false);
    toast.success(`${type === 'image' ? 'Imagem' : 'Documento'} selecionado`, {
      description: file.name
    });
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setSelectedFile({ file, preview, type: 'image' });
    setAttachmentOpen(false);
    toast.success('Foto capturada');
  };

  const clearSelectedFile = () => {
    if (selectedFile?.preview) {
      URL.revokeObjectURL(selectedFile.preview);
    }
    setSelectedFile(null);
  };

  if (!selectedCase) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background/50">
        <div className="text-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium text-foreground mb-2">Selecione uma conversa</h3>
          <p className="text-muted-foreground">Escolha uma conversa ao lado para visualizar as mensagens</p>
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
    <div className="flex-1 flex flex-col bg-background/30">
      {/* Chat Header */}
      <div className="h-16 px-4 border-b border-border flex items-center gap-3 bg-card/50">
        <Avatar className="w-10 h-10 border-2 border-primary/30">
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-sm font-medium">
            {getInitials(selectedCase.client_name, selectedCase.client_phone)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-medium text-foreground flex items-center gap-2">
            {selectedCase.client_name || 'Sem nome'}
            {selectedCase.active_agent_id && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                <Bot className="w-3 h-3" />
                IA Ativa
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground">{formatPhone(selectedCase.client_phone)}</p>
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
                  i % 2 === 0 ? "bg-primary/20 w-2/3" : "bg-muted w-1/2"
                )}>
                  <div className="h-4 bg-muted-foreground/20 rounded w-full mb-2" />
                  <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
              <p className="text-muted-foreground/70 text-sm">As mensagens aparecerão aqui quando o cliente iniciar a conversa</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messageGroups.map((group, groupIdx) => (
              <div key={groupIdx}>
                {/* Date Separator */}
                <div className="flex items-center justify-center mb-4">
                  <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
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
                          isAssistant ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isAssistant && (
                          <Avatar className="w-8 h-8 mt-1">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70">
                              <User className="w-4 h-4 text-primary-foreground" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2.5",
                          isAssistant 
                            ? "bg-primary rounded-tr-sm" 
                            : "bg-muted rounded-tl-sm"
                        )}>
                          {msg.media_url && msg.media_type ? (
                            <MediaMessage
                              mediaUrl={msg.media_url}
                              mediaType={msg.media_type}
                              content={msg.content}
                              isAssistant={isAssistant}
                            />
                          ) : (
                            <p className={cn(
                              "text-sm whitespace-pre-wrap break-words",
                              isAssistant ? "text-primary-foreground" : "text-foreground"
                            )}>
                              {msg.content}
                            </p>
                          )}
                          <p className={cn(
                            "text-[10px] mt-1 text-right flex items-center justify-end gap-1",
                            isAssistant ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {format(new Date(msg.created_at), 'HH:mm')}
                            {isAssistant && msg.message_status && (
                              <span className="inline-flex">
                                {msg.message_status === 'read' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                                ) : msg.message_status === 'delivered' ? (
                                  <CheckCheck className="w-3.5 h-3.5" />
                                ) : msg.message_status === 'sent' ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <Clock className="w-3 h-3" />
                                )}
                              </span>
                            )}
                          </p>
                        </div>

                        {isAssistant && (
                          <Avatar className="w-8 h-8 mt-1">
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600">
                              <Bot className="w-4 h-4 text-white" />
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

        {/* Typing indicator */}
        {isContactTyping && (
          <div className="flex gap-2 items-center mt-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70">
                <User className="w-4 h-4 text-primary-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">digitando...</span>
          </div>
        )}
      </ScrollArea>

      {/* Input Area - WhatsApp Style */}
      <div className="p-3 border-t border-border bg-card/50">
        <div className="flex items-end gap-2">
          {/* Emoji Button */}
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-muted-foreground hover:text-foreground shrink-0"
              >
                <Smile className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-80 p-3 bg-card border-border" 
              align="start"
              side="top"
            >
              <div className="grid grid-cols-10 gap-1">
                {commonEmojis.map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded text-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Attachment Dropdown */}
          <Popover open={attachmentOpen} onOpenChange={setAttachmentOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-muted-foreground hover:text-foreground shrink-0"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-48 p-2 bg-card border-border" 
              align="start"
              side="top"
            >
              <div className="space-y-1">
                <button 
                  onClick={() => documentInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-purple-400" />
                  </div>
                  Documento
                </button>
                <button 
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Image className="w-4 h-4 text-blue-400" />
                  </div>
                  Imagem
                </button>
                <button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-pink-400" />
                  </div>
                  Câmera
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Hidden File Inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'image')}
          />
          <input
            ref={documentInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'document')}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraCapture}
          />

          {/* Message Input */}
          <div className="flex-1 relative">
            {/* Selected File Preview */}
            {selectedFile && (
              <div className="mb-2 p-2 bg-muted rounded-lg flex items-center gap-2">
                {selectedFile.type === 'image' && selectedFile.preview ? (
                  <img 
                    src={selectedFile.preview} 
                    alt="Preview" 
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{selectedFile.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={clearSelectedFile}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            <Textarea
              ref={textareaRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem..."
              className="min-h-[44px] max-h-[120px] py-3 pr-12 bg-muted border-border resize-none text-foreground placeholder:text-muted-foreground"
              rows={1}
            />
          </div>

          {/* Send or Mic Button */}
          {messageInput.trim() || selectedFile ? (
            <Button
              size="icon"
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 shrink-0"
              onClick={handleSendMessage}
              disabled={sending}
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-muted-foreground hover:text-foreground shrink-0"
            >
              <Mic className="w-5 h-5" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Mensagens são recebidas automaticamente via WhatsApp
        </p>
      </div>
    </div>
  );
};

export default ChatView;
