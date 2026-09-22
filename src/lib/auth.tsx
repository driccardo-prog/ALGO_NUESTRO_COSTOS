import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { modoPrueba, supabase } from './supabase'

interface AuthCtx {
  cargando: boolean
  email: string | null
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
    email: modoPrueba ? 'modo prueba' : (session?.user.email ?? null),
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

/** Manda el link mágico. Solo funciona para emails ya dados de alta en Supabase. */
export async function enviarLink(email: string): Promise<string | null> {
  if (!supabase) return null
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
  })
  if (!error) return null
  if (/signups not allowed|not found|otp_disabled/i.test(error.message)) {
    return 'Ese email no tiene acceso a la app. Revisá que esté bien escrito.'
  }
  if (/rate limit|security purposes/i.test(error.message)) {
    return 'Pediste varios links seguidos. Esperá un minuto y probá de nuevo.'
  }
  return `No se pudo mandar el link: ${error.message}`
}
