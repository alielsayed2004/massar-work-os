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
