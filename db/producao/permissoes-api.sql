-- Permissões do usuário da API no Neon de produção (docs/ARQUITETURA.md, seção 5).
--
-- A API (pelo Hyperdrive) usa o usuário sospatas_api, que só lê e grava dados: não cria,
-- altera nem apaga tabelas. As migrations rodam com o dono do banco (neondb_owner), só no
-- deploy (GitHub Actions). Assim, se a API for invadida, ninguém apaga a estrutura do banco.
--
-- Como usar (uma vez, ou de novo se o projeto do Neon for recriado):
--   1. No Neon, projeto sospatas, branch production: Roles → New role → "sospatas_api".
--      Guardar a senha em privado/dados-sensiveis/.
--   2. Depois das migrations, rodar este arquivo no SQL Editor (banco neondb), como neondb_owner.
-- As tabelas criadas por migrations futuras recebem as mesmas permissões sozinhas (DEFAULT
-- PRIVILEGES), desde que as migrations rodem com o neondb_owner.

GRANT CONNECT ON DATABASE neondb TO sospatas_api;
GRANT USAGE ON SCHEMA public TO sospatas_api;

-- Dados: ler, incluir, alterar e apagar linhas. Sem TRUNCATE, sem DDL.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sospatas_api;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sospatas_api;

ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sospatas_api;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO sospatas_api;

-- O controle das migrations (schema drizzle) não é da API
REVOKE ALL ON SCHEMA drizzle FROM sospatas_api;

-- Conferência: deve listar só SELECT, INSERT, UPDATE e DELETE nas tabelas do site
SELECT table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS permissoes
FROM information_schema.role_table_grants
WHERE grantee = 'sospatas_api'
GROUP BY table_name
ORDER BY table_name;
