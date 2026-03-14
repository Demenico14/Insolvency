-- =====================================================
-- 007_notifications.sql
-- Real notifications when a file is assigned to an officer
-- =====================================================

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('file_assigned', 'file_updated', 'status_change', 'system')),
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  file_id     UUID        REFERENCES public.files(id) ON DELETE CASCADE,
  file_ref    TEXT,
  read        BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read      ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created   ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role / triggers can insert
CREATE POLICY "notifications_insert_service"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- Trigger: notify officer when assigned to a file
-- Looks up officer email → finds auth user → inserts notification
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_file_assignment()
RETURNS TRIGGER AS $$
DECLARE
  officer_email TEXT;
  target_user_id UUID;
  file_ref_val TEXT;
  client_name_val TEXT;
BEGIN
  -- Only fire when assigned_officer_id is newly set or changed
  IF (TG_OP = 'INSERT' AND NEW.assigned_officer_id IS NULL) THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    -- Skip if officer didn't change
    IF NEW.assigned_officer_id IS NOT DISTINCT FROM OLD.assigned_officer_id THEN
      RETURN NEW;
    END IF;
    -- Skip if being cleared
    IF NEW.assigned_officer_id IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Get officer email
  SELECT email INTO officer_email
  FROM public.officers
  WHERE id = NEW.assigned_officer_id;

  IF officer_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find matching auth user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = officer_email;

  IF target_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  file_ref_val   := NEW.file_reference;
  client_name_val := NEW.client_name;

  INSERT INTO public.notifications (user_id, type, title, message, file_id, file_ref)
  VALUES (
    target_user_id,
    'file_assigned',
    'File Assigned to You',
    'You have been assigned file ' || file_ref_val || ' — ' || client_name_val,
    NEW.id,
    file_ref_val
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

DROP TRIGGER IF EXISTS on_file_assigned ON public.files;
CREATE TRIGGER on_file_assigned
  AFTER INSERT OR UPDATE OF assigned_officer_id ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_file_assignment();

-- Enable realtime on notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;