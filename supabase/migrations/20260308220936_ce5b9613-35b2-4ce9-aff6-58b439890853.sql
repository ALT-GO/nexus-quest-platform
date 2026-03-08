
ALTER TABLE public.tickets ADD COLUMN parent_ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL DEFAULT NULL;
