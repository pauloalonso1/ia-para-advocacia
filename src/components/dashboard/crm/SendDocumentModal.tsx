import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  FileSignature,
  Loader2,
  Send,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ZapSignTemplate {
  token: string;
  name: string;
  created_at: string;
}

interface SentDocument {
  id: string;
  doc_token: string;
  template_name: string;
  status: string;
  created_at: string;
  signed_at: string | null;
}

interface SendDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  caseId?: string;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: 'Pendente', icon: Clock, className: 'text-amber-500' },
  opened: { label: 'Aberto', icon: FileText, className: 'text-blue-500' },
  signed: { label: 'Assinado', icon: CheckCircle2, className: 'text-green-500' },
  refused: { label: 'Recusado', icon: XCircle, className: 'text-destructive' },
};

const SendDocumentModal = ({
  open,
  onOpenChange,
  clientName,
  clientPhone,
  clientEmail,
  caseId,
}: SendDocumentModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ZapSignTemplate[]>([]);
  const [sentDocs, setSentDocs] = useState<SentDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [signerName, setSignerName] = useState(clientName || '');
  const [signerPhone, setSignerPhone] = useState(clientPhone || '');
  const [signerEmail, setSignerEmail] = useState(clientEmail || '');
  const [hasZapSign, setHasZapSign] = useState<boolean | null>(null);

  useEffect(() => {
    if (open) {
      setSignerName(clientName || '');
      setSignerPhone(clientPhone || '');
      setSignerEmail(clientEmail || '');
      checkAndLoadTemplates();
      loadSentDocuments();
    }
  }, [open, clientName, clientPhone, clientEmail]);

  const loadSentDocuments = async () => {
    if (!user || !caseId) return;
    const { data } = await supabase
      .from('signed_documents')
      .select('id, doc_token, template_name, status, created_at, signed_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });
    if (data) setSentDocs(data);
  };

  const checkAndLoadTemplates = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: settings } = await supabase
        .from('zapsign_settings')
        .select('is_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!settings || !settings.is_enabled) {
        setHasZapSign(false);
        setLoading(false);
        return;
      }
      setHasZapSign(true);

      const { data, error } = await supabase.functions.invoke('zapsign', {
        body: { action: 'list-templates' },
      });
      if (error) throw error;
      const templateList = data?.results || data || [];
      const parsed = Array.isArray(templateList) ? templateList : [];
      setTemplates(parsed);
      // Auto-select if only one template
      if (parsed.length === 1) {
        setSelectedTemplate(parsed[0].token);
        setSelectedTemplateName(parsed[0].name);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
      toast({ title: 'Erro', description: 'Erro ao carregar templates da ZapSign', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedTemplate || !signerName.trim() || !user) {
      console.log('Send blocked:', { selectedTemplate, signerName: signerName.trim(), user: !!user });
      return;
    }
    setSending(true);
    try {
      console.log('Sending document with template:', selectedTemplate);
      const { data, error } = await supabase.functions.invoke('zapsign', {
        body: {
          action: 'create-from-template',
          template_id: selectedTemplate,
          signer_name: signerName.trim(),
          signer_email: signerEmail.trim() || undefined,
          signer_phone: signerPhone.replace(/\D/g, '') || undefined,
          fields: { nome: signerName.trim() },
        },
      });
      console.log('ZapSign response:', data, error);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Save document to tracking table
      const docToken = data?.token || data?.doc_token || data?.open_id;
      if (docToken) {
        await supabase.from('signed_documents').insert({
          user_id: user.id,
          case_id: caseId || null,
          client_phone: signerPhone.replace(/\D/g, ''),
          client_name: signerName.trim(),
          doc_token: docToken,
          template_name: selectedTemplateName,
          status: 'pending',
        });
      }

      toast({ title: 'Documento enviado!', description: `Documento enviado para assinatura de ${signerName}` });
      await loadSentDocuments();
      setSelectedTemplate(null);
    } catch (err) {
      console.error('Error sending document:', err);
      toast({ title: 'Erro', description: 'Erro ao enviar documento para assinatura', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-primary" />
            Enviar Documento para Assinatura
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : hasZapSign === false ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              ZapSign não configurada. Vá em Configurações → ZapSign para adicionar seu API Token.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Sent documents history */}
            {sentDocs.length > 0 && (
              <div className="space-y-2">
                <Label className="text-foreground text-xs uppercase tracking-wider">Documentos Enviados</Label>
                <div className="space-y-2">
                  {sentDocs.map((doc) => {
                    const cfg = statusConfig[doc.status] || statusConfig.pending;
                    const Icon = cfg.icon;
                    return (
                      <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={cn("w-4 h-4 flex-shrink-0", cfg.className)} />
                          <span className="truncate text-foreground">{doc.template_name || 'Documento'}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={cn("text-xs font-medium", cfg.className)}>{cfg.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(doc.created_at), 'dd/MM', { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Template selection */}
            <div className="space-y-2">
              <Label className="text-foreground">Modelo de Documento</Label>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum template encontrado na sua conta ZapSign.</p>
              ) : (
                <ScrollArea className="max-h-40">
                  <div className="space-y-1">
                    {templates.map((t) => (
                      <button
                        key={t.token}
                        onClick={() => {
                          setSelectedTemplate(t.token);
                          setSelectedTemplateName(t.name);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors border',
                          selectedTemplate === t.token
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'text-foreground hover:bg-muted border-transparent'
                        )}
                      >
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        {t.name}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Signer info */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-foreground text-xs">Nome do Signatário *</Label>
                <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Nome completo" className="bg-muted border-border text-foreground" />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground text-xs">WhatsApp</Label>
                <Input value={signerPhone} onChange={(e) => setSignerPhone(e.target.value)} placeholder="5511999999999" className="bg-muted border-border text-foreground" />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground text-xs">Email (opcional)</Label>
                <Input value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="email@exemplo.com" className="bg-muted border-border text-foreground" />
              </div>
            </div>

            <Button onClick={handleSend} disabled={sending || !selectedTemplate || !signerName.trim()} className="w-full">
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar para Assinatura
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SendDocumentModal;
