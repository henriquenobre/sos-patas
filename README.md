# SOS Patas: site de adoção

Site de adoção de animais para a **ONG SOS Patas**, de Passos/MG, desenvolvido de forma voluntária.

🔗 **Protótipo:** https://henriquenobre.github.io/sos-patas/

## O que tem aqui

| Pasta/arquivo | Conteúdo |
|---|---|
| [prototipo/](prototipo/) | Protótipo navegável das telas (HTML + Tailwind) |
| [prototipo/TELAS.md](prototipo/TELAS.md) | Especificação de cada tela |
| [prototipo/telas/](prototipo/telas/) | Prints das telas no celular e no computador |
| [formulario/FORMULARIO_ADOCAO.md](formulario/FORMULARIO_ADOCAO.md) | Perguntas do formulário de interesse em adoção (em validação) |
| [DESENVOLVIMENTO.md](DESENVOLVIMENTO.md) | Guia técnico: tecnologias, modelo de dados e regras de negócio |
| [PLANO_DESENVOLVIMENTO.md](PLANO_DESENVOLVIMENTO.md) | Plano de desenvolvimento em etapas, com painel de status |
| [ARQUITETURA.md](ARQUITETURA.md) | Arquitetura e hospedagem: front, API, banco, fotos, login, deploy e backup |
| [CLAUDE.md](CLAUDE.md) | Regras de manutenção do projeto: o que atualizar a cada alteração |

## Tecnologias previstas

React + Vite + TypeScript + Tailwind CSS (Cloudflare Pages) · API em Hono (Cloudflare Workers) · PostgreSQL (Neon) · Fotos no Cloudflare R2 · Login pelo Cloudflare Access. Detalhes: [ARQUITETURA.md](ARQUITETURA.md).

> No protótipo, os animais Apolo e Pelezinho são reais da ONG; os demais são fictícios, com fotos apenas ilustrativas. A história e as fotos institucionais da página inicial foram enviadas pela ONG.
