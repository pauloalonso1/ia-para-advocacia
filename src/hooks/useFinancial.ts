import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface FinancialTransaction {
  id: string;
  user_id: string;
  case_id: string | null;
  type: 'revenue' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
  payment_method: string | null;
  is_paid: boolean;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type TransactionInsert = Omit<FinancialTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

const REVENUE_CATEGORIES = [
  'Honorários', 'Consultoria', 'Contrato', 'Acordo', 'Perícia', 'Outros'
];

const EXPENSE_CATEGORIES = [
  'Aluguel', 'Pessoal', 'Tecnologia', 'Marketing', 'Cartório', 'Custas Judiciais', 'Impostos', 'Outros'
];

const PAYMENT_METHODS = ['PIX', 'Cartão', 'Boleto', 'Transferência', 'Dinheiro'];

export const useFinancial = () => {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTransactions = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions((data as any[]) || []);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar transações', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (tx: TransactionInsert) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert({ ...tx, user_id: user.id } as any)
        .select()
        .single();

      if (error) throw error;
      setTransactions(prev => [data as any, ...prev]);
      toast({ title: 'Transação adicionada' });
      return data;
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar transação', description: error.message, variant: 'destructive' });
    }
  };

  const updateTransaction = async (id: string, updates: Partial<TransactionInsert>) => {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } as FinancialTransaction : t));
      toast({ title: 'Transação atualizada' });
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast({ title: 'Transação excluída' });
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonth = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const lastMonth = transactions.filter(t => {
      const d = new Date(t.date);
      const lm = currentMonth === 0 ? 11 : currentMonth - 1;
      const ly = currentMonth === 0 ? currentYear - 1 : currentYear;
      return d.getMonth() === lm && d.getFullYear() === ly;
    });

    const totalRevenue = thisMonth.filter(t => t.type === 'revenue').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = thisMonth.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const lastRevenue = lastMonth.filter(t => t.type === 'revenue').reduce((sum, t) => sum + Number(t.amount), 0);
    const lastExpenses = lastMonth.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

    const pending = transactions.filter(t => !t.is_paid && t.type === 'revenue').reduce((sum, t) => sum + Number(t.amount), 0);
    const overdue = transactions.filter(t => !t.is_paid && t.due_date && new Date(t.due_date) < now).reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totalRevenue,
      totalExpenses,
      profit: totalRevenue - totalExpenses,
      lastRevenue,
      lastExpenses,
      pending,
      overdue,
      revenueChange: lastRevenue > 0 ? ((totalRevenue - lastRevenue) / lastRevenue * 100) : 0,
      expenseChange: lastExpenses > 0 ? ((totalExpenses - lastExpenses) / lastExpenses * 100) : 0,
    };
  }, [transactions]);

  // Monthly data for charts (last 6 months)
  const monthlyData = useMemo(() => {
    const months: { month: string; revenue: number; expenses: number; profit: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleDateString('pt-BR', { month: 'short' });
      const monthTxs = transactions.filter(t => {
        const td = new Date(t.date);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      });

      const revenue = monthTxs.filter(t => t.type === 'revenue').reduce((s, t) => s + Number(t.amount), 0);
      const expenses = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

      months.push({ month: monthName, revenue, expenses, profit: revenue - expenses });
    }

    return months;
  }, [transactions]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const now = new Date();
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const revenueByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};

    thisMonth.forEach(t => {
      const map = t.type === 'revenue' ? revenueByCategory : expenseByCategory;
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    });

    return { revenueByCategory, expenseByCategory };
  }, [transactions]);

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  return {
    transactions,
    loading,
    metrics,
    monthlyData,
    categoryBreakdown,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
    REVENUE_CATEGORIES,
    EXPENSE_CATEGORIES,
    PAYMENT_METHODS,
  };
};
