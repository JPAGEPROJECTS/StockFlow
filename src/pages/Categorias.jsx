import { useEffect, useMemo, useState } from 'react'
import { getCategoriesConCantidad, deleteCategory } from '../services/productService'
import CategoryModal from '../components/CategoryModal'
import { Tag, Plus, Search, Pencil, Trash2 } from 'lucide-react'

export default function Categorias() {
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    setError(null)
    const { data, error } = await getCategoriesConCantidad()
    if (error) {
      console.error('[Categorias] getCategoriesConCantidad falló', error)
      setError('No se pudieron cargar las categorías. Intenta de nuevo.')
    } else {
      setCategorias(data)
    }
    setCargando(false)
  }

  const eliminar = async (categoria) => {
    const aviso = categoria.product_count > 0
      ? `¿Eliminar "${categoria.name}"? ${categoria.product_count} producto(s) se quedarán sin categoría.`
      : `¿Eliminar la categoría "${categoria.name}"?`
    if (!confirm(aviso)) return

    const { error } = await deleteCategory(categoria.id)
    if (error) {
      console.error('[Categorias] deleteCategory falló', error)
      alert('No se pudo eliminar: ' + error.message)
      return
    }
    cargar()
  }

  const filtradas = useMemo(() => {
    return categorias.filter(c => c.name?.toLowerCase().includes(busqueda.toLowerCase()))
  }, [categorias, busqueda])

  return (
    <div className="min-h-screen bg-[#F4EDE4]">
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1C140F]">Categorías</h1>
            <p className="text-xs sm:text-sm text-[#3B2418]/60">Organiza los productos por categoría</p>
          </div>
          <button
            onClick={() => { setEditando(null); setModalOpen(true) }}
            className="flex items-center justify-center gap-2 bg-[#3B2418] text-[#F4EDE4] px-4 py-2 rounded-2xl font-medium text-sm hover:shadow-md transition-all"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F4EDE4] text-[#3B2418] shrink-0">
              <Plus size={14} />
            </span>
            Nueva categoría
          </button>
        </div>

        {/* Búsqueda */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3B2418]/50">
            <Search size={16} />
          </span>
          <input
            placeholder="Buscar categoría..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="border border-[#E4D9CB] bg-white rounded-2xl p-2 pl-9 w-full sm:w-80 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 mb-4 flex flex-col sm:flex-row gap-2 justify-between sm:items-center text-sm">
            <span>{error}</span>
            <button onClick={cargar} className="text-sm font-medium underline text-left sm:text-right shrink-0">Reintentar</button>
          </div>
        )}

        {/* Tabla */}
        <div className="border border-[#E4D9CB] rounded-2xl overflow-x-auto bg-white shadow-sm hover:shadow-md transition-shadow">
          <table className="w-full border-collapse min-w-[420px]">
            <thead>
              <tr className="text-left border-b border-[#E4D9CB] bg-[#F4EDE4] text-sm text-[#3B2418]/70">
                <th className="p-3">Nombre</th>
                <th className="p-3">Productos</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr><td colSpan={3} className="p-8 text-center text-[#3B2418]/40">Cargando categorías...</td></tr>
              )}

              {!cargando && filtradas.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-[#3B2418]/40">
                    {categorias.length === 0
                      ? 'Aún no hay categorías. Crea la primera con "+ Nueva categoría".'
                      : 'No se encontraron categorías con esa búsqueda.'}
                  </td>
                </tr>
              )}

              {!cargando && filtradas.map(c => (
                <tr key={c.id} className="border-b border-[#E4D9CB] last:border-0 text-sm hover:bg-[#F4EDE4]/60">
                  <td className="p-3 font-medium text-[#1C140F]">
                    <span className="inline-flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F4EDE4] text-[#3B2418] shrink-0">
                        <Tag size={12} />
                      </span>
                      {c.name}
                    </span>
                  </td>
                  <td className="p-3 text-[#3B2418]/70">{c.product_count}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditando(c); setModalOpen(true) }}
                        title="Editar"
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F4EDE4] text-[#3B2418] hover:shadow-md transition-all"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => eliminar(c)}
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

        {!cargando && filtradas.length > 0 && (
          <p className="text-xs text-[#3B2418]/50 mt-2">
            Mostrando {filtradas.length} de {categorias.length} categorías
          </p>
        )}

        {modalOpen && (
          <CategoryModal categoria={editando} onClose={() => setModalOpen(false)} onSaved={cargar} />
        )}
      </div>
    </div>
  )
}
