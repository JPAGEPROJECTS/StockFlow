import { useEffect, useState } from 'react'
import { getVentasDiarias, getVentasMensuales, getVentasDetalle } from '../services/reportService'
import { exportToExcel } from '../services/exportService'
import { CalendarDays, CalendarRange, FileDown } from 'lucide-react'

export default function Reportes() {
  const [diarias, setDiarias] = useState([])
  const [mensuales, setMensuales] = useState([])
  const [vista, setVista] = useState('diario')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    const [{ data: d }, { data: m }] = await Promise.all([
      getVentasDiarias(), getVentasMensuales()
    ])
    setDiarias(d || [])
    setMensuales(m || [])
    setCargando(false)
  }

  const datos = vista === 'diario' ? diarias : mensuales

  const exportarResumen = () => {
    const formateado = datos.map(r => ({
      Periodo: vista === 'diario' ? r.dia : r.mes,
      'N° Ventas': r.num_ventas,
      'Unidades vendidas': r.unidades_vendidas,
      Ingresos: r.ingresos,
      Costos: r.costos,
      'Margen ganancia': r.margen_ganancia
    }))
    exportToExcel(formateado, `ventas_${vista}`, 'Resumen')
  }

  const exportarDetalle = async () => {
    const { data, error } = await getVentasDetalle(desde, hasta)
    if (error) return alert('Error: ' + error.message)
    const formateado = data.map(v => ({
      Fecha: new Date(v.created_at).toLocaleString(),
      Cliente: v.customers?.name ?? 'Sin cliente',
      'Método de pago': v.payment_method,
      Total: v.total
    }))
    exportToExcel(formateado, 'ventas_detalle', 'Ventas')
  }

  return (
    <div className="min-h-screen bg-[#F4EDE4]">
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4 text-[#1C140F]">Reportes de Ventas</h1>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setVista('diario')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-medium transition-all hover:shadow-md ${
              vista === 'diario' ? 'bg-[#3B2418] text-[#F4EDE4]' : 'bg-white border border-[#E4D9CB] text-[#3B2418]'
            }`}
          >
            <span className={`flex items-center justify-center w-6 h-6 rounded-full ${
              vista === 'diario' ? 'bg-[#F4EDE4] text-[#3B2418]' : 'bg-[#F4EDE4] text-[#3B2418]'
            }`}>
              <CalendarDays size={13} />
            </span>
            Diario
          </button>
          <button
            onClick={() => setVista('mensual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-medium transition-all hover:shadow-md ${
              vista === 'mensual' ? 'bg-[#3B2418] text-[#F4EDE4]' : 'bg-white border border-[#E4D9CB] text-[#3B2418]'
            }`}
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F4EDE4] text-[#3B2418]">
              <CalendarRange size={13} />
            </span>
            Mensual
          </button>
          <button
            onClick={exportarResumen}
            className="flex items-center gap-2 ml-auto bg-white border border-[#E4D9CB] text-[#3B2418] px-4 py-2 rounded-2xl font-medium hover:shadow-md transition-all"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F4EDE4] text-[#3B2418]">
              <FileDown size={13} />
            </span>
            Exportar {vista}
          </button>
        </div>

        {cargando ? (
          <p className="text-[#3B2418]/50">Cargando...</p>
        ) : datos.length === 0 ? (
          <p className="text-[#3B2418]/50">No hay ventas registradas todavía.</p>
        ) : (
          <table className="w-full border-collapse bg-white border border-[#E4D9CB] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow mb-8">
            <thead>
              <tr className="text-left border-b border-[#E4D9CB] bg-[#F4EDE4] text-[#3B2418]/70">
                <th className="p-3">{vista === 'diario' ? 'Día' : 'Mes'}</th>
                <th className="p-3">N° Ventas</th>
                <th className="p-3">Unidades</th>
                <th className="p-3">Ingresos</th>
                <th className="p-3">Costos</th>
                <th className="p-3">Margen</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((r, i) => (
                <tr key={i} className="border-b border-[#E4D9CB] last:border-0">
                  <td className="p-3 text-[#1C140F]">{new Date(vista === 'diario' ? r.dia : r.mes).toLocaleDateString()}</td>
                  <td className="p-3 text-[#3B2418]">{r.num_ventas}</td>
                  <td className="p-3 text-[#3B2418]">{r.unidades_vendidas}</td>
                  <td className="p-3 text-[#3B2418]">${Number(r.ingresos).toFixed(2)}</td>
                  <td className="p-3 text-[#3B2418]">${Number(r.costos).toFixed(2)}</td>
                  <td className="p-3 font-medium text-green-700">${Number(r.margen_ganancia).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="border-t border-[#E4D9CB] pt-4">
          <h2 className="font-bold mb-2 text-[#1C140F]">Detalle de ventas por rango de fecha</h2>
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-sm text-[#3B2418]/70">Desde</label>
              <input
                type="date"
                value={desde}
                onChange={e => setDesde(e.target.value)}
                className="border border-[#E4D9CB] bg-white p-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30 text-[#3B2418]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#3B2418]/70">Hasta</label>
              <input
                type="date"
                value={hasta}
                onChange={e => setHasta(e.target.value)}
                className="border border-[#E4D9CB] bg-white p-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30 text-[#3B2418]"
              />
            </div>
            <button
              onClick={exportarDetalle}
              className="flex items-center gap-2 bg-[#3B2418] text-[#F4EDE4] px-4 py-2 rounded-2xl font-medium hover:shadow-md transition-all"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F4EDE4] text-[#3B2418]">
                <FileDown size={13} />
              </span>
              Exportar Detalle
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}