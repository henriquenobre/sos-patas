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

Sem o `.dev.vars`, a API roda como se fosse produção. Páginas prontas: Início, vitrine (com filtros na URL), ficha do animal, Como adotar, Perguntas frequentes, Como ajudar e Privacidade. O formulário de adoção ("Quero adotar") e os perdidos mostram "Em breve" até as etapas 10b e 11.

**Testar no celular:** com o computador e o celular na mesma rede Wi-Fi, rode `pnpm dev:celular` em vez de `pnpm dev`. O Vite mostra um endereço como `http://192.168.0.10:5173` ("Network"): abra esse endereço no celular. Na primeira vez, o Windows pode pedir para liberar o Node no firewall (permitir só em redes privadas).

**Área da ONG no computador:** sem Cloudflare Access, a API trata as chamadas de `/api/admin` como vindas de `teste@sospatas.local` (modo local do `.dev.vars`, usuária criada pelo `pnpm db:seed`). Para testar: `http://localhost:8787/api/admin/eu`.

**Variável nova na API:** acrescentar em `apps/api/.dev.vars.example` (os tipos do `env` são gerados dele) e no `.dev.vars`.

| Comando | O que faz |
|---|---|
| `pnpm dev` | Front (Vite) e API (`wrangler dev`) juntos; o Vite repassa `/api` para a API |
| `pnpm dev:celular` | Igual ao `dev`, mas o site também abre pelo IP do computador na rede (para testar no celular) |
| `pnpm db:fotos-exemplo` | Só no computador: fotos do protótipo para os animais e anúncios de exemplo (R2 local + tabelas `fotos` e `perdidos_fotos`). O `db:seed` apaga as fotos; rode de novo depois dele |
| `pnpm db:fotos-historia` | Converte as fotos da história para WebP (completa e miniatura, sem metadados) e envia ao R2 local; `-- --remoto` envia ao R2 de verdade (etapa 14) |
| `pnpm test` | Testes (Vitest) de todos os pacotes |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | ESLint, TypeScript e Prettier |
| `pnpm build` | Build do front e simulação do deploy da API |
| `pnpm db:up` · `pnpm db:down` · `pnpm db:reset` | Sobe, para ou recria do zero o Postgres local (depois do reset: `db:migrate` e `db:seed`) |
| `pnpm db:gerar` | Gera a migration depois de mudar `db/schema.ts` |
| `pnpm db:migrate` · `pnpm db:seed` | Aplica as migrations; aplica o conteúdo inicial e os dados de exemplo (com `--conteudo`, só o conteúdo) |
| `pnpm -C apps/api dev:node` | API em Node puro, sem Cloudflare (teste de portabilidade) |

> No protótipo, todos os animais são exemplos fictícios: nenhum está de fato para adoção, e as fotos são apenas ilustrativas. A história e as fotos institucionais da página inicial foram enviadas pela ONG.
