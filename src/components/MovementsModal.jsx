import { useEffect, useState } from 'react'
import { getMovements } from '../services/productService'

export default function MovementsModal({ productId, onClose }) {
  const [movimientos, setMovimientos] = useState([])

  useEffect(() => {
    getMovements(productId).then(({ data }) => setMovimientos(data || []))
  }, [productId])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded w-[500px] max-h-[80vh] overflow-auto">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-bold">Movimientos</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <table className="w-full text-sm">
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
                <td className="p-1">{new Date(m.created_at).toLocaleString()}</td>
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
  )
}