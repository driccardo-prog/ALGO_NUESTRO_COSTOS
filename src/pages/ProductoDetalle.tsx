import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Confirmar } from '../components/Confirmar'
import { Costeo } from '../components/Costeo'
import { FichaTecnica } from '../components/FichaTecnica'
import { useData } from '../lib/data'
import { repo } from '../lib/db'

type Pestana = 'costeo' | 'ficha'

export function ProductoDetalle() {
  const { id } = useParams()
  const { productos, gastos, borrar } = useData()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const producto = productos.find((p) => p.id === id)
  if (!producto) {
    return (
      <>
        <Link to="/productos" className="volver">
          ← Productos
        </Link>
        <p>No encontramos ese producto.</p>
      </>
    )
  }

  const pestana: Pestana = params.get('pestana') === 'ficha' ? 'ficha' : 'costeo'
  const irA = (p: Pestana) => setParams({ pestana: p }, { replace: true })
  const gastosDelProducto = gastos.filter((g) => g.productos.includes(producto.id)).length

  async function borrarProducto() {
    setConfirmarBorrado(false)
    try {
      await borrar('productos', producto!.id)
      for (const f of producto!.ficha.fotos) await repo.borrarFoto(f)
      navigate('/productos')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <>
      <Link to="/productos" className="volver">
        ← Productos
      </Link>
      <div className="titulo-pagina">
        <div>
          <div className="suave chico">
            {producto.codigo} · {producto.tipologia}{' '}
            {producto.es_subproducto && <span className="badge">subproducto</span>}
          </div>
          <h1>{producto.nombre}</h1>
        </div>
        <button className="btn btn-texto btn-peligro" onClick={() => setConfirmarBorrado(true)}>
          Borrar producto
        </button>
      </div>
      {error && <div className="mensaje-error">{error}</div>}

      <div className="pestanas" role="tablist">
        <button
          role="tab"
          className={pestana === 'costeo' ? 'activa' : ''}
          onClick={() => irA('costeo')}
        >
          Costeo
        </button>
        <button
          role="tab"
          className={pestana === 'ficha' ? 'activa' : ''}
          onClick={() => irA('ficha')}
        >
          Ficha técnica
        </button>
      </div>

      {pestana === 'ficha' ? (
        <FichaTecnica
          key={producto.id}
          producto={producto}
          editarAlEntrar={params.get('editar') === '1'}
        />
      ) : (
        <Costeo key={producto.id} producto={producto} />
      )}

      {confirmarBorrado && (
        <Confirmar
          titulo={`¿Borrar ${producto.nombre}?`}
          onConfirmar={borrarProducto}
          onCancelar={() => setConfirmarBorrado(false)}
        >
          Se borra el producto con su ficha técnica y sus fotos. No se puede deshacer.
          {gastosDelProducto > 0 &&
            ` Tiene ${gastosDelProducto} gasto${gastosDelProducto > 1 ? 's' : ''} asignado${gastosDelProducto > 1 ? 's' : ''}: esos gastos quedan, pero sin este producto.`}
        </Confirmar>
      )}
    </>
  )
}
