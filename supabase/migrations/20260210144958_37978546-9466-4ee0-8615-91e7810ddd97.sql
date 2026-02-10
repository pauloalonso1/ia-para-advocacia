
-- Create a table for message processing locks to prevent parallel processing
CREATE TABLE IF NOT EXISTS public.message_processing_locks (
  client_phone TEXT NOT NULL,
  user_id UUID NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_phone, user_id)
);

-- Auto-expire locks after 30 seconds (safety net)
CREATE OR REPLACE FUNCTION public.cleanup_expired_locks()
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  DELETE FROM public.message_processing_locks 
  WHERE locked_at < now() - interval '30 seconds';
$$;

-- RLS not needed as this is only accessed by service role from edge functions
ALTER TABLE public.message_processing_locks ENABLE ROW LEVEL SECURITY;
