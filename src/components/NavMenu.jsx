import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Home, Package, ShoppingCart, BarChart3, LogOut, Menu, X, Users, Tag } from 'lucide-react'
import { Wallet } from 'lucide-react'

const LINKS = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/inventario', label: 'Inventario', icon: Package },
  { to: '/categorias', label: 'Categorías', icon: Tag },
  { to: '/turno', label: 'Turno', icon: Wallet },
  { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/usuarios', label: 'Usuarios', icon: Users },
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
      <div className="flex items-center justify-between lg:grid lg:grid-cols-[1fr_auto_1fr] px-4 sm:px-6 h-14">

        {/* Izquierda: nombre */}
        <div className="flex items-center">
<Link to="/" className="font-['Lucida_Calligraphy','Lucida_Handwriting',cursive] italic text-xl text-[#1C140F] hover:opacity-80 transition">
  Verónica Rivera
</Link>
        </div>

        {/* Centro: navegación (solo desktop; en lg solo íconos, en xl con texto) */}
        <nav className="hidden lg:flex items-center gap-1">
          {LINKS.map(link => {
            const activo = location.pathname === link.to
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                title={link.label}
                aria-label={link.label}
                className={`flex items-center gap-2 px-1.5 xl:px-3 py-1.5 rounded-2xl text-sm font-medium transition-all hover:shadow-md ${
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
                <span className="hidden xl:inline">{link.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Derecha: logout (solo desktop) */}
        <div className="hidden lg:flex items-center justify-end">
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="flex items-center gap-2 px-1.5 xl:px-3 py-1.5 rounded-2xl text-sm font-medium text-[#3B2418] hover:bg-[#F4EDE4] hover:shadow-md transition-all"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F4EDE4] text-[#3B2418]">
              <LogOut size={16} />
            </span>
            <span className="hidden xl:inline">Cerrar sesión</span>
          </button>
        </div>

        {/* Botón hamburguesa (solo móvil/tablet) */}
        <button
          onClick={() => setAbierto(!abierto)}
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-full bg-[#F4EDE4] text-[#3B2418]"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={abierto}
        >
          {abierto ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Panel desplegable (solo móvil/tablet) */}
      {abierto && (
        <nav className="lg:hidden border-t border-[#E4D9CB] bg-white px-4 sm:px-6 py-3 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
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
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium text-[#3B2418] hover:bg-[#F4EDE4] transition-all mt-1 border-t border-[#E4D9CB] pt-3 sm:col-span-2"
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