
CREATE TABLE public.user_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'colaborador',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz DEFAULT NULL,
  UNIQUE(email)
);

ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Admins can manage invites
CREATE POLICY "Admins can manage invites" ON public.user_invites
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone (including anon) can check if their email has an invite (for signup validation)
CREATE POLICY "Anon can check invites by email" ON public.user_invites
FOR SELECT TO anon
USING (true);

-- Authenticated users can read invites
CREATE POLICY "Authenticated can read invites" ON public.user_invites
FOR SELECT TO authenticated
USING (true);
