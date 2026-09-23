import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { modoPrueba } from '../lib/supabase'
import { Logo } from './Logo'

const secciones = [
  { a: '/', texto: 'Inicio' },
  { a: '/productos', texto: 'Productos' },
]

export function Layout() {
  const { salir } = useAuth()
  return (
    <div className="app">
      {modoPrueba && (
        <div className="aviso-prueba">
          <strong>Modo prueba:</strong> los datos se guardan solo en este navegador. Para
          guardarlos online hay que conectar Supabase (ver guía).
        </div>
      )}
      <header className="cabecera">
        <div className="cabecera-in">
          <NavLink to="/" className="marca">
            <Logo claro />
            <span className="marca-sub">Costeo</span>
          </NavLink>
          <nav className="nav">
            {secciones.map((s) => (
              <NavLink
                key={s.a}
                to={s.a}
                end={s.a === '/'}
                className={({ isActive }) => (isActive ? 'activo' : '')}
              >
                {s.texto}
              </NavLink>
            ))}
          </nav>
          {!modoPrueba && (
            <div className="usuaria">
              <button
                onClick={async () => {
                  await salir()
                  window.location.assign('/')
                }}
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="pie">Algo Nuestro · carteras de cuero artesanales</footer>
    </div>
  )
}
