import { useState, type FormEvent, type ReactNode } from 'react'
import { useData } from '../lib/data'
import { fecha } from '../lib/format'
import type { Dimension, Ficha, Producto } from '../lib/types'
import { FotosProducto } from './FotosProducto'
import { ListaEditable } from './ListaEditable'

export function FichaTecnica({
  producto,
  editarAlEntrar = false,
}: {
  producto: Producto
  editarAlEntrar?: boolean
}) {
  const [editando, setEditando] = useState(editarAlEntrar)
  const [guardado, setGuardado] = useState(false)

  return (
    <>
      {guardado && !editando && <div className="mensaje-ok">Cambios guardados.</div>}
      {editando ? (
        <FormFicha
          producto={producto}
          onListo={(ok) => {
            setEditando(false)
            setGuardado(ok)
          }}
        />
      ) : (
        <VistaFicha
          producto={producto}
          onEditar={() => {
            setGuardado(false)
            setEditando(true)
          }}
        />
      )}
    </>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="bloque-ficha">
      <h3>{titulo}</h3>
      {children}
    </div>
  )
}

function Lista({ items }: { items: string[] }) {
  const llenos = items.filter((x) => x.trim())
  if (llenos.length === 0) return <p className="suave">—</p>
  return (
    <ul>
      {llenos.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  )
}

function VistaFicha({ producto: p, onEditar }: { producto: Producto; onEditar: () => void }) {
  const f = p.ficha
  return (
    <div className="tarjeta">
      <div className="titulo-pagina" style={{ marginBottom: 20 }}>
        <div className="suave chico">
          Ficha técnica {f.version && `· ${f.version}`} {f.fecha && `· ${fecha(f.fecha)}`}
        </div>
        <button className="btn" onClick={onEditar}>
          Editar ficha
        </button>
      </div>
      <div className="ficha">
        <div>
          <Bloque titulo="Producto">
            <dl>
              <dt>Código</dt>
              <dd>{p.codigo}</dd>
              <dt>Nombre</dt>
              <dd>{p.nombre}</dd>
              <dt>Tipología</dt>
              <dd>{p.tipologia || '—'}</dd>
            </dl>
            {f.descripcion && <p style={{ marginTop: 12 }}>{f.descripcion}</p>}
          </Bloque>
          <Bloque titulo="Dimensiones">
            {f.dimensiones.length === 0 ? (
              <p className="suave">—</p>
            ) : (
              <dl>
                {f.dimensiones.map((d, i) => (
                  <Fila key={i} d={d} />
                ))}
              </dl>
            )}
          </Bloque>
          <Bloque titulo="Materiales">
            <dl>
              <dt>Exterior</dt>
              <dd>{f.material_exterior || '—'}</dd>
              <dt>Interior</dt>
              <dd>{f.material_interior || '—'}</dd>
              <dt>Colores / cueros</dt>
              <dd>{f.colores || '—'}</dd>
            </dl>
          </Bloque>
        </div>
        <div>
          <Bloque titulo="Diseño exterior">
            <Lista items={f.diseno_exterior} />
          </Bloque>
          <Bloque titulo="Diseño interior">
            <Lista items={f.diseno_interior} />
          </Bloque>
          <Bloque titulo="Herrajes y terminaciones">
            <Lista items={f.herrajes} />
          </Bloque>
          <Bloque titulo="Fotos">
            <FotosProducto producto={p} />
          </Bloque>
        </div>
      </div>
    </div>
  )
}

function Fila({ d }: { d: Dimension }) {
  return (
    <>
      <dt>{d.medida}</dt>
      <dd>{d.valor}</dd>
    </>
  )
}

function FormFicha({
  producto,
  onListo,
}: {
  producto: Producto
  onListo: (guardado: boolean) => void
}) {
  const { productos, editar } = useData()
  const [codigo, setCodigo] = useState(producto.codigo)
  const [nombre, setNombre] = useState(producto.nombre)
  const [tipologia, setTipologia] = useState(producto.tipologia)
  const [esSub, setEsSub] = useState(producto.es_subproducto)
  const [f, setF] = useState<Ficha>(producto.ficha)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const set = <K extends keyof Ficha>(k: K, v: Ficha[K]) => setF((x) => ({ ...x, [k]: v }))

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!codigo.trim()) errs.codigo = 'El código no puede quedar vacío'
    else if (
      productos.some(
        (p) => p.id !== producto.id && p.codigo.toLowerCase() === codigo.trim().toLowerCase(),
      )
    )
      errs.codigo = 'Ya hay otro producto con ese código'
    if (!nombre.trim()) errs.nombre = 'El nombre no puede quedar vacío'
    setErrores(errs)
    if (Object.keys(errs).length) return

    setGuardando(true)
    setErrorGeneral(null)
    const limpiarLista = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean)
    try {
      await editar('productos', producto.id, {
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        tipologia: tipologia.trim(),
        es_subproducto: esSub,
        ficha: {
          ...f,
          // las fotos se guardan aparte, al subirlas
          fotos: producto.ficha.fotos,
          dimensiones: f.dimensiones.filter((d) => d.medida.trim() || d.valor.trim()),
          diseno_exterior: limpiarLista(f.diseno_exterior),
          diseno_interior: limpiarLista(f.diseno_interior),
          herrajes: limpiarLista(f.herrajes),
        },
      })
      onListo(true)
    } catch (err) {
      setErrorGeneral((err as Error).message)
      setGuardando(false)
    }
  }

  const cambiarDim = (i: number, k: keyof Dimension, v: string) =>
    set(
      'dimensiones',
      f.dimensiones.map((d, j) => (j === i ? { ...d, [k]: v } : d)),
    )

  return (
    <form className="tarjeta" onSubmit={guardar} noValidate>
      <h2>Editar ficha técnica</h2>
      {errorGeneral && <div className="mensaje-error">{errorGeneral}</div>}
      <div className="ficha">
        <div>
          <h3>Producto</h3>
          <div className="campo">
            <label htmlFor="f-nombre">Nombre</label>
            <input
              id="f-nombre"
              value={nombre}
              className={errores.nombre ? 'invalido' : ''}
              onChange={(e) => setNombre(e.target.value)}
            />
            {errores.nombre && <span className="error-campo">{errores.nombre}</span>}
          </div>
          <div className="fila-campos">
            <div className="campo">
              <label htmlFor="f-codigo">Código</label>
              <input
                id="f-codigo"
                value={codigo}
                className={errores.codigo ? 'invalido' : ''}
                onChange={(e) => setCodigo(e.target.value)}
              />
              {errores.codigo && <span className="error-campo">{errores.codigo}</span>}
            </div>
            <div className="campo">
              <label htmlFor="f-tipo">Tipología</label>
              <input id="f-tipo" value={tipologia} onChange={(e) => setTipologia(e.target.value)} />
            </div>
          </div>
          <div className="fila-campos">
            <div className="campo">
              <label htmlFor="f-version">Versión</label>
              <input
                id="f-version"
                value={f.version}
                placeholder="v1"
                onChange={(e) => set('version', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="f-fecha">Fecha</label>
              <input
                id="f-fecha"
                type="date"
                value={f.fecha}
                onChange={(e) => set('fecha', e.target.value)}
              />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="f-desc">Descripción breve</label>
            <textarea
              id="f-desc"
              value={f.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
            />
          </div>
          <label className="check" style={{ marginBottom: 24 }}>
            <input type="checkbox" checked={esSub} onChange={(e) => setEsSub(e.target.checked)} />
            Es un subproducto (el cuero cuesta $ 0)
          </label>

          <h3>Dimensiones</h3>
          <div className="lista-editable" style={{ marginBottom: 24 }}>
            {f.dimensiones.map((d, i) => (
              <div className="item" key={i}>
                <input
                  value={d.medida}
                  placeholder="Medida (ej: Ancho)"
                  aria-label="Medida"
                  onChange={(e) => cambiarDim(i, 'medida', e.target.value)}
                />
                <input
                  value={d.valor}
                  placeholder="Valor (ej: 36 cm)"
                  aria-label="Valor"
                  onChange={(e) => cambiarDim(i, 'valor', e.target.value)}
                />
                <button
                  type="button"
                  className="btn-x"
                  aria-label="Quitar medida"
                  onClick={() =>
                    set(
                      'dimensiones',
                      f.dimensiones.filter((_, j) => j !== i),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <div>
              <button
                type="button"
                className="btn btn-texto"
                onClick={() => set('dimensiones', [...f.dimensiones, { medida: '', valor: '' }])}
              >
                + Agregar medida
              </button>
            </div>
          </div>

          <h3>Materiales</h3>
          <div className="campo">
            <label htmlFor="f-ext">Material exterior</label>
            <input
              id="f-ext"
              value={f.material_exterior}
              onChange={(e) => set('material_exterior', e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="f-int">Material interior</label>
            <input
              id="f-int"
              value={f.material_interior}
              onChange={(e) => set('material_interior', e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="f-col">Colores / cueros</label>
            <input id="f-col" value={f.colores} onChange={(e) => set('colores', e.target.value)} />
          </div>
        </div>

        <div>
          <h3>Diseño exterior</h3>
          <div style={{ marginBottom: 24 }}>
            <ListaEditable
              items={f.diseno_exterior}
              onChange={(v) => set('diseno_exterior', v)}
            />
          </div>
          <h3>Diseño interior</h3>
          <div style={{ marginBottom: 24 }}>
            <ListaEditable
              items={f.diseno_interior}
              onChange={(v) => set('diseno_interior', v)}
            />
          </div>
          <h3>Herrajes y terminaciones</h3>
          <div style={{ marginBottom: 24 }}>
            <ListaEditable items={f.herrajes} onChange={(v) => set('herrajes', v)} />
          </div>
          <p className="suave chico">Las fotos se agregan desde la ficha, fuera de este formulario.</p>
        </div>
      </div>
      <div className="acciones" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={() => onListo(false)}>
          Cancelar
        </button>
        <button className="btn btn-principal" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
