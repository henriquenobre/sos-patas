# Guia de Desenvolvimento: Site de Adoção SOS Patas

> Documento de referência para construir o site. Reúne as premissas, as tecnologias, o modelo de dados e as regras de negócio já definidas.
> **Toda nova definição entra na seção 9 (Registro de decisões)** e, se mudar alguma regra, atualiza a seção correspondente.
>
> Contexto do projeto acadêmico, entrevistas e formulários: [PROJETO.md](../privado/projeto/PROJETO.md).
> **Regras de manutenção do projeto** (o que atualizar a cada alteração): [CLAUDE.md](../CLAUDE.md).
> **Telas (protótipo validado com a ONG):** [prototipo/TELAS.md](../prototipo/TELAS.md) · protótipo navegável em [prototipo/index.html](../prototipo/index.html).
> **Arquitetura e hospedagem** (front, API, banco, fotos, login, deploy e backup): [ARQUITETURA.md](ARQUITETURA.md).
> **Ordem de construção** (etapas 0 a 15 e painel de status): [PLANO_DESENVOLVIMENTO.md](PLANO_DESENVOLVIMENTO.md).

---

## 1. Objetivo

Site para a ONG SOS Patas (Passos/MG) **mostrar os animais disponíveis para adoção** e **controlar internamente** onde cada um está. A ONG não tem sede e mantém os animais em casas de voluntários.

Problemas que o site precisa resolver:
1. A ONG não sabe de forma centralizada quais animais estão disponíveis e em qual lar estão.
2. Quem quer adotar depende de resposta por mensagem, e muitas ficam sem resposta.
3. Os adultos esperam mais de 2 anos e precisam de mais visibilidade que os filhotes.
4. Boa parte das mensagens repete as mesmas dúvidas, que as perguntas frequentes podem responder. _(O site não fala se a ONG faz ou não resgates; ver RN44.)_

## 2. Premissas

| # | Premissa | Impacto no desenvolvimento |
|---|---|---|
| P1 | **Custo fixo zero** para a ONG (só o domínio, R$ 40/ano) | Só serviços com plano gratuito (seção 3). O R2 pede cartão cadastrado mesmo no grátis: **cartão pessoal do mantenedor** (08/10/2026), com alerta de orçamento em US$ 1 ([ARQUITETURA.md](ARQUITETURA.md), seção 11.1) |
| P2 | **Cadastro feito pelo celular** por Gracia e Claudia | Área restrita mobile-first, formulário curto e botões grandes |
| P3 | **Usuárias sem conhecimento técnico** | Nada de painéis técnicos (Cloudflare, Neon) no dia a dia; tudo pela área restrita do site |
| P9 | **Mantido por um voluntário** (React, Node e SQL), começando grátis e podendo crescer | Camadas separadas e código portável (Hono, Postgres padrão, Docker); ver [ARQUITETURA.md](ARQUITETURA.md) |
| P4 | **Prazo: site no ar até 30/10/2026**, trabalho entregue em 11/11/2026 | Escopo MVP enxuto (seção 4); o que não couber vai para "Depois do MVP" |
| P5 | **Desenvolvimento com apoio de IA** (Claude Code) | Este documento é a fonte de verdade para a IA |
| P6 | **LGPD** | Endereço/lar temporário nunca é público; coletar o mínimo de dados pessoais |
| P7 | **Economia de armazenamento e tráfego** | Fotos comprimidas, miniaturas na vitrine, remoção de arquivos ao excluir (seção 6) |
| P8 | **Animais de protetores parceiros** também aparecem | Cada animal tem um responsável (ONG ou protetor) com WhatsApp próprio |

## 3. Tecnologias

Resumo. O detalhamento (diagrama, API, login, deploy, backup e limites) está no [ARQUITETURA.md](ARQUITETURA.md).

| Camada | Tecnologia | Limite gratuito relevante |
|---|---|---|
| Front | React + Vite + TypeScript + Tailwind + React Router + TanStack Query, no **Cloudflare Pages** | Banda ilimitada |
| API | **Hono** (TypeScript) no **Cloudflare Workers** | 100 mil req/dia, 10 ms de CPU por requisição |
| Banco | **Neon** (PostgreSQL), via **Hyperdrive** | 0,5 GB; 100 mil consultas/dia |
| Acesso ao banco | **Drizzle ORM** + driver `postgres`; migrations SQL versionadas | – |
| Fotos | **Cloudflare R2** (bucket público + quarentena privada) | 10 GB, **tráfego grátis** |
| Login da equipe | **Cloudflare Access** (código por e-mail, sem senha) | 50 usuários |
| Validação compartilhada | **zod** (`packages/compartilhado`), usada no front e na API | – |
| Compressão de imagem | `browser-image-compression` + canvas (no navegador) | – |
| Antirrobô | Cloudflare Turnstile | Grátis |
| Tarefas agendadas | Workers Cron Triggers | 5 por conta |
| Estatísticas | Cloudflare Web Analytics | Grátis, sem cookies |
| Código, CI/CD e backup | GitHub + GitHub Actions | Grátis |
| Domínio | `sospatas.org.br` (Registro.br, CNPJ da ONG) | R$ 40/ano |
| Contato | Link `https://wa.me/55DDDNUMERO?text=...` | Grátis |

**Capacidade estimada:** mais de 200 mil animais em texto (0,5 GB); cerca de 25 mil fotos completas nos 10 GB do R2, sem limite de tráfego; folga grande nas 100 mil requisições diárias.

## 4. Escopo do MVP

### Páginas públicas
| Rota | Página | Conteúdo |
|---|---|---|
| `/` | Início (institucional) | Chamada principal, **história da ONG** (texto, foto e marcos), missão e como funcionamos, números, seção **"Esperando há mais tempo"** (adultos), resumo de como adotar, perdidos e PIX. Textos editáveis pela equipe (RN33) |
| `/animais` | Vitrine | Grade de cards (miniatura, nome, idade, porte) com filtros: espécie, porte, idade (filhote/adulto), convive com outros animais |
| `/animais/:id` | Ficha do animal | Fotos completas, todos os campos, responsável e botão **"Quero adotar"** (abre o formulário de adoção). Animal com pedido em análise não aparece na vitrine; pela ficha, mostra só um aviso (RN48) |
| `/animais/:id/adotar` | Formulário de adoção (T26) | Perguntas do [formulário de interesse](formulario/FORMULARIO_ADOCAO.md), **termo de adoção para leitura e ciência** e consentimento LGPD, com Turnstile. O pedido fica salvo para a equipe avaliar (RN14, RN15, RN47–RN50) |
| `/como-adotar` | Como adotar | Passo a passo: formulário de interesse, análise, termo de adoção, adaptação de 15 dias |
| `/perguntas-frequentes` | Perguntas frequentes | Adoção, adaptação, protetores parceiros, como ajudar. **Sem perguntas sobre resgate ou busca de animais** (RN44) |
| `/ajude` | Como ajudar | **PIX** (da tabela `ong`) e formas de ajudar (lar temporário, compartilhar…), editáveis. Substitui a antiga `/sobre`: missão e "como funcionamos" foram para o Início. `/sobre` redireciona para `/ajude` |
| `/privacidade` | Política de privacidade | Texto simples sobre LGPD |
| `/perdidos` | Perdidos e encontrados | Anúncios **aprovados** de animais perdidos/encontrados, filtro por tipo, botão WhatsApp para quem anunciou, aviso contra golpes |
| `/perdidos/novo` | Anunciar | Formulário público com até 2 fotos, consentimento LGPD e Turnstile. Vai para análise, **não publica direto** |

### Área restrita (`/admin`, exige login)

**Princípio:** tudo o que muda com o tempo no site (animais, perdidos, textos das páginas, contatos e PIX) é alterado pela área da ONG, pelo celular, sem mexer no código nem em painéis técnicos (P3). O acesso é protegido pelo Cloudflare Access (código por e-mail; [ARQUITETURA.md](ARQUITETURA.md), seção 4). Telas detalhadas em [prototipo/TELAS.md](../prototipo/TELAS.md).

**Navegação:** barra fixa no rodapé (no celular) com 5 abas: **Animais · Pedidos · Perdidos · Textos · Mais** (a aba Pedidos entrou em 08/10/2026, com o número de pedidos aguardando análise). No computador (≥ 768 px), as mesmas abas ficam no cabeçalho. Telas de formulário escondem a barra e mostram a barra de "Cancelar / Salvar".

| Rota | Tela | Função |
|---|---|---|
| `/admin` (sem sessão) | T08 | Login do Cloudflare Access: e-mail → código de 6 dígitos (sessão de 30 dias) |
| `/admin` | T09 | **Animais:** lista com busca, abas Disponíveis/Em análise/Adotados e filtro por responsável; ações rápidas: editar, marcar adotado |
| `/admin/animais/novo` | T10 | Cadastro (formulário em uma tela, pensado para celular) |
| `/admin/animais/:id` | T11 | Edição, incluindo lar temporário e observações internas; "Ver no site", marcar adotado, excluir |
| `/admin/pedidos` | T27 | **Pedidos de adoção:** pendentes primeiro (com o animal, quem pediu, há quanto tempo e o número de alertas); abas Pendentes/Aprovados/Recusados |
| `/admin/pedidos/:id` | T28 | Análise de um pedido: respostas, **alertas automáticos** em amarelo, WhatsApp de quem pediu, observação interna, **Aprovar** ou **Recusar** (RN49) |
| `/admin/perdidos` | T14 | **Perdidos:** moderação (aprovar/recusar), anúncios no ar (renovar, voltou para casa, tirar do ar) e botão "＋ Novo anúncio" |
| `/admin/perdidos/novo` · `/admin/perdidos/:id` | T21 | Anúncio criado ou corrigido pela equipe (RN39–RN41) |
| `/admin/textos` | T15 | **Textos:** lista das páginas editáveis |
| `/admin/textos/perguntas` | T16 | Perguntas frequentes: adicionar, editar, reordenar, excluir |
| `/admin/textos/como-adotar` | T18 | Como adotar: subtítulo, passos, "antes de adotar", vantagens, aviso de protetores |
| `/admin/textos/inicio` | T19 | Página inicial: chamada, história, marcos, números da história, fotos da história, missão, como funcionamos |
| `/admin/textos/ajude` | T20 | Como ajudar: introdução e formas de ajudar |
| `/admin/textos/:lista/novo` · `/admin/textos/:lista/:id` | T17 | Formulário de um item de lista (pergunta, passo, marco, número, foto com legenda…) |
| `/admin/mais` | T22 | **Mais:** Dados da ONG, Protetores parceiros, Ver o site, Sair |
| `/admin/ong` | T23 | Dados da ONG: WhatsApp, Instagram, Facebook, chave PIX |
| `/admin/protetores` | T24 | Protetores parceiros: lista e cadastro (RN42) |

### Prioridade, se o prazo apertar (desenvolvimento de 13/10 a 23/10)
1. **Obrigatório:** login, animais (T08–T11), **pedidos de adoção** (formulário com o termo e análise, T26–T28, RN47–RN50; entrou no MVP em 08/10/2026), editor de textos genérico (T15–T20, um só componente atende todas as páginas, RN33), perdidos com moderação (T14).
2. **Em seguida:** anúncio pela equipe e renovar (T21, RN39–RN41), Dados da ONG (T23).
3. **Se der tempo:** tela de gestão de protetores (T24), "Alterado por" (RN43), filtro por responsável e "Ver no site". A **tabela** `protetores` entra desde o início (o cadastro do animal já escolhe ou cria o protetor, RN42); só a tela de lista/edição fica para depois.

### Fora do MVP (depois, se der tempo)
- Página "Finais felizes" com animais adotados
- Doações com pagamento integrado / campanhas (no MVP, só a chave PIX é exibida)
- **Gestão de contas pelo site** (convidar/remover usuárias): no MVP, quem mantém o site inclui o e-mail na política do Cloudflare Access e na tabela `equipe`
- Histórico completo de alterações (no MVP, só "Alterado por… em…", RN43)
- PWA (instalar o site como app no celular)

## 5. Modelo de dados

### `animais` (leitura pública)
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `nome` | text | obrigatório |
| `especie` | enum `cao` \| `gato` | obrigatório |
| `sexo` | enum `macho` \| `femea` | obrigatório |
| `nascimento_aprox` | date | obrigatório; a idade é calculada a partir dele |
| `porte` | enum `mini` \| `pequeno` \| `medio` \| `grande` \| `gigante` | obrigatório (mesmas opções do termo) |
| `raca` | text null | opcional, ex.: "SRD (vira-lata)", "Pit Bull" |
| `raca_tipo` | enum `puro` \| `mestico` null | opcional |
| `cor_pelagem` | text null | opcional |
| `castrado` | boolean | obrigatório |
| `vacinado` | enum `sim` \| `nao` \| `sem_informacao` | obrigatório |
| `vacinas` | text null | quais vacinas, ex.: "V10 e antirrábica" |
| `vermifugado` | enum `sim` \| `nao` \| `sem_informacao` | obrigatório; refere-se aos **últimos 3 meses** (como no termo) |
| `problema_saude` | text null | null = sem problema conhecido; se preenchido, aparece em destaque na ficha |
| `docil` | boolean null | null = não informado |
| `convive_animais` | boolean null | null = não informado |
| `descricao` | text | opcional, máx. 500 caracteres |
| `status` | enum `disponivel` \| `em_analise` \| `adotado` | padrão `disponivel`. `em_analise`: tem pedido de adoção pendente ou aprovado e ainda não entregue; fica fora da vitrine (RN48) |
| `data_entrada` | date | padrão hoje; usado em "Esperando há mais tempo" |
| `data_adocao` | date null | preenchido ao marcar como adotado; base do indicador de adoções |
| `responsavel_tipo` | enum `ong` \| `protetor` | padrão `ong` |
| `protetor_id` | uuid null FK → `protetores.id` | `on delete restrict`; **obrigatório se `responsavel_tipo = protetor`, nulo se `ong`** (CHECK). Substitui os antigos `responsavel_nome` e `whatsapp` (RN42): o nome e o WhatsApp vêm de `protetores` ou da tabela `ong` |
| `created_at` / `updated_at` | timestamptz | automáticos |
| `updated_by` | uuid null FK → `equipe.id` | preenchido pela API com a usuária logada (RN43) |

### `fotos` (leitura pública)
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `animal_id` | uuid FK → `animais.id` | `on delete cascade` |
| `ordem` | int | 0 = foto principal |
| `path_miniatura` | text | chave no bucket `sospatas-fotos`, ex.: `animais/{animal_id}/{foto_id}-thumb.webp` |
| `path_completa` | text | ex.: `animais/{animal_id}/{foto_id}.webp`. URL pública: `https://fotos.sospatas.org.br/{path}` |

### `animais_privado` (somente usuárias logadas)
| Coluna | Tipo | Regra |
|---|---|---|
| `animal_id` | uuid PK/FK → `animais.id` | `on delete cascade` |
| `lar_nome` | text | nome do voluntário/lar onde o animal está |
| `lar_tipo` | enum `provisorio` \| `remunerado` | |
| `observacoes` | text | anotações internas |
| `adotante_nome` | text null | preenchido na adoção; usado no acompanhamento (RN30) |
| `adotante_whatsapp` | text null | idem; dado pessoal tratado com base no termo de adoção (LGPD) |

### `perdidos` (anúncios enviados pelo público)
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `tipo` | enum `perdido` \| `encontrado` | obrigatório |
| `especie` | enum `cao` \| `gato` | obrigatório |
| `nome` | text null | opcional (máx. 40) |
| `bairro` | text | obrigatório (máx. 60); **sem endereço completo** |
| `data_ocorrido` | date | obrigatório, não pode ser futura |
| `descricao` | text | obrigatório, máx. 300, **links são rejeitados** |
| `contato_nome` | text | primeiro nome (máx. 30) |
| `contato_whatsapp` | text | só dígitos, 10–11 com DDD |
| `consentimento_em` | timestamptz | momento em que aceitou publicar os dados (no anúncio da equipe: momento em que a equipe registrou a autorização, RN39) |
| `origem` | enum `site` \| `equipe` | padrão `site`; `equipe` = criado pelo painel (RN39) |
| `status` | enum `pendente` \| `publicado` | recusado, resolvido e expirado são **apagados** (não ficam no banco) |
| `publicado_em` | timestamptz null | preenchido na aprovação |
| `expira_em` | timestamptz null | `publicado_em + 30 dias` na aprovação; "Renovar" muda para `hoje + 30 dias` (RN25, RN41) |
| `ip_hash` | text null | hash (SHA-256 + segredo) do IP, só para limitar envios; nunca o IP puro. Nulo quando `origem = equipe` |
| `created_at` / `updated_at` | timestamptz | automáticos |
| `updated_by` | uuid null FK → `equipe.id` | última pessoa da equipe que alterou (RN43) |

### `perdidos_fotos`
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `perdido_id` | uuid FK → `perdidos.id` | `on delete cascade` |
| `path` | text | `perdidos/{perdido_id}/{id}.webp`: no bucket `sospatas-quarentena` enquanto pendente; copiado para `sospatas-fotos` na aprovação (RN19) |

### `pedidos_adocao` (formulário de adoção; somente a equipe)
Definido em 08/10/2026 (RN14, RN15, RN47–RN50). Perguntas e alertas em [formulario/FORMULARIO_ADOCAO.md](formulario/FORMULARIO_ADOCAO.md).

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `animal_id` | uuid FK → `animais.id` | `on delete cascade` (excluir o animal, RN09, apaga os pedidos) |
| `status` | enum `pendente` \| `aprovado` \| `recusado` \| `nao_concluido` | padrão `pendente`. **No máximo um `pendente` por animal** (índice único parcial). `nao_concluido` = aprovado, mas a adoção não aconteceu |
| `nome` | text | nome completo (máx. 100) |
| `whatsapp` | text | só dígitos, 10–11 com DDD |
| `bairro_cidade` | text | só bairro e cidade (máx. 100); **sem endereço completo** (fica no termo em papel) |
| `versao_formulario` | text | ex.: `1.1`; as respostas são lidas com o schema dessa versão |
| `respostas` | jsonb | demais respostas do formulário, validadas na API pelo schema da versão (textos longos: máx. 1000) |
| `termo_ciente_em` | timestamptz | quando a pessoa marcou "Li o termo de adoção e estou ciente" (RN47) |
| `consentimento_em` | timestamptz | quando autorizou o uso dos dados (LGPD) |
| `ip_hash` | text | hash do IP (SHA-256 + segredo), só para o limite de envios (RN50); nunca o IP puro |
| `observacao_equipe` | text | anotação interna de quem analisa (máx. 1000) |
| `analisado_em` · `analisado_por` | timestamptz · uuid FK → `equipe.id` | preenchidos ao aprovar ou recusar |
| `created_at` / `updated_at` / `updated_by` | | RN43 |

### `equipe` (usuárias da área da ONG)
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `email` | text unique | o mesmo e-mail liberado no Cloudflare Access (minúsculas) |
| `nome` | text | primeiro nome exibido: "Olá, Gracia" e "Alterado por Gracia" |
| `ativo` | boolean | padrão `true`; `false` bloqueia na API mesmo que o Access deixe passar |
| `created_at` | timestamptz | automático |

A linha é criada à mão (migration ou SQL) junto com a liberação do e-mail no Access, por quem mantém o site. Não há senha no banco.

### `ong` (dados de contato; uma linha só)
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | smallint PK | `CHECK (id = 1)`: a tabela tem sempre uma única linha |
| `nome_completo` | text | "Sociedade de Proteção aos Animais de Passos/MG" |
| `whatsapp` | text | só dígitos, 10–11 com DDD; WhatsApp padrão da ONG |
| `instagram` | text | usuário sem `@`, ex.: `sospatas.ong` |
| `facebook` | text null | URL completa `https://facebook.com/...` |
| `pix_tipo` | enum `cnpj` \| `cpf` \| `email` \| `telefone` \| `aleatoria` | rótulo exibido ao lado da chave |
| `pix_chave` | text | ex.: `26.515.895/0001-90` |
| `updated_at` / `updated_by` | | RN43 |

Substitui a constante `ONG` do código (seção 7.1). Cabeçalho, rodapé, Início, Como ajudar e perguntas frequentes leem daqui.

### `protetores` (protetores parceiros)
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `nome` | text | obrigatório (máx. 60), ex.: "Protetora Ana Paula" |
| `whatsapp` | text | só dígitos, 10–11 com DDD |
| `created_at` / `updated_at` / `updated_by` | | RN43 |

### `conteudo_textos` (textos únicos das páginas)
| Coluna | Tipo | Regra |
|---|---|---|
| `chave` | text PK | uma das chaves da tabela abaixo (CHECK) |
| `valor` | text | texto simples (RN34); string vazia = bloco escondido no site, se for opcional |
| `updated_at` / `updated_by` | | RN43 |

| Chave | Página | Limite | Obrigatório |
|---|---|---|---|
| `inicio.chamada_titulo` | Início, título grande | 60 | sim |
| `inicio.chamada_texto` | Início, texto da chamada | 200 | sim |
| `inicio.historia` | Início, "Nossa história" | 2000 | sim |
| `inicio.missao` | Início, missão | 400 | sim |
| `inicio.esperando_texto` | Início, texto abaixo de "Esperando há mais tempo" (vantagem de adotar um adulto, sem comparar com filhotes) | 200 | sim |
| `como_adotar.subtitulo` | Como adotar, subtítulo do topo | 100 | sim |
| `como_adotar.aviso_protetor` | Como adotar, card amarelo de protetores (RN31) | 500 | sim |
| `como_adotar.vantagens_rodape` | Como adotar, nota abaixo das vantagens | 200 | não |
| `ajude.introducao` | Como ajudar, texto do topo | 300 | não |

### `conteudo_itens` (listas das páginas)
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `lista` | enum (tabela abaixo) | obrigatório |
| `titulo` | text null | obrigatório ou não, conforme a lista |
| `texto` | text | obrigatório |
| `foto_path` | text null | só na lista `inicio_fotos` (obrigatório nela): `site/historia/{id}.webp` no bucket `sospatas-fotos` (RN38) |
| `ordem` | int | posição na lista, começa em 0 (RN35) |
| `created_at` / `updated_at` / `updated_by` | | RN43 |

| `lista` | Onde aparece | `titulo` (limite) | `texto` (limite) | Mínimo de itens |
|---|---|---|---|---|
| `perguntas` | Perguntas frequentes | Pergunta (150), obrigatório | Resposta (1000) | 1 |
| `como_adotar_passos` | Como adotar (linha do tempo) e resumo no Início | Título do passo (60), obrigatório | Explicação (600) | 1 |
| `como_adotar_antes` | Como adotar, "Antes de adotar, pense em" | – | Item (200) | 0 (bloco some) |
| `como_adotar_vantagens` | Como adotar, "Vantagem de adotar pelo site" | Destaque em negrito (60), opcional | Item (200) | 0 (card some) |
| `inicio_marcos` | Início, linha do tempo da história | Ano ou data (20), obrigatório | O que aconteceu (300) | 0 (bloco some) |
| `inicio_numeros` | Início, faixa de números em destaque logo abaixo da chamada (**máx. 4**, RN46) | Número (20), obrigatório, ex.: "+100" | O que significa (80) | 0 (faixa some) |
| `inicio_fotos` | Início: a 1ª foto abre a história, as demais formam a galeria "Nossa história em fotos" (**máx. 8**) | – | Legenda (120) + `foto_path` | 0 (bloco some) |
| `inicio_como_funcionamos` | Início, "Como funcionamos" | Título (40), obrigatório | Texto (150) | 0 |
| `ajude_formas` | Como ajudar (além do card fixo do PIX) | Título (40), obrigatório | Texto (300) | 0 |

### Limites e garantias no banco (implementado em 08/10/2026, etapa 2)
- **Limites de caracteres** de todos os campos em `packages/compartilhado/src/limites.ts` (tabelas) e `conteudo.ts` (textos e listas). Além dos citados acima: `animais.nome` 40, `raca` 60, `cor_pelagem` 60, `vacinas` 120, `problema_saude` 300; `animais_privado.lar_nome` 80, `observacoes` 1000, `adotante_nome` 80; `equipe.nome` 40; `ong.nome_completo` 120, `instagram` 30, `facebook` 200, `pix_chave` 100. O banco confere com `CHECK` gerado a partir desses arquivos.
- **Campos obrigatórios** não aceitam texto vazio nem só espaços. `animais.descricao` e `animais_privado.observacoes` ficam `''` quando não preenchidos; `lar_nome` e `lar_tipo` podem ficar nulos (o lar não é obrigatório no cadastro, T10).
- **Coerência:** adotado sempre tem `data_adocao` e disponível nunca tem (RN08); anúncio `publicado` sempre tem `publicado_em` e `expira_em`, e `pendente` nunca tem (RN25); anúncio da equipe não tem `ip_hash` (RN39); WhatsApp só com 10 ou 11 dígitos; e-mail da equipe em minúsculas; Instagram sem `@`; Facebook começando com `https://`.
- **Posições:** `fotos.ordem` vai de 0 a 2 (RN01) e cada animal tem uma foto por posição; cada lista de `conteudo_itens` tem um item por posição. As duas unicidades são `DEFERRABLE` (conferidas no fim da transação), para a troca de ordem da RN35.
- **`updated_by`** vira nulo se a linha da equipe for apagada (o normal é desativar com `ativo = false`).
- **Conferido pela API, não pelo banco:** quantidade de itens por lista (mínimo e máximo, RN36, RN38, RN46), fotos por anúncio (RN21), data do ocorrido no futuro e links na descrição.

**Conteúdo inicial (seed):** o arquivo `db/seed/seed_conteudo.sql` cria `ong`, os textos e os itens com os textos atuais do protótipo (`prototipo/index.html`), para o site já estrear preenchido. História, marcos, números e fotos vêm das respostas da ONG de 07/10/2026 (PROJETO.md, Entrevista 3); as fotos estão em `prototipo/assets/historia-1.jpg` a `historia-5.jpg` (a ordem de exibição está em `FOTOS_HISTORIA`, no protótipo; a `historia-1`, da assembleia, é uma versão tratada).

### Segurança e permissões (na API)
A **API é a única porta para o banco e para os arquivos**: o navegador nunca fala direto com o Neon nem com o R2 (exceto para *ler* fotos públicas). Não há RLS; quem decide o que pode é a API ([ARQUITETURA.md](ARQUITETURA.md), seções 3 e 5).

| Dado | Rotas públicas (`/api/publico`) | Rotas da equipe (`/api/admin`, Cloudflare Access + `equipe.ativo`) |
|---|---|---|
| `animais`, `fotos` | Leitura (sem colunas internas) | Tudo |
| `animais_privado` | **Nunca** | Tudo |
| `pedidos_adocao` | **Nunca** leitura; **envio** só por `POST /animais/:id/pedidos` (Turnstile + validação + limites, RN50) | Tudo (ver, aprovar, recusar, anotar) |
| `perdidos`, `perdidos_fotos` | Leitura só de `publicado` não expirado; **envio** só por `POST /perdidos` (Turnstile + validação + limite por IP) | Tudo, incluindo anúncio da equipe sem Turnstile (RN39) |
| `ong`, `conteudo_textos`, `conteudo_itens`, `protetores` | Leitura (do protetor, só nome e WhatsApp) | Escrita; `ong` só UPDATE (linha única) |
| `equipe` | **Nunca** | Só `GET /eu` (a própria usuária). Sem escrita pelo site |
| Bucket `sospatas-fotos` | Leitura pública pelo domínio de fotos | Escrita e remoção pela API |
| Bucket `sospatas-quarentena` | **Nunca** (o envio público grava pela API) | Leitura pela API (rota que transmite a foto para a moderação) |

- **Todas as usuárias têm as mesmas permissões** (sem perfis). Contas = e-mail liberado no Access + linha ativa em `equipe`.
- O WhatsApp do protetor já era público no modelo anterior; na rodada dos pedidos de adoção, avaliar se ainda precisa ser.

## 6. Regras de negócio

### Fotos
- **RN01:** no máximo **3 fotos por animal**. A primeira (`ordem = 0`) é a principal.
- **RN02:** antes do envio, o navegador converte cada foto em **duas versões WebP**:
  - **miniatura:** 400 px na maior dimensão, cerca de 30 KB;
  - **completa:** 1200 px na maior dimensão, cerca de 200 KB.

  Nunca enviar o arquivo original.
- **RN03:** a vitrine e os cards usam **só a miniatura**. A foto completa carrega apenas na ficha do animal.
- **RN04:** os arquivos ficam em `animais/{animal_id}/` no bucket `sospatas-fotos` (R2), um prefixo por animal, para permitir apagar tudo de uma vez.
- **RN05 – Excluir animal remove as fotos do R2.** O `on delete cascade` apaga as linhas da tabela `fotos`, mas **não apaga os arquivos do R2**. Por isso, a exclusão segue esta ordem:
  1. listar e remover todos os objetos com prefixo `animais/{animal_id}/`;
  2. depois, apagar o registro em `animais`; o cascade cuida de `fotos` e `animais_privado`.

  Se o passo 1 falhar, não apagar o registro e devolver erro. Centralizar isso em um único serviço da API (`excluirAnimal`).
- **RN06 – Trocar ou remover uma foto apaga os arquivos antigos** (miniatura e completa) do R2 na mesma operação.
- **RN07 – Ao marcar como adotado, apagar as fotos extras.** Fica só a foto principal (miniatura e completa) para o histórico; as demais são removidas do R2 e da tabela.

### Adoção e exclusão
- **RN08 – Adoção não é exclusão.** Animal adotado recebe `status = adotado` e `data_adocao = hoje`, sai da vitrine e continua no banco. Isso é necessário para medir o indicador de adoções (tarefa 12 do roteiro).
- **RN09 – Excluir é só para erro de cadastro ou falecimento**, e sempre com confirmação na tela ("Tem certeza? Esta ação não pode ser desfeita.").

### Vitrine e destaque
- **RN10:** a vitrine mostra só `status = disponivel`, ordenada por `data_entrada` (mais antigos primeiro).
- **RN11:** **adulto** é quem tem 1 ano ou mais (calculado por `nascimento_aprox`); **filhote** é quem tem menos de 1 ano.
- **RN12 – "Esperando há mais tempo":** adultos disponíveis com `data_entrada` há mais de 90 dias, até 6 na página inicial, os mais antigos primeiro.
- **RN13:** a idade é exibida de forma aproximada: "cerca de 3 meses", "cerca de 2 anos".

### Contato
- **RN14 (alterada em 06/10/2026 e 08/10/2026):** o botão **"Quero adotar"** abre o **formulário de adoção** (`/animais/:id/adotar`, T26), em vez de levar direto ao WhatsApp. A ONG não quer concentrar as entrevistas em uma pessoa: quem tem interesse preenche o formulário, o **pedido fica salvo no sistema** e a equipe avalia na área da ONG (T27, T28) e entra em contato pelo WhatsApp. O botão só aparece para animais `disponivel`. **Desde 08/10/2026, faz parte do MVP** (antes estava fora).
  - **Perguntas do formulário:** [formulario/FORMULARIO_ADOCAO.md](formulario/FORMULARIO_ADOCAO.md), **versão 1.1 usada no site** (decisão do mantenedor em 08/10/2026; ajustes que a ONG pedir entram como nova versão, sem perder os pedidos antigos). Inclui os alertas automáticos para quem analisa. O PDF para o grupo é gerado com `python docs/formulario/gerar_pdf.py`.
  - **Telas:** formulário público T26 e confirmação T26b; lista de pedidos T27 e análise T28 na área da ONG ([TELAS.md](../prototipo/TELAS.md)).
- **RN15 (alterada em 06/10/2026 e 08/10/2026):** o site **coleta e guarda os dados de quem quer adotar** (tabela `pedidos_adocao`). Por isso, o formulário segue as mesmas proteções dos envios públicos (validação na API, Turnstile e limite de envios, RN50), com **consentimento explícito** (LGPD), acesso só para a equipe logada e **prazo de guarda**, aplicado pela tarefa diária: pedidos **recusados** ou **não concluídos** são apagados 90 dias depois da decisão; pedidos **aprovados** são apagados 90 dias depois de o animal ser marcado como adotado (o nome e o WhatsApp de quem adotou ficam em `animais_privado`, RN30). _(Prazo de 90 dias a confirmar com a ONG.)_

### Pedidos de adoção (definido em 08/10/2026)
- **RN47 – Termo de adoção no formulário:** antes de enviar, o formulário mostra o **termo de responsabilidade de adoção** (as cláusulas de [TERMO_ADOCAO.md](formulario/TERMO_ADOCAO.md)), para a pessoa saber o que vai assinar, e exige a confirmação "Li o termo de adoção e estou ciente dos compromissos" (guardada em `termo_ciente_em`). **O termo continua sendo assinado em papel** na entrega do animal; o site não coleta RG, CPF nem endereço completo. O texto do termo fica fixo no código (é o documento da ONG); se a ONG mudar o termo, muda o texto e a versão do formulário.
- **RN48 – Pedido esconde o animal:** ao receber um pedido, o animal passa para `em_analise` na mesma transação e **sai do site**: não aparece na vitrine nem em "Esperando há mais tempo". Quem abrir a ficha por um link antigo vê "{nome} está em processo de adoção" e um convite para conhecer outros animais, sem o botão "Quero adotar" _(proposta; a confirmar)_. Só existe **um pedido pendente por animal**: se duas pessoas enviarem ao mesmo tempo, a segunda recebe "Outra pessoa acabou de pedir para adotar {nome}. Veja outros animais." Como a vitrine fica em cache por até 15 min (ARQUITETURA, seção 3), quem já estava com a página aberta ainda pode ver o animal nesse intervalo; a API recusa o envio.
- **RN49 – Análise do pedido:** a equipe vê os pedidos na aba **Pedidos** (T27) e cada um em T28, com os **alertas automáticos** do formulário (só chamam atenção, não reprovam ninguém) e o botão de WhatsApp de quem pediu.
  - **Recusar** (com confirmação): pedido `recusado`; o animal **volta para `disponivel`** e reaparece no site.
  - **Aprovar:** pedido `aprovado`; o animal **continua fora do site** (`em_analise`) até a entrega. Depois de assinado o termo, a equipe usa **"Marcar como adotado"** (RN07, RN08), com o nome e o WhatsApp de quem adotou já preenchidos a partir do pedido.
  - **Adoção aprovada que não aconteceu** (a pessoa desistiu antes da entrega): "Voltar para disponível" no animal; o pedido vira `nao_concluido`.
  - Quem pediu **não recebe aviso automático** (o site não guarda e-mail): a equipe fala com a pessoa pelo WhatsApp, inclusive para avisar uma recusa.
  - Animal de **protetor parceiro**: o pedido também chega para a equipe, que repassa ao protetor pelo WhatsApp _(proposta; quem analisa esses pedidos ainda é pergunta para a ONG)_.
- **RN50 – Proteção contra bloqueio de animais:** como um pedido esconde o animal, enviar pedidos falsos poderia tirar animais do site. Por isso: Turnstile; no máximo **2 pedidos por dia por IP** e **1 pedido pendente por WhatsApp**; a aba Pedidos mostra o número de pendentes, e o painel destaca em vermelho pedido parado há mais de **3 dias** _(prazo a confirmar com a ONG)_. O animal **não volta sozinho** para o site: a equipe decide (recusar devolve na hora).

### Perdidos e encontrados: segurança dos envios públicos

**Princípio:** nada enviado por visitantes fica público sem aprovação humana, e nenhum arquivo do visitante é salvo como chegou.

```
Celular do visitante                API (Worker) POST /api/publico/perdidos   Equipe da ONG
────────────────────                ───────────────────────────────────────   ─────────────
1. Escolhe a foto                   4. Confere o token Turnstile              7. Vê o anúncio em /admin/perdidos
2. Foto redesenhada em canvas       5. Valida campos, limites e               8. Aprova → fotos copiadas para o
   → WebP 1200px, sem EXIF/GPS         assinatura WebP do arquivo                bucket público e o anúncio vai ao ar
3. Envia dados + fotos + token      6. Salva como "pendente" e as             9. Recusa → anúncio e fotos
                                       fotos no bucket PRIVADO (quarentena)      são apagados na hora
```

- **RN18 – Aprovação obrigatória:** todo anúncio entra como `pendente` e só aparece no site depois que alguém da equipe aprova.
- **RN19 – Fotos permitidas, mas em quarentena:** o visitante pode enviar fotos (sem foto o anúncio perde o sentido), mas elas ficam no bucket **privado** `sospatas-quarentena` (R2) até a aprovação. Na aprovação, a API copia os arquivos para o bucket público `sospatas-fotos` (prefixo `perdidos/`) e apaga da quarentena.
- **RN20 – Foto redesenhada no navegador:** antes do envio, a imagem é desenhada em um `<canvas>` e exportada como **WebP de no máximo 1200 px**. Isso descarta qualquer conteúdo escondido no arquivo e **remove os metadados (EXIF), incluindo a localização GPS** da casa do visitante. Na escolha, aceita só JPG, PNG ou WebP de até 10 MB.
- **RN21 – Validação no servidor (não confiar no navegador):** a API rejeita o envio se:
  - o token do Turnstile for inválido;
  - houver mais de 2 fotos ou alguma tiver mais de **500 KB**;
  - o arquivo **não começar com a assinatura de WebP** (bytes `RIFF....WEBP`), mesmo que a extensão diga `.webp`;
  - algum campo estiver fora dos limites, ou a descrição tiver link (`http`, `www.`, `.com`).

  Os buckets não aceitam escrita de fora: só a API grava, sempre com `Content-Type: image/webp`. Os limites ficam em `packages/compartilhado` e valem igual no front e na API.
- **RN22 – Antirrobô:** Cloudflare Turnstile no formulário (grátis, sem "clique nos semáforos").
- **RN23 – Limite de envios:** no máximo **3 anúncios por dia por IP** (pelo `ip_hash`) e no máximo **30 anúncios pendentes** no total. Acima disso, o formulário avisa "tente mais tarde". Isso protege o armazenamento gratuito.
- **RN24 – Exibição segura:** fotos enviadas pelo público são exibidas **somente em `<img>`**, nunca como link para download. Textos são sempre exibidos como texto (o React já escapa HTML; nunca usar `dangerouslySetInnerHTML`).
- **RN25 – Prazo de publicação:** cada anúncio fica no ar **30 dias** após a aprovação (`expira_em`). Depois disso, ele e as fotos são **apagados automaticamente** pela tarefa diária (RN16). A equipe pode renovar (RN41). O prazo de 30 dias e o limite da RN23 são **fixos no código**, sem configuração pelo painel.
- **RN26 – Recusar, tirar do ar ou "voltou para casa" apagam tudo:** registro e arquivos, nos dois buckets (`sospatas-quarentena` e `sospatas-fotos`). Mesma lógica do RN05: primeiro os arquivos, depois o registro.
- **RN27 – Pendentes esquecidos:** anúncios `pendente` há mais de 7 dias são apagados automaticamente pela tarefa diária (RN16).
- **RN28 – Contra golpes e LGPD:**
  - o formulário pede só primeiro nome, WhatsApp e bairro, com **consentimento explícito** (checkbox obrigatório);
  - a página mostra um aviso fixo: "nunca pague nada antes de ver o animal; desconfie de quem pede dinheiro ou código por SMS";
  - na moderação, a equipe confere uma lista rápida: foto de animal, sem conteúdo impróprio, sem link, sem pedido de dinheiro e sem endereço completo.

### Adoção (informações da ONG, 06/10/2026)
- **RN29 – ~~Código de adoção~~ (removida em 06/10/2026):** a ONG não precisa de código. A comprovação da adoção pelo site é a própria aba "Adotados" do painel, com o nome de quem adotou.
- **RN30 – Período de adaptação de 15 dias:** começa em `data_adocao`. Segundo o termo, **depois dos 15 dias**, quem desiste deve avisar o doador e **manter o animal como lar provisório** até um novo lar. No painel, a aba "Adotados" mostra "Em adaptação: faltam N dias" e depois "Adoção concluída". Se o animal não se adaptar, ele **volta para quem doou** (ONG ou protetor) e nunca deve ser repassado nem abandonado. No sistema, isso é o botão "Voltar para disponível".
- **RN31 – Responsabilidade do protetor parceiro:** quando `responsavel_tipo = protetor`, a ficha, a página "Como adotar" e as perguntas frequentes deixam claro que a adoção, o termo e a devolução são combinados com o protetor, e que a SOS Patas **apenas divulga e não é responsável**.
- **RN32 – Benefício de adotar pelo site:** quem adota pelo site tem **prioridade na castração gratuita** quando houver castramóvel e **desconto em clínicas parceiras**. O benefício é divulgado na ficha, em "Como adotar" e nas perguntas frequentes, e é conferido pela equipe na aba "Adotados" do painel. **O site não cita clínicas nem valores de desconto**, só que existem parcerias com clínicas veterinárias (pedido da ONG, 07/10/2026).

### Saúde
- **RN17 (alterada em 06/10/2026):** a ficha mostra só a situação real ("Castrado" ou "Ainda não castrado"). **O site não promete castração garantida pela ONG**, porque nem sempre há recurso e há animais de outros grupos e protetores. O único benefício divulgado é a prioridade no castramóvel (RN32).

### Conteúdo editável pela equipe (textos das páginas)
- **RN33 – Um editor para todas as páginas:** Início, Como adotar, Perguntas frequentes e Como ajudar são montados a partir de `conteudo_textos` e `conteudo_itens`. A área da ONG usa **dois componentes genéricos**: `CampoTextoEditavel` (um texto, com contador de caracteres) e `ListaEditavel` (lista com adicionar, editar, reordenar e excluir), configurados pela tabela de listas da seção 5. Nenhum texto dessas páginas fica fixo no código, exceto títulos de seção e rótulos de botão.
- **RN34 – Só texto simples:** sem negrito nem editor de formatação. As quebras de linha são mantidas (`white-space: pre-line`) e endereços `http(s)://…` viram links automaticamente (`target="_blank" rel="noopener noreferrer"`), montados como elementos React, **nunca** com `dangerouslySetInnerHTML` (RN24). O limite de caracteres é validado no formulário e por `CHECK (char_length(...))` no banco.
- **RN35 – Reordenar com setas:** cada item tem os botões ↑ e ↓, que trocam a `ordem` com o vizinho em uma única chamada (`POST /api/admin/conteudo/itens/trocar-ordem`, em **uma transação**, para não deixar posições repetidas). Item novo entra no fim da lista.
- **RN36 – Excluir com confirmação; não existe "ocultar":** um item só sai do site ao ser excluído, com o modal "Excluir esta pergunta? Ela some do site e não pode ser recuperada." Não é possível excluir o último item de uma lista com mínimo 1 (o botão fica desativado, com a explicação).
- **RN37 – Salvar publica na hora:** não existe rascunho. Depois de salvar, a tela mostra "Salvo e publicado ✓" e o botão **"Ver no site"**, que abre a página pública em nova aba. _Detalhe técnico (08/10/2026): as leituras públicas ficam em cache por até 15 min para poupar o banco; salvar limpa o cache do datacenter da voluntária, então o "Ver no site" dela mostra a mudança na hora. Para outros visitantes, até a etapa 14 (limpeza global), a mudança pode levar até 15 min ([ARQUITETURA.md](ARQUITETURA.md), seção 3)._
- **RN38 – Fotos da história:** até **8 fotos com legenda** (lista `inicio_fotos`), com o mesmo processamento das fotos de animais (RN02: miniatura para a galeria e completa para a primeira foto), em `site/historia/{id}.webp` no bucket `sospatas-fotos`. A ordem é definida com ↑ ↓; a primeira abre a seção "Nossa história". Trocar a foto ou excluir o item apaga os arquivos antigos (mesma lógica da RN05/RN06). **Fotos com pessoas identificáveis só com autorização; crianças e adolescentes, só com autorização dos responsáveis** (LGPD art. 14 e ECA); o formulário mostra esse lembrete.

O resumo "Como adotar" no Início usa os **títulos** de `como_adotar_passos`, para os dois lugares nunca ficarem diferentes. Se duas pessoas editarem o mesmo item ao mesmo tempo, vale o último a salvar (aceitável para uma equipe de duas pessoas).

### Perdidos e encontrados pela equipe
- **RN39 – Anúncio criado pela equipe:** para quem pediu pelo WhatsApp, a equipe preenche o mesmo formulário da T13 no painel, com o checkbox obrigatório **"A pessoa autorizou publicar o primeiro nome, o WhatsApp e as fotos por 30 dias"**. O anúncio já nasce `publicado` (`origem = equipe`, sem Turnstile, sem `ip_hash`, fora do limite da RN23). As fotos passam pelo mesmo redesenho em canvas (RN20) e vão direto para o bucket público `sospatas-fotos` (prefixo `perdidos/`).
- **RN40 – Corrigir anúncio:** a equipe pode editar todos os campos de um anúncio pendente ou no ar, remover fotos e adicionar fotos (até 2). As fotos vão para o bucket do status atual (quarentena se pendente, público se no ar). Quem anunciou **não é avisado** de edições nem de recusas.
- **RN41 – Renovar:** botão "Renovar por mais 30 dias" nos anúncios no ar: `expira_em = hoje + 30 dias` (não acumula). O card mostra "Sai do ar em N dias".

### Protetores parceiros e auditoria
- **RN42 – Protetor cadastrado uma vez:** no cadastro do animal, ao escolher "Protetor parceiro", aparece a lista de `protetores` e a opção "＋ Novo protetor" (nome e WhatsApp, criado ali mesmo). Editar o WhatsApp de um protetor atualiza todos os animais dele. **Não é possível excluir um protetor com animais vinculados** (FK `restrict`); a tela avisa "Ana Paula tem 2 animais. Troque o responsável deles antes de excluir."
- **RN43 – "Alterado por… em…":** animais, anúncios, textos, itens, dados da ONG e protetores mostram na edição "Alterado por Claudia em 07/10/2026". A API preenche `updated_at` e `updated_by` (id da usuária em `equipe`, identificada pelo e-mail do Cloudflare Access) em toda escrita; o nome vem de `equipe`. Não há histórico completo.

### Comunicação
- **RN44 – O site não fala sobre resgates (07/10/2026):** nenhuma página, aviso ou pergunta frequente diz se a ONG faz ou não resgates, nem se busca animais. Na prática, há resgates feitos com transporte dos próprios voluntários, com atendimento em clínicas parceiras e acolhimento na casa de voluntários, mas **a ONG prefere não tratar do assunto no site**. A história da ONG (página inicial) pode contar casos do passado, como já faz.
- **RN45 – O site não fala de taxa de adoção (07/10/2026):** nenhuma página menciona "sem taxa", "R$ 0" ou "adoção gratuita" (selo e números da página inicial, ficha do animal, Como adotar e perguntas frequentes). A adoção continua sem taxa na prática, mas a ONG considerou a informação desnecessária. O aviso contra golpes em Perdidos ("desconfie de quem pede taxa") não tem relação com isso e continua.
- **RN46 – Números públicos que mudam pouco (07/10/2026):** a página inicial não mostra contagens que variam todo mês (animais esperando, adotados no último mês). A faixa de números em destaque usa a lista editável `inicio_numeros` com dados estáveis e arredondados ("Desde 2015", "+100 feiras", "+1.000 adotados"), e o texto da história segue o mesmo critério ("mais de 100 feiras"). Contagens automáticas ficam só no painel da ONG (T09, indicador de adoções do mês) e no subtítulo da vitrine.

### Manutenção
- **RN16 (alterada em 07/10/2026) – Tarefa diária e backup:** um Cron Trigger do Worker roda todo dia às 03:00 (Brasília) e aplica as limpezas automáticas (RN15, RN25, RN27). Um workflow do GitHub Actions faz **backup diário do banco** (`pg_dump`) para o bucket privado `sospatas-backups`, guardando 30 dias. O antigo "keep-alive" do Supabase não é mais necessário ([ARQUITETURA.md](ARQUITETURA.md), seções 7 e 8).

## 7. Estrutura de pastas

Monorepo com `apps/web` (front), `apps/api` (API Hono), `packages/compartilhado` (schemas zod e limites) e `db/` (schema Drizzle, migrations e seed). Árvore completa e papel de cada pasta: [ARQUITETURA.md](ARQUITETURA.md), seção 2.

Onde fica cada regra:
| Regra | Arquivo |
|---|---|
| Compressão e redesenho das fotos (RN02, RN20) | `apps/web/src/lib/fotos.ts` |
| Idade, adulto/filhote e "Esperando há mais tempo" (RN11–RN13) | `packages/compartilhado/src/idade.ts` (usado no front e na API) |
| Datas no fuso de Brasília | `packages/compartilhado/src/datas.ts` (`hojeNoBrasil`): o Worker roda em UTC |
| WhatsApp (normalizar, validar, formatar, link wa.me) e detecção de links (RN21) | `packages/compartilhado/src/whatsapp.ts` e `texto.ts` |
| `TextoSimples`: quebras de linha + links (RN34) | `apps/web/src/components/TextoSimples.tsx` |
| Limites de campos, prazos e quantidades (RN01, RN21, RN23, RN25, RN34…) | `packages/compartilhado/src/limites.ts` e `conteudo.ts` |
| Validação dos formulários e da API (zod, mensagens em português) | `packages/compartilhado/src/schemas/` |
| Enums e constraints do banco | `db/schema.ts` + `db/migrations/` |
| `excluirAnimal` (RN05), adoção (RN07, RN08), aprovar/recusar anúncio (RN19, RN26) | `apps/api/src/servicos/*` |
| Trocar ordem (RN35) | `apps/api/src/servicos/conteudo.ts` |
| Limpezas diárias (RN15, RN25, RN27) | `apps/api/src/tarefas/*` |
| Perguntas do formulário de adoção por versão, alertas automáticos (RN49) | `packages/compartilhado/src/schemas/` (formulário) e `src/alertas` (a criar na etapa 10b) |
| Pedido esconde o animal, aprovar e recusar (RN48, RN49) | `apps/api/src/servicos/pedidos.ts` (etapa 10b) |
| Validação do login (Access) | `apps/api/src/middleware/access.ts` |

## 7.1 Identidade visual

Tokens definidos no protótipo. No site (Tailwind 4), eles estão no bloco `@theme` de `apps/web/src/index.css`, com os mesmos nomes de classe (`bg-azul`, `text-azul-escuro`, `font-titulo`…). Valores:

```js
colors: {
  azul: { DEFAULT: '#1F3E9C', escuro: '#152B70', claro: '#E8EDFB' },
  vermelho: { DEFAULT: '#E02A2F', claro: '#FDECEC' },
  amarelo: { DEFAULT: '#F5A623', claro: '#FEF5E4' },
  fundo: '#F6F7FB',
},
fontFamily: { titulo: ['"Baloo 2"', 'system-ui'], corpo: ['Nunito', 'system-ui'] },
```

**Logo oficial:** copiar [prototipo/assets/logo.png](../prototipo/assets/logo.png) para `apps/web/public/logo.png` e usar esse arquivo em todo o site, inclusive no favicon e na imagem de compartilhamento (`og:image`). Regras de uso no [TELAS.md](../prototipo/TELAS.md), seção Identidade visual.

**Dados da ONG:** ficam na tabela `ong` e são editáveis em T23. Os valores abaixo são o conteúdo inicial (seed):
- Nome: SOS Patas, Sociedade de Proteção aos Animais de Passos/MG
- Instagram: @sospatas.ong (https://www.instagram.com/sospatas.ong/)
- Facebook: https://www.facebook.com/sospatasmg
- WhatsApp: (35) 9 8843-9614 _(confirmar)_
- PIX (CNPJ): 26.515.895/0001-90

## 8. Padrões

- **Idioma:** textos da interface, nomes de tabelas, colunas e funções do domínio em **português** (`animais`, `excluirAnimal`); termos técnicos genéricos podem ficar em inglês.
- **TypeScript estrito** em todo o monorepo; tipos do banco vêm do schema Drizzle (`db/schema.ts`); tipos de entrada e saída da API vêm dos schemas zod de `packages/compartilhado`.
- **Mobile-first:** testar toda tela em 360 px de largura antes de considerar pronta.
- **Acessibilidade básica:** `alt` nas fotos ("Foto do(a) {nome}"), contraste adequado e botões com área de toque de pelo menos 44 px.
- **API:** regras de negócio em `servicos/` (não nas rotas); operações com mais de um passo no banco em transação; testes (Vitest) para os serviços que apagam dados (RN05, RN26) e para as validações públicas (RN21).
- **Migrations:** toda mudança de banco por migration versionada em `db/migrations/`; nunca alterar produção à mão.
- **Segredos:** nada de segredo no front nem no repositório. O front só conhece a URL da API e a *site key* do Turnstile (`VITE_TURNSTILE_SITE_KEY`). Os segredos da API ficam em `wrangler secret` e no GitHub ([ARQUITETURA.md](ARQUITETURA.md), seção 9).
- **Portabilidade:** nenhuma regra de negócio depende de recurso exclusivo do Cloudflare. R2 fica atrás da interface `Armazenamento`, e o Access atrás do middleware `access.ts`.

### Definição de pronto (cada tela)
- [ ] Funciona no celular (360 px) e no computador
- [ ] Respeita as regras de negócio aplicáveis
- [ ] Sem dados privados expostos nas páginas públicas
- [ ] Testada por Gracia ou Claudia (tarefa 7 do roteiro)

## 9. Registro de decisões

| Data | Decisão | Motivo |
|---|---|---|
| 06/10/2026 | ~~Stack: React + Vite + Supabase + Cloudflare Pages~~ (substituída em 07/10, "caminho B") | Custo zero, sem cartão, uso comercial permitido, bom suporte da IA |
| 06/10/2026 | Vercel e Firebase descartados | Vercel Hobby é não comercial; Firebase Storage exige cartão (plano Blaze) |
| 06/10/2026 | Duas versões de cada foto (miniatura + completa) em WebP | O tráfego de 5 GB/mês é o limite mais apertado |
| 06/10/2026 | Excluir animal remove antes os arquivos do Storage (RN05) | O cascade do banco não apaga arquivos; evita ocupar espaço com fotos órfãs |
| 06/10/2026 | Adotado mantém só a foto principal (RN07) | Economiza armazenamento sem perder o histórico |
| 06/10/2026 | Adoção registrada em `animais.data_adocao` (sem tabela `adocoes`) | Mais simples; atende ao indicador de adoções |
| 06/10/2026 | ~~Contato só por WhatsApp, sem formulário~~ (substituída abaixo) | Menos dados pessoais (LGPD) e é o canal que a ONG já usa |
| 06/10/2026 | Protótipo em HTML navegável + Tailwind (tarefa 3) | Rápido de validar com a ONG pelo celular; classes reaproveitadas no React |
| 06/10/2026 | Campo `vermifugado` adicionado | Informação presente em todos os cartazes de adoção da ONG |
| 06/10/2026 | Chave PIX exibida no site (início, sobre e rodapé) | A ONG vive de doações; reforça a sustentabilidade econômica (ODS 8). Sem pagamento integrado |
| 06/10/2026 | ~~Aviso "A SOS Patas não faz resgates" na página inicial e nas perguntas frequentes~~ (removido em 07/10, RN44) | Reduz as mensagens de resgate/recolhimento relatadas pela Gracia |
| 06/10/2026 | Nova seção **Perdidos e encontrados**, com envio público + aprovação da equipe | Ajuda a comunidade a reencontrar animais e reduz o abandono; amplia o alcance social do projeto |
| 06/10/2026 | Visitante pode enviar fotos, mas em **bucket privado de quarentena** até a aprovação | Sem foto o anúncio não funciona; a quarentena garante que nada sem moderação fique público |
| 06/10/2026 | Envio público passa por **Edge Function** (Turnstile + validação + limite por IP), sem INSERT anônimo direto | Validação no navegador pode ser burlada; o servidor é a barreira real |
| 06/10/2026 | Fotos redesenhadas em canvas → WebP sem EXIF | Neutraliza arquivos maliciosos e remove a localização GPS do visitante (LGPD) |
| 06/10/2026 | Anúncios apagados após 30 dias; recusados apagados na hora | Minimiza dados pessoais guardados (LGPD) e economiza armazenamento |
| 06/10/2026 | Período de adaptação de 15 dias e devolução a quem doou | Regra informada pela ONG no grupo |
| 06/10/2026 | Aviso de que a ONG não é responsável por adoções de protetores parceiros | Pedido da ONG; deixa clara a responsabilidade de cada parte |
| 06/10/2026 | Removida a promessa "Castração garantida pela ONG" (RN17) | Pedido da ONG: nem sempre conseguem, e há filhotes de outros grupos/protetores |
| 06/10/2026 | "Quero adotar" passa a abrir um **formulário de interesse** em vez do WhatsApp (RN14, RN15) | Pedido da ONG: não concentrar as entrevistas em uma pessoa; pedidos validados depois pela equipe |
| 06/10/2026 | Termo continua em papel; o site não coleta RG, CPF nem endereço completo | Minimiza dados sensíveis (LGPD); o formulário é só a triagem |
| 06/10/2026 | **Sem código de adoção** (RN29 removida) | A ONG não precisa; a aba "Adotados" já comprova |
| 06/10/2026 | Campos do animal alinhados ao termo: porte em 5 opções, raça e tipo, cor da pelagem, vacinas (quais), vacinado/vermifugado com "sem informação", problema de saúde | Pedido da ONG; a ficha do site passa a servir de base para preencher o termo |
| 06/10/2026 | Dados do adotante (privados) ao marcar como adotado | Comprova a adoção pelo site para a prioridade na castração e permite o acompanhamento dos 15 dias |
| 07/10/2026 | **Textos das páginas editáveis pela equipe** (Início, Como adotar, Perguntas frequentes, Como ajudar, dados da ONG, clínicas), com um editor genérico (RN33) | O site não pode depender do estudante para mudar um texto depois da entrega; um só componente reduz o tempo de desenvolvimento |
| 07/10/2026 | Início vira **página institucional com a história da ONG**; missão e "como funcionamos" saem da Sobre, que vira **Como ajudar** (`/ajude`) | Pedido do estudante; evita repetir missão e funcionamento em duas páginas _(confirmar a troca da Sobre)_ |
| 07/10/2026 | Perguntas frequentes sem categorias e sem "ocultar"; só excluir, com confirmação (RN36) | Cerca de 11 perguntas cabem em uma lista; menos opções para usuárias sem conhecimento técnico |
| 07/10/2026 | Só texto simples, com links automáticos (RN34) | Segurança (sem HTML vindo do banco) e simplicidade |
| 07/10/2026 | Salvar publica na hora, sem rascunho (RN37) | Fluxo mais simples; o botão "Ver no site" serve de conferência |
| 07/10/2026 | Equipe pode criar, editar e renovar anúncios de perdidos (RN39–RN41); prazos fixos no código | Muitos pedidos chegam pelo WhatsApp; o anunciante não é avisado porque o site não guarda e-mail |
| 07/10/2026 | Tabela `protetores` substitui `responsavel_nome` e `whatsapp` em `animais` (RN42) | Evita digitar o mesmo protetor várias vezes e WhatsApp errado |
| 07/10/2026 | Todas as usuárias com as mesmas permissões; contas criadas à mão no Supabase; só "Alterado por… em…" (RN43) | Equipe pequena; gestão de contas e histórico completo ficam fora do MVP |
| 07/10/2026 | Navegação da área da ONG por barra fixa no rodapé (Animais · Perdidos · Textos · Mais) | Padrão que as usuárias já conhecem do WhatsApp e do Instagram |
| 07/10/2026 | Telas de análise dos pedidos de adoção ficam para uma rodada própria | Dependem da versão final do formulário (RN14) |
| 07/10/2026 | **História da ONG** na página inicial com as respostas da ONG: texto, 4 marcos, 3 números (116 feiras, quase 1.000 adotados, recorde de 32) e 5 fotos institucionais | Pedido de página institucional; informações enviadas pela ONG no grupo (PROJETO.md, Entrevista 3) |
| 07/10/2026 | Foto única da história (`inicio.historia_foto`) substituída pela lista `inicio_fotos` (até 8 fotos com legenda) e nova lista `inicio_numeros` (RN38) | A ONG enviou várias fotos (fundação, equipe, feiras); usa o mesmo editor genérico de listas |
| 07/10/2026 | **Sem clínicas nem valores de desconto no site**: lista `clinicas` e tela T25 removidas; fica só a menção genérica a "clínicas veterinárias parceiras" (RN32) | Pedido da ONG |
| 07/10/2026 | **Removidos o aviso "não fazemos resgates" e as perguntas "Vocês resgatam animais?" e "Vocês buscam o animal aqui em casa?"**; chave `inicio.aviso_resgate` excluída (RN44) | Pedido da ONG: a informação não era precisa (há resgates, com transporte de voluntários) e a ONG prefere não tratar do assunto no site |
| 07/10/2026 | Foto da assembleia de fundação **tratada** (lâmpadas, flash, ruído e contraste) e movida para a galeria; a história passa a abrir com a foto mais nítida (voluntários em feira de adoção) | O original é de baixa resolução; exibida grande, parecia antiga. Pedido à ONG o arquivo original (TELAS.md, pergunta 19) |
| 07/10/2026 | **Removidas as menções a "sem taxa"** (selo e card "R$ 0" da página inicial, ficha, Como adotar e a pergunta "A adoção tem taxa?") (RN45) | Pedido da ONG: informação desnecessária no site |
| 07/10/2026 | Faixa de números da página inicial troca "animais esperando" e "adotados no último mês" por números estáveis da ONG (lista `inicio_numeros`, movida da história para a faixa); "116 feiras" vira "+100"/"mais de 100" (RN46) | Pedido: números que não precisem ser alterados todo mês |
| 07/10/2026 | Números em destaque: "Quase 1.000 adotados nas feiras" vira **"+1.000 animais adotados"** (feiras + redes sociais) e o recorde de 32 sai da faixa | Pedido do estudante; a ONG informou quase mil nas feiras, fora as adoções pelas redes sociais |
| 07/10/2026 | **Visual acolhedor na página inicial**: patinhas decorativas, fotos estilo polaroide, botões em pílula e borda ondulada (TELAS.md, Identidade visual) | O visual estava com "cara empresarial"; a ONG quer algo mais acolhedor |
| 07/10/2026 | Texto de "Esperando há mais tempo" troca "Filhotes são adotados rápido. Os adultos podem esperar anos…" por uma vantagem de adotar um adulto e a boa ação; passa a ser editável (`inicio.esperando_texto`) | Pedido do estudante: tom positivo, sem comparar filhotes e adultos |
| 07/10/2026 | **Arquitetura "caminho B"**: front no Cloudflare Pages, **API própria em Hono no Cloudflare Workers**, **PostgreSQL no Neon** (via Hyperdrive), fotos no **Cloudflare R2**, monorepo TypeScript com Drizzle e zod ([ARQUITETURA.md](ARQUITETURA.md)) | Camadas separadas e portáveis (o mesmo código roda numa VPS em Docker), custo zero para começar, tráfego de fotos grátis; o mantenedor domina React, Node e SQL |
| 07/10/2026 | **Login da equipe pelo Cloudflare Access** (código de 6 dígitos no e-mail, sessão de 30 dias), sem senha no banco; tabela `equipe` passa a ter `email` e `ativo` | O Workers gratuito permite 10 ms de CPU por requisição, pouco para um hash de senha seguro; o Access é grátis até 50 usuários e não guarda senha |
| 07/10/2026 | Segurança na **API** em vez de RLS; buckets `sospatas-fotos` (público), `sospatas-quarentena` e `sospatas-backups` (privados); toda gravação de arquivo passa pela API | Sem Supabase, a API é a única porta para banco e arquivos |
| 07/10/2026 | RN16 deixa de ser keep-alive do Supabase e vira **tarefa diária (Cron Trigger) + backup diário do banco no R2** | O Neon não pausa projetos; o backup próprio garante a recuperação |
| 07/10/2026 | Domínio **`sospatas.org.br`** no CNPJ da ONG entra no MVP (antes "fora do MVP") | Necessário para API e fotos no mesmo domínio e para o Access; R$ 40/ano |
| 07/10/2026 | Criado o [CLAUDE.md](../CLAUDE.md) com as regras de manutenção do projeto (RP01: toda alteração vai para protótipo, projeto e documentação) | Evitar documentação desatualizada, já que o site é desenvolvido com IA a partir dela |
| 07/10/2026 | **Logo oficial em boa resolução** (`prototipo/assets/logo.png`, 790 px) em todas as telas | Arquivo recebido da ONG; substitui o recorte do Instagram |
| 08/10/2026 | Criado o [PLANO_DESENVOLVIMENTO.md](PLANO_DESENVOLVIMENTO.md): 16 etapas em fatias verticais (fundação → banco → API → site público → deploy de prévia → área da ONG → produção), executadas uma por pedido | Evitar um pedido único grande para a IA; validar cedo o Cloudflare com um deploy de prévia antes da área da ONG |
| 08/10/2026 | Domínio: `sospatas.org.br` livre e CNPJ 26.515.895/0001-90 ativo como "Associação Privada" (consulta pública); estatuto só se o Registro.br pedir ([ARQUITETURA.md](ARQUITETURA.md), seção 10) | Corrige a informação anterior de que o estatuto era sempre exigido |
| 08/10/2026 | Contas do site (Cloudflare, Neon, GitHub, contato do Registro.br) com o Gmail **`sitesospatas@gmail.com`**, recuperação por `sospatas@hotmail.com` e o mantenedor como administrador ([ARQUITETURA.md](ARQUITETURA.md), seção 10) | O e-mail geral da ONG exigiria pedir cada código de verificação; o e-mail pessoal deixaria a ONG sem acesso se o mantenedor sair |
| 08/10/2026 | Código no repositório pessoal `henriquenobre/sos-patas`, com transferência para uma organização da ONG se a manutenção mudar de mãos ([ARQUITETURA.md](ARQUITETURA.md), seção 10) | O repositório já existe e o mantenedor é quem trabalha nele; a transferência no GitHub é simples e mantém histórico, issues e redirecionamento do endereço |
| 08/10/2026 | Criado o [LINHA_DO_TEMPO.md](LINHA_DO_TEMPO.md) com as datas reais desde o primeiro contato com a ONG (05/10/2026) e a regra RP04 no [CLAUDE.md](../CLAUDE.md): toda etapa concluída tem a data registrada | Pedido do estudante: saber quanto tempo levou cada parte do projeto |
| 08/10/2026 | Banco no Neon em **São Paulo**, **PostgreSQL 18**, branch de produção `production` (padrão do Neon, no lugar de `main`); Docker local na mesma versão; Neon Auth não usado ([ARQUITETURA.md](ARQUITETURA.md), seção 5) | Região mais próxima dos usuários; mesma versão local e em produção evita diferença de comportamento; o login já é feito pelo Access |
| 08/10/2026 | **Node 24 LTS** no desenvolvimento e no CI (o plano previa o 22), com `.nvmrc` e `engines` no monorepo; pnpm com versão fixa pelo Corepack | O Node 20 instalado já está sem suporte (abr/2026); o 24 é o LTS ativo, com suporte até 2028, o que reduz atualizações para quem mantém o site |
| 08/10/2026 | Etapa 1 (fundação do monorepo): **Tailwind 4** com os tokens em `@theme` no CSS (no lugar de `tailwind.config`), **React Router 8**, Vite 8, Vitest 5; **TypeScript fixo em 6.0**; no `wrangler.toml`, nível de cima = produção e `.dev.vars` para o ambiente local ([ARQUITETURA.md](ARQUITETURA.md), seções 2 e 9) | Versões estáveis mais recentes na data; o typescript-eslint ainda não aceita o TypeScript 7; a API nunca liga atalhos de desenvolvimento por esquecimento de configuração |
| 08/10/2026 | Branches: **`main` = produção** e **`develop` = integração e testes** (prévia); etapas e correções em branches próprias a partir da `develop` ([ARQUITETURA.md](ARQUITETURA.md), seção 9) | Separar o que está testado do que está em desenvolvimento antes de o site ir ao ar e permitir versionar as publicações |
| 08/10/2026 | Etapa 2 (banco): schema Drizzle com 10 tabelas, 13 enums e as constraints de "Limites e garantias no banco" (seção 5); definidos os limites que faltavam (nome do animal, raça, lar, observações…); seed de conteúdo com **ids fixos** (pode rodar de novo sem duplicar) e seed de exemplo só no banco local; `db/` vira o pacote `@sospatas/db` | Nenhum campo de texto sem limite; o banco protege os dados mesmo se a API falhar; os limites ficam num lugar só (`packages/compartilhado`), lido pelo banco e pela validação |
| 08/10/2026 | Todos os animais do protótipo e do `seed_dev.sql` passam a ser tratados como **exemplos fictícios** (antes: Apolo e Pelezinho como reais); nenhum vai para a produção | Os dois eram animais da ONG, mas podem não estar mais para adoção. A produção começa sem animais e a equipe cadastra os reais (etapa 15) |
| 08/10/2026 | **Pastas reorganizadas:** documentação em `docs/` (DESENVOLVIMENTO, ARQUITETURA, PLANO_DESENVOLVIMENTO, LINHA_DO_TEMPO e `formulario/`), protótipo continua em `prototipo/`, aplicação em `apps/`, `packages/` e `db/`; tudo que é só local (PROJETO.md, PDFs da pesquisa, fotos originais, dados sensíveis) em `privado/`, fora do Git. `CLAUDE.md` e `README.md` ficam na raiz | Separar aplicação, documentação e protótipo, local e no GitHub; uma pasta só para o que nunca pode ser publicado |
| 08/10/2026 | Etapa 3 (pacote compartilhado): schemas zod de animal, adoção, protetor, anúncio (público e da equipe), textos, itens e dados da ONG, com mensagens em português simples; funções de idade, destaque, WhatsApp e links; **datas sempre no fuso de Brasília**; WhatsApp aceito em qualquer formato ("+55", "(35) 9…", "035…") e guardado só com dígitos; Instagram sem `@` e Facebook completado com `https://`; "quais vacinas" e `protetor_id` descartados quando não se aplicam; "Esperando há mais tempo" conta só **mais de** 90 dias | Uma regra num lugar só, usada igual no formulário e na API; o Worker roda em UTC e erraria o "hoje" à noite; menos erro de digitação para as voluntárias |
| 08/10/2026 | R2 ativado com o **cartão pessoal do mantenedor**; alerta de orçamento em US$ 1; **sem URL `r2.dev`** (antes do domínio, fotos servidas pela API); fotos de produção com cache que ignora query string e limite de requisições; token do CI com permissão mínima ([ARQUITETURA.md](ARQUITETURA.md), seção 11.1) | O R2 é o único serviço que pode cobrar; a análise mostrou que só leituras fora do cache gerariam custo, e essas medidas fecham esse caminho |
| 08/10/2026 | Capacidade do plano gratuito calculada ([ARQUITETURA.md](ARQUITETURA.md), seção 11.2): ~14 mil visitas/dia pelo Workers; o gargalo real é o **tempo acordado do Neon** (100 CU-horas/mês). Medidas: compute fixo em 0,25 CU, cache das leituras públicas na API (limpo ao salvar), `GET /site` com uma consulta, páginas tolerantes a falha da API | Saber quando o site cai e evitar que o banco seja suspenso no meio do mês |
| 08/10/2026 | Etapa 4 (base da API): `criarApp(dependencias)` separa as rotas do Cloudflare (banco, R2 e verificação do Access injetados); formato de erro com `campos` na validação; login pelo JWT do Access (`jose`) + tabela `equipe`, com **modo local** que só funciona com `AMBIENTE=local`; interface `Armazenamento` (R2 e memória) e conferência de WebP; **cache das leituras públicas por 15 min** (navegador 60 s); tipos do `env` gerados do `.dev.vars.example` | Testar a API sem Cloudflare e mantê-la portável; nunca liberar a área da ONG sem login por engano de configuração; poupar as horas do Neon (seção 11.2 da ARQUITETURA) |
| 08/10/2026 | Regra RP05 no [CLAUDE.md](../CLAUDE.md): a IA só faz commit, merge ou push quando o mantenedor pedir, e nunca leva nada direto para a `develop` ou a `main` | Pedido do mantenedor: revisar e controlar o que sobe para o Git |
| 08/10/2026 | Etapa 5 (API pública de leitura): rotas `/site`, `/animais` (filtros), `/animais/destaques`, `/animais/:id`, `/perdidos` e `/fotos/*`, com cache; variável `FOTOS_URL_BASE` (vazia = fotos servidas pela API); filtro de porte com as **5 opções** (TELAS.md corrigida); miniatura da foto da história em `{id}-thumb.webp`; testes provam que nenhum dado interno aparece nas respostas | A ONG precisa ver o site antes do domínio, sem `r2.dev`; o porte tem 5 opções desde 06/10 e a TELAS ainda dizia 3 |
| 08/10/2026 | Etapa 6 (site público, páginas de conteúdo): Início, Como adotar, Perguntas frequentes, Como ajudar e Privacidade iguais ao protótipo, lendo tudo de `GET /site`; páginas da vitrine, ficha e perdidos mostram "Em breve" até as etapas 7 e 11; erro da API mostra mensagem amigável com "Tentar de novo"; `AnimalResumo` ganha `responsavel_tipo` (selo "Protetor parceiro" no card); idade abaixo de 1 mês aparece como "menos de 1 mês" (o protótipo dizia "cerca de 1 mês"); script `pnpm db:fotos-historia` (sharp + Wrangler) adiantado da etapa 14; `pnpm dev:celular` para testar no celular | Testar o site completo no computador e no celular antes da vitrine; não mostrar idade que o animal ainda não tem |
| 08/10/2026 | **Pedidos de adoção entram no MVP:** "Quero adotar" abre o formulário de adoção (versão 1.1 do FORMULARIO_ADOCAO.md) com o **termo de adoção para leitura e ciência**; o pedido fica salvo (`pedidos_adocao`) e é avaliado na área da ONG (nova aba Pedidos, T27, T28); **ao receber um pedido o animal sai do site** (`status = em_analise`) até a equipe recusar (volta) ou aprovar e marcar como adotado (RN14, RN15, RN47–RN50). Propostas a confirmar: aviso na ficha por link direto, alerta de pedido parado em 3 dias, protetor recebe pelo WhatsApp | Pedido do mantenedor: a adoção passa pelo formulário e pela análise da equipe, e o animal não pode receber outros pedidos enquanto um está em análise |
| 08/10/2026 | Etapa 7 (vitrine e ficha): filtros da vitrine na URL (um chip por grupo; valor inválido é ignorado); subtítulo com o total de disponíveis (RN46); ficha com galeria clicável, saúde e temperamento no masculino/feminino, aviso de protetor (RN31) e benefício (RN32); **"Quero adotar" verde com patinha** (sem o ícone do WhatsApp, porque leva ao formulário) e rota `/animais/:id/adotar` com "Em breve" até a etapa 10b; script `pnpm db:fotos-exemplo` (fotos do protótipo para os animais de exemplo, só local) adiantado da etapa 9 | Busca compartilhável; o botão não leva mais ao WhatsApp; testar a vitrine com fotos no computador |
