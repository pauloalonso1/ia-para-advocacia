-- Create schedule_settings table for customizable business hours
CREATE TABLE public.schedule_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  work_start_hour INTEGER NOT NULL DEFAULT 9,
  work_end_hour INTEGER NOT NULL DEFAULT 18,
  lunch_start_hour INTEGER DEFAULT NULL,
  lunch_end_hour INTEGER DEFAULT NULL,
  appointment_duration_minutes INTEGER NOT NULL DEFAULT 60,
  work_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comments for clarity
COMMENT ON COLUMN public.schedule_settings.work_start_hour IS 'Hour when work starts (0-23)';
COMMENT ON COLUMN public.schedule_settings.work_end_hour IS 'Hour when work ends (0-23)';
COMMENT ON COLUMN public.schedule_settings.lunch_start_hour IS 'Hour when lunch break starts (null = no lunch break)';
COMMENT ON COLUMN public.schedule_settings.lunch_end_hour IS 'Hour when lunch break ends (null = no lunch break)';
COMMENT ON COLUMN public.schedule_settings.work_days IS 'Array of work days (0=Sunday, 1=Monday, ..., 6=Saturday)';

-- Enable RLS
ALTER TABLE public.schedule_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own schedule settings"
ON public.schedule_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedule settings"
ON public.schedule_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedule settings"
ON public.schedule_settings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedule settings"
ON public.schedule_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic updated_at
CREATE TRIGGER update_schedule_settings_updated_at
BEFORE UPDATE ON public.schedule_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();