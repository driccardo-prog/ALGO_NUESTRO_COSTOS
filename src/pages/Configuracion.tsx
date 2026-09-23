import { useState } from 'react'
import { Confirmar } from '../components/Confirmar'
import { tandaArranque, unidadesDe } from '../lib/costeo'
import { useData } from '../lib/data'
import { leerNumero, numero } from '../lib/format'
import type { Categoria, ConfigDatos, MetodoReparto } from '../lib/types'

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
        <h2>Qué tanda absorbe los gastos de arranque</h2>
        <p className="suave">
          Las muestras y los moldes se reparten entre las unidades de una sola tanda de cada
          producto. Por defecto, la primera.
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

      <Categorias />

      <section className="tarjeta seccion-config">
        <h2>Comisiones, márgenes y precios</h2>
        <p className="suave">
          Las comisiones de Mercado Pago y Tiendanube, los márgenes y el redondeo de precios se
          cargan acá en la próxima etapa, junto con el precio sugerido de venta.
        </p>
      </section>
    </>
  )
}

function CampoNumero({
  id,
  etiqueta,
  valor,
  onGuardar,
}: {
  id: string
  etiqueta: string
  valor: number | null
  onGuardar: (n: number | null) => void
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
    if (n !== valor) onGuardar(n && n > 0 ? n : null)
  }
  return (
    <div className="campo campo-fila">
      <label htmlFor={id}>{etiqueta}</label>
      <div>
        <input
          id={id}
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
