import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Ícono (i) que explica en una línea cómo se calculó un número. */
export function Info({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!abierto) return
    const cerrar = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [abierto])

  return (
    <span
      className="info"
      ref={ref}
      onMouseEnter={() => setAbierto(true)}
      onMouseLeave={() => setAbierto(false)}
    >
      <button type="button" aria-label="Cómo se calcula" onClick={() => setAbierto((a) => !a)}>
        i
      </button>
      {abierto && (
        <span className="globo" role="tooltip">
          {children}
        </span>
      )}
    </span>
  )
}
