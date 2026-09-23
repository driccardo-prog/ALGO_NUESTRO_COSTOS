// Todos los datos de Loli se cargan una vez al entrar y quedan en memoria.
// Cada cambio se guarda en la base y después se refleja en pantalla.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { repo } from './db'
import { configInicial, datosIniciales } from './seed'
import type {
  Categoria,
  ConfigDatos,
  Configuracion,
  Gasto,
  Id,
  NombreTabla,
  Producto,
  Tablas,
  Tanda,
} from './types'

interface Estado {
  categorias: Categoria[]
  productos: Producto[]
  tandas: Tanda[]
  gastos: Gasto[]
  configuracion: Configuracion | null
}

type ClaveLista = 'categorias' | 'productos' | 'tandas' | 'gastos'

interface DataCtx extends Estado {
  config: ConfigDatos
  crear<T extends ClaveLista>(tabla: T, fila: Tablas[T]): Promise<Tablas[T]>
  editar<T extends ClaveLista>(tabla: T, id: Id, cambios: Partial<Tablas[T]>): Promise<Tablas[T]>
  borrar(tabla: ClaveLista, id: Id): Promise<void>
  guardarConfig(cambios: Partial<ConfigDatos>): Promise<void>
}

const Ctx = createContext<DataCtx | null>(null)

async function cargarTodo(): Promise<Estado> {
  const [categorias, productos, tandas, gastos, configs] = await Promise.all([
    repo.list('categorias'),
    repo.list('productos'),
    repo.list('tandas'),
    repo.list('gastos'),
    repo.list('configuracion'),
  ])
  return { categorias, productos, tandas, gastos, configuracion: configs[0] ?? null }
}

/** La primera vez que Loli entra, precarga productos, gastos y configuración. */
async function precargar(): Promise<void> {
  const d = datosIniciales()
  await repo.insertMany('categorias', d.categorias)
  await repo.insertMany('productos', d.productos)
  await repo.insertMany('gastos', d.gastos)
  // La configuración va al final: si existe, la precarga está completa.
  await repo.insert('configuracion', { id: crypto.randomUUID(), datos: d.config })
}

// Una sola inicialización aunque React monte el componente dos veces.
let inicio: Promise<Estado> | null = null
function inicializar(): Promise<Estado> {
  inicio ??= (async () => {
    const e = await cargarTodo()
    if (e.configuracion) return e
    if (e.productos.length === 0 && e.gastos.length === 0) await precargar()
    else await repo.insert('configuracion', { id: crypto.randomUUID(), datos: configInicial() })
    return cargarTodo()
  })()
  inicio.catch(() => {
    inicio = null
  })
  return inicio
}

const ordenar = <T extends { orden: number }>(xs: T[]) => [...xs].sort((a, b) => a.orden - b.orden)

export function DataProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    inicializar()
      .then((e) => vivo && setEstado(e))
      .catch((err: Error) => vivo && setError(err.message))
    return () => {
      vivo = false
    }
  }, [])

  const crear = useCallback(async <T extends ClaveLista>(tabla: T, fila: Tablas[T]) => {
    const nueva = await repo.insert(tabla, fila)
    setEstado((e) => e && { ...e, [tabla]: [...(e[tabla] as Tablas[T][]), nueva] })
    return nueva
  }, [])

  const editar = useCallback(
    async <T extends ClaveLista>(tabla: T, id: Id, cambios: Partial<Tablas[T]>) => {
      const fila = await repo.update(tabla, id, cambios)
      setEstado(
        (e) =>
          e && {
            ...e,
            [tabla]: (e[tabla] as Tablas[T][]).map((x) => (x.id === id ? fila : x)),
          },
      )
      return fila
    },
    [],
  )

  const borrar = useCallback(async (tabla: ClaveLista, id: Id) => {
    await repo.remove(tabla as NombreTabla, id)
    setEstado(
      (e) => e && { ...e, [tabla]: (e[tabla] as { id: Id }[]).filter((x) => x.id !== id) },
    )
  }, [])

  const guardarConfig = useCallback(
    async (cambios: Partial<ConfigDatos>) => {
      const actual = estado?.configuracion
      if (!actual) return
      const datos = { ...actual.datos, ...cambios }
      const fila = await repo.update('configuracion', actual.id, { datos })
      setEstado((e) => e && { ...e, configuracion: fila })
    },
    [estado?.configuracion],
  )

  if (error) {
    return (
      <div className="pantalla-centro">
        <div className="tarjeta" style={{ maxWidth: 520 }}>
          <h2>No se pudieron cargar los datos</h2>
          <p>{error}</p>
          <p className="suave">
            Revisá tu conexión a internet y volvé a cargar la página. Si sigue pasando, puede que
            falte correr el archivo <code>supabase/schema.sql</code> en Supabase.
          </p>
        </div>
      </div>
    )
  }
  if (!estado || !estado.configuracion) {
    return <div className="pantalla-centro suave">Cargando tus datos…</div>
  }

  const valor: DataCtx = {
    ...estado,
    categorias: ordenar(estado.categorias),
    productos: ordenar(estado.productos),
    config: { ...configInicial(), ...estado.configuracion.datos },
    crear,
    editar,
    borrar,
    guardarConfig,
  }
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useData() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useData fuera de DataProvider')
  return c
}
