import { useState } from 'react';
import { useAgents, Agent } from '@/hooks/useAgents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AgentCard from './AgentCard';
import CreateAgentModal from './CreateAgentModal';
import EditAgentModal from './EditAgentModal';
import { Plus, Search, Bot, Loader2 } from 'lucide-react';
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
  const { agents, loading, createAgent, updateAgent, deleteAgent } = useAgents();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [createModalOpen, setCreateModalOpen] = useState(false);
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

  const handleConfirmDelete = async () => {
    if (deletingAgentId) {
      await deleteAgent(deletingAgentId);
      setDeletingAgentId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Agentes IA</h1>
          <p className="text-slate-400">Gerencie seus agentes de automação para WhatsApp</p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Agente
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Total de Agentes</p>
          <p className="text-2xl font-bold text-white">{agents.length}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Agentes Ativos</p>
          <p className="text-2xl font-bold text-emerald-400">{agents.filter(a => a.is_active).length}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Agentes Inativos</p>
          <p className="text-2xl font-bold text-slate-400">{agents.filter(a => !a.is_active).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar agentes..."
            className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-slate-800/50 border-slate-700 text-white">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat} className="text-white hover:bg-slate-700">
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : filteredAgents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={setEditingAgent}
              onDelete={setDeletingAgentId}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Bot className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300">Nenhum agente encontrado</h3>
          <p className="text-slate-500 mt-1">
            {searchTerm || categoryFilter !== 'Todos' 
              ? 'Tente ajustar os filtros de busca'
              : 'Crie seu primeiro agente para começar'
            }
          </p>
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

      <AlertDialog open={!!deletingAgentId} onOpenChange={(open) => !open && setDeletingAgentId(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir Agente</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir este agente? Esta ação não pode ser desfeita.
              Todas as regras, roteiros e FAQs associados serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
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
