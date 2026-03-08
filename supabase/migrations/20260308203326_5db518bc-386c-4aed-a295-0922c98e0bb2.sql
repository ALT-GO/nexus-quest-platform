
ALTER TABLE public.status_config ADD COLUMN status_type text NOT NULL DEFAULT 'todo';

-- Update existing statuses with correct types
UPDATE public.status_config SET status_type = 'todo' WHERE id = 'pending';
UPDATE public.status_config SET status_type = 'in_progress' WHERE id = 'inProgress';
UPDATE public.status_config SET status_type = 'in_progress' WHERE id = 'waitingUser';
UPDATE public.status_config SET status_type = 'done' WHERE id = 'completed';
UPDATE public.status_config SET status_type = 'done' WHERE id = 'cancelled';
