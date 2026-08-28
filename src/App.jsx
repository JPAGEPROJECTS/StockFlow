import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Inventario from './pages/Inventario'
import Reportes from './pages/Reportes'
import Ventas from './pages/Ventas'

function PrivateRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="p-4 text-center">Cargando...</div>
  return session ? children : <Navigate to="/login" />
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
              <Inventario />
            </PrivateRoute>
          } 
        />
        <Route path="/reportes" element={<PrivateRoute><Reportes /></PrivateRoute>} />
        <Route path="/ventas" element={<PrivateRoute><Ventas /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}