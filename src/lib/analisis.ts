// Tablero de resultados: junta el costeo y los precios de todos los productos
// y arma porcentajes, comparativas y recomendaciones.

import {
  costearProducto,
  montoGasto,
  tandaReferencia,
  unidadesDe,
  type CosteoProducto,
  type Datos,
  type TipoLinea,
} from './costeo'
import { pct, pesos } from './format'
import { comisionAplicada, comisionDe, MEDIOS, precioFinal, type Comision, type DesglosePrecio } from './precios'
import type { Gasto, Id, MedioPago, Producto, Tanda } from './types'

export interface Filtros {
  productoId: Id | 'todos'
  /** 'ultima' = la tanda más reciente de cada producto */
  tandaId: Id | 'ultima'
  base: 'real' | 'arranque'
  margen: number
}

export interface FilaProducto {
  producto: Producto
  tanda: Tanda
  unidades: number
  costeo: CosteoProducto
  /** costo por unidad usado (real o con arranque, según el filtro) */
  costo: number
  precio: { exacto: number; precio: number; desglose: DesglosePrecio } | null
}

export interface Parte {
  clave: string
  nombre: string
  /** total en la tanda (costo por unidad × unidades) */
  total: number
  porUnidad: number
  pct: number
}

export type TipoRecomendacion = 'ahorro' | 'precio' | 'alerta' | 'dato'

export interface Recomendacion {
  tipo: TipoRecomendacion
  titulo: string
  texto: string
  /** ahorro estimado por unidad, si aplica */
  ahorroPorUnidad?: number
}

export interface Analisis {
  filas: FilaProducto[]
  comision: Comision
  totales: {
    unidades: number
    costo: number
    venta: number
    comisiones: number
    ganancia: number
    costoPromedio: number
    precioPromedio: number
    gananciaPromedio: number
    margenPromedio: number
  }
  porCategoria: Parte[]
  porTipo: Parte[]
  pctEstimado: number
  faltan: string[]
  inversion: {
    total: number
    gastos: Gasto[]
    pendientes: number
    unidadesParaRecuperar: number | null
  }
  recomendaciones: Recomendacion[]
}

const NOMBRE_TIPO: Record<TipoLinea, string> = {
  especifico: 'Específicos del producto',
  general: 'Generales de la tanda',
  recurrente: 'Fijos mensuales',
  arranque: 'Arranque (muestras, moldes)',
}

/** Productos y tandas que entran en el análisis según los filtros. */
export function filasDelAnalisis(d: Datos, f: Filtros): FilaProducto[] {
  const productos = f.productoId === 'todos' ? d.productos : d.productos.filter((p) => p.id === f.productoId)
  const filas: FilaProducto[] = []
  for (const producto of productos) {
    const tanda =
      f.tandaId === 'ultima' ? tandaReferencia(d, producto.id) : d.tandas.find((t) => t.id === f.tandaId)
    if (!tanda || unidadesDe(tanda, producto.id) === 0) continue
    const costeo = costearProducto(d, producto.id, tanda.id)
    if (!costeo) continue
    const costo = f.base === 'arranque' ? costeo.conArranque : costeo.real
    filas.push({
      producto,
      tanda,
      unidades: costeo.unidades,
      costeo,
      costo,
      precio: precioFinal(costo, f.margen, d.config),
    })
  }
  return filas
}

function partes(mapa: Map<string, { nombre: string; total: number }>, unidades: number): Parte[] {
  const suma = [...mapa.values()].reduce((a, x) => a + x.total, 0)
  return [...mapa.entries()]
    .map(([clave, x]) => ({
      clave,
      nombre: x.nombre,
      total: x.total,
      porUnidad: unidades > 0 ? x.total / unidades : 0,
      pct: suma > 0 ? x.total / suma : 0,
    }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
}

export function analizar(d: Datos, f: Filtros): Analisis {
  const filas = filasDelAnalisis(d, f)
  const comision = comisionAplicada(d.config)
  const incluir = (t: TipoLinea) => t !== 'arranque' || f.base === 'arranque'

  // --- Totales
  let unidades = 0
  let costo = 0
  let venta = 0
  let comisiones = 0
  let ganancia = 0
  for (const x of filas) {
    unidades += x.unidades
    costo += x.costo * x.unidades
    if (x.precio) {
      venta += x.precio.precio * x.unidades
      comisiones += x.precio.desglose.comisiones * x.unidades
      ganancia += x.precio.desglose.ganancia * x.unidades
    }
  }

  // --- Composición del costo
  const cats = new Map<string, { nombre: string; total: number }>()
  const tipos = new Map<string, { nombre: string; total: number }>()
  let estimado = 0
  let totalLineas = 0
  for (const x of filas) {
    for (const l of x.costeo.lineas) {
      if (!incluir(l.tipo)) continue
      const total = l.porUnidad * x.unidades
      const clave = l.categoriaId ?? 'sin'
      const nombre = d.categorias.find((c) => c.id === l.categoriaId)?.nombre ?? 'Sin categoría'
      cats.set(clave, { nombre, total: (cats.get(clave)?.total ?? 0) + total })
      tipos.set(l.tipo, { nombre: NOMBRE_TIPO[l.tipo], total: (tipos.get(l.tipo)?.total ?? 0) + total })
      totalLineas += total
      if (l.estimado) estimado += total
    }
  }
  const porCategoria = partes(cats, unidades)
  const porTipo = partes(tipos, unidades)
  const faltan = [...new Set(filas.flatMap((x) => x.costeo.faltan))]

  // --- Inversión inicial
  const arranques = d.gastos.filter((g) => g.tipo === 'arranque')
  const inversionTotal = arranques.reduce((a, g) => a + montoGasto(g), 0)
  const gananciaPromedio = unidades > 0 ? ganancia / unidades : 0
  const hayPrecios = filas.some((x) => x.precio)

  const a: Analisis = {
    filas,
    comision,
    totales: {
      unidades,
      costo,
      venta,
      comisiones,
      ganancia,
      costoPromedio: unidades > 0 ? costo / unidades : 0,
      precioPromedio: unidades > 0 ? venta / unidades : 0,
      gananciaPromedio,
      margenPromedio: venta > 0 ? ganancia / venta : 0,
    },
    porCategoria,
    porTipo,
    pctEstimado: totalLineas > 0 ? estimado / totalLineas : 0,
    faltan,
    inversion: {
      total: inversionTotal,
      gastos: arranques,
      pendientes: arranques.filter((g) => g.pendiente).length,
      unidadesParaRecuperar:
        hayPrecios && gananciaPromedio > 0 ? Math.ceil(inversionTotal / gananciaPromedio) : null,
    },
    recomendaciones: [],
  }
  a.recomendaciones = recomendar(d, f, a)
  return a
}

/** Consejo según la categoría de gasto (por palabras del nombre). */
function consejoCategoria(nombre: string): string {
  const n = nombre.toLowerCase()
  if (n.includes('cuero'))
    return 'Preguntá precio por volumen o por cuero entero, y aprovechá los recortes para subproductos (llaveros, monederos): así cada chapa te rinde más.'
  if (n.includes('taller') || n.includes('mano de obra'))
    return 'Muchos talleres bajan el precio por unidad en tandas más grandes: preguntá desde qué cantidad cambia.'
  if (n.includes('trenz'))
    return 'Consultá precio por cantidad de manijas o por metro; en tandas más grandes suele bajar.'
  if (n.includes('packaging'))
    return 'Probá una versión más simple (por ejemplo, bolsa de lienzo sin caja, o caja solo para regalo) o cotizá un segundo proveedor.'
  if (n.includes('flete') || n.includes('nafta') || n.includes('traslado'))
    return 'Juntá los viajes: un solo flete o traslado por tanda en vez de varios.'
  if (n.includes('insumo') || n.includes('herraje') || n.includes('cierre'))
    return 'Comprar herrajes y cierres para varias tandas juntas suele salir más barato por unidad.'
  return 'Cotizá un segundo proveedor para comparar.'
}

function recomendar(d: Datos, f: Filtros, a: Analisis): Recomendacion[] {
  const r: Recomendacion[] = []
  const { totales } = a
  const u = totales.unidades
  if (a.filas.length === 0) return r
  const unSolo = f.productoId !== 'todos' ? a.filas[0]?.producto.nombre : null
  const porCartera = unSolo ? `por ${unSolo}` : 'por cartera, en promedio'

  // 1. Lo que más pesa
  const top = a.porCategoria[0]
  if (top && top.pct > 0) {
    const ahorro = top.porUnidad * 0.1
    r.push({
      tipo: 'ahorro',
      titulo: `${top.nombre} es lo que más pesa: ${pct(Math.round(top.pct * 100))} del costo`,
      texto: `Son ${pesos(top.porUnidad)} ${porCartera}. ${consejoCategoria(top.nombre)} Si conseguís un 10% menos, ahorrás ${pesos(ahorro)} por cartera (${pesos(ahorro * u)} en la tanda).`,
      ahorroPorUnidad: ahorro,
    })
  }

  // 2. Packaging, si pesa mucho y no es lo primero
  const pack = a.porCategoria.find((x) => x.nombre.toLowerCase().includes('packaging'))
  if (pack && pack !== top && pack.pct >= 0.1) {
    r.push({
      tipo: 'ahorro',
      titulo: `El packaging es el ${pct(Math.round(pack.pct * 100))} del costo`,
      texto: `${pesos(pack.porUnidad)} ${porCartera}. ${consejoCategoria('packaging')}`,
      ahorroPorUnidad: pack.porUnidad * 0.3,
    })
  }

  // 3. Tamaño de la tanda: los generales se diluyen con más unidades
  const generales = a.porTipo.find((x) => x.clave === 'general')
  if (generales && generales.porUnidad > 0) {
    const mitad = generales.porUnidad / 2
    r.push({
      tipo: 'ahorro',
      titulo: 'Tandas más grandes bajan los gastos generales',
      texto: `Flete, nafta y otros gastos generales suman ${pesos(generales.porUnidad)} ${porCartera}. Si hacés el doble de unidades con los mismos gastos, bajan a ${pesos(mitad)}.`,
      ahorroPorUnidad: mitad,
    })
  }

  // 4. Medio de pago más caro
  const ofrecidos = d.config.medios_ofrecidos
  if (ofrecidos.length > 1 && a.comision.medio && a.comision.pendientes.length === 0) {
    const resto = ofrecidos.filter((m) => m !== a.comision.medio)
    const siguiente = resto
      .map((m) => comisionDe(d.config, m as MedioPago))
      .reduce((x, y) => (y.total > x.total ? y : x))
    const diferencia = a.comision.total - siguiente.total
    const fila = a.filas.find((x) => x.precio)
    if (diferencia > 0.001 && fila) {
      const otro = precioFinal(fila.costo, f.margen, {
        ...d.config,
        medios_ofrecidos: resto,
      })
      if (otro && fila.precio && otro.precio < fila.precio.precio) {
        r.push({
          tipo: 'precio',
          titulo: `Tu precio lo define ${MEDIOS[a.comision.medio].toLowerCase()}`,
          texto: `Es el medio de pago más caro que ofrecés (${pct(Math.round(a.comision.total * 1000) / 10)} entre comisiones e impuestos). Sin ofrecerlo, la ${fila.producto.nombre} podría costar ${pesos(otro.precio)} en vez de ${pesos(fila.precio.precio)} con el mismo margen.`,
        })
      }
    }
  }

  // 5. Comisiones sin cargar
  if (a.comision.pendientes.length > 0) {
    r.push({
      tipo: 'alerta',
      titulo: 'Los precios todavía no incluyen todas las comisiones',
      texto: `Falta cargar: ${a.comision.pendientes.join(', ')} (en Configuración). Hasta entonces, el precio sugerido queda más bajo de lo que debería.`,
    })
  }

  // 6. Datos que faltan
  if (a.faltan.length > 0) {
    r.push({
      tipo: 'alerta',
      titulo: `Faltan ${a.faltan.length} ${a.faltan.length === 1 ? 'gasto' : 'gastos'} por cotizar`,
      texto: `${a.faltan.join(', ')}. Mientras no tengan monto, el costo real va a ser más alto que el que ves.`,
    })
  }

  // 7. Presupuestos sin confirmar
  if (a.pctEstimado >= 0.2) {
    r.push({
      tipo: 'dato',
      titulo: `El ${pct(Math.round(a.pctEstimado * 100))} del costo sale de presupuestos`,
      texto: 'Son gastos cargados como "estimado". Cuando los pagues, pasalos a "real" y actualizá el monto para que el número sea exacto.',
    })
  }

  // 8. Producto que menos deja
  const conPrecio = a.filas.filter((x) => x.precio)
  if (f.productoId === 'todos' && conPrecio.length > 1) {
    const peor = conPrecio.reduce((x, y) => (y.precio!.desglose.ganancia < x.precio!.desglose.ganancia ? y : x))
    const mejor = conPrecio.reduce((x, y) => (y.precio!.desglose.ganancia > x.precio!.desglose.ganancia ? y : x))
    if (peor !== mejor) {
      r.push({
        tipo: 'dato',
        titulo: `${mejor.producto.nombre} es la que más deja por unidad`,
        texto: `Con un margen del ${f.margen}%: ${mejor.producto.nombre} deja ${pesos(mejor.precio!.desglose.ganancia)} por unidad y ${peor.producto.nombre} ${pesos(peor.precio!.desglose.ganancia)}. Si una se vende mucho más que otra, conviene tenerlo en cuenta al armar la próxima tanda.`,
      })
    }
  }

  // 9. Recuperar la inversión
  if (a.inversion.total > 0 && a.inversion.unidadesParaRecuperar) {
    r.push({
      tipo: 'dato',
      titulo: `Recuperás la inversión inicial vendiendo ${a.inversion.unidadesParaRecuperar} carteras`,
      texto: `Invertiste ${pesos(a.inversion.total)} en muestras y moldes. Cada cartera te deja ${pesos(a.totales.gananciaPromedio)} en promedio con un margen del ${f.margen}%.`,
    })
  }

  // 10. Ventas mensuales
  if (a.filas.some((x) => x.costeo.recurrentesPendiente)) {
    r.push({
      tipo: 'alerta',
      titulo: 'Faltan las ventas mensuales estimadas',
      texto: 'Sin ese dato, Tiendanube y el monotributo no se suman al costo. Cargalo en Configuración, aunque sea aproximado.',
    })
  }
  return r
}
