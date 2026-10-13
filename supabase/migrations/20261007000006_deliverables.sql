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
