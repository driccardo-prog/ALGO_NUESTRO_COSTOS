import { Link } from 'react-router-dom'
import type { Producto } from '../lib/types'
import { Foto } from './Foto'

export function TarjetaProducto({ p }: { p: Producto }) {
  const foto = p.ficha.fotos[0]
  return (
    <Link to={`/productos/${p.id}`} className="tarjeta producto-card">
      {foto ? (
        <Foto ruta={foto} className="foto-mini" />
      ) : (
        <div className="foto-mini vacia">sin foto</div>
      )}
      <div className="codigo">
        {p.codigo} {p.es_subproducto && <span className="badge">subproducto</span>}
      </div>
      <h3>{p.nombre}</h3>
      <div className="suave chico">{p.tipologia}</div>
    </Link>
  )
}
