import { MESES } from '../lib/format'

/** Elige mes y año (las fechas exactas no hacen falta). Guarda AAAA-MM-01, o '' si no hay fecha. */
export function SelectorMes({
  id,
  valor,
  onChange,
  permitirVacio = true,
}: {
  id?: string
  valor: string
  onChange: (v: string) => void
  permitirVacio?: boolean
}) {
  const [a, m] = valor ? valor.split('-') : ['', '']
  const anioActual = new Date().getFullYear()
  const anios = Array.from({ length: 6 }, (_, i) => anioActual - 2 + i)
  if (a && !anios.includes(Number(a))) anios.unshift(Number(a))

  const cambiar = (mes: string, anio: string) => {
    if (!mes) return onChange('')
    onChange(`${anio || anioActual}-${mes}-01`)
  }

  return (
    <div className="selector-mes">
      <select id={id} aria-label="Mes" value={m} onChange={(e) => cambiar(e.target.value, a)}>
        {permitirVacio && <option value="">Sin fecha</option>}
        {MESES.map((nombre, i) => {
          const v = String(i + 1).padStart(2, '0')
          return (
            <option key={v} value={v}>
              {nombre[0].toUpperCase() + nombre.slice(1)}
            </option>
          )
        })}
      </select>
      <select
        aria-label="Año"
        value={a || String(anioActual)}
        disabled={!m}
        onChange={(e) => cambiar(m, e.target.value)}
      >
        {anios.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </div>
  )
}
