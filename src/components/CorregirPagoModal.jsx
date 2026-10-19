import { useState } from 'react'
import { corregirMetodoPago } from '../services/salesService'
import { METODOS_PAGO, etiquetaMetodo } from '../lib/metodosPago'
import { CreditCard, X } from 'lucide-react'


// `venta`: { id, payment_method, total, descripcion }. onGuardado se llama
// tras corregir, para que quien abrió el modal recargue sus datos.
export default function CorregirPagoModal({ venta, onClose, onGuardado }) {
  const [metodo, setMetodo] = useState(
    Object.keys(METODOS_PAGO).find(m => m !== venta.payment_method)
  )
  const esMixta = venta.payment_method === 'mixed'
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (e) => {
    e.preventDefault()
    if (!motivo.trim()) return setError('Escribe el motivo de la corrección.')
    setGuardando(true)
    setError('')
    const { error } = await corregirMetodoPago({ sale_id: venta.id, nuevo_metodo: metodo, motivo })
    setGuardando(false)
    if (error) return setError(error.message)
    onGuardado?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
      <form
        onSubmit={guardar}
        className="bg-white border border-[#E4D9CB] p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl w-full sm:w-96 space-y-3 max-h-[92vh] sm:max-h-[90vh] overflow-auto"
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#3B2418] text-[#F4EDE4] shrink-0">
              <CreditCard size={15} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-[#1C140F]">Corregir método de pago</h2>
              <p className="text-xs text-[#3B2418]/60 truncate">
                {venta.descripcion} · ${Number(venta.total).toFixed(2)}
              </p>
            </div>
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
          <div className="bg-red-100 text-red-700 text-sm p-2 rounded-2xl border border-red-300">{error}</div>
        )}

        <div>
          <p className="block text-xs text-[#3B2418]/70 mb-1">Registrado como</p>
          <p className="text-sm font-medium text-[#3B2418] px-1">{etiquetaMetodo(venta.payment_method)}</p>
        </div>

        {esMixta ? (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl p-2">
            Esta venta se cobró con varios métodos. Por ahora sus pagos no se pueden corregir desde aquí.
          </p>
        ) : (<>
        <div>
          <label className="block text-xs text-[#3B2418]/70 mb-1">Método correcto</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(METODOS_PAGO)
              .filter(([valor]) => valor !== venta.payment_method)
              .map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setMetodo(valor)}
                  className={`px-3 py-2.5 rounded-2xl text-sm font-medium transition ${
                    metodo === valor ? 'bg-[#3B2418] text-[#F4EDE4]' : 'bg-[#F4EDE4] text-[#3B2418]'
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-[#3B2418]/70 mb-1">Motivo</label>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            rows={2}
            placeholder="Ej. El cliente pagó en efectivo, se presionó Tarjeta por error"
            className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30 text-[#3B2418]"
          />
        </div>

        {(metodo === 'cash' || venta.payment_method === 'cash') && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl p-2">
            Esto cambia el efectivo esperado del turno. Si el turno ya está cerrado, se recalculan el esperado y la diferencia.
          </p>
        )}
        </>)}

        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm sm:text-base text-[#3B2418]/70 hover:text-[#1C140F] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando || esMixta}
            className="bg-[#3B2418] text-[#F4EDE4] px-4 py-2 rounded-2xl text-sm sm:text-base font-medium hover:shadow-md transition-all disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar corrección'}
          </button>
        </div>
      </form>
    </div>
  )
}
