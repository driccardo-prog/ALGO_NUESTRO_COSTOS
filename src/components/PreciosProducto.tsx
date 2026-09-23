import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CosteoProducto } from '../lib/costeo'
import { useData } from '../lib/data'
import { leerNumero, pct, pesos } from '../lib/format'
import { comisionAplicada, desglosar, MEDIOS, precioFinal, type DesglosePrecio } from '../lib/precios'
import { Info } from './Info'

const porcentaje = (x: number) => pct(Math.round(x * 1000) / 10)

/** Precios sugeridos, calculadora inversa y desglose de un precio. */
export function PreciosProducto({ c, nombre }: { c: CosteoProducto; nombre: string }) {
  const { config } = useData()
  const comision = comisionAplicada(config)
  const margenes = [...config.margenes].sort((a, b) => a - b)
  const [precioTexto, setPrecioTexto] = useState('')
  const precioProbado = leerNumero(precioTexto)
  const [base, setBase] = useState<'real' | 'arranque'>('real')
  const costo = base === 'arranque' ? c.conArranque : c.real

  const principal = precioFinal(costo, config.margen_principal, config)
  const desglose: DesglosePrecio | null =
    precioProbado && precioProbado > 0
      ? desglosar(precioProbado, costo, comision)
      : (principal?.desglose ?? null)

  const formula = `Costo ÷ (1 − margen − ${porcentaje(comision.total)} de comisiones e impuestos)`

  return (
    <div className="tarjeta" style={{ marginTop: 20 }}>
      <h3>Precio de venta sugerido</h3>
      {comision.pendientes.length > 0 && (
        <div className="pendiente" style={{ marginBottom: 12 }}>
          Todavía faltan comisiones: {comision.pendientes.join(', ')}.{' '}
          <Link to="/configuracion">Cargalas en Configuración</Link>: hasta entonces el precio queda
          más bajo de lo que debería.
        </div>
      )}
      <p className="suave chico">
        {comision.medio
          ? `Calculado con ${MEDIOS[comision.medio].toLowerCase()}, el medio de pago más caro que ofrecés.`
          : 'Sin medios de pago elegidos: solo cuenta la comisión de Tiendanube.'}{' '}
        {config.redondeo > 0 && `Redondeado para arriba a ${pesos(config.redondeo)}.`}
      </p>

      <div className="precios-producto">
        <table className="tabla tabla-precios">
          <thead>
            <tr>
              <th>Margen</th>
              <th className="num">Sobre el costo real</th>
              {c.absorbeArranque && <th className="num">Con arranque</th>}
            </tr>
          </thead>
          <tbody>
            {margenes.map((m) => {
              const r = precioFinal(c.real, m, config)
              const a = precioFinal(c.conArranque, m, config)
              const esPrincipal = m === config.margen_principal
              return (
                <tr key={m} className={esPrincipal ? 'fila-principal' : ''}>
                  <td>
                    {m}%{esPrincipal && <span className="badge badge-neutro">principal</span>}
                  </td>
                  <td className="num">
                    {r ? pesos(r.precio) : '—'}
                    {r && (
                      <Info>
                        {`${formula}: ${pesos(c.real)} ÷ ${porcentaje(1 - m / 100 - comision.total)} = ${pesos(r.exacto)}`}
                        {r.precio !== r.exacto ? ` → ${pesos(r.precio)}` : ''}
                      </Info>
                    )}
                  </td>
                  {c.absorbeArranque && <td className="num">{a ? pesos(a.precio) : '—'}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>

        <div>
          <div className="campo">
            <label htmlFor="calc-precio">Calculadora: ¿y si la vendo a…?</label>
            <div className="input-plata">
              <span>$</span>
              <input
                id="calc-precio"
                inputMode="decimal"
                placeholder={principal ? String(Math.round(principal.precio)) : 'Ej: 150.000'}
                value={precioTexto}
                onChange={(e) => setPrecioTexto(e.target.value)}
              />
            </div>
            <span className="ayuda">Es solo para probar: no se guarda.</span>
          </div>
          {c.absorbeArranque && (
            <div className="acciones chico" style={{ marginBottom: 8 }}>
              <label className="check">
                <input type="radio" checked={base === 'real'} onChange={() => setBase('real')} />
                Contra el costo real
              </label>
              <label className="check">
                <input type="radio" checked={base === 'arranque'} onChange={() => setBase('arranque')} />
                Con arranque
              </label>
            </div>
          )}
          {desglose && (
            <>
              <div className="etiqueta" style={{ marginTop: 8 }}>
                {precioProbado
                  ? `Si vendés una ${nombre} a ${pesos(desglose.precio)}:`
                  : `Desglose del precio sugerido (${config.margen_principal}%):`}
              </div>
              <table className="tabla tabla-costos">
                <tbody>
                  <tr>
                    <td>Precio de venta</td>
                    <td className="num">{pesos(desglose.precio)}</td>
                  </tr>
                  {desglose.tiendanube > 0 && (
                    <tr>
                      <td>− Comisión Tiendanube</td>
                      <td className="num">{pesos(desglose.tiendanube)}</td>
                    </tr>
                  )}
                  {desglose.mercadoPago > 0 && (
                    <tr>
                      <td>− Comisión Mercado Pago</td>
                      <td className="num">{pesos(desglose.mercadoPago)}</td>
                    </tr>
                  )}
                  {desglose.iva > 0 && (
                    <tr>
                      <td>− IVA sobre comisiones</td>
                      <td className="num">{pesos(desglose.iva)}</td>
                    </tr>
                  )}
                  {desglose.iibb > 0 && (
                    <tr>
                      <td>− Ingresos Brutos</td>
                      <td className="num">{pesos(desglose.iibb)}</td>
                    </tr>
                  )}
                  <tr>
                    <td>= Te entra neto</td>
                    <td className="num">{pesos(desglose.neto)}</td>
                  </tr>
                  <tr>
                    <td>− Costo</td>
                    <td className="num">{pesos(desglose.costo)}</td>
                  </tr>
                  <tr className="fila-total">
                    <td>
                      {desglose.ganancia >= 0 ? 'Te queda' : 'Perdés'}
                      <Info>Ganancia ÷ precio de venta = margen real</Info>
                    </td>
                    <td className="num">
                      {pesos(desglose.ganancia)}{' '}
                      <span className="chico">({porcentaje(desglose.margenReal)})</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
