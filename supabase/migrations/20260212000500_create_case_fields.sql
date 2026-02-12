CREATE TABLE IF NOT EXISTS public.case_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  extracted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (case_id)
);

ALTER TABLE public.case_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own case fields"
ON public.case_fields FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own case fields"
ON public.case_fields FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own case fields"
ON public.case_fields FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can select case fields"
ON public.case_fields FOR SELECT
USING (true);

CREATE POLICY "Service role can insert case fields"
ON public.case_fields FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update case fields"
ON public.case_fields FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_case_fields_case_id ON public.case_fields(case_id);

CREATE TRIGGER update_case_fields_updated_at
BEFORE UPDATE ON public.case_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
