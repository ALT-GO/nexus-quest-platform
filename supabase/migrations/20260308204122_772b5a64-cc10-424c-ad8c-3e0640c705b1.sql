
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_type text NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}',
  action_type text NOT NULL,
  action_config jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read automation_rules" ON public.automation_rules FOR SELECT USING (true);
CREATE POLICY "Anyone can insert automation_rules" ON public.automation_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update automation_rules" ON public.automation_rules FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete automation_rules" ON public.automation_rules FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_rules;
