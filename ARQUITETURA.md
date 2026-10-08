# Arquitetura: Site SOS Patas

> **Como o site é construído e hospedado** (decidido em 07/10/2026, "caminho B"). As regras de negócio (RN), o modelo de dados e o escopo ficam no [DESENVOLVIMENTO.md](DESENVOLVIMENTO.md); as telas, no [prototipo/TELAS.md](prototipo/TELAS.md). Regras de manutenção: [CLAUDE.md](CLAUDE.md).
>
> **Objetivo da arquitetura:** começar com **custo zero** (só o domínio, R$ 40/ano), com camadas separadas (front, API e banco) e código portável, para mudar de hospedagem sem reescrever quando o site crescer.

---

## 1. Visão geral

```
                         sospatas.org.br (DNS no Cloudflare)
                                     │
        ┌────────────────────────────┼─────────────────────────────┐
        │                            │                             │
  Cloudflare Pages            Cloudflare Workers              Cloudflare R2
  FRONT (React)               API (Hono)                      FOTOS
  sospatas.org.br/*           sospatas.org.br/api/*           fotos.sospatas.org.br
        │                            │                             ▲
        │  fetch /api/...            │  binding R2 ────────────────┘
        └──────────────────────────► │
                                     │  Hyperdrive (pool + cache)
   Cloudflare Access ───────────────►│        │
   protege /admin/* e /api/admin/*   │        ▼
   (login por código no e-mail)      │   Neon (PostgreSQL)
                                     │   BANCO
   Cloudflare Turnstile ────────────►│
   (antirrobô dos formulários)       │
                                     └── Cron Trigger diário (limpezas)

   GitHub Actions: testes, migrations, deploy e backup diário do banco → R2
```

| Camada | Serviço | Plano | Por quê |
|---|---|---|---|
| Front | **Cloudflare Pages** (React + Vite) | Grátis, banda ilimitada | Site estático; servidores no Brasil |
| API | **Cloudflare Workers** + **Hono** | Grátis: 100 mil req/dia, 10 ms de CPU por requisição | Não "dorme"; responde do Brasil; Hono roda igual em Node (portável) |
| Banco | **Neon** (PostgreSQL 16+) | Grátis: 0,5 GB por projeto | Postgres padrão (portável); sem pausa de projeto |
| Ligação API ↔ banco | **Cloudflare Hyperdrive** | Grátis: 100 mil consultas/dia | Pool de conexões e cache de leitura; Workers não mantêm conexão aberta |
| Fotos | **Cloudflare R2** | Grátis: 10 GB, **tráfego de saída grátis** | O tráfego das fotos era o limite mais apertado (Supabase: 5 GB/mês) |
| Login da equipe | **Cloudflare Access** (Zero Trust) | Grátis até 50 usuários | Sem senha para guardar (ver seção 4); cabe no limite de CPU |
| Antirrobô | **Cloudflare Turnstile** | Grátis | Formulários públicos (RN22) |
| Tarefas agendadas | **Workers Cron Triggers** | Grátis: 5 por conta | Limpezas diárias (RN25, RN27, RN15) |
| Domínio | **Registro.br** (`sospatas.org.br`) | R$ 40/ano | Registrado no CNPJ da ONG |
| Código, CI/CD e backup | **GitHub** + **GitHub Actions** | Grátis | Testes, deploy, migrations e backup |
| Estatísticas | **Cloudflare Web Analytics** | Grátis, sem cookies | Indicador de acessos (tarefa 12) |

**Custo total: R$ 0/mês + R$ 40/ano.**

## 2. Repositório (monorepo)

```
sos-patas/
├── apps/
│   ├── web/                     # FRONT: React + Vite + TypeScript + Tailwind + React Router
│   │   ├── public/              # logo.png, favicon, _headers (segurança), _redirects (/sobre → /ajude)
│   │   └── src/
│   │       ├── pages/           # públicas (T01–T07, T12, T13) e admin (T08–T24)
│   │       ├── components/      # CardAnimal, Pata, Chapeu, TextoSimples…
│   │       │   └── admin/       # BarraAdmin, ListaEditavel, CampoTextoEditavel (RN33)
│   │       ├── api/             # cliente HTTP tipado + hooks TanStack Query
│   │       └── lib/             # fotos.ts (compressão/canvas, RN02/RN20), idade.ts (RN11/RN13)
│   └── api/                     # API: Hono + TypeScript
│       ├── src/
│       │   ├── index.ts         # entrada Workers (export default app + scheduled)
│       │   ├── node.ts          # entrada Node (@hono/node-server), para VPS no futuro
│       │   ├── rotas/
│       │   │   ├── publico/     # site, animais, perdidos (GET) e envio de anúncio (POST)
│       │   │   └── admin/       # tudo da área da ONG
│       │   ├── servicos/        # regras de negócio: excluirAnimal (RN05), aprovarPerdido…
│       │   ├── middleware/      # access.ts (valida JWT do Access), erros, CORS
│       │   ├── armazenamento/   # interface Armazenamento + implementação R2 (S3 no futuro)
│       │   └── tarefas/         # limpezas do Cron (RN15, RN25, RN27)
│       └── wrangler.toml        # bindings: HYPERDRIVE, FOTOS, QUARENTENA, cron
├── packages/
│   └── compartilhado/           # schemas zod, tipos e limites (RN34, RN21…) usados no front e na API
├── db/
│   ├── schema.ts                # schema Drizzle (fonte dos tipos)
│   ├── migrations/              # SQL gerado e versionado (drizzle-kit)
│   └── seed/                    # seed_conteudo.sql: textos, itens, ong e fotos da história
├── prototipo/                   # protótipo HTML (especificação visual)
├── docker-compose.yml           # Postgres local para desenvolvimento
├── .github/workflows/           # ci.yml, deploy.yml, backup.yml
├── ARQUITETURA.md · DESENVOLVIMENTO.md · PLANO_DESENVOLVIMENTO.md · CLAUDE.md · README.md
└── pnpm-workspace.yaml
```

**Ferramentas:** pnpm (workspaces), TypeScript estrito, **Drizzle ORM** (+ drizzle-kit para migrations SQL), driver **`postgres`** (postgres.js, funciona em Workers via Hyperdrive e em Node), **zod** (validação compartilhada), **TanStack Query** (dados no front), **Vitest** (testes), **Wrangler** (Workers).

## 3. API

**Base:** mesmo domínio do site, `https://sospatas.org.br/api/...` (rota do Worker na zona). Mesma origem = sem CORS em produção. Antes do domínio próprio: `*.pages.dev` + `*.workers.dev` com CORS restrito à origem do Pages.

**Padrões:**
- JSON; datas em ISO 8601; IDs `uuid`.
- Entrada validada com os schemas zod de `packages/compartilhado` (os mesmos do formulário no front).
- Erros: `{ "erro": "codigo_curto", "mensagem": "texto para a tela" }` com status HTTP adequado (400 validação, 401/403 acesso, 404, 409 conflito como protetor com animais, 429 limite).
- Upload: `multipart/form-data`; a API confere tamanho e **assinatura WebP** (`RIFF....WEBP`) antes de gravar (RN21). Nada de URL pré-assinada: todo arquivo passa pela API.
- Leituras públicas com `Cache-Control: public, max-age=60` (+ cache do Hyperdrive) para aguentar picos e poupar o banco.

### 3.1 Rotas públicas (`/api/publico`)

| Método e rota | Função | Regras |
|---|---|---|
| `GET /site` | Dados da ONG + todos os textos e itens de conteúdo, numa chamada só | RN33 |
| `GET /animais?especie&porte&idade&convive` | Vitrine: só `disponivel`, mais antigos primeiro, **sem** `animais_privado` | RN10, RN11 |
| `GET /animais/destaques` | "Esperando há mais tempo" | RN12 |
| `GET /animais/:id` | Ficha (disponível ou adotado, sem dados privados) | RN31 |
| `GET /perdidos?tipo` | Só anúncios `publicado` e não expirados | RN18 |
| `POST /perdidos` | Envio público: Turnstile, limites, até 2 fotos WebP ≤ 500 KB → `pendente` + fotos na **quarentena** | RN19–RN23 |
| `POST /interesses` | _Futuro_: formulário de interesse em adoção | RN14, RN15 |

### 3.2 Rotas da área da ONG (`/api/admin`, exigem Cloudflare Access)

| Recurso | Rotas | Regras |
|---|---|---|
| Sessão | `GET /eu` (nome da usuária) | RN43 |
| Resumo | `GET /resumo` (disponíveis, adultos +90 dias, adotados no mês, perdidos pendentes) | T09 |
| Animais | `GET /animais?status&responsavel&busca` · `POST /animais` · `GET/PUT/DELETE /animais/:id` | RN05, RN09 |
| Adoção | `POST /animais/:id/adocao` (nome e WhatsApp do adotante) · `POST /animais/:id/devolucao` | RN07, RN08, RN30 |
| Fotos do animal | `POST /animais/:id/fotos` (miniatura + completa) · `DELETE /animais/:id/fotos/:fotoId` · `PUT /animais/:id/fotos/ordem` | RN01–RN06 |
| Protetores | `GET/POST /protetores` · `PUT/DELETE /protetores/:id` (409 se houver animais) | RN42 |
| Perdidos | `GET /perdidos?status` · `POST /perdidos` (equipe) · `PUT /perdidos/:id` · `POST /perdidos/:id/aprovar` · `POST /perdidos/:id/renovar` · `DELETE /perdidos/:id` · `GET /perdidos/:id/fotos/:fotoId` (lê a quarentena) | RN18, RN25, RN26, RN39–RN41 |
| Textos | `GET /conteudo` · `PUT /conteudo/textos/:chave` | RN33, RN34, RN37 |
| Itens de lista | `POST /conteudo/itens` · `PUT/DELETE /conteudo/itens/:id` · `POST /conteudo/itens/trocar-ordem` · `POST /conteudo/itens/:id/foto` | RN35, RN36, RN38 |
| Dados da ONG | `GET/PUT /ong` | T23 |

**Gravação de `updated_at` / `updated_by` (RN43):** a API preenche os dois em toda escrita, a partir da usuária identificada pelo Access. Operações com mais de um passo no banco (trocar ordem, aprovar anúncio, adoção) rodam em **transação**.

## 4. Login da equipe: Cloudflare Access

**Por que não e-mail + senha próprios:** guardar senha com segurança exige um hash lento (PBKDF2/bcrypt/argon2, centenas de milissegundos), e o Workers gratuito só permite **10 ms de CPU por requisição**. As alternativas eram pagar o Workers (US$ 5/mês) ou um serviço de login de terceiros. O Access resolve sem custo e sem senha para vazar.

**Como funciona:**
1. Quem abre `/admin` (front) ou chama `/api/admin/*` passa antes pelo **Access**, na borda do Cloudflare.
2. A tela de login (marca da SOS Patas: logo e cores) pede o **e-mail** e envia um **código de 6 dígitos** para ele. Opcional: botão "Entrar com Google" para quem usa Gmail.
3. Só e-mails da **política do Access** (lista da equipe) conseguem entrar. Sessão de **30 dias** no celular: na prática, a voluntária quase nunca precisa digitar o código.
4. O Access envia à API o cabeçalho `Cf-Access-Jwt-Assertion`. O middleware `access.ts` **valida a assinatura do JWT** (chaves públicas do time, conferência de `aud` e `exp`), pega o e-mail e confere se ele existe e está ativo na tabela `equipe` (segunda barreira).
5. "Sair" chama `/cdn-cgi/access/logout`.

**Gestão de contas:** incluir ou remover alguém = adicionar ou tirar o e-mail na política do Access **e** na tabela `equipe` (feito por quem mantém o site, como antes). Todas com as mesmas permissões.

**Portabilidade:** o Access protege qualquer origem atrás do Cloudflare, inclusive uma VPS (via proxy ou Cloudflare Tunnel). Se um dia sair do Cloudflare, o middleware `access.ts` é o único ponto a trocar.

## 5. Banco de dados

- **Neon**, projeto `sospatas`, região mais próxima disponível na criação (preferir **AWS São Paulo**, se houver; senão `us-east`). Branch `main` = produção; branches do Neon para testar migrations.
- **Migrations:** `db/schema.ts` (Drizzle) → `drizzle-kit generate` gera SQL em `db/migrations/` (revisado e versionado) → aplicado pelo workflow de deploy (`drizzle-kit migrate`). Nunca alterar o banco de produção à mão.
- **Constraints no banco** além da API: `CHECK (char_length(...))` dos limites de texto (RN34), `CHECK` de `protetor_id` × `responsavel_tipo` (RN42), FK `restrict` de protetores, `CHECK (id = 1)` em `ong`.
- **Usuário do banco** da API com privilégios só de DML nas tabelas do app (sem DDL); outro usuário, só no CI, para migrations.
- **Sem RLS:** a fronteira de segurança é a API (rotas públicas só leem colunas públicas; `animais_privado` só é consultada em rotas `/admin`).
- **Primeiro acesso após inatividade:** o Neon suspende o processamento após 5 min sem uso e "acorda" em alguns segundos. O cache de leitura do Hyperdrive e o `Cache-Control` das rotas públicas escondem isso na maioria das visitas. Se incomodar, o plano pago do Neon desliga a suspensão.

## 6. Fotos (R2)

| Bucket | Acesso | Conteúdo |
|---|---|---|
| `sospatas-fotos` | **Público** pelo domínio `fotos.sospatas.org.br` (com cache do Cloudflare) | `animais/{animal_id}/{foto_id}.webp` e `-thumb.webp` (RN04) · `site/historia/{id}.webp` (RN38) · `perdidos/{perdido_id}/{id}.webp` (anúncios aprovados) |
| `sospatas-quarentena` | **Privado**: só a API lê e grava (rota admin que transmite o arquivo para a equipe) | `perdidos/{perdido_id}/{id}.webp` enquanto `pendente` (RN19) |
| `sospatas-backups` | **Privado** | Dumps diários do banco (seção 8) |

- **Aprovar anúncio** = copiar os objetos da quarentena para o bucket público e apagar da quarentena, na mesma operação (RN19).
- **Excluir** segue a RN05: primeiro os arquivos, depois o registro.
- Antes do domínio próprio, o bucket público usa a URL `r2.dev` (só para desenvolvimento, tem limite de requisições).
- O acesso ao R2 fica atrás da interface `Armazenamento` (`colocar`, `obter`, `copiar`, `apagarPrefixo`). Para trocar de serviço (S3, MinIO na VPS), basta outra implementação.

## 7. Tarefas agendadas (Cron Trigger do Worker)

Um cron diário (03:00, horário de Brasília = `0 6 * * *` UTC) chama `scheduled()` na API, que executa:

| Tarefa | Regra |
|---|---|
| Apagar anúncios `publicado` com `expira_em` vencido (arquivos + registro) | RN25 |
| Apagar anúncios `pendente` há mais de 7 dias (arquivos da quarentena + registro) | RN27 |
| _Futuro:_ apagar pedidos de interesse recusados/não concluídos há mais de 90 dias | RN15 |

O antigo "keep-alive" do Supabase (RN16) **deixa de existir**: o Neon não pausa projetos gratuitos.

## 8. Backup

- **Workflow `backup.yml`** (GitHub Actions, diário): `pg_dump` do Neon → arquivo `.sql.gz` → `sospatas-backups/AAAA-MM-DD.sql.gz` no R2 (pela API S3 do R2). Mantém os últimos **30 dias** (apaga os mais antigos).
- **Restauração** documentada no README (`psql` a partir do dump) e **testada uma vez antes da entrega** (tarefa 8).
- O Neon também mantém um histórico curto para restauração no plano gratuito. O backup próprio é a garantia de longo prazo.
- As fotos não entram no backup (o R2 é durável); a perda de uma foto não perde o cadastro.

## 9. Ambientes, deploy e segredos

| Ambiente | Front | API | Banco | Fotos |
|---|---|---|---|---|
| **Local** | `pnpm dev` (Vite) | `wrangler dev` (com proxy de `/api` no Vite) | Postgres no `docker-compose` | R2 simulado localmente pelo Wrangler |
| **Prévia** | URL de prévia do Pages (cada PR) | Worker de prévia (`--env previa`) | Branch do Neon `previa` | Bucket `-previa` |
| **Produção** | `sospatas.org.br` | `sospatas.org.br/api` | Neon `main` | `fotos.sospatas.org.br` |

**Fluxo:** PR → `ci.yml` (lint, typecheck, testes) → merge na `main` → `deploy.yml`: migrations no Neon → `wrangler deploy` da API → o Pages publica o front pela integração com o GitHub.

**Segredos** (nunca no código; `wrangler secret` e secrets do GitHub):
| Segredo | Onde |
|---|---|
| String de conexão do Neon | Hyperdrive (configuração) e GitHub (migrations, backup) |
| `TURNSTILE_SECRET` | API |
| `IP_HASH_SECRET` (RN23) | API |
| `ACCESS_TEAM_DOMAIN` e `ACCESS_AUD` | API (validação do JWT) |
| Chaves S3 do R2 (só para o backup) | GitHub |
| `CLOUDFLARE_API_TOKEN` (deploy) | GitHub |

**Segurança do front:** arquivo `_headers` no Pages com `Content-Security-Policy` (fontes do Google, fotos de `fotos.sospatas.org.br`, Turnstile), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (sem câmera/localização).

## 10. Contas e propriedade

- **Domínio** `sospatas.org.br` no **CNPJ da ONG** (Registro.br pede CNPJ e estatuto para `.org.br`). DNS apontado para o Cloudflare.
- **Cloudflare, Neon e GitHub** criados com um **e-mail da ONG** (ex.: `site@...` ou um Gmail da SOS Patas), com o mantenedor do site como administrador. Assim nada fica preso a uma pessoa.
- **Cartão:** o R2 pede um meio de pagamento cadastrado, mesmo no plano gratuito (cobrança só acima de 10 GB). É o único serviço que pede. Decidir de quem é o cartão (ver P1 no DESENVOLVIMENTO.md).

## 11. Limites gratuitos e quando pagar

| Recurso | Limite grátis | Uso estimado | Se passar |
|---|---|---|---|
| Workers: requisições | 100 mil/dia | Poucos milhares/dia | Workers Paid: US$ 5/mês (10 milhões/mês) |
| Workers: CPU | 10 ms/requisição | Consultas simples: ~1–3 ms | Workers Paid (30 s) |
| Hyperdrive | 100 mil consultas/dia | Bem abaixo, com cache | Vem junto com o Workers Paid |
| Neon | 0,5 GB | Texto: muito abaixo | Plano Launch (por uso) |
| R2 | 10 GB, tráfego grátis | ~1 GB/ano no ritmo da ONG | US$ 0,015/GB/mês |
| Cron Triggers | 5 por conta | 1 | – |
| Access | 50 usuários | 2 a 5 | Plano pago do Zero Trust |

## 12. Migração para VPS (quando precisar)

O código já nasce preparado:
1. API: rodar `apps/api/src/node.ts` (Hono com `@hono/node-server`) num contêiner Docker.
2. Banco: continuar no Neon ou subir Postgres em contêiner e restaurar o último dump.
3. Fotos: manter o R2 (acessível de qualquer lugar pela API S3) ou trocar a implementação de `Armazenamento`.
4. Login: manter o Access na frente da VPS (domínio continua no Cloudflare, via proxy ou Tunnel).
5. Cron: trocar o Cron Trigger por um cron do sistema chamando as mesmas funções de `tarefas/`.

Custo de referência (out/2026): Contabo Cloud VPS 10 ≈ R$ 30–36/mês; Hostinger KVM 1 ≈ R$ 28–48/mês.
