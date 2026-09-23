// Textos y cuentas de gastos que usan varias pantallas.

import { montoGasto, precioPorUnidad, unidadesDe } from './costeo'
import { pesos } from './format'
import type { Gasto, ModoMonto, Tanda, TipoGasto } from './types'

export const TIPOS: Record<TipoGasto, { nombre: string; ayuda: string }> = {
  especifico: {
    nombre: 'Específico',
    ayuda: 'Va a uno o varios productos: cuero, taller, trenzador, herrajes.',
  },
  general: {
    nombre: 'General',
    ayuda: 'No es de un producto en particular: flete, nafta. Se reparte entre toda la tanda.',
  },
  arranque: {
    nombre: 'Arranque',
    ayuda: 'Gasto de una sola vez: muestras, moldes. No entra en el costo real por unidad.',
  },
  recurrente: {
    nombre: 'Recurrente mensual',
    ayuda: 'Se paga todos los meses: Tiendanube, monotributo, dominio.',
  },
}

export const MODOS: Record<ModoMonto, string> = {
  total: 'Monto total',
  unitario: 'Precio unitario × cantidad',
  por_unidad_tanda: 'Precio por cada unidad producida',
}

export const ESTADOS_TANDA = {
  planificada: 'Planificada',
  en_produccion: 'En producción',
  terminada: 'Terminada',
} as const

/** Unidades de la tanda que cubre un gasto "por unidad producida". */
export function unidadesCubiertas(g: Gasto, t: Tanda | undefined): number {
  if (!t) return 0
  if (g.tipo === 'general') return Object.keys(t.unidades).reduce((a, id) => a + unidadesDe(t, id), 0)
  return g.productos.reduce((a, id) => a + unidadesDe(t, id), 0)
}

/** Monto para mostrar en listas: total si se puede calcular, o precio por unidad. */
export function textoMonto(g: Gasto, tanda: Tanda | undefined): { principal: string; detalle?: string } {
  if (g.pendiente) return { principal: 'Falta el monto' }
  if (g.modo_monto === 'por_unidad_tanda') {
    const pu = pesos(precioPorUnidad(g), true)
    if (!tanda) return { principal: `${pu} c/u`, detalle: 'se suma al asignar una tanda' }
    const n = unidadesCubiertas(g, tanda)
    return { principal: pesos(montoGasto(g, n)), detalle: `${pu} × ${n} unidades` }
  }
  const total = montoGasto(g)
  const detalle: string[] = []
  if (g.modo_monto === 'unitario')
    detalle.push(`${pesos((g.precio_unitario ?? 0) * (g.sin_iva ? 1.21 : 1), true)} × ${g.cantidad ?? 0}`)
  if (g.sin_iva) detalle.push('IVA incluido')
  if (g.tipo === 'recurrente') detalle.push(g.frecuencia === 'anual' ? 'por año' : 'por mes')
  return { principal: pesos(total), detalle: detalle.join(' · ') || undefined }
}
