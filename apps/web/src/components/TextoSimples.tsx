// Texto editado pela equipe (RN34): sem formatação, mantendo as quebras de linha e com os
// endereços http(s) virando links. Montado com elementos React, NUNCA com
// dangerouslySetInnerHTML (RN24): o React escapa qualquer HTML que venha do banco.
import { Fragment } from 'react'

const LINK = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g

type Props = { texto: string; className?: string; como?: 'p' | 'span' | 'li' }

export function TextoSimples({ texto, className = '', como: Elemento = 'p' }: Props) {
  const partes = texto.split(LINK)
  return (
    <Elemento className={`whitespace-pre-line ${className}`}>
      {partes.map((parte, i) =>
        // Com o grupo de captura no split, as posições ímpares são os links
        i % 2 === 1 ? (
          <a
            key={i}
            href={parte}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-azul underline break-all"
          >
            {parte}
          </a>
        ) : (
          <Fragment key={i}>{parte}</Fragment>
        ),
      )}
    </Elemento>
  )
}
