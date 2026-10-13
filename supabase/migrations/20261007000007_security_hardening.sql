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
