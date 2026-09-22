import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthProvider, useAuth } from './lib/auth'
import { DataProvider } from './lib/data'
import { Inicio } from './pages/Inicio'
import { Login } from './pages/Login'
import { ProductoDetalle } from './pages/ProductoDetalle'
import { Productos } from './pages/Productos'

function Rutas() {
  const { cargando, logueada } = useAuth()
  if (cargando) return <div className="pantalla-centro suave">Cargando…</div>
  if (!logueada) return <Login />
  return (
    <DataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
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
