
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Knowledge base documents table
CREATE TABLE public.knowledge_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual',
  file_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Knowledge chunks with embeddings
CREATE TABLE public.knowledge_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  embedding extensions.vector(768),
  token_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for knowledge_documents
CREATE POLICY "Users can view their own documents"
  ON public.knowledge_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own documents"
  ON public.knowledge_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own documents"
  ON public.knowledge_documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own documents"
  ON public.knowledge_documents FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for knowledge_chunks
CREATE POLICY "Users can view their own chunks"
  ON public.knowledge_chunks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own chunks"
  ON public.knowledge_chunks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chunks"
  ON public.knowledge_chunks FOR DELETE USING (auth.uid() = user_id);

-- HNSW index for vector similarity search
CREATE INDEX knowledge_chunks_embedding_idx ON public.knowledge_chunks
  USING hnsw (embedding extensions.vector_cosine_ops);

-- Indexes for filtering
CREATE INDEX knowledge_chunks_user_agent_idx ON public.knowledge_chunks(user_id, agent_id);
CREATE INDEX knowledge_documents_user_agent_idx ON public.knowledge_documents(user_id, agent_id);

-- Trigger for updated_at
CREATE TRIGGER update_knowledge_documents_updated_at
  BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Similarity search function
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding extensions.vector(768),
  match_user_id UUID,
  match_agent_id UUID DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kc.content,
    (1 - (kc.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.knowledge_chunks kc
  WHERE kc.user_id = match_user_id
    AND (
      match_agent_id IS NULL 
      OR kc.agent_id IS NULL 
      OR kc.agent_id = match_agent_id
    )
    AND (1 - (kc.embedding <=> query_embedding)) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
