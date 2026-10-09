// Card da vitrine e do "Esperando há mais tempo" (T01, T02). Usa só a miniatura (RN03).
import { useState } from 'react'
import { Link } from 'react-router'
import {
  ROTULOS,
  diasEsperando,
  textoEspera,
  textoIdade,
  type AnimalResumo,
} from '@sospatas/compartilhado'
import { textoAlternativo } from '../lib/animal'
import { IconePata } from './Icones'

/** Foto do animal ou, sem foto (ou se ela não carregar), uma patinha sobre fundo neutro. */
export function FotoAnimal({
  url,
  alt,
  className = '',
}: {
  url: string | null
  alt: string
  className?: string
}) {
  const [falhou, setFalhou] = useState(false)
  if (url && !falhou) {
    return (
      <img
        src={url}
        alt={alt}
        loading="lazy"
        onError={() => {
          setFalhou(true)
        }}
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }
  return (
    <div
      role="img"
      aria-label={alt}
      className={`flex h-full w-full items-center justify-center bg-slate-300 ${className}`}
    >
      <IconePata className="h-12 w-12 text-white/80" />
    </div>
  )
}

export function CardAnimal({
  animal,
  hoje,
  destaque = false,
}: {
  animal: AnimalResumo
  hoje: string
  destaque?: boolean
}) {
  return (
    <Link
      to={`/animais/${animal.id}`}
      className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden">
        <FotoAnimal
          url={animal.foto}
          alt={textoAlternativo(animal)}
          className="transition group-hover:scale-105"
        />
        {destaque && (
          <span className="absolute left-2 top-2 rounded-full bg-vermelho px-2.5 py-1 text-[11px] font-extrabold text-white shadow">
            ⏳ {textoEspera(diasEsperando(animal.data_entrada, hoje))}
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-titulo text-xl font-bold leading-tight text-azul-escuro">
            {animal.nome}
          </h3>
          <span className="text-xs font-bold text-slate-500">{ROTULOS.sexo[animal.sexo]}</span>
        </div>
        <p className="text-sm text-slate-600">
          {textoIdade(animal.nascimento_aprox, hoje)} · {ROTULOS.porte[animal.porte]}
        </p>
        {animal.responsavel_tipo === 'protetor' && (
          <p className="mt-1 text-[11px] font-semibold text-slate-500">Protetor parceiro</p>
        )}
      </div>
    </Link>
  )
}
