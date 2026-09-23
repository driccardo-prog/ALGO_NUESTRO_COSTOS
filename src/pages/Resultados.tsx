import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Info } from '../components/Info'
import { analizar, type Filtros, type Parte, type TipoRecomendacion } from '../lib/analisis'
import { montoGasto } from '../lib/costeo'
import { useData } from '../lib/data'
import { fecha, leerNumero, pct, pesos } from '../lib/format'
import { comisionAplicada, desglosar } from '../lib/precios'
import type { Gasto } from '../lib/types'

const porcentaje = (x: number) => pct(Math.round(x * 1000) / 10)

const ICONO: Record<TipoRecomendacion, string> = {
  ahorro: 'Dónde ahorrar',
  precio: 'Precio',
  alerta: 'Falta un dato',
  dato: 'Para tener en cuenta',
}

export function Resultados() {
  const datos = useData()
  const { productos, tandas, config } = datos
  const [params, setParams] = useSearchParams()
  const margenes = [...config.margenes].sort((a, b) => a - b)

  const filtros: Filtros = {
    productoId: params.get('producto') || 'todos',
    tandaId: params.get('tanda') || 'ultima',
    base: params.get('base') === 'arranque' ? 'arranque' : 'real',
    margen: Number(params.get('margen')) || config.margen_principal,
  }
  const cambiar = (clave: string, valor: string) => {
    const p = new URLSearchParams(params)
    if (valor) p.set(clave, valor)
    else p.delete(clave)
    setParams(p, { replace: true })
  }

  const a = analizar(datos, filtros)
  const unSolo = filtros.productoId !== 'todos'
  const nombreSolo = unSolo ? productos.find((p) => p.id === filtros.productoId)?.nombre : null
  const hayPrecios = a.filas.some((x) => x.precio)
  const variasTandas = new Set(a.filas.map((x) => x.tanda.id)).size > 1
  const baseTexto = filtros.base === 'arranque' ? 'costo con arranque' : 'costo real'

  return (
    <>
      <div className="titulo-pagina">
        <div>
          <h1>Resultados</h1>
          <p className="suave" style={{ margin: 0 }}>
            Cuánto cuesta, a cuánto vender, en qué se va la plata y dónde se puede ahorrar.
          </p>
        </div>
      </div>

      <div className="filtros filtros-resultados">
        <label>
          Cartera
          <select value={filtros.productoId} onChange={(e) => cambiar('producto', e.target.value === 'todos' ? '' : e.target.value)}>
            <option value="todos">Todas</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tanda
          <select value={filtros.tandaId} onChange={(e) => cambiar('tanda', e.target.value === 'ultima' ? '' : e.target.value)}>
            <option value="ultima">La última de cada una</option>
            {tandas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Costo
          <select value={filtros.base} onChange={(e) => cambiar('base', e.target.value === 'real' ? '' : e.target.value)}>
            <option value="real">Costo real</option>
            <option value="arranque">Con muestras y moldes</option>
          </select>
        </label>
        <label>
          Margen
          <select
            value={filtros.margen}
            onChange={(e) => cambiar('margen', Number(e.target.value) === config.margen_principal ? '' : e.target.value)}
          >
            {[...new Set([...margenes, filtros.margen])].sort((x, y) => x - y).map((m) => (
              <option key={m} value={m}>
                {m}%{m === config.margen_principal ? ' (principal)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {a.filas.length === 0 ? (
        <div className="tarjeta">
          <p>No hay datos para mostrar con estos filtros.</p>
          <p className="suave">
            {tandas.length === 0 ? (
              <>
                Primero armá una tanda en <Link to="/tandas">Tandas</Link>.
              </>
            ) : (
              'Probá con otra tanda o con otra cartera.'
            )}
          </p>
        </div>
      ) : (
        <>
          {a.comision.pendientes.length > 0 && (
            <div className="pendiente" style={{ marginBottom: 20 }}>
              Los precios todavía no incluyen: {a.comision.pendientes.join(', ')}.{' '}
              <Link to="/configuracion">Cargalas en Configuración</Link>.
            </div>
          )}

          {/* ---------- Números principales ---------- */}
          <div className="kpis">
            <Kpi
              titulo={unSolo ? 'Costo por unidad' : 'Costo promedio por cartera'}
              valor={pesos(a.totales.costoPromedio)}
              detalle={`${baseTexto} · ${a.totales.unidades} unidades`}
              info={`Costo total de ${a.totales.unidades} unidades (${pesos(a.totales.costo)}) ÷ ${a.totales.unidades}`}
            />
            <Kpi
              titulo={unSolo ? 'Precio sugerido' : 'Precio sugerido promedio'}
              valor={hayPrecios ? pesos(a.totales.precioPromedio) : '—'}
              detalle={`con margen del ${filtros.margen}%`}
              info={`Costo ÷ (1 − ${filtros.margen}% margen − ${porcentaje(a.comision.total)} comisiones), redondeado`}
              destacado
            />
            <Kpi
              titulo="Te queda por unidad"
              valor={hayPrecios ? pesos(a.totales.gananciaPromedio) : '—'}
              detalle={hayPrecios ? `${porcentaje(a.totales.margenPromedio)} del precio` : ''}
              info="Precio − comisiones e impuestos − costo"
            />
            <Kpi
              titulo="Inversión inicial"
              valor={pesos(a.inversion.total)}
              detalle={
                a.inversion.unidadesParaRecuperar
                  ? `se recupera con ${a.inversion.unidadesParaRecuperar} ventas`
                  : 'muestras y moldes'
              }
              info={
                a.inversion.unidadesParaRecuperar
                  ? `${pesos(a.inversion.total)} ÷ ${pesos(a.totales.gananciaPromedio)} de ganancia promedio por cartera`
                  : 'Suma de los gastos de arranque con monto'
              }
            />
          </div>

          <div className="grilla-2">
            {/* ---------- De cada $100 ---------- */}
            <section className="tarjeta">
              <h2>De cada $ 100 que cobrás</h2>
              <p className="suave chico">Cómo se reparte el precio sugerido de cada cartera.</p>
              {hayPrecios ? (
                <>
                  <Leyenda />
                  {a.filas
                    .filter((x) => x.precio)
                    .map((x) => {
                      const d = x.precio!.desglose
                      return (
                        <ComposicionPrecio
                          key={x.producto.id}
                          nombre={x.producto.nombre}
                          precio={d.precio}
                          costo={d.costo}
                          comisiones={d.comisiones}
                          ganancia={d.ganancia}
                        />
                      )
                    })}
                </>
              ) : (
                <p className="suave">Todavía no hay precios para mostrar.</p>
              )}
            </section>

            {/* ---------- En qué se va la plata ---------- */}
            <section className="tarjeta">
              <h2>¿En qué se te va la plata?</h2>
              <p className="suave chico">
                {unSolo ? `Costo de una ${nombreSolo}` : 'Costo de toda la tanda'}, por categoría.
              </p>
              <Barras partes={a.porCategoria} unSolo={unSolo} />
              {a.porTipo.length > 0 && (
                <>
                  <h3 style={{ marginTop: 24 }}>Por tipo de gasto</h3>
                  <Barras partes={a.porTipo} unSolo={unSolo} />
                </>
              )}
            </section>
          </div>

          {/* ---------- Recomendaciones ---------- */}
          {a.recomendaciones.length > 0 && (
            <section className="seccion">
              <h2>Recomendaciones</h2>
              <div className="recomendaciones">
                {a.recomendaciones.map((r) => (
                  <div key={r.titulo} className={`tarjeta recomendacion rec-${r.tipo}`}>
                    <div className="rec-tipo">{ICONO[r.tipo]}</div>
                    <h3>{r.titulo}</h3>
                    <p>{r.texto}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ---------- Comparativa ---------- */}
          <section className="seccion">
            <h2>Comparativa por cartera</h2>
            {!variasTandas && <p className="suave chico">{a.filas[0].tanda.nombre}</p>}
            <div className="tarjeta tabla-scroll" style={{ padding: 8 }}>
              <table className="tabla tabla-compacta">
                <thead>
                  <tr>
                    <th>Cartera</th>
                    {variasTandas && <th>Tanda</th>}
                    <th className="num">Unidades</th>
                    <th className="num">Costo real</th>
                    <th className="num">Con arranque</th>
                    <th className="num">Precio</th>
                    <th className="num">Te queda c/u</th>
                    <th className="num">Margen</th>
                    <th className="num">Ganancia tanda</th>
                  </tr>
                </thead>
                <tbody>
                  {a.filas.map((x) => (
                    <tr key={x.producto.id}>
                      <td>
                        <Link to={`/productos/${x.producto.id}`}>{x.producto.nombre}</Link>{' '}
                        {x.costeo.incluyeEstimados && <span className="badge badge-estimado">estimados</span>}
                      </td>
                      {variasTandas && <td className="sin-corte">{x.tanda.nombre}</td>}
                      <td className="num">{x.unidades}</td>
                      <td className="num">{pesos(x.costeo.real)}</td>
                      <td className="num">{pesos(x.costeo.conArranque)}</td>
                      <td className="num">
                        <strong className="precio">{x.precio ? pesos(x.precio.precio) : '—'}</strong>
                      </td>
                      <td className="num">{x.precio ? pesos(x.precio.desglose.ganancia) : '—'}</td>
                      <td className="num">{x.precio ? porcentaje(x.precio.desglose.margenReal) : '—'}</td>
                      <td className="num">
                        {x.precio ? pesos(x.precio.desglose.ganancia * x.unidades) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {a.filas.length > 1 && (
                  <tfoot>
                    <tr>
                      <td colSpan={variasTandas ? 2 : 1}>Total</td>
                      <td className="num">{a.totales.unidades}</td>
                      <td colSpan={3} className="num suave chico">
                        venta total {pesos(a.totales.venta)}
                      </td>
                      <td className="num">{pesos(a.totales.gananciaPromedio)}</td>
                      <td className="num">{porcentaje(a.totales.margenPromedio)}</td>
                      <td className="num">{pesos(a.totales.ganancia)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>

          {/* ---------- Precios a distintos márgenes ---------- */}
          <section className="seccion">
            <h2>Precios sugeridos al cliente</h2>
            <p className="suave chico">
              Sobre el {baseTexto}, con comisiones e impuestos incluidos y redondeado
              {config.redondeo ? ` a ${pesos(config.redondeo)}` : ''}. El margen es sobre el precio de
              venta.
            </p>
            <div className="tarjeta tabla-scroll" style={{ padding: 8 }}>
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Cartera</th>
                    {margenes.map((m) => (
                      <th key={m} className={`num ${m === filtros.margen ? 'col-principal' : ''}`}>
                        Margen {m}%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {a.filas.map((x) => (
                    <tr key={x.producto.id}>
                      <td>{x.producto.nombre}</td>
                      {margenes.map((m) => {
                        const p = precioConMargen(x.costo, m, a.comision.total, config.redondeo)
                        return (
                          <td key={m} className={`num ${m === filtros.margen ? 'col-principal' : ''}`}>
                            {p === null ? '—' : pesos(p)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ---------- Inversión inicial ---------- */}
          <Inversion
            total={a.inversion.total}
            gastos={a.inversion.gastos}
            gananciaPromedio={a.totales.gananciaPromedio}
            costoPromedio={a.totales.costoPromedio}
          />
        </>
      )}
    </>
  )
}

function precioConMargen(costo: number, m: number, comision: number, redondeo: number): number | null {
  const resto = 1 - m / 100 - comision
  if (resto <= 0) return null
  const exacto = costo / resto
  return redondeo > 0 ? Math.ceil(exacto / redondeo) * redondeo : exacto
}

function Kpi({
  titulo,
  valor,
  detalle,
  info,
  destacado = false,
}: {
  titulo: string
  valor: string
  detalle?: string
  info?: string
  destacado?: boolean
}) {
  return (
    <div className={`tarjeta kpi ${destacado ? 'kpi-destacado' : ''}`}>
      <div className="kpi-titulo">
        {titulo}
        {info && <Info>{info}</Info>}
      </div>
      <div className="kpi-valor">{valor}</div>
      {detalle && <div className="kpi-detalle">{detalle}</div>}
    </div>
  )
}

function Leyenda() {
  return (
    <div className="leyenda">
      <span>
        <i className="muestra c-costo" /> Costo
      </span>
      <span>
        <i className="muestra c-comision" /> Comisiones e impuestos
      </span>
      <span>
        <i className="muestra c-ganancia" /> Te queda
      </span>
    </div>
  )
}

function ComposicionPrecio({
  nombre,
  precio,
  costo,
  comisiones,
  ganancia,
}: {
  nombre: string
  precio: number
  costo: number
  comisiones: number
  ganancia: number
}) {
  const partes = [
    { clase: 'c-costo', nombre: 'Costo', monto: costo },
    { clase: 'c-comision', nombre: 'Comisiones e impuestos', monto: comisiones },
    { clase: 'c-ganancia', nombre: 'Te queda', monto: Math.max(0, ganancia) },
  ].filter((p) => p.monto > 0)
  return (
    <div className="composicion">
      <div className="acciones" style={{ justifyContent: 'space-between' }}>
        <strong>{nombre}</strong>
        <span className="chico">precio {pesos(precio)}</span>
      </div>
      <div className="barra-apilada" role="img" aria-label={partes.map((p) => `${p.nombre} ${porcentaje(p.monto / precio)}`).join(', ')}>
        {partes.map((p) => (
          <span
            key={p.clase}
            className={p.clase}
            style={{ width: `${(p.monto / precio) * 100}%` }}
            title={`${p.nombre}: ${pesos(p.monto)} (${porcentaje(p.monto / precio)})`}
          />
        ))}
      </div>
      <div className="composicion-numeros chico">
        {partes.map((p) => (
          <span key={p.clase}>
            {p.nombre}: <strong>${Math.round((p.monto / precio) * 100)}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}

function Barras({ partes, unSolo }: { partes: Parte[]; unSolo: boolean }) {
  if (partes.length === 0) return <p className="suave">Todavía no hay gastos con monto.</p>
  const maximo = Math.max(...partes.map((p) => p.total))
  return (
    <table className="tabla barras">
      <tbody>
        {partes.map((p) => (
          <tr key={p.clave} title={`${p.nombre}: ${pesos(unSolo ? p.porUnidad : p.total)}`}>
            <td>{p.nombre}</td>
            <td className="celda-barra">
              <span className="barra" style={{ width: `${(p.total / maximo) * 100}%` }} />
            </td>
            <td className="num">{pesos(unSolo ? p.porUnidad : p.total)}</td>
            <td className="num">
              <strong>{porcentaje(p.pct)}</strong>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Inversion({
  total,
  gastos,
  gananciaPromedio,
  costoPromedio,
}: {
  total: number
  gastos: Gasto[]
  gananciaPromedio: number
  costoPromedio: number
}) {
  const { config } = useData()
  // Precio de prueba (no se guarda): para ver cuántas ventas hacen falta con otro precio.
  const [precioTexto, setPrecioTexto] = useState('')
  const precioPrueba = leerNumero(precioTexto)
  const gananciaUsada =
    precioPrueba && precioPrueba > 0
      ? desglosar(precioPrueba, costoPromedio, comisionAplicada(config)).ganancia
      : gananciaPromedio
  const unidades = gananciaUsada > 0 ? Math.ceil(total / gananciaUsada) : null

  return (
    <section className="seccion">
      <h2>Inversión inicial</h2>
      <div className="grilla-2">
        <div className="tarjeta">
          <table className="tabla">
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id} className={g.pendiente ? 'fila-pendiente' : ''}>
                  <td>
                    <Link to={`/gastos/${g.id}`}>{g.descripcion}</Link>
                    <div className="nota">{fecha(g.fecha)}</div>
                  </td>
                  <td className="num">{g.pendiente ? 'falta el monto' : pesos(montoGasto(g))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total invertido</td>
                <td className="num">{pesos(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="tarjeta">
          <h3>¿Cuántas ventas para recuperarla?</h3>
          <div className="kpi-valor" style={{ margin: '8px 0' }}>
            {unidades ? `${unidades} carteras` : '—'}
          </div>
          <p className="suave chico">
            {pesos(total)} ÷ {pesos(gananciaUsada)} que te deja cada cartera
            {precioPrueba ? ` a ${pesos(precioPrueba)}` : ' en promedio, con el precio sugerido'}.
          </p>
          <div className="campo" style={{ marginTop: 16 }}>
            <label htmlFor="inv-precio">Probar con otro precio promedio</label>
            <div className="input-plata">
              <span>$</span>
              <input
                id="inv-precio"
                inputMode="decimal"
                placeholder="Ej: 150.000"
                value={precioTexto}
                onChange={(e) => setPrecioTexto(e.target.value)}
              />
            </div>
            <span className="ayuda">Es solo para probar: no se guarda.</span>
          </div>
        </div>
      </div>
    </section>
  )
}
