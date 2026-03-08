
-- Add category-specific columns to inventory
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS cargo text DEFAULT '';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS marca text DEFAULT '';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS contrato text DEFAULT '';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS gestor text DEFAULT '';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS email_address text DEFAULT '';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS operadora text DEFAULT '';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS numero text DEFAULT '';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS imei1 text DEFAULT '';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS imei2 text DEFAULT '';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS service_tag_2 text DEFAULT '';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS licenca text DEFAULT '';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS cost_center_eng text DEFAULT '';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS cost_center_man text DEFAULT '';

-- Update generate_asset_code to handle new categories
CREATE OR REPLACE FUNCTION public.generate_asset_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  prefix TEXT;
  next_seq INTEGER;
BEGIN
  CASE NEW.category
    WHEN 'notebooks' THEN prefix := 'NB';
    WHEN 'celulares' THEN prefix := 'CEL';
    WHEN 'linhas' THEN prefix := 'LIN';
    WHEN 'licencas' THEN prefix := 'LIC';
    WHEN 'hardware' THEN prefix := 'HW';
    WHEN 'passwords' THEN prefix := 'PW';
    WHEN 'telecom' THEN prefix := 'TEL';
    WHEN 'licenses' THEN prefix := 'LIC';
    ELSE prefix := 'AST';
  END CASE;
  
  SELECT COALESCE(MAX(
    CAST(split_part(asset_code, '-', 2) AS INTEGER)
  ), 0) + 1
  INTO next_seq
  FROM public.inventory
  WHERE asset_code LIKE prefix || '-%';
  
  NEW.asset_code := prefix || '-' || lpad(next_seq::TEXT, 3, '0');
  RETURN NEW;
END;
$function$;

-- Migrate existing data to new categories
UPDATE public.inventory SET category = 'notebooks' WHERE category = 'hardware';
UPDATE public.inventory SET category = 'linhas' WHERE category = 'telecom';
UPDATE public.inventory SET category = 'licencas' WHERE category = 'licenses';
