import { useState } from 'react'
import { tandasOrdenadas } from '../lib/costeo'
import { useData } from '../lib/data'

/**
 * Los gastos específicos o generales sin tanda no se suman a ningún costo.
 * Este aviso los muestra y permite sumarlos a una tanda con un clic.
 */
export function AvisoSinTanda() {
  const { gastos, tandas, editar } = useData()
  const sinTanda = gastos.filter(
    (g) => (g.tipo === 'especifico' || g.tipo === 'general') && !g.tanda_id,
  )
  const ordenadas = tandasOrdenadas(tandas)
  const [tandaId, setTandaId] = useState(ordenadas[ordenadas.length - 1]?.id ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (sinTanda.length === 0 || tandas.length === 0) return null

  async function asignar() {
    setGuardando(true)
    setError(null)
    try {
      for (const g of sinTanda) await editar('gastos', g.id, { tanda_id: tandaId })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="pendiente aviso-sin-tanda">
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
          {guardando
            ? 'Sumando…'
            : `Sumarlos a ${ordenadas.length > 1 ? 'esa tanda' : ordenadas[0].nombre}`}
        </button>
      </div>
    </div>
  )
}
