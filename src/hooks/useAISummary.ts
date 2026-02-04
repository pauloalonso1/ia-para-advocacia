import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAISummary = () => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const { toast } = useToast();

  const generateSummary = async (caseId: string) => {
    setLoading(true);
    setSummary(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: { caseId }
      });

      if (error) throw error;

      setSummary(data.summary);
      return data.summary;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Error generating summary:', errorMessage);
      toast({
        title: 'Erro ao gerar resumo',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearSummary = () => {
    setSummary(null);
  };

  return {
    loading,
    summary,
    generateSummary,
    clearSummary
  };
};
