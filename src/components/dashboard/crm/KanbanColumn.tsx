import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Case } from '@/hooks/useCases';
import { Badge } from '@/components/ui/badge';
import { Phone, Bot, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  cases: Case[];
  onCaseClick: (caseItem: Case) => void;
}

const KanbanColumn = ({ id, title, color, cases, onCaseClick }: KanbanColumnProps) => {
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

  return (
    <div className="flex-shrink-0 w-80 bg-muted/30 rounded-xl flex flex-col max-h-full">
      {/* Column Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", color)} />
            <h3 className="font-semibold text-foreground">{title}</h3>
          </div>
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            {cases.length}
          </Badge>
        </div>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 p-3 space-y-3 overflow-y-auto min-h-[200px] transition-colors",
              snapshot.isDraggingOver && "bg-primary/5"
            )}
          >
            {cases.map((caseItem, index) => (
              <Draggable key={caseItem.id} draggableId={caseItem.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onCaseClick(caseItem)}
                    className={cn(
                      "bg-card border border-border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
                      snapshot.isDragging && "shadow-lg border-primary rotate-2"
                    )}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">
                          {caseItem.client_name || 'Lead sem nome'}
                        </h4>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
                          <Phone className="w-3 h-3" />
                          <span>{formatPhone(caseItem.client_phone)}</span>
                        </div>
                      </div>
                      {caseItem.active_agent_id && (
                        <Badge className="bg-primary/20 text-primary border-0 shrink-0">
                          <Bot className="w-3 h-3 mr-1" />
                          IA
                        </Badge>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Clock className="w-3 h-3" />
                      <span>
                        {format(new Date(caseItem.updated_at), "dd MMM 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            
            {cases.length === 0 && (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
                Arraste leads aqui
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
