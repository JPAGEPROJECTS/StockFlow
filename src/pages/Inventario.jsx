import { useEffect, useMemo, useState } from 'react'
import { getProducts, deactivateProduct } from '../services/productService'
import { exportToExcel } from '../services/exportService'
import ProductModal from '../components/ProductModal'
import MovementsModal from '../components/MovementsModal'
import NavMenu from '../components/NavMenu'

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
    Precio: p.price,
    Estado: p.stock === null ? 'Sin registrar' : p.stock <= p.stock_min ? 'Stock bajo' : 'OK'
  }))
  exportToExcel(datos, 'inventario', 'Inventario')
}

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500">Gestiona tus productos, existencias y precios</p>
        </div>
        <button onClick={exportar} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Exportar a Excel
        </button>
        <button onClick={() => { setEditando(null); setModalOpen(true) }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          + Nuevo producto
        </button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500">Productos activos</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalProductos}</p>
        </div>
        <div className={`border rounded-lg p-4 shadow-sm ${stats.stockBajo > 0 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
          <p className="text-sm text-gray-500">Con stock bajo</p>
          <p className={`text-2xl font-bold ${stats.stockBajo > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {stats.stockBajo}
          </p>
        </div>
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500">Valor total en inventario</p>
          <p className="text-2xl font-bold text-gray-900">
            ${stats.valorTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          placeholder="Buscar por nombre o SKU..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="border rounded-lg p-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={almacenFiltro}
          onChange={e => setAlmacenFiltro(e.target.value)}
          className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos los almacenes</option>
          {almacenes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <label className="flex items-center gap-2 border rounded-lg px-3 text-sm text-gray-700 whitespace-nowrap">
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
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={cargar} className="text-sm font-medium underline">Reintentar</button>
        </div>
      )}

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b bg-gray-50 text-sm text-gray-600">
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
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Cargando inventario...</td></tr>
            )}

            {!cargando && filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
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
                  className={`border-b last:border-0 text-sm ${stockBajo ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="p-3 font-mono text-gray-700">{p.sku}</td>
                  <td className="p-3 font-medium text-gray-900">{p.name}</td>
                  <td className="p-3 text-gray-600">{p.warehouse_name}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 ${stockBajo ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                      {p.stock}
                      {stockBajo && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                          Bajo
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="p-3 text-gray-700">${Number(p.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  <td className="p-3">
                    <div className="flex gap-3">
                      <button onClick={() => setVerMovimientos(p.product_id)} className="text-blue-600 hover:underline text-sm">
                        Movimientos
                      </button>
                      <button onClick={() => { setEditando(p); setModalOpen(true) }} className="text-green-600 hover:underline text-sm">
                        Editar
                      </button>
                      <button onClick={() => eliminar(p.product_id)} className="text-red-600 hover:underline text-sm">
                        Desactivar
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
        <p className="text-xs text-gray-400 mt-2">
          Mostrando {filtrados.length} de {productos.length} productos
        </p>
      )}

      {modalOpen && (
        <ProductModal producto={editando} onClose={() => setModalOpen(false)} onSaved={cargar} />
      )}
      {verMovimientos && (
        <MovementsModal productId={verMovimientos} onClose={() => setVerMovimientos(null)} />
      )}
    </div>
  )
}

// Encabezado de columna ordenable
function Th({ campo, orden, onClick, children }) {
  const activo = orden.campo === campo
  return (
    <th
      className="p-3 cursor-pointer select-none hover:text-gray-900"
      onClick={() => onClick(campo)}
    >
      <span className={activo ? 'font-semibold text-gray-900' : ''}>
        {children} {activo && (orden.dir === 'asc' ? '▲' : '▼')}
      </span>
    </th>
  )
}