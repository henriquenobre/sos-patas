# Plano de desenvolvimento: Site SOS Patas

> Ordem de construção do site, dividida em etapas pequenas para executar **uma por vez** (um pedido por etapa).
> **O quê** construir está no [DESENVOLVIMENTO.md](DESENVOLVIMENTO.md) (escopo, modelo de dados, RN) e no [prototipo/TELAS.md](../prototipo/TELAS.md); **como** e **onde**, no [ARQUITETURA.md](ARQUITETURA.md). Este arquivo só define a **ordem** e o que conta como pronto em cada etapa.
> Prazo: site no ar até **30/10/2026**; trabalho entregue em 11/11/2026 (premissa P4).

---

## Como usar

**Para pedir uma etapa:**

```
Execute a etapa N do PLANO_DESENVOLVIMENTO.md
```

**O que a IA faz em toda etapa:**
1. Lê a etapa inteira e as seções citadas (RN, telas, ARQUITETURA) antes de escrever código.
2. Trabalha numa branch local `etapa-NN-nome-curto` criada a partir da `develop` e deixa as alterações prontas para revisão. **Commit, merge e push só quando o mantenedor pedir** (RP05 no [CLAUDE.md](../CLAUDE.md)); quem leva o trabalho para a `develop` e a `main` é ele. A `main` é produção e só recebe a `develop` testada (ARQUITETURA.md, seção 9).
3. Entrega só o que está em "Entregas". O que aparece em "Fora desta etapa" fica para depois, mesmo que pareça rápido.
4. Termina com `pnpm lint`, `pnpm typecheck` e `pnpm test` passando (a partir da etapa 1).
5. Confere a tabela da RP01 ([CLAUDE.md](../CLAUDE.md)): se o código divergiu da documentação, atualiza os dois lados e registra a decisão.
6. Atualiza o **Painel** abaixo (status), registra as datas reais de início e conclusão no [LINHA_DO_TEMPO.md](LINHA_DO_TEMPO.md) (RP04) e resume o que ficou pendente.

**Ordem escolhida e por quê:** fundação → banco → regras compartilhadas → API → telas, em **fatias verticais** (cada parte do site fica pronta de ponta a ponta antes da próxima). O site público vem antes da área da ONG porque só lê dados, o que valida banco, API e visual com pouco risco. Um **deploy de prévia** entra no meio (etapa 8) para descobrir cedo problemas reais do Cloudflare (Hyperdrive, limite de 10 ms de CPU, R2), e não na véspera da entrega.

## Painel

| # | Etapa | Depende de | Sugestão de data | Status |
|---|---|---|---|---|
| 0 | Contas e serviços (manual) | – | 08–12/10 | 🔄 |
| 1 | Fundação do monorepo | – | 09–10/10 | ✅ 08/10 |
| 2 | Banco: schema, migrations e seed | 1 | 10–11/10 | ✅ 08/10 |
| 3 | Pacote compartilhado (zod, limites, idade) | 1 | 11/10 | ✅ 08/10 |
| 4 | Base da API (erros, login, armazenamento, testes) | 2, 3 | 12/10 | ✅ 08/10 |
| 5 | API pública de leitura | 4 | 13/10 | ✅ 08/10 |
| 6 | Site público: layout e páginas de conteúdo | 5 | 13–14/10 | ✅ 08/10 |
| 7 | Site público: vitrine e ficha do animal | 6 | 15/10 | ✅ 08/10 |
| 8 | Deploy de prévia no Cloudflare | 0, 7 | 16/10 | ✅ 09/10 · ⚠️ CPU perto do teto (ver etapa 8) |
| 9 | API da ONG: animais, fotos, adoção, protetores | 4 | 16–17/10 | ⬜ |
| 10 | Área da ONG: estrutura e animais (T09–T11) | 9 | 17–19/10 | ⬜ |
| 10b | Pedidos de adoção: formulário com o termo, análise e animal fora do site (RN47–RN50) | 10 | 19–20/10 | 🔄 banco, API e formulário prontos em 09/10; faltam as telas T27/T28 (com a etapa 10) |
| 11 | Perdidos e encontrados (API, telas e limpeza diária) | 10 | 20–21/10 | ⬜ |
| 12 | Editor de textos (T15–T20) | 10 | 21–23/10 | ⬜ |
| 13 | Mais: dados da ONG, anúncio pela equipe, protetores, "Alterado por" | 11, 12 | 23–24/10 | ⬜ |
| 14 | Produção: domínio, Access, CI/CD, backup e segurança | 8, 13 | 24–27/10 | ⬜ |
| 15 | Dados reais, teste com a ONG e ajustes finais | 14 | 27–30/10 | ⬜ |

Status: ⬜ não iniciada · 🔄 em andamento · ✅ pronta · ⏸️ bloqueada (anotar o motivo).

**Se o prazo apertar** (DESENVOLVIMENTO.md, seção 4, "Prioridade"): as etapas 0 a 12 (inclusive a 10b, que entrou em 08/10/2026), 14 e 15 são obrigatórias. Da etapa 13, Dados da ONG (T23) e anúncio pela equipe (T21) vêm primeiro; protetores (T24), "Alterado por" (RN43) e filtro por responsável podem ficar para depois da entrega.

---

## Etapa 0 · Contas e serviços (manual)

**Feita por você, fora do código.** Comece já: o domínio `.org.br` depende de documentos da ONG e pode levar dias.

- [x] E-mail das contas: `sitesospatas@gmail.com` (08/10/2026). Falta: recuperação por `sospatas@hotmail.com`, verificação em duas etapas por aplicativo e seu e-mail pessoal como administrador em cada serviço (ARQUITETURA.md, seção 10)
- [ ] **Registro.br:** registrar `sospatas.org.br` no CNPJ da ONG (26.515.895/0001-90; livre e com CNPJ ativo de associação privada em 08/10/2026). **08/10/2026: pedido feito, ticket 32358834, "Registro pendente", prazo para concluir até 07/11/2026**
  - conta no Registro.br de uma pessoa física (CPF) e, a partir dela, a conta da ONG como **titular**, com a presidente ou alguém autorizado por ela de acordo
  - você como **contato técnico**, para poder mudar o DNS
  - pagar a anuidade (boleto, PIX ou cartão); se o Registro.br pedir documentos, enviar o cartão CNPJ e o estatuto (separar o PDF do estatuto já, para não atrasar)
  - depois de criar o site no Cloudflare, trocar os servidores DNS no Registro.br pelos 2 que o Cloudflare indicar
- [x] **GitHub:** o site fica neste repositório, `henriquenobre/sos-patas` (decidido em 08/10/2026). Transferir para uma organização da ONG antes de deixar a manutenção (ARQUITETURA.md, seção 10)
- [ ] **Cloudflare:** conta criada com `sitesospatas@gmail.com` (08/10/2026)
  - [x] verificação em duas etapas e seu e-mail pessoal como membro administrador (Manage account → Members)
  - [x] Zero Trust ativado no plano gratuito, com o nome do time `sospatas`
  - [x] R2 ativado com o cartão pessoal do mantenedor (08/10/2026); os buckets só são criados nas etapas 8 e 14
  - [x] Alerta de orçamento em US$ 1 (Billing → Budget alerts) para o Gmail do site (ARQUITETURA.md, seção 11.1) (09/10/2026)
  - [ ] adicionar `sospatas.org.br` só depois que o Registro.br concluir o registro
- [x] **Neon:** projeto `sospatas` em São Paulo, PostgreSQL 18, branch padrão `production` (08/10/2026). Falta: convidar seu e-mail pessoal. A prévia usa um projeto separado, `sospatas-previa` (criado em 09/10/2026, etapa 8)
  - [x] Compute da branch `production` fixo em **0,25 CU** (mínimo e máximo), para não gastar as 100 CU-horas do mês num pico (ARQUITETURA.md, seção 11.2) (09/10/2026; o `sospatas-previa` também)
- [ ] Lista de e-mails da equipe (Gracia, Claudia e quem mais a ONG indicar, TELAS.md pergunta 13)
- [x] Ferramentas locais (08/10/2026): Node 24.21 (pelo nvm-windows), pnpm 12.10 (pelo Corepack) e Docker Desktop 29. O Wrangler é dependência do `apps/api` (etapa 1): `pnpm -C apps/api exec wrangler login` com o seu e-mail pessoal (na raiz, `pnpm wrangler` não encontra o comando)

**Pronto quando:** contas criadas e acessos guardados num gerenciador de senhas; domínio pedido (pode ainda não estar ativo).

## Etapa 1 · Fundação do monorepo

**Objetivo:** esqueleto rodando localmente, com front chamando a API.

**Entregas:**
- `pnpm-workspace.yaml`, `package.json` raiz com scripts `dev`, `build`, `lint`, `typecheck`, `test`, `db:*`, `packageManager` (versão do pnpm fixa) e `engines.node` (`>=24`); `.nvmrc` com `24`
- TypeScript estrito compartilhado (`tsconfig.base.json`), ESLint e Prettier, Vitest
- `apps/web`: Vite + React + TypeScript + Tailwind com os **tokens de cor e fontes** (DESENVOLVIMENTO.md, seção 7.1), React Router, TanStack Query, `public/logo.png` e favicon, proxy de `/api` para o Wrangler
- `apps/api`: Hono com `GET /api/saude`; `index.ts` (Workers) e `node.ts` (Node); `wrangler.toml` com os bindings previstos (HYPERDRIVE, FOTOS, QUARENTENA) e ambiente `previa`
- `packages/compartilhado` vazio, já importado pelo web e pela api
- `docker-compose.yml` com Postgres 18, a mesma versão do Neon (bancos `sospatas` e `sospatas_teste`)
- `.github/workflows/ci.yml`: lint, typecheck e testes em cada PR
- `.env.example` e `.dev.vars.example` (sem segredos reais); `.gitignore` atualizado
- README: seção "Como rodar localmente"

**Pronto quando:** `docker compose up -d` + `pnpm dev` abre o front, que mostra a resposta de `/api/saude`; CI verde.

**Fora desta etapa:** banco, telas reais.

## Etapa 2 · Banco: schema, migrations e seed

**Objetivo:** todas as tabelas do MVP criadas por migration, com conteúdo inicial.

**Entregas:**
- `db/schema.ts` (Drizzle) com **todas** as tabelas da seção 5 do DESENVOLVIMENTO.md: `animais`, `fotos`, `animais_privado`, `perdidos`, `perdidos_fotos`, `equipe`, `ong`, `protetores`, `conteudo_textos`, `conteudo_itens`, e os enums
- Constraints no banco: `CHECK (char_length(...))` dos limites (RN34), `CHECK` de `protetor_id` × `responsavel_tipo` (RN42), FK `restrict` de protetores, `CHECK (id = 1)` em `ong`, `CHECK` das chaves válidas de `conteudo_textos`
- Migration inicial gerada por `drizzle-kit generate` em `db/migrations/`
- `db/seed/seed_conteudo.sql`: `ong`, textos e itens **copiados do protótipo** (`prototipo/index.html`), com **ids fixos** nos itens de `inicio_fotos` (para casar com os arquivos no R2, etapa 14)
- `db/seed/seed_dev.sql`: só para desenvolvimento, com os animais de exemplo do protótipo, 1 protetor, 2 anúncios de perdidos e 1 usuária de teste em `equipe`
- Conexão: módulo `db` na API com postgres.js + Drizzle, lendo do binding Hyperdrive (local: string de conexão do Docker)
- Testes das constraints (inserir valor acima do limite falha; protetor com animal não pode ser excluído)

**Regras:** RN34, RN42, RN46 (máx. 4 números), RN38 (máx. 8 fotos: validar na API, não no banco).

**Pronto quando:** `pnpm db:migrate && pnpm db:seed` cria tudo do zero no Docker; testes passam.

## Etapa 3 · Pacote compartilhado

**Objetivo:** uma única fonte para limites e validações, usada pelo front e pela API.

**Entregas em `packages/compartilhado`:**
- Schemas zod: animal (cadastro/edição), adoção, protetor, anúncio de perdido (público e equipe), texto, item de lista, dados da ONG
- **Configuração das listas** (`perguntas`, `como_adotar_passos`… com rótulos, limites, obrigatoriedade e mínimo/máximo de itens), que a API e o `ListaEditavel` vão ler. _Adiantado na etapa 2: `dominio.ts` (enums), `limites.ts` e `conteudo.ts` (limites, obrigatoriedade, mínimo e máximo) já existem e alimentam o banco; falta acrescentar os rótulos_
- Limites fixos: fotos (3 por animal, 2 por anúncio, 500 KB), prazos (30 dias, 7 dias, 90 dias), envios (3/dia por IP, 30 pendentes)
- Funções: `idade` e `ehAdulto` (RN11, RN13), `esperandoHaMaisTempo` (RN12), normalizar e validar WhatsApp, `contemLink` (RN21), `linkWhatsApp(numero, texto)`
- Testes unitários de todas as funções e dos casos de borda dos schemas

**Pronto quando:** testes passam; nenhum limite numérico aparece duplicado fora deste pacote (exceto os `CHECK` do banco).

## Etapa 4 · Base da API

**Objetivo:** tudo o que as rotas vão precisar, antes de criar as rotas.

**Entregas:**
- Organização: `rotas/publico`, `rotas/admin`, `servicos/`, `middleware/`, `armazenamento/`, `tarefas/`
- Tratamento de erros no formato `{ erro, mensagem }` com os status da ARQUITETURA.md, seção 3; validação de entrada com os schemas zod
- `middleware/access.ts`: valida o JWT do Cloudflare Access (`Cf-Access-Jwt-Assertion`: assinatura, `aud`, `exp`), busca o e-mail em `equipe` e recusa se não existir ou estiver inativo. **Modo local:** e-mail fixo vindo de `.dev.vars`, ativado só com `AMBIENTE=local` (o código recusa esse modo em qualquer outro ambiente)
- `GET /api/admin/eu`
- Interface `Armazenamento` (`colocar`, `obter`, `copiar`, `apagarPrefixo`, `apagar`) com implementação R2 e implementação em memória para testes
- Utilitário que confere a assinatura WebP (`RIFF....WEBP`) e o tamanho (RN21)
- CORS só para a origem do Pages (antes do domínio próprio)
- Infraestrutura de testes: banco `sospatas_teste` recriado por migration, rotas testadas com `app.request()`
- Cache das leituras públicas (Cache API do Workers) com limpeza ao salvar, para poupar o Neon (ARQUITETURA.md, seção 11.2)

**Pronto quando:** testes cobrem JWT válido, expirado, `aud` errado, e-mail fora da `equipe` e usuária inativa.

## Etapa 5 · API pública de leitura

**Entregas** (ARQUITETURA.md, seção 3.1): `GET /site`, `GET /animais` (filtros), `GET /animais/destaques`, `GET /animais/:id`, `GET /perdidos?tipo`, com `Cache-Control: public, max-age=60`.

**Regras:** RN10, RN11, RN12, RN18, RN31 (nome e WhatsApp do responsável vêm de `protetores` ou `ong`).

**Pronto quando:** testes provam que **nenhuma** coluna de `animais_privado`, `equipe`, `ip_hash` ou anúncio `pendente`/expirado aparece nas respostas; filtros e ordenação testados.

**Fora desta etapa:** `POST /perdidos` (etapa 11).

## Etapa 6 · Site público: layout e páginas de conteúdo

**Objetivo:** as páginas que só leem textos, já com o visual final.

**Entregas:**
- Cliente HTTP tipado + hooks TanStack Query (`api/`); `GET /site` carregado uma vez e compartilhado
- Layout público: cabeçalho, rodapé (contatos e PIX da tabela `ong`), `BlocoPix` (copiar chave), página 404, estados de carregando e erro
- `TextoSimples` (quebras de linha + links automáticos, sem `dangerouslySetInnerHTML`, RN24, RN34)
- **T01** Início (inclusive a seção "Esperando há mais tempo", usando `/animais/destaques`), **T04** Como adotar, **T05** Perguntas frequentes, **T06** Como ajudar, **T07** Privacidade
- Redirecionamento `/sobre` → `/ajude` (`public/_redirects`)
- Visual acolhedor da página inicial (patinhas, polaroides, borda ondulada; TELAS.md, Identidade visual)
- Título e `og:image` por página

**Regras:** RN31, RN32, RN33, RN34, RN44, RN45, RN46.

**Pronto quando:** cada página bate com o print do protótipo em 360 px e no computador; nenhum texto editável está fixo no código.

## Etapa 7 · Site público: vitrine e ficha do animal

**Entregas:** `CardAnimal`, `ChipFiltro`, **T02** Vitrine (filtros na URL, para poder compartilhar), **T03** Ficha (galeria, saúde, temperamento, responsável, benefício, aviso de protetor), `alt` das fotos ("Foto do(a) {nome}").

**Regras:** RN01, RN03 (vitrine só com miniatura), RN10–RN13, RN17, RN31, RN32.

**"Quero adotar" (decidido em 08/10/2026):** o botão leva a `/animais/:id/adotar` (formulário de adoção, RN14). Até a etapa 10b, essa rota mostra "Em breve". A ficha já trata o status `em_analise` (RN48) quando ele existir.

**Pronto quando:** filtros combinados funcionam; animal adotado abre a ficha mas não aparece na vitrine.

## Etapa 8 · Deploy de prévia no Cloudflare

**Objetivo:** ver o site público rodando de verdade antes de construir a área da ONG.

**Entregas:**
- Banco de teste num **projeto separado do Neon** (`sospatas-previa`), e não numa branch do projeto de produção: as 100 CU-horas do plano gratuito são por projeto (ARQUITETURA.md, seção 11.2). Hyperdrive apontando para ele; migrations e seed aplicados nele. Os dados de exemplo (`seed_dev.sql`) hoje só rodam no banco local: liberar a prévia com uma opção explícita, sem nunca permitir a produção
- Buckets `sospatas-fotos-previa` e `sospatas-quarentena-previa`
- Worker `--env previa` publicado (`*.workers.dev`) e Pages ligado ao GitHub (`*.pages.dev`), com `VITE_API_URL` da prévia
- Segredos da prévia com `wrangler secret`
- Medição: tempo de CPU das rotas públicas no painel do Workers (precisa ficar bem abaixo de 10 ms) e tempo do primeiro acesso com o Neon "dormindo"
- README: como publicar a prévia

**Resultado (09/10/2026):** prévia no ar em https://sospatas.pages.dev (Pages, branch de produção `develop`) com a API em https://sospatas-api-previa.sospatas.workers.dev. Projeto `sospatas-previa` no Neon (0,25 CU) com migrations e dados de exemplo, liberados com `--previa` só em banco marcado (`COMMENT ON DATABASE`); Hyperdrive `sospatas-previa`; buckets `-previa` (local `enam`) com as fotos; Turnstile "SOS Patas" para `sospatas.pages.dev`; segredos com `wrangler secret`. Início, vitrine, ficha e Como ajudar conferidos no navegador (celular e computador), com fotos.

- **Ajustes descobertos:** o site e a API ficam em domínios diferentes, então a prévia precisa de `CORS_ORIGENS` e de `FOTOS_URL_BASE` apontando para a rota de fotos do Worker. Depois de publicar a API, as respostas antigas ficam até 15 min no cache da borda (README).
- **Medições:** resposta das rotas públicas entre 0,13 e 0,25 s. Primeiro acesso com o Neon dormindo: 0,87 s (0,18 s logo depois). **Tempo de CPU: 2 a 9 ms com o Worker aquecido, mas 12 a 41 ms nas primeiras requisições de uma instância nova** (`wrangler tail`, 17 requisições, todas `ok`). ⚠️ Perto do teto de 10 ms do Workers Free: investigar antes da etapa 14 (peso da inicialização: API com 1,26 MB, 227 KB compactada; medir rota por rota).

**Pronto quando:** a URL do Pages mostra Início, vitrine e ficha com os dados de exemplo; anotar no Painel qualquer limite que ficou perto do teto.

**Fora desta etapa:** domínio, Access e deploy automático (etapa 14).

## Etapa 9 · API da ONG: animais, fotos, adoção e protetores

**Entregas** (ARQUITETURA.md, seção 3.2):
- `GET /resumo` (números do T09)
- Animais: listar (status, responsável, busca), criar, ler (com `animais_privado`), editar, excluir
- Adoção e devolução (com nome e WhatsApp do adotante)
- Fotos: enviar (miniatura + completa), remover, reordenar
- Protetores: listar e criar (o cadastro do animal cria o protetor ali mesmo, RN42); editar e excluir com 409 se tiver animais
- Serviços em `servicos/`: `excluirAnimal`, `marcarAdotado`, `devolver`, `trocarFoto`, todos com transação onde houver mais de um passo
- `updated_at` e `updated_by` preenchidos em toda escrita (RN43, já desde aqui, mesmo que a tela venha na etapa 13)
- ~~Script `pnpm seed:fotos`~~: adiantado na etapa 7 como `pnpm db:fotos-exemplo` (direto no R2 local e no banco, sem passar pela API)

**Regras:** RN01, RN04–RN09, RN30, RN42, RN43.

**Pronto quando:** testes cobrem: exclusão apaga arquivos antes do registro e **não apaga o registro se o armazenamento falhar** (RN05); adoção deixa só a foto principal (RN07); 4ª foto é recusada; arquivo que não é WebP é recusado.

## Etapa 10 · Área da ONG: estrutura e animais

**Entregas:**
- Rotas `/admin/*` com layout próprio: `CabecalhoAdmin` ("Olá, {nome}" de `/eu`), `BarraAdmin` (rodapé no celular, abas no computador, some nos formulários), barra "Cancelar / Salvar"
- `lib/fotos.ts`: escolha da foto, redesenho em canvas, miniatura 400 px e completa 1200 px em WebP, sem EXIF (RN02, RN20)
- **T09** Painel (resumo, busca, abas Disponíveis/Adotados com "Em adaptação: faltam N dias", ações rápidas)
- **T10** Cadastro e **T11** Edição (fotos com reordenar, lar temporário, observações, protetor existente ou "＋ Novo protetor", marcar adotado, voltar para disponível, excluir com confirmação, "Ver no site")
- Tratamento de sessão expirada (volta ao login do Access)

**Regras:** RN01–RN09, RN30, RN42; Definição de pronto (DESENVOLVIMENTO.md, seção 8).

**Pronto quando:** dá para cadastrar um animal com 3 fotos **pelo celular** (testar no aparelho, na rede local), editar, adotar e excluir, e o resultado aparece certo no site público.

## Etapa 10b · Pedidos de adoção

**Objetivo:** quem quer adotar preenche o formulário e aceita o termo no site; o pedido fica salvo, o animal sai do site e a equipe avalia (RN14, RN15, RN47–RN50). Entrou no MVP em 08/10/2026; fluxo fechado com a ONG no mesmo dia.

**Feito em 09/10/2026 (adiantado):** migration, pacote compartilhado (formulário 1.1, termo, alertas), API pública e da equipe, limpeza diária com o cron, telas T26 e T26b, ficha em análise, texto da Privacidade e dos passos de "Como adotar". **Falta:** telas T27 e T28 e a aba Pedidos, que dependem da estrutura da área da ONG (etapa 10), e "Marcar como adotado" com `pedido_id` (etapa 9).

**Entregas:**
- Migration: valor `em_analise` no enum `status_animal` e tabela `pedidos_adocao` (com índice único parcial: um `pendente` por animal) (DESENVOLVIMENTO.md, seção 5)
- Pacote compartilhado: schema do formulário **versão 1.1** (perguntas e condicionais do [FORMULARIO_ADOCAO.md](formulario/FORMULARIO_ADOCAO.md)), texto do termo (TERMO_ADOCAO.md) e a função dos **alertas automáticos**
- API pública `POST /animais/:id/pedidos` (Turnstile, limites, transação que esconde o animal, limpeza de cache) e a ficha respondendo "em processo de adoção" para `em_analise`
- API da ONG: listar, ver (com alertas), anotar, aprovar e recusar; "Marcar como adotado" com `pedido_id`
- Limpeza diária do RN15 (com as tarefas da etapa 11, no mesmo cron)
- Telas **T26** (formulário com o termo) e **T26b** (confirmação); **T27** e **T28** na área da ONG; aba **Pedidos** na `BarraAdmin`; aba **Em análise** no T09
- Texto de Privacidade atualizado (TELAS.md, T07) no site (o protótipo está congelado desde 09/10/2026)

**Pronto quando:** testes cobrem: o pedido esconde o animal da vitrine e dos destaques; o segundo pedido do mesmo animal recebe 409; recusar devolve o animal ao site; aprovar mantém o animal fora até "Marcar como adotado"; os limites de envio; os alertas da tabela do formulário; nenhum dado do pedido aparece em rota pública.

## Etapa 11 · Perdidos e encontrados

**Entregas:**
- API pública `POST /perdidos`: Turnstile, validação, limite por IP (`ip_hash` com `IP_HASH_SECRET`) e de pendentes, fotos na quarentena (RN19–RN23)
- API da ONG: listar por status, aprovar (copia da quarentena para o público + `expira_em`), recusar, renovar, "voltou para casa", tirar do ar, rota que transmite a foto da quarentena
- `tarefas/`: limpeza diária (RN25, RN27) chamada pelo `scheduled()` do Worker, com cron `0 6 * * *` no `wrangler.toml`
- Telas **T12** (lista pública, filtro, aviso contra golpes), **T13** (formulário com até 2 fotos, consentimento, Turnstile) e **T13b** (confirmação)
- Tela **T14** (moderação com a lista de conferência da RN28, anúncios no ar com "Sai do ar em N dias"), número de pendentes na `BarraAdmin`

**Regras:** RN18–RN28, RN41.

**Pronto quando:** testes cobrem token inválido, 3ª foto, foto acima de 500 KB, arquivo falso com extensão `.webp`, descrição com link, 4º envio do mesmo IP no dia, aprovação movendo os arquivos e limpeza diária apagando arquivos e registro.

**Fora desta etapa:** anúncio criado pela equipe (T21, etapa 13).

## Etapa 12 · Editor de textos

**Entregas:**
- API: `GET /conteudo`, `PUT /conteudo/textos/:chave`, criar/editar/excluir item, `trocar-ordem` (transação), foto do item de `inicio_fotos`
- Componentes genéricos `CampoTextoEditavel` (contador de caracteres) e `ListaEditavel` (↑ ↓, editar, excluir com confirmação, "＋ Adicionar", mínimo/máximo de itens), configurados pelo pacote compartilhado
- Telas **T15** (lista de páginas), **T16** Perguntas, **T17** Item de lista, **T18** Como adotar, **T19** Página inicial (com fotos da história e lembrete de autorização de imagem), **T20** Como ajudar
- "Salvo e publicado ✓" + "Ver no site" após salvar; o cache do `GET /site` não pode esconder a alteração de quem acabou de salvar

**Regras:** RN33–RN38, RN46.

**Pronto quando:** cada texto e lista das páginas públicas pode ser alterado pelo celular e aparece no site; não é possível apagar a última pergunta nem passar de 4 números ou 8 fotos.

## Etapa 13 · Mais: dados da ONG, anúncio pela equipe, protetores e "Alterado por"

Na ordem de prioridade:
1. **T22** Mais (Dados da ONG, Protetores, Ver o site, Sair via `/cdn-cgi/access/logout`) e **T23** Dados da ONG (`GET/PUT /ong`)
2. **T21** Anúncio pela equipe: criar (já `publicado`, sem Turnstile, autorização obrigatória) e corrigir (fotos no bucket do status atual) (RN39, RN40)
3. **T24** Protetores parceiros: lista, edição e exclusão com o aviso de animais vinculados (RN42)
4. "Alterado por {nome} em {data}" nas telas de edição (RN43) e filtro por responsável no T09

**Pronto quando:** os itens entregues seguem a Definição de pronto; o que não coube fica anotado no Painel como "depois da entrega".

## Etapa 14 · Produção

**Objetivo:** o site no endereço definitivo, com login, deploy automático e backup.

**Entregas:**
- DNS de `sospatas.org.br` no Cloudflare; Pages em `sospatas.org.br`; Worker na rota `sospatas.org.br/api/*`; bucket público em `fotos.sospatas.org.br`
- Neon `production` com migrations e `seed_conteudo.sql`; fotos da história enviadas ao R2 em `site/historia/{id}.webp` com os ids do seed (script pronto desde a etapa 6: `pnpm db:fotos-historia -- --remoto`)
- **Cloudflare Access:** aplicação protegendo `/admin/*` e `/api/admin/*`, política com os e-mails da equipe, código por e-mail, sessão de 30 dias, página de login com logo e cores (T08); linhas em `equipe`
- Turnstile (site key no front, segredo na API) e Web Analytics
- **Email Routing** em `sospatas.org.br` com `sitesospatas@gmail.com` verificado como destino; testar o "Fale com a ONG" (`/contato`, RN51) com um envio real (formulário pronto desde 09/10/2026; ARQUITETURA.md, seção 9)
- `deploy.yml` (migrations → `wrangler deploy` → Pages) e `backup.yml` (dump diário → `sospatas-backups`, 30 dias)
- `apps/web/public/_headers` com CSP e cabeçalhos de segurança (ARQUITETURA.md, seção 9)
- Usuário do banco só com DML para a API e outro para migrations (ARQUITETURA.md, seção 5)
- **Teste de restauração** do backup num banco vazio, documentado no README

**Pronto quando:** login funciona com um e-mail da equipe e é recusado para um e-mail de fora; um merge na `main` publica sozinho; existe ao menos um backup restaurado com sucesso; uma mensagem do "Fale com a ONG" chega no Gmail da ONG e a resposta volta para quem escreveu.

## Etapa 15 · Dados reais, teste com a ONG e ajustes finais

**Entregas:**
- Conferir que a produção não tem dados de exemplo (só o `seed_conteudo.sql` vai para lá); Gracia ou Claudia cadastram os primeiros animais reais pelo celular (tarefa 7 do roteiro)
- Revisão em 360 px de todas as telas, acessibilidade básica (contraste, `alt`, toque ≥ 44 px), Lighthouse do Início e da vitrine
- Correções do teste com a ONG, registradas em TELAS.md ("Registro da validação")
- Status das telas em TELAS.md atualizado; prints regerados se o protótipo mudou
- Documentação final para quem manter o site: README (rodar, publicar, restaurar backup, incluir/remover usuária no Access e em `equipe`)

**Pronto quando:** site no ar em `sospatas.org.br` com animais reais, testado pela equipe da ONG, até **30/10/2026**.

---

## Depois da entrega (não planejado em etapas)

Itens de "Fora do MVP" (DESENVOLVIMENTO.md, seção 4), na ordem provável: página "Finais felizes", PWA, gestão de contas pelo site. (Os pedidos de adoção entraram no MVP em 08/10/2026: etapa 10b.)
