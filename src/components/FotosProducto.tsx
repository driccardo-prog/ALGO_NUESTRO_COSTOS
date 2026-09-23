import { useState, type ChangeEvent } from 'react'
import { comprimirFoto, repo } from '../lib/db'
import { useData } from '../lib/data'
import { modoPrueba } from '../lib/supabase'
import type { Producto } from '../lib/types'
import { Confirmar } from './Confirmar'
import { Foto } from './Foto'

export function FotosProducto({ producto }: { producto: Producto }) {
  const { editar } = useData()
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aBorrar, setABorrar] = useState<string | null>(null)
  const [ampliada, setAmpliada] = useState<string | null>(null)
  const fotos = producto.ficha.fotos

  async function subir(e: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (archivos.length === 0) return
    setSubiendo(true)
    setError(null)
    try {
      const nuevas: string[] = []
      for (const a of archivos) {
        if (!a.type.startsWith('image/')) throw new Error(`"${a.name}" no es una imagen`)
        nuevas.push(await repo.subirFoto(producto.id, await comprimirFoto(a, modoPrueba ? 800 : 1600)))
      }
      await editar('productos', producto.id, {
        ficha: { ...producto.ficha, fotos: [...fotos, ...nuevas] },
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubiendo(false)
    }
  }

  async function borrar(ruta: string) {
    setABorrar(null)
    try {
      await editar('productos', producto.id, {
        ficha: { ...producto.ficha, fotos: fotos.filter((f) => f !== ruta) },
      })
      await repo.borrarFoto(ruta)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <>
      {error && <div className="mensaje-error">{error}</div>}
      <div className="fotos">
        {fotos.map((ruta) => (
          <div className="foto" key={ruta}>
            <Foto ruta={ruta} onClick={setAmpliada} />
            <button className="btn-x" aria-label="Borrar foto" onClick={() => setABorrar(ruta)}>
              ×
            </button>
          </div>
        ))}
        <label className="subir-foto">
          {subiendo ? 'Subiendo…' : '+ Agregar fotos'}
          <input type="file" accept="image/*" multiple onChange={subir} disabled={subiendo} />
        </label>
      </div>
      {aBorrar && (
        <Confirmar
          titulo="¿Borrar esta foto?"
          onConfirmar={() => borrar(aBorrar)}
          onCancelar={() => setABorrar(null)}
        >
          No se puede deshacer.
        </Confirmar>
      )}
      {ampliada && (
        <div className="visor" onClick={() => setAmpliada(null)}>
          <img src={ampliada} alt="" />
        </div>
      )}
    </>
  )
}
