import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { modoPrueba, supabase } from './supabase'

// La app tiene una sola usuaria, así que se entra solo con contraseña.
// El email de su cuenta de Supabase viene de una variable de entorno
// (VITE_EMAIL_USUARIA en Vercel) para no dejarlo escrito en el código.
const EMAIL_USUARIA = (import.meta.env.VITE_EMAIL_USUARIA as string | undefined)?.trim() ?? ''

interface AuthCtx {
  cargando: boolean
  logueada: boolean
  salir: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(!modoPrueba)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCargando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const valor: AuthCtx = {
    cargando,
    logueada: modoPrueba || session !== null,
    salir: async () => {
      await supabase?.auth.signOut()
    },
  }
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth fuera de AuthProvider')
  return c
}

/** Entra con la contraseña. Devuelve un mensaje de error o null si salió bien. */
export async function entrar(contrasena: string): Promise<string | null> {
  if (!supabase) return null
  if (!EMAIL_USUARIA) return 'Falta cargar la variable VITE_EMAIL_USUARIA en Vercel (ver guía).'
  const { error } = await supabase.auth.signInWithPassword({
    email: EMAIL_USUARIA,
    password: contrasena,
  })
  if (!error) return null
  if (/invalid login credentials/i.test(error.message)) return 'La contraseña no es correcta.'
  if (/rate limit|security purposes|too many/i.test(error.message))
    return 'Hubo varios intentos seguidos. Esperá un minuto y probá de nuevo.'
  return `No se pudo entrar: ${error.message}`
}
