import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  source_type: string;
  file_name: string | null;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

const SUPPORTED_FILE_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/msword': 'DOC',
  'text/plain': 'TXT',
  'text/markdown': 'MD',
  'text/csv': 'CSV',
};

export const useKnowledgeBase = (agentId?: string | null) => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('knowledge_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (agentId === 'global') {
        query = query.is('agent_id', null);
      } else if (agentId) {
        query = query.or(`agent_id.eq.${agentId},agent_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [user, agentId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Ingest plain text document
  const ingestDocument = async (
    title: string,
    content: string,
    targetAgentId?: string | null,
    sourceType = 'manual',
    fileName?: string
  ) => {
    setIngesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('rag-ingest', {
        body: {
          action: 'ingest',
          title,
          content,
          agentId: targetAgentId || null,
          sourceType,
          fileName,
        },
      });

      if (error) throw error;

      toast({
        title: 'Documento indexado!',
        description: `"${title}" foi processado com ${data.chunksCreated} fragmentos.`,
      });

      await fetchDocuments();
      return data;
    } catch (error: any) {
      toast({
        title: 'Erro ao indexar documento',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIngesting(false);
    }
  };

  // Ingest file (PDF, DOCX, etc.) via storage
  const ingestFile = async (
    file: File,
    targetAgentId?: string | null,
  ) => {
    if (!user) return null;

    const mimeType = file.type;
    if (!SUPPORTED_FILE_TYPES[mimeType] && !mimeType.startsWith('text/')) {
      toast({
        title: 'Tipo de arquivo não suportado',
        description: `Formatos aceitos: ${Object.values(SUPPORTED_FILE_TYPES).join(', ')}`,
        variant: 'destructive',
      });
      return null;
    }

    setIngesting(true);
    try {
      // For text files, read directly
      if (mimeType.startsWith('text/')) {
        const text = await file.text();
        const title = file.name.replace(/\.[^/.]+$/, '');
        return await ingestDocument(title, text, targetAgentId, 'upload', file.name);
      }

      // For binary files (PDF, DOCX), upload to storage first
      const storagePath = `${user.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('knowledge-files')
        .upload(storagePath, file, { contentType: mimeType });

      if (uploadError) throw uploadError;

      // Call edge function to extract text and ingest
      const { data, error } = await supabase.functions.invoke('rag-ingest', {
        body: {
          action: 'ingest-file',
          title: file.name.replace(/\.[^/.]+$/, ''),
          storagePath,
          agentId: targetAgentId || null,
          fileName: file.name,
          mimeType,
        },
      });

      if (error) throw error;

      toast({
        title: 'Arquivo processado!',
        description: `"${file.name}" extraído (${data.extractedChars} caracteres) e indexado com ${data.chunksCreated} fragmentos.`,
      });

      await fetchDocuments();
      return data;
    } catch (error: any) {
      toast({
        title: 'Erro ao processar arquivo',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIngesting(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase.functions.invoke('rag-ingest', {
        body: { action: 'delete', documentId },
      });

      if (error) throw error;

      toast({ title: 'Documento removido' });
      await fetchDocuments();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const searchKnowledge = async (query: string, targetAgentId?: string | null, rerank = false) => {
    try {
      const { data, error } = await supabase.functions.invoke('rag-ingest', {
        body: {
          action: 'search',
          query,
          agentId: targetAgentId || null,
          threshold: 0.5,
          limit: 5,
          rerank,
        },
      });

      if (error) throw error;
      return data.results || [];
    } catch (error: any) {
      console.error('Search error:', error);
      return [];
    }
  };

  return {
    documents,
    loading,
    ingesting,
    ingestDocument,
    ingestFile,
    deleteDocument,
    searchKnowledge,
    refetch: fetchDocuments,
    supportedFileTypes: SUPPORTED_FILE_TYPES,
  };
};
