# Linha do tempo: Site SOS Patas

> Datas **reais** do projeto, da primeira conversa com a ONG até a entrega, para saber quanto tempo levou cada parte.
> As datas **planejadas** ficam no [PLANO_DESENVOLVIMENTO.md](PLANO_DESENVOLVIMENTO.md) (desenvolvimento) e no roteiro do PROJETO.md (projeto acadêmico). Regra de registro: RP04 no [CLAUDE.md](../CLAUDE.md).
>
> **Duração** = dias úteis, contando o primeiro e o último dia: segunda a sexta, sem feriados (não se trabalha no projeto nesses dias; decidido em 14/10/2026). Feriados no período: 12/10/2026 (Nossa Senhora Aparecida); próximos: 02/11 (Finados) e 20/11 (Consciência Negra). Fonte: **Git** (horário do commit), **relato** (informado pelo estudante) ou **doc** (data escrita nos documentos do projeto).

## Resumo por fase

| # | Fase | Início | Fim | Duração | Status |
|---|---|---|---|---|---|
| 1 | Concepção e primeiro contato com a ONG | 05/10/2026 (manhã) | 05/10/2026 | 1 dia | ✅ |
| 2 | Diagnóstico: entrevistas e respostas da ONG | 05/10/2026 | 07/10/2026 | 3 dias | ✅ |
| 3 | Protótipo e especificação das telas | 06/10/2026 | 07/10/2026 | 2 dias | ✅ |
| 4 | Validação do protótipo com a ONG | 07/10/2026 | 08/10/2026 | 2 dias | ✅ |
| 5 | Arquitetura e plano de desenvolvimento | 07/10/2026 | 08/10/2026 | 2 dias | ✅ |
| 6 | Preparação do ambiente (contas, domínio, ferramentas): etapa 0 do plano | 08/10/2026 | 14/10/2026 | 4 dias | ✅ |
| 7 | Desenvolvimento do site: etapas 1 a 13 do plano | 08/10/2026 | – | – | 🔄 |
| 8 | Produção, testes com a ONG e ajustes: etapas 14 e 15 do plano | – | – | – | ⬜ |
| 9 | Treinamento, divulgação e avaliação (roteiro do PROJETO.md) | – | – | – | ⬜ |
| 10 | Entrega do trabalho (prazo 11/11/2026) | – | – | – | ⬜ |

As fases se sobrepõem: o ambiente começou a ser preparado (08/10) no mesmo dia em que a ONG terminou de validar o protótipo.

## Etapas do desenvolvimento

Uma linha por etapa do [PLANO_DESENVOLVIMENTO.md](PLANO_DESENVOLVIMENTO.md). Preencher **Início** quando a etapa começar e **Conclusão** quando ela ficar pronta.

| # | Etapa | Início | Conclusão | Duração | Observações |
|---|---|---|---|---|---|
| 0 | Contas e serviços | 08/10/2026 | 14/10/2026 | 4 dias | O domínio definiu a duração: registrado e ativo no Cloudflare em 14/10/2026 (4 dias úteis desde o pedido). Recuperação das contas pelo e-mail da ONG configurada (informado em 14/10). E-mails da equipe passaram para a etapa 15 |
| 1 | Fundação do monorepo | 08/10/2026 | 08/10/2026 | 1 dia | CI verde no GitHub depois de corrigir os tipos do Worker (`--strict-vars=false`) |
| 2 | Banco: schema, migrations e seed | 08/10/2026 | 08/10/2026 | 1 dia | 10 tabelas, 2 migrations, seed e 25 testes de banco |
| 3 | Pacote compartilhado | 08/10/2026 | 08/10/2026 | 1 dia | Schemas zod, funções de idade, datas e WhatsApp; 61 testes |
| 4 | Base da API | 08/10/2026 | 08/10/2026 | 1 dia | Erros, validação, login (Access + modo local), armazenamento, cache; 35 testes da API |
| 5 | API pública de leitura | 08/10/2026 | 08/10/2026 | 1 dia | 6 rotas com cache; 33 testes novos, inclusive de vazamento de dados internos |
| 6 | Site público: layout e páginas de conteúdo | 08/10/2026 | 08/10/2026 | 1 dia | 5 páginas iguais ao protótipo, conferidas em 360 px e no computador; 16 testes do front |
| 7 | Site público: vitrine e ficha do animal | 08/10/2026 | 08/10/2026 | 1 dia | Filtros na URL, ficha completa, fotos de exemplo no computador; 11 testes novos do front |
| 8 | Deploy de prévia no Cloudflare | 09/10/2026 | 09/10/2026 | 1 dia | sospatas.pages.dev + Worker de prévia; CPU de 12 a 41 ms em instância nova (teto de 10 ms) |
| 9 | API da ONG: animais, fotos, adoção, protetores | 09/10/2026 | 09/10/2026 | 1 dia | 44 testes novos (139 na API); trocar foto e devolução definidas |
| 10 | Área da ONG: estrutura e animais | 13/10/2026 | 13/10/2026 | 1 dia | Telas T09–T11 com testes do front; testada pelo celular na rede local, com 6 ajustes visuais |
| 10b | Pedidos de adoção | 09/10/2026 | 13/10/2026 | 2 dias | Entrou no MVP em 08/10/2026. Banco, API e formulário em 09/10; T27/T28 em 13/10; teste de ponta a ponta pelo celular |
| 11 | Perdidos e encontrados | 13/10/2026 | 14/10/2026 | 2 dias | API, telas T12–T14 e limpeza diária com testes em 13/10; ajustes e merge na `develop` em 14/10 |
| 12 | Editor de textos | 14/10/2026 | 14/10/2026 | 1 dia | API, telas T15–T20 e testes; conferida pelo celular |
| 13 | Mais: dados da ONG, anúncio pela equipe, protetores | 14/10/2026 | 14/10/2026 | 1 dia | Telas T21–T24 e "Alterado por", com testes; na `develop` pelo PR #14. Conferência pelo celular _(a confirmar)_ |
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
| 08/10/2026 | | 4 | **Validação do protótipo com a ONG finalizada** | relato (13/10) |
| 08/10/2026 | 18:40 | 7 | **Etapa 7 concluída:** vitrine e ficha do animal funcionando no computador, com fotos de exemplo | doc (verificação local) |
| 08/10/2026 | | 4 | **A ONG definiu o fluxo de adoção:** tudo pelo site; formulário combinado → termo para ler e marcar que está ciente (registrado no banco) → análise na área da ONG → se aprovado, a ONG combina com a pessoa onde buscar o animal | relato (09/10) |
| 09/10/2026 | | 7 | Etapa 10b adiantada: pedidos de adoção no banco, na API e no site (formulário + termo), testados de ponta a ponta no navegador; protótipo congelado | doc (verificação local) |
| 09/10/2026 | | 7 | A ONG enviou novas formas de ajudar (mensalistas, apadrinhamento, bazar, Empresa amiga); página Como ajudar atualizada (só texto). A história da página inicial passa a abrir com a foto da equipe em 2016 | relato (09/10) |
| 09/10/2026 | | 7 | Contato da ONG no site passa a ser o e-mail `sitesospatas@gmail.com` (a ONG ainda vai providenciar um WhatsApp próprio); nova página "Fale com a ONG" com formulário, que só funciona em produção (etapa 14) | relato (09/10) |
| 09/10/2026 | | 6 | Alerta de orçamento de US$ 1 criado no Cloudflare (Billing → Budget alerts) | relato |
| 09/10/2026 | | 6 | Compute do Neon de produção fixo em 0,25 CU | relato |
| 09/10/2026 | 11:50 | 7 | **Etapa 8 iniciada:** criado o projeto `sospatas-previa` no Neon (São Paulo, PostgreSQL 18, 0,25 CU), separado da produção | relato + painel do Neon |
| 09/10/2026 | | 7 | Prévia: migrations e dados de exemplo no Neon `sospatas-previa`, Hyperdrive e buckets `-previa` criados, fotos enviadas ao R2 de verdade pela primeira vez | doc (verificação) |
| 09/10/2026 | | 7 | **Etapa 8 concluída:** site no ar pela primeira vez, em https://sospatas.pages.dev, com a API da prévia, dados de exemplo e fotos; Neon frio 0,87 s; CPU perto do teto em instância nova | doc (verificação no navegador e `wrangler tail`) |
| 09/10/2026 | | 7 | **Etapa 9 concluída:** API da área da ONG para animais, adoção e devolução, fotos e protetores, com testes do "Pronto quando" e conferência no `wrangler dev` | doc (verificação local) |
| 13/10/2026 | | 4 | Pedido da ONG registrado: imprimir o formulário de adoção já preenchido; atendido no mesmo dia na T28 (data do pedido da ONG _(a confirmar)_) | relato |
| 13/10/2026 | | 6 | Registro.br pediu documentos para o `.org.br`; cartão CNPJ e estatuto enviados para `doc@registro.br` (ticket 32358834); análise em cerca de 2 dias úteis | relato |
| ter 13/10/2026 | | 7 | **Etapa 10 iniciada** (com o restante da 10b): telas da área da ONG para animais (T09–T11) e pedidos de adoção (T27, T28), testadas com a API simulada; falta o teste pelo celular | doc (testes do front) |
| 13/10/2026 | | 7 | **Etapas 10 e 10b concluídas:** teste pelo celular na rede local (cadastro com 3 fotos, edição, adoção, devolução, exclusão e pedido de ponta a ponta); 6 ajustes visuais corrigidos na `develop` | relato + doc (prints em 384 px) |
| 13/10/2026 | | 7 | **Etapa 11 iniciada** (branch `etapa-11-perdidos`): envio público com fotos na quarentena, moderação, renovação e limpeza diária; telas T12, T13, T13b e T14, testadas e conferidas no navegador com a API local | doc (testes e verificação local) |
| qua 14/10/2026 | | 6 | **Domínio `sospatas.org.br` registrado:** Registro.br aceitou os documentos, anuidade paga, status "Publicado", vence em 14/10/2027 (4 dias úteis desde o pedido de 08/10) | relato (print do painel) |
| 14/10/2026 | 10:38 | 7 | **Etapa 11 concluída:** perdidos e encontrados na `develop` (PR #11; correções no PR #12 às 11:14), com o campo de data em dd/mm/aaaa e a folga de tempo nos testes do CI | Git |
| 14/10/2026 | 11:09 | 6 | Zona `sospatas.org.br` criada no Cloudflare (plano Free) e servidores DNS trocados no Registro.br para `jimmy.ns.cloudflare.com` e `melina.ns.cloudflare.com`; o Registro.br avisa que a troca pode levar algumas horas | relato (e-mail do Registro.br) |
| 14/10/2026 | | 6 | E-mail pessoal do mantenedor convidado no Neon e verificação em duas etapas configurada (informado em 14/10; data exata _(a confirmar)_) | relato |
| 14/10/2026 | | 7 | Decisão: os acessos da equipe à área da ONG são criados no treinamento, na etapa 15; até lá o Access de produção só tem o e-mail do mantenedor | relato |
| 14/10/2026 | | 7 | **Etapa 12 iniciada** (branch `etapa-12-editor-textos`): editor de textos da área da ONG (T15–T20) | Git |
| 14/10/2026 | | 7 | Etapa 12: API do editor (textos, itens, ordem e fotos da história) e telas T15–T20 com testes, conferida no `wrangler dev`; falta conferir pelo celular | doc (testes e verificação local) |
| 14/10/2026 | 11:42 | 7 | **Etapa 12 concluída:** editor de textos testado pelo celular e na `develop` (PR #13) | relato + Git |
| 14/10/2026 | | 7 | **Etapa 13 iniciada** (branch `etapa-13-mais`): Dados da ONG (T22, T23), anúncio pela equipe (T21), protetores (T24) e "Alterado por", com testes e conferidos no `wrangler dev`; falta conferir pelo celular | doc (testes e verificação local) |
| 14/10/2026 | | 6 | **Domínio ativo no Cloudflare:** `sospatas.org.br` com status Active; o DNS do `.br` já responde com os servidores do Cloudflare | relato (print do painel) + doc (consulta de DNS) |
| 14/10/2026 | | 6 | **Etapa 0 concluída** (fase 6, preparação do ambiente): contas, domínio ativo no Cloudflare e ferramentas | relato |
| 14/10/2026 | 14:25 | 7 | **Etapa 13 concluída:** dados da ONG, anúncio pela equipe, protetores e "Alterado por" na `develop` (PR #14) | Git |
| 14/10/2026 | | – | Durações passam a contar só **dias úteis** (sem fim de semana e sem o feriado de 12/10), porque não houve trabalho nesses dias; durações anteriores recalculadas | relato |
