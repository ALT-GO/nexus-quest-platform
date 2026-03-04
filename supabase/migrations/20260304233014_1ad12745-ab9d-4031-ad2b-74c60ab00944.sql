
-- Create tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status_id TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  requester TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  assignee TEXT,
  asset_id TEXT,
  sla_hours INTEGER NOT NULL DEFAULT 24,
  sla_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  sla_expired BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Public can insert (for the public form)
CREATE POLICY "Anyone can create tickets" ON public.tickets
  FOR INSERT WITH CHECK (true);

-- Public can read tickets (service desk is not behind auth yet)
CREATE POLICY "Anyone can read tickets" ON public.tickets
  FOR SELECT USING (true);

-- Public can update tickets
CREATE POLICY "Anyone can update tickets" ON public.tickets
  FOR UPDATE USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;

-- Create a sequence for ticket numbering per year
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_year TEXT;
  next_seq INTEGER;
BEGIN
  current_year := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(split_part(ticket_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO next_seq
  FROM public.tickets
  WHERE ticket_number LIKE 'TI-' || current_year || '-%';
  
  NEW.ticket_number := 'TI-' || current_year || '-' || lpad(next_seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
  EXECUTE FUNCTION public.generate_ticket_number();
