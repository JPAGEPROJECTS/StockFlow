import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LINKS = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/inventario', label: 'Inventario', icon: '📦' },
  { to: '/ventas', label: 'Ventas', icon: '🛒' },
  { to: '/reportes', label: 'Reportes', icon: '📊' },
]

export default function NavMenu() {
  const [open, setOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      {/* Botón hamburguesa */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed top-4 left-4 z-30 bg-white border border-gray-200 rounded-full w-11 h-11 flex flex-col items-center justify-center gap-1 shadow-md hover:shadow-lg hover:bg-gray-50 transition-all duration-200 ${
          open ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Abrir menú"
      >
        <span className="block w-5 h-0.5 bg-gray-700 rounded-full"></span>
        <span className="block w-5 h-0.5 bg-gray-700 rounded-full"></span>
        <span className="block w-5 h-0.5 bg-gray-700 rounded-full"></span>
      </button>

      {/* Overlay oscuro */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Panel lateral */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center px-5 py-4 border-b">
          <h2 className="font-bold text-lg text-gray-900">StockFlow</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1 px-3 py-4">
          {LINKS.map(link => {
            const activo = location.pathname === link.to
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activo
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <span className="text-lg">🚪</span>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}