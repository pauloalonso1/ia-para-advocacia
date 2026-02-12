CREATE TABLE IF NOT EXISTS public.workflow_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  from_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  to_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workflow events"
ON public.workflow_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can select workflow events"
ON public.workflow_events FOR SELECT
USING (true);

CREATE POLICY "Service role can insert workflow events"
ON public.workflow_events FOR INSERT
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_workflow_events_case_id_created_at
ON public.workflow_events(case_id, created_at DESC);
