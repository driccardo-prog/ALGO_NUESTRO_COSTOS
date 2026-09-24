import { describe, expect, it } from 'vitest'
import { costearProducto, montoGasto, tandaArranque, type Datos } from './costeo'
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

  it('precio unitario × cantidad', () => {
    const g = gasto({ tipo: 'especifico', modo_monto: 'unitario', precio_unitario: 3000, cantidad: 10, productos: ['potra'] })
    expect(costearProducto(datos([g]), 'potra', 't1')!.especifico).toBe(6000)
  })

  it('packaging por unidad producida: caja grande $5.307,67 sin IVA = $6.422,28 por unidad', () => {
    const g = gasto({
      tipo: 'especifico',
      modo_monto: 'por_unidad_tanda',
      precio_unitario: 5307.67,
      sin_iva: true,
      productos: ['gauchita', 'criolla'],
    })
    const c = costearProducto(datos([g]), 'gauchita', 't1')!
    expect(c.especifico).toBeCloseTo(6422.28, 2)
    expect(montoGasto(g, 10)).toBeCloseTo(64222.81, 1)
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

describe('arranque', () => {
  const arranque = [
    gasto({ tipo: 'arranque', tanda_id: null, monto: 100000, productos: ['gauchita', 'potra', 'criolla'] }),
    gasto({ tipo: 'arranque', tanda_id: null, monto: 50000, productos: ['gauchita'] }),
  ]

  it('no entra en el costo real, solo en el costo con arranque', () => {
    const c = costearProducto(datos(arranque), 'gauchita', 't1')!
    expect(c.real).toBe(0)
    // 100.000 ÷ 3 productos ÷ 5 unidades + 50.000 ÷ 5
    expect(c.arranque).toBeCloseTo(6666.67 + 10000, 1)
    expect(c.conArranque).toBeCloseTo(16666.67, 1)
  })

  it('lo absorbe solo la primera tanda de cada producto', () => {
    const tanda2: Tanda = { ...tanda1, id: 't2', nombre: 'Tanda 2', fecha: '2026-12-01' }
    const d = datos(arranque, { tandas: [tanda2, tanda1] })
    expect(tandaArranque(d, 'gauchita')?.id).toBe('t1')
    expect(costearProducto(d, 'gauchita', 't2')!.arranque).toBe(0)
    expect(costearProducto(d, 'gauchita', 't1')!.arranque).toBeGreaterThan(0)
  })

  it('se puede elegir otra tanda para el arranque', () => {
    const tanda2: Tanda = { ...tanda1, id: 't2', nombre: 'Tanda 2', fecha: '2026-12-01' }
    const d = datos(arranque, { tandas: [tanda1, tanda2] }, { arranque_tanda: { gauchita: 't2' } })
    expect(costearProducto(d, 'gauchita', 't1')!.arranque).toBe(0)
    expect(costearProducto(d, 'gauchita', 't2')!.arranque).toBeGreaterThan(0)
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
