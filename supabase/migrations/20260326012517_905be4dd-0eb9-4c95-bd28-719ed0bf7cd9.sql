ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{
  "criar_chamados": true,
  "atender_chamados": false,
  "gerenciar_estoque": false,
  "ver_custos_faturas": false,
  "ver_dashboard_financeiro": false,
  "acessar_kanban_marketing": false,
  "acessar_cofre_senhas": false,
  "acesso_admin_global": false
}'::jsonb;