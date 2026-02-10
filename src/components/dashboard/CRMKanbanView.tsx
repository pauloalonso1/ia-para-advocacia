import { useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useCases, Case } from '@/hooks/useCases';
import KanbanColumn from './crm/KanbanColumn';
import CRMListView from './crm/CRMListView';
import LeadDetailModal from './crm/LeadDetailModal';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { LayoutGrid, List, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CRMKanbanViewProps {
  onOpenConversation?: (caseItem: Case) => void;
}

const crmStages = [
  { id: 'Novo Contato', label: 'Novo Contato', color: 'bg-blue-500' },
  { id: 'Em Atendimento', label: 'Em Atendimento', color: 'bg-amber-500' },
  { id: 'Qualificado', label: 'Qualificado', color: 'bg-green-500' },
  { id: 'Não Qualificado', label: 'Não Qualificado', color: 'bg-destructive' },
  { id: 'Convertido', label: 'Convertido', color: 'bg-purple-500' },
  { id: 'Arquivado', label: 'Arquivado', color: 'bg-muted-foreground' },
];

const CRMKanbanView = ({ onOpenConversation }: CRMKanbanViewProps) => {
  const { cases, loading, updateCaseStatus, assignAgentToCase, refetch } = useCases();
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const getCasesByStatus = (status: string) => {
    return cases.filter(c => (c.status || 'Novo Contato') === status);
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    if (destination.droppableId !== source.droppableId) {
      updateCaseStatus(draggableId, destination.droppableId);
    }
  };

  const handleCaseClick = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setIsModalOpen(true);
  };

  const handleOpenConversation = (caseItem: Case) => {
    if (onOpenConversation) {
      onOpenConversation(caseItem);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-96 w-80 shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <LayoutGrid className="w-7 h-7 text-primary" />
              CRM
            </h1>
            <p className="text-muted-foreground mt-1">
              {viewMode === 'kanban'
                ? 'Gerencie seus leads arrastando entre as etapas do funil'
                : 'Visualize, selecione e exporte seus leads'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'kanban' | 'list')}>
              <TabsList className="bg-muted">
                <TabsTrigger value="kanban" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
                  <LayoutGrid className="w-4 h-4" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="list" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
                  <List className="w-4 h-4" />
                  Lista
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={refetch} className="border-border">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'kanban' ? (
        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-4 pb-4">
                {crmStages.map((stage) => (
                  <KanbanColumn
                    key={stage.id}
                    id={stage.id}
                    title={stage.label}
                    color={stage.color}
                    cases={getCasesByStatus(stage.id)}
                    onCaseClick={handleCaseClick}
                  />
                ))}
              </div>
            </DragDropContext>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6">
            <CRMListView cases={cases} onCaseClick={handleCaseClick} />
          </div>
        </ScrollArea>
      )}

      {/* Lead Detail Modal */}
      <LeadDetailModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedCase={selectedCase}
        onUpdateStatus={updateCaseStatus}
        onAssignAgent={assignAgentToCase}
        onOpenConversation={handleOpenConversation}
      />
    </div>
  );
};

export default CRMKanbanView;
