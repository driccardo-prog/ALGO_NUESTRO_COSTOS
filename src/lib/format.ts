// Formatos en español argentino.

const enteros = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
const conDecimales = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** $ 1.234.567 (o $ 1.234,56 con decimales) */
export function pesos(n: number, decimales = false): string {
  const f = decimales ? conDecimales : enteros
  const texto = f.format(Math.abs(n))
  return `${n < 0 ? '-' : ''}$ ${texto}`
}

/** 30% · 12,5% */
export function pct(n: number): string {
  return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(n)}%`
}

export function numero(n: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(n)
}

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** Las fechas se cargan solo con mes y año: AAAA-MM-DD → "octubre 2026" */
export function fecha(iso: string | null | undefined): string {
  if (!iso) return 'sin fecha'
  const [a, m] = iso.split('-')
  const mes = MESES[Number(m) - 1]
  return mes ? `${mes} ${a}` : 'sin fecha'
}

/** Primer día del mes actual, en formato AAAA-MM-01 */
export function mesActual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Interpreta lo que Loli escribe en un campo de plata o número:
 * "95.000" → 95000 · "5.307,67" → 5307.67 · "5307.67" → 5307.67 · "$ 1.000" → 1000
 * Devuelve null si está vacío o no es un número.
 */
export function leerNumero(texto: string): number | null {
  let t = texto.replace(/[$\s%]/g, '')
  if (t === '') return null
  if (t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.')
  } else if ((t.match(/\./g) ?? []).length > 1 || /^\d{1,3}\.\d{3}$/.test(t)) {
    t = t.replace(/\./g, '')
  }
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
