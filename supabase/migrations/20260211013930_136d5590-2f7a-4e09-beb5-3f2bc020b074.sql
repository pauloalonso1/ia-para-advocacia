
-- Create petition templates table
CREATE TABLE public.petition_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.petition_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON public.petition_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own templates" ON public.petition_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON public.petition_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON public.petition_templates FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_petition_templates_updated_at
  BEFORE UPDATE ON public.petition_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
