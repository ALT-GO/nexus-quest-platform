
-- Update handle_new_user to assign role from invite if exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  -- Check if there's an invite for this email and assign that role
  IF EXISTS (SELECT 1 FROM public.user_invites WHERE email = NEW.email AND accepted_at IS NULL) THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT NEW.id, ui.role FROM public.user_invites ui WHERE ui.email = NEW.email AND ui.accepted_at IS NULL LIMIT 1;
    
    UPDATE public.user_invites SET accepted_at = now() WHERE email = NEW.email AND accepted_at IS NULL;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'colaborador');
  END IF;

  RETURN NEW;
END;
$$;
