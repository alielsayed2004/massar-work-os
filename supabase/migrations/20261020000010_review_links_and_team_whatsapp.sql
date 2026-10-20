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
