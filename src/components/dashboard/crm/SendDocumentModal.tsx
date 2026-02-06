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
} from 'lucide-react';

interface ZapSignTemplate {
  token: string;
  name: string;
  created_at: string;
}

interface SendDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
}

const SendDocumentModal = ({
  open,
  onOpenChange,
  clientName,
  clientPhone,
  clientEmail,
}: SendDocumentModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ZapSignTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
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
    }
  }, [open, clientName, clientPhone, clientEmail]);

  const checkAndLoadTemplates = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Check if ZapSign is configured
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

      // Load templates
      const { data, error } = await supabase.functions.invoke('zapsign', {
        body: { action: 'list-templates' },
      });

      if (error) throw error;

      // ZapSign returns { results: [...] } or array directly
      const templateList = data?.results || data || [];
      setTemplates(Array.isArray(templateList) ? templateList : []);
    } catch (err) {
      console.error('Error loading templates:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar templates da ZapSign',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedTemplate || !signerName.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('zapsign', {
        body: {
          action: 'create-from-template',
          template_id: selectedTemplate,
          signer_name: signerName.trim(),
          signer_email: signerEmail.trim() || undefined,
          signer_phone: signerPhone.replace(/\D/g, '') || undefined,
          fields: {
            nome: signerName.trim(),
          },
        },
      });

      if (error) throw error;

      toast({
        title: 'Documento enviado!',
        description: `Documento enviado para assinatura de ${signerName}`,
      });
      onOpenChange(false);
    } catch (err) {
      console.error('Error sending document:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar documento para assinatura',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
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
            {/* Template selection */}
            <div className="space-y-2">
              <Label className="text-foreground">Modelo de Documento</Label>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum template encontrado na sua conta ZapSign.
                </p>
              ) : (
                <ScrollArea className="max-h-40">
                  <div className="space-y-1">
                    {templates.map((t) => (
                      <button
                        key={t.token}
                        onClick={() => setSelectedTemplate(t.token)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                          selectedTemplate === t.token
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'text-foreground hover:bg-muted border border-transparent'
                        }`}
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
                <Input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Nome completo"
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground text-xs">WhatsApp</Label>
                <Input
                  value={signerPhone}
                  onChange={(e) => setSignerPhone(e.target.value)}
                  placeholder="5511999999999"
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground text-xs">Email (opcional)</Label>
                <Input
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="bg-muted border-border text-foreground"
                />
              </div>
            </div>

            <Button
              onClick={handleSend}
              disabled={sending || !selectedTemplate || !signerName.trim()}
              className="w-full"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar para Assinatura
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SendDocumentModal;
