-- init.sql — ALL migrations 001→010 in order, for a FRESH, EMPTY database only.
-- Database that already ran 001–009? Run ONLY supabase/migrations/20261020000010_review_links_and_team_whatsapp.sql


-- ════════ 20261007000001_core_tables.sql ════════
-- Migration 20261007000001_core_tables

-- Down migration (reversibility support via manual execution if needed)
-- DROP TABLE IF EXISTS public.client_memberships CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TABLE IF EXISTS public.clients CASCADE;
-- DROP TABLE IF EXISTS public.teams CASCADE;
-- DROP TABLE IF EXISTS public.departments CASCADE;
-- DROP TYPE IF EXISTS user_role;
-- DROP TYPE IF EXISTS entity_status;

-- Up migration
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'member', 'client');
CREATE TYPE entity_status AS ENUM ('active', 'archived');

CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status entity_status DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    manager_user_id UUID, -- Will reference profiles(id) later
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    status entity_status DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL,
    role user_role NOT NULL,
    status entity_status DEFAULT 'active' NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Now we can add the FK from teams to profiles
ALTER TABLE public.teams ADD CONSTRAINT fk_manager FOREIGN KEY (manager_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE public.client_memberships (
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (client_id, user_id)
);

-- Trigger for auth.users to create a profile automatically (default member)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, status)
  VALUES (
      new.id, 
      COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown User'), 
      COALESCE((new.raw_user_meta_data->>'role')::user_role, 'client'::user_role),
      'active'
  );
  
  -- If it's a client, link to a client_id if provided in meta
  IF COALESCE((new.raw_user_meta_data->>'role')::user_role, 'client'::user_role) = 'client' AND new.raw_user_meta_data->>'client_id' IS NOT NULL THEN
    INSERT INTO public.client_memberships (client_id, user_id)
    VALUES ((new.raw_user_meta_data->>'client_id')::uuid, new.id);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$ language 'plpgsql';

CREATE TRIGGER update_departments_modtime BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_teams_modtime BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_clients_modtime BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ════════ 20261007000002_rls_policies.sql ════════
-- Migration 20261007000002_rls_policies

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_memberships ENABLE ROW LEVEL SECURITY;

-- Helper to check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper to check if current user is an internal staff
CREATE OR REPLACE FUNCTION is_internal() RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'member') AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Departments
CREATE POLICY "Departments are viewable by internal staff"
  ON public.departments FOR SELECT USING (is_internal());
CREATE POLICY "Departments are modifiable by admins"
  ON public.departments FOR ALL USING (is_admin());

-- Teams
CREATE POLICY "Teams are viewable by internal staff"
  ON public.teams FOR SELECT USING (is_internal());
CREATE POLICY "Teams are modifiable by admins"
  ON public.teams FOR ALL USING (is_admin());

-- Clients
-- Internal can view all. Clients can view clients they have membership for.
CREATE POLICY "Clients are viewable by internal or members"
  ON public.clients FOR SELECT USING (
    is_internal() OR 
    EXISTS(SELECT 1 FROM public.client_memberships cm WHERE cm.client_id = id AND cm.user_id = auth.uid())
  );
CREATE POLICY "Clients are modifiable by admins"
  ON public.clients FOR ALL USING (is_admin());

-- Client Memberships
CREATE POLICY "Client Memberships are viewable by internal or members"
  ON public.client_memberships FOR SELECT USING (
    is_internal() OR 
    user_id = auth.uid()
  );
CREATE POLICY "Client Memberships are modifiable by admins"
  ON public.client_memberships FOR ALL USING (is_admin());

-- Profiles
-- Internal can see all profiles. Clients can only see internal profiles (for assigning tasks/reviewers visually if needed) and themselves. Wait, the brief says clients don't see internal structures.
-- "العميل لا يرى إلا مشروعاته... ولا يرى النشاط الداخلي أو مهام الفريق"
-- So clients should only see themselves and maybe internal members assigned to their project? For V1, clients only see their own profile.
CREATE POLICY "Profiles are viewable by internal or self"
  ON public.profiles FOR SELECT USING (
    is_internal() OR id = auth.uid()
  );
CREATE POLICY "Profiles are modifiable by admins"
  ON public.profiles FOR UPDATE USING (is_admin() OR id = auth.uid());

-- ════════ 20261007000003_storage.sql ════════
-- Migration 20261007000003_storage

-- Insert the massar_files bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('massar_files', 'massar_files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
-- Only authenticated users can upload
CREATE POLICY "Internal staff can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'massar_files' AND
    is_internal()
);

-- Users can read files they have access to
-- For simplicity in V1: 
-- Internal staff can read all files.
-- Clients cannot read directly from the bucket using public URL (it's private). 
-- They will get short-lived signed URLs generated by the backend API if the file belongs to a shared deliverable version.
-- So we only give direct SELECT to internal staff.
CREATE POLICY "Internal staff can view all files"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'massar_files' AND
    is_internal()
);

-- Update and Delete restricted to admin (or not allowed directly via client)
CREATE POLICY "Admins can update files"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'massar_files' AND is_admin()
);
CREATE POLICY "Admins can delete files"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'massar_files' AND is_admin()
);

-- ════════ 20261007000004_projects_tasks_activities.sql ════════
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

-- ════════ 20261007000005_handover_notifications.sql ════════
-- Migration 20261007000005_handover_notifications

CREATE TYPE handover_status AS ENUM ('pending', 'assigned', 'declined', 'cancelled');

CREATE TABLE public.handover_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    requester_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    manager_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- the manager or admin expected to act
    reason TEXT NOT NULL,
    internal_note TEXT,
    status handover_status DEFAULT 'pending' NOT NULL,
    new_owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    decision_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Partial unique index ensures only one pending request per task
CREATE UNIQUE INDEX idx_unique_pending_handover ON public.handover_requests (task_id) WHERE status = 'pending';

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    internal_link TEXT,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.handover_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Handover RLS
CREATE POLICY "Handover requests viewable by internal"
  ON public.handover_requests FOR SELECT USING (is_internal());
CREATE POLICY "Handover requests insertable by current owner"
  ON public.handover_requests FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT current_owner_user_id FROM public.tasks WHERE id = task_id)
  );
-- Manager/Admin can update
CREATE POLICY "Handover requests updatable by manager or admin"
  ON public.handover_requests FOR UPDATE USING (
    is_admin() OR auth.uid() = manager_user_id
  );

-- Notification RLS
CREATE POLICY "Notifications viewable by recipient"
  ON public.notifications FOR SELECT USING (recipient_user_id = auth.uid());
CREATE POLICY "Notifications updatable by recipient"
  ON public.notifications FOR UPDATE USING (recipient_user_id = auth.uid());
CREATE POLICY "Notifications insertable by internal"
  ON public.notifications FOR INSERT WITH CHECK (is_internal());


-- RPC for atomic transaction of Handover Decision
CREATE OR REPLACE FUNCTION public.process_handover_decision(
  p_handover_id UUID,
  p_decision handover_status,
  p_new_owner_id UUID,
  p_internal_note TEXT
) RETURNS void AS $$
DECLARE
  v_handover public.handover_requests%ROWTYPE;
  v_task public.tasks%ROWTYPE;
  v_actor_id UUID;
BEGIN
  v_actor_id := auth.uid();
  
  -- Lock the row for update
  SELECT * INTO v_handover FROM public.handover_requests WHERE id = p_handover_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Handover request not found.';
  END IF;

  IF v_handover.status != 'pending' THEN
    RAISE EXCEPTION 'Handover request is already processed.';
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = v_handover.task_id FOR UPDATE;

  -- Update handover request
  UPDATE public.handover_requests
  SET status = p_decision,
      new_owner_user_id = p_new_owner_id,
      internal_note = COALESCE(p_internal_note, internal_note),
      decision_at = timezone('utc'::text, now())
  WHERE id = p_handover_id;

  -- If approved (assigned), update task owner
  IF p_decision = 'assigned' THEN
    UPDATE public.tasks
    SET current_owner_user_id = p_new_owner_id
    WHERE id = v_handover.task_id;

    -- Notification to new owner
    INSERT INTO public.notifications (recipient_user_id, event_type, internal_link, message, idempotency_key)
    VALUES (p_new_owner_id, 'task_assigned', '/my-work', 'تم إسناد مهمة جديدة لك: ' || v_task.title, 'assign_' || p_handover_id || '_' || p_new_owner_id);
    
    -- Activity Log
    INSERT INTO public.activity_events (actor_user_id, event_type, reference_id, changes, scope)
    VALUES (v_actor_id, 'handover_approved', v_task.id, jsonb_build_object('previous_owner', v_task.current_owner_user_id, 'new_owner', p_new_owner_id), 'internal');
    
  ELSIF p_decision = 'declined' THEN
    -- Activity Log
    INSERT INTO public.activity_events (actor_user_id, event_type, reference_id, changes, scope)
    VALUES (v_actor_id, 'handover_declined', v_task.id, jsonb_build_object('reason', p_internal_note), 'internal');
  END IF;
  
  -- Notify the requester
  INSERT INTO public.notifications (recipient_user_id, event_type, internal_link, message, idempotency_key)
  VALUES (v_handover.requester_user_id, 'handover_decision', '/my-work', 'تم اتخاذ قرار بشأن طلب نقل المهمة: ' || v_task.title, 'decide_' || p_handover_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════ 20261007000006_deliverables.sql ════════
-- Migration 20261007000006_deliverables

CREATE TYPE deliverable_status AS ENUM (
    'draft', 
    'internal_review', 
    'internal_changes_requested', 
    'approved_internally', 
    'shared_with_client', 
    'client_changes_requested', 
    'client_approved'
);
CREATE TYPE review_stage AS ENUM ('internal', 'client');
CREATE TYPE review_decision_type AS ENUM ('approved', 'changes_requested');

CREATE TABLE public.deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    source_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    reviewer_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    current_version_id UUID, -- Foreign key deferred or updated later
    summary_status deliverable_status DEFAULT 'draft' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.deliverable_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deliverable_id UUID REFERENCES public.deliverables(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    creator_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    note TEXT,
    status deliverable_status DEFAULT 'draft' NOT NULL,
    shared_at TIMESTAMPTZ,
    target_client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(deliverable_id, version_number)
);

ALTER TABLE public.deliverables ADD CONSTRAINT fk_current_version FOREIGN KEY (current_version_id) REFERENCES public.deliverable_versions(id) ON DELETE SET NULL;

CREATE TABLE public.review_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id UUID REFERENCES public.deliverable_versions(id) ON DELETE CASCADE,
    stage review_stage NOT NULL,
    decision review_decision_type NOT NULL,
    actor_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Update files table to accept deliverable_version_id
ALTER TABLE public.files ADD COLUMN deliverable_version_id UUID REFERENCES public.deliverable_versions(id) ON DELETE CASCADE;

-- Add XOR constraint for files
ALTER TABLE public.files ADD CONSTRAINT files_parent_check 
CHECK (
  (task_id IS NOT NULL AND deliverable_version_id IS NULL) OR 
  (task_id IS NULL AND deliverable_version_id IS NOT NULL)
);

-- RLS Policies
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_decisions ENABLE ROW LEVEL SECURITY;

-- Internal can see all deliverables. Clients can see deliverables ONLY IF they have a shared version
CREATE POLICY "Deliverables viewable by internal" ON public.deliverables FOR SELECT USING (is_internal());
CREATE POLICY "Deliverables modifiable by internal" ON public.deliverables FOR ALL USING (is_internal());
CREATE POLICY "Deliverables viewable by client if shared" ON public.deliverables FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.deliverable_versions dv 
        WHERE dv.deliverable_id = id 
        AND dv.target_client_id IN (SELECT client_id FROM public.client_memberships WHERE user_id = auth.uid())
        AND dv.status IN ('shared_with_client', 'client_changes_requested', 'client_approved')
    )
);

-- Deliverable Versions RLS
CREATE POLICY "Versions viewable by internal" ON public.deliverable_versions FOR SELECT USING (is_internal());
CREATE POLICY "Versions modifiable by internal" ON public.deliverable_versions FOR ALL USING (is_internal());
CREATE POLICY "Versions viewable by client if shared" ON public.deliverable_versions FOR SELECT USING (
    target_client_id IN (SELECT client_id FROM public.client_memberships WHERE user_id = auth.uid())
    AND status IN ('shared_with_client', 'client_changes_requested', 'client_approved')
);

-- Review Decisions RLS
CREATE POLICY "Decisions viewable by internal" ON public.review_decisions FOR SELECT USING (is_internal());
CREATE POLICY "Decisions viewable by client if client stage" ON public.review_decisions FOR SELECT USING (
    stage = 'client' AND EXISTS (
        SELECT 1 FROM public.deliverable_versions dv 
        WHERE dv.id = version_id 
        AND dv.target_client_id IN (SELECT client_id FROM public.client_memberships WHERE user_id = auth.uid())
    )
);

-- Comments RLS update for deliverable isolation
ALTER TABLE public.comments ADD COLUMN version_id UUID REFERENCES public.deliverable_versions(id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD CONSTRAINT comments_parent_check CHECK (
  (task_id IS NOT NULL AND version_id IS NULL) OR 
  (task_id IS NULL AND version_id IS NOT NULL)
);

CREATE POLICY "Client scope comments viewable by client" ON public.comments FOR SELECT USING (
    scope = 'client' AND EXISTS (
        SELECT 1 FROM public.deliverable_versions dv 
        WHERE dv.id = version_id 
        AND dv.target_client_id IN (SELECT client_id FROM public.client_memberships WHERE user_id = auth.uid())
        AND dv.status IN ('shared_with_client', 'client_changes_requested', 'client_approved')
    )
);


-- RPC for atomic review decision
CREATE OR REPLACE FUNCTION public.process_review_decision(
    p_version_id UUID,
    p_stage review_stage,
    p_decision review_decision_type,
    p_comment TEXT
) RETURNS void AS $$
DECLARE
    v_version public.deliverable_versions%ROWTYPE;
    v_actor_id UUID := auth.uid();
    v_new_status deliverable_status;
BEGIN
    SELECT * INTO v_version FROM public.deliverable_versions WHERE id = p_version_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Version not found'; END IF;

    -- Concurrency & Logic checks
    IF p_stage = 'internal' THEN
        IF v_version.status != 'internal_review' THEN
            RAISE EXCEPTION 'Version is not in internal review state.';
        END IF;
        IF p_decision = 'approved' THEN v_new_status := 'approved_internally';
        ELSE v_new_status := 'internal_changes_requested'; END IF;

    ELSIF p_stage = 'client' THEN
        IF v_version.status != 'shared_with_client' THEN
            RAISE EXCEPTION 'Version is not shared with client for review.';
        END IF;
        -- Double check client authorization
        IF NOT EXISTS(SELECT 1 FROM public.client_memberships WHERE user_id = v_actor_id AND client_id = v_version.target_client_id) THEN
            RAISE EXCEPTION 'Unauthorized client.';
        END IF;

        IF p_decision = 'approved' THEN v_new_status := 'client_approved';
        ELSE v_new_status := 'client_changes_requested'; END IF;
    END IF;

    -- Insert Decision
    INSERT INTO public.review_decisions (version_id, stage, decision, actor_user_id, comment)
    VALUES (p_version_id, p_stage, p_decision, v_actor_id, p_comment);

    -- Update Version Status
    UPDATE public.deliverable_versions SET status = v_new_status WHERE id = p_version_id;
    UPDATE public.deliverables SET summary_status = v_new_status WHERE id = v_version.deliverable_id;

    -- Activity Event
    INSERT INTO public.activity_events (actor_user_id, event_type, reference_id, scope, changes)
    VALUES (v_actor_id, p_stage || '_review_decision', p_version_id, p_stage::visibility_scope, jsonb_build_object('decision', p_decision, 'comment', p_comment));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════ 20261007000007_security_hardening.sql ════════
-- Migration 20261007000007_security_hardening
--
-- Closes the permission holes found in the review of migrations 001–006 and
-- enforces the acceptance criteria in «ملحق القرارات والإضافات المعتمدة»:
--   1. Client never sees a version before internal approval + explicit share.
--   2. An employee cannot change the current owner; only the team manager decides.
--   3. Every approval is tied to a specific version, actor and time.
--   4. A new version never inherits an older approval.
--   5. After client changes, no re-share before a new internal review.
--   6. Every file is private; access is checked at request time.
--   9. Two concurrent handover requests cannot produce two owners.
--  10. Employee / client pages expose nothing beyond their responsibility.
--
-- Rule of thumb from here on: every STATUS or OWNERSHIP change goes through a
-- SECURITY DEFINER function below. Tables only accept direct writes for plain
-- data, and RLS blocks everything else at the API level.
--
-- Safe to run once on a database that already has 001–006 applied.

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- 0. Helpers (fixed search_path so SECURITY DEFINER cannot be hijacked)
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin' AND status = 'active');
$$;

CREATE OR REPLACE FUNCTION public.is_internal() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role IN ('admin','manager','member') AND status = 'active');
$$;

CREATE OR REPLACE FUNCTION public.my_team_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id FROM public.profiles WHERE id = auth.uid() AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.is_team_manager(p_team_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_team_id IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.teams t
    JOIN public.profiles p ON p.id = t.manager_user_id
    WHERE t.id = p_team_id AND t.manager_user_id = auth.uid() AND p.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_client_member(p_client_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.client_memberships cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.client_id = p_client_id AND cm.user_id = auth.uid()
      AND p.role = 'client' AND p.status = 'active'
  );
$$;

-- Internal-only notification writer (never exposed to the API)
CREATE OR REPLACE FUNCTION public._notify(
  p_recipient UUID, p_event TEXT, p_link TEXT, p_message TEXT, p_key TEXT
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (recipient_user_id, event_type, internal_link, message, idempotency_key)
  SELECT p_recipient, p_event, p_link, p_message, p_key
  WHERE p_recipient IS NOT NULL
  ON CONFLICT (idempotency_key) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public._notify(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Profiles — no self-promotion
-- ───────────────────────────────────────────────────────────────────────────

-- Old policy let any user UPDATE their own row, including `role`.
DROP POLICY IF EXISTS "Profiles are modifiable by admins" ON public.profiles;
CREATE POLICY "Profiles updatable by admins only"
  ON public.profiles FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Old trigger trusted raw_user_meta_data, which the user controls at sign-up.
-- Role / client link now come only from app_metadata (set by the server with
-- the service key) and default to an unlinked 'client' that can see nothing.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role user_role := 'client';
BEGIN
  IF NEW.raw_app_meta_data ? 'role' THEN
    v_role := (NEW.raw_app_meta_data->>'role')::user_role;
  END IF;

  INSERT INTO public.profiles (id, full_name, role, status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Unknown User'), v_role, 'active')
  ON CONFLICT (id) DO NOTHING;

  IF v_role = 'client' AND NEW.raw_app_meta_data->>'client_id' IS NOT NULL THEN
    INSERT INTO public.client_memberships (client_id, user_id)
    VALUES ((NEW.raw_app_meta_data->>'client_id')::uuid, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Tasks — team scope, owner cannot reassign, status via RPC
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Tasks viewable by internal staff" ON public.tasks;
CREATE POLICY "Tasks viewable within scope" ON public.tasks FOR SELECT USING (
  public.is_admin() OR (
    public.is_internal() AND (
      team_id = public.my_team_id()
      OR public.is_team_manager(team_id)
      OR current_owner_user_id = auth.uid()
      OR original_owner_user_id = auth.uid()
      OR reviewer_user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Tasks insertable by admin or manager of the team" ON public.tasks;
CREATE POLICY "Tasks insertable by admin or team manager" ON public.tasks FOR INSERT
  WITH CHECK (public.is_admin() OR public.is_team_manager(team_id));

-- Old policy let the current owner UPDATE every column (owner, deadline…).
DROP POLICY IF EXISTS "Tasks updatable by owner, manager, or admin" ON public.tasks;
CREATE POLICY "Tasks updatable by admin or team manager" ON public.tasks FOR UPDATE
  USING (public.is_admin() OR public.is_team_manager(team_id))
  WITH CHECK (public.is_admin() OR public.is_team_manager(team_id));

-- Validate + default task rows on insert
CREATE OR REPLACE FUNCTION public.tasks_before_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.team_id IS NULL THEN
    RAISE EXCEPTION 'TASK_TEAM_REQUIRED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles
                 WHERE id = NEW.current_owner_user_id AND status = 'active'
                   AND role IN ('admin','manager','member')) THEN
    RAISE EXCEPTION 'TASK_OWNER_INVALID';
  END IF;
  NEW.original_owner_user_id := COALESCE(NEW.original_owner_user_id, NEW.current_owner_user_id);
  NEW.status := 'todo';
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tasks_before_insert ON public.tasks;
CREATE TRIGGER tasks_before_insert BEFORE INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_before_insert();

-- Notify the owner + log activity on create; log every ownership change
CREATE OR REPLACE FUNCTION public.tasks_after_write()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_events (actor_user_id, event_type, reference_id, changes, scope)
    VALUES (COALESCE(auth.uid(), NEW.current_owner_user_id), 'task_created', NEW.id,
            jsonb_build_object('title', NEW.title, 'owner', NEW.current_owner_user_id, 'due_at', NEW.due_at), 'internal');
    PERFORM public._notify(NEW.current_owner_user_id, 'task_assigned', '/my-work',
                           'مهمة جديدة مسندة لك: ' || NEW.title, 'task_created_' || NEW.id);
  ELSIF NEW.current_owner_user_id IS DISTINCT FROM OLD.current_owner_user_id THEN
    INSERT INTO public.activity_events (actor_user_id, event_type, reference_id, changes, scope)
    VALUES (COALESCE(auth.uid(), NEW.current_owner_user_id), 'task_owner_changed', NEW.id,
            jsonb_build_object('previous_owner', OLD.current_owner_user_id, 'new_owner', NEW.current_owner_user_id), 'internal');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tasks_after_write ON public.tasks;
CREATE TRIGGER tasks_after_write AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_after_write();

-- Status change: owner moves forward / blocks; manager & admin can do anything
CREATE OR REPLACE FUNCTION public.update_task_status(p_task_id UUID, p_status task_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_task public.tasks%ROWTYPE;
  v_uid UUID := auth.uid();
  v_is_lead BOOLEAN;
BEGIN
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TASK_NOT_FOUND'; END IF;

  v_is_lead := public.is_admin() OR public.is_team_manager(v_task.team_id);

  IF NOT v_is_lead AND v_task.current_owner_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  IF v_task.status = p_status THEN RETURN; END IF;

  IF NOT v_is_lead AND NOT (
       (v_task.status = 'todo'        AND p_status IN ('in_progress','blocked'))
    OR (v_task.status = 'in_progress' AND p_status IN ('completed','blocked'))
    OR (v_task.status = 'blocked'     AND p_status = 'in_progress')
  ) THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION';
  END IF;

  UPDATE public.tasks SET status = p_status WHERE id = p_task_id;

  INSERT INTO public.activity_events (actor_user_id, event_type, reference_id, changes, scope)
  VALUES (v_uid, 'task_status_changed', p_task_id,
          jsonb_build_object('old_status', v_task.status, 'new_status', p_status), 'internal');
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Handover — request + decision only through RPCs
-- ───────────────────────────────────────────────────────────────────────────

-- Old INSERT policy let the requester choose `manager_user_id` (even themselves).
DROP POLICY IF EXISTS "Handover requests insertable by current owner" ON public.handover_requests;
DROP POLICY IF EXISTS "Handover requests updatable by manager or admin" ON public.handover_requests;
DROP POLICY IF EXISTS "Handover requests viewable by internal" ON public.handover_requests;
CREATE POLICY "Handover requests viewable by involved people" ON public.handover_requests FOR SELECT USING (
  public.is_admin()
  OR requester_user_id = auth.uid()
  OR manager_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = handover_requests.task_id AND public.is_team_manager(t.team_id))
);

CREATE OR REPLACE FUNCTION public.request_handover(p_task_id UUID, p_reason TEXT, p_note TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_task public.tasks%ROWTYPE;
  v_uid UUID := auth.uid();
  v_manager UUID;
  v_id UUID;
BEGIN
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TASK_NOT_FOUND'; END IF;
  IF v_task.current_owner_user_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'NOT_TASK_OWNER'; END IF;
  IF v_task.status IN ('completed','canceled') THEN RAISE EXCEPTION 'TASK_CLOSED'; END IF;
  IF p_reason NOT IN ('not_enough_time','schedule_conflict','task_complexity','higher_priority','need_assistance','other') THEN
    RAISE EXCEPTION 'INVALID_REASON';
  END IF;

  -- Team manager decides; fall back to an active admin when the team has none
  SELECT t.manager_user_id INTO v_manager
  FROM public.teams t JOIN public.profiles p ON p.id = t.manager_user_id
  WHERE t.id = v_task.team_id AND p.status = 'active';

  IF v_manager IS NULL OR v_manager = v_uid THEN
    SELECT id INTO v_manager FROM public.profiles
    WHERE role = 'admin' AND status = 'active' AND id <> v_uid
    ORDER BY created_at LIMIT 1;
  END IF;
  IF v_manager IS NULL THEN RAISE EXCEPTION 'NO_DECIDER_AVAILABLE'; END IF;

  BEGIN
    INSERT INTO public.handover_requests (task_id, requester_user_id, manager_user_id, reason, internal_note, status)
    VALUES (p_task_id, v_uid, v_manager, p_reason, NULLIF(p_note, ''), 'pending')
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'HANDOVER_ALREADY_PENDING';
  END;

  INSERT INTO public.activity_events (actor_user_id, event_type, reference_id, changes, scope)
  VALUES (v_uid, 'handover_requested', p_task_id, jsonb_build_object('handover_id', v_id, 'reason', p_reason), 'internal');

  PERFORM public._notify(v_manager, 'handover_requested', '/my-team',
                         'طلب نقل مسؤولية: ' || v_task.title, 'handover_req_' || v_id);
  RETURN v_id;
END;
$$;

-- Decision: only the assigned manager, the task's team manager, or an admin.
CREATE OR REPLACE FUNCTION public.process_handover_decision(
  p_handover_id UUID,
  p_decision handover_status,
  p_new_owner_id UUID,
  p_internal_note TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_handover public.handover_requests%ROWTYPE;
  v_task public.tasks%ROWTYPE;
  v_uid UUID := auth.uid();
  v_new_team UUID;
BEGIN
  SELECT * INTO v_handover FROM public.handover_requests WHERE id = p_handover_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'HANDOVER_NOT_FOUND'; END IF;
  IF v_handover.status <> 'pending' THEN RAISE EXCEPTION 'HANDOVER_ALREADY_DECIDED'; END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = v_handover.task_id FOR UPDATE;

  IF NOT (public.is_admin() OR v_handover.manager_user_id = v_uid OR public.is_team_manager(v_task.team_id)) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  IF p_decision NOT IN ('assigned','declined','cancelled') THEN RAISE EXCEPTION 'INVALID_DECISION'; END IF;

  IF p_decision = 'assigned' THEN
    SELECT team_id INTO v_new_team FROM public.profiles
    WHERE id = p_new_owner_id AND status = 'active' AND role IN ('admin','manager','member');
    IF NOT FOUND THEN RAISE EXCEPTION 'NEW_OWNER_INVALID'; END IF;
    IF p_new_owner_id = v_task.current_owner_user_id THEN RAISE EXCEPTION 'NEW_OWNER_SAME_AS_CURRENT'; END IF;
    IF NOT public.is_admin() AND v_new_team IS DISTINCT FROM v_task.team_id THEN
      RAISE EXCEPTION 'NEW_OWNER_OUTSIDE_TEAM';
    END IF;
  END IF;

  UPDATE public.handover_requests
  SET status = p_decision,
      new_owner_user_id = CASE WHEN p_decision = 'assigned' THEN p_new_owner_id END,
      internal_note = COALESCE(NULLIF(p_internal_note, ''), internal_note),
      decision_at = now()
  WHERE id = p_handover_id;

  IF p_decision = 'assigned' THEN
    UPDATE public.tasks SET current_owner_user_id = p_new_owner_id WHERE id = v_task.id;
    PERFORM public._notify(p_new_owner_id, 'task_assigned', '/my-work',
                           'تم إسناد مهمة لك بعد نقل المسؤولية: ' || v_task.title,
                           'handover_assign_' || p_handover_id);
  END IF;

  INSERT INTO public.activity_events (actor_user_id, event_type, reference_id, changes, scope)
  VALUES (v_uid, 'handover_' || p_decision::text, v_task.id,
          jsonb_build_object('handover_id', p_handover_id,
                             'previous_owner', v_task.current_owner_user_id,
                             'new_owner', CASE WHEN p_decision = 'assigned' THEN p_new_owner_id END,
                             'note', NULLIF(p_internal_note, '')), 'internal');

  PERFORM public._notify(v_handover.requester_user_id, 'handover_decision', '/my-work',
                         CASE p_decision
                           WHEN 'assigned' THEN 'تم قبول طلب نقل المسؤولية: '
                           WHEN 'declined' THEN 'تم رفض طلب نقل المسؤولية: '
                           ELSE 'تم إلغاء طلب نقل المسؤولية: ' END || v_task.title,
                         'handover_decision_' || p_handover_id);
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Notifications — no direct inserts from the API
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Notifications insertable by internal" ON public.notifications;
DROP POLICY IF EXISTS "Notifications updatable by recipient" ON public.notifications;
CREATE POLICY "Notifications updatable by recipient" ON public.notifications FOR UPDATE
  USING (recipient_user_id = auth.uid()) WITH CHECK (recipient_user_id = auth.uid());

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Deliverables & versions — the two-approval cycle, enforced in the DB
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Deliverables modifiable by internal" ON public.deliverables;
CREATE POLICY "Deliverables insertable by internal" ON public.deliverables FOR INSERT WITH CHECK (
  public.is_internal() AND summary_status = 'draft' AND current_version_id IS NULL
);
CREATE POLICY "Deliverables editable by admins" ON public.deliverables FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Bug fix: inside the subquery `id` resolved to dv.id, so clients never matched.
DROP POLICY IF EXISTS "Deliverables viewable by client if shared" ON public.deliverables;
CREATE POLICY "Deliverables viewable by client if shared" ON public.deliverables FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.deliverable_versions dv
    WHERE dv.deliverable_id = deliverables.id
      AND public.is_client_member(dv.target_client_id)
      AND dv.status IN ('shared_with_client','client_changes_requested','client_approved')
  )
);

CREATE OR REPLACE FUNCTION public.deliverables_before_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.reviewer_user_id
                 AND status = 'active' AND role IN ('admin','manager','member')) THEN
    RAISE EXCEPTION 'REVIEWER_INVALID';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS deliverables_before_insert ON public.deliverables;
CREATE TRIGGER deliverables_before_insert BEFORE INSERT ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.deliverables_before_insert();

-- Old FOR ALL policy let any staff member set status = 'shared_with_client'.
DROP POLICY IF EXISTS "Versions modifiable by internal" ON public.deliverable_versions;
DROP POLICY IF EXISTS "Versions viewable by client if shared" ON public.deliverable_versions;
CREATE POLICY "Versions viewable by client if shared" ON public.deliverable_versions FOR SELECT USING (
  public.is_client_member(target_client_id)
  AND status IN ('shared_with_client','client_changes_requested','client_approved')
);

DROP POLICY IF EXISTS "Decisions viewable by client if client stage" ON public.review_decisions;
CREATE POLICY "Decisions viewable by client if client stage" ON public.review_decisions FOR SELECT USING (
  stage = 'client' AND EXISTS (
    SELECT 1 FROM public.deliverable_versions dv
    WHERE dv.id = review_decisions.version_id AND public.is_client_member(dv.target_client_id)
  )
);

-- 5a. New version (never inherits an approval)
CREATE OR REPLACE FUNCTION public.create_deliverable_version(p_deliverable_id UUID, p_note TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_del public.deliverables%ROWTYPE;
  v_current_status deliverable_status;
  v_client UUID;
  v_next INT;
  v_id UUID;
BEGIN
  IF NOT public.is_internal() THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  SELECT * INTO v_del FROM public.deliverables WHERE id = p_deliverable_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DELIVERABLE_NOT_FOUND'; END IF;

  SELECT status INTO v_current_status FROM public.deliverable_versions WHERE id = v_del.current_version_id;
  IF v_current_status IN ('draft','internal_review','approved_internally','shared_with_client') THEN
    RAISE EXCEPTION 'CURRENT_VERSION_STILL_OPEN';
  END IF;

  SELECT client_id INTO v_client FROM public.projects WHERE id = v_del.project_id;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next
  FROM public.deliverable_versions WHERE deliverable_id = p_deliverable_id;

  INSERT INTO public.deliverable_versions (deliverable_id, version_number, creator_user_id, note, status, target_client_id)
  VALUES (p_deliverable_id, v_next, auth.uid(), NULLIF(p_note, ''), 'draft', v_client)
  RETURNING id INTO v_id;

  UPDATE public.deliverables SET current_version_id = v_id, summary_status = 'draft' WHERE id = p_deliverable_id;

  INSERT INTO public.activity_events (actor_user_id, event_type, reference_id, changes, scope)
  VALUES (auth.uid(), 'version_created', v_id, jsonb_build_object('deliverable_id', p_deliverable_id, 'version', v_next), 'internal');
  RETURN v_id;
END;
$$;

-- 5b. Draft → internal review (needs at least one file)
CREATE OR REPLACE FUNCTION public.submit_version_for_review(p_version_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ver public.deliverable_versions%ROWTYPE;
  v_del public.deliverables%ROWTYPE;
BEGIN
  IF NOT public.is_internal() THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  SELECT * INTO v_ver FROM public.deliverable_versions WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'VERSION_NOT_FOUND'; END IF;
  IF v_ver.status <> 'draft' THEN RAISE EXCEPTION 'VERSION_NOT_DRAFT'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.files WHERE deliverable_version_id = p_version_id) THEN
    RAISE EXCEPTION 'VERSION_HAS_NO_FILES';
  END IF;

  SELECT * INTO v_del FROM public.deliverables WHERE id = v_ver.deliverable_id FOR UPDATE;

  UPDATE public.deliverable_versions SET status = 'internal_review' WHERE id = p_version_id;
  UPDATE public.deliverables SET summary_status = 'internal_review' WHERE id = v_del.id;

  INSERT INTO public.activity_events (actor_user_id, event_type, reference_id, scope)
  VALUES (auth.uid(), 'version_submitted_for_review', p_version_id, 'internal');
  PERFORM public._notify(v_del.reviewer_user_id, 'review_requested', '/deliverables',
                         'طلب مراجعة داخلية: ' || v_del.title || ' — نسخة ' || v_ver.version_number,
                         'review_req_' || p_version_id);
END;
$$;

-- 5c. Review decision (internal reviewer OR client member)
CREATE OR REPLACE FUNCTION public.process_review_decision(
  p_version_id UUID,
  p_stage review_stage,
  p_decision review_decision_type,
  p_comment TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ver public.deliverable_versions%ROWTYPE;
  v_del public.deliverables%ROWTYPE;
  v_uid UUID := auth.uid();
  v_new deliverable_status;
  v_team_manager UUID;
BEGIN
  SELECT * INTO v_ver FROM public.deliverable_versions WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'VERSION_NOT_FOUND'; END IF;
  SELECT * INTO v_del FROM public.deliverables WHERE id = v_ver.deliverable_id FOR UPDATE;

  IF v_del.current_version_id IS DISTINCT FROM v_ver.id THEN
    RAISE EXCEPTION 'VERSION_NOT_CURRENT';
  END IF;
  IF p_decision = 'changes_requested' AND COALESCE(btrim(p_comment), '') = '' THEN
    RAISE EXCEPTION 'COMMENT_REQUIRED';
  END IF;

  IF p_stage = 'internal' THEN
    IF NOT (public.is_internal() AND (v_del.reviewer_user_id = v_uid OR public.is_admin())) THEN
      RAISE EXCEPTION 'NOT_REVIEWER';
    END IF;
    IF v_ver.creator_user_id = v_uid AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'CANNOT_REVIEW_OWN_VERSION';
    END IF;
    IF v_ver.status <> 'internal_review' THEN RAISE EXCEPTION 'VERSION_NOT_IN_INTERNAL_REVIEW'; END IF;
    v_new := CASE WHEN p_decision = 'approved' THEN 'approved_internally' ELSE 'internal_changes_requested' END;

  ELSIF p_stage = 'client' THEN
    IF NOT public.is_client_member(v_ver.target_client_id) THEN RAISE EXCEPTION 'NOT_CLIENT_MEMBER'; END IF;
    IF v_ver.status <> 'shared_with_client' THEN RAISE EXCEPTION 'VERSION_NOT_SHARED'; END IF;
    v_new := CASE WHEN p_decision = 'approved' THEN 'client_approved' ELSE 'client_changes_requested' END;
  END IF;

  INSERT INTO public.review_decisions (version_id, stage, decision, actor_user_id, comment)
  VALUES (p_version_id, p_stage, p_decision, v_uid, NULLIF(p_comment, ''));

  UPDATE public.deliverable_versions SET status = v_new WHERE id = p_version_id;
  UPDATE public.deliverables SET summary_status = v_new WHERE id = v_del.id;

  INSERT INTO public.activity_events (actor_user_id, event_type, reference_id, scope, changes)
  VALUES (v_uid, p_stage::text || '_review_decision', p_version_id, 'internal',
          jsonb_build_object('decision', p_decision, 'comment', NULLIF(p_comment, ''), 'version', v_ver.version_number));

  IF p_stage = 'internal' THEN
    PERFORM public._notify(v_ver.creator_user_id, 'internal_review_decision', '/deliverables',
      CASE WHEN p_decision = 'approved' THEN 'تم الاعتماد الداخلي: ' ELSE 'مطلوب تعديل داخلي: ' END
        || v_del.title || ' — نسخة ' || v_ver.version_number,
      'int_decision_' || p_version_id);
  ELSE
    SELECT t.manager_user_id INTO v_team_manager
    FROM public.projects p JOIN public.teams t ON t.id = p.internal_team_id
    WHERE p.id = v_del.project_id;
    PERFORM public._notify(v_del.reviewer_user_id, 'client_decision', '/deliverables',
      CASE WHEN p_decision = 'approved' THEN 'العميل اعتمد: ' ELSE 'العميل طلب تعديلات: ' END
        || v_del.title || ' — نسخة ' || v_ver.version_number,
      'client_decision_r_' || p_version_id);
    IF v_team_manager IS DISTINCT FROM v_del.reviewer_user_id THEN
      PERFORM public._notify(v_team_manager, 'client_decision', '/deliverables',
        CASE WHEN p_decision = 'approved' THEN 'العميل اعتمد: ' ELSE 'العميل طلب تعديلات: ' END
          || v_del.title || ' — نسخة ' || v_ver.version_number,
        'client_decision_m_' || p_version_id);
    END IF;
  END IF;
END;
$$;

-- 5d. Share with client — only after internal approval, only to the project's client
CREATE OR REPLACE FUNCTION public.share_version_with_client(p_version_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ver public.deliverable_versions%ROWTYPE;
  v_del public.deliverables%ROWTYPE;
  v_proj public.projects%ROWTYPE;
  v_member UUID;
BEGIN
  SELECT * INTO v_ver FROM public.deliverable_versions WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'VERSION_NOT_FOUND'; END IF;
  SELECT * INTO v_del FROM public.deliverables WHERE id = v_ver.deliverable_id FOR UPDATE;
  SELECT * INTO v_proj FROM public.projects WHERE id = v_del.project_id;

  IF NOT (public.is_admin() OR public.is_team_manager(v_proj.internal_team_id) OR v_del.reviewer_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  IF v_del.current_version_id IS DISTINCT FROM v_ver.id THEN RAISE EXCEPTION 'VERSION_NOT_CURRENT'; END IF;
  IF v_ver.status <> 'approved_internally' THEN RAISE EXCEPTION 'VERSION_NOT_APPROVED_INTERNALLY'; END IF;
  IF v_proj.client_id IS NULL THEN RAISE EXCEPTION 'PROJECT_HAS_NO_CLIENT'; END IF;

  UPDATE public.deliverable_versions
  SET status = 'shared_with_client', shared_at = now(), target_client_id = v_proj.client_id
  WHERE id = p_version_id;
  UPDATE public.deliverables SET summary_status = 'shared_with_client' WHERE id = v_del.id;

  INSERT INTO public.activity_events (actor_user_id, event_type, reference_id, scope, changes)
  VALUES (auth.uid(), 'version_shared_with_client', p_version_id, 'client',
          jsonb_build_object('version', v_ver.version_number));

  FOR v_member IN SELECT user_id FROM public.client_memberships WHERE client_id = v_proj.client_id LOOP
    PERFORM public._notify(v_member, 'deliverable_shared', '/client-portal',
                           'تسليم جديد في انتظار مراجعتك: ' || v_del.title,
                           'shared_' || p_version_id || '_' || v_member);
  END LOOP;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Files — scoped read, write only by uploader into an editable parent
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Files viewable by internal" ON public.files;
CREATE POLICY "Files viewable within scope" ON public.files FOR SELECT USING (
  public.is_admin()
  OR (files.task_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = files.task_id))
  OR (files.deliverable_version_id IS NOT NULL AND public.is_internal())
);

-- Clients could not read ANY file row before, so the portal always showed no files.
-- They may list files of versions shared with their company (download still
-- goes through the signed-URL API; the bucket stays private).
CREATE POLICY "Files of shared versions viewable by client" ON public.files FOR SELECT USING (
  files.deliverable_version_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.deliverable_versions v
    WHERE v.id = files.deliverable_version_id
      AND public.is_client_member(v.target_client_id)
      AND v.status IN ('shared_with_client','client_changes_requested','client_approved')
  )
);

DROP POLICY IF EXISTS "Files insertable by internal" ON public.files;
CREATE POLICY "Files insertable by uploader into editable parent" ON public.files FOR INSERT WITH CHECK (
  public.is_internal()
  AND uploader_user_id = auth.uid()
  AND (
    (files.task_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tasks t WHERE t.id = files.task_id
        AND (t.current_owner_user_id = auth.uid() OR public.is_team_manager(t.team_id) OR public.is_admin())))
    OR
    -- a version is a frozen snapshot once it leaves draft
    (files.deliverable_version_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.deliverable_versions v
      WHERE v.id = files.deliverable_version_id AND v.status = 'draft'))
  )
);

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Comments & activity — scoped, append-only
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Comments viewable by internal" ON public.comments;
CREATE POLICY "Comments viewable within scope" ON public.comments FOR SELECT USING (
  public.is_admin()
  OR (comments.task_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = comments.task_id))
  OR (comments.version_id IS NOT NULL AND public.is_internal())
);
DROP POLICY IF EXISTS "Comments insertable by internal" ON public.comments;
CREATE POLICY "Comments insertable on visible items" ON public.comments FOR INSERT WITH CHECK (
  public.is_internal() AND author_user_id = auth.uid() AND scope = 'internal'
  AND (
    (comments.task_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = comments.task_id))
    OR comments.version_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Activity events insertable by actor" ON public.activity_events;
CREATE POLICY "Activity events insertable by internal actor" ON public.activity_events FOR INSERT
  WITH CHECK (public.is_internal() AND actor_user_id = auth.uid() AND scope = 'internal');

-- ───────────────────────────────────────────────────────────────────────────
-- 8. Function grants — RPCs for signed-in users only
-- ───────────────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.update_task_status(UUID, task_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_handover(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_handover_decision(UUID, handover_status, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_deliverable_version(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_version_for_review(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_review_decision(UUID, review_stage, review_decision_type, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.share_version_with_client(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.update_task_status(UUID, task_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_handover(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_handover_decision(UUID, handover_status, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_deliverable_version(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_version_for_review(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_review_decision(UUID, review_stage, review_decision_type, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_version_with_client(UUID) TO authenticated;

-- Trigger functions are never callable over the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tasks_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tasks_after_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deliverables_before_insert() FROM PUBLIC, anon, authenticated;

COMMIT;

-- ════════ 20261007000008_api_grants.sql ════════
-- Migration 20261007000008_api_grants
--
-- This Supabase project does not auto-grant new public tables to the API
-- roles, so every query from the app failed with
-- "permission denied for table profiles" → the app saw no profile and
-- treated every account as inactive.
--
-- Table privileges only open the door; RLS (001–007) still decides which
-- ROWS each user can read or change. `anon` (logged-out) gets nothing.

BEGIN;

GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Helpers used inside RLS policies
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_internal() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_team_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_manager(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_client_member(UUID) TO authenticated;

-- Future tables created by migrations get the same treatment
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

COMMIT;

-- ════════ 20261019000009_task_delivery_flow.sql ════════
-- Migration 20261019000009_task_delivery_flow
--
-- One straight path from task to client, decided by the owners (Oct 2026):
--
--   employee delivers on the task ─► partner checks ─► sent to client ─► client decides
--                                        │ changes                           │ changes
--                                        └──────────► back to employee ◄─────┘
--
-- The task's delivery reuses deliverables/versions (same RLS, same two-stage
-- review, same frozen versions). What's new:
--   1. clients get a WhatsApp number + contact name for the "send on WhatsApp" button.
--   2. start_task_delivery(): the task owner opens a draft version for their task
--      without having to create a deliverable by hand.
--   3. When the client approves a task's delivery, the task completes itself.
--
-- Sharing with the client right after internal approval is done by the app
-- calling share_version_with_client(), which keeps all of its checks.
--
-- Safe to run once on a database that already has 001–008 applied.

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Client contact for WhatsApp
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_deliverables_source_task ON public.deliverables (source_task_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Open (or reopen) a delivery for a task → returns the draft version id
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_task_delivery(p_task_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_task public.tasks%ROWTYPE;
  v_client UUID;
  v_del public.deliverables%ROWTYPE;
  v_status deliverable_status;
  v_reviewer UUID;
  v_version UUID;
BEGIN
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TASK_NOT_FOUND'; END IF;

  IF NOT (v_task.current_owner_user_id = auth.uid()
          OR public.is_admin() OR public.is_team_manager(v_task.team_id)) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  IF v_task.status IN ('completed', 'canceled') THEN RAISE EXCEPTION 'TASK_ALREADY_CLOSED'; END IF;

  SELECT client_id INTO v_client FROM public.projects WHERE id = v_task.project_id;
  IF v_client IS NULL THEN RAISE EXCEPTION 'TASK_HAS_NO_CLIENT'; END IF;

  -- One deliverable per task; the newest one wins if older data has several.
  SELECT * INTO v_del FROM public.deliverables
  WHERE source_task_id = p_task_id
  ORDER BY created_at DESC LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Reviewer: the task's reviewer, else the team lead, else any active partner.
    SELECT COALESCE(
      (SELECT id FROM public.profiles WHERE id = v_task.reviewer_user_id AND status = 'active'),
      (SELECT t.manager_user_id FROM public.teams t JOIN public.profiles p ON p.id = t.manager_user_id
        WHERE t.id = v_task.team_id AND p.status = 'active'),
      (SELECT id FROM public.profiles WHERE role = 'admin' AND status = 'active' ORDER BY created_at LIMIT 1)
    ) INTO v_reviewer;
    IF v_reviewer IS NULL THEN RAISE EXCEPTION 'REVIEWER_INVALID'; END IF;

    INSERT INTO public.deliverables (project_id, source_task_id, title, description, reviewer_user_id)
    VALUES (v_task.project_id, p_task_id, v_task.title, v_task.description, v_reviewer)
    RETURNING * INTO v_del;
  END IF;

  SELECT status INTO v_status FROM public.deliverable_versions WHERE id = v_del.current_version_id;

  IF v_status = 'draft' THEN
    v_version := v_del.current_version_id;
  ELSIF v_status IN ('internal_review', 'approved_internally', 'shared_with_client') THEN
    RAISE EXCEPTION 'DELIVERY_IN_PROGRESS';
  ELSE
    -- No version yet, or the last one was closed (changes requested / approved)
    v_version := public.create_deliverable_version(v_del.id, NULL);
  END IF;

  IF v_task.status = 'todo' THEN
    UPDATE public.tasks SET status = 'in_progress' WHERE id = p_task_id;
  END IF;

  RETURN v_version;
END;
$$;

REVOKE ALL ON FUNCTION public.start_task_delivery(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_task_delivery(UUID) TO authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Client approval closes the task (and only that event does)
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deliverables_after_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner UUID;
BEGIN
  IF NEW.source_task_id IS NULL OR NEW.summary_status IS NOT DISTINCT FROM OLD.summary_status THEN
    RETURN NEW;
  END IF;

  IF NEW.summary_status = 'client_approved' THEN
    UPDATE public.tasks SET status = 'completed'
    WHERE id = NEW.source_task_id AND status NOT IN ('completed', 'canceled')
    RETURNING current_owner_user_id INTO v_owner;

    IF v_owner IS NOT NULL THEN
      INSERT INTO public.activity_events (actor_user_id, event_type, reference_id, changes, scope)
      VALUES (COALESCE(auth.uid(), v_owner), 'task_status_changed', NEW.source_task_id,
              jsonb_build_object('new_status', 'completed', 'reason', 'client_approved'), 'internal');
      PERFORM public._notify(v_owner, 'client_decision', '/my-work',
                             'العميل وافق على: ' || NEW.title, 'task_done_' || NEW.id || '_' || NEW.current_version_id);
    END IF;

  ELSIF NEW.summary_status IN ('internal_changes_requested', 'client_changes_requested') THEN
    -- Tell the person doing the work, not only the version's creator.
    SELECT current_owner_user_id INTO v_owner FROM public.tasks WHERE id = NEW.source_task_id;
    PERFORM public._notify(v_owner, 'changes_requested', '/my-work',
                           'مطلوب تعديل على: ' || NEW.title, 'task_changes_' || NEW.current_version_id || '_' || NEW.summary_status);
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS deliverables_after_status ON public.deliverables;
CREATE TRIGGER deliverables_after_status AFTER UPDATE OF summary_status ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.deliverables_after_status();
REVOKE ALL ON FUNCTION public.deliverables_after_status() FROM PUBLIC, anon, authenticated;

COMMIT;

-- ════════ 20261020000010_review_links_and_team_whatsapp.sql ════════
-- Migration 20261020000010_review_links_and_team_whatsapp
--
-- 1. Team members get a WhatsApp number, so partners can nudge late work.
-- 2. Review links: the client approves or asks for changes from a link sent
--    on WhatsApp, without signing in.
--
-- How a review link stays safe:
--   - The app makes a random 192-bit token and stores only its SHA-256 hash.
--   - A link opens one shared version of one deliverable, nothing else.
--   - It expires after 14 days, and stops working once the version is
--     decided (approved or changes requested) or replaced by a newer one.
--   - Only people allowed to share with the client can create one.
--   - Reading a link and deciding through it happen ONLY on the server with
--     the service role (functions below are not executable by anon or
--     signed-in users), so the table is never exposed to the API.
--
-- Safe to run once on a database that already has 001–009 applied.

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Team WhatsApp
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Review links
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.review_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID NOT NULL REFERENCES public.deliverable_versions(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_review_links_version ON public.review_links (version_id);

-- RLS on with no policies: the API can't read or write this table at all.
ALTER TABLE public.review_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.review_links FROM anon, authenticated;
GRANT ALL ON public.review_links TO service_role;

-- A decision made through a link has no signed-in actor; mark where it came from.
ALTER TABLE public.review_decisions ADD COLUMN IF NOT EXISTS via_link BOOLEAN NOT NULL DEFAULT false;

-- 2a. Create a link (signed-in partner / team lead / reviewer)
CREATE OR REPLACE FUNCTION public.create_review_link(p_version_id UUID, p_token_hash TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ver public.deliverable_versions%ROWTYPE;
  v_del public.deliverables%ROWTYPE;
  v_team UUID;
BEGIN
  SELECT * INTO v_ver FROM public.deliverable_versions WHERE id = p_version_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'VERSION_NOT_FOUND'; END IF;
  SELECT * INTO v_del FROM public.deliverables WHERE id = v_ver.deliverable_id;
  SELECT internal_team_id INTO v_team FROM public.projects WHERE id = v_del.project_id;

  IF NOT (public.is_admin() OR public.is_team_manager(v_team) OR v_del.reviewer_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  IF v_del.current_version_id IS DISTINCT FROM v_ver.id THEN RAISE EXCEPTION 'VERSION_NOT_CURRENT'; END IF;
  IF v_ver.status <> 'shared_with_client' THEN RAISE EXCEPTION 'VERSION_NOT_SHARED'; END IF;
  IF p_token_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  INSERT INTO public.review_links (version_id, token_hash, created_by)
  VALUES (p_version_id, p_token_hash, auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION public.create_review_link(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_review_link(UUID, TEXT) TO authenticated;

-- 2b. The client's decision through a link (server only, service role)
CREATE OR REPLACE FUNCTION public.decide_by_review_link(
  p_token_hash TEXT,
  p_decision review_decision_type,
  p_comment TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_link public.review_links%ROWTYPE;
  v_ver public.deliverable_versions%ROWTYPE;
  v_del public.deliverables%ROWTYPE;
  v_new deliverable_status;
  v_team_manager UUID;
BEGIN
  SELECT * INTO v_link FROM public.review_links WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND OR v_link.expires_at < now() THEN RAISE EXCEPTION 'LINK_INVALID'; END IF;

  SELECT * INTO v_ver FROM public.deliverable_versions WHERE id = v_link.version_id FOR UPDATE;
  SELECT * INTO v_del FROM public.deliverables WHERE id = v_ver.deliverable_id FOR UPDATE;
  IF v_del.current_version_id IS DISTINCT FROM v_ver.id OR v_ver.status <> 'shared_with_client' THEN
    RAISE EXCEPTION 'LINK_ALREADY_DECIDED';
  END IF;
  IF p_decision = 'changes_requested' AND COALESCE(btrim(p_comment), '') = '' THEN
    RAISE EXCEPTION 'COMMENT_REQUIRED';
  END IF;

  v_new := CASE WHEN p_decision = 'approved' THEN 'client_approved' ELSE 'client_changes_requested' END;

  INSERT INTO public.review_decisions (version_id, stage, decision, actor_user_id, comment, via_link)
  VALUES (v_ver.id, 'client', p_decision, NULL, NULLIF(btrim(p_comment), ''), true);

  UPDATE public.deliverable_versions SET status = v_new WHERE id = v_ver.id;
  UPDATE public.deliverables SET summary_status = v_new WHERE id = v_del.id;
  UPDATE public.review_links SET used_at = now() WHERE id = v_link.id;

  INSERT INTO public.activity_events (actor_user_id, event_type, reference_id, scope, changes)
  VALUES (NULL, 'client_review_decision', v_ver.id, 'internal',
          jsonb_build_object('decision', p_decision, 'comment', NULLIF(btrim(p_comment), ''),
                             'version', v_ver.version_number, 'via_link', true));

  SELECT t.manager_user_id INTO v_team_manager
  FROM public.projects p JOIN public.teams t ON t.id = p.internal_team_id
  WHERE p.id = v_del.project_id;

  PERFORM public._notify(v_del.reviewer_user_id, 'client_decision', '/today',
    CASE WHEN p_decision = 'approved' THEN 'العميل اعتمد: ' ELSE 'العميل طلب تعديلات: ' END
      || v_del.title || ' — نسخة ' || v_ver.version_number,
    'client_decision_r_' || v_ver.id);
  IF v_team_manager IS DISTINCT FROM v_del.reviewer_user_id THEN
    PERFORM public._notify(v_team_manager, 'client_decision', '/today',
      CASE WHEN p_decision = 'approved' THEN 'العميل اعتمد: ' ELSE 'العميل طلب تعديلات: ' END
        || v_del.title || ' — نسخة ' || v_ver.version_number,
      'client_decision_m_' || v_ver.id);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.decide_by_review_link(TEXT, review_decision_type, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decide_by_review_link(TEXT, review_decision_type, TEXT) TO service_role;

COMMIT;
