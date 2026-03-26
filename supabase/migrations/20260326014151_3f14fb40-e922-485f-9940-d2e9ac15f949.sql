-- Drop public policies on automation_rules
DROP POLICY IF EXISTS "Anyone can read automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Anyone can insert automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Anyone can update automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Anyone can delete automation_rules" ON public.automation_rules;

-- Admin/TI only policies
CREATE POLICY "Admin and TI can read automation_rules"
ON public.automation_rules FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ti'::app_role));

CREATE POLICY "Admin can insert automation_rules"
ON public.automation_rules FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update automation_rules"
ON public.automation_rules FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete automation_rules"
ON public.automation_rules FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));