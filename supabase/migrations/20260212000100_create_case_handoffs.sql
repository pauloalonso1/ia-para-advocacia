-- Create table to persist explicit handoff artifacts between agents
CREATE TABLE IF NOT EXISTS public.case_handoffs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  from_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  to_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  reason TEXT,
  artifact JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.case_handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own case handoffs"
ON public.case_handoffs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can select case handoffs"
ON public.case_handoffs FOR SELECT
USING (true);

CREATE POLICY "Service role can insert case handoffs"
ON public.case_handoffs FOR INSERT
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_case_handoffs_case_id_created_at
ON public.case_handoffs(case_id, created_at DESC);
