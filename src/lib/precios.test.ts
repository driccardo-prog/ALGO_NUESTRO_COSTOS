import { describe, expect, it } from 'vitest'
import { comisionAplicada, desglosar, precioFinal, precioSugerido, redondear } from './precios'
import { configInicial } from './seed'
import type { ConfigDatos } from './types'

const config = (c: Partial<ConfigDatos> = {}, com: Partial<ConfigDatos['comisiones']> = {}): ConfigDatos => {
  const base = configInicial()
  return { ...base, ...c, comisiones: { ...base.comisiones, ...com } }
}

describe('precio sugerido', () => {
  it('Precio = Costo ÷ (1 − margen − comisiones), no costo × (1 + %)', () => {
    // Para quedarte con $100.000 con 10% de comisión: $100.000 ÷ 0,90 = $111.111
    expect(precioSugerido(100000, 0, 0.1)).toBeCloseTo(111111.11, 2)
    expect(precioSugerido(100000, 0, 0.1)).not.toBeCloseTo(110000, 0)
    // Costo $50.000, margen 50%, comisiones 10%: 50.000 ÷ 0,40
    expect(precioSugerido(50000, 0.5, 0.1)).toBeCloseTo(125000)
  })

  it('si margen + comisiones llegan al 100% no hay precio posible', () => {
    expect(precioSugerido(1000, 0.9, 0.1)).toBeNull()
  })

  it('redondea siempre para arriba', () => {
    expect(redondear(111111, 1000)).toBe(112000)
    expect(redondear(111111, 5000)).toBe(115000)
    expect(redondear(111111, 0)).toBe(111111)
  })
})

describe('comisiones', () => {
  it('usa el medio de pago más caro de los que se ofrecen', () => {
    const c = comisionAplicada(
      config(
        { medios_ofrecidos: ['mp_transferencia', 'mp_credito_1', 'mp_3_cuotas'], iva_comisiones: false },
        { tiendanube: 1, mp_transferencia: 0.8, mp_credito_1: 6, mp_3_cuotas: 12, mp_6_cuotas: 20 },
      ),
    )
    expect(c.medio).toBe('mp_3_cuotas') // 6 cuotas no se ofrece
    expect(c.total).toBeCloseTo(0.13)
  })

  it('suma 21% de IVA sobre las comisiones y la retención de IIBB', () => {
    const c = comisionAplicada(
      config(
        { medios_ofrecidos: ['mp_credito_1'], iva_comisiones: true, retencion_iibb: 2 },
        { tiendanube: 1, mp_credito_1: 9 },
      ),
    )
    // (1% + 9%) × 1,21 + 2% = 14,1%
    expect(c.total).toBeCloseTo(0.141)
    expect(c.iva).toBeCloseTo(0.021)
  })

  it('lista los datos que faltan', () => {
    const c = comisionAplicada(config({ medios_ofrecidos: ['mp_transferencia'] }))
    expect(c.pendientes).toEqual(['comisión de Tiendanube', 'Mercado Pago: transferencia'])
  })
})

describe('calculadora inversa y desglose', () => {
  it('con un precio en mente, muestra cuánto queda y el margen real', () => {
    const c = comisionAplicada(
      config({ medios_ofrecidos: ['mp_credito_1'], iva_comisiones: false }, { tiendanube: 0, mp_credito_1: 10 }),
    )
    const d = desglosar(200000, 100000, c)
    expect(d.comisiones).toBeCloseTo(20000)
    expect(d.neto).toBeCloseTo(180000)
    expect(d.ganancia).toBeCloseTo(80000)
    expect(d.margenReal).toBeCloseTo(0.4)
  })

  it('precio final: el desglose suma el precio', () => {
    const f = precioFinal(
      80000,
      50,
      config({ medios_ofrecidos: ['mp_3_cuotas'], redondeo: 1000 }, { tiendanube: 1, mp_3_cuotas: 12 }),
    )!
    const d = f.desglose
    expect(f.precio % 1000).toBe(0)
    expect(d.costo + d.comisiones + d.ganancia).toBeCloseTo(f.precio)
    expect(d.margenReal).toBeGreaterThanOrEqual(0.5)
  })
})
