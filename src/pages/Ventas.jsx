import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getProductsForSale, getCategories } from '../services/productService'
import { getCustomers, createSale, addSaleItem } from '../services/salesService'

// Quita acentos y normaliza para que "cafe" encuentre "café", etc.
const normalizar = (str) =>
  (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const OPCIONES_ORDEN = [
  { value: 'name_asc', label: 'Nombre (A-Z)' },
  { value: 'name_desc', label: 'Nombre (Z-A)' },
  { value: 'price_asc', label: 'Precio (menor a mayor)' },
  { value: 'price_desc', label: 'Precio (mayor a menor)' },
  { value: 'stock_desc', label: 'Stock (mayor a menor)' },
  { value: 'stock_asc', label: 'Stock (menor a mayor)' }
]

export default function Ventas() {
  const [productos, setProductos] = useState([])
  const [cargandoProductos, setCargandoProductos] = useState(true)

  const [busqueda, setBusqueda] = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [almacenFiltro, setAlmacenFiltro] = useState('todos')
  const [orden, setOrden] = useState('name_asc')
  const [categorias, setCategorias] = useState([])

  const [carrito, setCarrito] = useState([])
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [metodoPago, setMetodoPago] = useState('cash')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    cargarProductos()
    getCustomers().then(({ data }) => setClientes(data || []))
    getCategories().then(({ data }) => setCategorias(data || []))
    searchInputRef.current?.focus()
  }, [])

  // Debounce: evita refiltrar en cada tecla si el catálogo es grande
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 200)
    return () => clearTimeout(t)
  }, [busqueda])

  // Atajo de teclado "/" para saltar al buscador desde cualquier parte de la pantalla
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const cargarProductos = async () => {
    setCargandoProductos(true)
    const { data, error } = await getProductsForSale()
    if (error) {
      setError('No se pudo cargar el catálogo: ' + error.message)
    } else {
      setProductos(data || [])
    }
    setCargandoProductos(false)
  }

  const mostrarToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2000)
  }

  const agregarAlCarrito = (p) => {
    const existente = carrito.find(i => i.product_id === p.product_id && i.warehouse_id === p.warehouse_id)
    if (existente) {
      if (existente.cantidad >= p.quantity) {
        mostrarToast(`⚠️ No hay más stock de "${p.name}"`)
        return
      }
      setCarrito(carrito.map(i =>
        i.product_id === p.product_id && i.warehouse_id === p.warehouse_id
          ? { ...i, cantidad: i.cantidad + 1 } : i
      ))
    } else {
      setCarrito([...carrito, {
        product_id: p.product_id,
        warehouse_id: p.warehouse_id,
        sku: p.sku,
        name: p.name,
        price: p.price,
        cost: p.cost,
        stockDisponible: p.quantity,
        cantidad: 1
      }])
    }
    mostrarToast(`✅ "${p.name}" agregado al carrito`)
  }

  const cambiarCantidad = (product_id, warehouse_id, delta) => {
    setCarrito(carrito.map(i => {
      if (i.product_id === product_id && i.warehouse_id === warehouse_id) {
        const nueva = i.cantidad + delta
        if (nueva < 1) return i
        if (nueva > i.stockDisponible) {
          mostrarToast('⚠️ Stock insuficiente')
          return i
        }
        return { ...i, cantidad: nueva }
      }
      return i
    }))
  }

  const quitarDelCarrito = (product_id, warehouse_id) => {
    setCarrito(carrito.filter(i => !(i.product_id === product_id && i.warehouse_id === warehouse_id)))
  }

  const total = carrito.reduce((sum, i) => sum + i.price * i.cantidad, 0)

  // Almacenes disponibles para el filtro, derivados del propio catálogo cargado
  const almacenes = useMemo(() => {
    const map = new Map()
    productos.forEach(p => { if (p.warehouse_id) map.set(p.warehouse_id, p.warehouse_name) })
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [productos])

  const hayFiltrosActivos = busqueda.trim() !== '' || categoriaFiltro !== '' || almacenFiltro !== 'todos'

  const limpiarFiltros = () => {
    setBusqueda('')
    setCategoriaFiltro('')
    setAlmacenFiltro('todos')
    searchInputRef.current?.focus()
  }

  // Búsqueda (texto normalizado, sin acentos) + categoría + almacén, con orden aplicado
  const filtrados = useMemo(() => {
    const texto = normalizar(busquedaDebounced)

    let resultado = productos.filter(p => {
      const coincideTexto = !texto ||
        normalizar(p.name).includes(texto) ||
        normalizar(p.sku).includes(texto) ||
        normalizar(p.category_name).includes(texto) ||
        p.product_id?.toLowerCase() === texto

      const coincideCategoria = !categoriaFiltro || p.category_id === categoriaFiltro
      const coincideAlmacen = almacenFiltro === 'todos' || p.warehouse_id === almacenFiltro

      return coincideTexto && coincideCategoria && coincideAlmacen
    })

    resultado.sort((a, b) => {
      switch (orden) {
        case 'name_desc': return b.name.localeCompare(a.name)
        case 'price_asc': return a.price - b.price
        case 'price_desc': return b.price - a.price
        case 'stock_desc': return b.quantity - a.quantity
        case 'stock_asc': return a.quantity - b.quantity
        default: return a.name.localeCompare(b.name)
      }
    })

    return resultado
  }, [productos, busquedaDebounced, categoriaFiltro, almacenFiltro, orden])

  // Si la búsqueda deja un único resultado, Enter lo agrega directo (útil con lector de código de barras)
  const handleBuscarSubmit = (e) => {
    e.preventDefault()
    if (filtrados.length === 1) {
      agregarAlCarrito(filtrados[0])
      setBusqueda('')
      searchInputRef.current?.focus()
    }
  }

  const confirmarVenta = async () => {
    if (carrito.length === 0) return
    setProcesando(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: venta, error: saleError } = await createSale({
        customer_id: clienteId,
        user_id: user?.id,
        payment_method: metodoPago
      })
      if (saleError) throw saleError

      for (const item of carrito) {
        const { error: itemError } = await addSaleItem({
          sale_id: venta.id,
          product_id: item.product_id,
          warehouse_id: item.warehouse_id,
          quantity: item.cantidad,
          unit_price: item.price,
          unit_cost: item.cost
        })
        if (itemError) throw new Error(`Error en "${item.name}": ${itemError.message}`)
      }

      alert('Venta registrada correctamente')
      setCarrito([])
      setClienteId('')
      cargarProductos()
    } catch (err) {
      setError(err.message)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Columna Izquierda: Buscador y lista de productos */}
      <div className="lg:col-span-2 relative">
        <h1 className="text-xl font-bold mb-4">Punto de Venta</h1>

        {/* Notificación flotante (Toast) */}
        {toast && (
          <div className="fixed top-4 right-4 bg-gray-900 text-white px-4 py-2 rounded shadow-lg z-50 text-sm animate-fade-in">
            {toast}
          </div>
        )}

        {/* Buscador + Filtros */}
        <form onSubmit={handleBuscarSubmit} className="flex flex-col sm:flex-row gap-2 mb-2">
          <div className="relative flex-1">
            <button
              type="submit"
              aria-label="Buscar"
              title="Buscar"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition p-1"
            >
              🔍
            </button>
            <input
              ref={searchInputRef}
              placeholder="Buscar por nombre, SKU, categoría o ID... (atajo: /)"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setBusqueda('') }}
              className="border p-2 pl-9 pr-8 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {busqueda && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                title="Limpiar búsqueda"
                onClick={() => { setBusqueda(''); searchInputRef.current?.focus() }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 transition px-1"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={categoriaFiltro}
            onChange={e => setCategoriaFiltro(e.target.value)}
            className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            {categorias.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={almacenFiltro}
            onChange={e => setAlmacenFiltro(e.target.value)}
            className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los almacenes</option>
            {almacenes.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select
            value={orden}
            onChange={e => setOrden(e.target.value)}
            className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {OPCIONES_ORDEN.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </form>

        {/* Contador de resultados + limpiar filtros */}
        <div className="flex justify-between items-center mb-4 text-xs text-gray-400 h-4">
          <span>
            {!cargandoProductos && `${filtrados.length} de ${productos.length} productos`}
            {!cargandoProductos && filtrados.length === 1 && busqueda && ' · Enter para agregarlo'}
          </span>
          {hayFiltrosActivos && (
            <button onClick={limpiarFiltros} className="text-blue-600 hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Lista de productos filtrados */}
        {cargandoProductos ? (
          <p className="text-gray-400 text-sm text-center py-8">Cargando catálogo...</p>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">
              {productos.length === 0 ? 'No hay productos con stock disponible.' : 'Sin resultados para tu búsqueda.'}
            </p>
            {hayFiltrosActivos && productos.length > 0 && (
              <button onClick={limpiarFiltros} className="text-blue-600 text-sm hover:underline mt-2">
                Quitar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-auto pr-1">
            {filtrados.map(p => {
              const stockBajo = p.quantity <= (p.stock_min ?? 0)
              return (
                <button
                  key={`${p.product_id}-${p.warehouse_id}`}
                  onClick={() => agregarAlCarrito(p)}
                  className="border rounded p-3 text-left hover:bg-blue-50 hover:border-blue-400 transition bg-white shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.sku} {p.category_name && `· ${p.category_name}`}
                    </p>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-3 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">{p.warehouse_name}</span>
                    <div>
                      <span className={stockBajo ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                        Stock: {p.quantity}
                      </span>
                      <span className="font-bold text-gray-900 ml-2">${p.price}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Columna Derecha: Carrito y confirmación */}
      <div className="border-l pl-0 lg:pl-6">
        <h2 className="font-bold text-lg mb-4">Carrito</h2>

        {error && <div className="bg-red-100 text-red-700 p-2 rounded text-sm mb-3">{error}</div>}

        {carrito.length === 0 ? (
          <p className="text-gray-400 text-sm">Agrega productos haciendo clic en ellos.</p>
        ) : (
          <div className="space-y-2 mb-4 max-h-[40vh] overflow-auto pr-1">
            {carrito.map(i => (
              <div key={`${i.product_id}-${i.warehouse_id}`} className="border-b pb-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{i.name}</span>
                  <button onClick={() => quitarDelCarrito(i.product_id, i.warehouse_id)} className="text-red-500 hover:text-red-700">✕</button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => cambiarCantidad(i.product_id, i.warehouse_id, -1)} className="border px-2 rounded hover:bg-gray-100">-</button>
                  <span className="text-sm font-semibold">{i.cantidad}</span>
                  <button onClick={() => cambiarCantidad(i.product_id, i.warehouse_id, 1)} className="border px-2 rounded hover:bg-gray-100">+</button>
                  <span className="ml-auto font-medium">${(i.price * i.cantidad).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selección de cliente */}
        <select value={clienteId} onChange={e => setClienteId(e.target.value)} className="border p-2 w-full rounded mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Cliente (opcional)</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Método de pago */}
        <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} className="border p-2 w-full rounded mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="transfer">Transferencia</option>
          <option value="other">Otro</option>
        </select>

        {/* Total */}
        <div className="flex justify-between font-bold text-lg mb-4 pt-2 border-t">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>

        {/* Botón de acción */}
        <button
          onClick={confirmarVenta}
          disabled={carrito.length === 0 || procesando}
          className="bg-blue-600 hover:bg-blue-700 text-white w-full py-3 rounded font-medium disabled:opacity-50 transition"
        >
          {procesando ? 'Procesando...' : 'Confirmar venta'}
        </button>
      </div>
    </div>
  )
}