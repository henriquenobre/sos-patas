// Aba "Textos" da área da ONG (RN33–RN38, RN46): T15 (lista de páginas) e as telas de cada
// página, montadas com CampoTextoEditavel e ListaEditavel na ordem em que os blocos aparecem
// no site: T16 Perguntas frequentes, T18 Como adotar, T19 Página inicial, T20 Como ajudar.
// O item de uma lista (novo ou editar) é a T17, em ItemConteudo.tsx.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { ConteudoAdmin } from '@sospatas/compartilhado'
import { useConteudo } from '../../api/admin'
import { Carregando, ErroAoCarregar } from '../../components/Estados'
import { CampoTextoEditavel } from '../../components/admin/CampoTextoEditavel'
import { EscolhaChamada } from '../../components/admin/EscolhaChamada'
import { ListaEditavel } from '../../components/admin/ListaEditavel'
import { AlteradoPor, TituloAdmin } from '../../components/admin/Navegacao'
import {
  PAGINAS,
  quantidadeDeItens,
  telaDaPagina,
  ultimaAlteracao,
  type PaginaConteudo,
} from '../../lib/conteudo'

/** Carrega o conteúdo e entrega para a tela; enquanto isso, "Carregando…" ou o erro. */
function ComConteudo({ children }: { children: (conteudo: ConteudoAdmin) => ReactNode }) {
  const conteudo = useConteudo()
  if (conteudo.isPending) return <Carregando />
  if (conteudo.isError) return <ErroAoCarregar tentarDeNovo={() => void conteudo.refetch()} />
  return <>{children(conteudo.data)}</>
}

function VerNoSite({ pagina }: { pagina: PaginaConteudo }) {
  return (
    <a
      href={PAGINAS[pagina].publica}
      target="_blank"
      rel="noreferrer"
      className="shrink-0 py-2 font-bold text-azul"
    >
      Ver no site ↗
    </a>
  )
}

function Cabecalho({ pagina, subtitulo }: { pagina: PaginaConteudo; subtitulo?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <TituloAdmin titulo={PAGINAS[pagina].nome} subtitulo={subtitulo} />
      <VerNoSite pagina={pagina} />
    </div>
  )
}

function Nota({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-azul-claro p-3 text-sm text-azul-escuro">
      <span aria-hidden="true">ℹ️ </span>
      {children}
    </p>
  )
}

function TituloBloco({ children }: { children: ReactNode }) {
  return <h2 className="font-titulo text-xl font-bold text-azul">{children}</h2>
}

/** T15 · Textos do site. */
export function TextosDoSite() {
  return (
    <section className="space-y-4">
      <title>Textos do site · Área da ONG · SOS Patas</title>
      <TituloAdmin titulo="Textos do site" subtitulo="O que você salvar aparece no site na hora." />
      <ComConteudo>
        {(conteudo) => (
          <ul className="space-y-3">
            {(Object.keys(PAGINAS) as PaginaConteudo[]).map((pagina) => {
              const config = PAGINAS[pagina]
              const alteracao = ultimaAlteracao(conteudo, pagina)
              const resumo =
                pagina === 'perguntas'
                  ? quantidadeDeItens('perguntas', conteudo.listas.perguntas.length)
                  : config.resumo
              return (
                <li key={pagina}>
                  <Link
                    to={telaDaPagina(pagina)}
                    className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 hover:ring-azul"
                  >
                    <span className="text-3xl" aria-hidden="true">
                      {config.icone}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-titulo text-lg font-bold text-azul-escuro">
                        {config.nome}
                      </span>
                      <span className="block text-sm text-slate-600">{resumo}</span>
                      {alteracao && <AlteradoPor {...alteracao} />}
                    </span>
                    <span className="text-2xl text-slate-400" aria-hidden="true">
                      ›
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </ComConteudo>
      <p className="text-center text-sm text-slate-500">
        Contatos e PIX ficam em ☰ Mais → Dados da ONG.
      </p>
    </section>
  )
}

/** T16 · Perguntas frequentes. */
export function EditarPerguntas() {
  return (
    <section className="space-y-4 pb-20">
      <title>Perguntas frequentes · Área da ONG · SOS Patas</title>
      <ComConteudo>
        {(conteudo) => (
          <>
            <Cabecalho
              pagina="perguntas"
              subtitulo={quantidadeDeItens('perguntas', conteudo.listas.perguntas.length)}
            />
            <ListaEditavel
              lista="perguntas"
              itens={conteudo.listas.perguntas}
              pagina={PAGINAS.perguntas.publica}
              adicionarFixo
            />
          </>
        )}
      </ComConteudo>
    </section>
  )
}

/** T18 · Editar Como adotar. */
export function EditarComoAdotar() {
  const { publica } = PAGINAS['como-adotar']
  return (
    <section className="space-y-6">
      <title>Como adotar · Área da ONG · SOS Patas</title>
      <Cabecalho pagina="como-adotar" />
      <ComConteudo>
        {({ textos, listas }) => (
          <>
            <CampoTextoEditavel
              chave="como_adotar.subtitulo"
              texto={textos['como_adotar.subtitulo']}
              pagina={publica}
            />
            <ListaEditavel
              lista="como_adotar_passos"
              titulo="Passos da adoção"
              dica="Os títulos dos passos também aparecem no resumo da página inicial."
              itens={listas.como_adotar_passos}
              pagina={publica}
            />
            <ListaEditavel
              lista="como_adotar_antes"
              titulo="Antes de adotar, pense em"
              itens={listas.como_adotar_antes}
              pagina={publica}
            />
            <ListaEditavel
              lista="como_adotar_vantagens"
              titulo="Vantagem de adotar pelo site"
              itens={listas.como_adotar_vantagens}
              pagina={publica}
            />
            <CampoTextoEditavel
              chave="como_adotar.vantagens_rodape"
              texto={textos['como_adotar.vantagens_rodape']}
              pagina={publica}
              aviso="Sem citar clínicas nem valores: só que existem parcerias."
            />
            <CampoTextoEditavel
              chave="como_adotar.aviso_protetor"
              texto={textos['como_adotar.aviso_protetor']}
              pagina={publica}
            />
          </>
        )}
      </ComConteudo>
    </section>
  )
}

/** T19 · Editar Página inicial. */
export function EditarInicio() {
  const { publica } = PAGINAS.inicio
  return (
    <section className="space-y-6">
      <title>Página inicial · Área da ONG · SOS Patas</title>
      <Cabecalho pagina="inicio" />
      <Nota>Automáticos: "Esperando há mais tempo", resumo de "Como adotar" e PIX.</Nota>
      <ComConteudo>
        {({ textos, listas, chamada }) => (
          <>
            <TituloBloco>Chamada</TituloBloco>
            <CampoTextoEditavel
              chave="inicio.chamada_titulo"
              texto={textos['inicio.chamada_titulo']}
              pagina={publica}
            />
            <CampoTextoEditavel
              chave="inicio.chamada_texto"
              texto={textos['inicio.chamada_texto']}
              pagina={publica}
            />
            <EscolhaChamada chamada={chamada} pagina={publica} />
            <ListaEditavel
              lista="inicio_numeros"
              titulo="Números em destaque"
              dica="Use números que mudam pouco (ex.: '+100' em vez de '116'), para não precisar atualizar todo mês. Até 4."
              itens={listas.inicio_numeros}
              pagina={publica}
            />
            <TituloBloco>Nossa história</TituloBloco>
            <CampoTextoEditavel
              chave="inicio.historia"
              texto={textos['inicio.historia']}
              pagina={publica}
            />
            <ListaEditavel
              lista="inicio_marcos"
              titulo="Marcos da história"
              itens={listas.inicio_marcos}
              pagina={publica}
            />
            <ListaEditavel
              lista="inicio_fotos"
              titulo="Fotos da história"
              dica="Até 8 fotos. A primeira abre a seção “Nossa história”; as outras formam a galeria. Fotos com pessoas: só com autorização delas; crianças e adolescentes, só com autorização dos responsáveis."
              itens={listas.inicio_fotos}
              pagina={publica}
            />
            <TituloBloco>Missão e como funcionamos</TituloBloco>
            <CampoTextoEditavel
              chave="inicio.missao"
              texto={textos['inicio.missao']}
              pagina={publica}
            />
            <ListaEditavel
              lista="inicio_como_funcionamos"
              titulo="Como funcionamos"
              itens={listas.inicio_como_funcionamos}
              pagina={publica}
            />
            <TituloBloco>Esperando há mais tempo</TituloBloco>
            <p className="-mt-4 text-sm text-slate-600">
              Os animais entram automaticamente: só o texto é editável.
            </p>
            <CampoTextoEditavel
              chave="inicio.esperando_texto"
              texto={textos['inicio.esperando_texto']}
              pagina={publica}
            />
          </>
        )}
      </ComConteudo>
    </section>
  )
}

/** T20 · Editar Como ajudar. */
export function EditarComoAjudar() {
  const { publica } = PAGINAS.ajude
  return (
    <section className="space-y-6">
      <title>Como ajudar · Área da ONG · SOS Patas</title>
      <Cabecalho pagina="ajude" />
      <ComConteudo>
        {({ textos, listas }) => (
          <>
            <CampoTextoEditavel
              chave="ajude.introducao"
              texto={textos['ajude.introducao']}
              pagina={publica}
            />
            <ListaEditavel
              lista="ajude_formas"
              titulo="Formas de ajudar"
              itens={listas.ajude_formas}
              pagina={publica}
            />
            <Nota>O card do PIX usa a chave de ☰ Mais → Dados da ONG.</Nota>
          </>
        )}
      </ComConteudo>
    </section>
  )
}
