// Controles para que no se pierda ni se duplique plata:
// gastos sin tanda, gastos que no se suman a ninguna cartera y posibles repetidos.

import {
  costoPorCartera,
  esCuero,
  esPorConsumo,
  participantesGenerales,
  productosDelGasto,
  montoGasto,
  unidadesDe,
  type Datos,
} from './costeo'
import type { Gasto } from './types'

export interface Problema {
  gasto: Gasto
  motivo: string
}

export interface Revision {
  /** gastos de monto total que todavía no tienen tanda: no se suman */
  sinTanda: Gasto[]
  /** gastos que no llegan a ninguna cartera */
  noSuman: Problema[]
  /** grupos de gastos que parecen ser el mismo cargado dos veces */
  repetidos: Gasto[][]
}

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export function revisarGastos(d: Datos): Revision {
  const sinTanda: Gasto[] = []
  const noSuman: Problema[] = []

  for (const g of d.gastos) {
    if (g.pendiente) continue
    const usaProductos = g.tipo === 'especifico' || g.tipo === 'arranque'

    if (usaProductos) {
      const ids = productosDelGasto(d, g)
      if (ids.length === 0) {
        const borrados = g.productos.length > 0 && g.productos.every((id) => !d.productos.some((x) => x.id === id))
        noSuman.push({
          gasto: g,
          motivo:
            g.productos.length === 0
              ? 'no tiene ningún producto elegido'
              : borrados
                ? 'sus productos ya no existen'
                : esCuero(d, g)
                  ? 'es cuero y solo está asignado a subproductos (en los subproductos el cuero cuesta $ 0)'
                  : 'no tiene productos elegidos',
        })
        continue
      }
    }

    if (g.tipo !== 'especifico' && g.tipo !== 'general') continue
    if (!g.tanda_id) {
      if (!esPorConsumo(g) && d.tandas.length > 0) sinTanda.push(g)
      continue
    }
    const t = d.tandas.find((x) => x.id === g.tanda_id)
    if (!t) continue
    if (g.tipo === 'especifico' && !productosDelGasto(d, g).some((id) => unidadesDe(t, id) > 0)) {
      noSuman.push({ gasto: g, motivo: `ninguno de sus productos está en ${t.nombre}` })
    }
    if (g.tipo === 'general' && participantesGenerales(d, t).length === 0) {
      noSuman.push({ gasto: g, motivo: `${t.nombre} no tiene carteras que paguen gastos generales` })
    }
  }

  // Posibles repetidos:
  // - mismo nombre (y mismo tipo y tanda), o
  // - presupuesto + factura: misma categoría, tanda y carteras, uno estimado y otro real,
  //   cargados de la misma forma y con montos parecidos (hasta 30% de diferencia).
  const vistos = new Set<string>(d.config.repetidos_ignorados ?? [])
  const repetidos: Gasto[][] = []
  const sumar = (gs: Gasto[]) => {
    const id = claveRepetidos(gs)
    if (vistos.has(id)) return
    vistos.add(id)
    repetidos.push(gs)
  }

  const porNombre = new Map<string, Gasto[]>()
  const porCategoria = new Map<string, Gasto[]>()
  const agregar = (m: Map<string, Gasto[]>, clave: string, g: Gasto) => m.set(clave, [...(m.get(clave) ?? []), g])
  for (const g of d.gastos) {
    if (g.pendiente) continue
    const productos = [...g.productos].sort().join(',')
    agregar(porNombre, `${g.tipo}|${normalizar(g.descripcion)}|${g.tanda_id ?? ''}`, g)
    agregar(porCategoria, `${g.tipo}|${g.categoria_id}|${g.tanda_id ?? ''}|${productos}|${esPorConsumo(g)}`, g)
  }
  for (const gs of porNombre.values()) if (gs.length > 1) sumar(gs)
  for (const gs of porCategoria.values()) {
    for (const e of gs.filter((g) => g.estado === 'estimado')) {
      for (const r of gs.filter((g) => g.estado === 'real')) {
        if (parecidos(valorComparable(e), valorComparable(r))) sumar([e, r])
      }
    }
  }

  return { sinTanda, noSuman, repetidos }
}

/** Identificador de un grupo de posibles repetidos (para poder marcarlo como "no son repetidos"). */
export function claveRepetidos(gs: Gasto[]): string {
  return gs
    .map((g) => g.id)
    .sort()
    .join('|')
}

/** Lo que se compara entre dos gastos: el costo por cartera si es compra por mayor, o el monto. */
function valorComparable(g: Gasto): number {
  return esPorConsumo(g) ? costoPorCartera(g) : montoGasto(g)
}

function parecidos(a: number, b: number): boolean {
  if (a <= 0 || b <= 0) return false
  return Math.max(a, b) / Math.min(a, b) <= 1.3
}
