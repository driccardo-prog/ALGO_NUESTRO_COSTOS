import { useState } from 'react'
import { Link } from 'react-router-dom'
import { costearProducto, tandaReferencia, unidadesDe, type Linea, type TipoLinea } from '../lib/costeo'
import { useData } from '../lib/data'
import { pct, pesos } from '../lib/format'
import type { Producto } from '../lib/types'
import { Info } from './Info'

const TITULOS: Record<TipoLinea, string> = {
  especifico: 'Gastos específicos',
  general: 'Gastos generales',
  recurrente: 'Recurrentes mensuales',
  arranque: 'Arranque',
}

export function Costeo({ producto }: { producto: Producto }) {
  const datos = useData()
  const { tandas, categorias } = datos
  const conProducto = tandas.filter((t) => unidadesDe(t, producto.id) > 0)
  const [tandaId, setTandaId] = useState(() => tandaReferencia(datos, producto.id)?.id ?? '')

  if (conProducto.length === 0) {
    return (
      <div className="tarjeta">
        <h3>Todavía no hay tandas con este producto</h3>
        <p className="suave">
          Para calcular el costo por unidad, la app necesita saber cuántas {producto.nombre} vas a
          hacer. Armá una tanda con las unidades de cada producto.
        </p>
        <Link to="/tandas" className="btn btn-principal">
          Armar una tanda
        </Link>
      </div>
    )
  }

  const idValido = conProducto.some((t) => t.id === tandaId) ? tandaId : conProducto[0].id
  const c = costearProducto(datos, producto.id, idValido)!
  const nombreCat = (id: string | null) =>
    categorias.find((x) => x.id === id)?.nombre ?? 'Sin categoría'
  const maximo = Math.max(...c.porCategoria.map((x) => x.monto), 1)

  return (
    <>
      <div className="acciones" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="acciones">
          <label htmlFor="c-tanda" className="etiqueta">
            Tanda
          </label>
          <select
            id="c-tanda"
            value={idValido}
            style={{ width: 'auto' }}
            onChange={(e) => setTandaId(e.target.value)}
          >
            {conProducto.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} · {unidadesDe(t, producto.id)} unidades
              </option>
            ))}
          </select>
        </div>
        <div className="acciones">
          {c.incluyeEstimados && (
            <span className="badge badge-estimado" title="Algunos montos son presupuestos">
              incluye estimados
            </span>
          )}
        </div>
      </div>

      {(c.faltan.length > 0 || c.recurrentesPendiente) && (
        <ul className="lista-pendientes" style={{ marginBottom: 20 }}>
          {c.faltan.map((f) => (
            <li key={f}>
              Falta cargar: <strong>{f.toLowerCase()}</strong>
            </li>
          ))}
          {c.recurrentesPendiente && (
            <li>
              Faltan las <Link to="/configuracion">ventas mensuales estimadas</Link>: los gastos
              fijos mensuales todavía no se suman.
            </li>
          )}
        </ul>
      )}

      <div className="costeo">
        <div className="tarjeta">
          <h3>Costo por unidad</h3>
          <table className="tabla tabla-costos">
            <tbody>
              <Fila titulo="Costo específico" monto={c.especifico} info={c.explicaciones.especifico} />
              <Fila titulo="Gastos generales" monto={c.general} info={c.explicaciones.general} />
              <Fila
                titulo="Recurrentes mensuales"
                monto={c.recurrente}
                info={c.explicaciones.recurrente}
                pendiente={c.recurrentesPendiente}
              />
              <Fila titulo="Costo real por unidad" monto={c.real} info={c.explicaciones.real} total />
              {c.absorbeArranque ? (
                <>
                  <Fila titulo="Arranque (muestras, moldes)" monto={c.arranque} info={c.explicaciones.arranque} />
                  <Fila
                    titulo="Costo con arranque por unidad"
                    monto={c.conArranque}
                    info={c.explicaciones.conArranque}
                    total
                  />
                </>
              ) : (
                <tr>
                  <td colSpan={2} className="suave chico">
                    Los gastos de arranque los absorbe otra tanda (la primera de este producto).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="tarjeta">
          <h3>¿En qué se va el costo real?</h3>
          {c.porCategoria.length === 0 ? (
            <p className="suave">Todavía no hay gastos con monto en esta tanda.</p>
          ) : (
            <table className="tabla barras" aria-label="Costo real por unidad, por categoría">
              <tbody>
                {c.porCategoria.map((x) => (
                  <tr key={x.categoriaId ?? 'sin'} title={`${nombreCat(x.categoriaId)}: ${pesos(x.monto)}`}>
                    <td>{nombreCat(x.categoriaId)}</td>
                    <td className="celda-barra">
                      <span className="barra" style={{ width: `${(x.monto / maximo) * 100}%` }} />
                    </td>
                    <td className="num">{pesos(x.monto)}</td>
                    <td className="num suave">{c.real > 0 ? pct(Math.round((x.monto / c.real) * 100)) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="tarjeta" style={{ marginTop: 20 }}>
        <h3>Detalle de cada gasto</h3>
        <p className="suave chico">Cuánto suma cada gasto a una {producto.nombre} y cómo se calculó.</p>
        {(['especifico', 'general', 'recurrente', 'arranque'] as TipoLinea[]).map((tipo) => (
          <Detalle key={tipo} titulo={TITULOS[tipo]} lineas={c.lineas.filter((l) => l.tipo === tipo)} />
        ))}
      </div>
    </>
  )
}

function Fila({
  titulo,
  monto,
  info,
  total = false,
  pendiente = false,
}: {
  titulo: string
  monto: number
  info: string
  total?: boolean
  pendiente?: boolean
}) {
  return (
    <tr className={`${total ? 'fila-total' : ''} ${pendiente ? 'fila-pendiente' : ''}`}>
      <td>
        {titulo}
        <Info>{info}</Info>
      </td>
      <td className="num">{pendiente ? 'pendiente' : pesos(monto)}</td>
    </tr>
  )
}

function Detalle({ titulo, lineas }: { titulo: string; lineas: Linea[] }) {
  if (lineas.length === 0) return null
  return (
    <div style={{ marginTop: 16 }}>
      <div className="etiqueta">{titulo}</div>
      <table className="tabla">
        <tbody>
          {lineas.map((l) => (
            <tr key={l.gastoId}>
              <td>
                <Link to={`/gastos/${l.gastoId}`}>{l.descripcion}</Link>{' '}
                {l.estimado && <span className="badge badge-estimado">estimado</span>}
                <div className="nota">{l.explicacion}</div>
              </td>
              <td className="num">{pesos(l.porUnidad)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
