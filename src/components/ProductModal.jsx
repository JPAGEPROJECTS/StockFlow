import { useState, useEffect } from 'react'
import { createProduct, updateProduct, registerMovement, getCategories, getWarehouses, getProduct } from '../services/productService'

export default function ProductModal({ producto, onClose, onSaved }) {
  const [form, setForm] = useState({
    sku: '', name: '', price: '', cost: '', stock_min: 5, category_id: ''
  })
  const [stockInicial, setStockInicial] = useState(0)
  const [warehouseId, setWarehouseId] = useState('')
  const [categorias, setCategorias] = useState([])
  const [almacenes, setAlmacenes] = useState([])
  const [cargandoAlmacenes, setCargandoAlmacenes] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getCategories().then(({ data }) => setCategorias(data || []))
    getWarehouses().then(({ data, error }) => {
      if (error) {
        setError('No se pudieron cargar los almacenes: ' + error.message)
      } else if (data?.length) {
        setAlmacenes(data)
        setWarehouseId(data[0].id)
      } else {
        setError('No hay almacenes creados. Crea uno primero en la tabla warehouses.')
      }
      setCargandoAlmacenes(false)
    })

    // `producto` viene de la fila aplanada de la tabla (product_id, sin cost/category_id),
    // así que traemos el registro completo de products para precargar el formulario.
    if (producto) {
      getProduct(producto.product_id).then(({ data, error }) => {
        if (error) {
          setError('No se pudo cargar el producto: ' + error.message)
          return
        }
        if (data) {
          setForm({
            sku: data.sku,
            name: data.name,
            price: data.price,
            cost: data.cost,
            stock_min: data.stock_min,
            category_id: data.category_id || ''
          })
        }
      })
    }
  }, [producto])

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const validar = () => {
    if (!form.sku || !form.name || !form.price) {
      setError('SKU, nombre y precio son obligatorios.')
      return false
    }
    if (!producto && Number(stockInicial) > 0 && !warehouseId) {
      setError('Selecciona un almacén para el stock inicial.')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!validar()) return
    setGuardando(true)

    try {
      if (producto) {
        // El identificador real del producto es product_id, no id
        // (la fila que llega de Inventario.jsx es la vista aplanada por almacén).
        const { error: updError } = await updateProduct(producto.product_id, form)
        if (updError) throw updError
      } else {
        const { data: nuevo, error: createError } = await createProduct(form)
        if (createError) throw createError

        if (Number(stockInicial) > 0) {
          const { error: movError } = await registerMovement({
            product_id: nuevo.id,
            warehouse_id: warehouseId,
            movement_type: 'in',
            quantity: Number(stockInicial),
            note: 'Stock inicial'
          })
          if (movError) {
            // El producto ya se creó, pero el movimiento falló - avisar claramente
            throw new Error('Producto creado, pero falló el stock inicial: ' + movError.message)
          }
        }
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#E4D9CB] p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl w-full sm:w-96 space-y-3 max-h-[92vh] sm:max-h-[90vh] overflow-auto"
      >
        <h2 className="text-base sm:text-lg font-bold text-[#1C140F]">{producto ? 'Editar' : 'Nuevo'} producto</h2>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-2 rounded-2xl border border-red-300">
            {error}
          </div>
        )}

        <input name="sku" placeholder="SKU" value={form.sku} onChange={handleChange}
          className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30" required />
        <input name="name" placeholder="Nombre" value={form.name} onChange={handleChange}
          className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30" required />
        <input name="price" type="number" step="0.01" placeholder="Precio de venta" value={form.price}
          onChange={handleChange} className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30" required />
        <input name="cost" type="number" step="0.01" placeholder="Costo" value={form.cost}
          onChange={handleChange} className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30" />
        <input name="stock_min" type="number" placeholder="Stock mínimo" value={form.stock_min}
          onChange={handleChange} className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30" />

        <select name="category_id" value={form.category_id} onChange={handleChange}
          className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base text-[#3B2418] focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30">
          <option value="">Categoría...</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {!producto && (
          <>
            <hr className="border-[#E4D9CB]" />
            <p className="text-sm font-semibold text-[#3B2418]/70">Stock inicial (opcional)</p>

            {cargandoAlmacenes ? (
              <p className="text-sm text-[#3B2418]/40">Cargando almacenes...</p>
            ) : (
              <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
                className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base text-[#3B2418] focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30" disabled={almacenes.length === 0}>
                {almacenes.length === 0 && <option>Sin almacenes disponibles</option>}
                {almacenes.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            )}

            <input type="number" min="0" placeholder="Cantidad" value={stockInicial}
              onChange={e => setStockInicial(e.target.value)} className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30" />
          </>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} disabled={guardando}
            className="px-4 py-2 text-sm sm:text-base text-[#3B2418]/70 hover:text-[#1C140F] transition-colors">Cancelar</button>
          <button type="submit" disabled={guardando}
            className="bg-[#3B2418] text-[#F4EDE4] px-4 py-2 rounded-2xl text-sm sm:text-base font-medium hover:shadow-md transition-all disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}