import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getCashRegisters, getTurnoActivo, abrirTurno,
  getResumenParaCierre, cerrarTurno, registrarMovimiento, getMovimientos
} from '../services/shiftService'
import { DoorOpen, DoorClosed, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

export default function Turno() {
  const { session } = useAuth()
  const [turno, setTurno] = useState(null)
  const [cajas, setCajas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Apertura
  const [cajaId, setCajaId] = useState('')
  const [montoApertura, setMontoApertura] = useState('')

  // Cierre
  const [resumen, setResumen] = useState(null)
  const [montoCierre, setMontoCierre] = useState('')
  const [notas, setNotas] = useState('')
  const [mostrarCierre, setMostrarCierre] = useState(false)

  // Movimientos
  const [movimientos, setMovimientos] = useState([])
  const [nuevoMovTipo, setNuevoMovTipo] = useState('ingreso')
  const [nuevoMovMonto, setNuevoMovMonto] = useState('')
  const [nuevoMovMotivo, setNuevoMovMotivo] = useState('')

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    setError('')
    const uid = session?.user?.id
    const { data: t } = await getTurnoActivo(uid)
    setTurno(t)
    if (t) {
      const { data: movs } = await getMovimientos(t.id)
      setMovimientos(movs || [])
    }
    const { data: c } = await getCashRegisters()
    setCajas(c || [])
    if (c?.length) setCajaId(c[0].id)
    setCargando(false)
  }

  const handleAbrir = async (e) => {
    e.preventDefault()
    setError('')
    if (!cajaId || montoApertura === '') return setError('Selecciona una caja y monto inicial.')
    const { error } = await abrirTurno({
      cash_register_id: cajaId,
      user_id: session.user.id,
      opening_amount: Number(montoApertura)
    })
    if (error) return setError(error.message)
    cargar()
  }

  const handleAgregarMovimiento = async (e) => {
    e.preventDefault()
    setError('')
    if (!nuevoMovMonto || !nuevoMovMotivo) return setError('Completa monto y motivo del movimiento.')
    const { error } = await registrarMovimiento({
      shift_id: turno.id,
      type: nuevoMovTipo,
      amount: Number(nuevoMovMonto),
      reason: nuevoMovMotivo,
      created_by: session.user.id
    })
    if (error) return setError(error.message)
    setNuevoMovMonto('')
    setNuevoMovMotivo('')
    cargar()
  }

  const abrirResumenCierre = async () => {
    setError('')
    const { data, error } = await getResumenParaCierre(turno.id)
    if (error) return setError(error.message)
    setResumen(data)
    setMontoCierre('')
    setMostrarCierre(true)
  }

  const confirmarCierre = async (e) => {
    e.preventDefault()
    if (montoCierre === '') return setError('Ingresa el monto contado en caja.')
    const { error } = await cerrarTurno({
      shift_id: turno.id,
      closing_amount: Number(montoCierre),
      expected_amount: resumen.expected,
      notes: notas
    })
    if (error) return setError(error.message)
    setMostrarCierre(false)
    setTurno(null)
    cargar()
  }

  if (cargando) return <div className="min-h-screen bg-[#F4EDE4] p-6"><p className="text-[#3B2418]/50 text-sm">Cargando...</p></div>

  return (
    <div className="min-h-screen bg-[#F4EDE4]">
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <h1 className="text-lg sm:text-xl font-bold mb-4 text-[#1C140F]">Turno de caja</h1>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl text-sm mb-4">{error}</div>}

        {!turno ? (
          // ---- Sin turno abierto: formulario de apertura ----
          <form onSubmit={handleAbrir} className="bg-white border border-[#E4D9CB] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-[#3B2418] font-medium">
              <DoorOpen size={18} /> Abrir turno
            </div>
            <div>
              <label className="block text-xs text-[#3B2418]/70 mb-1">Caja</label>
              <select
                value={cajaId}
                onChange={e => setCajaId(e.target.value)}
                className="w-full border border-[#E4D9CB] bg-white p-2.5 rounded-2xl text-sm text-[#3B2418] focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30"
              >
                {cajas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#3B2418]/70 mb-1">Monto inicial en caja</label>
              <input
                type="number" min="0" step="0.01"
                value={montoApertura}
                onChange={e => setMontoApertura(e.target.value)}
                placeholder="0.00"
                className="w-full border border-[#E4D9CB] bg-white p-2.5 rounded-2xl text-sm text-[#1C140F] focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#3B2418] text-[#F4EDE4] py-3 rounded-2xl font-medium hover:shadow-md transition-all"
            >
              Abrir turno
            </button>
          </form>
        ) : (
          // ---- Turno abierto: resumen + movimientos + cierre ----
          <div className="space-y-4">
            <div className="bg-white border border-[#E4D9CB] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 text-[#3B2418] font-medium">
                  <DoorOpen size={16} /> Turno abierto
                </span>
                <span className="text-xs text-[#3B2418]/60">{turno.cash_registers?.name}</span>
              </div>
              <p className="text-sm text-[#3B2418]/70">Monto inicial: <span className="font-semibold text-[#1C140F]">${Number(turno.opening_amount).toFixed(2)}</span></p>
              <p className="text-xs text-[#3B2418]/50 mt-1">Abierto: {new Date(turno.opened_at).toLocaleString()}</p>
            </div>

            {/* Movimientos de efectivo */}
            <div className="bg-white border border-[#E4D9CB] rounded-2xl p-5 shadow-sm">
              <h2 className="font-medium text-[#1C140F] mb-3 text-sm">Movimientos de efectivo</h2>
              <form onSubmit={handleAgregarMovimiento} className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
                <select
                  value={nuevoMovTipo}
                  onChange={e => setNuevoMovTipo(e.target.value)}
                  className="border border-[#E4D9CB] bg-white p-2 rounded-2xl text-sm text-[#3B2418]"
                >
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </select>
                <input
                  type="number" min="0" step="0.01" placeholder="Monto"
                  value={nuevoMovMonto} onChange={e => setNuevoMovMonto(e.target.value)}
                  className="border border-[#E4D9CB] bg-white p-2 rounded-2xl text-sm text-[#1C140F]"
                />
                <input
                  placeholder="Motivo" value={nuevoMovMotivo} onChange={e => setNuevoMovMotivo(e.target.value)}
                  className="border border-[#E4D9CB] bg-white p-2 rounded-2xl text-sm text-[#1C140F] sm:col-span-1"
                />
                <button type="submit" className="bg-[#3B2418] text-[#F4EDE4] rounded-2xl text-sm font-medium hover:shadow-md transition-all">
                  Agregar
                </button>
              </form>

              {movimientos.length === 0 ? (
                <p className="text-xs text-[#3B2418]/40">Sin movimientos registrados.</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-auto">
                  {movimientos.map(m => (
                    <div key={m.id} className="flex items-center justify-between text-sm border-b border-[#E4D9CB] pb-1">
                      <span className="flex items-center gap-1 text-[#3B2418]">
                        {m.type === 'ingreso' ? <ArrowUpCircle size={13} className="text-green-600" /> : <ArrowDownCircle size={13} className="text-red-600" />}
                        {m.reason}
                      </span>
                      <span className={m.type === 'ingreso' ? 'text-green-700' : 'text-red-700'}>
                        {m.type === 'ingreso' ? '+' : '-'}${Number(m.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!mostrarCierre ? (
              <button
                onClick={abrirResumenCierre}
                className="w-full flex items-center justify-center gap-2 bg-white border border-[#E4D9CB] text-[#3B2418] py-3 rounded-2xl font-medium hover:shadow-md transition-all"
              >
                <DoorClosed size={16} /> Cerrar turno
              </button>
            ) : (
              <form onSubmit={confirmarCierre} className="bg-white border border-[#E4D9CB] rounded-2xl p-5 shadow-sm space-y-3">
                <h2 className="font-medium text-[#1C140F] text-sm mb-2">Resumen de cierre</h2>
                <div className="text-sm text-[#3B2418] space-y-1">
                  <p className="flex justify-between"><span>Monto inicial</span><span>${resumen.opening_amount.toFixed(2)}</span></p>
                  <p className="flex justify-between"><span>Ventas en efectivo</span><span>${resumen.ventasEfectivo.toFixed(2)}</span></p>
                  <p className="flex justify-between"><span>Total ventas ({resumen.numVentas})</span><span>${resumen.totalVentas.toFixed(2)}</span></p>
                  <p className="flex justify-between"><span>Ingresos extra</span><span>+${resumen.ingresos.toFixed(2)}</span></p>
                  <p className="flex justify-between"><span>Egresos</span><span>-${resumen.egresos.toFixed(2)}</span></p>
                  <p className="flex justify-between font-semibold border-t border-[#E4D9CB] pt-1"><span>Esperado en caja</span><span>${resumen.expected.toFixed(2)}</span></p>
                </div>

                <div>
                  <label className="block text-xs text-[#3B2418]/70 mb-1">Monto contado en caja</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={montoCierre} onChange={e => setMontoCierre(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-[#E4D9CB] bg-white p-2.5 rounded-2xl text-sm text-[#1C140F]"
                  />
                </div>

                {montoCierre !== '' && (
                  <p className={`text-sm font-medium ${Number(montoCierre) - resumen.expected === 0 ? 'text-green-700' : 'text-red-600'}`}>
                    Diferencia: ${(Number(montoCierre) - resumen.expected).toFixed(2)}
                  </p>
                )}

                <textarea
                  placeholder="Notas (opcional)"
                  value={notas} onChange={e => setNotas(e.target.value)}
                  className="w-full border border-[#E4D9CB] bg-white p-2.5 rounded-2xl text-sm text-[#1C140F]"
                  rows={2}
                />

                <div className="flex gap-2">
                  <button type="button" onClick={() => setMostrarCierre(false)} className="flex-1 py-2.5 text-sm text-[#3B2418]/60">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 bg-[#3B2418] text-[#F4EDE4] py-2.5 rounded-2xl font-medium text-sm hover:shadow-md transition-all">
                    Confirmar cierre
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}