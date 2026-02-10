import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { ContactInput } from '@/hooks/useContacts';

interface ContactFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: ContactInput;
  onFormChange: (data: ContactInput) => void;
  onSubmit: () => void;
  saving: boolean;
  mode: 'create' | 'edit';
}

const ContactFormModal = ({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
  saving,
  mode,
}: ContactFormModalProps) => {
  const isCreate = mode === 'create';
  const title = isCreate ? 'Novo Contato' : 'Editar Contato';
  const description = isCreate
    ? 'Adicione um novo contato ao seu CRM'
    : 'Atualize as informações do contato';
  const submitLabel = isCreate ? 'Salvar Contato' : 'Salvar Alterações';

  const updateField = (field: keyof ContactInput, value: string) => {
    onFormChange({ ...formData, [field]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-foreground">Nome *</Label>
            <Input
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Nome completo"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Celular *</Label>
            <Input
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="(11) 99999-9999"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="email@exemplo.com"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Empresa</Label>
            <Input
              value={formData.company}
              onChange={(e) => updateField('company', e.target.value)}
              placeholder="Nome da empresa"
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Anotações sobre o contato..."
              className="bg-background border-border min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={saving || !formData.name.trim() || !formData.phone.trim()}
            className="bg-primary hover:bg-primary/90"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContactFormModal;
