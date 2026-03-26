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
    WHEN 'tablets' THEN prefix := 'TAB';
    WHEN 'perifericos' THEN prefix := 'PER';
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