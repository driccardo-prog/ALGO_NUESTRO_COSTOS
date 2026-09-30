// Textos y cuentas de gastos que usan varias pantallas.

import { costoPorCartera, esPorConsumo, montoGasto } from './costeo'
import { numero, pesos } from './format'
import type { Gasto, TipoGasto } from './types'

export const TIPOS: Record<TipoGasto, { nombre: string; ayuda: string }> = {
  especifico: {
    nombre: 'Específico',
    ayuda: 'Va a uno o varios productos: cuero, taller, trenzador, herrajes, cajas.',
  },
  general: {
    nombre: 'General',
    ayuda: 'Es de toda la tanda, no de un producto: flete, nafta, stickers.',
  },
  arranque: {
    nombre: 'Muestras y moldes',
    ayuda: 'Se paga una sola vez. Se recupera en las primeras carteras de cada modelo.',
  },
  recurrente: {
    nombre: 'Fijo mensual',
    ayuda: 'Se paga todos los meses: Tiendanube, monotributo, dominio.',
  },
}

export const ESTADOS_TANDA = {
  planificada: 'Planificada',
  en_produccion: 'En producción',
  terminada: 'Terminada',
} as const

/** Monto para mostrar en listas: lo que se pagó y, si es compra por mayor, cuánto sale por cartera. */
export function textoMonto(g: Gasto): { principal: string; detalle?: string } {
  if (g.pendiente) return { principal: 'Falta el monto' }
  const detalle: string[] = []
  if (esPorConsumo(g)) {
    if (g.modo_monto === 'por_rendimiento') detalle.push(`trae ${numero(g.rinde ?? 0)}`)
    detalle.push(`${pesos(costoPorCartera(g), true)} por cartera`)
  }
  if (g.sin_iva) detalle.push('IVA incluido')
  if (g.tipo === 'recurrente') detalle.push(g.frecuencia === 'anual' ? 'por año' : 'por mes')
  return { principal: pesos(montoGasto(g)), detalle: detalle.join(' · ') || undefined }
}
