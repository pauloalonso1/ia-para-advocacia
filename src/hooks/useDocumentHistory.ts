import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toaster } from "@/components/ui/basic-toast";

export interface DocHistoryItem {
  id: string;
  document_type: string;
  title: string | null;
  input_data: any;
  output_data: string;
  is_favorite: boolean;
  created_at: string;
}

interface Filters {
  type?: string;
  search?: string;
  favoritesOnly?: boolean;
}

export function useDocumentHistory() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = useCallback(async (filters?: Filters) => {
    if (!user) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from("legal_document_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (filters?.type) query = query.eq("document_type", filters.type);
      if (filters?.favoritesOnly) query = query.eq("is_favorite", true);
      if (filters?.search) query = query.ilike("title", `%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      setDocuments((data as DocHistoryItem[]) || []);
    } catch (e: any) {
      console.error("Error fetching documents:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const toggleFavorite = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from("legal_document_history")
        .update({ is_favorite: !current } as any)
        .eq("id", id);
      if (error) throw error;
      setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, is_favorite: !current } : d)));
    } catch (e: any) {
      toaster.create({ title: "Erro", description: e.message, type: "error" });
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const { error } = await supabase.from("legal_document_history").delete().eq("id", id);
      if (error) throw error;
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toaster.create({ title: "Removido", description: "Documento excluído.", type: "success" });
    } catch (e: any) {
      toaster.create({ title: "Erro", description: e.message, type: "error" });
    }
  };

  return { documents, isLoading, fetchDocuments, toggleFavorite, deleteDocument };
}
