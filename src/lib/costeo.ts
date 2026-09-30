// Motor de cálculo de costos por producto y tanda.
// Todas las funciones son puras: reciben los datos y devuelven los números,
// con una explicación en palabras de cada cuenta.
//
// Dos formas de cargar un gasto:
// - Monto total: lo que se pagó por la tanda se reparte entre sus carteras
//   (ej: el taller cobra $250.000 por 10 Gauchitas → $25.000 cada una).
// - Compra por mayor: se pagó X por N unidades y cada cartera usa M
//   (ej: $13.324 por 100 bolsas, una por cartera → $133 por cartera).
//   No depende de cuántas carteras tenga la tanda: lo que sobra queda como stock.
//
// Las muestras y los moldes (arranque) se recuperan en las primeras carteras
// que se hacen de cada modelo (Configuración → "recuperar en N carteras").

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
  /** costo por cartera, sin muestras ni moldes */
  real: number
  /** muestras y moldes por cartera en esta tanda (promedio si solo una parte todavía los paga) */
  arranque: number
  /** muestras y moldes que paga cada cartera mientras se recuperan */
  arranqueCompleto: number
  conArranque: number
  /** true si alguna cartera de esta tanda todavía paga muestras y moldes */
  absorbeArranque: boolean
  /** cuántas carteras de este modelo recuperan las muestras y cuántas de esta tanda entran */
  recupero: { porModelo: number; antes: number; enEstaTanda: number }
  lineas: Linea[]
  /** costo por cartera separado por categoría (sin muestras ni moldes) */
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

/** true si el gasto se carga por lo que usa cada cartera (compra por mayor). */
export function esPorConsumo(g: Gasto): boolean {
  return g.modo_monto !== 'total'
}

/**
 * Cuánto le cuesta a cada cartera un gasto "por consumo", IVA incluido.
 * Compra por mayor: pagado ÷ lo que trae × lo que usa cada cartera.
 * (Las formas viejas "precio unitario" y "por unidad producida" valen una por cartera.)
 */
export function costoPorCartera(g: Gasto): number {
  if (g.pendiente) return 0
  const f = factorIva(g)
  switch (g.modo_monto) {
    case 'por_rendimiento': {
      const rinde = g.rinde ?? 0
      if (rinde <= 0) return 0
      return ((g.monto ?? 0) * f * (g.uso ?? 1)) / rinde
    }
    case 'unitario':
    case 'por_unidad_tanda':
      return (g.precio_unitario ?? 0) * f
    case 'total':
      return 0
  }
}

/** Explicación de la cuenta de un gasto por consumo. */
function explicarConsumo(g: Gasto): string {
  const pc = pesos(costoPorCartera(g), true)
  const iva = g.sin_iva ? ' (con IVA)' : ''
  if (g.modo_monto === 'por_rendimiento' && (g.rinde ?? 0) === 1 && (g.uso ?? 1) === 1) {
    // una por cartera: alcanza con mostrar el precio (y el IVA, si se sumó)
    return g.sin_iva ? `${pesos(g.monto ?? 0, true)} + 21% IVA = ${pc} por cartera` : `${pc} por cartera`
  }
  if (g.modo_monto === 'por_rendimiento') {
    const pagado = pesos((g.monto ?? 0) * factorIva(g), true)
    const uso = (g.uso ?? 1) !== 1 ? ` × ${numero(g.uso ?? 1)} que usa cada cartera` : ''
    return `${pagado}${iva} ÷ ${numero(g.rinde ?? 0)} que trae${uso} = ${pc} por cartera`
  }
  return `${pc} por cartera${iva}`
}

/** Lo que se pagó por el gasto, IVA incluido. */
export function montoGasto(g: Gasto): number {
  if (g.pendiente) return 0
  const f = factorIva(g)
  switch (g.modo_monto) {
    case 'total':
    case 'por_rendimiento':
      return (g.monto ?? 0) * f
    case 'unitario':
      return (g.precio_unitario ?? 0) * (g.cantidad ?? 0) * f
    case 'por_unidad_tanda':
      return (g.precio_unitario ?? 0) * f
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

/** Tandas ordenadas de la más vieja a la más nueva (por mes; sin fecha, al final). */
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

/** true si el gasto entra en el costeo de esta tanda. */
export function aplicaATanda(g: Gasto, t: Tanda): boolean {
  // Una compra por mayor sin tanda es un precio por cartera: vale para todas.
  if (esPorConsumo(g) && !g.tanda_id) return true
  return g.tanda_id === t.id
}

export function esCuero(d: Datos, g: Gasto): boolean {
  return d.categorias.find((c) => c.id === g.categoria_id)?.es_cuero ?? false
}

function esSub(d: Datos, id: Id): boolean {
  return d.productos.find((x) => x.id === id)?.es_subproducto ?? false
}

/** Productos a los que aplica un gasto específico o de arranque (el cuero no va a subproductos). */
export function productosDelGasto(d: Datos, g: Gasto): Id[] {
  const existentes = g.productos.filter((id) => d.productos.some((x) => x.id === id))
  return esCuero(d, g) ? existentes.filter((id) => !esSub(d, id)) : existentes
}

/** Productos de la tanda que participan del reparto de gastos generales. */
export function participantesGenerales(d: Datos, t: Tanda): Id[] {
  return d.productos
    .filter((x) => unidadesDe(t, x.id) > 0)
    .filter((x) => d.config.subproductos_en_generales || !x.es_subproducto)
    .map((x) => x.id)
}

/** Reparto de un monto entre productos según porcentajes (normalizados a los presentes). */
function repartoPorcentual(reparto: Record<Id, number>, ids: Id[]): Record<Id, number> | null {
  const suma = ids.reduce((a, id) => a + (reparto[id] ?? 0), 0)
  if (suma <= 0) return null
  return Object.fromEntries(ids.map((id) => [id, (reparto[id] ?? 0) / suma]))
}

interface Aporte {
  porUnidad: Record<Id, number>
  explicacion: Record<Id, string>
}

/** Gasto específico: cuánto suma por unidad de cada producto de la tanda. */
function aporteEspecifico(d: Datos, t: Tanda, g: Gasto): Aporte {
  const ids = productosDelGasto(d, g).filter((id) => unidadesDe(t, id) > 0)
  const porUnidad: Record<Id, number> = {}
  const explicacion: Record<Id, string> = {}
  if (ids.length === 0) return { porUnidad, explicacion }

  if (esPorConsumo(g)) {
    for (const id of ids) {
      porUnidad[id] = costoPorCartera(g)
      explicacion[id] = explicarConsumo(g)
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
 * configurado. Para cada producto, cuántas "unidades equivalentes" representa
 * cada una de sus unidades (1 = reparto parejo).
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
      peso: Object.fromEntries(ids.map((id) => [id, (directo[id] ?? 0) / unidadesDe(t, id) / promedio])),
      metodo: 'por costo directo',
    }
  }

  if (d.config.metodo_reparto_generales === 'por_ventas') {
    const v = d.config.ventas_mensuales_por_producto
    const totalV = ids.reduce((a, id) => a + (v[id] ?? 0), 0)
    if (totalV <= 0) return { ...parejo, metodo: 'por unidad (faltan las ventas por producto)' }
    return {
      peso: Object.fromEntries(ids.map((id) => [id, ((v[id] ?? 0) / totalV) * (U / unidadesDe(t, id))])),
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
  const suma = Object.values(config.ventas_mensuales_por_producto).reduce<number>((a, n) => a + (n ?? 0), 0)
  return suma > 0 ? suma : null
}

/** Cantidad de modelos (productos principales), para repartir la recuperación de muestras. */
export function cantidadModelos(d: Datos): number {
  return Math.max(1, d.productos.filter((x) => !x.es_subproducto).length)
}

/** En cuántas carteras de cada modelo se recuperan las muestras y los moldes. */
export function carterasPorModelo(d: Datos): number {
  const total = d.config.arranque_recuperar_en > 0 ? d.config.arranque_recuperar_en : 30
  return total / cantidadModelos(d)
}

/** Unidades de un producto en las tandas anteriores a esta. */
function unidadesAntes(d: Datos, productoId: Id, t: Tanda): number {
  let suma = 0
  for (const x of tandasOrdenadas(d.tandas)) {
    if (x.id === t.id) break
    suma += unidadesDe(x, productoId)
  }
  return suma
}

/**
 * Muestras y moldes de un producto: cuánto paga cada cartera mientras se
 * recuperan, con el detalle por gasto.
 */
export function arranquePorCartera(d: Datos, productoId: Id): { total: number; lineas: Linea[]; faltan: string[] } {
  const porModelo = carterasPorModelo(d)
  const lineas: Linea[] = []
  const faltan: string[] = []
  for (const g of d.gastos.filter((x) => x.tipo === 'arranque')) {
    const ids = productosDelGasto(d, g)
    if (!ids.includes(productoId)) continue
    if (g.pendiente) {
      faltan.push(g.descripcion)
      continue
    }
    const monto = montoGasto(g)
    const pct = g.reparto ? repartoPorcentual(g.reparto, ids) : null
    const parte = pct ? monto * pct[productoId] : monto / ids.length
    const carteras = numero(Math.round(porModelo * 100) / 100)
    const detalle = pct
      ? `${p(monto)} × ${numero(pct[productoId] * 100)}% = ${p(parte)}`
      : ids.length > 1
        ? `${p(monto)} ÷ ${ids.length} modelos = ${p(parte)}`
        : p(monto)
    lineas.push({
      gastoId: g.id,
      descripcion: g.descripcion,
      categoriaId: g.categoria_id,
      tipo: 'arranque',
      porUnidad: parte / porModelo,
      explicacion: `${detalle} ÷ ${carteras} carteras de este modelo = ${p(parte / porModelo)}`,
      estimado: g.estado === 'estimado',
    })
  }
  return { total: lineas.reduce((a, l) => a + l.porUnidad, 0), lineas, faltan }
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

  const deLaTanda = d.gastos.filter((g) => aplicaATanda(g, t))
  const especificos = deLaTanda.filter((g) => g.tipo === 'especifico')
  const generales = deLaTanda.filter((g) => g.tipo === 'general')
  const recurrentes = d.gastos.filter((g) => g.tipo === 'recurrente')

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
    if (esPorConsumo(g)) {
      // lo que va una por cartera (stickers, tarjetas) es parejo
      lineas.push({
        gastoId: g.id,
        descripcion: g.descripcion,
        categoriaId: g.categoria_id,
        tipo: 'general',
        porUnidad: costoPorCartera(g),
        explicacion: explicarConsumo(g),
        estimado: g.estado === 'estimado',
      })
      continue
    }
    const monto = montoGasto(g)
    const base = monto / U
    const pu = base * peso[productoId]
    const cuenta = `${p(monto)} ÷ ${u(U)} = ${p(base)}`
    lineas.push({
      gastoId: g.id,
      descripcion: g.descripcion,
      categoriaId: g.categoria_id,
      tipo: 'general',
      porUnidad: pu,
      explicacion: peso[productoId] === 1 ? cuenta : `${cuenta} × ${numero(peso[productoId])} (reparto ${metodo}) = ${p(pu)}`,
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
  const pesoRec = d.config.metodo_reparto_generales === 'por_costo_directo' ? (peso[productoId] ?? 1) : 1
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

  // --- Muestras y moldes: los pagan las primeras carteras de cada modelo
  const arr = arranquePorCartera(d, productoId)
  faltan.push(...arr.faltan)
  const porModelo = carterasPorModelo(d)
  const antes = unidadesAntes(d, productoId, t)
  const enEstaTanda = Math.min(unidades, Math.max(0, porModelo - antes))
  const fraccion = enEstaTanda / unidades
  if (fraccion > 0) {
    for (const l of arr.lineas) {
      lineas.push({
        ...l,
        porUnidad: l.porUnidad * fraccion,
        explicacion:
          fraccion < 1
            ? `${l.explicacion} (solo ${numero(Math.round(enEstaTanda * 100) / 100)} de las ${unidades} de esta tanda todavía la pagan)`
            : l.explicacion,
      })
    }
  }

  const suma = (tipo: TipoLinea) => lineas.filter((l) => l.tipo === tipo).reduce((a, l) => a + l.porUnidad, 0)
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
  const listar = (tipo: TipoLinea) =>
    lineas
      .filter((l) => l.tipo === tipo)
      .map((l) => p(l.porUnidad))
      .join(' + ')
  // Con un solo gasto, se muestra su cuenta; con varios, la suma.
  const resumen = (tipo: TipoLinea, frase: string, total: number) => {
    const ls = lineas.filter((l) => l.tipo === tipo)
    return ls.length === 1 ? `${ls[0].descripcion}: ${ls[0].explicacion}` : `${frase}: ${listar(tipo)} = ${p(total)}`
  }
  const carteras = numero(Math.round(porModelo * 100) / 100)

  return {
    productoId,
    tandaId: t.id,
    unidades,
    especifico,
    general,
    recurrente,
    real,
    arranque,
    arranqueCompleto: arr.total,
    conArranque: real + arranque,
    absorbeArranque: fraccion > 0 && arr.lineas.length > 0,
    recupero: { porModelo, antes, enEstaTanda },
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
          ? 'Todavía no hay materiales, taller ni packaging cargados para este producto.'
          : resumen('especifico', `Suma de ${n('especifico')} gastos de este producto`, especifico),
      general: !participa
        ? 'Este subproducto no participa de los gastos generales (ver Configuración).'
        : n('general') === 0
          ? 'Todavía no hay gastos generales en esta tanda.'
          : resumen('general', `Gastos generales (${metodo})`, general),
      recurrente: !participaRecurrentes
        ? 'Este subproducto no participa de los gastos fijos (ver Configuración).'
        : recurrentesPendiente
          ? `Hay ${p(totalMensual)} por mes de gastos fijos, pero faltan las ventas mensuales estimadas (Configuración). Por ahora cuenta $ 0.`
          : n('recurrente') === 0
            ? 'Todavía no hay gastos fijos mensuales cargados con monto.'
            : resumen('recurrente', `${p(totalMensual)} por mes repartidos entre las ventas del mes`, recurrente),
      real: `${p(especifico)} + ${p(general)} + ${p(recurrente)} = ${p(real)}`,
      arranque:
        arr.lineas.length === 0
          ? 'No hay muestras ni moldes cargados para este producto.'
          : fraccion === 0
            ? `Las muestras y los moldes ya se recuperaron con las primeras ${carteras} carteras de este modelo.`
            : `Se recuperan en las primeras ${carteras} carteras de este modelo: ${p(arr.total)} cada una.` +
              (fraccion < 1 ? ` En esta tanda solo las pagan ${numero(Math.round(enEstaTanda * 100) / 100)} de ${unidades}.` : ''),
      conArranque: `${p(real)} + ${p(arranque)} de muestras y moldes = ${p(real + arranque)}`,
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
