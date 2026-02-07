
-- ==========================================
-- 1. Contact memories table (vectorized long-term memory per contact)
-- ==========================================
CREATE TABLE public.contact_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_phone TEXT NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  memory_type TEXT NOT NULL DEFAULT 'conversation_summary',
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for vector search
CREATE INDEX idx_contact_memories_embedding ON public.contact_memories 
  USING hnsw (embedding vector_cosine_ops);

-- Index for lookups
CREATE INDEX idx_contact_memories_phone ON public.contact_memories (user_id, contact_phone);

-- Enable RLS
ALTER TABLE public.contact_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contact memories"
  ON public.contact_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contact memories"
  ON public.contact_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contact memories"
  ON public.contact_memories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contact memories"
  ON public.contact_memories FOR DELETE
  USING (auth.uid() = user_id);

-- Service role policy for edge functions
CREATE POLICY "Service role full access to contact memories"
  ON public.contact_memories FOR ALL
  USING (true)
  WITH CHECK (true);

-- Timestamp trigger
CREATE TRIGGER update_contact_memories_updated_at
  BEFORE UPDATE ON public.contact_memories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- 2. Storage bucket for knowledge base files (PDF, DOCX)
-- ==========================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('knowledge-files', 'knowledge-files', false, 20971520);

-- Users can upload their own files
CREATE POLICY "Users can upload knowledge files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'knowledge-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own files
CREATE POLICY "Users can view knowledge files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'knowledge-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own files
CREATE POLICY "Users can delete knowledge files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'knowledge-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Service role can access all files
CREATE POLICY "Service role access knowledge files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'knowledge-files')
  WITH CHECK (bucket_id = 'knowledge-files');

-- ==========================================
-- 3. Function to search contact memories
-- ==========================================
CREATE OR REPLACE FUNCTION public.match_contact_memories(
  query_embedding vector(768),
  match_user_id UUID,
  match_phone TEXT,
  match_agent_id UUID DEFAULT NULL,
  match_threshold DOUBLE PRECISION DEFAULT 0.6,
  match_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  memory_type TEXT,
  metadata JSONB,
  similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id,
    cm.content,
    cm.memory_type,
    cm.metadata,
    (1 - (cm.embedding <=> query_embedding))::DOUBLE PRECISION AS similarity
  FROM public.contact_memories cm
  WHERE cm.user_id = match_user_id
    AND cm.contact_phone = match_phone
    AND (
      match_agent_id IS NULL
      OR cm.agent_id IS NULL
      OR cm.agent_id = match_agent_id
    )
    AND (1 - (cm.embedding <=> query_embedding)) > match_threshold
  ORDER BY cm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Enable realtime for contact_memories
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_memories;
