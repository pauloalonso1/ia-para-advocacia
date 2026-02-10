import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowUpRight, ArrowDownRight, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TransactionInsert } from '@/hooks/useFinancial';
import { Case } from '@/hooks/useCases';

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (tx: TransactionInsert) => Promise<any>;
  cases: Case[];
  revenueCategories: string[];
  expenseCategories: string[];
  paymentMethods: string[];
}

const initialTx: Partial<TransactionInsert> = {
  type: 'revenue',
  category: '',
  description: '',
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  is_paid: false,
  case_id: null,
};

const AddTransactionModal = ({
  open,
  onOpenChange,
  onSubmit,
  cases,
  revenueCategories,
  expenseCategories,
  paymentMethods,
}: AddTransactionModalProps) => {
  const [newTx, setNewTx] = useState<Partial<TransactionInsert>>(initialTx);

  const categories = newTx.type === 'revenue' ? revenueCategories : expenseCategories;

  const handleSubmit = async () => {
    if (!newTx.category || !newTx.description || !newTx.amount) return;
    await onSubmit(newTx as TransactionInsert);
    onOpenChange(false);
    setNewTx(initialTx);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Transação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={newTx.type === 'revenue' ? 'default' : 'outline'}
              className={cn(newTx.type === 'revenue' && 'bg-green-600 hover:bg-green-700')}
              onClick={() => setNewTx(p => ({ ...p, type: 'revenue', category: '' }))}
            >
              <ArrowUpRight className="w-4 h-4 mr-1" />
              Receita
            </Button>
            <Button
              variant={newTx.type === 'expense' ? 'default' : 'outline'}
              className={cn(newTx.type === 'expense' && 'bg-destructive hover:bg-destructive/90')}
              onClick={() => setNewTx(p => ({ ...p, type: 'expense', category: '' }))}
            >
              <ArrowDownRight className="w-4 h-4 mr-1" />
              Despesa
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={newTx.description}
              onChange={e => setNewTx(p => ({ ...p, description: e.target.value }))}
              placeholder="Ex: Honorários caso Silva"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newTx.amount || ''}
                onChange={e => setNewTx(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={newTx.date}
                onChange={e => setNewTx(p => ({ ...p, date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={newTx.category} onValueChange={v => setNewTx(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Método</Label>
              <Select
                value={newTx.payment_method || 'none'}
                onValueChange={v => setNewTx(p => ({ ...p, payment_method: v === 'none' ? null : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {paymentMethods.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vincular a caso (opcional)</Label>
            <Select
              value={newTx.case_id || 'none'}
              onValueChange={v => setNewTx(p => ({ ...p, case_id: v === 'none' ? null : v }))}
            >
              <SelectTrigger><SelectValue placeholder="Nenhum caso" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {cases.filter(c => c.client_name).map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.client_name} — {c.client_phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Vencimento (opcional)</Label>
              <Input
                type="date"
                value={newTx.due_date || ''}
                onChange={e => setNewTx(p => ({ ...p, due_date: e.target.value || null }))}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant={newTx.is_paid ? 'default' : 'outline'}
                className="w-full"
                onClick={() => setNewTx(p => ({ ...p, is_paid: !p.is_paid }))}
              >
                {newTx.is_paid ? <Check className="w-4 h-4 mr-1" /> : <Clock className="w-4 h-4 mr-1" />}
                {newTx.is_paid ? 'Pago' : 'Pendente'}
              </Button>
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Salvar Transação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionModal;
