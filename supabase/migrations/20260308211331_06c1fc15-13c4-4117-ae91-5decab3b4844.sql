
-- Create timesheet_logs table
CREATE TABLE public.timesheet_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timesheet_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can read timesheet_logs" ON public.timesheet_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert timesheet_logs" ON public.timesheet_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update timesheet_logs" ON public.timesheet_logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete timesheet_logs" ON public.timesheet_logs FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.timesheet_logs;
