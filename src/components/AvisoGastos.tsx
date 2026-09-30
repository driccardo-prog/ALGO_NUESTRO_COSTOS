import { useState } from 'react'
import { Link } from 'react-router-dom'
import { tandasOrdenadas } from '../lib/costeo'
import { useData } from '../lib/data'
import { revisarGastos } from '../lib/revision'

/**
 * Avisa de la plata que se pierde o se duplica: gastos sin tanda (con un botón
 * para sumarlos), gastos que no llegan a ninguna cartera y posibles repetidos.
 */
export function AvisoGastos() {
  const datos = useData()
  const { tandas, editar } = datos
  const { sinTanda, noSuman, repetidos } = revisarGastos(datos)
  const ordenadas = tandasOrdenadas(tandas)
  const [tandaId, setTandaId] = useState(ordenadas[ordenadas.length - 1]?.id ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (sinTanda.length === 0 && noSuman.length === 0 && repetidos.length === 0) return null

  async function asignar() {
    setGuardando(true)
    setError(null)
    try {
      for (const g of sinTanda) await editar('gastos', g.id, { tanda_id: tandaId || ordenadas[0].id })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="avisos-gastos">
      {sinTanda.length > 0 && (
        <div className="pendiente aviso-gastos">
          <p style={{ margin: 0 }}>
            <strong>
              {sinTanda.length === 1
                ? 'Hay 1 gasto que no se está sumando'
                : `Hay ${sinTanda.length} gastos que no se están sumando`}
            </strong>{' '}
            porque no tienen tanda: {sinTanda.map((g) => g.descripcion).join(', ')}.
          </p>
          {error && <p className="error-campo">{error}</p>}
          <div className="acciones" style={{ marginTop: 10 }}>
            {ordenadas.length > 1 && (
              <select
                aria-label="Tanda"
                value={tandaId}
                style={{ width: 'auto' }}
                onChange={(e) => setTandaId(e.target.value)}
              >
                {ordenadas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            )}
            <button className="btn btn-principal" onClick={asignar} disabled={guardando}>
              {guardando ? 'Sumando…' : `Sumarlos a ${ordenadas.length > 1 ? 'esa tanda' : ordenadas[0].nombre}`}
            </button>
          </div>
        </div>
      )}

      {noSuman.length > 0 && (
        <div className="pendiente aviso-gastos">
          <strong>
            {noSuman.length === 1 ? 'Este gasto no llega a ninguna cartera' : 'Estos gastos no llegan a ninguna cartera'}
          </strong>{' '}
          (cuentan $ 0 en todos lados):
          <ul>
            {noSuman.map(({ gasto, motivo }) => (
              <li key={gasto.id}>
                <Link to={`/gastos/${gasto.id}`}>{gasto.descripcion}</Link>: {motivo}.
              </li>
            ))}
          </ul>
        </div>
      )}

      {repetidos.length > 0 && (
        <div className="pendiente aviso-gastos">
          <strong>¿Estos gastos están cargados dos veces?</strong> Si es el mismo (por ejemplo, el
          presupuesto y la factura), se están sumando los dos: dejá uno solo.
          <ul>
            {repetidos.map((grupo) => (
              <li key={grupo.map((g) => g.id).join('-')}>
                {grupo.map((g, i) => (
                  <span key={g.id}>
                    {i > 0 && ' y '}
                    <Link to={`/gastos/${g.id}`}>{g.descripcion}</Link>
                    {g.estado === 'estimado' ? ' (estimado)' : ' (real)'}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
