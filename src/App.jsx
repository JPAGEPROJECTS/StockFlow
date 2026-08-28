import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Home from './pages/Home'
import Inventario from './pages/Inventario'
import Ventas from './pages/Ventas'
import Reportes from './pages/Reportes'
import NavMenu from './components/NavMenu'

function PrivateRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="p-4 text-center">Cargando...</div>
  if (!session) return <Navigate to="/login" />
  return (
    <>
      <NavMenu />
      {children}
    </>
  )
}

export default function App() {
  const { session } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/" /> : <Login />}
        />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route path="/inventario" element={<PrivateRoute><Inventario /></PrivateRoute>} />
        <Route path="/ventas" element={<PrivateRoute><Ventas /></PrivateRoute>} />
        <Route path="/reportes" element={<PrivateRoute><Reportes /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}