import type { ConfigDatos, Gasto } from './types'

export interface Pendiente {
  texto: string
  enlace: string
}

/** Lista de datos que faltan cargar, para mostrar en amarillo en Inicio. */
export function calcularPendientes(config: ConfigDatos, gastos: Gasto[]): Pendiente[] {
  const lista: Pendiente[] = []
  const c = config.comisiones

  const mpFaltan = config.medios_ofrecidos.some((m) => c[m] === null)
  if (mpFaltan) lista.push({ texto: 'Comisiones de Mercado Pago', enlace: '/configuracion' })
  if (c.tiendanube === null) lista.push({ texto: 'Comisión de Tiendanube', enlace: '/configuracion' })

  const sinVentas =
    config.ventas_mensuales_modo === 'total'
      ? config.ventas_mensuales_total === null
      : Object.values(config.ventas_mensuales_por_producto).every((v) => v == null)
  if (sinVentas) lista.push({ texto: 'Ventas mensuales estimadas', enlace: '/configuracion' })

  for (const g of gastos) {
    if (g.pendiente) lista.push({ texto: `Falta cargar: ${g.descripcion}`, enlace: `/gastos/${g.id}` })
  }
  return lista
}
