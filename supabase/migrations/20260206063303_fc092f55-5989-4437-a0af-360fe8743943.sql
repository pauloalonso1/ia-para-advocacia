-- Add message_status column to track delivery/read status
ALTER TABLE public.conversation_history 
ADD COLUMN IF NOT EXISTS message_status text DEFAULT 'sent';

-- Add message_id column to map Evolution API message IDs
ALTER TABLE public.conversation_history 
ADD COLUMN IF NOT EXISTS external_message_id text;

-- Create index for quick lookup by external_message_id
CREATE INDEX IF NOT EXISTS idx_conversation_history_external_message_id 
ON public.conversation_history (external_message_id) WHERE external_message_id IS NOT NULL;
