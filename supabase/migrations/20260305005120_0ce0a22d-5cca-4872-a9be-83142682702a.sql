
-- Comments table
CREATE TABLE public.ticket_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  avatar_url TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- History/audit log table
CREATE TABLE public.ticket_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Sistema',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments" ON public.ticket_comments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert comments" ON public.ticket_comments FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read history" ON public.ticket_history FOR SELECT USING (true);
CREATE POLICY "Anyone can insert history" ON public.ticket_history FOR INSERT WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_history;
