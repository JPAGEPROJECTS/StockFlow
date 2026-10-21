import { useEffect, useMemo, useState } from 'react'
import { getArticulosVendidos } from '../services/salesService'
import { getTurnosRecientes } from '../services/shiftService'
import { etiquetaMetodo } from '../lib/metodosPago'
import { MuestraColor } from './ColorCombobox'
import { X, ArrowDownWideNarrow, ArrowUpNarrowWide, Package } from 'lucide-react'

const dinero = (n) => `$${Number(n ?? 0).toFixed(2)}`
const hora = (f) => new Date(f).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
const fechaHora = (f) => new Date(f).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })

const PERIODOS = [
  { value: 'turno', label: 'Por turno' },
  { value: 'dia', label: 'Por día' }
]

// Fecha local en formato YYYY-MM-DD (el valor de un <input type="date">)
const fechaLocal = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Rango [medianoche, medianoche siguiente) del día local elegido, en ISO
const rangoDelDia = (fecha) => {
  const [y, m, d] = fecha.split('-').map(Number)
  return {
    desde: new Date(y, m - 1, d).toISOString(),
    hasta: new Date(y, m - 1, d + 1).toISOString()
  }
}

const etiquetaTurno = (t, i) =>
  `${i === 0 ? 'Último · ' : ''}${t.cajera ?? 'Sin nombre'} · ${fechaHora(t.opened_at)}${t.closed_at ? ` → ${hora(t.closed_at)}` : ' · Abierto'} · ${t.caja ?? 'Caja'}`

export default function VentasDetalleModal({ onClose }) {
  const [periodo, setPeriodo] = useState('turno')
  const [recientesPrimero, setRecientesPrimero] = useState(true)
  const [ventas, setVentas] = useState([])
  const [turnos, setTurnos] = useState([])
  const [turnoId, setTurnoId] = useState('')
  const [fecha, setFecha] = useState(fechaLocal())
  const [cargandoTurnos, setCargandoTurnos] = useState(true)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Turnos de todas las cajeras para el selector; por defecto queda elegido el último
  useEffect(() => {
    let cancelado = false
    const cargarTurnos = async () => {
      try {
        const { data, error: turnosError } = await getTurnosRecientes()
        if (turnosError) throw turnosError
        if (cancelado) return
        setTurnos(data || [])
        setTurnoId(data?.[0]?.shift_id ?? '')
      } catch (err) {
        console.error('[VentasDetalleModal] getTurnosRecientes falló', err)
        if (!cancelado) setError('No se pudieron cargar los turnos.')
      } finally {
        if (!cancelado) setCargandoTurnos(false)
      }
    }
    cargarTurnos()
    return () => { cancelado = true }
  }, [])

  useEffect(() => {
    let cancelado = false

    const cargar = async () => {
      if (periodo === 'turno' && cargandoTurnos) return
      if ((periodo === 'turno' && !turnoId) || (periodo === 'dia' && !fecha)) {
        setVentas([])
        setCargando(false)
        return
      }
      setCargando(true)
      setError('')
      try {
        const filtro = periodo === 'turno' ? { shift_id: turnoId } : rangoDelDia(fecha)
        const { data, error: ventasError } = await getArticulosVendidos(filtro)
        if (ventasError) throw ventasError
        if (!cancelado) setVentas(data || [])
      } catch (err) {
        console.error('[VentasDetalleModal] getArticulosVendidos falló', err)
        if (!cancelado) setError('No se pudieron cargar las ventas.')
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()
    return () => { cancelado = true }
  }, [periodo, turnoId, fecha, cargandoTurnos])

  // Cerrar con Escape
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Un renglón por artículo vendido, con la hora y el método de pago de su venta
  const articulos = useMemo(() => {
    const lista = ventas.flatMap(v =>
      (v.sale_items || []).map(i => ({
        id: i.id,
        created_at: v.created_at,
        payment_method: v.payment_method,
        nombre: i.products?.name ?? 'Producto',
        folio: i.products?.folio,
        color: i.products?.color,
        cantidad: Number(i.quantity),
        precio: Number(i.unit_price),
        subtotal: Number(i.quantity) * Number(i.unit_price)
      }))
    )
    lista.sort((a, b) => {
      const diff = new Date(a.created_at) - new Date(b.created_at)
      return recientesPrimero ? -diff : diff
    })
    return lista
  }, [ventas, recientesPrimero])

  const totalPiezas = articulos.reduce((s, a) => s + a.cantidad, 0)
  const totalVendido = ventas.reduce((s, v) => s + Number(v.total), 0)

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ventas-detalle-titulo"
        onClick={e => e.stopPropagation()}
        className="bg-white border border-[#E4D9CB] p-4 sm:p-6 rounded-t-2xl sm:rounded-2xl w-full sm:w-[640px] max-h-[92vh] sm:max-h-[85vh] flex flex-col"
      >
        {/* Encabezado */}
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="min-w-0">
            <h2 id="ventas-detalle-titulo" className="text-base sm:text-lg font-bold text-[#1C140F]">
              Detalle de ventas
            </h2>
            <p className="text-xs sm:text-sm text-[#3B2418]/60 truncate">
              {periodo === 'dia'
                ? fecha && new Date(rangoDelDia(fecha).desde).toLocaleDateString('es-MX', { dateStyle: 'full' })
                : 'Artículos vendidos en el turno'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F4EDE4] text-[#3B2418] shrink-0"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Controles: periodo + orden */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mb-4">
          <div className="flex bg-[#F4EDE4] rounded-2xl p-1" role="group" aria-label="Periodo">
            {PERIODOS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriodo(p.value)}
                aria-pressed={periodo === p.value}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-2xl text-sm font-medium transition ${
                  periodo === p.value ? 'bg-[#3B2418] text-[#F4EDE4] shadow-sm' : 'text-[#3B2418]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setRecientesPrimero(v => !v)}
            aria-label={recientesPrimero ? 'Ordenar del más viejo al más reciente' : 'Ordenar del más reciente al más viejo'}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl border border-[#E4D9CB] text-sm text-[#3B2418] hover:shadow-md transition"
          >
            {recientesPrimero ? <ArrowDownWideNarrow size={16} /> : <ArrowUpNarrowWide size={16} />}
            {recientesPrimero ? 'Más reciente primero' : 'Más viejo primero'}
          </button>
        </div>

        {/* Selector del turno o del día a consultar */}
        <div className="mb-4">
          {periodo === 'turno' ? (
            <>
              <label htmlFor="ventas-detalle-turno" className="block text-xs text-[#3B2418]/60 mb-1">Turno</label>
              <select
                id="ventas-detalle-turno"
                value={turnoId}
                onChange={e => setTurnoId(e.target.value)}
                disabled={cargandoTurnos || turnos.length === 0}
                className="border border-[#E4D9CB] bg-white px-3 py-2 w-full rounded-2xl text-sm text-[#1C140F] focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30 disabled:opacity-60"
              >
                {cargandoTurnos && <option value="">Cargando turnos...</option>}
                {!cargandoTurnos && turnos.length === 0 && <option value="">Sin turnos registrados</option>}
                {turnos.map((t, i) => (
                  <option key={t.shift_id} value={t.shift_id}>{etiquetaTurno(t, i)}</option>
                ))}
              </select>
            </>
          ) : (
            <>
              <label htmlFor="ventas-detalle-fecha" className="block text-xs text-[#3B2418]/60 mb-1">Día</label>
              <div className="flex gap-2">
                <input
                  id="ventas-detalle-fecha"
                  type="date"
                  value={fecha}
                  max={fechaLocal()}
                  onChange={e => setFecha(e.target.value)}
                  className="border border-[#E4D9CB] bg-white px-3 py-2 flex-1 min-w-0 rounded-2xl text-sm text-[#1C140F] focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30"
                />
                {fecha !== fechaLocal() && (
                  <button
                    onClick={() => setFecha(fechaLocal())}
                    className="px-4 py-2 rounded-2xl border border-[#E4D9CB] text-sm text-[#3B2418] hover:shadow-md transition shrink-0"
                  >
                    Hoy
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Totales */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Resumen etiqueta="Ventas" valor={ventas.length} />
          <Resumen etiqueta="Piezas" valor={totalPiezas} />
          <Resumen etiqueta="Total" valor={dinero(totalVendido)} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 mb-4 text-sm">{error}</div>
        )}

        {/* Lista de artículos */}
        <div className="overflow-auto -mx-1 px-1 flex-1 min-h-0">
          {cargando ? (
            <p className="text-sm text-[#3B2418]/50 py-8 text-center">Cargando ventas...</p>
          ) : articulos.length === 0 ? (
            <p className="text-sm text-[#3B2418]/50 py-8 text-center">
              {periodo === 'turno' && turnos.length === 0 ? 'Aún no hay turnos registrados.' : 'No hay artículos vendidos en este periodo.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {articulos.map(a => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 border border-[#E4D9CB] rounded-2xl p-3 hover:shadow-md transition"
                >
                  <span className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full bg-[#F4EDE4] text-[#3B2418] shrink-0">
                    <Package size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1C140F] truncate flex items-center gap-1.5">
                      {a.color && <MuestraColor nombre={a.color} size={10} />}
                      {a.nombre}
                    </p>
                    <p className="text-xs text-[#3B2418]/60 truncate">
                      {periodo === 'dia' ? hora(a.created_at) : fechaHora(a.created_at)}
                      {a.folio && ` · ${a.folio}`}
                      {` · ${etiquetaMetodo(a.payment_method)}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-[#1C140F]">{dinero(a.subtotal)}</p>
                    <p className="text-xs text-[#3B2418]/60">{a.cantidad} × {dinero(a.precio)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function Resumen({ etiqueta, valor }) {
  return (
    <div className="bg-[#F4EDE4] rounded-2xl p-2 sm:p-3 text-center">
      <p className="text-[11px] sm:text-xs text-[#3B2418]/60">{etiqueta}</p>
      <p className="text-sm sm:text-base font-bold text-[#1C140F] truncate">{valor}</p>
    </div>
  )
}
