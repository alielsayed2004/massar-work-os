-- Migration 20261020000011_record_client_decision
--
-- Clients often answer on WhatsApp instead of the portal. A partner, the
-- project's team lead or the deliverable's reviewer can record that answer
-- on the client's behalf. The decision is marked recorded_by_team so the
-- history always shows it did not come from the client's own account.
--
-- Safe to run once on a database that already has 001–010 applied.

BEGIN;

ALTER TABLE public.review_decisions ADD COLUMN IF NOT EXISTS recorded_by_team BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.record_client_decision(
  p_version_id UUID,
  p_decision review_decision_type,
  p_comment TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ver public.deliverable_versions%ROWTYPE;
  v_del public.deliverables%ROWTYPE;
  v_team UUID;
  v_new deliverable_status;
BEGIN
  SELECT * INTO v_ver FROM public.deliverable_versions WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'VERSION_NOT_FOUND'; END IF;
  SELECT * INTO v_del FROM public.deliverables WHERE id = v_ver.deliverable_id FOR UPDATE;
  SELECT internal_team_id INTO v_team FROM public.projects WHERE id = v_del.project_id;

  IF NOT (public.is_admin() OR public.is_team_manager(v_team) OR v_del.reviewer_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  IF v_del.current_version_id IS DISTINCT FROM v_ver.id THEN RAISE EXCEPTION 'VERSION_NOT_CURRENT'; END IF;
  IF v_ver.status <> 'shared_with_client' THEN RAISE EXCEPTION 'VERSION_NOT_SHARED'; END IF;
  IF p_decision = 'changes_requested' AND COALESCE(btrim(p_comment), '') = '' THEN
    RAISE EXCEPTION 'COMMENT_REQUIRED';
  END IF;

  v_new := CASE WHEN p_decision = 'approved' THEN 'client_approved' ELSE 'client_changes_requested' END;

  INSERT INTO public.review_decisions (version_id, stage, decision, actor_user_id, comment, recorded_by_team)
  VALUES (v_ver.id, 'client', p_decision, auth.uid(), NULLIF(btrim(p_comment), ''), true);

  UPDATE public.deliverable_versions SET status = v_new WHERE id = v_ver.id;
  UPDATE public.deliverables SET summary_status = v_new WHERE id = v_del.id;
  -- Any open review link for this version is now answered
  UPDATE public.review_links SET used_at = now() WHERE version_id = v_ver.id AND used_at IS NULL;

  INSERT INTO public.activity_events (actor_user_id, event_type, reference_id, scope, changes)
  VALUES (auth.uid(), 'client_review_decision', v_ver.id, 'internal',
          jsonb_build_object('decision', p_decision, 'comment', NULLIF(btrim(p_comment), ''),
                             'version', v_ver.version_number, 'recorded_by_team', true));
END;
$$;
REVOKE ALL ON FUNCTION public.record_client_decision(UUID, review_decision_type, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_client_decision(UUID, review_decision_type, TEXT) TO authenticated;

COMMIT;
