-- Migration 20261007000004_projects_tasks_activities

CREATE TYPE project_status AS ENUM ('active', 'completed', 'on_hold', 'archived');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed', 'blocked', 'canceled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE visibility_scope AS ENUM ('internal', 'client');

CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    status project_status DEFAULT 'active' NOT NULL,
    internal_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    original_owner_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    current_owner_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    reviewer_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT,
    status task_status DEFAULT 'todo' NOT NULL,
    priority task_priority DEFAULT 'medium' NOT NULL,
    due_at TIMESTAMPTZ NOT NULL,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.activity_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL,
    reference_id UUID NOT NULL,
    changes JSONB,
    scope visibility_scope DEFAULT 'internal' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    -- deliverable_version_id will be added in phase 4
    original_name TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    uploader_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
    -- XOR constraint simplified for this phase:
    -- CHECK (task_id IS NOT NULL)
);

CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    scope visibility_scope DEFAULT 'internal' NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Triggers for updated_at
CREATE TRIGGER update_projects_modtime BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_tasks_modtime BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Indexes for performance
CREATE INDEX idx_tasks_team_status_due ON public.tasks (team_id, status, due_at);
CREATE INDEX idx_tasks_owner_due ON public.tasks (current_owner_user_id, due_at);
CREATE INDEX idx_projects_status ON public.projects (client_id, status);

-- RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Project Policies
CREATE POLICY "Projects viewable by internal staff"
  ON public.projects FOR SELECT USING (is_internal());
CREATE POLICY "Projects modifiable by admins and assigned team managers"
  ON public.projects FOR ALL USING (
    is_admin() OR 
    (auth.uid() IN (SELECT manager_user_id FROM public.teams WHERE id = internal_team_id))
  );

-- Task Policies
CREATE POLICY "Tasks viewable by internal staff"
  ON public.tasks FOR SELECT USING (is_internal());
-- Only Manager can insert tasks for their team, or Admin for any
CREATE POLICY "Tasks insertable by admin or manager of the team"
  ON public.tasks FOR INSERT WITH CHECK (
    is_admin() OR 
    (auth.uid() IN (SELECT manager_user_id FROM public.teams WHERE id = team_id))
  );
-- Updates: Member can update their own tasks (status, description). Manager can update team tasks. Admin updates all.
CREATE POLICY "Tasks updatable by owner, manager, or admin"
  ON public.tasks FOR UPDATE USING (
    is_admin() OR 
    current_owner_user_id = auth.uid() OR
    (auth.uid() IN (SELECT manager_user_id FROM public.teams WHERE id = team_id))
  );

-- Activity Events Policies
CREATE POLICY "Activity events viewable by internal"
  ON public.activity_events FOR SELECT USING (is_internal());
CREATE POLICY "Activity events insertable by actor"
  ON public.activity_events FOR INSERT WITH CHECK (actor_user_id = auth.uid());

-- Files Policies
CREATE POLICY "Files viewable by internal"
  ON public.files FOR SELECT USING (is_internal());
CREATE POLICY "Files insertable by internal"
  ON public.files FOR INSERT WITH CHECK (is_internal());

-- Comments Policies
CREATE POLICY "Comments viewable by internal"
  ON public.comments FOR SELECT USING (is_internal());
CREATE POLICY "Comments insertable by internal"
  ON public.comments FOR INSERT WITH CHECK (is_internal() AND author_user_id = auth.uid());
