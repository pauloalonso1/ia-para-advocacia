import { useState, useEffect } from 'react';
import EmptyState from './EmptyState';
import { useContacts, Contact, ContactInput } from '@/hooks/useContacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Contact as ContactIcon,
  Plus,
  Search,
  Phone,
  Mail,
  Building2,
  Loader2,
  Pencil,
  Trash2,
  UserPlus,
  MessageSquare
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfilePictures } from '@/hooks/useProfilePictures';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ContactsView = () => {
  const { contacts, loading, saving, createContact, updateContact, deleteContact, searchContacts } = useContacts();
  const { pictures, fetchMultiple } = useProfilePictures();
  
  // Fetch profile pictures for WhatsApp contacts
  useEffect(() => {
    const whatsappPhones = contacts
      .filter(c => c.source === 'whatsapp' && c.phone)
      .map(c => c.phone);
    if (whatsappPhones.length > 0) {
      fetchMultiple(whatsappPhones);
    }
  }, [contacts, fetchMultiple]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Form state
  const [formData, setFormData] = useState<ContactInput>({
    name: '',
    phone: '',
    email: '',
    company: '',
    notes: '',
    source: 'manual'
  });

  const filteredContacts = searchQuery ? searchContacts(searchQuery) : contacts;

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      company: '',
      notes: '',
      source: 'manual'
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      name: contact.name,
      phone: formatPhoneDisplay(contact.phone),
      email: contact.email || '',
      company: contact.company || '',
      notes: contact.notes || '',
      source: contact.source
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDeleteDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) return;
    
    const result = await createContact(formData);
    if (result) {
      setIsCreateModalOpen(false);
      resetForm();
    }
  };

  const handleUpdate = async () => {
    if (!selectedContact || !formData.name.trim() || !formData.phone.trim()) return;
    
    const result = await updateContact(selectedContact.id, formData);
    if (result) {
      setIsEditModalOpen(false);
      setSelectedContact(null);
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!selectedContact) return;
    
    const result = await deleteContact(selectedContact.id);
    if (result) {
      setIsDeleteDialogOpen(false);
      setSelectedContact(null);
    }
  };

  const formatPhoneDisplay = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const getSourceBadge = (source: string) => {
    const sources: Record<string, { label: string; className: string }> = {
      manual: { label: 'Manual', className: 'bg-muted text-muted-foreground' },
      whatsapp: { label: 'WhatsApp', className: 'bg-green-500/20 text-green-600 dark:text-green-400' },
      website: { label: 'Website', className: 'bg-blue-500/20 text-blue-600 dark:text-blue-400' },
      referral: { label: 'Indicação', className: 'bg-purple-500/20 text-purple-600 dark:text-purple-400' }
    };
    
    const sourceInfo = sources[source] || sources.manual;
    return (
      <Badge variant="outline" className={cn('text-xs', sourceInfo.className)}>
        {sourceInfo.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ContactIcon className="w-6 h-6 text-primary" />
            Contatos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus leads e contatos
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Novo Contato
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{contacts.length}</p>
              <p className="text-xs text-muted-foreground">Total de contatos</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {contacts.filter(c => c.source === 'whatsapp').length}
              </p>
              <p className="text-xs text-muted-foreground">Via WhatsApp</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone, email ou empresa..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

      {/* Contacts List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* List Header */}
        <div className="px-6 py-2 text-sm flex items-center text-muted-foreground border-b border-border bg-muted/30 sticky top-0 z-10">
          <div className="flex-grow">Nome</div>
          <div className="w-40 shrink-0 hidden md:block">Telefone</div>
          <div className="w-44 shrink-0 hidden lg:block">Email</div>
          <div className="w-32 shrink-0 hidden lg:block">Empresa</div>
          <div className="w-24 shrink-0 hidden sm:block">Origem</div>
          <div className="w-24 shrink-0 hidden sm:block">Data</div>
          <div className="w-20 shrink-0 text-right">Ações</div>
        </div>

        {filteredContacts.length === 0 ? (
          <EmptyState
            icon={ContactIcon}
            title={searchQuery ? 'Nenhum contato encontrado' : 'Comece a construir sua base'}
            description={
              searchQuery
                ? 'Nenhum resultado para essa busca. Tente outro nome, telefone ou email.'
                : 'Seus leads e contatos aparecerão aqui. Adicione manualmente ou conecte o WhatsApp para importar automaticamente.'
            }
            actionLabel={!searchQuery ? 'Adicionar Primeiro Contato' : undefined}
            actionIcon={!searchQuery ? Plus : undefined}
            onAction={!searchQuery ? handleOpenCreate : undefined}
            nextSteps={!searchQuery ? [
              { icon: UserPlus, label: 'Criar contato', description: 'Adicione leads manualmente' },
              { icon: MessageSquare, label: 'Conectar WhatsApp', description: 'Importação automática' },
              { icon: ContactIcon, label: 'Organizar CRM', description: 'Gerencie o funil de vendas' },
            ] : undefined}
          />
        ) : (
          <div className="w-full">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="w-full flex items-center py-3 px-6 border-b border-border/50 hover:bg-muted/30 text-sm last:border-b-0 transition-colors"
              >
                {/* Name + Avatar */}
                <div className="flex-grow flex items-center gap-3 overflow-hidden min-w-0">
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9">
                      {pictures[contact.phone] && (
                        <AvatarImage src={pictures[contact.phone]!} alt={contact.name} className="object-cover" />
                      )}
                      <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                        {contact.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className="absolute -end-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-card"
                      style={{ backgroundColor: contact.source === 'whatsapp' ? '#00cc66' : '#969696' }}
                    />
                  </div>
                  <div className="flex flex-col items-start overflow-hidden min-w-0">
                    <span className="font-medium truncate w-full text-foreground">{contact.name}</span>
                    <span className="text-xs text-muted-foreground truncate w-full md:hidden">
                      {formatPhoneDisplay(contact.phone)}
                    </span>
                  </div>
                </div>

                {/* Phone */}
                <div className="w-40 shrink-0 text-muted-foreground hidden md:flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{formatPhoneDisplay(contact.phone)}</span>
                </div>

                {/* Email */}
                <div className="w-44 shrink-0 text-muted-foreground hidden lg:flex items-center gap-1.5 overflow-hidden">
                  {contact.email ? (
                    <>
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </div>

                {/* Company */}
                <div className="w-32 shrink-0 text-muted-foreground hidden lg:flex items-center gap-1.5 overflow-hidden">
                  {contact.company ? (
                    <>
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{contact.company}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </div>

                {/* Source */}
                <div className="w-24 shrink-0 hidden sm:block">
                  {getSourceBadge(contact.source)}
                </div>

                {/* Date */}
                <div className="w-24 shrink-0 text-xs text-muted-foreground hidden sm:block">
                  {format(new Date(contact.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </div>

                {/* Actions */}
                <div className="w-20 shrink-0 flex items-center justify-end gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(contact)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDelete(contact)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer count */}
        {filteredContacts.length > 0 && (
          <div className="px-6 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            {filteredContacts.length} contato(s)
          </div>
        )}
      </div>

      {/* Create Contact Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Novo Contato</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Adicione um novo contato ao seu CRM
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">Celular *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company" className="text-foreground">Empresa</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Nome da empresa"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-foreground">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Anotações sobre o contato..."
                className="bg-background border-border min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={saving || !formData.name.trim() || !formData.phone.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Contato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Contato</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Atualize as informações do contato
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-foreground">Nome *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone" className="text-foreground">Celular *</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-foreground">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-company" className="text-foreground">Empresa</Label>
              <Input
                id="edit-company"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Nome da empresa"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes" className="text-foreground">Observações</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Anotações sobre o contato..."
                className="bg-background border-border min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={saving || !formData.name.trim() || !formData.phone.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir Contato</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir "{selectedContact?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContactsView;
