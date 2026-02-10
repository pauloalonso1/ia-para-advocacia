
-- ============================================
-- Add ON DELETE CASCADE to agent-related FKs
-- ============================================

-- agent_faqs -> agents
ALTER TABLE public.agent_faqs
  DROP CONSTRAINT IF EXISTS agent_faqs_agent_id_fkey,
  ADD CONSTRAINT agent_faqs_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;

-- agent_rules -> agents
ALTER TABLE public.agent_rules
  DROP CONSTRAINT IF EXISTS agent_rules_agent_id_fkey,
  ADD CONSTRAINT agent_rules_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;

-- agent_script_steps -> agents
ALTER TABLE public.agent_script_steps
  DROP CONSTRAINT IF EXISTS agent_script_steps_agent_id_fkey,
  ADD CONSTRAINT agent_script_steps_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;

-- knowledge_chunks -> agents (SET NULL on delete since chunks belong to documents too)
ALTER TABLE public.knowledge_chunks
  DROP CONSTRAINT IF EXISTS knowledge_chunks_agent_id_fkey,
  ADD CONSTRAINT knowledge_chunks_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;

-- knowledge_documents -> agents (SET NULL)
ALTER TABLE public.knowledge_documents
  DROP CONSTRAINT IF EXISTS knowledge_documents_agent_id_fkey,
  ADD CONSTRAINT knowledge_documents_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;

-- contact_memories -> agents (SET NULL)
ALTER TABLE public.contact_memories
  DROP CONSTRAINT IF EXISTS contact_memories_agent_id_fkey,
  ADD CONSTRAINT contact_memories_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;

-- funnel_agent_assignments -> agents (SET NULL)
ALTER TABLE public.funnel_agent_assignments
  DROP CONSTRAINT IF EXISTS funnel_agent_assignments_agent_id_fkey,
  ADD CONSTRAINT funnel_agent_assignments_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;

-- cases -> agents (SET NULL for active_agent_id)
ALTER TABLE public.cases
  DROP CONSTRAINT IF EXISTS cases_active_agent_id_fkey,
  ADD CONSTRAINT cases_active_agent_id_fkey
    FOREIGN KEY (active_agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;

-- cases -> agent_script_steps (SET NULL for current_step_id)
ALTER TABLE public.cases
  DROP CONSTRAINT IF EXISTS cases_current_step_id_fkey,
  ADD CONSTRAINT cases_current_step_id_fkey
    FOREIGN KEY (current_step_id) REFERENCES public.agent_script_steps(id) ON DELETE SET NULL;

-- ============================================
-- Add ON DELETE CASCADE to case-related FKs
-- ============================================

-- conversation_history -> cases
ALTER TABLE public.conversation_history
  DROP CONSTRAINT IF EXISTS conversation_history_case_id_fkey,
  ADD CONSTRAINT conversation_history_case_id_fkey
    FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;

-- case_followups -> cases
ALTER TABLE public.case_followups
  DROP CONSTRAINT IF EXISTS case_followups_case_id_fkey,
  ADD CONSTRAINT case_followups_case_id_fkey
    FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;

-- signed_documents -> cases (SET NULL since docs should persist)
ALTER TABLE public.signed_documents
  DROP CONSTRAINT IF EXISTS signed_documents_case_id_fkey,
  ADD CONSTRAINT signed_documents_case_id_fkey
    FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE SET NULL;

-- financial_transactions -> cases (SET NULL since financial records should persist)
ALTER TABLE public.financial_transactions
  DROP CONSTRAINT IF EXISTS financial_transactions_case_id_fkey,
  ADD CONSTRAINT financial_transactions_case_id_fkey
    FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE SET NULL;

-- knowledge_chunks -> knowledge_documents (CASCADE)
ALTER TABLE public.knowledge_chunks
  DROP CONSTRAINT IF EXISTS knowledge_chunks_document_id_fkey,
  ADD CONSTRAINT knowledge_chunks_document_id_fkey
    FOREIGN KEY (document_id) REFERENCES public.knowledge_documents(id) ON DELETE CASCADE;
