
-- Create table to track documents sent for signing
CREATE TABLE public.signed_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  case_id UUID REFERENCES public.cases(id),
  client_phone TEXT,
  client_name TEXT,
  doc_token TEXT NOT NULL,
  template_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  signed_at TIMESTAMP WITH TIME ZONE,
  zapsign_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.signed_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
ON public.signed_documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
ON public.signed_documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON public.signed_documents FOR UPDATE
USING (auth.uid() = user_id);

-- Service role needs to update via webhook
CREATE POLICY "Service role can update documents"
ON public.signed_documents FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can select documents"
ON public.signed_documents FOR SELECT
USING (true);

-- Index for webhook lookups
CREATE INDEX idx_signed_documents_doc_token ON public.signed_documents(doc_token);
CREATE INDEX idx_signed_documents_case_id ON public.signed_documents(case_id);

-- Trigger for updated_at
CREATE TRIGGER update_signed_documents_updated_at
BEFORE UPDATE ON public.signed_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.signed_documents;
