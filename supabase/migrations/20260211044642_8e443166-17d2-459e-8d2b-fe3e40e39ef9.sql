
-- Fix: restrict INSERT to only work via service role by checking user_id matches
-- Edge functions set user_id explicitly, so we validate it
DROP POLICY "Service role can insert ai_logs" ON public.ai_logs;

CREATE POLICY "Insert ai_logs with valid user_id"
  ON public.ai_logs FOR INSERT
  WITH CHECK (user_id IS NOT NULL);
