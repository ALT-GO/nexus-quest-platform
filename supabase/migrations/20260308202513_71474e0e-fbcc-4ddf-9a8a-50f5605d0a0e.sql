
-- Inventory table for all asset categories
CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'hardware',
  asset_code text NOT NULL,
  status text NOT NULL DEFAULT 'Disponível',
  collaborator text DEFAULT '',
  cost_center text DEFAULT '',
  sector text DEFAULT '',
  model text DEFAULT '',
  asset_type text DEFAULT '',
  service_tag text DEFAULT '',
  notes text DEFAULT '',
  reserved_by_ticket_id text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Custom fields metadata
CREATE TABLE public.custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  field_type text NOT NULL DEFAULT 'texto',
  category text NOT NULL DEFAULT 'hardware',
  options text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Custom field values per asset
CREATE TABLE public.custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
  field_id uuid REFERENCES public.custom_fields(id) ON DELETE CASCADE NOT NULL,
  value text DEFAULT '',
  UNIQUE(asset_id, field_id)
);

-- Enable RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

-- RLS policies (public access for now, auth will be added later)
CREATE POLICY "Anyone can read inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Anyone can insert inventory" ON public.inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update inventory" ON public.inventory FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete inventory" ON public.inventory FOR DELETE USING (true);

CREATE POLICY "Anyone can read custom_fields" ON public.custom_fields FOR SELECT USING (true);
CREATE POLICY "Anyone can insert custom_fields" ON public.custom_fields FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update custom_fields" ON public.custom_fields FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete custom_fields" ON public.custom_fields FOR DELETE USING (true);

CREATE POLICY "Anyone can read custom_field_values" ON public.custom_field_values FOR SELECT USING (true);
CREATE POLICY "Anyone can insert custom_field_values" ON public.custom_field_values FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update custom_field_values" ON public.custom_field_values FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete custom_field_values" ON public.custom_field_values FOR DELETE USING (true);

-- Auto-generate asset codes
CREATE OR REPLACE FUNCTION public.generate_asset_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  prefix TEXT;
  next_seq INTEGER;
BEGIN
  CASE NEW.category
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
$$;

CREATE TRIGGER set_asset_code
  BEFORE INSERT ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_asset_code();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_fields;
