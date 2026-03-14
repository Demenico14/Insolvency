-- =====================================================
-- Notifications System Migration
-- =====================================================

-- Notifications table for file assignments and updates
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('file_assignment', 'file_update', 'status_change', 'deadline', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  file_reference TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can only see their own notifications
CREATE POLICY "notifications_select_own" ON notifications 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON notifications 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "notifications_update_own" ON notifications 
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "notifications_delete_own" ON notifications 
  FOR DELETE TO authenticated 
  USING (user_id = auth.uid());

-- =====================================================
-- Function to create notification on file assignment
-- =====================================================
CREATE OR REPLACE FUNCTION notify_file_assignment()
RETURNS TRIGGER AS $$
DECLARE
  assigned_user_id UUID;
  file_ref TEXT;
  client TEXT;
BEGIN
  -- Get the user_id associated with the assigned officer
  SELECT up.user_id INTO assigned_user_id
  FROM user_profiles up
  JOIN officers o ON o.name = CONCAT(up.first_name, ' ', up.last_name)
  WHERE o.id = NEW.assigned_officer_id;
  
  -- If no user found, try matching by officer id in user metadata or profile
  IF assigned_user_id IS NULL THEN
    -- Fallback: check if there's a user profile linked to this officer
    SELECT user_id INTO assigned_user_id
    FROM user_profiles
    WHERE id::text = NEW.assigned_officer_id::text
    LIMIT 1;
  END IF;
  
  IF assigned_user_id IS NOT NULL THEN
    -- Get file reference and client name
    file_ref := NEW.file_reference;
    client := NEW.client_name;
    
    -- Create notification for the assigned user
    INSERT INTO notifications (user_id, type, title, message, file_id, file_reference)
    VALUES (
      assigned_user_id,
      'file_assignment',
      'New File Assigned',
      'You have been assigned file ' || file_ref || ' for client ' || client,
      NEW.id,
      file_ref
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function to notify on file reassignment
-- =====================================================
CREATE OR REPLACE FUNCTION notify_file_reassignment()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id UUID;
  old_user_id UUID;
  file_ref TEXT;
  client TEXT;
BEGIN
  -- Only trigger if officer actually changed
  IF OLD.assigned_officer_id IS DISTINCT FROM NEW.assigned_officer_id THEN
    -- Get the new user_id associated with the new officer
    SELECT up.user_id INTO new_user_id
    FROM user_profiles up
    JOIN officers o ON o.name = CONCAT(up.first_name, ' ', up.last_name)
    WHERE o.id = NEW.assigned_officer_id;
    
    -- Get file details
    file_ref := NEW.file_reference;
    client := NEW.client_name;
    
    IF new_user_id IS NOT NULL THEN
      -- Create notification for the new assigned user
      INSERT INTO notifications (user_id, type, title, message, file_id, file_reference)
      VALUES (
        new_user_id,
        'file_assignment',
        'File Reassigned to You',
        'File ' || file_ref || ' for client ' || client || ' has been reassigned to you',
        NEW.id,
        file_ref
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function to notify on file status change
-- =====================================================
CREATE OR REPLACE FUNCTION notify_file_status_change()
RETURNS TRIGGER AS $$
DECLARE
  assigned_user_id UUID;
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get the user_id associated with the assigned officer
    SELECT up.user_id INTO assigned_user_id
    FROM user_profiles up
    JOIN officers o ON o.name = CONCAT(up.first_name, ' ', up.last_name)
    WHERE o.id = NEW.assigned_officer_id;
    
    IF assigned_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, file_id, file_reference)
      VALUES (
        assigned_user_id,
        'status_change',
        'File Status Updated',
        'File ' || NEW.file_reference || ' status changed from ' || OLD.status || ' to ' || NEW.status,
        NEW.id,
        NEW.file_reference
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS on_file_assignment ON files;
CREATE TRIGGER on_file_assignment
  AFTER INSERT ON files
  FOR EACH ROW
  WHEN (NEW.assigned_officer_id IS NOT NULL)
  EXECUTE FUNCTION notify_file_assignment();

DROP TRIGGER IF EXISTS on_file_reassignment ON files;
CREATE TRIGGER on_file_reassignment
  AFTER UPDATE ON files
  FOR EACH ROW
  WHEN (OLD.assigned_officer_id IS DISTINCT FROM NEW.assigned_officer_id)
  EXECUTE FUNCTION notify_file_reassignment();

DROP TRIGGER IF EXISTS on_file_status_change ON files;
CREATE TRIGGER on_file_status_change
  AFTER UPDATE ON files
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_file_status_change();

-- =====================================================
-- Helper functions for notifications
-- =====================================================

-- Get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM notifications
  WHERE user_id = p_user_id AND is_read = false;
  
  RETURN COALESCE(count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW()
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
