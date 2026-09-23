import { useEffect, useState } from 'react'
import { repo } from '../lib/db'

/** Muestra una foto guardada (las fotos son privadas: se pide un link temporal). */
export function Foto({
  ruta,
  className,
  onClick,
}: {
  ruta: string
  className?: string
  onClick?: (url: string) => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let vivo = true
    repo
      .urlFoto(ruta)
      .then((u) => vivo && setUrl(u))
      .catch(() => vivo && setUrl(''))
    return () => {
      vivo = false
    }
  }, [ruta])
  if (!url) return <div className={`${className ?? ''} foto-mini vacia`}>{url === '' ? '—' : ''}</div>
  return <img src={url} alt="" className={className} onClick={() => onClick?.(url)} />
}
