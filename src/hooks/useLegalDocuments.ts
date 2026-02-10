import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toaster } from "@/components/ui/basic-toast";

interface PetitionRequest {
  type: string;
  court?: string;
  parties?: { plaintiff?: string; defendant?: string };
  facts: string;
  legalBasis?: string;
  requests?: string;
}

interface ContractRequest {
  type: string;
  partiesInfo?: string;
  clauses?: string;
  value?: string;
  duration?: string;
}

export function useLegalDocuments() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const callFunction = async (action: string, data: Record<string, any>) => {
    setIsLoading(true);
    setResult(null);
    try {
      const { data: res, error } = await supabase.functions.invoke("legal-documents", {
        body: { action, data },
      });

      if (error) throw error;
      if (!res?.success) throw new Error(res?.error || "Erro ao processar documento");

      setResult(res.content);
      return res.content as string;
    } catch (e: any) {
      const msg =
        e.message?.includes("429")
          ? "Limite de requisições excedido. Tente novamente em alguns minutos."
          : e.message?.includes("402")
          ? "Créditos de IA insuficientes."
          : e.message || "Erro ao gerar documento";
      toaster.create({ title: "Erro", description: msg, type: "error" });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const generatePetition = (data: PetitionRequest) => callFunction("generate_petition", data);
  const analyzePetition = (text: string) => callFunction("analyze_petition", { text });
  const generateContract = (data: ContractRequest) => callFunction("generate_contract", data);
  const analyzeContract = (text: string) => callFunction("analyze_contract", { text });

  return { isLoading, result, setResult, generatePetition, analyzePetition, generateContract, analyzeContract };
}
