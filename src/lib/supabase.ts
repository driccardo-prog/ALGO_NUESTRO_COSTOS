import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Las claves vienen de variables de entorno (archivo .env en la compu,
// o "Environment Variables" en Vercel). Nunca van escritas en el código.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

// Sin Supabase configurado la app funciona en "modo prueba":
// los datos quedan guardados solo en este navegador.
export const modoPrueba = supabase === null
