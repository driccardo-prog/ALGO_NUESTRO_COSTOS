import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Confirmar } from '../components/Confirmar'
import { montoGasto } from '../lib/costeo'
import { useData } from '../lib/data'
import { fecha, pesos } from '../lib/format'
import { TIPOS, textoMonto, unidadesCubiertas } from '../lib/gastos'
import type { Gasto, TipoGasto } from '../lib/types'

const FILTROS = ['tanda', 'producto', 'categoria', 'tipo', 'estado'] as const

export function Gastos() {
  const { gastos, tandas, productos, categorias, borrar } = useData()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [aBorrar, setABorrar] = useState<Gasto | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filtro = Object.fromEntries(FILTROS.map((f) => [f, params.get(f) ?? ''])) as Record<
    (typeof FILTROS)[number],
    string
  >
  const cambiar = (clave: string, valor: string) => {
    const p = new URLSearchParams(params)
    if (valor) p.set(clave, valor)
    else p.delete(clave)
    setParams(p, { replace: true })
  }

  const visibles = gastos
    .filter((g) => {
      if (filtro.tanda === 'sin' && g.tanda_id) return false
      if (filtro.tanda && filtro.tanda !== 'sin' && g.tanda_id !== filtro.tanda) return false
      if (filtro.producto && !g.productos.includes(filtro.producto)) return false
      if (filtro.categoria && g.categoria_id !== filtro.categoria) return false
      if (filtro.tipo && g.tipo !== filtro.tipo) return false
      if (filtro.estado === 'pendiente' && !g.pendiente) return false
      if ((filtro.estado === 'real' || filtro.estado === 'estimado') && g.estado !== filtro.estado)
        return false
      return true
    })
    // Sin fecha primero (para completarla), después de la más nueva a la más vieja
    .sort((a, b) => (b.fecha ?? '9999').localeCompare(a.fecha ?? '9999'))

  const total = visibles.reduce(
    (a, g) => a + montoGasto(g, unidadesCubiertas(g, tandas.find((t) => t.id === g.tanda_id))),
    0,
  )
  const hayFiltros = FILTROS.some((f) => filtro[f])

  async function confirmarBorrado() {
    const g = aBorrar!
    setABorrar(null)
    try {
      await borrar('gastos', g.id)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <>
      <div className="titulo-pagina">
        <h1>Gastos</h1>
        <Link to="/gastos/nuevo" className="btn btn-principal">
          + Nuevo gasto
        </Link>
      </div>
      {error && <div className="mensaje-error">{error}</div>}

      <div className="filtros">
        <label>
          Tanda
          <select value={filtro.tanda} onChange={(e) => cambiar('tanda', e.target.value)}>
            <option value="">Todas</option>
            <option value="sin">Sin tanda</option>
            {tandas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Producto
          <select value={filtro.producto} onChange={(e) => cambiar('producto', e.target.value)}>
            <option value="">Todos</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Categoría
          <select value={filtro.categoria} onChange={(e) => cambiar('categoria', e.target.value)}>
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select value={filtro.tipo} onChange={(e) => cambiar('tipo', e.target.value)}>
            <option value="">Todos</option>
            {(Object.keys(TIPOS) as TipoGasto[]).map((t) => (
              <option key={t} value={t}>
                {TIPOS[t].nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select value={filtro.estado} onChange={(e) => cambiar('estado', e.target.value)}>
            <option value="">Todos</option>
            <option value="real">Real</option>
            <option value="estimado">Estimado</option>
            <option value="pendiente">Falta el monto</option>
          </select>
        </label>
      </div>
      {hayFiltros && (
        <p className="chico">
          {visibles.length} de {gastos.length} gastos ·{' '}
          <button className="btn btn-texto chico" onClick={() => setParams({}, { replace: true })}>
            Sacar filtros
          </button>
        </p>
      )}

      <div className="tarjeta tabla-scroll" style={{ padding: 8 }}>
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Categoría</th>
              <th>Tipo</th>
              <th>Tanda</th>
              <th className="num">Monto</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((g) => {
              const tanda = tandas.find((t) => t.id === g.tanda_id)
              const m = textoMonto(g, tanda)
              const nombresProductos = g.productos
                .map((id) => productos.find((p) => p.id === id)?.nombre)
                .filter(Boolean)
                .join(', ')
              return (
                <tr
                  key={g.id}
                  className={`clic ${g.pendiente ? 'fila-pendiente' : ''}`}
                  onClick={() => navigate(`/gastos/${g.id}`)}
                >
                  <td className={g.fecha ? '' : 'suave'}>{fecha(g.fecha)}</td>
                  <td>
                    {g.descripcion}
                    {nombresProductos && <div className="nota">{nombresProductos}</div>}
                    {g.notas && <div className="nota">{g.notas}</div>}
                  </td>
                  <td>{categorias.find((c) => c.id === g.categoria_id)?.nombre ?? '—'}</td>
                  <td>{TIPOS[g.tipo].nombre}</td>
                  <td className="sin-corte">
                    {g.tipo === 'arranque' || g.tipo === 'recurrente'
                      ? '—'
                      : (tanda?.nombre ?? <span className="suave">sin tanda</span>)}
                  </td>
                  <td className="num">
                    {m.principal}
                    {m.detalle && <div className="nota">{m.detalle}</div>}
                    <div style={{ marginTop: 4 }}>
                      {g.pendiente ? (
                        <span className="badge badge-pendiente">falta el monto</span>
                      ) : g.estado === 'estimado' ? (
                        <span className="badge badge-estimado">estimado</span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn-x"
                      aria-label={`Borrar ${g.descripcion}`}
                      title="Borrar"
                      onClick={(e) => {
                        e.stopPropagation()
                        setABorrar(g)
                      }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )
            })}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={7} className="suave">
                  No hay gastos {hayFiltros ? 'con esos filtros' : 'cargados todavía'}.
                </td>
              </tr>
            )}
          </tbody>
          {visibles.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5}>Total</td>
                <td className="num">{pesos(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="suave chico" style={{ marginTop: 12 }}>
        El total no incluye los gastos que todavía no tienen monto, ni las cajas y bolsas que se
        cobran por unidad mientras no tengan tanda.
      </p>

      {aBorrar && (
        <Confirmar
          titulo={`¿Borrar "${aBorrar.descripcion}"?`}
          onConfirmar={confirmarBorrado}
          onCancelar={() => setABorrar(null)}
        >
          No se puede deshacer.
        </Confirmar>
      )}
    </>
  )
}
