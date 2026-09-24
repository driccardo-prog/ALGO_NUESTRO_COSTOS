import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Confirmar } from '../components/Confirmar'
import { ResumenTanda } from '../components/ResumenTanda'
import { tandasOrdenadas, totalUnidades } from '../lib/costeo'
import { useData } from '../lib/data'
import { fecha, hoyISO, leerNumero } from '../lib/format'
import { ESTADOS_TANDA, TIPOS } from '../lib/gastos'
import type { EstadoTanda, Tanda } from '../lib/types'

export function Tandas() {
  const { tandas, productos, gastos, config } = useData()
  const [editando, setEditando] = useState<Tanda | 'nueva' | null>(null)

  return (
    <>
      <div className="titulo-pagina">
        <div>
          <h1>Tandas</h1>
          <p className="suave" style={{ margin: 0 }}>
            Una tanda es un lote de producción. Los gastos se reparten entre sus unidades.
          </p>
        </div>
        <button className="btn btn-principal" onClick={() => setEditando('nueva')}>
          + Nueva tanda
        </button>
      </div>

      {tandas.length === 0 && (
        <div className="tarjeta">
          <p>Todavía no armaste ninguna tanda.</p>
          <p className="suave">
            Por ejemplo: "Tanda 1: 5 Gauchitas, 5 Potras, 5 Criollas". Con eso la app ya puede
            calcular cuánto te cuesta cada cartera.
          </p>
        </div>
      )}

      <div className="grilla">
        {tandasOrdenadas(tandas).map((t) => {
          const nGastos = gastos.filter((g) => g.tanda_id === t.id).length
          return (
            <div key={t.id} className="tarjeta">
              <div className="acciones" style={{ justifyContent: 'space-between' }}>
                <span className="badge badge-neutro">{ESTADOS_TANDA[t.estado]}</span>
                <span className="suave chico">{fecha(t.fecha)}</span>
              </div>
              <h3 style={{ marginTop: 10 }}>{t.nombre}</h3>
              <table className="tabla" style={{ marginBottom: 12 }}>
                <tbody>
                  {productos
                    .filter((p) => (t.unidades[p.id] ?? 0) > 0)
                    .map((p) => (
                      <tr key={p.id}>
                        <td style={{ padding: '6px 0' }}>{p.nombre}</td>
                        <td className="num" style={{ padding: '6px 0' }}>
                          {t.unidades[p.id]}
                        </td>
                      </tr>
                    ))}
                  <tr>
                    <td style={{ padding: '6px 0' }}>
                      <strong>Total</strong>
                    </td>
                    <td className="num" style={{ padding: '6px 0' }}>
                      <strong>{totalUnidades(t)} unidades</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
              {t.notas && <p className="nota">{t.notas}</p>}
              <details className="detalle-tanda">
                <summary>¿Cuánto sale esta tanda?</summary>
                <ResumenTanda tandaId={t.id} margen={config.margen_principal} />
              </details>
              <div className="acciones" style={{ justifyContent: 'space-between' }}>
                <Link to={`/gastos?tanda=${t.id}`} className="chico">
                  {nGastos} gasto{nGastos === 1 ? '' : 's'}
                </Link>
                <button className="btn" onClick={() => setEditando(t)}>
                  Editar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {editando && (
        <FormTanda
          tanda={editando === 'nueva' ? null : editando}
          onCerrar={() => setEditando(null)}
        />
      )}
    </>
  )
}

function FormTanda({ tanda, onCerrar }: { tanda: Tanda | null; onCerrar: () => void }) {
  const { tandas, productos, gastos, crear, editar, borrar } = useData()
  const [nombre, setNombre] = useState(tanda?.nombre ?? (tandas.length === 0 ? 'Lanzamiento' : `Tanda ${tandas.length + 1}`))
  const [fechaT, setFechaT] = useState(tanda?.fecha ?? hoyISO())
  const [estado, setEstado] = useState<EstadoTanda>(tanda?.estado ?? 'planificada')
  const [unidades, setUnidades] = useState<Record<string, string>>(() =>
    Object.fromEntries(productos.map((p) => [p.id, String(tanda?.unidades[p.id] ?? '')])),
  )
  const [notas, setNotas] = useState(tanda?.notas ?? '')
  // Gastos específicos o generales que todavía no tienen tanda
  const sinTanda = gastos.filter(
    (g) => (g.tipo === 'especifico' || g.tipo === 'general') && !g.tanda_id,
  )
  const [asignar, setAsignar] = useState<string[]>(() => (tanda ? [] : sinTanda.map((g) => g.id)))
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!nombre.trim()) errs.nombre = 'Poné un nombre, por ejemplo "Tanda 1"'
    const u: Record<string, number> = {}
    for (const p of productos) {
      const n = leerNumero(unidades[p.id] ?? '')
      if (n !== null && (n < 0 || !Number.isInteger(n))) errs[p.id] = 'Tiene que ser un número entero'
      else if (n) u[p.id] = n
    }
    if (Object.keys(u).length === 0 && !errs.nombre) errs.unidades = 'Cargá las unidades de al menos un producto'
    setErrores(errs)
    if (Object.keys(errs).length) return

    setGuardando(true)
    setErrorGeneral(null)
    try {
      const fila: Tanda = {
        id: tanda?.id ?? crypto.randomUUID(),
        nombre: nombre.trim(),
        fecha: fechaT || null,
        estado,
        unidades: u,
        notas: notas.trim(),
      }
      if (tanda) await editar('tandas', tanda.id, fila)
      else await crear('tandas', fila)
      for (const id of asignar) await editar('gastos', id, { tanda_id: fila.id })
      onCerrar()
    } catch (err) {
      setErrorGeneral((err as Error).message)
      setGuardando(false)
    }
  }

  async function borrarTanda() {
    setConfirmarBorrado(false)
    try {
      for (const g of gastos.filter((x) => x.tanda_id === tanda!.id))
        await editar('gastos', g.id, { tanda_id: null })
      await borrar('tandas', tanda!.id)
      onCerrar()
    } catch (err) {
      setErrorGeneral((err as Error).message)
    }
  }

  const alternar = (id: string) =>
    setAsignar((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]))
  const gastosDeEsta = tanda ? gastos.filter((g) => g.tanda_id === tanda.id).length : 0

  return (
    <div className="fondo-dialogo" onClick={onCerrar}>
      <form
        className="dialogo dialogo-ancho"
        onClick={(e) => e.stopPropagation()}
        onSubmit={guardar}
        noValidate
      >
        <h2>{tanda ? 'Editar tanda' : 'Nueva tanda'}</h2>
        {errorGeneral && <div className="mensaje-error">{errorGeneral}</div>}
        <div className="campo">
          <label htmlFor="t-nombre">Nombre</label>
          <input
            id="t-nombre"
            value={nombre}
            className={errores.nombre ? 'invalido' : ''}
            onChange={(e) => setNombre(e.target.value)}
          />
          {errores.nombre && <span className="error-campo">{errores.nombre}</span>}
        </div>
        <div className="fila-campos">
          <div className="campo">
            <label htmlFor="t-fecha">Fecha</label>
            <input id="t-fecha" type="date" value={fechaT} onChange={(e) => setFechaT(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="t-estado">Estado</label>
            <select
              id="t-estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoTanda)}
            >
              {Object.entries(ESTADOS_TANDA).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="etiqueta">Unidades por producto</span>
        <div className="lista-checks" style={{ margin: '8px 0 16px' }}>
          {productos.map((p) => (
            <div key={p.id}>
              <div className="acciones" style={{ justifyContent: 'space-between' }}>
                <label htmlFor={`t-u-${p.id}`}>
                  {p.nombre} {p.es_subproducto && <span className="badge">subproducto</span>}
                </label>
                <input
                  id={`t-u-${p.id}`}
                  inputMode="numeric"
                  className={`input-chico ${errores[p.id] ? 'invalido' : ''}`}
                  placeholder="0"
                  value={unidades[p.id] ?? ''}
                  onChange={(e) => setUnidades((x) => ({ ...x, [p.id]: e.target.value }))}
                />
              </div>
              {errores[p.id] && <span className="error-campo chico">{errores[p.id]}</span>}
            </div>
          ))}
          {errores.unidades && <span className="error-campo chico">{errores.unidades}</span>}
        </div>

        {sinTanda.length > 0 && (
          <div className="campo">
            <span className="etiqueta">Gastos sin tanda para sumar a esta</span>
            <span className="ayuda">
              Tildá los que corresponden a esta tanda (por ejemplo, las cajas y bolsas cotizadas).
            </span>
            <div className="lista-checks" style={{ marginTop: 6 }}>
              {sinTanda.map((g) => (
                <label key={g.id} className="check chico">
                  <input
                    type="checkbox"
                    checked={asignar.includes(g.id)}
                    onChange={() => alternar(g.id)}
                  />
                  {g.descripcion}
                  <span className="suave">· {TIPOS[g.tipo].nombre.toLowerCase()}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="campo">
          <label htmlFor="t-notas">Notas</label>
          <textarea id="t-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>

        <div className="acciones" style={{ justifyContent: 'space-between' }}>
          {tanda ? (
            <button
              type="button"
              className="btn btn-texto btn-peligro"
              onClick={() => setConfirmarBorrado(true)}
            >
              Borrar tanda
            </button>
          ) : (
            <span />
          )}
          <div className="acciones">
            <button type="button" className="btn" onClick={onCerrar}>
              Cancelar
            </button>
            <button className="btn btn-principal" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar tanda'}
            </button>
          </div>
        </div>

        {confirmarBorrado && (
          <Confirmar
            titulo={`¿Borrar ${tanda?.nombre}?`}
            onConfirmar={borrarTanda}
            onCancelar={() => setConfirmarBorrado(false)}
          >
            No se puede deshacer.
            {gastosDeEsta > 0 &&
              ` Sus ${gastosDeEsta} gasto${gastosDeEsta > 1 ? 's' : ''} no se borra${gastosDeEsta > 1 ? 'n' : ''}: quedan sin tanda.`}
          </Confirmar>
        )}
      </form>
    </div>
  )
}
