import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toaster } from "@/components/ui/basic-toast";
import { useAuth } from "@/contexts/AuthContext";

interface PetitionRequest {
  type: string;
  court?: string;
  parties?: { plaintiff?: string; defendant?: string };
  facts: string;
  legalBasis?: string;
  requests?: string;
  referenceModel?: string;
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
  const { user } = useAuth();

  const saveToHistory = async (documentType: string, inputData: Record<string, any>, outputData: string, title?: string) => {
    if (!user) return;
    try {
      await supabase.from("legal_document_history").insert({
        user_id: user.id,
        document_type: documentType,
        input_data: inputData,
        output_data: outputData,
        title: title || null,
      } as any);
    } catch (e) {
      console.warn("Failed to save document history:", e);
    }
  };

  const callFunction = async (action: string, data: Record<string, any>, docType: string, title?: string) => {
    setIsLoading(true);
    setResult(null);
    try {
      const { data: res, error } = await supabase.functions.invoke("legal-documents", {
        body: { action, data },
      });

      if (error) throw error;
      if (!res?.success) throw new Error(res?.error || "Erro ao processar documento");

      setResult(res.content);
      await saveToHistory(docType, data, res.content, title);
      toaster.create({ title: "Documento gerado!", description: "O resultado está disponível ao lado.", type: "success" });
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

  const generatePetition = (data: PetitionRequest) => callFunction("generate_petition", data, "petition", `${data.type} - ${data.parties?.plaintiff || "Petição"}`);
  const analyzePetition = (text: string) => callFunction("analyze_petition", { text }, "petition_analysis", "Análise de Petição");
  const generateContract = (data: ContractRequest) => callFunction("generate_contract", data, "contract", `Contrato de ${data.type}`);
  const analyzeContract = (text: string) => callFunction("analyze_contract", { text }, "contract_analysis", "Análise de Contrato");

  return { isLoading, result, setResult, generatePetition, analyzePetition, generateContract, analyzeContract };
}
