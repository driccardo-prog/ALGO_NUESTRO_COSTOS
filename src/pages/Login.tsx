import { useState, type FormEvent } from 'react'
import { emailRecordado, entrar } from '../lib/auth'
import { Logo } from '../components/Logo'

export function Login() {
  // El email se pide solo la primera vez; después queda recordado.
  const [recordado] = useState(emailRecordado)
  const [email, setEmail] = useState(recordado)
  const [contrasena, setContrasena] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'Escribí tu email'
    if (!contrasena) errs.contrasena = 'Escribí tu contraseña'
    setErrores(errs)
    if (Object.keys(errs).length) return
    setEnviando(true)
    const err = await entrar(email.trim(), contrasena)
    setEnviando(false)
    if (err) setErrores({ contrasena: err })
  }

  return (
    <div className="pantalla-centro">
      <div className="login">
        <Logo className="logo-grande" />
        <p className="suave">Sistema de costeo</p>
        <form className="tarjeta" onSubmit={enviar} noValidate>
          {!recordado && (
            <div className="campo">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                autoFocus
                className={errores.email ? 'invalido' : ''}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errores.email && <span className="error-campo">{errores.email}</span>}
              <span className="ayuda">Solo te lo pedimos esta vez.</span>
            </div>
          )}
          <div className="campo">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              id="contrasena"
              type="password"
              autoComplete="current-password"
              value={contrasena}
              autoFocus={!!recordado}
              className={errores.contrasena ? 'invalido' : ''}
              onChange={(e) => setContrasena(e.target.value)}
            />
            {errores.contrasena && <span className="error-campo">{errores.contrasena}</span>}
          </div>
          <button
            className="btn btn-principal btn-grande"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={enviando}
          >
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
