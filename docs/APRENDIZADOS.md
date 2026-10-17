# Aprendizados do projeto

> O que este projeto ensinou e o que fazer diferente no próximo, principalmente quando o código é escrito com apoio de IA.
> Documento vivo: cada aprendizado novo entra no fim da seção correspondente.
> Para acrescentar um item: próximo número livre (A01, A02…), título curto, **O que aconteceu** e **No próximo projeto**.

## 1. Antes de começar o código

### A01 – Definir o idioma do código

**O que aconteceu:** ninguém definiu se o código seria em inglês ou em português. A IA escreveu tudo em português (nomes de variáveis, funções, tabelas, rotas e pastas) sem perguntar, e o padrão se espalhou pelo projeto inteiro antes que alguém percebesse.

**No próximo projeto:** decidir o idioma no primeiro dia e registrar no `CLAUDE.md` (ou arquivo equivalente de regras). Separar o que é código (nomes de variáveis, funções, tabelas, rotas) do que é texto para o usuário e da documentação, porque cada um pode ter um idioma diferente.

### A02 – Escolher as bibliotecas antes de pedir código

**O que aconteceu:** as bibliotecas foram escolhidas ao longo do desenvolvimento, à medida que cada etapa pedia. Sem uma lista fechada, a IA tende a escolher por conta própria, e trocar uma biblioteca depois custa retrabalho.

**No próximo projeto:** antes da primeira etapa, fechar a lista de bibliotecas por área (front, API, banco, validação, testes, formulários, datas, estilos) com a versão. Registrar na documentação de arquitetura e pedir à IA que não acrescente biblioteca nova sem perguntar.

### A03 – Definir padrões de back-end e front-end

**O que aconteceu:** os padrões de organização do código surgiram durante o desenvolvimento, em vez de serem combinados antes. Sem padrão escrito, cada etapa pode sair um pouco diferente da anterior.

**No próximo projeto:** escrever os padrões antes do código e deixar no arquivo de regras que a IA lê:

- **Back-end:** estrutura de pastas, separação entre rota e serviço, formato de erro da API, validação de entrada, nomes de endpoints, como escrever testes.
- **Front-end:** estrutura de pastas, componentes (quando criar um novo, onde guardar), chamadas à API, formulários, estados de carregando e erro, estilos.

## 2. Trabalhando com IA

### A04 – Pedir menos comentários no código

**O que aconteceu:** a IA deixou muitos comentários no código, vários só repetindo o que a linha já diz. Isso polui a leitura e os comentários ficam desatualizados quando o código muda.

**No próximo projeto:** colocar no arquivo de regras, desde o início, que o código só leva comentário quando explica o porquê de algo que não é óbvio (uma regra de negócio, um contorno de bug, uma decisão). O que o código faz deve ficar claro pelos nomes.

## 3. Processo e organização

_(nenhum item ainda)_

## 4. Contato com a ONG

_(nenhum item ainda)_
