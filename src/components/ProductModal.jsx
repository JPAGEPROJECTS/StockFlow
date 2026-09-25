import { useState, useEffect } from 'react'
import { createProduct, updateProduct, registerMovement, getCategories, getWarehouses, getProduct, getSiguienteSku } from '../services/productService'
import { prefijoSku } from '../lib/sku'
import ColorCombobox from './ColorCombobox'

const INTENTOS_SKU = 3

const claseInput = 'border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30'

// Etiqueta con el nombre encima de cada campo del formulario
function Campo({ id, label, obligatorio, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-[#1C140F]">
        {label}{obligatorio && <span className="text-red-600"> *</span>}
      </label>
      {children}
    </div>
  )
}

export default function ProductModal({ producto, onClose, onSaved }) {
  const [form, setForm] = useState({
    sku: '', name: '', color: '', price: '', cost: '', stock_min: 5, category_id: ''
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
            color: data.color || '',
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

  // Al crear, el SKU se arma con la categoría y el color: VR + categoría + "-" + color + "-" + folio.
  // Al editar se conserva el SKU original (puede estar impreso en etiquetas).
  const nombreCategoria = categorias.find(c => c.id === form.category_id)?.name
  const prefijo = !producto && nombreCategoria && form.color.trim()
    ? prefijoSku(nombreCategoria, form.color)
    : null

  const [skuSugerido, setSkuSugerido] = useState('')
  const [cargandoSku, setCargandoSku] = useState(false)

  useEffect(() => {
    if (!prefijo) { setSkuSugerido(''); return }
    let vigente = true
    setCargandoSku(true)
    // Espera a que se deje de escribir el color para no consultar en cada tecla
    const t = setTimeout(async () => {
      const { data, error } = await getSiguienteSku(prefijo)
      if (!vigente) return
      setSkuSugerido(error ? '' : data)
      if (error) setError('No se pudo generar el SKU: ' + error.message)
      setCargandoSku(false)
    }, 300)
    return () => { vigente = false; clearTimeout(t) }
  }, [prefijo])

  const validar = () => {
    if (!producto && (!form.category_id || !form.color.trim())) {
      setError('Elige categoría y color: se usan para generar el SKU.')
      return false
    }
    if (!producto && !prefijo) {
      setError('No se pudo armar el SKU con esa categoría y color. Usa nombres con letras.')
      return false
    }
    if (!form.name || !form.price) {
      setError('Nombre y precio son obligatorios.')
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
        // El folio se vuelve a consultar al guardar; si otro usuario tomó el mismo SKU
        // entre tanto (violación de unique, código 23505), se reintenta con el siguiente.
        let nuevo = null
        for (let intento = 1; !nuevo; intento++) {
          const { data: sku, error: skuError } = await getSiguienteSku(prefijo)
          if (skuError) throw skuError
          const { data, error: createError } = await createProduct({ ...form, sku })
          if (!createError) {
            nuevo = data
          } else if (createError.code !== '23505' || intento >= INTENTOS_SKU) {
            throw createError
          }
        }

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
        className="bg-white border border-[#E4D9CB] p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl w-full sm:w-[28rem] space-y-4 max-h-[92vh] sm:max-h-[90vh] overflow-auto"
      >
        <h2 className="text-base sm:text-lg font-bold text-[#1C140F]">{producto ? 'Editar' : 'Nuevo'} producto</h2>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-2 rounded-2xl border border-red-300">
            {error}
          </div>
        )}

        <Campo id="producto-nombre" label="Nombre" obligatorio>
          <input id="producto-nombre" name="name" placeholder="Ej. Pulsera de hilo azul" value={form.name} onChange={handleChange}
            className={claseInput} required />
        </Campo>

        <Campo id="producto-categoria" label="Categoría" obligatorio={!producto}>
          <select id="producto-categoria" name="category_id" value={form.category_id} onChange={handleChange}
            className={`${claseInput} text-[#3B2418]`}>
            <option value="">{producto ? 'Sin categoría' : 'Elige una categoría...'}</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Campo>

        <Campo id="producto-color" label="Color" obligatorio={!producto}>
          <ColorCombobox id="producto-color" value={form.color} onChange={color => setForm({ ...form, color })} />
        </Campo>

        <Campo id="producto-sku" label="SKU">
          <input
            id="producto-sku"
            readOnly
            value={producto ? form.sku : cargandoSku ? 'Generando...' : skuSugerido}
            placeholder="Se genera al elegir categoría y color"
            className={`${claseInput} bg-[#F4EDE4] font-mono text-[#3B2418] cursor-default`}
          />
        </Campo>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo id="producto-precio" label="Precio de venta" obligatorio>
            <input id="producto-precio" name="price" type="number" step="0.01" placeholder="0.00" value={form.price}
              onChange={handleChange} className={claseInput} required />
          </Campo>
          <Campo id="producto-costo" label="Costo">
            <input id="producto-costo" name="cost" type="number" step="0.01" placeholder="0.00" value={form.cost}
              onChange={handleChange} className={claseInput} />
          </Campo>
        </div>

        <Campo id="producto-stock-min" label="Stock mínimo">
          <input id="producto-stock-min" name="stock_min" type="number" value={form.stock_min}
            onChange={handleChange} className={claseInput} />
        </Campo>

        {!producto && (
          <>
            <hr className="border-[#E4D9CB]" />
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
              <p className="text-sm font-semibold text-[#3B2418]/70 shrink-0">Stock inicial (opcional)</p>
              <p className="text-xs text-[#3B2418]/50">
                Piezas con las que arranca el producto; se registran como entrada en el historial de movimientos.
              </p>
            </div>

            <Campo id="producto-almacen" label="Almacén">
              {cargandoAlmacenes ? (
                <p className="text-sm text-[#3B2418]/40">Cargando almacenes...</p>
              ) : (
                <select id="producto-almacen" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
                  className={`${claseInput} text-[#3B2418]`} disabled={almacenes.length === 0}>
                  {almacenes.length === 0 && <option>Sin almacenes disponibles</option>}
                  {almacenes.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              )}
            </Campo>

            <Campo id="producto-cantidad" label="Cantidad inicial">
              <input id="producto-cantidad" type="number" min="0" value={stockInicial}
                onChange={e => setStockInicial(e.target.value)} className={claseInput} />
            </Campo>
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