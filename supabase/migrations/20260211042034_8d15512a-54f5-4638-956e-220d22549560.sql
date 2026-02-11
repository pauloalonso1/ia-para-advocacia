
-- 1. UPDATE policy for legal_document_history (allows marking favorites, editing title)
CREATE POLICY "Users can update their own document history"
ON public.legal_document_history
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. UPDATE policy for conversation_history (allows editing messages)
CREATE POLICY "Users can update messages in their cases"
ON public.conversation_history
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = conversation_history.case_id
    AND cases.user_id = auth.uid()
  )
);

-- 3. DELETE policy for conversation_history
CREATE POLICY "Users can delete messages in their cases"
ON public.conversation_history
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = conversation_history.case_id
    AND cases.user_id = auth.uid()
  )
);

-- 4. Policies for message_processing_locks (used by service role, but good practice)
CREATE POLICY "Users can view their own locks"
ON public.message_processing_locks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own locks"
ON public.message_processing_locks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own locks"
ON public.message_processing_locks
FOR DELETE
USING (auth.uid() = user_id);

-- 5. UPDATE policy for knowledge_chunks
CREATE POLICY "Users can update their own knowledge chunks"
ON public.knowledge_chunks
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
