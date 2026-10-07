# Regras do projeto: SOS Patas

> Regras de trabalho que valem para **toda alteração** neste repositório, feita por pessoa ou por IA.
> Este arquivo é lido automaticamente pelo Claude Code no início de cada conversa.
> Regras de negócio do site (RN) ficam no [DESENVOLVIMENTO.md](DESENVOLVIMENTO.md), seção 6; aqui ficam as regras de **como** o projeto é mantido (RP).
> Para acrescentar uma regra: próximo número livre, título curto, "Por quê" e "Como aplicar".

## Onde está cada coisa

| Arquivo | Papel |
|---|---|
| [DESENVOLVIMENTO.md](DESENVOLVIMENTO.md) | Fonte de verdade técnica: escopo, modelo de dados, regras de negócio (RN), registro de decisões |
| [prototipo/TELAS.md](prototipo/TELAS.md) | Especificação de cada tela (T01…), componentes, identidade visual, perguntas para a ONG |
| [prototipo/index.html](prototipo/index.html) | Protótipo navegável; dados de exemplo e textos iniciais (seed) |
| [prototipo/gerar_prints.py](prototipo/gerar_prints.py) | Gera os prints de [prototipo/telas/](prototipo/telas/) |
| [PROJETO.md](PROJETO.md) | Projeto acadêmico: entrevistas e respostas da ONG, roteiro, formulários (fora do Git) |
| [formulario/](formulario/) | Formulário de interesse em adoção e termo de adoção |
| `fotos/` | Fotos originais recebidas da ONG (fora do Git) |
| `site/`, `supabase/` | Código do site e migrations, quando o desenvolvimento começar |

Em caso de conflito: **DESENVOLVIMENTO.md > TELAS.md > protótipo**.

## RP01 – Toda alteração vai para o protótipo, o projeto e a documentação

Nenhuma mudança fica só em um lugar. Ao alterar uma regra, uma tela, um texto do site ou um dado da ONG, atualizar **na mesma tarefa** tudo o que é afetado:

| Se mudou… | Atualizar |
|---|---|
| Regra de negócio, dado, rota ou escopo | `DESENVOLVIMENTO.md` (seção correspondente **e** uma linha no Registro de decisões, com data e motivo) |
| Tela, componente, texto ou visual | `prototipo/index.html` **e** `prototipo/TELAS.md` (descrição da tela; status ✏️ se precisar revalidar) |
| Tela nova ou removida | Também o menu "☰ Telas do protótipo", as rotas do `render()` e a lista `TELAS` do `gerar_prints.py` |
| Qualquer coisa visível no protótipo | Rodar `python prototipo/gerar_prints.py` para atualizar os prints |
| Informação vinda da ONG | `PROJETO.md` (registrar a resposta como recebida, sem reescrever) e responder/riscar a pergunta em `TELAS.md` → "Perguntas para a validação" |
| Textos e conteúdos iniciais do site | Seed no protótipo agora; `supabase/migrations/seed_conteudo.sql` quando existir |
| Estrutura de pastas ou arquivos | Tabela acima e `README.md` |
| Código do site (`site/`) | O protótipo e a documentação continuam valendo como especificação: se o código divergir, atualizar os dois lados |

**Por quê:** o site será desenvolvido com apoio de IA a partir da documentação (premissa P5) e mantido depois da entrega por voluntárias sem conhecimento técnico. Documento desatualizado vira código errado.

**Como aplicar:** antes de encerrar a tarefa, conferir a tabela acima; procurar (busca no projeto) referências ao que mudou, por exemplo nomes de tabela, rota, chave ou tela, e corrigir todas. Se a nova informação **contradiz** uma regra ou um texto existente, não sobrescrever em silêncio: registrar a decisão e avisar quem pediu.

## RP02 – Não inventar informações da ONG

Textos públicos (história, números, nomes, parceiros, contatos) só com informação dada pela ONG. Enquanto não houver, usar texto marcado como **[Exemplo]** e registrar a pergunta em `TELAS.md`.

**Por quê:** o site fala em nome da ONG; informação errada prejudica a confiança e pode gerar problema legal.

## RP03 – Fotos: original fora do Git, versão otimizada no projeto

Originais ficam em `fotos/` (no `.gitignore`). No projeto entram só versões reduzidas (até 1200 px, sem metadados/GPS) em `prototipo/assets/` e, no site, `site/public/` ou no Storage. Fotos com **pessoas identificáveis** só são publicadas com autorização da ONG; crianças e adolescentes, só com autorização dos responsáveis (RN38).

**Por quê:** fotos originais pesam e podem conter localização; LGPD e ECA protegem a imagem das pessoas.
