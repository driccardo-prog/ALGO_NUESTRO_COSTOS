import { resumenTanda } from '../lib/analisis'
import { useData } from '../lib/data'
import { pesos } from '../lib/format'
import { Info } from './Info'

/** Cuánto sale una tanda en total y cuánto deja si se vende toda. */
export function ResumenTanda({ tandaId, margen }: { tandaId: string; margen: number }) {
  const datos = useData()
  const r = resumenTanda(datos, tandaId, margen)
  if (!r || r.unidades === 0) return null
  const conArranque = datos.config.precio_con_arranque

  return (
    <table className="tabla tabla-costos resumen-tanda">
      <tbody>
        <tr>
          <td>
            Producción
            <Info>Gastos específicos y generales de la tanda: taller, cuero, packaging, flete…</Info>
          </td>
          <td className="num">{pesos(r.produccion)}</td>
        </tr>
        <tr>
          <td>
            Muestras y moldes
            <Info>Gastos de arranque que se cargan en esta tanda (ver Configuración).</Info>
          </td>
          <td className="num">{pesos(r.arranque)}</td>
        </tr>
        <tr className="fila-total">
          <td>Lo que sale la tanda</td>
          <td className="num">{pesos(r.total)}</td>
        </tr>
        {r.recurrentes > 0 && (
          <tr>
            <td>
              + Gastos fijos de estas {r.unidades} ventas
              <Info>La parte del monotributo, Tiendanube y otros gastos mensuales que le toca a estas unidades.</Info>
            </td>
            <td className="num">{pesos(r.recurrentes)}</td>
          </tr>
        )}
        <tr>
          <td>Costo promedio por cartera</td>
          <td className="num">{pesos(r.costoPromedio)}</td>
        </tr>
        {r.hayPrecios && (
          <>
            <tr>
              <td>
                Si vendés las {r.unidades} al precio sugerido ({margen}%)
                <Info>
                  {conArranque
                    ? 'El precio incluye las muestras y los moldes, así que se recuperan con esta tanda.'
                    : 'El precio no incluye muestras y moldes (se puede cambiar en Configuración).'}
                </Info>
              </td>
              <td className="num">{pesos(r.venta)}</td>
            </tr>
            <tr>
              <td>− Comisiones e impuestos</td>
              <td className="num">{pesos(r.comisiones)}</td>
            </tr>
            <tr className="fila-total">
              <td>{r.ganancia >= 0 ? 'Te queda, ya descontado todo' : 'Perdés'}</td>
              <td className="num">{pesos(r.ganancia)}</td>
            </tr>
          </>
        )}
      </tbody>
    </table>
  )
}
