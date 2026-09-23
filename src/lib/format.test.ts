import { describe, expect, it } from 'vitest'
import { leerNumero, pesos, pct } from './format'

describe('pesos', () => {
  it('formatea en pesos argentinos', () => {
    expect(pesos(1234567)).toBe('$ 1.234.567')
    expect(pesos(95000)).toBe('$ 95.000')
    expect(pesos(6422.2807, true)).toBe('$ 6.422,28')
    expect(pesos(-1000)).toBe('-$ 1.000')
  })
})

describe('pct', () => {
  it('formatea porcentajes', () => {
    expect(pct(30)).toBe('30%')
    expect(pct(12.5)).toBe('12,5%')
  })
})

describe('leerNumero', () => {
  it('entiende cómo se escriben los montos en Argentina', () => {
    expect(leerNumero('95.000')).toBe(95000)
    expect(leerNumero('$ 1.234.567')).toBe(1234567)
    expect(leerNumero('5.307,67')).toBe(5307.67)
    expect(leerNumero('5307,67')).toBe(5307.67)
    expect(leerNumero('5307.67')).toBe(5307.67)
    expect(leerNumero('100000')).toBe(100000)
    expect(leerNumero('')).toBeNull()
    expect(leerNumero('abc')).toBeNull()
  })
})
