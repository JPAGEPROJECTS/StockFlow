import { useEffect, useState } from 'react'
import { getDetalleTurno } from '../services/shiftService'
import { X, ArrowUpCircle, ArrowDownCircle, Receipt, Wallet, StickyNote } from 'lucide-react'

const METODOS_PAGO = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' }

const dinero = (n) => `$${Number(n ?? 0).toFixed(2)}`
const fechaHora = (f) => new Date(f).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
const hora = (f) => new Date(f).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

// "Pulsera de hilo" o "Pulsera de hilo +2 más" según cuántos productos distintos lleve la venta
const resumenProductos = (venta) => {
  const nombres = Array.from(new Set((venta.sale_items || []).map(i => i.products?.name).filter(Boolean)))
  if (nombres.length === 0) return 'Venta'
  return nombres.length === 1 ? nombres[0] : `${nombres[0]} +${nombres.length - 1} más`
}

// `turno` es una fila de v_turnos_resumen (cajera, caja, montos del cierre, fechas)
export default function TurnoDetalleModal({ turno, onClose }) {
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setCargando(true)
    setError(null)
    getDetalleTurno(turno.shift_id).then(({ data, error }) => {
      if (error) {
        console.error('[TurnoDetalleModal] getDetalleTurno falló', error)
        setError('No se pudo cargar el detalle del turno.')
      } else {
        setDetalle(data)
      }
      setCargando(false)
    })
  }, [turno.shift_id])

  const cerrado = turno.status === 'cerrado'
  // Para un turno cerrado se muestra lo que quedó guardado al cerrarlo; para uno abierto, el cálculo al momento
  const esperado = cerrado && turno.expected_amount !== null ? Number(turno.expected_amount) : detalle?.resumen?.expected
  const diferencia = Number(turno.difference ?? 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white border border-[#E4D9CB] p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl w-full sm:w-[640px] max-h-[92vh] sm:max-h-[85vh] overflow-auto">
        {/* Encabezado */}
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-[#1C140F] truncate">Turno de {turno.cajera}</h2>
            <p className="text-xs sm:text-sm text-[#3B2418]/60">
              {turno.caja} · {fechaHora(turno.opened_at)}
              {turno.closed_at && ` → ${hora(turno.closed_at)}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              cerrado ? 'bg-[#F4EDE4] text-[#3B2418]' : 'bg-green-100 text-green-700'
            }`}>
              {cerrado ? 'Cerrado' : 'Abierto'}
            </span>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F4EDE4] text-[#3B2418]"
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 mb-4 text-sm">{error}</div>
        )}

        {cargando ? (
          <p className="text-sm text-[#3B2418]/50 py-8 text-center">Cargando detalle...</p>
        ) : detalle && (
          <div className="space-y-4">
            {/* Resumen del cierre */}
            <Seccion titulo="Resumen de caja" icono={Wallet}>
              <div className="text-sm text-[#3B2418] space-y-1">
                <Fila etiqueta="Monto inicial" valor={dinero(detalle.resumen.opening_amount)} />
                <Fila etiqueta="Ventas en efectivo" valor={`+${dinero(detalle.resumen.ventasEfectivo)}`} />
                <Fila etiqueta="Ingresos extra" valor={`+${dinero(detalle.resumen.ingresos)}`} />
                <Fila etiqueta="Egresos" valor={`-${dinero(detalle.resumen.egresos)}`} />
                <Fila etiqueta="Esperado en caja" valor={dinero(esperado)} fuerte borde />
                <Fila etiqueta="Contado al cierre" valor={cerrado ? dinero(turno.closing_amount) : 'Turno abierto'} />
                {cerrado && (
                  <p className={`flex justify-between font-semibold ${
                    diferencia === 0 ? 'text-green-700' : diferencia < 0 ? 'text-red-600' : 'text-amber-700'
                  }`}>
                    <span>{diferencia === 0 ? 'Cuadró exacto' : diferencia < 0 ? 'Faltante' : 'Sobrante'}</span>
                    <span>{dinero(diferencia)}</span>
                  </p>
                )}
                <p className="flex justify-between text-xs text-[#3B2418]/60 pt-2">
                  <span>Total vendido (todos los métodos) · {detalle.resumen.numVentas} ventas</span>
                  <span>{dinero(detalle.resumen.totalVentas)}</span>
                </p>
              </div>
            </Seccion>

            {detalle.notas && (
              <Seccion titulo="Notas del cierre" icono={StickyNote}>
                <p className="text-sm text-[#3B2418] whitespace-pre-wrap">{detalle.notas}</p>
              </Seccion>
            )}

            {/* Movimientos de caja */}
            <Seccion titulo={`Movimientos de efectivo (${detalle.movimientos.length})`} icono={ArrowUpCircle}>
              {detalle.movimientos.length === 0 ? (
                <p className="text-xs text-[#3B2418]/40">Sin movimientos registrados.</p>
              ) : (
                <ul className="divide-y divide-[#E4D9CB]">
                  {detalle.movimientos.map(m => (
                    <li key={m.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span className="flex items-center gap-2 min-w-0 text-[#3B2418]">
                        {m.type === 'ingreso'
                          ? <ArrowUpCircle size={14} className="text-green-600 shrink-0" />
                          : <ArrowDownCircle size={14} className="text-red-600 shrink-0" />}
                        <span className="truncate">{m.reason}</span>
                        <span className="text-xs text-[#3B2418]/50 shrink-0">{hora(m.created_at)}</span>
                      </span>
                      <span className={`shrink-0 font-medium ${m.type === 'ingreso' ? 'text-green-700' : 'text-red-700'}`}>
                        {m.type === 'ingreso' ? '+' : '-'}{dinero(m.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Seccion>

            {/* Ventas del turno */}
            <Seccion titulo={`Ventas del turno (${detalle.ventas.length})`} icono={Receipt}>
              {detalle.ventas.length === 0 ? (
                <p className="text-xs text-[#3B2418]/40">No se registraron ventas en este turno.</p>
              ) : (
                <ul className="divide-y divide-[#E4D9CB]">
                  {detalle.ventas.map(v => {
                    const cancelada = v.status !== 'completed'
                    return (
                      <li key={v.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                        <div className="min-w-0">
                          <p className={`truncate ${cancelada ? 'text-[#3B2418]/40 line-through' : 'text-[#1C140F]'}`}>
                            {resumenProductos(v)}
                          </p>
                          <p className="text-xs text-[#3B2418]/50">
                            {hora(v.created_at)} · {METODOS_PAGO[v.payment_method] ?? v.payment_method}
                            {cancelada && ' · Cancelada'}
                          </p>
                        </div>
                        <span className={`shrink-0 font-medium ${cancelada ? 'text-[#3B2418]/40 line-through' : 'text-[#1C140F]'}`}>
                          {dinero(v.total)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Seccion>
          </div>
        )}
      </div>
    </div>
  )
}

function Seccion({ titulo, icono: Icono, children }) {
  return (
    <section className="border border-[#E4D9CB] rounded-2xl p-4">
      <h3 className="flex items-center gap-2 font-medium text-sm text-[#1C140F] mb-3">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F4EDE4] text-[#3B2418] shrink-0">
          <Icono size={13} />
        </span>
        {titulo}
      </h3>
      {children}
    </section>
  )
}

function Fila({ etiqueta, valor, fuerte, borde }) {
  return (
    <p className={`flex justify-between gap-2 ${fuerte ? 'font-semibold text-[#1C140F]' : ''} ${borde ? 'border-t border-[#E4D9CB] pt-1' : ''}`}>
      <span>{etiqueta}</span>
      <span>{valor}</span>
    </p>
  )
}
