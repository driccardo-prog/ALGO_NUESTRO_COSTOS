import { describe, expect, it } from 'vitest'
import { costearProducto, costoPorCartera, montoGasto, type Datos } from './costeo'
import { revisarGastos } from './revision'
import { configInicial, fichaVacia } from './seed'
import type { Categoria, ConfigDatos, Gasto, Producto, Tanda } from './types'

const cat = (id: string, es_cuero = false): Categoria => ({ id, nombre: id, es_cuero, orden: 0 })
const prod = (id: string, es_subproducto = false): Producto => ({
  id,
  codigo: id,
  nombre: id,
  tipologia: '',
  es_subproducto,
  orden: 0,
  ficha: fichaVacia(),
})
let n = 0
const gasto = (g: Partial<Gasto> & Pick<Gasto, 'tipo'>): Gasto => ({
  id: `g${++n}`,
  fecha: null,
  descripcion: `gasto ${n}`,
  categoria_id: 'otros',
  estado: 'real',
  pendiente: false,
  modo_monto: 'total',
  monto: null,
  precio_unitario: null,
  cantidad: null,
  rinde: null,
  uso: null,
  sin_iva: false,
  tanda_id: 't1',
  productos: [],
  reparto: null,
  frecuencia: null,
  notas: '',
  ...g,
})

const tanda1: Tanda = {
  id: 't1',
  nombre: 'Tanda 1',
  fecha: '2026-10-01',
  estado: 'planificada',
  unidades: { gauchita: 5, potra: 5, criolla: 5 },
  notas: '',
}

function datos(gastos: Gasto[], extra: Partial<Datos> = {}, config: Partial<ConfigDatos> = {}): Datos {
  return {
    productos: [prod('gauchita'), prod('potra'), prod('criolla')],
    tandas: [tanda1],
    categorias: [cat('otros'), cat('cuero', true)],
    gastos,
    config: { ...configInicial(), ...config },
    ...extra,
  }
}

describe('gastos específicos', () => {
  it('mano de obra $250.000 → Gauchita, 5 unidades = $50.000 por unidad', () => {
    const d = datos([gasto({ tipo: 'especifico', monto: 250000, productos: ['gauchita'] })])
    const c = costearProducto(d, 'gauchita', 't1')!
    expect(c.especifico).toBe(50000)
    expect(c.real).toBe(50000)
    expect(c.lineas[0].explicacion).toBe('$ 250.000 ÷ 5 unidades = $ 50.000')
    // no afecta a los otros productos
    expect(costearProducto(d, 'potra', 't1')!.real).toBe(0)
  })

  it('se divide por el total de unidades de los productos elegidos', () => {
    const d = datos([gasto({ tipo: 'especifico', monto: 100000, productos: ['gauchita', 'criolla'] })])
    expect(costearProducto(d, 'gauchita', 't1')!.especifico).toBe(10000)
    expect(costearProducto(d, 'criolla', 't1')!.especifico).toBe(10000)
  })

  it('reparto personalizado: cuero 60% Criolla, 40% Gauchita', () => {
    const d = datos([
      gasto({
        tipo: 'especifico',
        categoria_id: 'cuero',
        monto: 500000,
        productos: ['gauchita', 'criolla'],
        reparto: { criolla: 60, gauchita: 40 },
      }),
    ])
    expect(costearProducto(d, 'criolla', 't1')!.especifico).toBe(60000) // 300.000 ÷ 5
    expect(costearProducto(d, 'gauchita', 't1')!.especifico).toBe(40000) // 200.000 ÷ 5
  })

  it('precio sin IVA suma 21%', () => {
    const g = gasto({ tipo: 'especifico', monto: 100000, sin_iva: true, productos: ['gauchita'] })
    expect(montoGasto(g)).toBeCloseTo(121000)
    expect(costearProducto(datos([g]), 'gauchita', 't1')!.especifico).toBeCloseTo(24200)
  })

  it('compra por mayor: 100 bolsas por $13.324, una por cartera = $133,24 por cartera', () => {
    const g = gasto({ tipo: 'especifico', modo_monto: 'por_rendimiento', monto: 13324, rinde: 100, uso: 1, tanda_id: null, productos: ['gauchita', 'potra', 'criolla'] })
    expect(costoPorCartera(g)).toBeCloseTo(133.24)
    // no depende de cuántas carteras tenga la tanda: con 1 de cada una, igual
    const chica: Tanda = { ...tanda1, unidades: { gauchita: 1, potra: 1, criolla: 1 } }
    const d = datos([g], { tandas: [chica] })
    expect(costearProducto(d, 'gauchita', 't1')!.especifico).toBeCloseTo(133.24)
    expect(montoGasto(g)).toBe(13324) // lo pagado
  })

  it('compra por mayor: cuero que rinde 4 carteras, y cuánto usa cada una', () => {
    const chapa = gasto({ tipo: 'especifico', modo_monto: 'por_rendimiento', monto: 47500, rinde: 4, uso: 1, tanda_id: null, productos: ['gauchita'] })
    const cierres = gasto({ tipo: 'especifico', modo_monto: 'por_rendimiento', monto: 10000, rinde: 50, uso: 2, sin_iva: true, tanda_id: null, productos: ['gauchita'] })
    const c = costearProducto(datos([chapa, cierres]), 'gauchita', 't1')!
    // 47.500 ÷ 4 + (10.000 × 1,21 × 2 ÷ 50)
    expect(c.especifico).toBeCloseTo(11875 + 484)
  })

  it('compra por mayor sin tanda vale para todas; con tanda, solo para esa', () => {
    const tanda2: Tanda = { ...tanda1, id: 't2', fecha: '2026-12-01' }
    const todas = gasto({ tipo: 'especifico', modo_monto: 'por_rendimiento', monto: 1000, rinde: 10, uso: 1, tanda_id: null, productos: ['gauchita'] })
    const soloT2 = gasto({ tipo: 'especifico', modo_monto: 'por_rendimiento', monto: 5000, rinde: 10, uso: 1, tanda_id: 't2', productos: ['gauchita'] })
    const d = datos([todas, soloT2], { tandas: [tanda1, tanda2] })
    expect(costearProducto(d, 'gauchita', 't1')!.especifico).toBe(100)
    expect(costearProducto(d, 'gauchita', 't2')!.especifico).toBe(600)
  })

  it('formas viejas: precio unitario y "por unidad producida" se leen como costo por cartera', () => {
    const viejo = gasto({ tipo: 'especifico', modo_monto: 'unitario', precio_unitario: 3000, cantidad: 10, productos: ['potra'] })
    expect(costearProducto(datos([viejo]), 'potra', 't1')!.especifico).toBe(3000)
    const caja = gasto({ tipo: 'especifico', modo_monto: 'por_unidad_tanda', precio_unitario: 5307.67, sin_iva: true, productos: ['gauchita', 'criolla'] })
    expect(costearProducto(datos([caja]), 'gauchita', 't1')!.especifico).toBeCloseTo(6422.28, 2)
  })

  it('en un subproducto el cuero cuesta $0', () => {
    const d = datos(
      [
        gasto({ tipo: 'especifico', categoria_id: 'cuero', monto: 90000, productos: ['gauchita', 'llavero'] }),
        gasto({ tipo: 'especifico', monto: 20000, productos: ['llavero'] }),
      ],
      {
        productos: [prod('gauchita'), prod('llavero', true)],
        tandas: [{ ...tanda1, unidades: { gauchita: 5, llavero: 10 } }],
      },
    )
    expect(costearProducto(d, 'llavero', 't1')!.especifico).toBe(2000)
    expect(costearProducto(d, 'gauchita', 't1')!.especifico).toBe(18000) // el cuero solo entre las 5 Gauchitas
  })
})

describe('gastos generales', () => {
  it('flete $30.000 en una tanda de 30 unidades = $1.000 por unidad', () => {
    const d = datos([gasto({ tipo: 'general', monto: 30000 })], {
      tandas: [{ ...tanda1, unidades: { gauchita: 10, potra: 10, criolla: 10 } }],
    })
    for (const id of ['gauchita', 'potra', 'criolla']) {
      expect(costearProducto(d, id, 't1')!.general).toBe(1000)
    }
  })

  it('por costo directo: el que cuesta más producir absorbe más', () => {
    const d = datos(
      [
        gasto({ tipo: 'especifico', monto: 150000, productos: ['criolla'] }), // 30.000 c/u
        gasto({ tipo: 'especifico', monto: 50000, productos: ['gauchita'] }), // 10.000 c/u
        gasto({ tipo: 'general', monto: 20000 }),
      ],
      { tandas: [{ ...tanda1, unidades: { gauchita: 5, criolla: 5 } }] },
      { metodo_reparto_generales: 'por_costo_directo' },
    )
    const criolla = costearProducto(d, 'criolla', 't1')!
    const gauchita = costearProducto(d, 'gauchita', 't1')!
    expect(criolla.general).toBeCloseTo(3000) // 75% de 20.000 ÷ 5
    expect(gauchita.general).toBeCloseTo(1000) // 25% de 20.000 ÷ 5
    // el total repartido es el gasto completo
    expect(criolla.general * 5 + gauchita.general * 5).toBeCloseTo(20000)
  })

  it('los subproductos pueden quedar afuera de los generales', () => {
    const d = datos([gasto({ tipo: 'general', monto: 30000 })], {
      productos: [prod('gauchita'), prod('llavero', true)],
      tandas: [{ ...tanda1, unidades: { gauchita: 10, llavero: 20 } }],
      config: { ...configInicial(), subproductos_en_generales: false },
    })
    expect(costearProducto(d, 'gauchita', 't1')!.general).toBe(3000)
    expect(costearProducto(d, 'llavero', 't1')!.general).toBe(0)
  })

  it('un gasto de otra tanda no suma', () => {
    const d = datos([gasto({ tipo: 'general', monto: 30000, tanda_id: 'otra' })])
    expect(costearProducto(d, 'gauchita', 't1')!.general).toBe(0)
  })
})

describe('recurrentes mensuales', () => {
  it('sin ventas mensuales cargadas quedan en $0 y pendientes', () => {
    const d = datos([gasto({ tipo: 'recurrente', tanda_id: null, monto: 30000, frecuencia: 'mensual' })])
    const c = costearProducto(d, 'gauchita', 't1')!
    expect(c.recurrente).toBe(0)
    expect(c.recurrentesPendiente).toBe(true)
  })

  it('total mensual ÷ ventas mensuales; los anuales se prorratean a 12 meses', () => {
    const d = datos(
      [
        gasto({ tipo: 'recurrente', tanda_id: null, monto: 30000, frecuencia: 'mensual' }),
        gasto({ tipo: 'recurrente', tanda_id: null, monto: 120000, frecuencia: 'anual' }),
      ],
      {},
      { ventas_mensuales_total: 20 },
    )
    // (30.000 + 10.000) ÷ 20 = 2.000
    expect(costearProducto(d, 'potra', 't1')!.recurrente).toBe(2000)
  })
})

describe('muestras y moldes', () => {
  // Con 30 carteras en total y 3 modelos: se recuperan en las primeras 10 de cada modelo.
  const arranque = [
    gasto({ tipo: 'arranque', tanda_id: null, monto: 90000, productos: ['gauchita', 'potra', 'criolla'] }),
    gasto({ tipo: 'arranque', tanda_id: null, monto: 50000, productos: ['gauchita'] }),
  ]

  it('no entran en el costo por cartera, solo en el costo con todo incluido', () => {
    const c = costearProducto(datos(arranque), 'gauchita', 't1')!
    expect(c.real).toBe(0)
    // 90.000 ÷ 3 modelos ÷ 10 carteras + 50.000 ÷ 10 carteras
    expect(c.arranque).toBeCloseTo(3000 + 5000)
    expect(c.arranqueCompleto).toBeCloseTo(8000)
    expect(c.conArranque).toBeCloseTo(8000)
  })

  it('con una tanda chica no se disparan: se reparten en las carteras elegidas', () => {
    const chica: Tanda = { ...tanda1, unidades: { gauchita: 1, potra: 1, criolla: 1 } }
    const c = costearProducto(datos(arranque, { tandas: [chica] }), 'gauchita', 't1')!
    expect(c.arranque).toBeCloseTo(8000)
  })

  it('se recuperan exacto: las primeras 10 de cada modelo, repartidas entre tandas', () => {
    const t1: Tanda = { ...tanda1, id: 't1', fecha: '2026-10-01', unidades: { gauchita: 4 } }
    const t2: Tanda = { ...tanda1, id: 't2', fecha: '2026-11-01', unidades: { gauchita: 10 } }
    const t3: Tanda = { ...tanda1, id: 't3', fecha: '2026-12-01', unidades: { gauchita: 10 } }
    const d = datos(arranque, { tandas: [t3, t1, t2] })
    const cobrado = ['t1', 't2', 't3'].reduce((s, t) => {
      const c = costearProducto(d, 'gauchita', t)!
      return s + c.arranque * c.unidades
    }, 0)
    expect(cobrado).toBeCloseTo(30000 + 50000) // la parte de la Gauchita, completa
    expect(costearProducto(d, 'gauchita', 't1')!.arranque).toBeCloseTo(8000) // las 4 pagan todo
    expect(costearProducto(d, 'gauchita', 't2')!.arranque).toBeCloseTo(8000 * 0.6) // 6 de 10
    expect(costearProducto(d, 'gauchita', 't3')!.arranque).toBe(0) // ya se recuperó
  })

  it('se puede elegir en cuántas carteras recuperarlos', () => {
    const d = datos(arranque, {}, { arranque_recuperar_en: 3 })
    // 1 por modelo: la Gauchita paga 30.000 + 50.000, pero en la tanda solo 1 de 5
    const c = costearProducto(d, 'gauchita', 't1')!
    expect(c.arranqueCompleto).toBeCloseTo(80000)
    expect(c.arranque * c.unidades).toBeCloseTo(80000)
  })

  it('el cuero de las muestras no va a los subproductos', () => {
    const cuero = gasto({ tipo: 'arranque', tanda_id: null, categoria_id: 'cuero', monto: 60000, productos: ['gauchita', 'llavero'] })
    const d = datos([cuero], {
      productos: [prod('gauchita'), prod('llavero', true)],
      tandas: [{ ...tanda1, unidades: { gauchita: 5, llavero: 5 } }],
    })
    expect(costearProducto(d, 'llavero', 't1')!.arranque).toBe(0)
  })
})

describe('indicadores', () => {
  it('marca "incluye estimados" y los gastos que faltan cargar', () => {
    const d = datos([
      gasto({ tipo: 'especifico', monto: 10000, estado: 'estimado', productos: ['gauchita'] }),
      gasto({ tipo: 'especifico', descripcion: 'Trenzador', pendiente: true, productos: ['gauchita'] }),
    ])
    const c = costearProducto(d, 'gauchita', 't1')!
    expect(c.incluyeEstimados).toBe(true)
    // los estimados se suman igual que los reales
    expect(c.real).toBe(2000)
    expect(c.faltan).toEqual(['Trenzador'])
  })

  it('desglose por categoría', () => {
    const d = datos([
      gasto({ tipo: 'especifico', categoria_id: 'cuero', monto: 50000, productos: ['gauchita'] }),
      gasto({ tipo: 'general', categoria_id: 'otros', monto: 15000 }),
    ])
    const c = costearProducto(d, 'gauchita', 't1')!
    expect(c.porCategoria).toEqual([
      { categoriaId: 'cuero', monto: 10000 },
      { categoriaId: 'otros', monto: 1000 },
    ])
  })
})

describe('resumen de la tanda', () => {
  it('suma producción y arranque, y la ganancia descuenta todo', async () => {
    const { resumenTanda } = await import('./analisis')
    const d = datos([
      gasto({ tipo: 'especifico', monto: 150000, productos: ['gauchita', 'potra', 'criolla'] }),
      gasto({ tipo: 'general', monto: 30000 }),
      gasto({ tipo: 'arranque', tanda_id: null, monto: 60000, productos: ['gauchita', 'potra', 'criolla'] }),
    ])
    const r = resumenTanda(d, 't1', 50)!
    expect(r.unidades).toBe(15)
    expect(r.produccion).toBeCloseTo(180000)
    // 60.000 se recuperan en 30 carteras: 2.000 cada una, 15 en esta tanda
    expect(r.arranque).toBeCloseTo(30000)
    expect(r.total).toBeCloseTo(210000)
    expect(r.costoPromedio).toBeCloseTo(14000)
    // sin comisiones cargadas, con margen 50% el precio duplica el costo con arranque
    expect(r.ganancia).toBeGreaterThanOrEqual(r.total * 0.99)
  })
})

describe('control de plata perdida o duplicada', () => {
  it('avisa los gastos de monto total sin tanda (las compras por mayor no)', () => {
    const d = datos([
      gasto({ tipo: 'especifico', descripcion: 'Taller', monto: 1000, tanda_id: null, productos: ['gauchita'] }),
      gasto({ tipo: 'especifico', descripcion: 'Bolsas', modo_monto: 'por_rendimiento', monto: 1000, rinde: 10, uso: 1, tanda_id: null, productos: ['gauchita'] }),
    ])
    expect(revisarGastos(d).sinTanda.map((g) => g.descripcion)).toEqual(['Taller'])
  })

  it('avisa los gastos que no llegan a ninguna cartera', () => {
    const d = datos(
      [
        gasto({ tipo: 'especifico', descripcion: 'Criolla fuera', monto: 1000, productos: ['criolla'] }),
        gasto({ tipo: 'especifico', descripcion: 'Cuero llavero', categoria_id: 'cuero', monto: 1000, productos: ['llavero'] }),
      ],
      {
        productos: [prod('gauchita'), prod('criolla'), prod('llavero', true)],
        tandas: [{ ...tanda1, unidades: { gauchita: 5, llavero: 5 } }],
      },
    )
    expect(revisarGastos(d).noSuman.map((p) => p.gasto.descripcion).sort()).toEqual(['Criolla fuera', 'Cuero llavero'])
  })

  it('avisa si el presupuesto y la factura están cargados los dos', () => {
    const d = datos([
      gasto({ tipo: 'especifico', descripcion: 'Taller tanda 1', monto: 100000, estado: 'estimado', productos: ['gauchita'] }),
      gasto({ tipo: 'especifico', descripcion: 'Factura taller', monto: 110000, estado: 'real', productos: ['gauchita'] }),
      gasto({ tipo: 'especifico', descripcion: 'Cuero', categoria_id: 'cuero', monto: 5000, productos: ['gauchita'] }),
    ])
    const r = revisarGastos(d).repetidos
    expect(r).toHaveLength(1)
    expect(r[0].map((g) => g.descripcion).sort()).toEqual(['Factura taller', 'Taller tanda 1'])
  })

  it('no confunde cosas distintas de la misma categoría (bolsa de lienzo y bolsas e-commerce)', () => {
    const todas = ['gauchita', 'potra', 'criolla']
    const d = datos([
      gasto({ tipo: 'especifico', descripcion: 'Bolsa de lienzo', estado: 'estimado', modo_monto: 'por_rendimiento', monto: 5253.35, rinde: 1, uso: 1, sin_iva: true, tanda_id: null, productos: todas }),
      gasto({ tipo: 'especifico', descripcion: 'Bolsas e-commerce', estado: 'real', modo_monto: 'por_rendimiento', monto: 13324, rinde: 100, uso: 1, tanda_id: null, productos: todas }),
    ])
    expect(revisarGastos(d).repetidos).toHaveLength(0)
  })

  it('se puede marcar un par como "no son repetidos"', () => {
    const a = gasto({ tipo: 'especifico', descripcion: 'Taller', monto: 100000, productos: ['gauchita'] })
    const b = gasto({ tipo: 'especifico', descripcion: 'Taller', monto: 100000, productos: ['gauchita'] })
    expect(revisarGastos(datos([a, b])).repetidos).toHaveLength(1)
    const d = datos([a, b], {}, { repetidos_ignorados: [[a.id, b.id].sort().join('|')] })
    expect(revisarGastos(d).repetidos).toHaveLength(0)
  })
})
