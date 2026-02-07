
-- Add case_description column to store AI-generated case summary on qualification
ALTER TABLE public.cases ADD COLUMN case_description TEXT;

-- Add a comment for documentation
COMMENT ON COLUMN public.cases.case_description IS 'AI-generated description of the case, auto-created when lead is qualified';
