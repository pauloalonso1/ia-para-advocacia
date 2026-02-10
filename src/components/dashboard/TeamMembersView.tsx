import { useState } from 'react';
import EmptyState from './EmptyState';
import { useTeamMembers, TeamMember, TeamMemberInput } from '@/hooks/useTeamMembers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Users, Plus, Search, Phone, Mail, Loader2, Pencil, Trash2, Scale, Briefcase
} from 'lucide-react';
import { cn, formatPhoneDisplay } from '@/lib/utils';
import TeamMemberFormModal from './team/TeamMemberFormModal';
import DeleteMemberDialog from './team/DeleteMemberDialog';

const emptyForm: TeamMemberInput = {
  name: '', email: '', password: '', phone: '', oab_number: '', specialty: '', role: 'lawyer', is_active: true
};

const TeamMembersView = () => {
  const { members, activeMembers, loading, saving, createMember, updateMember, deleteMember, toggleActive } = useTeamMembers();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState<TeamMemberInput>(emptyForm);

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (member.oab_number?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (member.specialty?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenCreate = () => { setFormData(emptyForm); setIsCreateModalOpen(true); };

  const handleOpenEdit = (member: TeamMember) => {
    setSelectedMember(member);
    setFormData({
      name: member.name, email: member.email, phone: member.phone || '',
      oab_number: member.oab_number || '', specialty: member.specialty || '', is_active: member.is_active
    });
    setIsEditModalOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.password?.trim()) return;
    if ((formData.password?.length || 0) < 6) return;
    const result = await createMember(formData);
    if (result) { setIsCreateModalOpen(false); setFormData(emptyForm); }
  };

  const handleUpdate = async () => {
    if (!selectedMember || !formData.name.trim() || !formData.email.trim()) return;
    const result = await updateMember(selectedMember.id, formData);
    if (result) { setIsEditModalOpen(false); setSelectedMember(null); setFormData(emptyForm); }
  };

  const handleDelete = async () => {
    if (!selectedMember) return;
    const result = await deleteMember(selectedMember.id);
    if (result) { setIsDeleteDialogOpen(false); setSelectedMember(null); }
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
            <Users className="w-6 h-6 text-primary" />
            Equipe
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie os advogados e colaboradores do escritório</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Novo Membro
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{members.length}</p>
              <p className="text-xs text-muted-foreground">Total de membros</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Scale className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeMembers.length}</p>
              <p className="text-xs text-muted-foreground">Membros ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{members.filter(m => m.oab_number).length}</p>
              <p className="text-xs text-muted-foreground">Com OAB registrada</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email, OAB ou especialidade..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

      {/* Members Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Membros da Equipe</CardTitle>
          <CardDescription className="text-muted-foreground">{filteredMembers.length} membro(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={searchQuery ? 'Nenhum membro encontrado' : 'Monte sua equipe'}
              description={
                searchQuery
                  ? 'Nenhum resultado para essa busca. Tente outros termos como nome, email ou OAB.'
                  : 'Cadastre advogados e colaboradores para distribuir leads automaticamente e acompanhar a performance de cada membro.'
              }
              actionLabel={!searchQuery ? 'Adicionar Primeiro Membro' : undefined}
              actionIcon={!searchQuery ? Plus : undefined}
              onAction={!searchQuery ? handleOpenCreate : undefined}
              nextSteps={!searchQuery ? [
                { icon: Users, label: 'Cadastrar membro', description: 'Adicione advogados ao time' },
                { icon: Scale, label: 'Definir OAB', description: 'Registre dados profissionais' },
                { icon: Briefcase, label: 'Atribuir leads', description: 'Distribua casos no CRM' },
              ] : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Nome</TableHead>
                    <TableHead className="text-muted-foreground">Contato</TableHead>
                    <TableHead className="text-muted-foreground">OAB</TableHead>
                    <TableHead className="text-muted-foreground">Especialidade</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id} className="border-border">
                      <TableCell className="font-medium text-foreground">{member.name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Mail className="w-3 h-3" />{member.email}
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                              <Phone className="w-3 h-3" />{formatPhoneDisplay(member.phone)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.oab_number
                          ? <Badge variant="outline" className="text-xs">{member.oab_number}</Badge>
                          : <span className="text-muted-foreground/50 text-sm">-</span>}
                      </TableCell>
                      <TableCell>
                        {member.specialty
                          ? <Badge variant="secondary" className="text-xs">{member.specialty}</Badge>
                          : <span className="text-muted-foreground/50 text-sm">-</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={member.is_active}
                            onCheckedChange={(checked) => toggleActive(member.id, checked)}
                            className="data-[state=checked]:bg-green-500"
                          />
                          <span className={cn("text-xs", member.is_active ? "text-green-500" : "text-muted-foreground")}>
                            {member.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(member)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedMember(member); setIsDeleteDialogOpen(true); }} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <TeamMemberFormModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleCreate}
        saving={saving}
        mode="create"
      />
      <TeamMemberFormModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleUpdate}
        saving={saving}
        mode="edit"
      />
      <DeleteMemberDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        memberName={selectedMember?.name}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default TeamMembersView;
