
-- Table to store user's research API configuration
CREATE TABLE public.research_api_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'escavador' CHECK (provider IN ('escavador', 'jusbrasil')),
  api_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.research_api_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own research settings"
  ON public.research_api_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own research settings"
  ON public.research_api_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own research settings"
  ON public.research_api_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own research settings"
  ON public.research_api_settings FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_research_api_settings_updated_at
  BEFORE UPDATE ON public.research_api_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
