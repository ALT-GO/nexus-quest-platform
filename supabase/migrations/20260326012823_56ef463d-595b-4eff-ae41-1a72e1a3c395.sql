-- Audit logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  entity_type text NOT NULL DEFAULT '',
  entity_id text DEFAULT '',
  details text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read audit_logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Any authenticated user can insert (the app logs on their behalf)
CREATE POLICY "Authenticated can insert audit_logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- SLA settings table (singleton row)
CREATE TABLE public.sla_settings (
  id text PRIMARY KEY DEFAULT 'default',
  business_start time NOT NULL DEFAULT '08:00',
  business_end time NOT NULL DEFAULT '18:00',
  working_days integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  business_hours_only boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sla_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read SLA settings
CREATE POLICY "Anyone can read sla_settings"
ON public.sla_settings FOR SELECT
TO public
USING (true);

-- Only admins can update
CREATE POLICY "Admins can update sla_settings"
ON public.sla_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert
CREATE POLICY "Admins can insert sla_settings"
ON public.sla_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed default row
INSERT INTO public.sla_settings (id) VALUES ('default');