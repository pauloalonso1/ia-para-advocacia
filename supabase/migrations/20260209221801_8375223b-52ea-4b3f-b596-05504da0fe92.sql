
-- Add media columns to conversation_history for storing media references
ALTER TABLE public.conversation_history
ADD COLUMN media_url TEXT,
ADD COLUMN media_type TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.conversation_history.media_url IS 'URL of attached media (image, audio, video, document)';
COMMENT ON COLUMN public.conversation_history.media_type IS 'Type of media: image, audio, video, document';
