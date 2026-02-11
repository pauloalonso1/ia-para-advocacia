
-- Create ai_logs table for monitoring AI agent usage and errors
CREATE TABLE public.ai_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL DEFAULT 'ai_call', -- ai_call, error, rate_limit, timeout, webhook
  source TEXT NOT NULL DEFAULT 'whatsapp-webhook', -- whatsapp-webhook, legal-documents, generate-summary, etc.
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  agent_name TEXT,
  model TEXT, -- gpt-4o-mini, gpt-5.2, google/gemini-2.5-flash, etc.
  tokens_input INT,
  tokens_output INT,
  response_time_ms INT,
  status TEXT NOT NULL DEFAULT 'success', -- success, error, rate_limited, timeout
  error_message TEXT,
  contact_phone TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own logs
CREATE POLICY "Users can view their own ai_logs"
  ON public.ai_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (edge functions use service role)
CREATE POLICY "Service role can insert ai_logs"
  ON public.ai_logs FOR INSERT
  WITH CHECK (true);

-- Users can delete their own logs
CREATE POLICY "Users can delete their own ai_logs"
  ON public.ai_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for common queries
CREATE INDEX idx_ai_logs_user_created ON public.ai_logs(user_id, created_at DESC);
CREATE INDEX idx_ai_logs_event_type ON public.ai_logs(event_type);
CREATE INDEX idx_ai_logs_status ON public.ai_logs(status);
CREATE INDEX idx_ai_logs_source ON public.ai_logs(source);

-- Enable realtime for live monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_logs;
