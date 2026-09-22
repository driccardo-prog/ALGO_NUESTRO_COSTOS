// Capa de acceso a datos. Dos implementaciones con la misma interfaz:
// - Supabase (datos online, con login)
// - Local (modo prueba: datos en el navegador)

import { supabase } from './supabase'
import type { Id, NombreTabla, Tablas } from './types'

export interface Repo {
  list<T extends NombreTabla>(tabla: T): Promise<Tablas[T][]>
  insert<T extends NombreTabla>(tabla: T, fila: Tablas[T]): Promise<Tablas[T]>
  insertMany<T extends NombreTabla>(tabla: T, filas: Tablas[T][]): Promise<Tablas[T][]>
  update<T extends NombreTabla>(tabla: T, id: Id, cambios: Partial<Tablas[T]>): Promise<Tablas[T]>
  remove(tabla: NombreTabla, id: Id): Promise<void>
  subirFoto(productoId: Id, archivo: Blob): Promise<string>
  urlFoto(ruta: string): Promise<string>
  borrarFoto(ruta: string): Promise<void>
}

// Columnas internas que la app no usa.
function limpiar<T>(fila: Record<string, unknown>): T {
  const { user_id: _u, created_at: _c, ...resto } = fila
  return resto as T
}

function mensaje(error: { message: string }): Error {
  return new Error(`No se pudo guardar en la base de datos: ${error.message}`)
}

class SupabaseRepo implements Repo {
  private get sb() {
    if (!supabase) throw new Error('Supabase no está configurado')
    return supabase
  }

  async list<T extends NombreTabla>(tabla: T) {
    const { data, error } = await this.sb.from(tabla).select('*').order('created_at')
    if (error) throw mensaje(error)
    return (data ?? []).map((f) => limpiar<Tablas[T]>(f))
  }

  async insert<T extends NombreTabla>(tabla: T, fila: Tablas[T]) {
    const { data, error } = await this.sb.from(tabla).insert(fila).select().single()
    if (error) throw mensaje(error)
    return limpiar<Tablas[T]>(data)
  }

  async insertMany<T extends NombreTabla>(tabla: T, filas: Tablas[T][]) {
    if (filas.length === 0) return []
    const { data, error } = await this.sb.from(tabla).insert(filas).select()
    if (error) throw mensaje(error)
    return (data ?? []).map((f) => limpiar<Tablas[T]>(f))
  }

  async update<T extends NombreTabla>(tabla: T, id: Id, cambios: Partial<Tablas[T]>) {
    const { data, error } = await this.sb
      .from(tabla)
      .update(cambios as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single()
    if (error) throw mensaje(error)
    return limpiar<Tablas[T]>(data)
  }

  async remove(tabla: NombreTabla, id: Id) {
    const { error } = await this.sb.from(tabla).delete().eq('id', id)
    if (error) throw mensaje(error)
  }

  async subirFoto(productoId: Id, archivo: Blob) {
    const { data: u } = await this.sb.auth.getUser()
    if (!u.user) throw new Error('Tenés que iniciar sesión')
    const ruta = `${u.user.id}/${productoId}/${crypto.randomUUID()}.jpg`
    const { error } = await this.sb.storage.from('fotos').upload(ruta, archivo, {
      contentType: 'image/jpeg',
    })
    if (error) throw new Error(`No se pudo subir la foto: ${error.message}`)
    return ruta
  }

  async urlFoto(ruta: string) {
    const { data, error } = await this.sb.storage.from('fotos').createSignedUrl(ruta, 60 * 60)
    if (error) throw new Error(`No se pudo mostrar la foto: ${error.message}`)
    return data.signedUrl
  }

  async borrarFoto(ruta: string) {
    await this.sb.storage.from('fotos').remove([ruta])
  }
}

const PREFIJO = 'algo-nuestro:'

class LocalRepo implements Repo {
  private leer<T>(clave: string): T[] {
    try {
      return JSON.parse(localStorage.getItem(PREFIJO + clave) ?? '[]') as T[]
    } catch {
      return []
    }
  }

  private escribir(clave: string, filas: unknown[]) {
    try {
      localStorage.setItem(PREFIJO + clave, JSON.stringify(filas))
    } catch {
      throw new Error('El navegador no tiene más lugar para guardar (probá con fotos más livianas).')
    }
  }

  async list<T extends NombreTabla>(tabla: T) {
    return this.leer<Tablas[T]>(tabla)
  }

  async insert<T extends NombreTabla>(tabla: T, fila: Tablas[T]) {
    this.escribir(tabla, [...this.leer(tabla), fila])
    return fila
  }

  async insertMany<T extends NombreTabla>(tabla: T, filas: Tablas[T][]) {
    this.escribir(tabla, [...this.leer(tabla), ...filas])
    return filas
  }

  async update<T extends NombreTabla>(tabla: T, id: Id, cambios: Partial<Tablas[T]>) {
    const filas = this.leer<Tablas[T]>(tabla)
    const i = filas.findIndex((f) => f.id === id)
    if (i < 0) throw new Error('No se encontró el registro')
    filas[i] = { ...filas[i], ...cambios }
    this.escribir(tabla, filas)
    return filas[i]
  }

  async remove(tabla: NombreTabla, id: Id) {
    this.escribir(tabla, this.leer<{ id: Id }>(tabla).filter((f) => f.id !== id))
  }

  async subirFoto(_productoId: Id, archivo: Blob) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = () => reject(new Error('No se pudo leer la foto'))
      r.readAsDataURL(archivo)
    })
    const ruta = `local/${crypto.randomUUID()}`
    this.escribir('fotos', [...this.leer('fotos'), { ruta, dataUrl }])
    return ruta
  }

  async urlFoto(ruta: string) {
    const f = this.leer<{ ruta: string; dataUrl: string }>('fotos').find((x) => x.ruta === ruta)
    return f?.dataUrl ?? ''
  }

  async borrarFoto(ruta: string) {
    this.escribir(
      'fotos',
      this.leer<{ ruta: string }>('fotos').filter((f) => f.ruta !== ruta),
    )
  }
}

export const repo: Repo = supabase ? new SupabaseRepo() : new LocalRepo()

// Achica la foto antes de subirla (máx. 1600 px, JPEG) para que cargue rápido.
export async function comprimirFoto(archivo: File, maximo = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo)
  const escala = Math.min(1, maximo / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la foto'))),
      'image/jpeg',
      0.85,
    ),
  )
}
