
-- Status configuration table
CREATE TABLE public.status_config (
  id text PRIMARY KEY,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  cor text NOT NULL DEFAULT '221 83% 53%',
  ativo boolean NOT NULL DEFAULT true,
  is_final boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.status_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read status_config" ON public.status_config FOR SELECT USING (true);
CREATE POLICY "Anyone can insert status_config" ON public.status_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update status_config" ON public.status_config FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete status_config" ON public.status_config FOR DELETE USING (true);

-- Seed default statuses
INSERT INTO public.status_config (id, nome, ordem, cor, ativo, is_final) VALUES
  ('pending', 'Pendente', 1, '38 92% 50%', true, false),
  ('inProgress', 'Em Andamento', 2, '199 89% 48%', true, false),
  ('waitingUser', 'Aguardando Usuário', 3, '280 67% 60%', true, false),
  ('completed', 'Concluído', 4, '142 76% 36%', true, true),
  ('cancelled', 'Cancelado', 5, '0 84% 60%', true, true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.status_config;
