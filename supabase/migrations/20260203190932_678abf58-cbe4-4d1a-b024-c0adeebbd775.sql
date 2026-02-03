-- Tabela de Perfis (vinculada ao auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tabela de Agentes
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agents"
  ON public.agents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agents"
  ON public.agents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents"
  ON public.agents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents"
  ON public.agents FOR DELETE
  USING (auth.uid() = user_id);

-- Tabela de Regras do Agente
CREATE TABLE public.agent_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL UNIQUE,
  system_prompt TEXT,
  agent_rules TEXT,
  forbidden_actions TEXT,
  welcome_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.agent_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rules of their agents"
  ON public.agent_rules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agents WHERE agents.id = agent_rules.agent_id AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert rules for their agents"
  ON public.agent_rules FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agents WHERE agents.id = agent_rules.agent_id AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can update rules of their agents"
  ON public.agent_rules FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.agents WHERE agents.id = agent_rules.agent_id AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete rules of their agents"
  ON public.agent_rules FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.agents WHERE agents.id = agent_rules.agent_id AND agents.user_id = auth.uid()
  ));

-- Tabela de Passos do Roteiro
CREATE TABLE public.agent_script_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,
  situation VARCHAR(255),
  message_to_send TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(agent_id, step_order)
);

ALTER TABLE public.agent_script_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view steps of their agents"
  ON public.agent_script_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agents WHERE agents.id = agent_script_steps.agent_id AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert steps for their agents"
  ON public.agent_script_steps FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agents WHERE agents.id = agent_script_steps.agent_id AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can update steps of their agents"
  ON public.agent_script_steps FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.agents WHERE agents.id = agent_script_steps.agent_id AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete steps of their agents"
  ON public.agent_script_steps FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.agents WHERE agents.id = agent_script_steps.agent_id AND agents.user_id = auth.uid()
  ));

-- Tabela de FAQs do Agente
CREATE TABLE public.agent_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.agent_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view faqs of their agents"
  ON public.agent_faqs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agents WHERE agents.id = agent_faqs.agent_id AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert faqs for their agents"
  ON public.agent_faqs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agents WHERE agents.id = agent_faqs.agent_id AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can update faqs of their agents"
  ON public.agent_faqs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.agents WHERE agents.id = agent_faqs.agent_id AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete faqs of their agents"
  ON public.agent_faqs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.agents WHERE agents.id = agent_faqs.agent_id AND agents.user_id = auth.uid()
  ));

-- Tabela de Casos (Leads/Clientes)
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_name VARCHAR(255),
  client_phone VARCHAR(50) NOT NULL,
  active_agent_id UUID REFERENCES public.agents(id),
  current_step_id UUID REFERENCES public.agent_script_steps(id),
  status VARCHAR(100) DEFAULT 'Novo Contato',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cases"
  ON public.cases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cases"
  ON public.cases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cases"
  ON public.cases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cases"
  ON public.cases FOR DELETE
  USING (auth.uid() = user_id);

-- Tabela de Histórico de Conversas
CREATE TABLE public.conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.conversation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history of their cases"
  ON public.conversation_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cases WHERE cases.id = conversation_history.case_id AND cases.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert history for their cases"
  ON public.conversation_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cases WHERE cases.id = conversation_history.case_id AND cases.user_id = auth.uid()
  ));

-- Function para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_rules_updated_at
  BEFORE UPDATE ON public.agent_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();