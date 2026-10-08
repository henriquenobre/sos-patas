# Linha do tempo: Site SOS Patas

> Datas **reais** do projeto, da primeira conversa com a ONG até a entrega, para saber quanto tempo levou cada parte.
> As datas **planejadas** ficam no [PLANO_DESENVOLVIMENTO.md](PLANO_DESENVOLVIMENTO.md) (desenvolvimento) e no roteiro do PROJETO.md (projeto acadêmico). Regra de registro: RP04 no [CLAUDE.md](../CLAUDE.md).
>
> **Duração** = dias corridos, contando o primeiro e o último dia. Fonte: **Git** (horário do commit), **relato** (informado pelo estudante) ou **doc** (data escrita nos documentos do projeto).

## Resumo por fase

| # | Fase | Início | Fim | Duração | Status |
|---|---|---|---|---|---|
| 1 | Concepção e primeiro contato com a ONG | 05/10/2026 (manhã) | 05/10/2026 | 1 dia | ✅ |
| 2 | Diagnóstico: entrevistas e respostas da ONG | 05/10/2026 | 07/10/2026 | 3 dias | ✅ |
| 3 | Protótipo e especificação das telas | 06/10/2026 | 07/10/2026 | 2 dias | ✅ |
| 4 | Validação do protótipo com a ONG | 07/10/2026 | – | – | 🔄 |
| 5 | Arquitetura e plano de desenvolvimento | 07/10/2026 | 08/10/2026 | 2 dias | ✅ |
| 6 | Preparação do ambiente (contas, domínio, ferramentas): etapa 0 do plano | 08/10/2026 | – | – | 🔄 |
| 7 | Desenvolvimento do site: etapas 1 a 13 do plano | 08/10/2026 | – | – | 🔄 |
| 8 | Produção, testes com a ONG e ajustes: etapas 14 e 15 do plano | – | – | – | ⬜ |
| 9 | Treinamento, divulgação e avaliação (roteiro do PROJETO.md) | – | – | – | ⬜ |
| 10 | Entrega do trabalho (prazo 11/11/2026) | – | – | – | ⬜ |

As fases se sobrepõem: o ambiente começou a ser preparado enquanto a ONG ainda validava o protótipo.

## Etapas do desenvolvimento

Uma linha por etapa do [PLANO_DESENVOLVIMENTO.md](PLANO_DESENVOLVIMENTO.md). Preencher **Início** quando a etapa começar e **Conclusão** quando ela ficar pronta.

| # | Etapa | Início | Conclusão | Duração | Observações |
|---|---|---|---|---|---|
| 0 | Contas e serviços | 08/10/2026 | | | Domínio pendente no Registro.br; R2 a ativar |
| 1 | Fundação do monorepo | 08/10/2026 | 08/10/2026 | 1 dia | CI verde no GitHub depois de corrigir os tipos do Worker (`--strict-vars=false`) |
| 2 | Banco: schema, migrations e seed | 08/10/2026 | 08/10/2026 | 1 dia | 10 tabelas, 2 migrations, seed e 25 testes de banco |
| 3 | Pacote compartilhado | 08/10/2026 | 08/10/2026 | 1 dia | Schemas zod, funções de idade, datas e WhatsApp; 61 testes |
| 4 | Base da API | 08/10/2026 | 08/10/2026 | 1 dia | Erros, validação, login (Access + modo local), armazenamento, cache; 35 testes da API |
| 5 | API pública de leitura | 08/10/2026 | 08/10/2026 | 1 dia | 6 rotas com cache; 33 testes novos, inclusive de vazamento de dados internos |
| 6 | Site público: layout e páginas de conteúdo | 08/10/2026 | 08/10/2026 | 1 dia | 5 páginas iguais ao protótipo, conferidas em 360 px e no computador; 16 testes do front |
| 7 | Site público: vitrine e ficha do animal | | | | |
| 8 | Deploy de prévia no Cloudflare | | | | |
| 9 | API da ONG: animais, fotos, adoção, protetores | | | | |
| 10 | Área da ONG: estrutura e animais | | | | |
| 10b | Pedidos de adoção | | | | Entrou no MVP em 08/10/2026 |
| 11 | Perdidos e encontrados | | | | |
| 12 | Editor de textos | | | | |
| 13 | Mais: dados da ONG, anúncio pela equipe, protetores | | | | |
| 14 | Produção | | | | |
| 15 | Dados reais, teste com a ONG e ajustes finais | | | | |

## Diário

Os fatos em ordem, com a fonte. Acrescentar uma linha a cada marco (fim de etapa, resposta da ONG, publicação).

| Data | Hora | Fase | O que aconteceu | Fonte |
|---|---|---|---|---|
| seg 05/10/2026 | manhã | 1 | Primeira mensagem para a Gracia apresentando a ideia do site | relato |
| 05/10/2026 | manhã | 2 | Entrevista 1 com a Gracia, na mesma conversa da primeira mensagem: dificuldade de controlar e informar os animais disponíveis; ONG sem sede, animais em lares temporários | relato + doc (PROJETO.md) |
| ter 06/10/2026 | | 2 | Mensagem no grupo da ONG; respostas da Gracia por WhatsApp no mesmo dia (Entrevista 2) | relato |
| 06/10/2026 | | 2 | Regras definidas com a ONG: formulário de interesse em vez de WhatsApp direto, sem código de adoção, 15 dias de adaptação, sem promessa de castração | doc (DESENVOLVIMENTO.md) |
| 06/10/2026 | 14:14 | 3 | Primeira versão do protótipo das telas | Git |
| 06/10/2026 | 14:56 | 3 | Fotos dos animais e seção Perdidos e encontrados | Git |
| 06/10/2026 | 18:10 | 3 | Formulário de interesse em adoção (v1) | Git |
| qua 07/10/2026 | | 2 | Entrevista 3: história da ONG, marcos, números e fotos enviados no grupo; pedidos sobre resgates, taxa e clínicas | doc (PROJETO.md) |
| 07/10/2026 | 12:29 | 3 | Telas da área da ONG | Git |
| 07/10/2026 | | 5 | Arquitetura "caminho B" decidida (Cloudflare + Hono + Neon + R2 + Access) | doc (DESENVOLVIMENTO.md) |
| 07/10/2026 | 17:58 | 3 | Página inicial institucional | Git |
| 07/10/2026 | 18:21 | 3 | Ajustes visuais; **protótipo finalizado** e em validação pela ONG | Git + relato |
| qui 08/10/2026 | 09:32 | 5 | ARQUITETURA.md e PLANO_DESENVOLVIMENTO.md | Git |
| 08/10/2026 | | 6 | Gmail `sitesospatas@gmail.com` criado para as contas do site | relato |
| 08/10/2026 | 10:11 | 6 | Pedido do domínio `sospatas.org.br` no Registro.br (ticket 32358834, registro pendente) | relato (print do painel) |
| 08/10/2026 | | 6 | Conta no Cloudflare com verificação em duas etapas, mantenedor como administrador e Zero Trust (time `sospatas`) | relato |
| 08/10/2026 | 12:10 | 6 | Projeto `sospatas` no Neon: São Paulo, PostgreSQL 18, branch `production` | relato (print do painel) |
| 08/10/2026 | | 6 | Ferramentas locais prontas: Node 24.21, pnpm 12.10 e Docker Desktop 29 | relato |
| 08/10/2026 | 12:25 | 7 | **Etapa 1 concluída:** monorepo (web, api, compartilhado), Postgres 18 no Docker, CI; front mostra "API no ar (local)" | doc (verificação local) |
| 08/10/2026 | | 7 | Código publicado no GitHub (`main`) e criada a branch `develop` (testes); CI verde nas duas | Git |
| 08/10/2026 | 14:50 | 7 | **Etapa 2 concluída:** schema, migrations, seed de conteúdo e de exemplo, testes de constraints; API lendo o banco pelo Hyperdrive local | doc (verificação local) |
| 08/10/2026 | 15:20 | 7 | **Etapa 3 concluída:** schemas zod e funções de regra no `packages/compartilhado` | doc (verificação local) |
| 08/10/2026 | | 6 | R2 ativado no Cloudflare (cartão pessoal do mantenedor); análise de risco de cobrança registrada | relato + doc (ARQUITETURA.md, 11.1) |
| 08/10/2026 | 16:00 | 7 | **Etapa 4 concluída:** base da API, conferida também no `wrangler dev` (login local e R2 simulado) | doc (verificação local) |
| 08/10/2026 | 16:35 | 7 | **Etapa 5 concluída:** API pública de leitura, conferida no `wrangler dev` com o seed | doc (verificação local) |
| 08/10/2026 | 17:15 | 7 | **Etapa 6 concluída:** primeiras páginas do site funcionando no computador, com os dados do banco local | doc (verificação local) |
| 08/10/2026 | | 7 | Decisão: pedidos de adoção entram no MVP (formulário com o termo, análise pela equipe, animal fora do site durante a análise); nova etapa 10b no plano | relato |
