import { useState } from 'react';
import { useAgents, Agent } from '@/hooks/useAgents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AgentCard from './AgentCard';
import CreateAgentModal from './CreateAgentModal';
import EditAgentModal from './EditAgentModal';
import AgentsTutorialModal from './AgentsTutorialModal';
import { Plus, Search, Bot, Loader2, Sparkles, HelpCircle } from 'lucide-react';
import { NeonButton } from '@/components/ui/neon-button';
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

const categories = ['Todos', 'Imobiliário', 'Família', 'Trabalhista', 'Criminal', 'Empresarial', 'Tributário', 'Consumidor', 'Outro'];

const AgentsView = () => {
  const { agents, loading, createAgent, updateAgent, deleteAgent, setDefaultAgent } = useAgents();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [tutorialModalOpen, setTutorialModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'Todos' || agent.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateAgent(id, { is_active: isActive });
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultAgent(id);
  };

  const handleConfirmDelete = async () => {
    if (deletingAgentId) {
      await deleteAgent(deletingAgentId);
      setDeletingAgentId(null);
    }
  };

  const activeAgents = agents.filter(a => a.is_active).length;
  const totalAgents = agents.length;
  const defaultAgent = agents.find(a => a.is_default);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Agentes IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus agentes de automação para WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NeonButton
            variant="default"
            onClick={() => setTutorialModalOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="w-4 h-4 mr-2 inline" />
            Tutorial
          </NeonButton>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Agente
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total de Agentes</p>
              <p className="text-3xl font-bold text-foreground mt-1">{totalAgents}</p>
            </div>
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
        </div>
        
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary/80 text-sm">Agentes Ativos</p>
              <p className="text-3xl font-bold text-primary mt-1">{activeAgents}</p>
            </div>
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Agente Padrão</p>
              <p className="text-lg font-medium text-foreground mt-1 truncate">
                {defaultAgent?.name || 'Não definido'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar agentes..."
            className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-card border-border text-foreground">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat} className="text-foreground hover:bg-accent focus:bg-accent">
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando agentes...</p>
          </div>
        </div>
      ) : filteredAgents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={setEditingAgent}
              onDelete={setDeletingAgentId}
              onToggleActive={handleToggleActive}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">Nenhum agente encontrado</h3>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
            {searchTerm || categoryFilter !== 'Todos' 
              ? 'Tente ajustar os filtros de busca'
              : 'Crie seu primeiro agente para começar a automatizar atendimentos'
            }
          </p>
          {!searchTerm && categoryFilter === 'Todos' && (
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="mt-6 bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Agente
            </Button>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateAgentModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={createAgent}
      />

      <EditAgentModal
        agent={editingAgent}
        open={!!editingAgent}
        onOpenChange={(open) => !open && setEditingAgent(null)}
      />

      <AgentsTutorialModal
        open={tutorialModalOpen}
        onOpenChange={setTutorialModalOpen}
      />

      <AlertDialog open={!!deletingAgentId} onOpenChange={(open) => !open && setDeletingAgentId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir Agente</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir este agente? Esta ação não pode ser desfeita.
              Todas as regras, roteiros e FAQs associados serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary text-secondary-foreground border-border hover:bg-muted">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgentsView;
