import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Confirmar } from '../components/Confirmar'
import { IVA } from '../lib/costeo'
import { useData } from '../lib/data'
import { leerNumero, numero, pesos } from '../lib/format'
import { MODOS, TIPOS, unidadesCubiertas } from '../lib/gastos'
import type { Gasto, ModoMonto, TipoGasto } from '../lib/types'

const txt = (n: number | null) => (n === null ? '' : numero(n))

export function GastoForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { gastos, productos, tandas, categorias, crear, editar, borrar } = useData()
  const existente = gastos.find((g) => g.id === id)
  const nuevo = !id

  const [tipo, setTipo] = useState<TipoGasto>(existente?.tipo ?? 'especifico')
  const [descripcion, setDescripcion] = useState(existente?.descripcion ?? '')
  const [categoriaId, setCategoriaId] = useState(existente?.categoria_id ?? '')
  const [fecha, setFecha] = useState(existente?.fecha ?? '')
  const [estado, setEstado] = useState(existente?.estado ?? 'real')
  const [pendiente, setPendiente] = useState(existente?.pendiente ?? false)
  const [modo, setModo] = useState<ModoMonto>(existente?.modo_monto ?? 'total')
  const [monto, setMonto] = useState(txt(existente?.monto ?? null))
  const [precio, setPrecio] = useState(txt(existente?.precio_unitario ?? null))
  const [cantidad, setCantidad] = useState(txt(existente?.cantidad ?? null))
  const [sinIva, setSinIva] = useState(existente?.sin_iva ?? false)
  const [tandaId, setTandaId] = useState(existente?.tanda_id ?? params.get('tanda') ?? '')
  const [elegidos, setElegidos] = useState<string[]>(existente?.productos ?? [])
  const [conReparto, setConReparto] = useState(!!existente?.reparto)
  const [reparto, setReparto] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(existente?.reparto ?? {}).map(([k, v]) => [k, numero(v)])),
  )
  const [frecuencia, setFrecuencia] = useState(existente?.frecuencia ?? 'mensual')
  const [notas, setNotas] = useState(existente?.notas ?? '')

  const [nuevaCat, setNuevaCat] = useState<string | null>(null)
  const [intentado, setIntentado] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)

  if (id && !existente) {
    return (
      <>
        <Link to="/gastos" className="volver">
          ← Gastos
        </Link>
        <p>No encontramos ese gasto.</p>
      </>
    )
  }

  const usaProductos = tipo === 'especifico' || tipo === 'arranque'
  const usaTanda = tipo === 'especifico' || tipo === 'general'
  const modosPosibles: ModoMonto[] = usaTanda
    ? ['total', 'unitario', 'por_unidad_tanda']
    : ['total', 'unitario']
  const modoEfectivo = modosPosibles.includes(modo) ? modo : 'total'

  const categoria = categorias.find((c) => c.id === categoriaId)
  const subsConCuero =
    categoria?.es_cuero && usaProductos
      ? productos.filter((p) => p.es_subproducto && elegidos.includes(p.id))
      : []

  // Vista previa del monto
  const f = sinIva ? 1 + IVA : 1
  const nMonto = leerNumero(monto)
  const nPrecio = leerNumero(precio)
  const nCantidad = leerNumero(cantidad)
  const tanda = tandas.find((t) => t.id === tandaId)
  let vistaPrevia: string | null = null
  if (!pendiente) {
    if (modoEfectivo === 'total' && nMonto !== null) vistaPrevia = pesos(nMonto * f, true)
    if (modoEfectivo === 'unitario' && nPrecio !== null && nCantidad !== null)
      vistaPrevia = `${pesos(nPrecio * f, true)} × ${numero(nCantidad)} = ${pesos(nPrecio * nCantidad * f, true)}`
    if (modoEfectivo === 'por_unidad_tanda' && nPrecio !== null) {
      const borrador = { tipo, productos: elegidos } as Gasto
      const n = unidadesCubiertas(borrador, tanda)
      vistaPrevia = tanda
        ? `${pesos(nPrecio * f, true)} × ${n} unidades de la tanda = ${pesos(nPrecio * f * n, true)}`
        : `${pesos(nPrecio * f, true)} por unidad (el total se calcula al asignar una tanda)`
    }
  }

  const alternar = (pid: string) =>
    setElegidos((xs) => (xs.includes(pid) ? xs.filter((x) => x !== pid) : [...xs, pid]))

  const sumaReparto = elegidos.reduce((a, pid) => a + (leerNumero(reparto[pid] ?? '') ?? 0), 0)

  async function agregarCategoria() {
    const nombre = (nuevaCat ?? '').trim()
    if (!nombre) return
    try {
      const c = await crear('categorias', {
        id: crypto.randomUUID(),
        nombre,
        es_cuero: false,
        orden: Math.max(0, ...categorias.map((x) => x.orden)) + 1,
      })
      setCategoriaId(c.id)
      setNuevaCat(null)
    } catch (err) {
      setErrorGeneral((err as Error).message)
    }
  }

  // Los errores se recalculan en cada cambio, así desaparecen apenas se corrige el campo.
  function validar(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!descripcion.trim()) errs.descripcion = 'Escribí qué es este gasto'
    if (!categoriaId) errs.categoria = 'Elegí una categoría'
    if (!pendiente) {
      if (modoEfectivo === 'total' && !(nMonto && nMonto > 0)) errs.monto = 'Escribí el monto'
      if (modoEfectivo !== 'total' && !(nPrecio && nPrecio > 0)) errs.precio = 'Escribí el precio'
      if (modoEfectivo === 'unitario' && !(nCantidad && nCantidad > 0))
        errs.cantidad = 'Escribí la cantidad'
    }
    if (usaProductos && elegidos.length === 0) errs.productos = 'Elegí al menos un producto'
    if (usaProductos && conReparto && elegidos.length > 1 && Math.abs(sumaReparto - 100) > 0.01)
      errs.reparto = `Los porcentajes tienen que sumar 100% (ahora suman ${numero(sumaReparto)}%)`
    return errs
  }
  const errores = intentado ? validar() : {}

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setIntentado(true)
    if (Object.keys(validar()).length) return

    const fila: Gasto = {
      id: existente?.id ?? crypto.randomUUID(),
      tipo,
      descripcion: descripcion.trim(),
      categoria_id: categoriaId,
      fecha: fecha || null,
      estado,
      pendiente,
      modo_monto: modoEfectivo,
      monto: !pendiente && modoEfectivo === 'total' ? nMonto : null,
      precio_unitario: !pendiente && modoEfectivo !== 'total' ? nPrecio : null,
      cantidad: !pendiente && modoEfectivo === 'unitario' ? nCantidad : null,
      sin_iva: sinIva,
      tanda_id: usaTanda && tandaId ? tandaId : null,
      productos: usaProductos ? elegidos : [],
      reparto:
        usaProductos && conReparto && elegidos.length > 1
          ? Object.fromEntries(elegidos.map((pid) => [pid, leerNumero(reparto[pid] ?? '') ?? 0]))
          : null,
      frecuencia: tipo === 'recurrente' ? frecuencia : null,
      notas: notas.trim(),
    }
    setGuardando(true)
    setErrorGeneral(null)
    try {
      if (existente) await editar('gastos', existente.id, fila)
      else await crear('gastos', fila)
      navigate('/gastos')
    } catch (err) {
      setErrorGeneral((err as Error).message)
      setGuardando(false)
    }
  }

  async function borrarGasto() {
    setConfirmarBorrado(false)
    try {
      await borrar('gastos', existente!.id)
      navigate('/gastos')
    } catch (err) {
      setErrorGeneral((err as Error).message)
    }
  }

  return (
    <>
      <Link to="/gastos" className="volver">
        ← Gastos
      </Link>
      <div className="titulo-pagina">
        <h1>{nuevo ? 'Nuevo gasto' : 'Editar gasto'}</h1>
        {existente && (
          <button className="btn btn-texto btn-peligro" onClick={() => setConfirmarBorrado(true)}>
            Borrar gasto
          </button>
        )}
      </div>

      <form className="tarjeta formulario" onSubmit={guardar} noValidate>
        {errorGeneral && <div className="mensaje-error">{errorGeneral}</div>}

        <div className="campo">
          <span className="etiqueta">¿Qué tipo de gasto es?</span>
          <div className="opciones-tipo">
            {(Object.keys(TIPOS) as TipoGasto[]).map((t) => (
              <label key={t} className={`opcion-tipo ${tipo === t ? 'elegida' : ''}`}>
                <input
                  type="radio"
                  name="tipo"
                  checked={tipo === t}
                  onChange={() => setTipo(t)}
                />
                <strong>{TIPOS[t].nombre}</strong>
                <span className="chico suave">{TIPOS[t].ayuda}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="fila-campos">
          <div className="campo">
            <label htmlFor="g-desc">Descripción</label>
            <input
              id="g-desc"
              value={descripcion}
              placeholder="Ej: Mano de obra taller"
              className={errores.descripcion ? 'invalido' : ''}
              onChange={(e) => setDescripcion(e.target.value)}
            />
            {errores.descripcion && <span className="error-campo">{errores.descripcion}</span>}
          </div>
          <div className="campo">
            <label htmlFor="g-cat">Categoría</label>
            {nuevaCat === null ? (
              <>
                <select
                  id="g-cat"
                  value={categoriaId}
                  className={errores.categoria ? 'invalido' : ''}
                  onChange={(e) => setCategoriaId(e.target.value)}
                >
                  <option value="">Elegí una…</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-texto chico"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => setNuevaCat('')}
                >
                  + Nueva categoría
                </button>
              </>
            ) : (
              <div className="acciones">
                <input
                  id="g-cat"
                  value={nuevaCat}
                  autoFocus
                  placeholder="Nombre de la categoría"
                  style={{ flex: 1, width: 'auto' }}
                  onChange={(e) => setNuevaCat(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      agregarCategoria()
                    }
                  }}
                />
                <button type="button" className="btn" onClick={agregarCategoria}>
                  Agregar
                </button>
                <button type="button" className="btn-x" onClick={() => setNuevaCat(null)}>
                  ×
                </button>
              </div>
            )}
            {errores.categoria && <span className="error-campo">{errores.categoria}</span>}
          </div>
        </div>

        <div className="fila-campos">
          <div className="campo">
            <label htmlFor="g-fecha">Fecha</label>
            <input id="g-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="campo">
            <span className="etiqueta">Estado</span>
            <div className="acciones" style={{ minHeight: 42 }}>
              <label className="check">
                <input type="radio" checked={estado === 'real'} onChange={() => setEstado('real')} />
                Real (ya lo pagué)
              </label>
              <label className="check">
                <input
                  type="radio"
                  checked={estado === 'estimado'}
                  onChange={() => setEstado('estimado')}
                />
                Estimado (presupuesto)
              </label>
            </div>
          </div>
        </div>

        <h3 className="subtitulo-form">Monto</h3>
        <label className="check" style={{ marginBottom: 16 }}>
          <input type="checkbox" checked={pendiente} onChange={(e) => setPendiente(e.target.checked)} />
          Todavía no sé el monto (queda como pendiente, en amarillo)
        </label>

        {!pendiente && (
          <>
            <div className="campo">
              <span className="etiqueta">¿Cómo lo cargás?</span>
              <div className="acciones">
                {modosPosibles.map((m) => (
                  <label key={m} className="check">
                    <input type="radio" checked={modoEfectivo === m} onChange={() => setModo(m)} />
                    {MODOS[m]}
                  </label>
                ))}
              </div>
              {modoEfectivo === 'por_unidad_tanda' && (
                <span className="ayuda">
                  Para cosas que van una por cartera (cajas, bolsas): el total es el precio × las
                  unidades de la tanda.
                </span>
              )}
            </div>
            <div className="fila-campos">
              {modoEfectivo === 'total' ? (
                <CampoPlata id="g-monto" etiqueta="Monto total" valor={monto} setValor={setMonto} error={errores.monto} />
              ) : (
                <CampoPlata
                  id="g-precio"
                  etiqueta={modoEfectivo === 'unitario' ? 'Precio unitario' : 'Precio por unidad'}
                  valor={precio}
                  setValor={setPrecio}
                  error={errores.precio}
                />
              )}
              {modoEfectivo === 'unitario' && (
                <div className="campo">
                  <label htmlFor="g-cant">Cantidad</label>
                  <input
                    id="g-cant"
                    inputMode="decimal"
                    value={cantidad}
                    className={errores.cantidad ? 'invalido' : ''}
                    onChange={(e) => setCantidad(e.target.value)}
                  />
                  {errores.cantidad && <span className="error-campo">{errores.cantidad}</span>}
                </div>
              )}
            </div>
            <label className="check" style={{ marginBottom: 12 }}>
              <input type="checkbox" checked={sinIva} onChange={(e) => setSinIva(e.target.checked)} />
              El precio es sin IVA (sumarle 21%)
            </label>
            {vistaPrevia && (
              <p className="vista-previa">
                Se carga: <strong>{vistaPrevia}</strong>
                {sinIva && ' (con IVA)'}
              </p>
            )}
          </>
        )}

        {tipo === 'recurrente' && (
          <div className="campo">
            <span className="etiqueta">¿Cada cuánto se paga?</span>
            <div className="acciones">
              <label className="check">
                <input
                  type="radio"
                  checked={frecuencia === 'mensual'}
                  onChange={() => setFrecuencia('mensual')}
                />
                Todos los meses
              </label>
              <label className="check">
                <input
                  type="radio"
                  checked={frecuencia === 'anual'}
                  onChange={() => setFrecuencia('anual')}
                />
                Una vez por año (se divide en 12 meses)
              </label>
            </div>
          </div>
        )}

        {(usaTanda || usaProductos) && <h3 className="subtitulo-form">A qué se asigna</h3>}

        {usaTanda && (
          <div className="campo">
            <label htmlFor="g-tanda">Tanda</label>
            <select id="g-tanda" value={tandaId} onChange={(e) => setTandaId(e.target.value)}>
              <option value="">Sin tanda todavía</option>
              {tandas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
            {!tandaId && (
              <span className="ayuda">
                Sin tanda, este gasto todavía no se suma a ningún costo.
                {tandas.length === 0 && (
                  <>
                    {' '}
                    <Link to="/tandas">Armar una tanda</Link>
                  </>
                )}
              </span>
            )}
          </div>
        )}

        {usaProductos && (
          <div className="campo">
            <span className="etiqueta">
              {tipo === 'arranque' ? '¿A qué productos corresponde?' : '¿A qué productos va?'}
            </span>
            <div className="lista-checks">
              {productos.map((p) => (
                <div key={p.id} className="acciones" style={{ gap: 8 }}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={elegidos.includes(p.id)}
                      onChange={() => alternar(p.id)}
                    />
                    {p.nombre}
                    {p.es_subproducto && <span className="badge">subproducto</span>}
                  </label>
                  {conReparto && elegidos.includes(p.id) && elegidos.length > 1 && (
                    <span className="acciones" style={{ gap: 4 }}>
                      <input
                        aria-label={`Porcentaje para ${p.nombre}`}
                        inputMode="decimal"
                        className="input-chico"
                        value={reparto[p.id] ?? ''}
                        onChange={(e) => setReparto((r) => ({ ...r, [p.id]: e.target.value }))}
                      />
                      %
                    </span>
                  )}
                </div>
              ))}
            </div>
            {errores.productos && <span className="error-campo">{errores.productos}</span>}
            {elegidos.length > 1 && modoEfectivo !== 'por_unidad_tanda' && (
              <>
                <label className="check" style={{ marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={conReparto}
                    onChange={(e) => setConReparto(e.target.checked)}
                  />
                  Reparto personalizado (un % para cada producto)
                </label>
                <span className="ayuda">
                  {conReparto
                    ? `Ej: cuero 60% Criolla y 40% Gauchita porque la Criolla usa más. Suman ${numero(sumaReparto)}%.`
                    : tipo === 'arranque'
                      ? 'Si no, se reparte en partes iguales entre los productos elegidos.'
                      : 'Si no, se reparte en partes iguales entre todas las unidades de esos productos.'}
                </span>
                {errores.reparto && <span className="error-campo">{errores.reparto}</span>}
              </>
            )}
            {subsConCuero.length > 0 && (
              <div className="pendiente" style={{ marginTop: 10 }}>
                Ojo: {subsConCuero.map((s) => s.nombre).join(', ')}{' '}
                {subsConCuero.length > 1 ? 'son subproductos' : 'es un subproducto'}. En los
                subproductos el cuero cuesta $ 0 (ya lo pagó el producto principal), así que este
                gasto no se les va a sumar.
              </div>
            )}
          </div>
        )}

        <div className="campo">
          <label htmlFor="g-notas">Notas</label>
          <textarea id="g-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>

        <div className="acciones" style={{ justifyContent: 'flex-end' }}>
          <Link to="/gastos" className="btn">
            Cancelar
          </Link>
          <button className="btn btn-principal" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar gasto'}
          </button>
        </div>
      </form>

      {confirmarBorrado && (
        <Confirmar
          titulo={`¿Borrar "${existente?.descripcion}"?`}
          onConfirmar={borrarGasto}
          onCancelar={() => setConfirmarBorrado(false)}
        >
          No se puede deshacer.
        </Confirmar>
      )}
    </>
  )
}

function CampoPlata({
  id,
  etiqueta,
  valor,
  setValor,
  error,
}: {
  id: string
  etiqueta: string
  valor: string
  setValor: (v: string) => void
  error?: string
}) {
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <div className="input-plata">
        <span>$</span>
        <input
          id={id}
          inputMode="decimal"
          value={valor}
          placeholder="0"
          className={error ? 'invalido' : ''}
          onChange={(e) => setValor(e.target.value)}
        />
      </div>
      {error && <span className="error-campo">{error}</span>}
    </div>
  )
}
