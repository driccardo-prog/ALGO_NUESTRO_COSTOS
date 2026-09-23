import { Link } from 'react-router-dom'
import { Info } from '../components/Info'
import { TarjetaProducto } from '../components/TarjetaProducto'
import { costearProducto, tandaArranque, tandaReferencia } from '../lib/costeo'
import { useData } from '../lib/data'
import { pesos } from '../lib/format'
import { calcularPendientes } from '../lib/pendientes'

export function Inicio() {
  const datos = useData()
  const { productos, gastos, config, tandas } = datos
  const pendientes = calcularPendientes(config, gastos)
  const principales = productos.filter((p) => !p.es_subproducto)
  const subproductos = productos.filter((p) => p.es_subproducto)

  const filas = productos.map((p) => {
    const t = tandaReferencia(datos, p.id)
    const c = t ? costearProducto(datos, p.id, t.id) : null
    // El costo con arranque se toma de la tanda que absorbe el arranque
    const ta = tandaArranque(datos, p.id)
    const ca = ta ? costearProducto(datos, p.id, ta.id) : null
    return { p, t, c, ta, ca }
  })

  return (
    <>
      <div className="titulo-pagina">
        <div>
          <h1>Hola, Loli</h1>
          <p className="suave" style={{ margin: 0 }}>
            Acá vas a ver cuánto te cuesta cada cartera y a cuánto conviene venderla.
          </p>
        </div>
      </div>

      <section className="seccion">
        <h2>Costos por producto</h2>
        {tandas.length === 0 ? (
          <div className="tarjeta">
            <p>
              Para calcular cuánto te cuesta cada cartera, la app necesita saber cuántas vas a
              hacer. Armá tu primera tanda (por ejemplo: 5 Gauchitas, 5 Potras, 5 Criollas).
            </p>
            <Link to="/tandas" className="btn btn-principal">
              Armar la Tanda 1
            </Link>
          </div>
        ) : (
          <div className="tarjeta tabla-scroll resumen" style={{ padding: 8 }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Tanda</th>
                  <th className="num">Costo real por unidad</th>
                  <th className="num">Costo con arranque</th>
                  <th className="num">Precio sugerido</th>
                </tr>
              </thead>
              <tbody>
                {filas.map(({ p, t, c, ta, ca }) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/productos/${p.id}`}>{p.nombre}</Link>{' '}
                      {c?.incluyeEstimados && <span className="badge badge-estimado">incluye estimados</span>}
                      {c && c.faltan.length > 0 && (
                        <div className="nota">Falta cargar: {c.faltan.join(', ').toLowerCase()}</div>
                      )}
                    </td>
                    <td className="sin-corte">{t?.nombre ?? <span className="suave">en ninguna tanda</span>}</td>
                    <td className="num">
                      {c ? (
                        <>
                          <strong>{pesos(c.real)}</strong>
                          <Info>{c.explicaciones.real}</Info>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="num">
                      {ca ? (
                        <>
                          {pesos(ca.conArranque)}
                          <Info>
                            {ta && t && ta.id !== t.id ? `En ${ta.nombre}: ` : ''}
                            {ca.explicaciones.conArranque}
                          </Info>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="num suave chico">próxima etapa</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {pendientes.length > 0 && (
        <section className="seccion">
          <h2>Datos que faltan</h2>
          <p className="suave chico">
            Mientras falten, los números que dependen de ellos quedan incompletos. Tocá cada uno
            para completarlo.
          </p>
          <ul className="lista-pendientes">
            {pendientes.map((p) => (
              <li key={p.texto + p.enlace}>
                <Link to={p.enlace}>{p.texto}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="seccion">
        <div className="titulo-pagina" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Productos</h2>
          <Link to="/productos?nuevo=1" className="btn">
            + Nuevo producto
          </Link>
        </div>
        <div className="grilla">
          {principales.map((p) => (
            <TarjetaProducto key={p.id} p={p} />
          ))}
        </div>
        {subproductos.length > 0 && (
          <>
            <h3 style={{ marginTop: 32 }}>Subproductos</h3>
            <div className="grilla">
              {subproductos.map((p) => (
                <TarjetaProducto key={p.id} p={p} />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  )
}
