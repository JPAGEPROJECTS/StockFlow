import { useEffect, useState } from 'react'
import { KeyRound, Check, X } from 'lucide-react'
import { getPendingResetRequests, reviewResetRequest } from '../services/passwordResetService'

// Solicitudes de "¿Olvidaste tu contraseña?" pendientes. La tabla solo
// devuelve filas a admin/supervisor activos, así que para el resto de
// roles la lista llega vacía y el panel no se muestra.
export default function SolicitudesPassword() {
  const [solicitudes, setSolicitudes] = useState([])
  const [revisandoId, setRevisandoId] = useState(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    const { data } = await getPendingResetRequests()
    setSolicitudes(data)
  }

  const revisar = async (solicitud, aprobar) => {
    const accion = aprobar ? 'aprobar' : 'rechazar'
    if (!confirm(`¿${aprobar ? 'Aprobar' : 'Rechazar'} el cambio de contraseña de "${solicitud.full_name ?? solicitud.email}"?`)) return
    setRevisandoId(solicitud.id)
    const { error } = await reviewResetRequest(solicitud.id, aprobar)
    setRevisandoId(null)
    if (error) {
      alert(`No se pudo ${accion}: ` + error.message)
    }
    cargar()
  }

  if (solicitudes.length === 0) return null

  return (
    <div className="bg-white border border-[#E4D9CB] rounded-2xl p-4 sm:p-5 mb-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-[#3B2418] text-[#F4EDE4] shrink-0">
          <KeyRound size={16} />
        </span>
        <div>
          <h2 className="text-sm sm:text-base font-bold text-[#1C140F]">Solicitudes de cambio de contraseña</h2>
          <p className="text-xs text-[#3B2418]/60">
            Al aprobar, la persona podrá crear una contraseña nueva desde el dispositivo donde hizo la solicitud (durante 24 h).
          </p>
        </div>
      </div>

      <ul className="divide-y divide-[#E4D9CB]">
        {solicitudes.map(s => (
          <li key={s.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1C140F] truncate">{s.full_name ?? 'Sin nombre'}</p>
              <p className="text-xs text-[#3B2418]/60 truncate">
                {s.email} · {new Date(s.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => revisar(s, true)}
                disabled={revisandoId === s.id}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#3B2418] text-[#F4EDE4] text-xs sm:text-sm font-medium hover:shadow-md transition-all disabled:opacity-50"
              >
                <Check size={14} /> Aprobar
              </button>
              <button
                onClick={() => revisar(s, false)}
                disabled={revisandoId === s.id}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#F4EDE4] text-red-600 text-xs sm:text-sm font-medium hover:shadow-md transition-all disabled:opacity-50"
              >
                <X size={14} /> Rechazar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
