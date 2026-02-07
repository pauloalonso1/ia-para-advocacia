
-- Table to map funnel stages to specific agents per user
CREATE TABLE public.funnel_agent_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stage_name TEXT NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, stage_name)
);

-- Enable RLS
ALTER TABLE public.funnel_agent_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own funnel assignments"
ON public.funnel_agent_assignments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own funnel assignments"
ON public.funnel_agent_assignments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own funnel assignments"
ON public.funnel_agent_assignments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own funnel assignments"
ON public.funnel_agent_assignments FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_funnel_agent_assignments_updated_at
BEFORE UPDATE ON public.funnel_agent_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
