import { useEffect, useState } from 'react'
import { getMovements } from '../services/productService'

export default function MovementsModal({ productId, onClose }) {
  const [movimientos, setMovimientos] = useState([])

  useEffect(() => {
    getMovements(productId).then(({ data }) => setMovimientos(data || []))
  }, [productId])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white p-5 sm:p-6 rounded-t-2xl sm:rounded w-full sm:w-[500px] max-h-[92vh] sm:max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base sm:text-lg font-bold">Movimientos</h2>
          <button onClick={onClose} className="text-lg px-2 -mr-2">✕</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm min-w-[480px]">
            <thead>
              <tr className="text-left border-b">
                <th className="p-1">Fecha</th>
                <th className="p-1">Tipo</th>
                <th className="p-1">Cantidad</th>
                <th className="p-1">Almacén</th>
                <th className="p-1">Nota</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map(m => (
                <tr key={m.id} className="border-b">
                  <td className="p-1 whitespace-nowrap">{new Date(m.created_at).toLocaleString()}</td>
                  <td className="p-1">{m.movement_type}</td>
                  <td className="p-1">{m.quantity}</td>
                  <td className="p-1">{m.warehouses?.name}</td>
                  <td className="p-1">{m.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}