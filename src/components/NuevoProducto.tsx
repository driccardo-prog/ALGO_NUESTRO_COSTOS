import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../lib/data'
import { fichaVacia } from '../lib/seed'
import { hoyISO } from '../lib/format'

function siguienteCodigo(codigos: string[]): string {
  const nums = codigos.map((c) => Number(c.match(/^AN_(\d+)$/)?.[1] ?? 0))
  const n = Math.max(0, ...nums) + 1
  return `AN_${String(n).padStart(3, '0')}`
}

export function NuevoProducto({ onCerrar }: { onCerrar: () => void }) {
  const { productos, crear } = useData()
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState(() => siguienteCodigo(productos.map((p) => p.codigo)))
  const [nombre, setNombre] = useState('')
  const [tipologia, setTipologia] = useState('')
  const [esSub, setEsSub] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!codigo.trim()) errs.codigo = 'Poné un código, por ejemplo AN_004'
    else if (productos.some((p) => p.codigo.toLowerCase() === codigo.trim().toLowerCase()))
      errs.codigo = 'Ya hay un producto con ese código'
    if (!nombre.trim()) errs.nombre = 'Poné el nombre del producto'
    setErrores(errs)
    if (Object.keys(errs).length) return

    setGuardando(true)
    try {
      const p = await crear('productos', {
        id: crypto.randomUUID(),
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        tipologia: tipologia.trim(),
        es_subproducto: esSub,
        orden: Math.max(0, ...productos.map((x) => x.orden)) + 1,
        ficha: { ...fichaVacia(), fecha: hoyISO() },
      })
      navigate(`/productos/${p.id}?pestana=ficha&editar=1`)
    } catch (err) {
      setErrorGeneral((err as Error).message)
      setGuardando(false)
    }
  }

  return (
    <div className="fondo-dialogo" onClick={onCerrar}>
      <form className="dialogo" onClick={(e) => e.stopPropagation()} onSubmit={guardar} noValidate>
        <h2>Nuevo producto</h2>
        {errorGeneral && <div className="mensaje-error">{errorGeneral}</div>}
        <div className="campo">
          <label htmlFor="np-nombre">Nombre</label>
          <input
            id="np-nombre"
            value={nombre}
            autoFocus
            placeholder="Ej: Cartera Tropilla"
            className={errores.nombre ? 'invalido' : ''}
            onChange={(e) => setNombre(e.target.value)}
          />
          {errores.nombre && <span className="error-campo">{errores.nombre}</span>}
        </div>
        <div className="fila-campos">
          <div className="campo">
            <label htmlFor="np-codigo">Código</label>
            <input
              id="np-codigo"
              value={codigo}
              className={errores.codigo ? 'invalido' : ''}
              onChange={(e) => setCodigo(e.target.value)}
            />
            {errores.codigo && <span className="error-campo">{errores.codigo}</span>}
          </div>
          <div className="campo">
            <label htmlFor="np-tipo">Tipología</label>
            <input
              id="np-tipo"
              value={tipologia}
              placeholder="Ej: Tote, Bandolera"
              onChange={(e) => setTipologia(e.target.value)}
            />
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={esSub} onChange={(e) => setEsSub(e.target.checked)} />
          Es un subproducto (hecho con el descarte de cuero)
        </label>
        {esSub && (
          <p className="suave chico" style={{ marginTop: 8 }}>
            En los subproductos el cuero cuesta $ 0 (ya lo pagó el producto principal). Solo se
            suman sus costos propios: mano de obra, herrajes, packaging.
          </p>
        )}
        <div className="acciones" style={{ marginTop: 24, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn btn-principal" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Crear producto'}
          </button>
        </div>
      </form>
    </div>
  )
}
