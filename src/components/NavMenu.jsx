import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LINKS = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/inventario', label: 'Inventario', icon: '📦' },
  { to: '/ventas', label: 'Ventas', icon: '🛒' },
  { to: '/reportes', label: 'Reportes', icon: '📊' },
]

export default function NavMenu() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr' }} className="w-full bg-white border-b shadow-sm sticky top-0 z-50 px-6 h-14">

      {/* Izquierda: nombre */}
      <div className="flex items-center">
        <span className="font-bold text-lg text-gray-900">StockFlow</span>
      </div>

      {/* Centro: navegación */}
      <nav className="flex items-center gap-1">
        {LINKS.map(link => {
          const activo = location.pathname === link.to
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activo
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-base">{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Derecha: logout */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <span className="text-base">🚪</span>
          Cerrar sesión
        </button>
      </div>

    </header>
  )
}