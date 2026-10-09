# Arquitetura: Site SOS Patas

> **Como o site é construído e hospedado** (decidido em 07/10/2026, "caminho B"). As regras de negócio (RN), o modelo de dados e o escopo ficam no [DESENVOLVIMENTO.md](DESENVOLVIMENTO.md); as telas, no [prototipo/TELAS.md](../prototipo/TELAS.md). Regras de manutenção: [CLAUDE.md](../CLAUDE.md).
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
| Banco | **Neon** (PostgreSQL 18, São Paulo) | Grátis: 0,5 GB por projeto | Postgres padrão (portável); sem pausa de projeto |
| Ligação API ↔ banco | **Cloudflare Hyperdrive** | Grátis: 100 mil consultas/dia | Pool de conexões e cache de leitura; Workers não mantêm conexão aberta |
| Fotos | **Cloudflare R2** | Grátis: 10 GB, **tráfego de saída grátis** | O tráfego das fotos era o limite mais apertado (Supabase: 5 GB/mês) |
| Login da equipe | **Cloudflare Access** (Zero Trust) | Grátis até 50 usuários | Sem senha para guardar (ver seção 4); cabe no limite de CPU |
| Antirrobô | **Cloudflare Turnstile** | Grátis | Formulários públicos (RN22) |
| E-mail do "Fale com a ONG" | **Cloudflare Email Routing** (binding `send_email`) | Grátis | Entrega a mensagem do formulário no Gmail da ONG (RN51); exige o domínio no Cloudflare |
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
│   │       ├── rotas.tsx        # rotas do site (docs/DESENVOLVIMENTO.md, seção 4)
│   │       ├── layouts/         # LayoutPublico, Cabecalho (menu do celular), Rodape (contatos e PIX)
│   │       ├── pages/           # públicas (T01–T07, T12, T13, T26, T29 Contato) e admin (T08–T28); Avisos (404, Em breve)
│   │       ├── components/      # CardAnimal, FotoAnimal, Pata, Chapeu, TextoSimples, BlocoPix, Estados, Campos, Turnstile…
│   │       │   └── admin/       # BarraAdmin, ListaEditavel, CampoTextoEditavel (RN33)
│   │       ├── api/             # cliente HTTP + hooks TanStack Query (publico.ts: useSite, useDestaques, useVitrine)
│   │       ├── lib/             # pix.ts, animal.ts, contato.ts (link mailto), filtros.ts (filtros da vitrine na URL);
│   │       │                    #   fotos.ts (canvas, RN02/RN20, etapa 10)
│   │       └── testes/          # renderizar.tsx: rotas reais com a API simulada
│   └── api/                     # API: Hono + TypeScript
│       ├── src/
│       │   ├── app.ts           # criarApp(dependencias): rotas, erros, CORS, login
│       │   ├── index.ts         # entrada Workers: dependências do Cloudflare (Hyperdrive, R2, Access, Email Routing)
│       │   ├── node.ts          # entrada Node (@hono/node-server), para VPS no futuro
│       │   ├── dependencias.ts  # o que a API precisa do ambiente (banco, armazenamento, verificação do JWT)
│       │   ├── db.ts            # conexão postgres.js + Drizzle (Hyperdrive)
│       │   ├── erros.ts · validacao.ts · cache.ts
│       │   ├── rotas/
│       │   │   ├── publico/     # site, animais, perdidos (GET); envios: pedidos.ts, contato.ts (RN51), anúncio (etapa 11)
│       │   │   └── admin/       # tudo da área da ONG: animais.ts (com resumo e fotos), protetores.ts, pedidos.ts
│       │   ├── servicos/        # regras de negócio: publico.ts, pedidos.ts (RN47–RN50), contato.ts e email.ts (RN51),
│       │   │                    #   seguranca.ts (Turnstile, hash do IP), equipe.ts, fotos.ts (URLs),
│       │   │                    #   animais.ts (excluirAnimal RN05, marcarAdotado RN07, devolver RN30),
│       │   │                    #   fotos-animal.ts (enviar, trocarFoto, remover, reordenar), protetores.ts (RN42); aprovarPerdido… (etapa 11)
│       │   ├── middleware/      # access.ts (login: JWT do Access + equipe), conexoes.ts (banco por requisição)
│       │   ├── armazenamento/   # interface Armazenamento, R2, memória (testes), webp.ts (RN21)
│       │   ├── email/           # cloudflare.ts: envio pelo Email Routing (só no Workers)
│       │   ├── testes/          # apoio aos testes: banco de teste, Access falso
│       │   └── tarefas/         # limpeza.ts: tarefa diária do Cron (RN15 pronta; RN25, RN27 na etapa 11)
│       ├── wrangler.toml        # bindings: HYPERDRIVE, FOTOS, QUARENTENA, EMAIL (só produção), cron; [env.previa]
│       └── .dev.vars.example    # variáveis locais (copiar para .dev.vars, fora do Git)
├── packages/
│   └── compartilhado/           # enums, limites, config. de textos/listas (lidos também pelo banco), schemas zod,
│                                #   adocao/ (formulário 1.2, termo, alertas), api/ (tipos das respostas),
│                                #   idade (RN11–RN13), datas no fuso de Brasília, WhatsApp
├── db/                          # pacote @sospatas/db
│   ├── schema.ts                # schema Drizzle (fonte dos tipos)
│   ├── drizzle.config.ts        # DATABASE_URL ou, sem ela, o Postgres local
│   ├── migrations/              # SQL gerado e versionado (drizzle-kit) + migrations manuais
│   ├── seed/                    # seed_conteudo.sql (ong, textos, itens), seed_dev.sql (só local), fotos_historia.json
│   ├── scripts/                 # semear.ts (pnpm db:seed), seed.ts, url.ts, imagens.ts (WebP + envio ao R2),
│   │                            #   fotos-historia.ts (pnpm db:fotos-historia), fotos-exemplo.ts (só local)
│   ├── testes/                  # testes de migrations, seed e constraints
│   └── docker/                  # scripts da 1ª inicialização do Postgres local (cria sospatas_teste)
├── docs/                        # documentação: DESENVOLVIMENTO, ARQUITETURA, PLANO_DESENVOLVIMENTO,
│   │                            #   LINHA_DO_TEMPO
│   └── formulario/              # formulário de interesse e termo de adoção (+ gerar_pdf.py)
├── prototipo/                   # protótipo HTML (especificação visual) + TELAS.md e prints
├── privado/                     # FORA DO GIT: projeto/ (PROJETO.md e PDFs), fotos/ originais,
│                                #   dados-sensiveis/ (senhas e acessos)
├── docker-compose.yml           # Postgres local para desenvolvimento
├── .github/workflows/           # ci.yml, deploy.yml, backup.yml
├── CLAUDE.md · README.md        # na raiz: o Claude Code e o GitHub procuram estes dois aqui
├── index.html                   # redireciona o GitHub Pages para o protótipo
├── package.json · pnpm-workspace.yaml · tsconfig.base.json · eslint.config.js · .prettierrc.json
└── .nvmrc                       # Node 24
```

**Ferramentas:** pnpm (workspaces, versão fixa em `packageManager`), Node 24, TypeScript estrito (6.0: o typescript-eslint ainda não aceita o TypeScript 7), ESLint (com checagem de tipos) e Prettier, Tailwind CSS 4, React Router 8, **Drizzle ORM** (+ drizzle-kit para migrations SQL), driver **`postgres`** (postgres.js, funciona em Workers via Hyperdrive e em Node), **zod** (validação compartilhada), **TanStack Query** (dados no front), **Vitest** (testes), **Wrangler** (Workers).

## 3. API

**Base:** mesmo domínio do site, `https://sospatas.org.br/api/...` (rota do Worker na zona). Mesma origem = sem CORS em produção. Antes do domínio próprio: `*.pages.dev` + `*.workers.dev` com CORS restrito à origem do Pages.

**Padrões:**
- JSON; datas em ISO 8601; IDs `uuid`.
- Entrada validada com os schemas zod de `packages/compartilhado` (os mesmos do formulário no front).
- Erros: `{ "erro": "codigo_curto", "mensagem": "texto para a tela" }` com status HTTP adequado (400 validação, 401/403 acesso, 404, 409 conflito como protetor com animais, 429 limite, 503 quando o armazenamento de fotos falha e nada foi alterado). Em erro de validação, também `"campos": { "nome": "Preencha este campo" }`, para o formulário mostrar a mensagem embaixo de cada campo. Erro inesperado: 500 com mensagem genérica; o detalhe só vai para o log (`apps/api/src/erros.ts`).
- Upload: `multipart/form-data`; a API confere tamanho e **assinatura WebP** (`RIFF....WEBP`) antes de gravar (RN21). Nada de URL pré-assinada: todo arquivo passa pela API.
- **Proteção contra CSRF na área da ONG** (09/10/2026): o login do Access é um cookie, que o navegador manda junto mesmo quando outro site dispara o envio, e o CORS não impede isso. Por isso, (1) toda escrita em `/api/admin` (POST, PUT, DELETE) só é aceita se a `Origin` for o mesmo endereço que o navegador chamou (`Host`) ou estiver em `CORS_ORIGENS` (prévia); `Sec-Fetch-Site` de outro site também é recusado; resposta 403 `origem_nao_permitida` (`middleware/origem.ts`); (2) rotas que leem JSON exigem `Content-Type: application/json`, senão 415 (`validacao.ts`), o que fecha o truque do formulário que manda JSON como `text/plain`. Requisição sem `Origin` nem `Sec-Fetch-Site` não vem de navegador e passa (não carrega o cookie de ninguém). No computador, o proxy do Vite mantém o `Host` (`changeOrigin: false`), como em produção. Na etapa 14, somar o cookie do Access com `SameSite=Lax`.
- Leituras públicas com cache (`apps/api/src/cache.ts`; desligado no computador, `AMBIENTE=local`, para os testes verem o banco na hora): o navegador guarda 60 s e o Cloudflare guarda 15 min (Cache API), para aguentar picos e deixar o Neon dormir (seção 11.2). Salvar na área da ONG apaga a cópia do datacenter que atendeu a voluntária (o "Ver no site" dela já mostra a mudança); nos outros datacenters, a cópia antiga vale até 15 min. Com o domínio próprio (etapa 14), somar a limpeza global pela API de purge do Cloudflare. A Cache API só funciona no domínio próprio; no `*.workers.dev` a API consulta sempre.

### 3.1 Rotas públicas (`/api/publico`)

| Método e rota | Função | Regras |
|---|---|---|
| `GET /site` | Dados da ONG + todos os textos e itens de conteúdo, numa chamada e **numa consulta** ao banco | RN33 |
| `GET /animais?especie&porte&idade&convive` | Vitrine: só `disponivel`, mais antigos primeiro, **sem** `animais_privado`. Um valor por filtro: `especie=cao\|gato`, `porte=mini…gigante`, `idade=filhote\|adulto`, `convive=sim`; vazio = desligado; valor inválido = 400 | RN10, RN11 |
| `GET /animais/destaques` | "Esperando há mais tempo" | RN12 |
| `GET /animais/:id` | Ficha (disponível ou adotado, sem dados privados) | RN31 |
| `GET /perdidos?tipo` | Só anúncios `publicado` e não expirados, mais recentes primeiro; `tipo=perdido\|encontrado` | RN18, RN25 |
| `GET /fotos/*` | Foto do bucket **público** (`animais/`, `site/`, `perdidos/`), com cache de 1 ano. Usada quando não há domínio de fotos (computador e prévia). Nunca lê a quarentena | RN19 |
| `POST /perdidos` | Envio público: Turnstile, limites, até 2 fotos WebP ≤ 500 KB → `pendente` + fotos na **quarentena** | RN19–RN23 |
| `POST /animais/:id/pedidos` | Formulário de adoção: Turnstile, limites (2/dia por IP, 1 pendente por WhatsApp), validação pelo schema da versão do formulário. Numa transação: grava o pedido e passa o animal para `em_analise` (409 se ele não estiver mais disponível). Depois, limpa o cache da vitrine, dos destaques e da ficha | RN14, RN15, RN47, RN48, RN50 |
| `POST /contato` | Formulário "Fale com a ONG": Turnstile, validação, limite de 3 por dia por IP (`contato_envios`, só o hash). Envia o e-mail para a ONG com `Reply-To` de quem escreveu; **não grava a mensagem**. 503 `email_indisponivel` se o envio falhar | RN51 |

**Respostas:** tipos em `packages/compartilhado/src/api/publico.ts` (`SitePublico`, `ListaAnimais`, `AnimalFicha`, `ListaPerdidos`), usados pela API e pelo front. As fotos vêm como URL pronta. A idade é calculada no front com `textoIdade` (as datas vêm cruas). O cache usa como chave o caminho com os filtros válidos em ordem fixa: parâmetros extras não criam cópias novas nem acordam o banco.

### 3.2 Rotas da área da ONG (`/api/admin`, exigem Cloudflare Access)

| Recurso | Rotas | Regras |
|---|---|---|
| Sessão | `GET /eu` (nome da usuária) | RN43 |
| Resumo | `GET /resumo` (disponíveis, adultos +90 dias, adotados no mês, perdidos pendentes, pedidos pendentes) | T09 |
| Animais | `GET /animais?status&responsavel&busca` (`status` padrão `disponivel`; `responsavel` = `ong`, `protetor` ou o id de um protetor; `busca` = parte do nome) · `POST /animais` · `GET/PUT/DELETE /animais/:id`. O `GET` traz o bloco privado, as fotos com id e posição, "Alterado por" e, se houver pedido aprovado, quem pediu (`pedido_aprovado`), para preencher o "Marcar como adotado". Excluir apaga os arquivos antes do registro; se o armazenamento falhar, 503 e nada é excluído | RN05, RN09, RN43 |
| Adoção | `POST /animais/:id/adocao` (nome e WhatsApp do adotante; 409 se houver pedido aguardando análise) · `POST /animais/:id/devolucao` (adotado: volta sem os dados do adotante; em análise com pedido aprovado: o pedido vira `nao_concluido`) | RN07, RN08, RN30, RN49 |
| Fotos do animal | `POST /animais/:id/fotos` (multipart `miniatura` + `completa`, próxima posição livre) · `PUT /animais/:id/fotos/:fotoId` (trocar a foto, mesma posição) · `DELETE /animais/:id/fotos/:fotoId` (as seguintes sobem uma posição) · `PUT /animais/:id/fotos/ordem` (`{ fotos: [ids] }`, todas as fotos atuais) | RN01–RN06 |
| Protetores | `GET/POST /protetores` (com quantos animais cada um tem) · `PUT/DELETE /protetores/:id` (409 se houver animais) | RN42 |
| Perdidos | `GET /perdidos?status` · `POST /perdidos` (equipe) · `PUT /perdidos/:id` · `POST /perdidos/:id/aprovar` · `POST /perdidos/:id/renovar` · `DELETE /perdidos/:id` · `GET /perdidos/:id/fotos/:fotoId` (lê a quarentena) | RN18, RN25, RN26, RN39–RN41 |
| Textos | `GET /conteudo` · `PUT /conteudo/textos/:chave` | RN33, RN34, RN37 |
| Itens de lista | `POST /conteudo/itens` · `PUT/DELETE /conteudo/itens/:id` · `POST /conteudo/itens/trocar-ordem` · `POST /conteudo/itens/:id/foto` | RN35, RN36, RN38 |
| Dados da ONG | `GET/PUT /ong` | T23 |
| Pedidos de adoção | `GET /pedidos?status` · `GET /pedidos/:id` (com os alertas calculados) · `PUT /pedidos/:id/observacao` · `POST /pedidos/:id/aprovar` · `POST /pedidos/:id/recusar` (animal volta a `disponivel`). "Marcar como adotado" abre com o nome e o WhatsApp de quem pediu, que vêm em `pedido_aprovado` no `GET /animais/:id` | RN48, RN49 |

**Gravação de `updated_at` / `updated_by` (RN43):** a API preenche os dois em toda escrita, a partir da usuária identificada pelo Access. Operações com mais de um passo no banco (trocar ordem, aprovar anúncio, adoção) rodam em **transação**. Mudanças nas fotos também gravam quem alterou o animal.

**Ordem entre arquivos e banco (RN05, RN06, RN07):** excluir animal, remover foto e as fotos extras da adoção apagam **primeiro os arquivos** e só depois o banco; se o armazenamento falhar, a API responde 503 e nada muda. Na troca de foto, a ordem é a inversa: grava a nova, atualiza o registro e só então apaga a antiga, para o site nunca apontar para um arquivo que não existe; se apagar a antiga falhar, o arquivo sobra no bucket e fica registrado no log.

## 4. Login da equipe: Cloudflare Access

**Por que não e-mail + senha próprios:** guardar senha com segurança exige um hash lento (PBKDF2/bcrypt/argon2, centenas de milissegundos), e o Workers gratuito só permite **10 ms de CPU por requisição**. As alternativas eram pagar o Workers (US$ 5/mês) ou um serviço de login de terceiros. O Access resolve sem custo e sem senha para vazar.

**Como funciona:**
1. Quem abre `/admin` (front) ou chama `/api/admin/*` passa antes pelo **Access**, na borda do Cloudflare.
2. A tela de login (marca da SOS Patas: logo e cores) pede o **e-mail** e envia um **código de 6 dígitos** para ele. Opcional: botão "Entrar com Google" para quem usa Gmail.
3. Só e-mails da **política do Access** (lista da equipe) conseguem entrar. Sessão de **30 dias** no celular: na prática, a voluntária quase nunca precisa digitar o código.
4. O Access envia à API o cabeçalho `Cf-Access-Jwt-Assertion`. O middleware `access.ts` **valida a assinatura do JWT** (biblioteca `jose`, chaves públicas do time em `ACCESS_TEAM_DOMAIN/cdn-cgi/access/certs`, conferência de emissor, `aud` e validade), pega o e-mail e confere se ele existe e está ativo na tabela `equipe` (segunda barreira). Sem token ou token inválido: 401; e-mail fora da equipe ou desativado: 403.
   - **Modo local:** com `AMBIENTE=local` e `ACESSO_LOCAL_EMAIL` no `.dev.vars`, a API trata a requisição como vinda desse e-mail, sem Access (no computador, `teste@sospatas.local`, do `seed_dev.sql`). Em qualquer outro ambiente, ter `ACESSO_LOCAL_EMAIL` configurado faz a API recusar a requisição (500), para nunca liberar a área da ONG sem login.
5. "Sair" chama `/cdn-cgi/access/logout`.

**Gestão de contas:** incluir ou remover alguém = adicionar ou tirar o e-mail na política do Access **e** na tabela `equipe` (feito por quem mantém o site, como antes). Todas com as mesmas permissões.

**Portabilidade:** o Access protege qualquer origem atrás do Cloudflare, inclusive uma VPS (via proxy ou Cloudflare Tunnel). Se um dia sair do Cloudflare, o middleware `access.ts` é o único ponto a trocar.

## 5. Banco de dados

- **Neon**, projeto `sospatas` (criado em 08/10/2026), região **AWS South America East 1 (São Paulo)**, **PostgreSQL 18**, plano gratuito, compute fixo em 0,25 CU (09/10/2026). Branch padrão **`production`** = produção; outras branches do Neon para testar migrations. A **prévia** fica num projeto separado, **`sospatas-previa`** (criado em 09/10/2026, mesma região e versão, 0,25 CU), porque as 100 CU-horas do plano gratuito são por projeto (seção 11.2): uso na prévia não consome a cota da produção. O Postgres local (Docker) usa a mesma versão. **Neon Auth / Better Auth não é usado** (o login é pelo Access, seção 4).
- **Migrations:** `db/schema.ts` (Drizzle) → `pnpm db:gerar` (`drizzle-kit generate`) gera SQL em `db/migrations/` (revisado e versionado) → `pnpm db:migrate` aplica (no deploy, com a `DATABASE_URL` do Neon). O que o Drizzle não gera (ex.: `UNIQUE … DEFERRABLE`) vai numa migration manual (`drizzle-kit generate --custom`). Nunca alterar o banco de produção à mão.
- **Seed:** `pnpm db:seed` aplica `db/seed/seed_conteudo.sql` e, só no banco local, `seed_dev.sql` (dados de exemplo). Em produção: `pnpm db:seed --conteudo`. O conteúdo inicial não sobrescreve o que a equipe já editou.
- **Testes do banco** (`db/testes/`) recriam o banco `sospatas_teste` com as migrations e conferem o seed e as constraints. No CI, um serviço Postgres 18 faz esse papel.
- **Constraints no banco** além da API: `CHECK (char_length(...))` dos limites de texto (RN34), `CHECK` de `protetor_id` × `responsavel_tipo` (RN42), FK `restrict` de protetores, `CHECK (id = 1)` em `ong` e as demais de "Limites e garantias no banco" (DESENVOLVIMENTO.md, seção 5).
- **Conexão na API:** `apps/api/src/db.ts` cria o cliente postgres.js + Drizzle a partir de `env.HYPERDRIVE.connectionString`, um por requisição.
- **Usuário do banco** da API com privilégios só de DML nas tabelas do app (sem DDL); outro usuário, só no CI, para migrations.
- **Sem RLS:** a fronteira de segurança é a API (rotas públicas só leem colunas públicas; `animais_privado` só é consultada em rotas `/admin`).
- **Primeiro acesso após inatividade:** o Neon suspende o processamento após 5 min sem uso e "acorda" em alguns segundos. O cache de leitura do Hyperdrive e o `Cache-Control` das rotas públicas escondem isso na maioria das visitas. Se incomodar, o plano pago do Neon desliga a suspensão.

## 6. Fotos (R2)

| Bucket | Acesso | Conteúdo |
|---|---|---|
| `sospatas-fotos` | **Público** pelo domínio `fotos.sospatas.org.br` (com cache do Cloudflare) | `animais/{animal_id}/{foto_id}.webp` e `-thumb.webp` (RN04) · `site/historia/{id}.webp` (RN38) · `perdidos/{perdido_id}/{id}.webp` (anúncios aprovados) |
| `sospatas-quarentena` | **Privado**: só a API lê e grava (rota admin que transmite o arquivo para a equipe) | `perdidos/{perdido_id}/{id}.webp` enquanto `pendente` (RN19) |
| `sospatas-backups` | **Privado** | Dumps diários do banco (seção 8) |

Na prévia, `sospatas-fotos-previa` e `sospatas-quarentena-previa` (criados em 09/10/2026), ambos privados: a API serve as fotos em `/api/publico/fotos/*`. Local dos buckets: **`enam`** (leste da América do Norte), o mais próximo do Brasil, já que o R2 não tem região na América do Sul; o cache do Cloudflare entrega as fotos a partir de São Paulo.

- **Aprovar anúncio** = copiar os objetos da quarentena para o bucket público e apagar da quarentena, na mesma operação (RN19).
- **Excluir** segue a RN05: primeiro os arquivos, depois o registro.
- **URL das fotos:** a API devolve a URL pronta. Com `FOTOS_URL_BASE` (produção: `https://fotos.sospatas.org.br`), aponta para o domínio de fotos; vazio (computador), para `/api/publico/fotos/{path}`. Na prévia, o site (`pages.dev`) e a API (`workers.dev`) ficam em domínios diferentes, então `FOTOS_URL_BASE` é a rota de fotos do próprio Worker da prévia (`https://sospatas-api-previa.sospatas.workers.dev/api/publico/fotos`). As fotos da história guardam só o caminho da completa (`site/historia/{id}.webp`); a miniatura fica ao lado, `{id}-thumb.webp`.
- **Não usar a URL pública `r2.dev`** (decidido em 08/10/2026): ela não passa pelo cache do Cloudflare, então cada acesso vira uma operação cobrável do R2. Antes do domínio próprio (ambiente de teste), as fotos são servidas pela API, que tem o limite diário do Workers gratuito como teto (seção 11.1).
- O acesso ao R2 fica atrás da interface `Armazenamento` (`colocar`, `obter`, `copiar`, `apagarPrefixo`). Para trocar de serviço (S3, MinIO na VPS), basta outra implementação.

## 7. Tarefas agendadas (Cron Trigger do Worker)

Um cron diário (03:00, horário de Brasília = `0 6 * * *` UTC; `[triggers]` no `wrangler.toml`, configurado desde 09/10/2026) chama `scheduled()` em `apps/api/src/index.ts`, que executa `tarefas/limpeza.ts`:

| Tarefa | Regra |
|---|---|
| Apagar anúncios `publicado` com `expira_em` vencido (arquivos + registro) | RN25 |
| Apagar anúncios `pendente` há mais de 7 dias (arquivos da quarentena + registro) | RN27 |
| Apagar pedidos de adoção recusados ou não concluídos há mais de 90 dias, e aprovados 90 dias depois da adoção | RN15 |
| Apagar o registro de envios do "Fale com a ONG" com mais de 1 dia (`contato_envios`) | RN51 |

O antigo "keep-alive" do Supabase (RN16) **deixa de existir**: o Neon não pausa projetos gratuitos.

## 8. Backup

- **Workflow `backup.yml`** (GitHub Actions, diário): `pg_dump` do Neon → arquivo `.sql.gz` → `sospatas-backups/AAAA-MM-DD.sql.gz` no R2 (pela API S3 do R2). Mantém os últimos **30 dias** (apaga os mais antigos).
- **Restauração** documentada no README (`psql` a partir do dump) e **testada uma vez antes da entrega** (tarefa 8).
- O Neon também mantém **6 horas** de histórico para restauração no plano gratuito. O backup próprio é a garantia de longo prazo.
- As fotos não entram no backup (o R2 é durável); a perda de uma foto não perde o cadastro.

## 9. Ambientes, deploy e segredos

| Ambiente | Front | API | Banco | Fotos |
|---|---|---|---|---|
| **Local** | `pnpm dev` (Vite, porta 5173) | `wrangler dev` (porta 8787, com proxy de `/api` no Vite) | Postgres 18 no `docker-compose` (`sospatas` e `sospatas_teste`) | R2 simulado localmente pelo Wrangler |
| **Prévia** | Pages, branch `develop` | Worker `sospatas-api-previa` (`--env previa`, `*.workers.dev`), Hyperdrive `sospatas-previa` | Projeto do Neon `sospatas-previa`, marcado com `COMMENT ON DATABASE` para aceitar os dados de exemplo (`--previa`) | Buckets `-previa` |
| **Produção** | `sospatas.org.br` | `sospatas.org.br/api` | Neon `production` | `fotos.sospatas.org.br` |

**Configuração do Worker:** no `wrangler.toml`, o nível de cima é a **produção** (`AMBIENTE=producao`) e `[env.previa]` repete todos os bindings (eles não são herdados). No computador, o `.dev.vars` troca `AMBIENTE` para `local`; sem ele, a API se comporta como produção, o que mantém desligado qualquer atalho de desenvolvimento. Os tipos do `env` (`worker-configuration.d.ts`) são gerados por `wrangler types` na instalação e no typecheck, e ficam fora do Git.

**Branches:**
| Branch | Papel | Publica em |
|---|---|---|
| `main` | **Produção**: só recebe merge vindo da `develop` quando a versão está testada | Produção (a partir da etapa 14) |
| `develop` | **Integração e testes**: recebe o trabalho de cada etapa ou correção | Prévia (a partir da etapa 8) |
| `etapa-NN-…`, `correcao-…` | Trabalho do dia a dia, criadas a partir da `develop` | – |

**Fluxo:** branch de trabalho → PR para a `develop` → `ci.yml` (typecheck, lint, formatação, testes e build) → merge → prévia atualizada → testado, PR da `develop` para a `main` → `deploy.yml`: migrations no Neon → `wrangler deploy` da API → o Pages publica o front pela integração com o GitHub. Versões marcadas com tag na `main` (`v1.0.0`, …) a partir da primeira publicação.

**Segredos** (nunca no código; `wrangler secret` e secrets do GitHub):
| Segredo | Onde |
|---|---|
| String de conexão do Neon | Hyperdrive (configuração) e GitHub (migrations, backup) |
| `TURNSTILE_SECRET` | API |
| `IP_HASH_SECRET` (RN23) | API |
| `ACCESS_TEAM_DOMAIN` e `ACCESS_AUD` | Não são segredo: ficam em `[vars]` do `wrangler.toml`, por ambiente (o `aud` muda entre prévia e produção) |
| Chaves S3 do R2 (só para o backup) | GitHub |
| `CLOUDFLARE_API_TOKEN` (deploy) | GitHub |

**E-mail do "Fale com a ONG" (RN51):** a API envia pelo **Cloudflare Email Routing** (binding `EMAIL` do tipo `send_email`, só no nível de produção do `wrangler.toml`). O remetente é `EMAIL_REMETENTE` (`site@sospatas.org.br`) e o destino é `EMAIL_DESTINO` (`sitesospatas@gmail.com`), ambos em `[vars]`; a mensagem é montada em texto puro com `Reply-To` de quem escreveu (`servicos/email.ts`). Na etapa 14: ativar o Email Routing em `sospatas.org.br` (o Cloudflare cria os registros MX/SPF), **verificar** `sitesospatas@gmail.com` como destino (chega um e-mail de confirmação nessa caixa) e conferir com um envio real. Na prévia não há binding (o Email Routing exige o domínio) e o formulário responde 503, com o e-mail da ONG na tela; no computador, o `wrangler dev` simula o envio e mostra o arquivo da mensagem no terminal. Se o e-mail da ONG mudar, é preciso verificar o novo destino e trocar `EMAIL_DESTINO` e `destination_address`.

**Segurança do front:** arquivo `_headers` no Pages com `Content-Security-Policy` (fontes do Google, fotos de `fotos.sospatas.org.br`, Turnstile), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (sem câmera/localização).

## 10. Contas e propriedade

- **Domínio** `sospatas.org.br` no **CNPJ da ONG** (26.515.895/0001-90). O `.org.br` exige CNPJ de instituição sem fins lucrativos: o Registro.br confere o cadastro na Receita e só pede documentos (cartão CNPJ e estatuto) se não conseguir confirmar. Em 08/10/2026, o CNPJ estava ativo, com natureza jurídica "Associação Privada", e o domínio estava livre. Titular: a ONG; contato técnico: quem mantém o site. DNS apontado para o Cloudflare.
- **E-mail das contas: `sitesospatas@gmail.com`** (criado em 08/10/2026), só para o site. Recuperação pelo e-mail geral da ONG (`sospatas@hotmail.com`), para a ONG retomar o acesso se o mantenedor sair. O e-mail geral não é usado como login para não depender da ONG a cada código de verificação; e-mails do próprio domínio (`site@sospatas.org.br`) também não, porque deixam de funcionar se o domínio vencer.
- **Cloudflare e Neon** criados com esse Gmail, com o **e-mail pessoal do mantenedor como administrador** em cada um. No Registro.br, o Gmail é o e-mail de contato do domínio.
- **GitHub:** o código fica no repositório pessoal do mantenedor, **`henriquenobre/sos-patas`** (decidido em 08/10/2026). Se a manutenção passar para outra pessoa, transferir para uma organização gratuita da ONG criada com o Gmail (Settings → Transfer ownership). Depois da transferência: reconectar o Cloudflare Pages ao repositório, conferir os secrets do GitHub Actions, atualizar o `git remote` e o link do protótipo no README (o endereço do GitHub Pages muda e não é redirecionado).
- **Verificação em duas etapas** por aplicativo autenticador (não SMS). Senhas e códigos de reserva entregues à ONG por escrito.
- **Cartão:** o R2 pede um meio de pagamento cadastrado, mesmo no plano gratuito. Ativado em 08/10/2026 com o **cartão pessoal do mantenedor**. É o único serviço com cartão; riscos de cobrança e proteções na seção 11.1.

## 11. Limites gratuitos e quando pagar

| Recurso | Limite grátis | Uso estimado | Se passar |
|---|---|---|---|
| Workers: requisições | 100 mil/dia (zera às 21h de Brasília) e 1.000 por minuto | Poucos milhares/dia | Workers Paid: US$ 5/mês (10 milhões/mês) |
| Workers: CPU | 10 ms/requisição | Consultas simples: ~1–3 ms | Workers Paid (30 s) |
| Hyperdrive | 100 mil consultas/dia (toda consulta conta) | Bem abaixo, com cache na API | Vem junto com o Workers Paid |
| Neon: armazenamento | 0,5 GB | Texto: muito abaixo | Plano Launch (por uso) |
| Neon: processamento | 100 CU-horas/mês = ~400 h/mês acordado com 0,25 CU (~13 h/dia). Dorme após 5 min sem consulta | Depende de quantas horas por dia o banco fica acordado (seção 11.2) | Plano Launch (por uso) |
| R2 | 10 GB, tráfego grátis | ~1 GB/ano no ritmo da ONG | US$ 0,015/GB/mês |
| Cron Triggers | 5 por conta | 1 | – |
| Access | 50 usuários | 2 a 5 | Plano pago do Zero Trust |

### 11.1 Risco de cobrança e proteções (análise de 08/10/2026)

**Onde pode haver cobrança:** só no **R2**, o único serviço com cartão. Os outros param de funcionar no limite, sem cobrar:

| Serviço | No limite gratuito | Cobra? |
|---|---|---|
| Workers, Pages Functions, Hyperdrive | As requisições acima de 100 mil/dia falham até o dia seguinte (o site fica fora do ar, sem custo) | Não, enquanto a conta ficar no **Workers Free** (nunca assinar o Workers Paid sem decidir) |
| Pages (site estático) | Banda e acessos ilimitados | Não |
| Neon | Sem cartão: no limite de armazenamento ou de processamento, o banco para | Não |
| Access, Turnstile, Web Analytics, Cron | Grátis dentro dos limites; acima, não deixa criar mais | Não |
| **R2** | Acima do gratuito, cobra por uso: US$ 0,015/GB/mês guardado, US$ 4,50 por milhão de gravações (classe A) e US$ 0,36 por milhão de leituras (classe B). Tráfego de saída sempre grátis | **Sim** |

**Quanto uso a ONG gera:** o gratuito do R2 é 10 GB guardados, 1 milhão de gravações e 10 milhões de leituras **por mês**. Fotos: ~1 GB/ano (10 GB duram anos). Gravações: algumas centenas por mês. Leituras: as fotos públicas passam pelo **cache do Cloudflare** (`fotos.sospatas.org.br`), e uma foto em cache não conta como leitura do R2. Mesmo sem cache, 10 milhões de leituras são cerca de 500 mil visitas por mês vendo 20 fotos cada, centenas de vezes o movimento esperado. Se um dia passar, o valor é de centavos: 20 GB guardados custariam US$ 0,15/mês.

**Um atacante consegue inflar o armazenamento ou o banco?** Não de forma relevante:
- Só a API grava no R2 e no banco; o navegador nunca grava direto (seção 6).
- O único envio sem login é o anúncio de perdido/encontrado: Turnstile, no máximo 2 fotos de 500 KB, 3 envios por dia por IP e **30 pendentes no total** (RN21–RN23). O pior caso é ~30 MB na quarentena, apagados em 7 dias (RN27). Nada fica público sem aprovação (RN18).
- O formulário de adoção só grava texto no banco (sem arquivos): Turnstile, limites de caracteres, 2 pedidos por dia por IP e 1 pendente por WhatsApp (RN50).
- Cadastro de animais, textos e fotos da história exigem o login do Access.
- O banco tem limites de caracteres em todos os campos (CHECK) e o Neon sem cartão não cobra.

**Um atacante consegue gerar leituras cobráveis?** É o único caminho, e fica bloqueado assim:
- **Produção:** as fotos saem pelo domínio próprio com cache. Regra de cache "Cache Everything" com **query string ignorada** (`?x=1`, `?x=2`… não furam o cache) e validade longa (as fotos nunca mudam de conteúdo: trocar a foto gera um arquivo novo, RN06). Mais uma **regra de limite de requisições** do WAF no subdomínio de fotos (o plano gratuito tem uma). Seriam precisos mais de 10 milhões de pedidos de arquivos diferentes que não estão em cache só para começar a cobrar US$ 0,36 por milhão, e a proteção contra DDoS (grátis) atua antes disso.
- **Teste (antes do domínio):** sem `r2.dev`; as fotos passam pela API. O Worker gratuito para em 100 mil requisições por dia, então o máximo seria ~3 milhões de leituras por mês, abaixo dos 10 milhões gratuitos.

**Proteção da própria conta (o maior risco real):** quem invade a conta do Cloudflare pode criar recursos pagos. Por isso: verificação em duas etapas em todas as contas (seção 10); o token de API do GitHub Actions só com as permissões de publicar Workers e Pages, nunca de cobrança ou de contas; as chaves S3 do R2 do backup limitadas ao bucket `sospatas-backups`; nenhum segredo no repositório.

**Alerta:** **alerta de orçamento do Cloudflare em US$ 1** (Billing → Budget alerts), enviado ao Gmail do site, para saber de qualquer cobrança no primeiro dólar. O Cloudflare não tem um teto que bloqueie a cobrança do R2; o alerta e os limites acima fazem esse papel. Conferir a página de uso do R2 uma vez por mês nos primeiros meses.

### 11.2 Capacidade: quantos acessos o plano gratuito aguenta (08/10/2026)

**Conta usada:** uma visita típica (Início → vitrine → 2 ou 3 fichas, mudando um filtro) faz cerca de **7 chamadas à API**. O HTML, o JavaScript e as fotos não contam: vêm do Pages e do cache, sem limite.

| Gargalo | Limite | Equivale a | O que acontece no limite |
|---|---|---|---|
| Workers (requisições da API) | 100 mil/dia | **~14 mil visitas por dia** | A API responde erro até as 21h (Brasília), quando o contador zera; as páginas abrem, mas sem animais e textos. Sem cobrança |
| Workers (rajada) | 1.000/minuto | ~140 visitas começando no mesmo minuto (ex.: post viral) | Erro só naquele minuto |
| Hyperdrive (consultas ao banco) | 100 mil/dia | Sem cache na API, ~1,5 consulta por chamada: **~10 mil visitas/dia**. Com cache, deixa de ser gargalo | Igual ao Workers |
| **Neon (horas acordado)** | ~13 h/dia em média (0,25 CU) | Não depende do número de visitas, e sim de **quantas horas por dia chega alguma consulta**: uma consulta a cada menos de 5 min mantém o banco acordado | O banco é suspenso até o próximo ciclo mensal: **a API fica sem dados pelo resto do mês**. Sem cobrança |

**Movimento esperado da ONG:** centenas de visitas por dia, com picos quando há post no Instagram. Folga grande nos três primeiros; o Neon é o que precisa de cuidado.

**Medidas (fazem parte das etapas 4 e 5):**
1. **Neon com compute fixo em 0,25 CU** (mínimo e máximo). Com o padrão "0,25 ↔ 2 CU", um pico faz o banco gastar as horas até 8 vezes mais rápido.
2. **Cache das leituras públicas na própria API** (Cache API do Workers, 60 s a 5 min): numa rajada de visitas, o banco recebe uma consulta por minuto por rota, e não uma por visitante. Salvar na área da ONG limpa o cache das rotas afetadas, para manter "salvar publica na hora" (RN37).
3. **`GET /site` com uma consulta só** (textos, itens e ONG juntos).
4. **Páginas públicas tolerantes a falha da API:** mensagem amigável ("Não conseguimos carregar agora, tente em alguns minutos") com os botões de WhatsApp e Instagram da ONG, que ficam no próprio site.
5. **Acompanhar o uso do Neon** (horas de processamento) uma vez por semana no primeiro mês. Se passar de ~70% no meio do mês, aumentar o tempo de cache.

**Se o site crescer além disso:** Workers Paid (US$ 5/mês, inclui Hyperdrive sem limite diário) e plano pago do Neon, ou a migração para VPS (seção 12).

## 12. Migração para VPS (quando precisar)

O código já nasce preparado:
1. API: rodar `apps/api/src/node.ts` (Hono com `@hono/node-server`) num contêiner Docker.
2. Banco: continuar no Neon ou subir Postgres em contêiner e restaurar o último dump.
3. Fotos: manter o R2 (acessível de qualquer lugar pela API S3) ou trocar a implementação de `Armazenamento`.
4. Login: manter o Access na frente da VPS (domínio continua no Cloudflare, via proxy ou Tunnel).
5. Cron: trocar o Cron Trigger por um cron do sistema chamando as mesmas funções de `tarefas/`.
6. E-mail do "Fale com a ONG": o Email Routing só existe no Workers; em `node.ts`, trocar `enviarEmail` por SMTP ou um serviço de envio (a mensagem já sai pronta de `servicos/email.ts`).

Custo de referência (out/2026): Contabo Cloud VPS 10 ≈ R$ 30–36/mês; Hostinger KVM 1 ≈ R$ 28–48/mês.
