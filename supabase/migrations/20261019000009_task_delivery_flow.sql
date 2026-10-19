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
