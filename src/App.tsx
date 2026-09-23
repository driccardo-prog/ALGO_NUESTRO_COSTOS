import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthProvider, useAuth } from './lib/auth'
import { DataProvider } from './lib/data'
import { Configuracion } from './pages/Configuracion'
import { GastoForm } from './pages/GastoForm'
import { Gastos } from './pages/Gastos'
import { Inicio } from './pages/Inicio'
import { Login } from './pages/Login'
import { ProductoDetalle } from './pages/ProductoDetalle'
import { Productos } from './pages/Productos'
import { Resultados } from './pages/Resultados'
import { Tandas } from './pages/Tandas'

// El formulario arranca de cero cada vez que cambia la dirección (nuevo / editar otro).
function FormularioGasto() {
  const { pathname } = useLocation()
  return <GastoForm key={pathname} />
}

function Rutas() {
  const { cargando, logueada } = useAuth()
  if (cargando) return <div className="pantalla-centro suave">Cargando…</div>
  if (!logueada) return <Login />
  return (
    <DataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="resultados" element={<Resultados />} />
          <Route path="gastos" element={<Gastos />} />
          <Route path="gastos/nuevo" element={<FormularioGasto />} />
          <Route path="gastos/:id" element={<FormularioGasto />} />
          <Route path="tandas" element={<Tandas />} />
          <Route path="configuracion" element={<Configuracion />} />
          <Route path="productos" element={<Productos />} />
          <Route path="productos/:id" element={<ProductoDetalle />} />
          <Route path="*" element={<Inicio />} />
        </Route>
      </Routes>
    </DataProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Rutas />
      </BrowserRouter>
    </AuthProvider>
  )
}
