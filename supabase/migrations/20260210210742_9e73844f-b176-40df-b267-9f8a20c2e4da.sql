
-- Table to store AI-generated legal document history
CREATE TABLE public.legal_document_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL, -- 'petition', 'contract', 'petition_analysis', 'contract_analysis'
  input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_document_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own document history"
ON public.legal_document_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document history"
ON public.legal_document_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document history"
ON public.legal_document_history FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_legal_document_history_user_id ON public.legal_document_history(user_id);
CREATE INDEX idx_legal_document_history_created_at ON public.legal_document_history(created_at DESC);
