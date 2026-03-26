
CREATE TABLE public.password_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name text NOT NULL,
  username text NOT NULL DEFAULT '',
  password_value text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.password_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TI and Admin can select password_vault"
  ON public.password_vault FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ti'::app_role)
  );

CREATE POLICY "TI and Admin can insert password_vault"
  ON public.password_vault FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ti'::app_role)
  );

CREATE POLICY "TI and Admin can update password_vault"
  ON public.password_vault FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ti'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ti'::app_role)
  );

CREATE POLICY "TI and Admin can delete password_vault"
  ON public.password_vault FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ti'::app_role)
  );
