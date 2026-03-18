
ALTER TABLE public.tickets 
  ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS external_notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bucket_name text DEFAULT '';
