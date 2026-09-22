import { useEffect, useMemo, useState } from 'react'
import { getUsers, deleteUser, setUserActive } from '../services/userService'
import UserModal from '../components/UserModal'
import { Search, Pencil, Trash2, Power } from 'lucide-react'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null)

  const [editando, setEditando] = useState(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    setError(null)
    const { data, error } = await getUsers()
    if (error) {
      console.error('[Usuarios] getUsers falló', error)
      setError('No se pudieron cargar los usuarios. Intenta de nuevo.')
    } else {
      setUsuarios(data)
    }
    setCargando(false)
  }

  const eliminar = async (usuario) => {
    if (!confirm(`¿Eliminar al usuario "${usuario.full_name}"? Esta acción no se puede deshacer.`)) return
    const { error } = await deleteUser(usuario.id)
    if (error) {
      console.error('[Usuarios] deleteUser falló', error)
      alert('No se pudo eliminar: ' + error.message)
      return
    }
    cargar()
  }

  const toggleActivo = async (usuario) => {
    setCambiandoEstadoId(usuario.id)
    const { error } = await setUserActive(usuario.id, !usuario.is_active)
    if (error) {
      console.error('[Usuarios] setUserActive falló', error)
      alert('No se pudo cambiar el estado: ' + error.message)
      setCambiandoEstadoId(null)
      return
    }
    await cargar()
    setCambiandoEstadoId(null)
  }

  const filtrados = useMemo(() => {
    return usuarios.filter(u => {
      const coincideBusqueda =
        u.full_name?.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.email?.toLowerCase().includes(busqueda.toLowerCase())
      const coincideEstado =
        estadoFiltro === 'todos' ||
        (estadoFiltro === 'activos' && u.is_active) ||
        (estadoFiltro === 'inactivos' && !u.is_active)
      return coincideBusqueda && coincideEstado
    })
  }, [usuarios, busqueda, estadoFiltro])

  const etiquetaRol = (role) => role === 'admin' ? 'Administrador' : 'Vendedor/Cajero'

  return (
    <div className="min-h-screen bg-[#F4EDE4]">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C140F]">Usuarios</h1>
          <p className="text-xs sm:text-sm text-[#3B2418]/60">
            Aprueba las cuentas nuevas y administra roles. Cada usuario crea su cuenta desde la pantalla de registro.
          </p>
        </div>

        {/* Búsqueda + filtro de estado */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 sm:max-w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3B2418]/50">
              <Search size={16} />
            </span>
            <input
              placeholder="Buscar por nombre o correo..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="border border-[#E4D9CB] bg-white rounded-2xl p-2 pl-9 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30"
            />
          </div>
          <select
            value={estadoFiltro}
            onChange={e => setEstadoFiltro(e.target.value)}
            className="border border-[#E4D9CB] bg-white rounded-2xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30 text-[#3B2418]"
          >
            <option value="todos">Todos los estados</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 mb-4 flex flex-col sm:flex-row gap-2 justify-between sm:items-center text-sm">
            <span>{error}</span>
            <button onClick={cargar} className="text-sm font-medium underline text-left sm:text-right shrink-0">Reintentar</button>
          </div>
        )}

        {/* Tabla — scroll horizontal en pantallas chicas */}
        <div className="border border-[#E4D9CB] rounded-2xl overflow-x-auto bg-white shadow-sm hover:shadow-md transition-shadow">
          <table className="w-full border-collapse min-w-[640px]">
            <thead>
              <tr className="text-left border-b border-[#E4D9CB] bg-[#F4EDE4] text-sm text-[#3B2418]/70">
                <th className="p-3">Nombre</th>
                <th className="p-3">Correo</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr><td colSpan={5} className="p-8 text-center text-[#3B2418]/40">Cargando usuarios...</td></tr>
              )}

              {!cargando && filtrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#3B2418]/40">
                    {usuarios.length === 0
                      ? 'Aún no hay usuarios registrados.'
                      : 'No se encontraron usuarios con esa búsqueda o filtro.'}
                  </td>
                </tr>
              )}

              {!cargando && filtrados.map(u => (
                <tr key={u.id} className="border-b border-[#E4D9CB] last:border-0 text-sm hover:bg-[#F4EDE4]/60">
                  <td className="p-3 font-medium text-[#1C140F]">{u.full_name}</td>
                  <td className="p-3 text-[#3B2418]/70">{u.email}</td>
                  <td className="p-3 text-[#3B2418]">{etiquetaRol(u.role)}</td>
                  <td className="p-3">
                    <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleActivo(u)}
                        disabled={cambiandoEstadoId === u.id}
                        title={u.is_active ? 'Desactivar' : 'Activar'}
                        className={`flex items-center justify-center w-8 h-8 rounded-full hover:shadow-md transition-all disabled:opacity-50 ${
                          u.is_active ? 'bg-[#F4EDE4] text-green-700' : 'bg-[#F4EDE4] text-red-600'
                        }`}
                      >
                        <Power size={14} />
                      </button>
                      <button
                        onClick={() => setEditando(u)}
                        title="Editar"
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F4EDE4] text-[#3B2418] hover:shadow-md transition-all"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => eliminar(u)}
                        title="Eliminar"
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F4EDE4] text-red-600 hover:shadow-md transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!cargando && filtrados.length > 0 && (
          <p className="text-xs text-[#3B2418]/50 mt-2">
            Mostrando {filtrados.length} de {usuarios.length} usuarios
          </p>
        )}

        {editando && (
          <UserModal usuario={editando} onClose={() => setEditando(null)} onSaved={cargar} />
        )}
      </div>
    </div>
  )
}
