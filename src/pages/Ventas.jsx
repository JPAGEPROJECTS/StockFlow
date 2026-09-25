import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getProductsForSale, getCategories } from '../services/productService'
import { getCustomers, createSale, addSaleItem } from '../services/salesService'
import { getTurnoActivo } from '../services/shiftService'
import { Search, X, Minus, Plus, Pencil } from 'lucide-react'
import { MuestraColor } from '../components/ColorCombobox'

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

const esNumeroInvalido = (v) => v === '' || v === null || isNaN(Number(v))

// Una línea en modo "total" guarda el precio del grupo completo; en modo "unitario", el precio por pieza
const precioLineaInvalido = (i) =>
  esNumeroInvalido(i.modoPrecio === 'total' ? i.precioGrupo : i.price)

const subtotalLinea = (i) =>
  i.modoPrecio === 'total'
    ? Number(i.precioGrupo) || 0
    : (Number(i.price) || 0) * i.cantidad

const centavosLinea = (i) =>
  i.modoPrecio === 'total'
    ? Math.round(Number(i.precioGrupo) * 100)
    : Math.round(Number(i.price) * 100) * i.cantidad

// Reparte un monto en centavos proporcionalmente a los pesos, asignando los
// centavos sobrantes a las mayores fracciones para que la suma sea exacta.
const repartirCentavos = (centavos, pesos) => {
  const suma = pesos.reduce((a, b) => a + b, 0)
  const exactos = pesos.map(p => (centavos * p) / suma)
  const partes = exactos.map(Math.floor)
  let sobrante = centavos - partes.reduce((a, b) => a + b, 0)
  exactos
    .map((x, idx) => ({ idx, fraccion: x - Math.floor(x) }))
    .sort((a, b) => b.fraccion - a.fraccion)
    .forEach(({ idx }) => { if (sobrante > 0) { partes[idx]++; sobrante-- } })
  return partes
}

// Convierte el importe de una línea en uno o dos registros de sale_items
// con precios unitarios cuya suma es exacta (ej. $100 / 3 → 2 × $33.33 + 1 × $33.34).
const lineasParaGuardar = (cantidad, centavos) => {
  const base = Math.floor(centavos / cantidad)
  const resto = centavos - base * cantidad
  return [
    { quantity: cantidad - resto, unit_price: base / 100 },
    { quantity: resto, unit_price: (base + 1) / 100 }
  ].filter(l => l.quantity > 0)
}

// Importe final (en centavos) de cada línea. Si hay un total acordado, la
// diferencia (descuento o incremento) se reparte según el peso de cada línea;
// si todas valen $0, se reparte por cantidad de piezas.
const centavosFinales = (carrito, totalAcordado) => {
  const originales = carrito.map(centavosLinea)
  if (totalAcordado === null) return originales
  const pesos = originales.some(c => c > 0) ? originales : carrito.map(i => i.cantidad)
  return repartirCentavos(Math.round(Number(totalAcordado) * 100), pesos)
}

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
  // Precio final negociado con el cliente para toda la venta (null = sin ajuste)
  const [totalAcordado, setTotalAcordado] = useState(null)
  // Motivo del cambio de total; se guarda en sales.note
  const [notaAjuste, setNotaAjuste] = useState('')
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
        color: p.color,
        price: p.price,        // precio base, editable después en el carrito
        precioLista: p.price,  // referencia para mostrar descuento/incremento
        modoPrecio: 'unitario', // 'unitario' | 'total'
        precioGrupo: '',       // precio de todas las piezas juntas (modo 'total')
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
        if (i.modoPrecio === 'total') {
          mostrarToast(`ℹ️ Se mantiene el total del grupo de "${i.name}"; se recalculó el precio por pieza`)
        }
        return { ...i, cantidad: nueva }
      }
      return i
    }))
  }

  // Permite editar el precio de venta directamente en el carrito (los precios varían por venta)
  const cambiarPrecio = (product_id, warehouse_id, nuevoValor) => {
    const valor = nuevoValor === '' ? '' : Number(nuevoValor)
    if (valor !== '' && (isNaN(valor) || valor < 0)) return
    setCarrito(carrito.map(i =>
      i.product_id === product_id && i.warehouse_id === warehouse_id
        ? { ...i, price: valor }
        : i
    ))
  }

  // Precio de todas las piezas de la línea juntas (puede ser menor o mayor al precio de lista)
  const cambiarPrecioGrupo = (product_id, warehouse_id, nuevoValor) => {
    const valor = nuevoValor === '' ? '' : Number(nuevoValor)
    if (valor !== '' && (isNaN(valor) || valor < 0)) return
    setCarrito(carrito.map(i =>
      i.product_id === product_id && i.warehouse_id === warehouse_id
        ? { ...i, precioGrupo: valor }
        : i
    ))
  }

  // Alterna entre precio por pieza y precio total del grupo, conservando el importe actual de la línea
  const cambiarModoPrecio = (product_id, warehouse_id, modo) => {
    setCarrito(carrito.map(i => {
      if (i.product_id !== product_id || i.warehouse_id !== warehouse_id || i.modoPrecio === modo) return i
      if (modo === 'total') {
        const grupo = esNumeroInvalido(i.price) ? '' : Number((Number(i.price) * i.cantidad).toFixed(2))
        return { ...i, modoPrecio: 'total', precioGrupo: grupo }
      }
      const unitario = esNumeroInvalido(i.precioGrupo) ? '' : Number((Number(i.precioGrupo) / i.cantidad).toFixed(2))
      return { ...i, modoPrecio: 'unitario', price: unitario }
    }))
  }

  const quitarDelCarrito = (product_id, warehouse_id) => {
    const restante = carrito.filter(i => !(i.product_id === product_id && i.warehouse_id === warehouse_id))
    setCarrito(restante)
    if (restante.length === 0) quitarTotalAcordado()
  }

  const quitarTotalAcordado = () => {
    setTotalAcordado(null)
    setNotaAjuste('')
  }

  const cambiarTotalAcordado = (nuevoValor) => {
    const valor = nuevoValor === '' ? '' : Number(nuevoValor)
    if (valor !== '' && (isNaN(valor) || valor < 0)) return
    setTotalAcordado(valor)
  }

  const subtotalVenta = carrito.reduce((sum, i) => sum + subtotalLinea(i), 0)
  const hayTotalAcordado = totalAcordado !== null
  const totalAcordadoInvalido = hayTotalAcordado && esNumeroInvalido(totalAcordado)
  const total = hayTotalAcordado && !totalAcordadoInvalido ? Number(totalAcordado) : subtotalVenta
  const ajusteVenta = total - subtotalVenta
  const hayPreciosInvalidos = carrito.some(precioLineaInvalido) || totalAcordadoInvalido

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
        normalizar(p.color).includes(texto) ||
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
    if (hayPreciosInvalidos) {
      setError('Revisa los precios del carrito: hay campos vacíos o inválidos.')
      return
    }
    setProcesando(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado.')

      // Verificación de turno activo antes de registrar la venta
      const { data: turnoActivo, error: turnoError } = await getTurnoActivo(user.id)
      if (turnoError) throw turnoError
      if (!turnoActivo) throw new Error('Debes abrir un turno de caja antes de vender.')

      const { data: venta, error: saleError } = await createSale({
        customer_id: clienteId,
        user_id: user.id,
        payment_method: metodoPago,
        shift_id: turnoActivo.id,
        note: totalAcordado !== null ? notaAjuste : ''
      })
      if (saleError) throw saleError

      const importes = centavosFinales(carrito, totalAcordado)
      for (const [idx, item] of carrito.entries()) {
        for (const linea of lineasParaGuardar(item.cantidad, importes[idx])) {
          const { error: itemError } = await addSaleItem({
            sale_id: venta.id,
            product_id: item.product_id,
            warehouse_id: item.warehouse_id,
            quantity: linea.quantity,
            unit_price: linea.unit_price,
            unit_cost: item.cost
          })
          if (itemError) throw new Error(`Error en "${item.name}": ${itemError.message}`)
        }
      }

      alert('Venta registrada correctamente')
      setCarrito([])
      quitarTotalAcordado()
      setClienteId('')
      cargarProductos()
    } catch (err) {
      setError(err.message)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4EDE4]">
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Columna Izquierda: Buscador y lista de productos */}
        <div className="lg:col-span-2 relative">
          <h1 className="text-lg sm:text-xl font-bold mb-4 text-[#1C140F]">Punto de Venta</h1>

          {/* Notificación flotante (Toast) */}
          {toast && (
            <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-xs bg-[#3B2418] text-[#F4EDE4] px-4 py-2 rounded-2xl shadow-lg z-50 text-sm animate-fade-in">
              {toast}
            </div>
          )}

          {/* Buscador + Filtros */}
          <form onSubmit={handleBuscarSubmit} className="flex flex-col gap-2 mb-2">
            <div className="relative">
              <button
                type="submit"
                aria-label="Buscar"
                title="Buscar"
                className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-[#F4EDE4] text-[#3B2418] hover:shadow-md transition"
              >
                <Search size={13} />
              </button>
              <input
                ref={searchInputRef}
                placeholder="Buscar por nombre, SKU, color o categoría... (atajo: /)"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setBusqueda('') }}
                className="border border-[#E4D9CB] bg-white p-2 pl-11 pr-9 w-full rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30"
              />
              {busqueda && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  title="Limpiar búsqueda"
                  onClick={() => { setBusqueda(''); searchInputRef.current?.focus() }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-[#F4EDE4] text-[#3B2418] hover:shadow-md transition"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={categoriaFiltro}
                onChange={e => setCategoriaFiltro(e.target.value)}
                className="border border-[#E4D9CB] bg-white p-2 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30 text-[#3B2418]"
              >
                <option value="">Todas las categorías</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={almacenFiltro}
                onChange={e => setAlmacenFiltro(e.target.value)}
                className="border border-[#E4D9CB] bg-white p-2 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30 text-[#3B2418]"
              >
                <option value="todos">Todos los almacenes</option>
                {almacenes.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <select
                value={orden}
                onChange={e => setOrden(e.target.value)}
                className="border border-[#E4D9CB] bg-white p-2 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30 text-[#3B2418]"
              >
                {OPCIONES_ORDEN.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </form>

          {/* Contador de resultados + limpiar filtros */}
          <div className="flex justify-between items-center mb-4 text-xs text-[#3B2418]/50 min-h-4 gap-2">
            <span>
              {!cargandoProductos && `${filtrados.length} de ${productos.length} productos`}
              {!cargandoProductos && filtrados.length === 1 && busqueda && ' · Enter para agregarlo'}
            </span>
            {hayFiltrosActivos && (
              <button onClick={limpiarFiltros} className="text-[#3B2418] hover:underline shrink-0">
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Lista de productos filtrados */}
          {cargandoProductos ? (
            <p className="text-[#3B2418]/40 text-sm text-center py-8">Cargando catálogo...</p>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#3B2418]/40 text-sm">
                {productos.length === 0 ? 'No hay productos con stock disponible.' : 'Sin resultados para tu búsqueda.'}
              </p>
              {hayFiltrosActivos && productos.length > 0 && (
                <button onClick={limpiarFiltros} className="text-[#3B2418] text-sm hover:underline mt-2">
                  Quitar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] sm:max-h-[70vh] overflow-auto pr-1">
              {filtrados.map(p => {
                const stockBajo = p.quantity <= (p.stock_min ?? 0)
                return (
                  <button
                    key={`${p.product_id}-${p.warehouse_id}`}
                    onClick={() => agregarAlCarrito(p)}
                    className="border border-[#E4D9CB] rounded-2xl p-3 text-left hover:shadow-md hover:border-[#3B2418]/40 transition-all bg-white flex flex-col justify-between"
                  >
                    <div>
                      <p className="font-medium text-sm sm:text-base text-[#1C140F]">{p.name}</p>
                      <p className="text-xs text-[#3B2418]/50 mt-0.5">
                        {p.sku} {p.category_name && `· ${p.category_name}`}
                      </p>
                      {p.color && (
                        <span className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full bg-[#F4EDE4] text-xs text-[#3B2418]">
                          <MuestraColor nombre={p.color} size={10} />
                          {p.color}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-sm mt-3 pt-2 border-t border-[#E4D9CB]">
                      <span className="text-xs text-[#3B2418]/60">{p.warehouse_name}</span>
                      <div>
                        <span className={stockBajo ? 'text-red-600 font-semibold' : 'text-[#3B2418]'}>
                          Stock: {p.quantity}
                        </span>
                        <span className="font-bold text-[#1C140F] ml-2">${p.price}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Columna Derecha: Carrito y confirmación */}
        <div className="bg-white border border-[#E4D9CB] rounded-2xl p-4 sm:p-5 shadow-sm h-fit">
          <h2 className="font-bold text-base sm:text-lg mb-4 text-[#1C140F]">Carrito</h2>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-2xl text-sm mb-3">{error}</div>}

          {carrito.length === 0 ? (
            <p className="text-[#3B2418]/40 text-sm">Agrega productos haciendo clic en ellos.</p>
          ) : (
            <div className="space-y-2 mb-4 max-h-[40vh] overflow-auto pr-1">
              {carrito.map(i => {
                const precioInvalido = precioLineaInvalido(i)
                const esTotal = i.modoPrecio === 'total'
                const subtotal = subtotalLinea(i)
                const diferencia = subtotal - Number(i.precioLista) * i.cantidad
                const hayDiferencia = !precioInvalido && Math.abs(diferencia) >= 0.005
                return (
                  <div key={`${i.product_id}-${i.warehouse_id}`} className="border-b border-[#E4D9CB] pb-2">
                    <div className="flex justify-between text-sm gap-2">
                      <span className="font-medium text-[#1C140F]">
                        {i.name}
                        {i.color && (
                          <span className="inline-flex items-center gap-1 ml-1.5 align-middle text-xs font-normal text-[#3B2418]/70">
                            <MuestraColor nombre={i.color} size={10} />
                            {i.color}
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => quitarDelCarrito(i.product_id, i.warehouse_id)}
                        className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F4EDE4] text-red-600 hover:shadow-md transition shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <button
                        onClick={() => cambiarCantidad(i.product_id, i.warehouse_id, -1)}
                        aria-label="Disminuir cantidad"
                        className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F4EDE4] text-[#3B2418] hover:shadow-md transition"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="text-sm font-semibold text-[#1C140F] w-4 text-center">{i.cantidad}</span>
                      <button
                        onClick={() => cambiarCantidad(i.product_id, i.warehouse_id, 1)}
                        aria-label="Aumentar cantidad"
                        className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F4EDE4] text-[#3B2418] hover:shadow-md transition"
                      >
                        <Plus size={13} />
                      </button>

                      {/* Precio editable por línea: por pieza o total del grupo */}
                      <div className="ml-auto flex items-center gap-1.5">
                        <div className="flex rounded-full bg-[#F4EDE4] p-0.5 text-xs" role="group" aria-label="Tipo de precio">
                          {[['unitario', 'c/u'], ['total', 'Total']].map(([modo, label]) => (
                            <button
                              key={modo}
                              type="button"
                              aria-pressed={i.modoPrecio === modo}
                              title={modo === 'total' ? 'Precio por todas las piezas juntas' : 'Precio por pieza'}
                              onClick={() => cambiarModoPrecio(i.product_id, i.warehouse_id, modo)}
                              className={`px-2 py-1 rounded-full transition ${i.modoPrecio === modo ? 'bg-[#3B2418] text-[#F4EDE4]' : 'text-[#3B2418]'}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <span className="text-[#3B2418]/50 text-sm">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={esTotal ? i.precioGrupo : i.price}
                          aria-label={esTotal ? `Precio total de ${i.cantidad} piezas` : 'Precio por pieza'}
                          onChange={e => esTotal
                            ? cambiarPrecioGrupo(i.product_id, i.warehouse_id, e.target.value)
                            : cambiarPrecio(i.product_id, i.warehouse_id, e.target.value)}
                          className={`w-20 border rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30
                            ${precioInvalido ? 'border-red-400 bg-red-50' : 'border-[#E4D9CB] bg-white'}`}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 text-xs text-[#3B2418]/50 mt-1">
                      <span>
                        Lista: ${Number(i.precioLista).toFixed(2)} c/u
                        {hayDiferencia && (
                          <span className={diferencia < 0 ? 'text-green-700' : 'text-amber-700'}>
                            {' · '}{diferencia < 0 ? 'descuento' : 'incremento'} ${Math.abs(diferencia).toFixed(2)}
                          </span>
                        )}
                      </span>
                      <span className="sm:text-right">
                        {esTotal && !precioInvalido && `≈ $${(subtotal / i.cantidad).toFixed(2)} c/u · `}
                        Subtotal: ${precioInvalido ? '—' : subtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Selección de cliente */}
          <select value={clienteId} onChange={e => setClienteId(e.target.value)} className="border border-[#E4D9CB] bg-white p-2 w-full rounded-2xl mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30 text-[#3B2418]">
            <option value="">Cliente (opcional)</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Método de pago */}
          <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} className="border border-[#E4D9CB] bg-white p-2 w-full rounded-2xl mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30 text-[#3B2418]">
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
            <option value="other">Otro</option>
          </select>

          {/* Subtotal, precio acordado con el cliente y total */}
          <div className="pt-2 mb-4 border-t border-[#E4D9CB] space-y-1.5">
            {hayTotalAcordado && (
              <div className="flex justify-between text-sm text-[#3B2418]/70">
                <span>Subtotal</span>
                <span>${subtotalVenta.toFixed(2)}</span>
              </div>
            )}

            {hayTotalAcordado ? (
              <div className="flex items-center justify-between gap-2 text-sm text-[#3B2418]">
                <span>Precio acordado</span>
                <div className="flex items-center gap-1">
                  <span className="text-[#3B2418]/50">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    autoFocus
                    value={totalAcordado}
                    aria-label="Precio acordado para toda la venta"
                    onChange={e => cambiarTotalAcordado(e.target.value)}
                    className={`w-24 border rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30
                      ${totalAcordadoInvalido ? 'border-red-400 bg-red-50' : 'border-[#E4D9CB] bg-white'}`}
                  />
                  <button
                    type="button"
                    onClick={quitarTotalAcordado}
                    aria-label="Quitar precio acordado"
                    title="Quitar precio acordado"
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F4EDE4] text-[#3B2418] hover:shadow-md transition shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setTotalAcordado(Number(subtotalVenta.toFixed(2)))}
                disabled={carrito.length === 0}
                className="flex items-center gap-1.5 text-xs text-[#3B2418] hover:underline disabled:opacity-40 disabled:no-underline"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#F4EDE4]">
                  <Pencil size={10} />
                </span>
                Cambiar total de la venta
              </button>
            )}

            {hayTotalAcordado && !totalAcordadoInvalido && Math.abs(ajusteVenta) >= 0.005 && (
              <div className={`flex justify-between text-sm ${ajusteVenta < 0 ? 'text-green-700' : 'text-amber-700'}`}>
                <span>{ajusteVenta < 0 ? 'Descuento' : 'Incremento'}</span>
                <span>{ajusteVenta < 0 ? '-' : '+'}${Math.abs(ajusteVenta).toFixed(2)}</span>
              </div>
            )}

            {hayTotalAcordado && (
              <div className="space-y-1">
                <label htmlFor="nota-ajuste" className="block text-sm text-[#3B2418]">
                  Nota
                </label>
                <textarea
                  id="nota-ajuste"
                  rows={2}
                  maxLength={200}
                  value={notaAjuste}
                  onChange={e => setNotaAjuste(e.target.value)}
                  placeholder="Motivo del cambio (ej. cliente frecuente, pieza con detalle...)"
                  className="border border-[#E4D9CB] bg-white p-2 w-full rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30"
                />
              </div>
            )}

            <div className="flex justify-between font-bold text-base sm:text-lg text-[#1C140F]">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Botón de acción */}
          <button
            onClick={confirmarVenta}
            disabled={carrito.length === 0 || procesando || hayPreciosInvalidos}
            className="bg-[#3B2418] hover:shadow-md text-[#F4EDE4] w-full py-3 rounded-2xl font-medium disabled:opacity-50 transition-all"
          >
            {procesando ? 'Procesando...' : 'Confirmar venta'}
          </button>
        </div>
      </div>
    </div>
  )
}