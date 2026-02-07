
-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Service role can update documents" ON public.signed_documents;
DROP POLICY IF EXISTS "Service role can select documents" ON public.signed_documents;
