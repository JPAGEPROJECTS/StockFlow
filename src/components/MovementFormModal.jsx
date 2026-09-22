import { useEffect, useState } from 'react'
import { getWarehouses, getStock, registerMovement } from '../services/productService'
import { X } from 'lucide-react'

const TIPOS = [
  { value: 'in', label: 'Entrada' },
  { value: 'out', label: 'Salida' },
  { value: 'adjustment', label: 'Ajuste (conteo físico)' },
  { value: 'transfer', label: 'Transferencia entre almacenes' }
]

export default function MovementFormModal({ producto, onClose, onSaved }) {
  const [tipo, setTipo] = useState('in')
  const [warehouseId, setWarehouseId] = useState(producto.warehouse_id || '')
  const [warehouseToId, setWarehouseToId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [nuevoStock, setNuevoStock] = useState('')
  const [nota, setNota] = useState('')

  const [almacenes, setAlmacenes] = useState([])
  const [stockActual, setStockActual] = useState(null)
  const [cargandoStock, setCargandoStock] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getWarehouses().then(({ data, error }) => {
      if (error) {
        console.error('[MovementFormModal] getWarehouses falló', error)
        setError('No se pudieron cargar los almacenes: ' + error.message)
      } else {
        setAlmacenes(data || [])
      }
    })
  }, [])

  // Recarga el stock actual cada vez que cambia el almacén de origen, para
  // mostrarlo de referencia y precargar "Nuevo stock" en modo ajuste.
  useEffect(() => {
    if (!warehouseId) return
    setCargandoStock(true)
    getStock(producto.product_id, warehouseId).then(({ data, error }) => {
      if (error) {
        console.error('[MovementFormModal] getStock falló', error)
        setError('No se pudo leer el stock actual: ' + error.message)
      } else {
        setStockActual(data)
        setNuevoStock(String(data))
      }
      setCargandoStock(false)
    })
  }, [warehouseId, producto.product_id])

  const almacenesDestino = almacenes.filter(w => w.id !== warehouseId)

  const validar = () => {
    if (!warehouseId) {
      setError('Selecciona un almacén.')
      return false
    }
    if (tipo === 'transfer') {
      if (!warehouseToId) {
        setError('Selecciona el almacén destino.')
        return false
      }
      if (Number(cantidad) <= 0) {
        setError('La cantidad a transferir debe ser mayor a 0.')
        return false
      }
      if (stockActual !== null && Number(cantidad) > stockActual) {
        setError(`No hay suficiente stock en el almacén de origen (disponible: ${stockActual}).`)
        return false
      }
      return true
    }
    if (tipo === 'adjustment') {
      if (nuevoStock === '' || Number(nuevoStock) < 0) {
        setError('Escribe el nuevo stock contado (0 o mayor).')
        return false
      }
      if (stockActual !== null && Number(nuevoStock) === stockActual) {
        setError('El nuevo stock es igual al actual: no hay ningún cambio que guardar.')
        return false
      }
      return true
    }
    // in / out
    if (Number(cantidad) <= 0) {
      setError('La cantidad debe ser mayor a 0.')
      return false
    }
    if (tipo === 'out' && stockActual !== null && Number(cantidad) > stockActual) {
      setError(`No hay suficiente stock en este almacén (disponible: ${stockActual}).`)
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!validar()) return
    setGuardando(true)

    const payload = {
      product_id: producto.product_id,
      warehouse_id: warehouseId,
      warehouse_to_id: tipo === 'transfer' ? warehouseToId : null,
      movement_type: tipo,
      quantity: tipo === 'adjustment' ? Number(nuevoStock) - stockActual : Number(cantidad),
      note: nota || (tipo === 'adjustment' ? 'Ajuste por conteo físico' : null)
    }

    const { error: movError } = await registerMovement(payload)
    setGuardando(false)
    if (movError) {
      console.error('[MovementFormModal] registerMovement falló', movError, payload)
      setError(movError.message)
      return
    }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#E4D9CB] p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl w-full sm:w-96 space-y-3 max-h-[92vh] sm:max-h-[90vh] overflow-auto"
      >
        <div className="flex justify-between items-start gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1C140F]">Registrar movimiento</h2>
            <p className="text-xs text-[#3B2418]/60">{producto.name} · {producto.sku}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F4EDE4] text-[#3B2418] shrink-0"
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-2 rounded-2xl border border-red-300">
            {error}
          </div>
        )}

        <select value={tipo} onChange={e => setTipo(e.target.value)}
          className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base text-[#3B2418] focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30">
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <div>
          <label className="text-xs text-[#3B2418]/60 mb-1 block">
            {tipo === 'transfer' ? 'Almacén origen' : 'Almacén'}
          </label>
          <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
            className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base text-[#3B2418] focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30">
            {almacenes.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <p className="text-xs text-[#3B2418]/60">
          Stock actual en este almacén: <span className="font-semibold text-[#1C140F]">{cargandoStock ? '...' : stockActual}</span>
        </p>

        {tipo === 'transfer' && (
          <div>
            <label className="text-xs text-[#3B2418]/60 mb-1 block">Almacén destino</label>
            <select value={warehouseToId} onChange={e => setWarehouseToId(e.target.value)}
              className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base text-[#3B2418] focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30">
              <option value="">Selecciona...</option>
              {almacenesDestino.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}

        {tipo === 'adjustment' ? (
          <input type="number" min="0" placeholder="Nuevo stock contado" value={nuevoStock}
            onChange={e => setNuevoStock(e.target.value)}
            className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30" required />
        ) : (
          <input type="number" min="1" placeholder={tipo === 'transfer' ? 'Cantidad a transferir' : 'Cantidad'} value={cantidad}
            onChange={e => setCantidad(e.target.value)}
            className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30" required />
        )}

        <input placeholder="Nota (opcional)" value={nota} onChange={e => setNota(e.target.value)}
          className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30" />

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} disabled={guardando}
            className="px-4 py-2 text-sm sm:text-base text-[#3B2418]/70 hover:text-[#1C140F] transition-colors">Cancelar</button>
          <button type="submit" disabled={guardando || cargandoStock}
            className="bg-[#3B2418] text-[#F4EDE4] px-4 py-2 rounded-2xl text-sm sm:text-base font-medium hover:shadow-md transition-all disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
