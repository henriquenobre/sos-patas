# Guia de Desenvolvimento: Site de Adoção SOS Patas

> Documento de referência para construir o site. Reúne as premissas, as tecnologias, o modelo de dados e as regras de negócio já definidas.
> **Toda nova definição entra na seção 9 (Registro de decisões)** e, se mudar alguma regra, atualiza a seção correspondente.
>
> Contexto do projeto acadêmico, entrevistas e formulários: [PROJETO.md](PROJETO.md).
> **Telas (protótipo validado com a ONG):** [prototipo/TELAS.md](prototipo/TELAS.md) · protótipo navegável em [prototipo/index.html](prototipo/index.html).

---

## 1. Objetivo

Site para a ONG SOS Patas (Passos/MG) **mostrar os animais disponíveis para adoção** e **controlar internamente** onde cada um está. A ONG não tem sede e mantém os animais em casas de voluntários.

Problemas que o site precisa resolver:
1. A ONG não sabe de forma centralizada quais animais estão disponíveis e em qual lar estão.
2. Quem quer adotar depende de resposta por mensagem, e muitas ficam sem resposta.
3. Os adultos esperam mais de 2 anos e precisam de mais visibilidade que os filhotes.
4. Boa parte das mensagens pede resgate ou recolhimento, que a ONG não faz.

## 2. Premissas

| # | Premissa | Impacto no desenvolvimento |
|---|---|---|
| P1 | **Custo fixo zero** para a ONG, sem cartão de crédito | Só serviços com plano gratuito (seção 3) |
| P2 | **Cadastro feito pelo celular** por Gracia e Claudia | Área restrita mobile-first, formulário curto e botões grandes |
| P3 | **Usuárias sem conhecimento técnico** | Nada de painel do Supabase no dia a dia; tudo pela área restrita do site |
| P4 | **Prazo: site no ar até 30/10/2026**, trabalho entregue em 11/11/2026 | Escopo MVP enxuto (seção 4); o que não couber vai para "Depois do MVP" |
| P5 | **Desenvolvimento com apoio de IA** (Claude Code) | Este documento é a fonte de verdade para a IA |
| P6 | **LGPD** | Endereço/lar temporário nunca é público; coletar o mínimo de dados pessoais |
| P7 | **Economia de armazenamento e tráfego** | Fotos comprimidas, miniaturas na vitrine, remoção de arquivos ao excluir (seção 6) |
| P8 | **Animais de protetores parceiros** também aparecem | Cada animal tem um responsável (ONG ou protetor) com WhatsApp próprio |

## 3. Tecnologias

| Camada | Tecnologia | Limite gratuito relevante |
|---|---|---|
| Frontend | React + Vite + TypeScript | – |
| Estilo | Tailwind CSS | – |
| Rotas | React Router | – |
| Banco | Supabase (PostgreSQL) | 500 MB |
| Login | Supabase Auth (e-mail + senha) | 50 mil usuários/mês |
| Fotos | Supabase Storage (bucket público `fotos`) | 1 GB de armazenamento, **5 GB/mês de tráfego** |
| Compressão de imagem | `browser-image-compression` (no navegador) | – |
| Hospedagem | Cloudflare Pages | Banda ilimitada |
| Estatísticas | Cloudflare Web Analytics | Grátis, sem cookies |
| Código | GitHub + GitHub Actions | Grátis |
| Contato | Link `https://wa.me/55DDDNUMERO?text=...` | Grátis |
| Antirrobô (formulário público) | Cloudflare Turnstile | Grátis, sem limite |
| Validação de envios públicos | Supabase Edge Functions | 500 mil execuções/mês |

**Capacidade estimada:** mais de 200 mil animais em texto; cerca de 5 mil fotos completas (cerca de 7 anos no ritmo da ONG); cerca de 8 mil acessos à vitrine por mês usando miniaturas.

## 4. Escopo do MVP

### Páginas públicas
| Rota | Página | Conteúdo |
|---|---|---|
| `/` | Início | Chamada principal, seção **"Esperando há mais tempo"** (adultos), atalho para a vitrine, como adotar |
| `/animais` | Vitrine | Grade de cards (miniatura, nome, idade, porte) com filtros: espécie, porte, idade (filhote/adulto), convive com outros animais |
| `/animais/:id` | Ficha do animal | Fotos completas, todos os campos, responsável e botão **"Quero adotar"** (WhatsApp) |
| `/como-adotar` | Como adotar | Passo a passo: contato, entrevista, termo de adoção, acompanhamento. **Sem taxa.** |
| `/perguntas-frequentes` | Perguntas frequentes | Inclui "Vocês resgatam?" e "Vocês buscam o animal?" (a ONG não faz resgate nem recolhe) |
| `/sobre` | Sobre e ajude | Missão, como a ONG funciona (100% voluntários, sem abrigo, sem transporte, vive de doações), **PIX** e como ajudar |
| `/privacidade` | Política de privacidade | Texto simples sobre LGPD |
| `/perdidos` | Perdidos e encontrados | Anúncios **aprovados** de animais perdidos/encontrados, filtro por tipo, botão WhatsApp para quem anunciou, aviso contra golpes |
| `/perdidos/novo` | Anunciar | Formulário público com até 2 fotos, consentimento LGPD e Turnstile. Vai para análise, **não publica direto** |

### Área restrita (`/admin`, exige login)
| Rota | Função |
|---|---|
| `/admin/login` | Login com e-mail e senha |
| `/admin` | Lista de animais com busca e filtro por status; ações rápidas: editar, marcar adotado, excluir |
| `/admin/animais/novo` | Cadastro (formulário em uma tela, pensado para celular) |
| `/admin/animais/:id` | Edição, incluindo lar temporário e observações internas |
| `/admin/perdidos` | Moderação: aprovar/recusar anúncios pendentes; marcar "voltou para casa" ou tirar do ar |

### Fora do MVP (depois, se der tempo)
- Página "Finais felizes" com animais adotados
- Doações com pagamento integrado / campanhas (no MVP, só a chave PIX é exibida)
- Cadastro de interessados por formulário (hoje o contato é só pelo WhatsApp)
- Domínio próprio `.com.br`
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
| `porte` | enum `pequeno` \| `medio` \| `grande` | obrigatório |
| `castrado` | boolean | obrigatório |
| `vacinado` | boolean | obrigatório |
| `vermifugado` | boolean | obrigatório (aparece nos cartazes da ONG) |
| `docil` | boolean null | null = não informado |
| `convive_animais` | boolean null | null = não informado |
| `descricao` | text | opcional, máx. 500 caracteres |
| `status` | enum `disponivel` \| `adotado` | padrão `disponivel` |
| `data_entrada` | date | padrão hoje; usado em "Esperando há mais tempo" |
| `data_adocao` | date null | preenchido ao marcar como adotado; base do indicador de adoções |
| `responsavel_tipo` | enum `ong` \| `protetor` | padrão `ong` |
| `responsavel_nome` | text | ex.: "SOS Patas" ou nome do protetor |
| `whatsapp` | text | só dígitos com DDD, ex.: `35999999999` |
| `created_at` / `updated_at` | timestamptz | automáticos |

### `fotos` (leitura pública)
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `animal_id` | uuid FK → `animais.id` | `on delete cascade` |
| `ordem` | int | 0 = foto principal |
| `path_miniatura` | text | ex.: `animais/{animal_id}/{foto_id}-thumb.webp` |
| `path_completa` | text | ex.: `animais/{animal_id}/{foto_id}.webp` |

### `animais_privado` (somente usuárias logadas)
| Coluna | Tipo | Regra |
|---|---|---|
| `animal_id` | uuid PK/FK → `animais.id` | `on delete cascade` |
| `lar_nome` | text | nome do voluntário/lar onde o animal está |
| `lar_tipo` | enum `provisorio` \| `remunerado` | |
| `observacoes` | text | anotações internas |

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
| `consentimento_em` | timestamptz | momento em que aceitou publicar os dados |
| `status` | enum `pendente` \| `publicado` | recusado, resolvido e expirado são **apagados** (não ficam no banco) |
| `publicado_em` | timestamptz null | preenchido na aprovação |
| `ip_hash` | text | hash (SHA-256 + segredo) do IP, só para limitar envios; nunca o IP puro |
| `created_at` | timestamptz | automático |

### `perdidos_fotos`
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `perdido_id` | uuid FK → `perdidos.id` | `on delete cascade` |
| `path` | text | `pendentes/{perdido_id}/{id}.webp` → `publicados/{perdido_id}/{id}.webp` após aprovação |

### Segurança (Row Level Security)
- `animais` e `fotos`: **SELECT público**; INSERT/UPDATE/DELETE só `authenticated`.
- `animais_privado`: **todas as operações só `authenticated`**. Nunca consultar essa tabela nas páginas públicas.
- Bucket `fotos`: leitura pública; upload e remoção só `authenticated`.
- `perdidos`: **SELECT público só onde `status = 'publicado'`**; **INSERT anônimo bloqueado** (só a Edge Function insere, com a chave `service_role`); UPDATE/DELETE só `authenticated`.
- `perdidos_fotos`: SELECT público só de anúncios publicados; escrita só pela Edge Function e por `authenticated`.
- Bucket **`perdidos-quarentena`: PRIVADO** (sem leitura pública). A equipe vê as fotos por URL assinada de 5 minutos.
- Bucket **`perdidos`: leitura pública**, escrita só `authenticated`. Só recebe fotos já aprovadas.
- **Cadastro de novos usuários desativado** no Supabase Auth. As contas de Gracia e Claudia são criadas manualmente pelo painel.

## 6. Regras de negócio

### Fotos
- **RN01:** no máximo **3 fotos por animal**. A primeira (`ordem = 0`) é a principal.
- **RN02:** antes do envio, o navegador converte cada foto em **duas versões WebP**:
  - **miniatura:** 400 px na maior dimensão, cerca de 30 KB;
  - **completa:** 1200 px na maior dimensão, cerca de 200 KB.

  Nunca enviar o arquivo original.
- **RN03:** a vitrine e os cards usam **só a miniatura**. A foto completa carrega apenas na ficha do animal.
- **RN04:** os arquivos ficam em `animais/{animal_id}/`, uma pasta por animal, para permitir apagar tudo de uma vez.
- **RN05 – Excluir animal remove as fotos do Storage.** O `on delete cascade` apaga as linhas da tabela `fotos`, mas **não apaga os arquivos do Storage**. Por isso, a exclusão segue esta ordem:
  1. listar e remover todos os arquivos da pasta `animais/{animal_id}/` no Storage;
  2. depois, apagar o registro em `animais`; o cascade cuida de `fotos` e `animais_privado`.

  Se o passo 1 falhar, não apagar o registro e mostrar erro. Centralizar isso em uma única função (`excluirAnimal`).
- **RN06 – Trocar ou remover uma foto apaga os arquivos antigos** (miniatura e completa) do Storage na mesma operação.
- **RN07 – Ao marcar como adotado, apagar as fotos extras.** Fica só a foto principal (miniatura e completa) para o histórico; as demais são removidas do Storage e da tabela.

### Adoção e exclusão
- **RN08 – Adoção não é exclusão.** Animal adotado recebe `status = adotado` e `data_adocao = hoje`, sai da vitrine e continua no banco. Isso é necessário para medir o indicador de adoções (tarefa 12 do roteiro).
- **RN09 – Excluir é só para erro de cadastro ou falecimento**, e sempre com confirmação na tela ("Tem certeza? Esta ação não pode ser desfeita.").

### Vitrine e destaque
- **RN10:** a vitrine mostra só `status = disponivel`, ordenada por `data_entrada` (mais antigos primeiro).
- **RN11:** **adulto** é quem tem 1 ano ou mais (calculado por `nascimento_aprox`); **filhote** é quem tem menos de 1 ano.
- **RN12 – "Esperando há mais tempo":** adultos disponíveis com `data_entrada` há mais de 90 dias, até 6 na página inicial, os mais antigos primeiro.
- **RN13:** a idade é exibida de forma aproximada: "cerca de 3 meses", "cerca de 2 anos".

### Contato
- **RN14:** o botão **"Quero adotar"** abre o WhatsApp do **responsável pelo animal**, com a mensagem pronta:
  `Olá! Vi o(a) {nome} no site da SOS Patas e tenho interesse em adotar. Pode me passar mais informações?`
- **RN15:** o site não coleta dados de quem quer adotar no MVP. Todo o contato é pelo WhatsApp, o que reduz o tratamento de dados pessoais (LGPD).

### Perdidos e encontrados: segurança dos envios públicos

**Princípio:** nada enviado por visitantes fica público sem aprovação humana, e nenhum arquivo do visitante é salvo como chegou.

```
Celular do visitante                Supabase Edge Function              Equipe da ONG
────────────────────                ──────────────────────              ─────────────
1. Escolhe a foto                   4. Confere o token Turnstile        7. Vê o anúncio em /admin/perdidos
2. Foto redesenhada em canvas       5. Valida campos, limites e         8. Aprova → fotos vão para o
   → WebP 1200px, sem EXIF/GPS         assinatura WebP do arquivo          bucket público e o anúncio vai ao ar
3. Envia dados + fotos + token      6. Salva como "pendente" e as       9. Recusa → anúncio e fotos
                                       fotos no bucket PRIVADO             são apagados na hora
```

- **RN18 – Aprovação obrigatória:** todo anúncio entra como `pendente` e só aparece no site depois que alguém da equipe aprova.
- **RN19 – Fotos permitidas, mas em quarentena:** o visitante pode enviar fotos (sem foto o anúncio perde o sentido), mas elas ficam no bucket **privado** `perdidos-quarentena` até a aprovação. Na aprovação, são movidas para o bucket público `perdidos`.
- **RN20 – Foto redesenhada no navegador:** antes do envio, a imagem é desenhada em um `<canvas>` e exportada como **WebP de no máximo 1200 px**. Isso descarta qualquer conteúdo escondido no arquivo e **remove os metadados (EXIF), incluindo a localização GPS** da casa do visitante. Na escolha, aceita só JPG, PNG ou WebP de até 10 MB.
- **RN21 – Validação no servidor (não confiar no navegador):** a Edge Function rejeita o envio se:
  - o token do Turnstile for inválido;
  - houver mais de 2 fotos ou alguma tiver mais de **500 KB**;
  - o arquivo **não começar com a assinatura de WebP** (bytes `RIFF....WEBP`), mesmo que a extensão diga `.webp`;
  - algum campo estiver fora dos limites, ou a descrição tiver link (`http`, `www.`, `.com`).

  O bucket também é configurado com `allowed_mime_types = ['image/webp']` e `file_size_limit = 500KB`, como segunda barreira.
- **RN22 – Antirrobô:** Cloudflare Turnstile no formulário (grátis, sem "clique nos semáforos").
- **RN23 – Limite de envios:** no máximo **3 anúncios por dia por IP** (pelo `ip_hash`) e no máximo **30 anúncios pendentes** no total. Acima disso, o formulário avisa "tente mais tarde". Isso protege o armazenamento gratuito.
- **RN24 – Exibição segura:** fotos enviadas pelo público são exibidas **somente em `<img>`**, nunca como link para download. Textos são sempre exibidos como texto (o React já escapa HTML; nunca usar `dangerouslySetInnerHTML`).
- **RN25 – Prazo de publicação:** cada anúncio fica no ar **30 dias** após a aprovação. Depois disso, ele e as fotos são **apagados automaticamente** (mesma tarefa agendada do RN16).
- **RN26 – Recusar, tirar do ar ou "voltou para casa" apagam tudo:** registro e arquivos, nos dois buckets. Mesma lógica do RN05: primeiro os arquivos, depois o registro.
- **RN27 – Pendentes esquecidos:** anúncios `pendente` há mais de 7 dias são apagados automaticamente.
- **RN28 – Contra golpes e LGPD:**
  - o formulário pede só primeiro nome, WhatsApp e bairro, com **consentimento explícito** (checkbox obrigatório);
  - a página mostra um aviso fixo: "nunca pague nada antes de ver o animal; desconfie de quem pede dinheiro ou código por SMS";
  - na moderação, a equipe confere uma lista rápida: foto de animal, sem conteúdo impróprio, sem link, sem pedido de dinheiro e sem endereço completo.

### Saúde
- **RN17 – Castração garantida:** se `castrado = false`, a ficha mostra "Castração garantida pela ONG" em vez de "Não castrado". _(A validar com a ONG: se vale para todos ou só para filhotes.)_

### Manutenção
- **RN16 – Evitar a pausa do Supabase:** um workflow do GitHub Actions, agendado a cada 3 dias, faz uma consulta simples na tabela `animais`.

## 7. Estrutura de pastas (proposta)

```
sos-patas/
├── PROJETO.md               # projeto acadêmico
├── DESENVOLVIMENTO.md       # este guia
├── site/                    # app React
│   ├── src/
│   │   ├── pages/           # páginas públicas e admin
│   │   ├── components/      # cards, filtros, formulário, galeria
│   │   ├── lib/
│   │   │   ├── supabase.ts  # cliente
│   │   │   ├── animais.ts   # consultas e excluirAnimal (RN05)
│   │   │   ├── fotos.ts     # compressão e upload (RN01–RN07)
│   │   │   └── idade.ts     # cálculo de idade (RN11, RN13)
│   │   └── types.ts
│   └── ...
├── supabase/
│   └── migrations/          # SQL das tabelas, enums, RLS e bucket
└── .github/workflows/
    └── keep-alive.yml       # RN16
```

## 7.1 Identidade visual

Tokens definidos no protótipo (copiar para o `tailwind.config` do React):

```js
colors: {
  azul: { DEFAULT: '#1F3E9C', escuro: '#152B70', claro: '#E8EDFB' },
  vermelho: { DEFAULT: '#E02A2F', claro: '#FDECEC' },
  amarelo: { DEFAULT: '#F5A623', claro: '#FEF5E4' },
  fundo: '#F6F7FB',
},
fontFamily: { titulo: ['"Baloo 2"', 'system-ui'], corpo: ['Nunito', 'system-ui'] },
```

**Dados fixos da ONG** (constante `ONG` no código):
- Nome: SOS Patas, Sociedade de Proteção aos Animais de Passos/MG
- Instagram: @sospatas.ong
- WhatsApp: (35) 9 8843-9614 _(confirmar)_
- PIX (CNPJ): 26.515.895/0001-90

## 8. Padrões

- **Idioma:** textos da interface, nomes de tabelas, colunas e funções do domínio em **português** (`animais`, `excluirAnimal`); termos técnicos genéricos podem ficar em inglês.
- **TypeScript estrito**; tipos do banco gerados pelo Supabase CLI.
- **Mobile-first:** testar toda tela em 360 px de largura antes de considerar pronta.
- **Acessibilidade básica:** `alt` nas fotos ("Foto do(a) {nome}"), contraste adequado e botões com área de toque de pelo menos 44 px.
- **Variáveis de ambiente:** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em `.env.local` (nunca commitar). A chave `service_role` **nunca** vai para o frontend.

### Definição de pronto (cada tela)
- [ ] Funciona no celular (360 px) e no computador
- [ ] Respeita as regras de negócio aplicáveis
- [ ] Sem dados privados expostos nas páginas públicas
- [ ] Testada por Gracia ou Claudia (tarefa 7 do roteiro)

## 9. Registro de decisões

| Data | Decisão | Motivo |
|---|---|---|
| 06/10/2026 | Stack: React + Vite + Supabase + Cloudflare Pages | Custo zero, sem cartão, uso comercial permitido, bom suporte da IA |
| 06/10/2026 | Vercel e Firebase descartados | Vercel Hobby é não comercial; Firebase Storage exige cartão (plano Blaze) |
| 06/10/2026 | Duas versões de cada foto (miniatura + completa) em WebP | O tráfego de 5 GB/mês é o limite mais apertado |
| 06/10/2026 | Excluir animal remove antes os arquivos do Storage (RN05) | O cascade do banco não apaga arquivos; evita ocupar espaço com fotos órfãs |
| 06/10/2026 | Adotado mantém só a foto principal (RN07) | Economiza armazenamento sem perder o histórico |
| 06/10/2026 | Adoção registrada em `animais.data_adocao` (sem tabela `adocoes`) | Mais simples; atende ao indicador de adoções |
| 06/10/2026 | Contato só por WhatsApp, sem formulário | Menos dados pessoais (LGPD) e é o canal que a ONG já usa |
| 06/10/2026 | Protótipo em HTML navegável + Tailwind (tarefa 3) | Rápido de validar com a ONG pelo celular; classes reaproveitadas no React |
| 06/10/2026 | Campo `vermifugado` adicionado | Informação presente em todos os cartazes de adoção da ONG |
| 06/10/2026 | Chave PIX exibida no site (início, sobre e rodapé) | A ONG vive de doações; reforça a sustentabilidade econômica (ODS 8). Sem pagamento integrado |
| 06/10/2026 | Aviso "A SOS Patas não faz resgates" na página inicial e nas perguntas frequentes | Reduz as mensagens de resgate/recolhimento relatadas pela Gracia |
| 06/10/2026 | Nova seção **Perdidos e encontrados**, com envio público + aprovação da equipe | Ajuda a comunidade a reencontrar animais e reduz o abandono; amplia o alcance social do projeto |
| 06/10/2026 | Visitante pode enviar fotos, mas em **bucket privado de quarentena** até a aprovação | Sem foto o anúncio não funciona; a quarentena garante que nada sem moderação fique público |
| 06/10/2026 | Envio público passa por **Edge Function** (Turnstile + validação + limite por IP), sem INSERT anônimo direto | Validação no navegador pode ser burlada; o servidor é a barreira real |
| 06/10/2026 | Fotos redesenhadas em canvas → WebP sem EXIF | Neutraliza arquivos maliciosos e remove a localização GPS do visitante (LGPD) |
| 06/10/2026 | Anúncios apagados após 30 dias; recusados apagados na hora | Minimiza dados pessoais guardados (LGPD) e economiza armazenamento |
