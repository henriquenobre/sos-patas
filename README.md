# SOS Patas: site de adoção

Site de adoção de animais para a **ONG SOS Patas**, de Passos/MG, desenvolvido de forma voluntária.

🔗 **Protótipo:** https://henriquenobre.github.io/sos-patas/

## O que tem aqui

**Aplicação** (o site)

| Pasta | Conteúdo |
|---|---|
| [apps/web/](apps/web/) | Site (front): React + Vite + Tailwind |
| [apps/api/](apps/api/) | API: Hono no Cloudflare Workers |
| [packages/compartilhado/](packages/compartilhado/) | Limites, tipos e validações usados pelo front, pela API e pelo banco |
| [db/](db/) | Banco: schema (Drizzle), migrations, seed e testes |

**Documentação** ([docs/](docs/))

| Arquivo | Conteúdo |
|---|---|
| [DESENVOLVIMENTO.md](docs/DESENVOLVIMENTO.md) | Guia técnico: escopo, modelo de dados, regras de negócio e registro de decisões |
| [ARQUITETURA.md](docs/ARQUITETURA.md) | Arquitetura e hospedagem: front, API, banco, fotos, login, deploy e backup |
| [PLANO_DESENVOLVIMENTO.md](docs/PLANO_DESENVOLVIMENTO.md) | Plano de desenvolvimento em etapas, com painel de status |
| [LINHA_DO_TEMPO.md](docs/LINHA_DO_TEMPO.md) | Datas reais de cada fase, da concepção à entrega |
| [formulario/](docs/formulario/) | Formulário de interesse em adoção (em validação) e termo de adoção |
| [CLAUDE.md](CLAUDE.md) | Regras de manutenção do projeto: o que atualizar a cada alteração (fica na raiz, onde o Claude Code procura) |

**Protótipo** ([prototipo/](prototipo/))

| Arquivo | Conteúdo |
|---|---|
| [index.html](prototipo/index.html) | Protótipo navegável das telas (HTML + Tailwind) |
| [TELAS.md](prototipo/TELAS.md) | Especificação de cada tela |
| [telas/](prototipo/telas/) | Prints das telas no celular e no computador |

## Tecnologias

React + Vite + TypeScript + Tailwind CSS 4 (Cloudflare Pages) · API em Hono (Cloudflare Workers) · PostgreSQL (Neon) · Fotos no Cloudflare R2 · Login pelo Cloudflare Access. Detalhes: [ARQUITETURA.md](docs/ARQUITETURA.md).

## Como rodar localmente

**Precisa de:** Node 24 (`nvm use 24`), pnpm (`corepack enable pnpm`) e Docker Desktop aberto.

```bash
pnpm install                                   # dependências (também gera os tipos do Worker)
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm db:up                                     # Postgres 18 no Docker (bancos sospatas e sospatas_teste)
pnpm db:migrate && pnpm db:seed                # tabelas, conteúdo inicial e animais de exemplo
pnpm db:fotos-historia                         # fotos da história da ONG no R2 local (uma vez)
pnpm db:fotos-exemplo                          # fotos ilustrativas dos animais de exemplo (depois de cada db:seed)
pnpm dev                                       # site em http://localhost:5173 e API em http://localhost:8787
```

Sem o `.dev.vars`, a API roda como se fosse produção. Páginas prontas: Início, vitrine (com filtros na URL), ficha do animal, formulário de adoção ("Quero adotar"), Como adotar, Perguntas frequentes, Como ajudar, Fale com a ONG, Privacidade e Perdidos e encontrados (lista e anúncio).

**Testar no celular:** com o computador e o celular na mesma rede Wi-Fi, rode `pnpm dev:celular` em vez de `pnpm dev`. O Vite mostra um endereço como `http://192.168.0.10:5173` ("Network"): abra esse endereço no celular. Na primeira vez, o Windows pode pedir para liberar o Node no firewall (permitir só em redes privadas).

**Área da ONG no computador:** abra `http://localhost:5173/admin` (animais, pedidos de adoção, perdidos e encontrados, textos do site, dados da ONG e protetores). Sem Cloudflare Access, a API trata as chamadas de `/api/admin` como vindas de `teste@sospatas.local` (modo local do `.dev.vars`, usuária criada pelo `pnpm db:seed`); "Sair" só funciona com o Access (etapa 14). Para conferir a API sozinha: `http://localhost:8787/api/admin/eu`.

**Variável nova na API:** acrescentar em `apps/api/.dev.vars.example` (os tipos do `env` são gerados dele) e no `.dev.vars`.

| Comando | O que faz |
|---|---|
| `pnpm dev` | Front (Vite) e API (`wrangler dev`) juntos; o Vite repassa `/api` para a API |
| `pnpm dev:celular` | Igual ao `dev`, mas o site também abre pelo IP do computador na rede (para testar no celular) |
| `pnpm db:fotos-exemplo` | No computador (ou na prévia, com `--previa`): fotos do protótipo para os animais e anúncios de exemplo (R2 local + tabelas `fotos` e `perdidos_fotos`). O `db:seed` apaga as fotos; rode de novo depois dele |
| `pnpm db:fotos-historia` | Converte as fotos da história para WebP (completa e miniatura, sem metadados) e envia ao R2 local; `-- --remoto` envia ao R2 de verdade (etapa 14) |
| `pnpm test` | Testes (Vitest) de todos os pacotes |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | ESLint, TypeScript e Prettier |
| `pnpm build` | Build do front e simulação do deploy da API |
| `pnpm db:up` · `pnpm db:down` · `pnpm db:reset` | Sobe, para ou recria do zero o Postgres local (depois do reset: `db:migrate` e `db:seed`) |
| `pnpm db:gerar` | Gera a migration depois de mudar `db/schema.ts` |
| `pnpm db:migrate` · `pnpm db:seed` | Aplica as migrations; aplica o conteúdo inicial e os dados de exemplo (com `--conteudo`, só o conteúdo; com `--previa`, no banco da prévia) |
| `pnpm -C apps/api dev:node` | API em Node puro, sem Cloudflare (teste de portabilidade) |

## Publicar a prévia

A prévia é uma cópia do site com os dados de exemplo, em endereços do Cloudflare (`*.pages.dev` e `*.workers.dev`), para testar antes da produção ([ARQUITETURA.md](docs/ARQUITETURA.md), seção 9). Precisa do login no Wrangler: `pnpm -C apps/api exec wrangler login`.

| Peça | Onde |
|---|---|
| Banco | Projeto `sospatas-previa` do Neon. A string de conexão (sem pooling) fica em `privado/dados-sensiveis/` |
| Ligação API ↔ banco | Hyperdrive `sospatas-previa` (id no `[env.previa]` do `wrangler.toml`) |
| Fotos | Buckets `sospatas-fotos-previa` e `sospatas-quarentena-previa` |
| API | Worker `sospatas-api-previa` |
| Área da ONG | **Sem login**: `develop.sospatas.pages.dev/admin` abre direto como a usuária de teste (`ACESSO_LOCAL_EMAIL` no `[env.previa.vars]`), com a faixa amarela "Ambiente de teste". Qualquer pessoa com o endereço entra, por isso a prévia só recebe **dados de exemplo**: nada de pessoas, telefones ou pedidos reais |
| Site | Pages `sospatas`: a `develop` publica em `https://develop.sospatas.pages.dev` (implantação de prévia do Pages; até a etapa 14 era a de produção, em `sospatas.pages.dev`). Variáveis do ambiente **Preview** do Pages: `VITE_API_URL=https://sospatas-api-previa.sospatas.workers.dev`, `VITE_TURNSTILE_SITE_KEY` (Site key pública do widget Turnstile "SOS Patas") e `PNPM_VERSION=12.10.1` |

**Atualizar o banco da prévia** (Git Bash, com a string do Neon em `DATABASE_URL`):

```bash
export DATABASE_URL='postgresql://...'                 # string do sospatas-previa
pnpm db:migrate                                        # migrations novas
pnpm db:seed --previa                                  # volta os dados de exemplo (apaga as fotos)
pnpm db:fotos-exemplo --previa                         # fotos dos animais de exemplo nos buckets -previa
pnpm db:fotos-historia -- --remoto --bucket=sospatas-fotos-previa   # só se as fotos da história mudarem
```

O `--previa` só funciona num banco marcado como prévia; a produção nunca tem a marca, e os dados de exemplo são recusados nela. A marca foi posta uma vez (09/10/2026) no SQL Editor do projeto `sospatas-previa`: `COMMENT ON DATABASE neondb IS 'sospatas:previa';`. Se o projeto for recriado, repetir.

**Publicar a API:** `pnpm -C apps/api exec wrangler deploy --env previa`. Segredos (uma vez, ou para trocar): `pnpm -C apps/api exec wrangler secret put TURNSTILE_SECRET --env previa` e o mesmo para `IP_HASH_SECRET` (texto aleatório longo).

**Publicar o site:** o Pages publica sozinho a cada push na `develop`, em `develop.sospatas.pages.dev`.

**Depois de publicar a API**, as rotas públicas podem mostrar a versão anterior por até 15 minutos: a borda do Cloudflare guarda as respostas (`s-maxage=900`). Mudou a configuração e o site ainda mostra o comportamento antigo? Espere e recarregue.

## Produção

O site no ar em `https://sospatas.org.br` ([ARQUITETURA.md](docs/ARQUITETURA.md), seção 9). Senhas e strings de conexão ficam em `privado/dados-sensiveis/`, nunca no repositório.

| Peça | Onde |
|---|---|
| Banco | Projeto `sospatas` do Neon, branch `production`. Dois usuários: `neondb_owner` (migrations e backup, só no GitHub Actions) e `sospatas_api` (a API, só lê e grava dados; permissões em [db/producao/permissoes-api.sql](db/producao/permissoes-api.sql)) |
| Ligação API ↔ banco | Hyperdrive `sospatas` (id no nível de cima do `wrangler.toml`), com o usuário `sospatas_api` |
| Fotos | Bucket `sospatas-fotos` (público pelo domínio `fotos.sospatas.org.br`) e `sospatas-quarentena` (privado) |
| Backup | Bucket `sospatas-backups` (privado), 30 dias |
| API | Worker `sospatas-api`, na rota `sospatas.org.br/api/*` (sem endereço `*.workers.dev`) |
| Site | Pages `sospatas`, branch de produção `main`, domínio `sospatas.org.br`. Variáveis do ambiente **Production** do Pages: `VITE_TURNSTILE_SITE_KEY` e `PNPM_VERSION=12.10.1` (sem `VITE_API_URL`: a API está no mesmo endereço) |
| Login | Cloudflare Access, aplicação "Área da ONG" em `sospatas.org.br/admin` e `sospatas.org.br/api/admin` |

**Publicar:** PR da `develop` para a `main`. Com o merge, o CI roda e, se passar, o workflow **Deploy** aplica as migrations no Neon e publica a API; o Pages publica o site sozinho. Para publicar de novo sem mudança (por exemplo, depois de trocar um segredo): GitHub → Actions → Deploy → Run workflow.

**Secrets do GitHub** (Settings → Secrets and variables → Actions): `NEON_DATABASE_URL` (string do `neondb_owner`, sem pooling), `CLOUDFLARE_API_TOKEN` (modelo "Edit Cloudflare Workers", só esta conta e a zona `sospatas.org.br`), `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY` (token do R2 com "Object Read & Write" só no bucket `sospatas-backups`).

**Segredos da API** (uma vez, ou para trocar): `pnpm -C apps/api exec wrangler secret put TURNSTILE_SECRET` e o mesmo para `IP_HASH_SECRET` (texto aleatório longo, diferente do da prévia).

**Primeira carga do banco** (Git Bash, com a string do `neondb_owner` em `DATABASE_URL`):

```bash
export DATABASE_URL='postgresql://neondb_owner:...'    # Neon sospatas, branch production, sem pooling
pnpm db:migrate                                        # cria as tabelas
pnpm db:seed --conteudo                                # dados da ONG, textos e listas (sem dados de exemplo)
pnpm db:fotos-historia -- --remoto                     # fotos da história no bucket sospatas-fotos
```

Depois, no SQL Editor do Neon: rodar [db/producao/permissoes-api.sql](db/producao/permissoes-api.sql) (o usuário `sospatas_api` precisa existir: Roles → New role) e incluir quem entra na área da ONG (abaixo).

**Incluir alguém na área da ONG:** são dois lugares, e a pessoa só entra com os dois.

1. Cloudflare → Zero Trust → Access → Applications → "Área da ONG" → política → acrescentar o e-mail.
2. No SQL Editor do Neon: `INSERT INTO equipe (email, nome) VALUES ('fulana@gmail.com', 'Fulana');` (e-mail em minúsculas; o nome aparece no "Olá" e no "Alterado por").

**Tirar alguém:** remover o e-mail da política do Access e, no Neon, `UPDATE equipe SET ativo = false WHERE email = 'fulana@gmail.com';` (não apagar: o "Alterado por" continua mostrando o nome).

### Backup e restauração

O workflow **Backup** roda todo dia às 03:30 (Brasília): faz o `pg_dump` do Neon e guarda `AAAA-MM-DD.sql.gz` no bucket `sospatas-backups`, apagando os de mais de 30 dias. Para rodar na hora: Actions → Backup → Run workflow. As fotos não entram no backup (o R2 já guarda com redundância).

**Restaurar** sempre num banco **vazio** (o dump cria as tabelas):

1. Baixar o arquivo: Cloudflare → R2 → `sospatas-backups` → escolher a data → Download.
2. Escolher o destino e restaurar (Git Bash, com o Docker aberto):

```bash
# Para testar, no Postgres do Docker (banco novo "restaurado"):
docker exec sospatas-postgres psql -U sospatas -d postgres -c 'CREATE DATABASE restaurado'
gzip -dc 2026-10-20.sql.gz | docker exec -i sospatas-postgres psql -U sospatas -d restaurado -v ON_ERROR_STOP=1

# Para valer, num projeto novo do Neon (vazio, São Paulo, PostgreSQL 18), com a string do dono:
gzip -dc 2026-10-20.sql.gz | docker run --rm -i mirror.gcr.io/library/postgres:18 \
  psql 'postgresql://neondb_owner:...@.../neondb?sslmode=require' -v ON_ERROR_STOP=1
```

3. Conferir (por exemplo, `SELECT count(*) FROM animais;`). Se for para valer: criar o usuário `sospatas_api` no projeto novo, rodar o [permissoes-api.sql](db/producao/permissoes-api.sql), apontar o Hyperdrive para ele e trocar o `NEON_DATABASE_URL` do GitHub.

Teste de restauração feito: em 14/10/2026, no computador (dump do Postgres local com o `pg_dump` 18, restaurado num banco vazio). O backup de produção roda desde 16/10/2026; restaurar um dump dele fica para a etapa 15.

> No protótipo, todos os animais são exemplos fictícios: nenhum está de fato para adoção, e as fotos são apenas ilustrativas. A história e as fotos institucionais da página inicial foram enviadas pela ONG.
