import { useState, type FormEvent } from 'react'
import { entrar } from '../lib/auth'
import { Logo } from '../components/Logo'

export function Login() {
  const [contrasena, setContrasena] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!contrasena) {
      setError('Escribí tu contraseña')
      return
    }
    setEnviando(true)
    setError(null)
    const err = await entrar(contrasena)
    setEnviando(false)
    if (err) setError(err)
  }

  return (
    <div className="pantalla-centro">
      <div className="login">
        <Logo className="logo-grande" />
        <p className="suave">Sistema de costeo</p>
        <form className="tarjeta" onSubmit={enviar} noValidate>
          <div className="campo">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              id="contrasena"
              type="password"
              autoComplete="current-password"
              value={contrasena}
              autoFocus
              className={error ? 'invalido' : ''}
              onChange={(e) => setContrasena(e.target.value)}
            />
            {error && <span className="error-campo">{error}</span>}
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
