import { useEffect, useMemo, useState } from 'react'
import { getHistorialTurnos } from '../services/shiftService'
import { exportToExcel } from '../services/exportService'
import TurnoDetalleModal from './TurnoDetalleModal'
import { FileDown, Eye } from 'lucide-react'

const dinero = (n) => (n === null || n === undefined ? '—' : `$${Number(n).toFixed(2)}`)
const fechaHora = (f) => new Date(f).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })

// Texto y color de la diferencia al cierre: faltante en rojo, sobrante en ámbar
const estadoDiferencia = (t) => {
  if (t.status !== 'cerrado' || t.difference === null) return { texto: '—', className: 'text-[#3B2418]/40' }
  const d = Number(t.difference)
  if (d === 0) return { texto: '$0.00', className: 'text-green-700' }
  return { texto: dinero(d), className: d < 0 ? 'text-red-600 font-semibold' : 'text-amber-700 font-semibold' }
}

// Vista "Turnos" de Reportes: un renglón por turno, con los filtros de fecha y cajera de la página
export default function HistorialTurnos({ desde, hasta, cajeraId, cajeras }) {
  const [turnos, setTurnos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [seleccionado, setSeleccionado] = useState(null)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError('')
    getHistorialTurnos(desde, hasta, cajeraId || null).then(({ data, error }) => {
      if (!vigente) return
      if (error) {
        console.error('[HistorialTurnos] getHistorialTurnos falló', error)
        setError('No se pudo cargar el historial de turnos: ' + error.message)
        setTurnos([])
      } else {
        setTurnos(data || [])
      }
      setCargando(false)
    })
    return () => { vigente = false }
  }, [desde, hasta, cajeraId])

  const totales = useMemo(() => ({
    numVentas: turnos.reduce((s, t) => s + Number(t.num_ventas), 0),
    totalVendido: turnos.reduce((s, t) => s + Number(t.total_vendido), 0),
    diferencia: turnos.reduce((s, t) => s + Number(t.difference ?? 0), 0)
  }), [turnos])

  const exportar = () => {
    const nombreCajera = cajeras.find(p => p.id === cajeraId)?.full_name
    const filas = turnos.map(t => ({
      apertura: fechaHora(t.opened_at),
      cierre: t.closed_at ? fechaHora(t.closed_at) : 'Abierto',
      cajera: t.cajera,
      caja: t.caja,
      montoInicial: Number(t.opening_amount),
      numVentas: Number(t.num_ventas),
      totalVendido: Number(t.total_vendido),
      esperado: t.expected_amount === null ? null : Number(t.expected_amount),
      contado: t.closing_amount === null ? null : Number(t.closing_amount),
      diferencia: t.difference === null ? null : Number(t.difference)
    }))

    exportToExcel(filas, `turnos_${nombreCajera || 'todas'}`, 'Turnos', {
      titulo: 'Historial de turnos',
      info: [
        desde || hasta ? `Periodo: ${desde || 'inicio'} a ${hasta || 'hoy'}` : 'Periodo: todas las fechas',
        `Cajera: ${nombreCajera || 'Todas'}`
      ],
      columnas: [
        { key: 'apertura', header: 'Apertura' },
        { key: 'cierre', header: 'Cierre' },
        { key: 'cajera', header: 'Cajera' },
        { key: 'caja', header: 'Caja' },
        { key: 'montoInicial', header: 'Monto inicial', tipo: 'moneda' },
        { key: 'numVentas', header: 'N° Ventas', tipo: 'entero' },
        { key: 'totalVendido', header: 'Total vendido', tipo: 'moneda' },
        { key: 'esperado', header: 'Esperado', tipo: 'moneda' },
        { key: 'contado', header: 'Contado', tipo: 'moneda' },
        { key: 'diferencia', header: 'Diferencia', tipo: 'moneda' }
      ],
      totales: {
        apertura: 'TOTAL',
        numVentas: totales.numVentas,
        totalVendido: totales.totalVendido,
        diferencia: totales.diferencia
      },
      colorTexto: (fila, key) => key === 'diferencia' && fila.diferencia
        ? (fila.diferencia < 0 ? 'FFB91C1C' : 'FFB45309')
        : undefined
    })
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <button
          onClick={exportar}
          disabled={turnos.length === 0}
          className="flex items-center justify-center gap-2 w-full sm:w-auto bg-[#3B2418] text-[#F4EDE4] px-4 py-2 rounded-2xl font-medium text-sm hover:shadow-md transition-all disabled:opacity-50"
        >
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F4EDE4] text-[#3B2418]">
            <FileDown size={13} />
          </span>
          Exportar
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl text-sm mb-4">{error}</div>}

      {cargando ? (
        <p className="text-[#3B2418]/50 text-sm">Cargando...</p>
      ) : turnos.length === 0 ? (
        !error && <p className="text-[#3B2418]/50 text-sm">No hay turnos con estos filtros.</p>
      ) : (
        <div className="overflow-x-auto border border-[#E4D9CB] rounded-2xl bg-white shadow-sm">
          <table className="w-full border-collapse min-w-[980px]">
            <thead>
              <tr className="text-left border-b border-[#E4D9CB] bg-[#F4EDE4] text-sm text-[#3B2418]/70">
                <th className="p-3 whitespace-nowrap">Apertura</th>
                <th className="p-3 whitespace-nowrap">Cajera</th>
                <th className="p-3 whitespace-nowrap">Caja</th>
                <th className="p-3 whitespace-nowrap">Estado</th>
                <th className="p-3 whitespace-nowrap">Monto inicial</th>
                <th className="p-3 whitespace-nowrap">Ventas</th>
                <th className="p-3 whitespace-nowrap">Esperado</th>
                <th className="p-3 whitespace-nowrap">Contado</th>
                <th className="p-3 whitespace-nowrap">Diferencia</th>
                <th className="p-3 whitespace-nowrap">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {turnos.map(t => {
                const dif = estadoDiferencia(t)
                return (
                  <tr key={t.shift_id} className="border-b border-[#E4D9CB] last:border-0 text-sm hover:bg-[#F4EDE4]/60">
                    <td className="p-3 text-[#1C140F] whitespace-nowrap">{fechaHora(t.opened_at)}</td>
                    <td className="p-3 text-[#3B2418] whitespace-nowrap">{t.cajera}</td>
                    <td className="p-3 text-[#3B2418]/70 whitespace-nowrap">{t.caja}</td>
                    <td className="p-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        t.status === 'cerrado' ? 'bg-[#F4EDE4] text-[#3B2418]' : 'bg-green-100 text-green-700'
                      }`}>
                        {t.status === 'cerrado' ? 'Cerrado' : 'Abierto'}
                      </span>
                    </td>
                    <td className="p-3 text-[#3B2418] whitespace-nowrap">{dinero(t.opening_amount)}</td>
                    <td className="p-3 text-[#3B2418] whitespace-nowrap">
                      {t.num_ventas} · {dinero(t.total_vendido)}
                    </td>
                    <td className="p-3 text-[#3B2418] whitespace-nowrap">{dinero(t.expected_amount)}</td>
                    <td className="p-3 text-[#3B2418] whitespace-nowrap">{dinero(t.closing_amount)}</td>
                    <td className={`p-3 whitespace-nowrap ${dif.className}`}>{dif.texto}</td>
                    <td className="p-3">
                      <button
                        onClick={() => setSeleccionado(t)}
                        title="Ver detalle del turno"
                        aria-label={`Ver detalle del turno de ${t.cajera}`}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F4EDE4] text-[#3B2418] hover:shadow-md transition-all"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#F4EDE4] font-semibold text-sm">
                <td className="p-3 text-[#1C140F]" colSpan={5}>TOTAL ({turnos.length} turnos)</td>
                <td className="p-3 text-[#3B2418] whitespace-nowrap">{totales.numVentas} · {dinero(totales.totalVendido)}</td>
                <td className="p-3" colSpan={2}></td>
                <td className={`p-3 whitespace-nowrap ${totales.diferencia < 0 ? 'text-red-600' : 'text-[#3B2418]'}`}>
                  {dinero(totales.diferencia)}
                </td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {seleccionado && <TurnoDetalleModal turno={seleccionado} onClose={() => setSeleccionado(null)} />}
    </>
  )
}
