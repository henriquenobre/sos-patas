# Regras do projeto: SOS Patas

> Regras de trabalho que valem para **toda alteração** neste repositório, feita por pessoa ou por IA.
> Este arquivo é lido automaticamente pelo Claude Code no início de cada conversa.
> Regras de negócio do site (RN) ficam no [DESENVOLVIMENTO.md](docs/DESENVOLVIMENTO.md), seção 6; aqui ficam as regras de **como** o projeto é mantido (RP).
> Para acrescentar uma regra: próximo número livre, título curto, "Por quê" e "Como aplicar".

## Onde está cada coisa

O repositório tem três partes: **aplicação** (código do site), **documentação** (`docs/`) e **protótipo** (`prototipo/`). O que é só local fica em `privado/`, fora do Git.

| Onde | O que é |
|---|---|
| **Documentação** | |
| [docs/DESENVOLVIMENTO.md](docs/DESENVOLVIMENTO.md) | Fonte de verdade técnica: escopo, modelo de dados, regras de negócio (RN), registro de decisões |
| [docs/ARQUITETURA.md](docs/ARQUITETURA.md) | Como o site é construído e hospedado: Cloudflare Pages + Workers (Hono) + Neon + R2 + Access, API, deploy, backup e migração para VPS |
| [docs/PLANO_DESENVOLVIMENTO.md](docs/PLANO_DESENVOLVIMENTO.md) | Ordem de construção do site em etapas (0 a 15), com o que conta como pronto e o painel de status |
| [docs/LINHA_DO_TEMPO.md](docs/LINHA_DO_TEMPO.md) | Datas reais de cada fase e etapa, da concepção à entrega (RP04) |
| [docs/formulario/](docs/formulario/) | Formulário de interesse em adoção e termo de adoção (`gerar_pdf.py` gera os PDFs) |
| **Protótipo** | |
| [prototipo/TELAS.md](prototipo/TELAS.md) | Especificação de cada tela (T01…), componentes, identidade visual, perguntas para a ONG |
| [prototipo/index.html](prototipo/index.html) | Protótipo navegável, validado com a ONG. **Congelado desde 09/10/2026**: não é mais atualizado |
| [prototipo/gerar_prints.py](prototipo/gerar_prints.py) | Gera os prints de [prototipo/telas/](prototipo/telas/) |
| **Aplicação** | |
| `apps/web`, `apps/api`, `packages/compartilhado`, `db/` | Código do site (front, API, código compartilhado, banco). Como rodar: [README.md](README.md) |
| **Só local (`privado/`, fora do Git)** | |
| `privado/projeto/` | Projeto acadêmico: [PROJETO.md](privado/projeto/PROJETO.md) (entrevistas e respostas da ONG, roteiro, formulários da faculdade) e os PDFs da pesquisa |
| `privado/fotos/` | Fotos originais recebidas da ONG |
| `privado/dados-sensiveis/` | Senhas, acessos e outros dados que não podem ir para o GitHub. Nunca copiar o conteúdo para outro arquivo do projeto |

Em caso de conflito: **DESENVOLVIMENTO.md e ARQUITETURA.md > TELAS.md > site (`apps/web`) > protótipo**. O protótipo está **congelado desde 09/10/2026**: não é mais atualizado e fica só como registro do que foi validado com a ONG.

## RP01 – Toda alteração vai para o protótipo, o projeto e a documentação

Nenhuma mudança fica só em um lugar. Ao alterar uma regra, uma tela, um texto do site ou um dado da ONG, atualizar **na mesma tarefa** tudo o que é afetado:

| Se mudou… | Atualizar |
|---|---|
| Regra de negócio, dado, rota ou escopo | `DESENVOLVIMENTO.md` (seção correspondente **e** uma linha no Registro de decisões, com data e motivo) |
| Infraestrutura, rota da API, serviço, segredo, deploy ou backup | `ARQUITETURA.md` (e decisão registrada no `DESENVOLVIMENTO.md`) |
| Tela, componente, texto ou visual | O código do site (`apps/web`) **e** `prototipo/TELAS.md` (descrição da tela; status ✏️ se precisar revalidar). O protótipo não é mais atualizado (congelado em 09/10/2026) |
| Tela nova ou removida | Também as rotas em `apps/web/src/rotas.tsx` e a tabela de rotas do `DESENVOLVIMENTO.md` (seção 4) |
| Informação vinda da ONG | `privado/projeto/PROJETO.md` (registrar a resposta como recebida, sem reescrever) e responder/riscar a pergunta em `TELAS.md` → "Perguntas para a validação" |
| Textos e conteúdos iniciais do site | `db/seed/seed_conteudo.sql` (o protótipo não é mais atualizado) |
| Estrutura de pastas ou arquivos | Tabela acima, `docs/ARQUITETURA.md` (seção 2) e `README.md` |
| Banco de dados | `db/schema.ts` + migration nova com `pnpm db:gerar` (nunca alterar produção à mão nem editar migration já aplicada) + modelo de dados no `DESENVOLVIMENTO.md`. Limite de campo muda em `packages/compartilhado` |
| Código do site (`apps/`, `packages/`, `db/`) | O protótipo e a documentação continuam valendo como especificação: se o código divergir, atualizar os dois lados |

**Por quê:** o site será desenvolvido com apoio de IA a partir da documentação (premissa P5) e mantido depois da entrega por voluntárias sem conhecimento técnico. Documento desatualizado vira código errado.

**Como aplicar:** antes de encerrar a tarefa, conferir a tabela acima; procurar (busca no projeto) referências ao que mudou, por exemplo nomes de tabela, rota, chave ou tela, e corrigir todas. Se a nova informação **contradiz** uma regra ou um texto existente, não sobrescrever em silêncio: registrar a decisão e avisar quem pediu.

## RP02 – Não inventar informações da ONG

Textos públicos (história, números, nomes, parceiros, contatos) só com informação dada pela ONG. Enquanto não houver, usar texto marcado como **[Exemplo]** e registrar a pergunta em `TELAS.md`.

**Por quê:** o site fala em nome da ONG; informação errada prejudica a confiança e pode gerar problema legal.

## RP03 – Fotos: original fora do Git, versão otimizada no projeto

Originais ficam em `privado/fotos/` (fora do Git). No projeto entram só versões reduzidas (até 1200 px, sem metadados/GPS) em `prototipo/assets/` e, no site, `apps/web/public/` ou no R2. Fotos com **pessoas identificáveis** só são publicadas com autorização da ONG; crianças e adolescentes, só com autorização dos responsáveis (RN38).

**Por quê:** fotos originais pesam e podem conter localização; LGPD e ECA protegem a imagem das pessoas.

## RP04 – Registrar a data de cada etapa concluída

Toda fase do projeto ou etapa do [PLANO_DESENVOLVIMENTO.md](docs/PLANO_DESENVOLVIMENTO.md) que começa ou termina ganha a data real no [LINHA_DO_TEMPO.md](docs/LINHA_DO_TEMPO.md): **Início** e **Conclusão** na tabela correspondente, duração em dias corridos e uma linha no **Diário** com a fonte (Git, relato ou doc).

**Por quê:** o estudante precisa saber quanto tempo levou cada parte (contato com a ONG, protótipo, ambiente, desenvolvimento) para o relatório do projeto e para planejar trabalhos futuros.

**Como aplicar:** ao concluir uma etapa, além de marcar ✅ no painel do plano, preencher a linha da etapa e o Diário. Usar a data do dia em que a etapa ficou pronta (não a do commit seguinte). Se uma data não for conhecida com certeza, escrever "_(a confirmar)_" e perguntar a quem pediu, em vez de estimar em silêncio. Marcos fora do código (resposta da ONG, domínio aprovado, reunião) também entram no Diário.

## RP05 – Git só quando o mantenedor pedir

A IA **não faz commit, merge nem push** por conta própria, em nenhuma branch, e **nunca leva nada para a `develop` ou a `main`**. Pode criar uma branch local de trabalho e deixar as alterações prontas; ao terminar, avisa o que mudou e espera o pedido. Quem decide quando e como as alterações sobem para o Git e o GitHub é o mantenedor.

**Por quê:** o mantenedor quer revisar cada alteração e controlar o que entra na `develop` (testes) e na `main` (produção).

**Como aplicar:** só rodar `git commit`, `git merge`, `git push` ou abrir PR quando o pedido for explícito na conversa, e só para o que foi pedido (um pedido de commit não autoriza push). Autorização dada numa tarefa não vale para a seguinte.
