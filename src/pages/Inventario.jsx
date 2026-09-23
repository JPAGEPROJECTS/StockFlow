import { useEffect, useMemo, useState } from 'react'
import { getProducts, deactivateProduct } from '../services/productService'
import { exportToExcel } from '../services/exportService'
import ProductModal from '../components/ProductModal'
import MovementsModal from '../components/MovementsModal'
import MovementFormModal from '../components/MovementFormModal'
import NavMenu from '../components/NavMenu'
import {
  Package,
  AlertTriangle,
  DollarSign,
  FileDown,
  Plus,
  Search,
  History,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  PackagePlus,
} from 'lucide-react'

export default function Inventario() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [busqueda, setBusqueda] = useState('')
  const [almacenFiltro, setAlmacenFiltro] = useState('todos')
  const [soloStockBajo, setSoloStockBajo] = useState(false)

  const [orden, setOrden] = useState({ campo: 'name', dir: 'asc' })

  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [verMovimientos, setVerMovimientos] = useState(null)
  const [registrandoMovimiento, setRegistrandoMovimiento] = useState(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    setError(null)
    const { data, error } = await getProducts()
    if (error) {
      setError('No se pudo cargar el inventario. Intenta de nuevo.')
    } else {
      setProductos(data)
    }
    setCargando(false)
  }

  const eliminar = async (id) => {
    if (!confirm('¿Desactivar este producto? Dejará de aparecer en el inventario activo.')) return
    await deactivateProduct(id)
    cargar()
  }

  // Lista de almacenes disponibles para el filtro
  const almacenes = useMemo(() => {
    const set = new Set(productos.map(p => p.warehouse_name).filter(Boolean))
    return Array.from(set)
  }, [productos])

  // Filtrado + orden
  const filtrados = useMemo(() => {
    let resultado = productos.filter(p => {
      const coincideBusqueda =
        p.name?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.sku?.toLowerCase().includes(busqueda.toLowerCase())
      const coincideAlmacen = almacenFiltro === 'todos' || p.warehouse_name === almacenFiltro
      const coincideStock = !soloStockBajo || p.stock <= p.stock_min
      return coincideBusqueda && coincideAlmacen && coincideStock
    })

    resultado.sort((a, b) => {
      const valA = a[orden.campo] ?? ''
      const valB = b[orden.campo] ?? ''
      const cmp = typeof valA === 'string' ? valA.localeCompare(valB) : valA - valB
      return orden.dir === 'asc' ? cmp : -cmp
    })

    return resultado
  }, [productos, busqueda, almacenFiltro, soloStockBajo, orden])

  const cambiarOrden = (campo) => {
    setOrden(prev => ({
      campo,
      dir: prev.campo === campo && prev.dir === 'asc' ? 'desc' : 'asc'
    }))
  }

  const iconoOrden = (campo) => {
    if (orden.campo !== campo) return null
    return orden.dir === 'asc' ? '▲' : '▼'
  }

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const totalProductos = productos.length
    const stockBajo = productos.filter(p => p.stock <= p.stock_min).length
    const valorTotal = productos.reduce((acc, p) => acc + (p.stock * p.price || 0), 0)
    return { totalProductos, stockBajo, valorTotal }
  }, [productos])

  const exportar = () => {
  const datos = filtrados.map(p => ({
    SKU: p.sku,
    Producto: p.name,
    Almacén: p.warehouse_name ?? '—',
    Stock: p.stock ?? 0,
    'Stock mínimo': p.stock_min,
    Precio: Number(p.price),
    Estado: p.stock === null ? 'Sin registrar' : p.stock <= p.stock_min ? 'Stock bajo' : 'OK'
  }))
  exportToExcel(datos, 'inventario', 'Inventario', {
    titulo: 'Inventario',
    info: [`${datos.length} productos`],
    columnas: [
      { key: 'SKU' },
      { key: 'Producto' },
      { key: 'Almacén' },
      { key: 'Stock', tipo: 'entero' },
      { key: 'Stock mínimo', tipo: 'entero' },
      { key: 'Precio', tipo: 'moneda' },
      { key: 'Estado' }
    ],
    colorTexto: (fila, key) => key === 'Estado' && fila.Estado !== 'OK' ? 'FFB91C1C' : undefined
  })
}

  return (
    <div className="min-h-screen bg-[#F4EDE4]">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1C140F]">Inventario</h1>
            <p className="text-xs sm:text-sm text-[#3B2418]/60">Gestiona tus productos, existencias y precios</p>
          </div>
          <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
            <button
              onClick={exportar}
              className="flex items-center justify-center gap-2 bg-white border border-[#E4D9CB] text-[#3B2418] px-4 py-2 rounded-2xl font-medium text-sm hover:shadow-md transition-all"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F4EDE4] text-[#3B2418] shrink-0">
                <FileDown size={14} />
              </span>
              Exportar a Excel
            </button>
            <button
              onClick={() => { setEditando(null); setModalOpen(true) }}
              className="flex items-center justify-center gap-2 bg-[#3B2418] text-[#F4EDE4] px-4 py-2 rounded-2xl font-medium text-sm hover:shadow-md transition-all"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F4EDE4] text-[#3B2418] shrink-0">
                <Plus size={14} />
              </span>
              Nuevo producto
            </button>
          </div>
        </div>

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-white border border-[#E4D9CB] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <span className="flex items-center justify-center w-11 h-11 rounded-full bg-[#F4EDE4] text-[#3B2418] shrink-0">
              <Package size={20} />
            </span>
            <div>
              <p className="text-xs sm:text-sm text-[#3B2418]/60">Productos activos</p>
              <p className="text-xl sm:text-2xl font-bold text-[#1C140F]">{stats.totalProductos}</p>
            </div>
          </div>
          <div className={`border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 ${stats.stockBajo > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-[#E4D9CB]'}`}>
            <span className={`flex items-center justify-center w-11 h-11 rounded-full shrink-0 ${stats.stockBajo > 0 ? 'bg-red-100 text-red-600' : 'bg-[#F4EDE4] text-[#3B2418]'}`}>
              <AlertTriangle size={20} />
            </span>
            <div>
              <p className="text-xs sm:text-sm text-[#3B2418]/60">Con stock bajo</p>
              <p className={`text-xl sm:text-2xl font-bold ${stats.stockBajo > 0 ? 'text-red-600' : 'text-[#1C140F]'}`}>
                {stats.stockBajo}
              </p>
            </div>
          </div>
          <div className="bg-white border border-[#E4D9CB] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <span className="flex items-center justify-center w-11 h-11 rounded-full bg-[#F4EDE4] text-[#3B2418] shrink-0">
              <DollarSign size={20} />
            </span>
            <div>
              <p className="text-xs sm:text-sm text-[#3B2418]/60">Valor total en inventario</p>
              <p className="text-xl sm:text-2xl font-bold text-[#1C140F]">
                ${stats.valorTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3B2418]/50">
              <Search size={16} />
            </span>
            <input
              placeholder="Buscar por nombre o SKU..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="border border-[#E4D9CB] bg-white rounded-2xl p-2 pl-9 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30"
            />
          </div>
          <select
            value={almacenFiltro}
            onChange={e => setAlmacenFiltro(e.target.value)}
            className="border border-[#E4D9CB] bg-white rounded-2xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30 text-[#3B2418]"
          >
            <option value="todos">Todos los almacenes</option>
            {almacenes.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <label className="flex items-center gap-2 border border-[#E4D9CB] bg-white rounded-2xl px-3 py-2 sm:py-0 text-sm text-[#3B2418] whitespace-nowrap">
            <input
              type="checkbox"
              checked={soloStockBajo}
              onChange={e => setSoloStockBajo(e.target.checked)}
            />
            Solo stock bajo
          </label>
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
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr className="text-left border-b border-[#E4D9CB] bg-[#F4EDE4] text-sm text-[#3B2418]/70">
                <Th campo="sku" orden={orden} onClick={cambiarOrden}>SKU</Th>
                <Th campo="name" orden={orden} onClick={cambiarOrden}>Nombre</Th>
                <Th campo="warehouse_name" orden={orden} onClick={cambiarOrden}>Almacén</Th>
                <Th campo="stock" orden={orden} onClick={cambiarOrden}>Stock</Th>
                <Th campo="price" orden={orden} onClick={cambiarOrden}>Precio</Th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr><td colSpan={6} className="p-8 text-center text-[#3B2418]/40">Cargando inventario...</td></tr>
              )}

              {!cargando && filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#3B2418]/40">
                    {productos.length === 0
                      ? 'Aún no hay productos. Crea el primero con "+ Nuevo producto".'
                      : 'No se encontraron productos con esos filtros.'}
                  </td>
                </tr>
              )}

              {!cargando && filtrados.map(p => {
                const stockBajo = p.stock <= p.stock_min
                return (
                  <tr
                    key={`${p.product_id}-${p.warehouse_id}`}
                    className={`border-b border-[#E4D9CB] last:border-0 text-sm ${stockBajo ? 'bg-red-50' : 'hover:bg-[#F4EDE4]/60'}`}
                  >
                    <td className="p-3 font-mono text-[#3B2418]/80">{p.sku}</td>
                    <td className="p-3 font-medium text-[#1C140F]">{p.name}</td>
                    <td className="p-3 text-[#3B2418]/70">{p.warehouse_name}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 ${stockBajo ? 'text-red-600 font-semibold' : 'text-[#3B2418]'}`}>
                        {p.stock}
                        {stockBajo && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                            Bajo
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="p-3 text-[#3B2418]">${Number(p.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRegistrandoMovimiento(p)}
                          title="Registrar movimiento"
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F4EDE4] text-[#3B2418] hover:shadow-md transition-all"
                        >
                          <PackagePlus size={14} />
                        </button>
                        <button
                          onClick={() => setVerMovimientos(p.product_id)}
                          title="Historial de movimientos"
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F4EDE4] text-[#3B2418] hover:shadow-md transition-all"
                        >
                          <History size={14} />
                        </button>
                        <button
                          onClick={() => { setEditando(p); setModalOpen(true) }}
                          title="Editar"
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F4EDE4] text-[#3B2418] hover:shadow-md transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => eliminar(p.product_id)}
                          title="Desactivar"
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F4EDE4] text-red-600 hover:shadow-md transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!cargando && filtrados.length > 0 && (
          <p className="text-xs text-[#3B2418]/50 mt-2">
            Mostrando {filtrados.length} de {productos.length} productos
          </p>
        )}

        {modalOpen && (
          <ProductModal producto={editando} onClose={() => setModalOpen(false)} onSaved={cargar} />
        )}
        {verMovimientos && (
          <MovementsModal productId={verMovimientos} onClose={() => setVerMovimientos(null)} />
        )}
        {registrandoMovimiento && (
          <MovementFormModal
            producto={registrandoMovimiento}
            onClose={() => setRegistrandoMovimiento(null)}
            onSaved={cargar}
          />
        )}
      </div>
    </div>
  )
}

// Encabezado de columna ordenable
function Th({ campo, orden, onClick, children }) {
  const activo = orden.campo === campo
  return (
    <th
      className="p-3 cursor-pointer select-none hover:text-[#1C140F] whitespace-nowrap"
      onClick={() => onClick(campo)}
    >
      <span className={`inline-flex items-center gap-1 ${activo ? 'font-semibold text-[#1C140F]' : ''}`}>
        {children}
        {activo && (orden.dir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
      </span>
    </th>
  )
}