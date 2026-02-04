-- Create team_members table for organization/team structure
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL, -- The workspace owner (main account)
  user_id UUID UNIQUE, -- The team member's auth.users id (nullable for invited but not registered)
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR,
  oab_number VARCHAR, -- OAB registration for lawyers
  specialty VARCHAR, -- Area of expertise (Trabalhista, Família, etc.)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
CREATE POLICY "Owners and members can view team"
ON public.team_members
FOR SELECT
USING (
  owner_id = auth.uid() 
  OR user_id = auth.uid()
);

CREATE POLICY "Owners can insert team members"
ON public.team_members
FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update team members"
ON public.team_members
FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete team members"
ON public.team_members
FOR DELETE
USING (owner_id = auth.uid());

-- Add foreign key constraint for assigned_to in cases
ALTER TABLE public.cases 
ADD CONSTRAINT cases_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES public.team_members(id) ON DELETE SET NULL;

-- Create trigger for team_members updated_at
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for team_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;