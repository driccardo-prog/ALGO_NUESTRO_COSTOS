import { useState, type FormEvent } from 'react'
import { enviarLink } from '../lib/auth'
import { Logo } from '../components/Logo'

export function Login() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Escribí un email válido, por ejemplo loli@gmail.com')
      return
    }
    setEnviando(true)
    setError(null)
    const err = await enviarLink(email.trim())
    setEnviando(false)
    if (err) setError(err)
    else setEnviado(true)
  }

  return (
    <div className="pantalla-centro">
      <div className="login">
        <Logo className="logo-grande" />
        <p className="suave">Sistema de costeo</p>
        {enviado ? (
          <div className="tarjeta" style={{ marginTop: 28 }}>
            <h3>Revisá tu mail</h3>
            <p>
              Te mandamos un link a <strong>{email}</strong>. Abrilo desde esta misma compu y
              entrás directo, sin contraseña.
            </p>
            <button className="btn btn-texto" onClick={() => setEnviado(false)}>
              No me llegó, mandar de nuevo
            </button>
          </div>
        ) : (
          <form className="tarjeta" onSubmit={enviar} noValidate>
            <div className="campo">
              <label htmlFor="email">Tu email</label>
              <input
                id="email"
                type="email"
                value={email}
                autoFocus
                className={error ? 'invalido' : ''}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && <span className="error-campo">{error}</span>}
              <span className="ayuda">Te llega un link para entrar. No hace falta contraseña.</span>
            </div>
            <button className="btn btn-principal btn-grande" style={{ width: '100%' }} disabled={enviando}>
              {enviando ? 'Enviando…' : 'Mandarme el link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
