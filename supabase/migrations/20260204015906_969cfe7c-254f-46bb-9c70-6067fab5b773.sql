-- Add unread_count and last_message columns to cases table
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_message text,
ADD COLUMN IF NOT EXISTS last_message_at timestamp with time zone;