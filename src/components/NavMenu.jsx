import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Home, Package, ShoppingCart, BarChart3, LogOut } from 'lucide-react'

const LINKS = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/inventario', label: 'Inventario', icon: Package },
  { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
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
    <header style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr' }} className="w-full bg-white border-b border-[#E4D9CB] shadow-sm sticky top-0 z-50 px-6 h-14">

      {/* Izquierda: nombre */}
      <div className="flex items-center">
        <span className="font-bold text-lg text-[#1C140F]">StockFlow</span>
      </div>

      {/* Centro: navegación */}
      <nav className="flex items-center gap-1">
        {LINKS.map(link => {
          const activo = location.pathname === link.to
          const Icon = link.icon
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm font-medium transition-all hover:shadow-md ${
                activo
                  ? 'bg-[#F4EDE4] text-[#3B2418]'
                  : 'text-[#3B2418]/70 hover:bg-[#F4EDE4]'
              }`}
            >
              <span className={`flex items-center justify-center w-7 h-7 rounded-full ${
                activo ? 'bg-[#3B2418] text-[#F4EDE4]' : 'bg-[#F4EDE4] text-[#3B2418]'
              }`}>
                <Icon size={16} />
              </span>
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Derecha: logout */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm font-medium text-[#3B2418] hover:bg-[#F4EDE4] hover:shadow-md transition-all"
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F4EDE4] text-[#3B2418]">
            <LogOut size={16} />
          </span>
          Cerrar sesión
        </button>
      </div>

    </header>
  )
}