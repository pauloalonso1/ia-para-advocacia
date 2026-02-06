import { useState } from 'react';
import { Case } from '@/hooks/useCases';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Phone, Calendar, Bot } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CRMListViewProps {
  cases: Case[];
  onCaseClick: (caseItem: Case) => void;
}

const statusColors: Record<string, string> = {
  'Novo Contato': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Em Atendimento': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Qualificado': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Não Qualificado': 'bg-destructive/20 text-destructive border-destructive/30',
  'Convertido': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Arquivado': 'bg-muted text-muted-foreground border-border',
};

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

const CRMListView = ({ cases, onCaseClick }: CRMListViewProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected = cases.length > 0 && selectedIds.size === cases.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < cases.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cases.map(c => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExport = () => {
    const toExport = cases.filter(c => selectedIds.has(c.id));
    if (toExport.length === 0) {
      toast.error('Selecione pelo menos um contato para exportar');
      return;
    }

    const headers = ['Nome', 'Telefone', 'Status', 'Última Mensagem', 'Criado em', 'Atualizado em'];
    const rows = toExport.map(c => [
      c.client_name || 'Sem nome',
      formatPhone(c.client_phone),
      c.status || 'Novo Contato',
      (c.last_message || '').replace(/"/g, '""'),
      format(new Date(c.created_at), 'dd/MM/yyyy HH:mm'),
      format(new Date(c.updated_at), 'dd/MM/yyyy HH:mm'),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`${toExport.length} contato(s) exportado(s)`);
  };

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
          <span className="text-sm text-foreground">
            <strong>{selectedIds.size}</strong> contato(s) selecionado(s)
          </span>
          <Button size="sm" onClick={handleExport} className="bg-primary hover:bg-primary/90">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      // indeterminate state
                      (el as any).indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead className="text-muted-foreground">Nome</TableHead>
              <TableHead className="text-muted-foreground">Telefone</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Última Mensagem</TableHead>
              <TableHead className="text-muted-foreground">Agente IA</TableHead>
              <TableHead className="text-muted-foreground">Atualizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Nenhum lead encontrado
                </TableCell>
              </TableRow>
            ) : (
              cases.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => onCaseClick(c)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(c.id)}
                      onCheckedChange={() => toggleOne(c.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {c.client_name || 'Sem nome'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {formatPhone(c.client_phone)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs font-medium',
                        statusColors[c.status || 'Novo Contato'] || statusColors['Novo Contato']
                      )}
                    >
                      {c.status || 'Novo Contato'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {c.last_message || '—'}
                  </TableCell>
                  <TableCell>
                    {c.active_agent_id ? (
                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                        <Bot className="w-3.5 h-3.5" />
                        Ativo
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Manual</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(c.updated_at), 'dd/MM HH:mm', { locale: ptBR })}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CRMListView;
