ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS data_bloqueio date DEFAULT NULL;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS comments text DEFAULT '';