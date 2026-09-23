// Precio sugerido de venta, comisiones y calculadora inversa.
//
// Fórmula (no cambiar): Precio = Costo ÷ (1 − margen − comisiones)
// Margen y comisiones son % SOBRE EL PRECIO DE VENTA. No se usa costo × (1 + %),
// porque esa cuenta hace perder plata.

import type { ConfigDatos, MedioPago } from './types'

export const IVA_COMISIONES = 0.21

export const MEDIOS: Record<MedioPago, string> = {
  mp_transferencia: 'Transferencia',
  mp_debito: 'Débito',
  mp_credito_1: 'Crédito en 1 pago',
  mp_3_cuotas: '3 cuotas sin interés',
  mp_6_cuotas: '6 cuotas sin interés',
}

export interface Comision {
  /** medio de pago más caro de los ofrecidos (el que define el precio) */
  medio: MedioPago | null
  /** fracciones sobre el precio de venta */
  tiendanube: number
  mercadoPago: number
  iva: number
  iibb: number
  total: number
  pendientes: string[]
}

const frac = (n: number | null) => (n ?? 0) / 100

/** Comisión de un medio de pago en particular (Tiendanube + Mercado Pago + IVA + IIBB). */
export function comisionDe(config: ConfigDatos, medio: MedioPago | null): Comision {
  const c = config.comisiones
  const tiendanube = frac(c.tiendanube)
  const mercadoPago = medio ? frac(c[medio]) : 0
  const iva = config.iva_comisiones ? (tiendanube + mercadoPago) * IVA_COMISIONES : 0
  const iibb = frac(config.retencion_iibb)
  const pendientes: string[] = []
  if (c.tiendanube === null) pendientes.push('comisión de Tiendanube')
  if (medio && c[medio] === null) pendientes.push(`Mercado Pago: ${MEDIOS[medio].toLowerCase()}`)
  return { medio, tiendanube, mercadoPago, iva, iibb, total: tiendanube + mercadoPago + iva + iibb, pendientes }
}

/**
 * El precio es uno solo para todos, así que se calcula con el medio de pago
 * más caro de los que Loli ofrece.
 */
export function comisionAplicada(config: ConfigDatos): Comision {
  const medios = config.medios_ofrecidos.length ? config.medios_ofrecidos : [null]
  const opciones = medios.map((m) => comisionDe(config, m))
  const masCara = opciones.reduce((a, b) => (b.total > a.total ? b : a))
  // Los pendientes son de todos los medios ofrecidos, no solo del más caro.
  masCara.pendientes = [...new Set(opciones.flatMap((o) => o.pendientes))]
  return masCara
}

/** Redondea hacia arriba (redondear para abajo le sacaría margen). */
export function redondear(precio: number, a: number): number {
  return a > 0 ? Math.ceil(precio / a) * a : precio
}

/** Precio = Costo ÷ (1 − margen − comisiones). Devuelve null si no hay precio posible. */
export function precioSugerido(costo: number, margen: number, comision: number): number | null {
  const resto = 1 - margen - comision
  if (resto <= 0) return null
  return costo / resto
}

export interface DesglosePrecio {
  precio: number
  costo: number
  tiendanube: number
  mercadoPago: number
  iva: number
  iibb: number
  comisiones: number
  /** lo que entra después de comisiones e impuestos */
  neto: number
  ganancia: number
  /** ganancia ÷ precio */
  margenReal: number
}

/** Calculadora inversa: con este precio, ¿cuánto queda? */
export function desglosar(precio: number, costo: number, c: Comision): DesglosePrecio {
  const tiendanube = precio * c.tiendanube
  const mercadoPago = precio * c.mercadoPago
  const iva = precio * c.iva
  const iibb = precio * c.iibb
  const comisiones = tiendanube + mercadoPago + iva + iibb
  const neto = precio - comisiones
  const ganancia = neto - costo
  return {
    precio,
    costo,
    tiendanube,
    mercadoPago,
    iva,
    iibb,
    comisiones,
    neto,
    ganancia,
    margenReal: precio > 0 ? ganancia / precio : 0,
  }
}

/** Precio sugerido listo para mostrar: calculado, redondeado y desglosado. */
export function precioFinal(
  costo: number,
  margenPct: number,
  config: ConfigDatos,
): { exacto: number; precio: number; desglose: DesglosePrecio } | null {
  const c = comisionAplicada(config)
  const exacto = precioSugerido(costo, margenPct / 100, c.total)
  if (exacto === null) return null
  const precio = redondear(exacto, config.redondeo)
  return { exacto, precio, desglose: desglosar(precio, costo, c) }
}
