-- Create table for follow-up settings
CREATE TABLE public.followup_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  inactivity_hours INTEGER NOT NULL DEFAULT 24,
  max_followups INTEGER NOT NULL DEFAULT 3,
  followup_message_1 TEXT DEFAULT 'Olá! 👋 Notei que você não respondeu minha última mensagem. Posso te ajudar em algo?',
  followup_message_2 TEXT DEFAULT 'Oi! Ainda estou por aqui caso precise de ajuda. 😊',
  followup_message_3 TEXT DEFAULT 'Olá! Essa será minha última tentativa de contato. Caso precise, é só me chamar!',
  respect_business_hours BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create table to track follow-up executions per case
CREATE TABLE public.case_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  followup_count INTEGER NOT NULL DEFAULT 0,
  last_followup_at TIMESTAMP WITH TIME ZONE,
  next_followup_at TIMESTAMP WITH TIME ZONE,
  is_paused BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

-- Enable RLS
ALTER TABLE public.followup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_followups ENABLE ROW LEVEL SECURITY;

-- RLS policies for followup_settings
CREATE POLICY "Users can view their own followup settings"
  ON public.followup_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own followup settings"
  ON public.followup_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own followup settings"
  ON public.followup_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own followup settings"
  ON public.followup_settings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for case_followups
CREATE POLICY "Users can view their own case followups"
  ON public.case_followups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own case followups"
  ON public.case_followups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own case followups"
  ON public.case_followups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own case followups"
  ON public.case_followups FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_followup_settings_updated_at
  BEFORE UPDATE ON public.followup_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_case_followups_updated_at
  BEFORE UPDATE ON public.case_followups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for case_followups
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_followups;