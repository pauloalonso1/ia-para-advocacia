import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toaster } from "@/components/ui/basic-toast";

interface SearchParams {
  query: string;
  tribunal?: string;
  page?: number;
  limit?: number;
}

export function useResearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [processoDetail, setProcessoDetail] = useState<any>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const callFunction = async (action: string, data: Record<string, any>) => {
    const { data: res, error } = await supabase.functions.invoke("research-jurisprudencia", {
      body: { action, data },
    });

    if (error) throw error;
    if (!res?.success) throw new Error(res?.error || "Erro na pesquisa");
    return res.data;
  };

  const searchProcessos = async (params: SearchParams) => {
    setIsLoading(true);
    setResults(null);
    try {
      const data = await callFunction("search_processo", params);
      setResults(data);
    } catch (e: any) {
      const msg = e.message?.includes("não configurada")
        ? "Configure sua API em Configurações > Pesquisa."
        : e.message || "Erro ao pesquisar";
      toaster.create({ title: "Erro", description: msg, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const searchGeral = async (params: SearchParams) => {
    setIsLoading(true);
    setResults(null);
    try {
      const data = await callFunction("search", params);
      setResults(data);
    } catch (e: any) {
      toaster.create({ title: "Erro", description: e.message || "Erro ao pesquisar", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const getProcesso = async (numeroCnj: string) => {
    setIsLoadingDetail(true);
    setProcessoDetail(null);
    try {
      const data = await callFunction("get_processo", { numero_cnj: numeroCnj });
      setProcessoDetail(data);
      return data;
    } catch (e: any) {
      toaster.create({ title: "Erro", description: e.message || "Erro ao buscar processo", type: "error" });
      return null;
    } finally {
      setIsLoadingDetail(false);
    }
  };

  return { isLoading, results, searchProcessos, searchGeral, getProcesso, processoDetail, isLoadingDetail, setProcessoDetail };
}
