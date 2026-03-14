-- 008_add_complete_status.sql
-- Adds 'Complete' as a valid file status

ALTER TABLE public.files
  DROP CONSTRAINT IF EXISTS files_status_check;

ALTER TABLE public.files
  ADD CONSTRAINT files_status_check
  CHECK (status IN ('Active', 'Archived', 'Missing', 'Complete'));