import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toaster } from "@/components/ui/basic-toast";

export interface PetitionTemplate {
  id: string;
  title: string;
  content: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export function usePetitionTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<PetitionTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("petition_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTemplates((data as any[]) || []);
    } catch (e: any) {
      console.error("Error fetching templates:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const saveTemplate = async (title: string, content: string, category?: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("petition_templates").insert({
        user_id: user.id,
        title,
        content,
        category: category || null,
      } as any);
      if (error) throw error;
      toaster.create({ title: "Modelo salvo!", type: "success" });
      await fetchTemplates();
    } catch (e: any) {
      toaster.create({ title: "Erro ao salvar modelo", description: e.message, type: "error" });
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase.from("petition_templates").delete().eq("id", id);
      if (error) throw error;
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toaster.create({ title: "Modelo excluído", type: "success" });
    } catch (e: any) {
      toaster.create({ title: "Erro ao excluir", description: e.message, type: "error" });
    }
  };

  const updateTemplate = async (id: string, title: string, content: string) => {
    try {
      const { error } = await supabase
        .from("petition_templates")
        .update({ title, content } as any)
        .eq("id", id);
      if (error) throw error;
      toaster.create({ title: "Modelo atualizado!", type: "success" });
      await fetchTemplates();
    } catch (e: any) {
      toaster.create({ title: "Erro ao atualizar", description: e.message, type: "error" });
    }
  };

  return { templates, isLoading, fetchTemplates, saveTemplate, deleteTemplate, updateTemplate };
}
