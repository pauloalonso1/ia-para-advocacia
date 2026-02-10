import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { TeamMemberInput } from '@/hooks/useTeamMembers';

const specialties = [
  'Trabalhista', 'Família', 'Criminal', 'Cível', 'Empresarial',
  'Tributário', 'Imobiliário', 'Previdenciário', 'Consumidor', 'Outro'
];

interface TeamMemberFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: TeamMemberInput;
  onFormChange: (data: TeamMemberInput) => void;
  onSubmit: () => void;
  saving: boolean;
  mode: 'create' | 'edit';
}

const TeamMemberFormModal = ({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
  saving,
  mode,
}: TeamMemberFormModalProps) => {
  const isCreate = mode === 'create';

  const updateField = (field: keyof TeamMemberInput, value: string | boolean) => {
    onFormChange({ ...formData, [field]: value });
  };

  const isValid = isCreate
    ? formData.name.trim() && formData.email.trim() && formData.password?.trim() && (formData.password?.length || 0) >= 6
    : formData.name.trim() && formData.email.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isCreate ? 'Novo Usuário' : 'Editar Membro'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isCreate
              ? 'Cadastre um novo usuário com acesso à plataforma'
              : 'Atualize as informações do membro'}
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
            <Label className="text-foreground">Email *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="email@escritorio.com"
              className="bg-background border-border"
            />
          </div>
          {isCreate && (
            <>
              <div className="space-y-2">
                <Label className="text-foreground">Senha *</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="bg-background border-border"
                />
                {formData.password && formData.password.length < 6 && (
                  <p className="text-xs text-destructive">A senha deve ter pelo menos 6 caracteres</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Função *</Label>
                <Select
                  value={formData.role || 'lawyer'}
                  onValueChange={(value) => updateField('role', value)}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="lawyer">Advogado</SelectItem>
                    <SelectItem value="assistant">Assistente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label className="text-foreground">Telefone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="(11) 99999-9999"
              className="bg-background border-border"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Número OAB</Label>
              <Input
                value={formData.oab_number}
                onChange={(e) => updateField('oab_number', e.target.value)}
                placeholder="Ex: 123456/SP"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Especialidade</Label>
              <Select
                value={formData.specialty}
                onValueChange={(value) => updateField('specialty', value)}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {specialties.map(spec => (
                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={saving || !isValid}
            className="bg-primary hover:bg-primary/90"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isCreate ? 'Criar Usuário' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TeamMemberFormModal;
