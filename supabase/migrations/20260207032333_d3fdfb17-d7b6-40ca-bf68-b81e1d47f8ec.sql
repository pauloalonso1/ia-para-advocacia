
-- Remove overly permissive service role policy (service role bypasses RLS by default)
DROP POLICY "Service role full access to contact memories" ON public.contact_memories;
