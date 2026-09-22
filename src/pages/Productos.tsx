import { useNavigate, useSearchParams } from 'react-router-dom'
import { NuevoProducto } from '../components/NuevoProducto'
import { useData } from '../lib/data'

export function Productos() {
  const { productos } = useData()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const nuevo = params.get('nuevo') === '1'

  return (
    <>
      <div className="titulo-pagina">
        <h1>Productos</h1>
        <button className="btn btn-principal" onClick={() => setParams({ nuevo: '1' })}>
          + Nuevo producto
        </button>
      </div>
      <div className="tarjeta tabla-scroll" style={{ padding: 8 }}>
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Tipología</th>
              <th>Cuero</th>
              <th>Colores</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className="clic" onClick={() => navigate(`/productos/${p.id}`)}>
                <td>{p.codigo}</td>
                <td>
                  {p.nombre} {p.es_subproducto && <span className="badge">subproducto</span>}
                </td>
                <td>{p.tipologia}</td>
                <td>{p.ficha.material_exterior}</td>
                <td>{p.ficha.colores}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {nuevo && <NuevoProducto onCerrar={() => setParams({})} />}
    </>
  )
}
