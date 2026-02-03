-- Create table for Evolution API settings per user
CREATE TABLE public.evolution_api_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  instance_name TEXT,
  webhook_url TEXT,
  integration_type TEXT DEFAULT 'WHATSAPP-BAILEYS',
  qrcode_enabled BOOLEAN DEFAULT true,
  reject_call BOOLEAN DEFAULT false,
  msg_call TEXT DEFAULT '',
  groups_ignore BOOLEAN DEFAULT true,
  always_online BOOLEAN DEFAULT false,
  read_messages BOOLEAN DEFAULT false,
  read_status BOOLEAN DEFAULT false,
  sync_full_history BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_evolution_settings UNIQUE (user_id)
);

-- Enable Row Level Security
ALTER TABLE public.evolution_api_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own evolution settings" 
ON public.evolution_api_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own evolution settings" 
ON public.evolution_api_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own evolution settings" 
ON public.evolution_api_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own evolution settings" 
ON public.evolution_api_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_evolution_api_settings_updated_at
BEFORE UPDATE ON public.evolution_api_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.evolution_api_settings;