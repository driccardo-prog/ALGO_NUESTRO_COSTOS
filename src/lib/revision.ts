// Controles para que no se pierda ni se duplique plata:
// gastos sin tanda, gastos que no se suman a ninguna cartera y posibles repetidos.

import {
  esCuero,
  esPorConsumo,
  participantesGenerales,
  productosDelGasto,
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

  // Posibles repetidos: mismo nombre, o mismo tipo, categoría, tanda y productos
  // con uno estimado y otro real (presupuesto + factura).
  const grupos = new Map<string, Gasto[]>()
  const agregar = (clave: string, g: Gasto) => grupos.set(clave, [...(grupos.get(clave) ?? []), g])
  for (const g of d.gastos) {
    if (g.pendiente) continue
    const productos = [...g.productos].sort().join(',')
    agregar(`n|${g.tipo}|${normalizar(g.descripcion)}|${g.tanda_id ?? ''}`, g)
    agregar(`c|${g.tipo}|${g.categoria_id}|${g.tanda_id ?? ''}|${productos}`, g)
  }
  const vistos = new Set<string>()
  const repetidos: Gasto[][] = []
  for (const [clave, gs] of grupos) {
    if (gs.length < 2) continue
    // por categoría solo cuenta si hay un estimado y un real
    if (clave.startsWith('c|') && !(gs.some((g) => g.estado === 'estimado') && gs.some((g) => g.estado === 'real')))
      continue
    const id = gs.map((g) => g.id).sort().join('|')
    if (vistos.has(id)) continue
    vistos.add(id)
    repetidos.push(gs)
  }

  return { sinTanda, noSuman, repetidos }
}
