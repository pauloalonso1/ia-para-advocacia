
-- Add missing columns to legal_document_history
ALTER TABLE public.legal_document_history
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
