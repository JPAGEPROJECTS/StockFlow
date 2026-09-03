import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Home, Package, ShoppingCart, BarChart3, LogOut, Menu, X } from 'lucide-react'

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
  const [abierto, setAbierto] = useState(false)

  const handleLogout = async () => {
    setAbierto(false)
    await logout()
    navigate('/login')
  }

  const handleLinkClick = () => setAbierto(false)

  return (
    <header className="w-full bg-white border-b border-[#E4D9CB] shadow-sm sticky top-0 z-50">

      {/* Barra principal */}
      <div className="flex items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr] px-4 sm:px-6 h-14">

        {/* Izquierda: nombre */}
        <div className="flex items-center">
<Link to="/" className="font-['Lucida_Calligraphy','Lucida_Handwriting',cursive] italic text-xl text-[#1C140F] hover:opacity-80 transition">
  Verónica Rivera
</Link>
        </div>

        {/* Centro: navegación (solo desktop) */}
        <nav className="hidden md:flex items-center gap-1">
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

        {/* Derecha: logout (solo desktop) */}
        <div className="hidden md:flex items-center justify-end">
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

        {/* Botón hamburguesa (solo móvil/tablet) */}
        <button
          onClick={() => setAbierto(!abierto)}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-full bg-[#F4EDE4] text-[#3B2418]"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={abierto}
        >
          {abierto ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Panel desplegable (solo móvil/tablet) */}
      {abierto && (
        <nav className="md:hidden border-t border-[#E4D9CB] bg-white px-4 py-3 flex flex-col gap-1">
          {LINKS.map(link => {
            const activo = location.pathname === link.to
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all ${
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

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium text-[#3B2418] hover:bg-[#F4EDE4] transition-all mt-1 border-t border-[#E4D9CB] pt-3"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F4EDE4] text-[#3B2418]">
              <LogOut size={16} />
            </span>
            Cerrar sesión
          </button>
        </nav>
      )}
    </header>
  )
}