// Motor de cálculo de costos por producto y tanda.
// Todas las funciones son puras: reciben los datos y devuelven los números,
// con una explicación en palabras de cada cuenta.

import { numero, pesos } from './format'
import type { Categoria, ConfigDatos, Gasto, Id, Producto, Tanda } from './types'

export const IVA = 0.21

export interface Datos {
  productos: Producto[]
  tandas: Tanda[]
  gastos: Gasto[]
  categorias: Categoria[]
  config: ConfigDatos
}

export type TipoLinea = 'especifico' | 'general' | 'recurrente' | 'arranque'

export interface Linea {
  gastoId: Id
  descripcion: string
  categoriaId: Id | null
  tipo: TipoLinea
  porUnidad: number
  explicacion: string
  estimado: boolean
}

export interface CosteoProducto {
  productoId: Id
  tandaId: Id
  unidades: number
  especifico: number
  general: number
  recurrente: number
  real: number
  arranque: number
  conArranque: number
  absorbeArranque: boolean
  lineas: Linea[]
  /** costo real por unidad, separado por categoría */
  porCategoria: { categoriaId: Id | null; monto: number }[]
  incluyeEstimados: boolean
  /** descripciones de gastos sin monto que afectan a este producto */
  faltan: string[]
  /** true si hay recurrentes pero no están cargadas las ventas mensuales */
  recurrentesPendiente: boolean
  explicaciones: {
    especifico: string
    general: string
    recurrente: string
    real: string
    arranque: string
    conArranque: string
  }
}

const u = (n: number) => `${numero(n)} ${n === 1 ? 'unidad' : 'unidades'}`
const p = (n: number) => pesos(n)

/** Factor de IVA: si el gasto se cargó "sin IVA", se suma 21%. */
export function factorIva(g: Gasto): number {
  return g.sin_iva ? 1 + IVA : 1
}

/** Precio por unidad de un gasto cargado "por unidad producida", con IVA. */
export function precioPorUnidad(g: Gasto): number {
  return (g.precio_unitario ?? 0) * factorIva(g)
}

/**
 * Monto total del gasto, IVA incluido. Para "por unidad producida" hace falta
 * saber cuántas unidades cubre (unidadesCubiertas).
 */
export function montoGasto(g: Gasto, unidadesCubiertas = 0): number {
  if (g.pendiente) return 0
  const f = factorIva(g)
  switch (g.modo_monto) {
    case 'total':
      return (g.monto ?? 0) * f
    case 'unitario':
      return (g.precio_unitario ?? 0) * (g.cantidad ?? 0) * f
    case 'por_unidad_tanda':
      return precioPorUnidad(g) * unidadesCubiertas
  }
}

/** Monto mensual de un gasto recurrente (los anuales se dividen por 12). */
export function montoMensual(g: Gasto): number {
  const m = montoGasto(g)
  return g.frecuencia === 'anual' ? m / 12 : m
}

export function unidadesDe(t: Tanda, productoId: Id): number {
  return Math.max(0, Number(t.unidades[productoId] ?? 0))
}

export function totalUnidades(t: Tanda): number {
  return Object.values(t.unidades).reduce((a, n) => a + Math.max(0, Number(n) || 0), 0)
}

/** Tandas ordenadas de la más vieja a la más nueva (por fecha; sin fecha, al final). */
export function tandasOrdenadas(tandas: Tanda[]): Tanda[] {
  return tandas
    .map((t, i) => ({ t, i }))
    .sort((a, b) => {
      const fa = a.t.fecha ?? '9999'
      const fb = b.t.fecha ?? '9999'
      return fa === fb ? a.i - b.i : fa < fb ? -1 : 1
    })
    .map((x) => x.t)
}

/** Tanda que absorbe los gastos de arranque de un producto. */
export function tandaArranque(d: Datos, productoId: Id): Tanda | null {
  const elegida = d.config.arranque_tanda[productoId]
  if (elegida) {
    const t = d.tandas.find((x) => x.id === elegida)
    if (t && unidadesDe(t, productoId) > 0) return t
  }
  return tandasOrdenadas(d.tandas).find((t) => unidadesDe(t, productoId) > 0) ?? null
}

function esCuero(d: Datos, g: Gasto): boolean {
  return d.categorias.find((c) => c.id === g.categoria_id)?.es_cuero ?? false
}

function esSub(d: Datos, id: Id): boolean {
  return d.productos.find((x) => x.id === id)?.es_subproducto ?? false
}

/** Productos a los que aplica un gasto específico o de arranque (el cuero no va a subproductos). */
function productosDelGasto(d: Datos, g: Gasto): Id[] {
  const existentes = g.productos.filter((id) => d.productos.some((x) => x.id === id))
  return esCuero(d, g) ? existentes.filter((id) => !esSub(d, id)) : existentes
}

/** Productos de la tanda que participan del reparto de gastos generales. */
function participantesGenerales(d: Datos, t: Tanda): Id[] {
  return d.productos
    .filter((x) => unidadesDe(t, x.id) > 0)
    .filter((x) => d.config.subproductos_en_generales || !x.es_subproducto)
    .map((x) => x.id)
}

/** Reparto de un monto entre productos según porcentajes (normalizados a los presentes). */
function repartoPorcentual(
  reparto: Record<Id, number>,
  ids: Id[],
): Record<Id, number> | null {
  const suma = ids.reduce((a, id) => a + (reparto[id] ?? 0), 0)
  if (suma <= 0) return null
  return Object.fromEntries(ids.map((id) => [id, (reparto[id] ?? 0) / suma]))
}

interface Aporte {
  porUnidad: Record<Id, number>
  explicacion: Record<Id, string>
}

/** Gastos específicos de una tanda: cuánto suma cada uno por unidad de cada producto. */
function aporteEspecifico(d: Datos, t: Tanda, g: Gasto): Aporte {
  const ids = productosDelGasto(d, g).filter((id) => unidadesDe(t, id) > 0)
  const porUnidad: Record<Id, number> = {}
  const explicacion: Record<Id, string> = {}
  if (ids.length === 0) return { porUnidad, explicacion }

  if (g.modo_monto === 'por_unidad_tanda') {
    const pu = precioPorUnidad(g)
    for (const id of ids) {
      porUnidad[id] = pu
      explicacion[id] = g.sin_iva
        ? `${pesos(g.precio_unitario ?? 0, true)} + 21% IVA = ${pesos(pu, true)} por unidad`
        : `${pesos(pu, true)} por unidad`
    }
    return { porUnidad, explicacion }
  }

  const monto = montoGasto(g)
  const pct = g.reparto ? repartoPorcentual(g.reparto, ids) : null
  if (pct) {
    for (const id of ids) {
      const parte = monto * pct[id]
      const n = unidadesDe(t, id)
      porUnidad[id] = parte / n
      explicacion[id] = `${p(monto)} × ${numero(pct[id] * 100)}% = ${p(parte)} ÷ ${u(n)} = ${p(parte / n)}`
    }
  } else {
    const n = ids.reduce((a, id) => a + unidadesDe(t, id), 0)
    for (const id of ids) {
      porUnidad[id] = monto / n
      explicacion[id] = `${p(monto)} ÷ ${u(n)} = ${p(monto / n)}`
    }
  }
  return { porUnidad, explicacion }
}

/** Costo específico total de cada producto en la tanda (para el reparto "por costo directo"). */
function costoDirectoPorProducto(d: Datos, t: Tanda, gastos: Gasto[]): Record<Id, number> {
  const total: Record<Id, number> = {}
  for (const g of gastos) {
    const a = aporteEspecifico(d, t, g)
    for (const [id, pu] of Object.entries(a.porUnidad)) {
      total[id] = (total[id] ?? 0) + pu * unidadesDe(t, id)
    }
  }
  return total
}

/**
 * Pesos por producto para repartir generales y recurrentes, según el método
 * configurado. Devuelve, para cada producto, cuántas "unidades equivalentes"
 * representa cada una de sus unidades (1 = reparto parejo).
 */
function pesosReparto(
  d: Datos,
  t: Tanda,
  ids: Id[],
  directo: Record<Id, number>,
): { peso: Record<Id, number>; metodo: string } {
  const parejo = { peso: Object.fromEntries(ids.map((id) => [id, 1])), metodo: 'por unidad' }
  const U = ids.reduce((a, id) => a + unidadesDe(t, id), 0)
  if (U === 0) return parejo

  if (d.config.metodo_reparto_generales === 'por_costo_directo') {
    const totalDirecto = ids.reduce((a, id) => a + (directo[id] ?? 0), 0)
    if (totalDirecto <= 0) return { ...parejo, metodo: 'por unidad (todavía no hay costos directos)' }
    const promedio = totalDirecto / U
    return {
      peso: Object.fromEntries(
        ids.map((id) => [id, (directo[id] ?? 0) / unidadesDe(t, id) / promedio]),
      ),
      metodo: 'por costo directo',
    }
  }

  if (d.config.metodo_reparto_generales === 'por_ventas') {
    const v = d.config.ventas_mensuales_por_producto
    const totalV = ids.reduce((a, id) => a + (v[id] ?? 0), 0)
    if (totalV <= 0) return { ...parejo, metodo: 'por unidad (faltan las ventas por producto)' }
    // cada producto absorbe según su parte de las ventas, dividida por sus unidades
    return {
      peso: Object.fromEntries(
        ids.map((id) => [id, ((v[id] ?? 0) / totalV) * (U / unidadesDe(t, id))]),
      ),
      metodo: 'por volumen de ventas',
    }
  }
  return parejo
}

/** Ventas mensuales estimadas en total (null si no están cargadas). */
export function ventasMensuales(config: ConfigDatos): number | null {
  if (config.ventas_mensuales_modo === 'total') {
    return config.ventas_mensuales_total && config.ventas_mensuales_total > 0
      ? config.ventas_mensuales_total
      : null
  }
  const suma = Object.values(config.ventas_mensuales_por_producto).reduce<number>(
    (a, n) => a + (n ?? 0),
    0,
  )
  return suma > 0 ? suma : null
}

/** Costeo de un producto en una tanda. */
export function costearProducto(d: Datos, productoId: Id, tandaId: Id): CosteoProducto | null {
  const t = d.tandas.find((x) => x.id === tandaId)
  const producto = d.productos.find((x) => x.id === productoId)
  if (!t || !producto) return null
  const unidades = unidadesDe(t, productoId)
  if (unidades === 0) return null

  const lineas: Linea[] = []
  const faltan: string[] = []
  const conMonto = (g: Gasto) => !g.pendiente

  const deLaTanda = d.gastos.filter((g) => g.tanda_id === t.id)
  const especificos = deLaTanda.filter((g) => g.tipo === 'especifico')
  const generales = deLaTanda.filter((g) => g.tipo === 'general')
  const recurrentes = d.gastos.filter((g) => g.tipo === 'recurrente')
  const arranques = d.gastos.filter((g) => g.tipo === 'arranque')

  // --- Específicos
  for (const g of especificos) {
    if (!productosDelGasto(d, g).includes(productoId)) continue
    if (!conMonto(g)) {
      faltan.push(g.descripcion)
      continue
    }
    const a = aporteEspecifico(d, t, g)
    if (a.porUnidad[productoId] === undefined) continue
    lineas.push({
      gastoId: g.id,
      descripcion: g.descripcion,
      categoriaId: g.categoria_id,
      tipo: 'especifico',
      porUnidad: a.porUnidad[productoId],
      explicacion: a.explicacion[productoId],
      estimado: g.estado === 'estimado',
    })
  }
  // Pendientes específicos todavía sin tanda que aplican a este producto
  for (const g of d.gastos) {
    if (g.tipo === 'especifico' && g.pendiente && !g.tanda_id && g.productos.includes(productoId))
      faltan.push(g.descripcion)
  }

  // --- Generales
  const participantes = participantesGenerales(d, t)
  const participa = participantes.includes(productoId)
  const directo = costoDirectoPorProducto(d, t, especificos.filter(conMonto))
  const { peso, metodo } = pesosReparto(d, t, participantes, directo)
  const U = participantes.reduce((a, id) => a + unidadesDe(t, id), 0)
  for (const g of generales) {
    if (!participa) continue
    if (!conMonto(g)) {
      faltan.push(g.descripcion)
      continue
    }
    const monto = montoGasto(g, U)
    const base = monto / U
    // lo que se paga "por unidad producida" (bolsas, cajas) es parejo: una por unidad
    const unoPorUnidad = g.modo_monto === 'por_unidad_tanda'
    const pu = unoPorUnidad ? base : base * peso[productoId]
    const cuenta =
      g.modo_monto === 'por_unidad_tanda'
        ? `${pesos(precioPorUnidad(g), true)} por unidad`
        : `${p(monto)} ÷ ${u(U)} = ${p(base)}`
    lineas.push({
      gastoId: g.id,
      descripcion: g.descripcion,
      categoriaId: g.categoria_id,
      tipo: 'general',
      porUnidad: pu,
      explicacion:
        peso[productoId] === 1 || unoPorUnidad
          ? cuenta
          : `${cuenta} × ${numero(peso[productoId])} (reparto ${metodo}) = ${p(pu)}`,
      estimado: g.estado === 'estimado',
    })
  }
  for (const g of d.gastos) {
    if (g.tipo === 'general' && g.pendiente && !g.tanda_id && participa) faltan.push(g.descripcion)
  }

  // --- Recurrentes mensuales
  const participaRecurrentes = d.config.subproductos_en_generales || !producto.es_subproducto
  const ventas = ventasMensuales(d.config)
  const recurrentesConMonto = recurrentes.filter(conMonto)
  const totalMensual = recurrentesConMonto.reduce((a, g) => a + montoMensual(g), 0)
  let recurrentesPendiente = false
  // Con reparto por ventas, cada unidad vendida paga lo mismo del gasto fijo mensual.
  const pesoRec =
    d.config.metodo_reparto_generales === 'por_costo_directo' ? (peso[productoId] ?? 1) : 1
  if (participaRecurrentes) {
    for (const g of recurrentes) if (!conMonto(g)) faltan.push(g.descripcion)
    if (recurrentesConMonto.length > 0 && ventas === null) recurrentesPendiente = true
    if (ventas !== null) {
      for (const g of recurrentesConMonto) {
        const mensual = montoMensual(g)
        const base = mensual / ventas
        const pu = base * pesoRec
        const anual = g.frecuencia === 'anual' ? `${p(montoGasto(g))} ÷ 12 meses = ` : ''
        lineas.push({
          gastoId: g.id,
          descripcion: g.descripcion,
          categoriaId: g.categoria_id,
          tipo: 'recurrente',
          porUnidad: pu,
          explicacion: `${anual}${p(mensual)} por mes ÷ ${u(ventas)} vendidas por mes = ${p(base)}${
            pesoRec !== 1 ? ` × ${numero(pesoRec)} (reparto ${metodo}) = ${p(pu)}` : ''
          }`,
          estimado: g.estado === 'estimado',
        })
      }
    }
  }

  // --- Arranque: solo en la tanda que lo absorbe
  const absorbe = tandaArranque(d, productoId)?.id === t.id
  if (absorbe) {
    for (const g of arranques) {
      const ids = productosDelGasto(d, g)
      if (!ids.includes(productoId)) continue
      if (!conMonto(g)) {
        faltan.push(g.descripcion)
        continue
      }
      const monto = montoGasto(g)
      const pct = g.reparto ? repartoPorcentual(g.reparto, ids) : null
      const parte = pct ? monto * pct[productoId] : monto / ids.length
      const detalleParte = pct
        ? `${p(monto)} × ${numero(pct[productoId] * 100)}%`
        : ids.length > 1
          ? `${p(monto)} ÷ ${ids.length} productos`
          : p(monto)
      lineas.push({
        gastoId: g.id,
        descripcion: g.descripcion,
        categoriaId: g.categoria_id,
        tipo: 'arranque',
        porUnidad: parte / unidades,
        explicacion:
          ids.length > 1 || pct
            ? `${detalleParte} = ${p(parte)} ÷ ${u(unidades)} = ${p(parte / unidades)}`
            : `${p(monto)} ÷ ${u(unidades)} = ${p(parte / unidades)}`,
        estimado: g.estado === 'estimado',
      })
    }
  } else {
    for (const g of arranques)
      if (g.pendiente && productosDelGasto(d, g).includes(productoId) && !tandaArranque(d, productoId))
        faltan.push(g.descripcion)
  }

  const suma = (tipo: TipoLinea) =>
    lineas.filter((l) => l.tipo === tipo).reduce((a, l) => a + l.porUnidad, 0)
  const especifico = suma('especifico')
  const general = suma('general')
  const recurrente = suma('recurrente')
  const arranque = suma('arranque')
  const real = especifico + general + recurrente

  const cats = new Map<Id | null, number>()
  for (const l of lineas) {
    if (l.tipo === 'arranque') continue
    cats.set(l.categoriaId, (cats.get(l.categoriaId) ?? 0) + l.porUnidad)
  }

  const n = (tipo: TipoLinea) => lineas.filter((l) => l.tipo === tipo).length
  const listar = (tipo: TipoLinea, vacio: string) =>
    n(tipo) === 0
      ? vacio
      : lineas
          .filter((l) => l.tipo === tipo)
          .map((l) => p(l.porUnidad))
          .join(' + ')
  // Con un solo gasto, se muestra su cuenta; con varios, la suma.
  const resumen = (tipo: TipoLinea, frase: string, total: number) => {
    const ls = lineas.filter((l) => l.tipo === tipo)
    return ls.length === 1
      ? `${ls[0].descripcion}: ${ls[0].explicacion}`
      : `${frase}: ${listar(tipo, '')} = ${p(total)}`
  }

  return {
    productoId,
    tandaId: t.id,
    unidades,
    especifico,
    general,
    recurrente,
    real,
    arranque,
    conArranque: real + arranque,
    absorbeArranque: absorbe,
    lineas,
    porCategoria: [...cats.entries()]
      .map(([categoriaId, monto]) => ({ categoriaId, monto }))
      .sort((a, b) => b.monto - a.monto),
    incluyeEstimados: lineas.some((l) => l.estimado),
    faltan: [...new Set(faltan)],
    recurrentesPendiente,
    explicaciones: {
      especifico:
        n('especifico') === 0
          ? 'Todavía no hay gastos específicos de este producto en esta tanda.'
          : resumen('especifico', `Suma de ${n('especifico')} gastos asignados a este producto`, especifico),
      general: !participa
        ? 'Este subproducto no participa de los gastos generales (ver Configuración).'
        : n('general') === 0
          ? 'Todavía no hay gastos generales en esta tanda.'
          : resumen('general', `Gastos generales repartidos ${metodo} entre las ${u(U)} de la tanda`, general),
      recurrente: !participaRecurrentes
        ? 'Este subproducto no participa de los gastos recurrentes (ver Configuración).'
        : recurrentesPendiente
          ? `Hay ${p(totalMensual)} por mes de gastos fijos, pero faltan las ventas mensuales estimadas (Configuración). Por ahora cuenta $ 0.`
          : n('recurrente') === 0
            ? 'Todavía no hay gastos recurrentes cargados con monto.'
            : `${p(totalMensual)} por mes ÷ ${u(ventas ?? 0)} vendidas por mes = ${p(recurrente)}`,
      real: `${p(especifico)} específicos + ${p(general)} generales + ${p(recurrente)} recurrentes = ${p(real)}`,
      arranque: absorbe
        ? n('arranque') === 0
          ? 'No hay gastos de arranque cargados para este producto.'
          : resumen('arranque', `Muestras y moldes repartidos entre las ${u(unidades)} de esta tanda`, arranque)
        : 'Los gastos de arranque se cargan en otra tanda (la primera de este producto).',
      conArranque: `${p(real)} costo real + ${p(arranque)} arranque = ${p(real + arranque)}`,
    },
  }
}

/** Tanda de referencia para mostrar un producto en el resumen: la más reciente donde aparece. */
export function tandaReferencia(d: Datos, productoId: Id): Tanda | null {
  const conProducto = tandasOrdenadas(d.tandas).filter((t) => unidadesDe(t, productoId) > 0)
  return conProducto[conProducto.length - 1] ?? null
}

/** Total invertido en gastos de arranque (sin pendientes). */
export function totalArranque(gastos: Gasto[]): number {
  return gastos.filter((g) => g.tipo === 'arranque').reduce((a, g) => a + montoGasto(g), 0)
}
