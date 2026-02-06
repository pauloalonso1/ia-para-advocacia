
-- Table for ZapSign integration settings
CREATE TABLE public.zapsign_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  api_token TEXT NOT NULL,
  sandbox_mode BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.zapsign_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own zapsign settings"
  ON public.zapsign_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own zapsign settings"
  ON public.zapsign_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own zapsign settings"
  ON public.zapsign_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own zapsign settings"
  ON public.zapsign_settings FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_zapsign_settings_updated_at
  BEFORE UPDATE ON public.zapsign_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
