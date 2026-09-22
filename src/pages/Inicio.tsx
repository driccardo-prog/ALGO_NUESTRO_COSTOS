import { Link } from 'react-router-dom'
import { TarjetaProducto } from '../components/TarjetaProducto'
import { useData } from '../lib/data'
import { calcularPendientes } from '../lib/pendientes'

export function Inicio() {
  const { productos, gastos, config } = useData()
  const pendientes = calcularPendientes(config, gastos)
  const principales = productos.filter((p) => !p.es_subproducto)
  const subproductos = productos.filter((p) => p.es_subproducto)

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

      {pendientes.length > 0 && (
        <section className="seccion">
          <h2>Datos que faltan</h2>
          <p className="suave chico">
            Mientras falten, los números que dependen de ellos quedan incompletos.
          </p>
          <ul className="lista-pendientes">
            {pendientes.map((p) => (
              <li key={p.texto}>{p.texto}</li>
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
