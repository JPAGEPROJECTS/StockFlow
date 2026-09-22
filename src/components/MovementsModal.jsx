import { useEffect, useState } from 'react'
import { getMovements } from '../services/productService'
import { X } from 'lucide-react'

const ETIQUETAS_TIPO = {
  in: { label: 'Entrada', className: 'bg-green-100 text-green-700' },
  out: { label: 'Salida', className: 'bg-red-100 text-red-700' },
  adjustment: { label: 'Ajuste', className: 'bg-amber-100 text-amber-700' },
  transfer: { label: 'Transferencia', className: 'bg-blue-100 text-blue-700' }
}

// fn_apply_sale_item (schema_tienda.sql) registra la salida por venta con
// type='out' — no hay un tipo de movimiento propio para "venta" en el
// enum — así que se distingue de una salida manual por el prefijo fijo
// que le pone a la nota, y se le da un color propio para reconocerla de
// un vistazo.
const esSalidaPorVenta = (m) => m.type === 'out' && m.reason?.startsWith('Venta ')

// quantity siempre se guarda positivo para 'in'/'out'/'transfer'
// (chk_quantity_sign lo exige); el signo real depende del type, no del
// número. Solo 'adjustment' guarda un delta con signo propio en la BD
// (puede ser negativo), así que ese se muestra tal cual.
const formatearCantidad = (m) => {
  if (m.type === 'in') return { texto: `+${m.quantity}`, positivo: true }
  if (m.type === 'out' || m.type === 'transfer') return { texto: `-${Math.abs(m.quantity)}`, positivo: false }
  return { texto: m.quantity > 0 ? `+${m.quantity}` : `${m.quantity}`, positivo: m.quantity >= 0 }
}

export default function MovementsModal({ productId, onClose }) {
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setCargando(true)
    setError(null)
    getMovements(productId).then(({ data, error }) => {
      if (error) {
        console.error('[MovementsModal] getMovements falló', error)
        setError('No se pudo cargar el historial de movimientos.')
      } else {
        setMovimientos(data || [])
      }
      setCargando(false)
    })
  }, [productId])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white border border-[#E4D9CB] p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl w-full sm:w-[560px] max-h-[92vh] sm:max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base sm:text-lg font-bold text-[#1C140F]">Movimientos</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F4EDE4] text-[#3B2418]"
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="border border-[#E4D9CB] rounded-2xl overflow-x-auto">
          <table className="w-full text-xs sm:text-sm min-w-[480px]">
            <thead>
              <tr className="text-left border-b border-[#E4D9CB] bg-[#F4EDE4] text-[#3B2418]/70">
                <th className="p-2">Fecha</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Cantidad</th>
                <th className="p-2">Almacén</th>
                <th className="p-2">Nota</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr><td colSpan={5} className="p-6 text-center text-[#3B2418]/40">Cargando movimientos...</td></tr>
              )}

              {!cargando && !error && movimientos.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-[#3B2418]/40">Aún no hay movimientos registrados.</td></tr>
              )}

              {!cargando && movimientos.map(m => {
                const etiqueta = esSalidaPorVenta(m)
                  ? { label: 'Venta', className: 'bg-purple-100 text-purple-700' }
                  : ETIQUETAS_TIPO[m.type] || { label: m.type, className: 'bg-[#F4EDE4] text-[#3B2418]' }
                const cantidad = formatearCantidad(m)
                return (
                  <tr key={m.id} className="border-b border-[#E4D9CB] last:border-0">
                    <td className="p-2 whitespace-nowrap text-[#3B2418]/70">{new Date(m.created_at).toLocaleString('es-MX')}</td>
                    <td className="p-2">
                      <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full ${etiqueta.className}`}>
                        {etiqueta.label}
                      </span>
                    </td>
                    <td className={`p-2 font-medium ${cantidad.positivo ? 'text-green-700' : 'text-red-600'}`}>{cantidad.texto}</td>
                    <td className="p-2 text-[#3B2418]/70">{m.warehouses?.name}</td>
                    <td className="p-2 text-[#3B2418]/70">{m.reason || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
