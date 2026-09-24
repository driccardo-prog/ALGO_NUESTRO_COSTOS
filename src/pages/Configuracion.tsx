import { useState } from 'react'
import { Confirmar } from '../components/Confirmar'
import { tandaArranque, unidadesDe } from '../lib/costeo'
import { useData } from '../lib/data'
import { leerNumero, numero, pct } from '../lib/format'
import { comisionAplicada, MEDIOS } from '../lib/precios'
import type { Categoria, ConfigDatos, MedioPago, MetodoReparto } from '../lib/types'

const METODOS: Record<MetodoReparto, { nombre: string; ayuda: string }> = {
  por_unidad: {
    nombre: 'Por unidad',
    ayuda: 'Cada cartera paga lo mismo. Es lo más simple y lo recomendado para empezar.',
  },
  por_costo_directo: {
    nombre: 'Por costo directo',
    ayuda: 'La cartera que cuesta más producir absorbe una parte más grande.',
  },
  por_ventas: {
    nombre: 'Por volumen de ventas',
    ayuda: 'Según cuánto esperás vender de cada una. Sirve más adelante, con historial de ventas.',
  },
}

export function Configuracion() {
  const datos = useData()
  const { config, guardarConfig, productos, tandas } = datos
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar(cambios: Partial<ConfigDatos>) {
    setError(null)
    try {
      await guardarConfig(cambios)
      setGuardado(true)
      window.setTimeout(() => setGuardado(false), 1500)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const principales = productos.filter((p) => !p.es_subproducto)
  const ventasPendientes =
    config.ventas_mensuales_modo === 'total'
      ? config.ventas_mensuales_total === null
      : productos.every((p) => config.ventas_mensuales_por_producto[p.id] == null)

  return (
    <>
      <div className="titulo-pagina">
        <h1>Configuración</h1>
        <span className={`guardado ${guardado ? 'visible' : ''}`} aria-live="polite">
          Guardado
        </span>
      </div>
      {error && <div className="mensaje-error">{error}</div>}

      <section className="tarjeta seccion-config">
        <h2>Ventas mensuales estimadas</h2>
        <p className="suave">
          Cuántas carteras pensás vender por mes. Se usa para repartir los gastos fijos mensuales
          (Tiendanube, monotributo) entre las unidades.
        </p>
        <div className="acciones" style={{ marginBottom: 12 }}>
          <label className="check">
            <input
              type="radio"
              checked={config.ventas_mensuales_modo === 'total'}
              onChange={() => guardar({ ventas_mensuales_modo: 'total' })}
            />
            Un número total
          </label>
          <label className="check">
            <input
              type="radio"
              checked={config.ventas_mensuales_modo === 'por_producto'}
              onChange={() => guardar({ ventas_mensuales_modo: 'por_producto' })}
            />
            Por producto
          </label>
        </div>
        <div className={ventasPendientes ? 'pendiente' : ''}>
          {ventasPendientes && (
            <p className="chico" style={{ marginBottom: 8 }}>
              Pendiente: mientras no lo cargues, los gastos fijos mensuales cuentan $ 0.
            </p>
          )}
          {config.ventas_mensuales_modo === 'total' ? (
            <CampoNumero
              id="v-total"
              etiqueta="Unidades por mes (todas las carteras)"
              valor={config.ventas_mensuales_total}
              onGuardar={(n) => guardar({ ventas_mensuales_total: n })}
            />
          ) : (
            productos.map((p) => (
              <CampoNumero
                key={p.id}
                id={`v-${p.id}`}
                etiqueta={p.nombre}
                valor={config.ventas_mensuales_por_producto[p.id] ?? null}
                onGuardar={(n) =>
                  guardar({
                    ventas_mensuales_por_producto: { ...config.ventas_mensuales_por_producto, [p.id]: n },
                  })
                }
              />
            ))
          )}
        </div>
      </section>

      <section className="tarjeta seccion-config">
        <h2>Cómo se reparten los gastos generales</h2>
        <p className="suave">
          Flete, nafta y otros gastos que no son de un producto en particular. También se usa para
          los gastos fijos mensuales.
        </p>
        <div className="lista-checks">
          {(Object.keys(METODOS) as MetodoReparto[]).map((m) => (
            <label key={m} className="check check-alto">
              <input
                type="radio"
                checked={config.metodo_reparto_generales === m}
                onChange={() => guardar({ metodo_reparto_generales: m })}
              />
              <span>
                <strong>{METODOS[m].nombre}</strong>
                {m === 'por_unidad' && <span className="badge badge-neutro">recomendado</span>}
                <br />
                <span className="suave chico">{METODOS[m].ayuda}</span>
              </span>
            </label>
          ))}
        </div>
        <label className="check" style={{ marginTop: 16 }}>
          <input
            type="checkbox"
            checked={config.subproductos_en_generales}
            onChange={(e) => guardar({ subproductos_en_generales: e.target.checked })}
          />
          Los subproductos (llaveros, monederos) también pagan parte de los gastos generales
        </label>
      </section>

      <section className="tarjeta seccion-config">
        <h2>Qué tanda paga las muestras y los moldes</h2>
        <p className="suave">
          Los gastos de arranque (muestras, moldes) se reparten entre las unidades de una sola tanda
          de cada producto, la de lanzamiento. Por defecto, la primera.
        </p>
        {principales.map((p) => {
          const posibles = tandas.filter((t) => unidadesDe(t, p.id) > 0)
          const actual = tandaArranque(datos, p.id)
          return (
            <div key={p.id} className="campo campo-fila">
              <label htmlFor={`a-${p.id}`}>{p.nombre}</label>
              {posibles.length === 0 ? (
                <span className="suave chico">Todavía no está en ninguna tanda</span>
              ) : (
                <select
                  id={`a-${p.id}`}
                  value={config.arranque_tanda[p.id] ?? ''}
                  onChange={(e) =>
                    guardar({ arranque_tanda: { ...config.arranque_tanda, [p.id]: e.target.value || null } })
                  }
                >
                  <option value="">La primera ({actual && !config.arranque_tanda[p.id] ? actual.nombre : posibles[0].nombre})</option>
                  {posibles.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )
        })}
      </section>

      <Precios guardar={guardar} />

      <Categorias />
    </>
  )
}

function CampoNumero({
  id,
  etiqueta,
  valor,
  onGuardar,
  permitirCero = false,
}: {
  id: string
  etiqueta: string
  valor: number | null
  onGuardar: (n: number | null) => void
  permitirCero?: boolean
}) {
  const [texto, setTexto] = useState(valor === null ? '' : numero(valor))
  const [error, setError] = useState<string | null>(null)
  function confirmar() {
    const n = leerNumero(texto)
    if (texto.trim() && (n === null || n < 0)) {
      setError('Escribí un número')
      return
    }
    setError(null)
    const limpio = n === null ? null : permitirCero ? n : n > 0 ? n : null
    if (limpio !== valor) onGuardar(limpio)
  }
  return (
    <div className="campo campo-fila" style={etiqueta ? undefined : { margin: 0, justifyContent: 'flex-end' }}>
      {etiqueta && <label htmlFor={id}>{etiqueta}</label>}
      <div>
        <input
          id={id}
          aria-label={etiqueta || 'Comisión %'}
          inputMode="decimal"
          className={`input-chico ${error ? 'invalido' : ''}`}
          value={texto}
          placeholder="—"
          onChange={(e) => setTexto(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => e.key === 'Enter' && confirmar()}
        />
        {error && <div className="error-campo">{error}</div>}
      </div>
    </div>
  )
}

function Categorias() {
  const { categorias, gastos, crear, editar, borrar } = useData()
  const [nueva, setNueva] = useState('')
  const [aBorrar, setABorrar] = useState<Categoria | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function agregar() {
    if (!nueva.trim()) return
    try {
      await crear('categorias', {
        id: crypto.randomUUID(),
        nombre: nueva.trim(),
        es_cuero: false,
        orden: Math.max(0, ...categorias.map((c) => c.orden)) + 1,
      })
      setNueva('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function renombrar(c: Categoria, nombre: string) {
    if (!nombre.trim() || nombre.trim() === c.nombre) return
    try {
      await editar('categorias', c.id, { nombre: nombre.trim() })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const usos = (c: Categoria) => gastos.filter((g) => g.categoria_id === c.id).length

  return (
    <section className="tarjeta seccion-config">
      <h2>Categorías de gastos</h2>
      {error && <div className="mensaje-error">{error}</div>}
      <div className="lista-editable">
        {categorias.map((c) => (
          <div className="item" key={c.id}>
            <input
              defaultValue={c.nombre}
              aria-label="Nombre de la categoría"
              onBlur={(e) => renombrar(c, e.target.value)}
            />
            {c.es_cuero && <span className="badge badge-neutro">cuero</span>}
            <button
              type="button"
              className="btn-x"
              aria-label={`Borrar ${c.nombre}`}
              disabled={c.es_cuero || usos(c) > 0}
              title={
                c.es_cuero
                  ? 'La categoría Cuero no se puede borrar'
                  : usos(c) > 0
                    ? `La usan ${usos(c)} gastos`
                    : 'Borrar'
              }
              onClick={() => setABorrar(c)}
            >
              ×
            </button>
          </div>
        ))}
        <div className="item">
          <input
            value={nueva}
            placeholder="Nueva categoría"
            onChange={(e) => setNueva(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && agregar()}
          />
          <button type="button" className="btn" onClick={agregar}>
            Agregar
          </button>
        </div>
      </div>
      {aBorrar && (
        <Confirmar
          titulo={`¿Borrar la categoría "${aBorrar.nombre}"?`}
          onConfirmar={async () => {
            const c = aBorrar
            setABorrar(null)
            try {
              await borrar('categorias', c.id)
            } catch (err) {
              setError((err as Error).message)
            }
          }}
          onCancelar={() => setABorrar(null)}
        />
      )}
    </section>
  )
}

function Precios({ guardar }: { guardar: (c: Partial<ConfigDatos>) => Promise<void> }) {
  const { config } = useData()
  const c = config.comisiones
  const aplicada = comisionAplicada(config)
  const [margenesTexto, setMargenesTexto] = useState(config.margenes.join(', '))
  const [errorMargenes, setErrorMargenes] = useState<string | null>(null)

  const setComision = (clave: keyof ConfigDatos['comisiones'], n: number | null) =>
    guardar({ comisiones: { ...c, [clave]: n } })
  const alternarMedio = (m: MedioPago) =>
    guardar({
      medios_ofrecidos: config.medios_ofrecidos.includes(m)
        ? config.medios_ofrecidos.filter((x) => x !== m)
        : [...config.medios_ofrecidos, m],
    })

  function guardarMargenes() {
    const lista = margenesTexto
      .split(/[,;\s]+/)
      .map((x) => leerNumero(x))
      .filter((x): x is number => x !== null)
    if (lista.length === 0 || lista.some((m) => m <= 0 || m >= 100)) {
      setErrorMargenes('Escribí porcentajes entre 1 y 99, separados por coma. Ej: 30, 40, 50, 60')
      return
    }
    setErrorMargenes(null)
    const margenes = [...new Set(lista)].sort((a, b) => a - b)
    setMargenesTexto(margenes.join(', '))
    guardar({
      margenes,
      margen_principal: margenes.includes(config.margen_principal) ? config.margen_principal : margenes[Math.floor(margenes.length / 2)],
    })
  }

  return (
    <>
      <section className="tarjeta seccion-config">
        <h2>Comisiones por venta</h2>
        <p className="suave">
          En % de cada venta. El precio es uno solo para todos los compradores, así que se calcula
          con el medio de pago <strong>más caro</strong> de los que ofrecés.
        </p>
        <div className={c.tiendanube === null ? 'pendiente' : ''} style={{ marginBottom: 12 }}>
          <CampoNumero
            id="c-tn"
            etiqueta="Comisión de Tiendanube (según tu plan) %"
            valor={c.tiendanube}
            permitirCero
            onGuardar={(n) => setComision('tiendanube', n)}
          />
        </div>
        <table className="tabla">
          <thead>
            <tr>
              <th>¿Lo ofrecés?</th>
              <th>Mercado Pago</th>
              <th className="num">Comisión %</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(MEDIOS) as MedioPago[]).map((m) => {
              const ofrecido = config.medios_ofrecidos.includes(m)
              return (
                <tr key={m} className={ofrecido && c[m] === null ? 'fila-pendiente' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Ofrezco ${MEDIOS[m]}`}
                      checked={ofrecido}
                      onChange={() => alternarMedio(m)}
                    />
                  </td>
                  <td>
                    {MEDIOS[m]}
                    {m.includes('cuotas') && <div className="nota">comisión + costo de financiación</div>}
                    {aplicada.medio === m && (
                      <div>
                        <span className="badge badge-neutro">define el precio</span>
                      </div>
                    )}
                  </td>
                  <td className="num">
                    <CampoNumero
                      id={`c-${m}`}
                      etiqueta=""
                      valor={c[m]}
                      permitirCero
                      onGuardar={(n) => setComision(m, n)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <label className="check" style={{ marginTop: 16 }}>
          <input
            type="checkbox"
            checked={config.iva_comisiones}
            onChange={(e) => guardar({ iva_comisiones: e.target.checked })}
          />
          Sumar 21% de IVA sobre las comisiones (como monotributista no lo recuperás)
        </label>
        <div style={{ marginTop: 12 }}>
          <CampoNumero
            id="c-iibb"
            etiqueta="Retenciones de Ingresos Brutos % (opcional)"
            valor={config.retencion_iibb}
            permitirCero
            onGuardar={(n) => guardar({ retencion_iibb: n })}
          />
        </div>
        <p className="vista-previa" style={{ marginTop: 12 }}>
          Total que se descuenta de cada venta: <strong>{pct(Math.round(aplicada.total * 1000) / 10)}</strong>
          {aplicada.medio && ` (con ${MEDIOS[aplicada.medio].toLowerCase()})`}
          {aplicada.pendientes.length > 0 && ` · falta: ${aplicada.pendientes.join(', ')}`}
        </p>
      </section>

      <section className="tarjeta seccion-config">
        <h2>Márgenes y precios</h2>
        <div className="campo">
          <label htmlFor="c-margenes">Márgenes a mostrar (%)</label>
          <input
            id="c-margenes"
            value={margenesTexto}
            className={errorMargenes ? 'invalido' : ''}
            onChange={(e) => setMargenesTexto(e.target.value)}
            onBlur={guardarMargenes}
            onKeyDown={(e) => e.key === 'Enter' && guardarMargenes()}
          />
          {errorMargenes && <span className="error-campo">{errorMargenes}</span>}
          <span className="ayuda">El margen es lo que te queda, como % del precio de venta.</span>
        </div>
        <div className="campo campo-fila">
          <label htmlFor="c-principal">Margen principal (el que se muestra en Inicio)</label>
          <select
            id="c-principal"
            value={config.margen_principal}
            onChange={(e) => guardar({ margen_principal: Number(e.target.value) })}
          >
            {config.margenes.map((m) => (
              <option key={m} value={m}>
                {m}%
              </option>
            ))}
          </select>
        </div>
        <label className="check check-alto" style={{ marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={config.precio_con_arranque}
            onChange={(e) => guardar({ precio_con_arranque: e.target.checked })}
          />
          <span>
            Cobrar las muestras y los moldes en el precio de la tanda de lanzamiento
            <br />
            <span className="suave chico">
              Así los recuperás con esas ventas. En las tandas siguientes el precio vuelve a salir del
              costo real.
            </span>
          </span>
        </label>
        <div className="campo campo-fila">
          <label htmlFor="c-redondeo">Redondear el precio sugerido</label>
          <select
            id="c-redondeo"
            value={config.redondeo}
            onChange={(e) => guardar({ redondeo: Number(e.target.value) as ConfigDatos['redondeo'] })}
          >
            <option value={0}>No redondear</option>
            <option value={1000}>A $ 1.000</option>
            <option value={5000}>A $ 5.000</option>
          </select>
        </div>
      </section>
    </>
  )
}
