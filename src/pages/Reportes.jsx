import { useEffect, useState } from 'react'
import { getVentasDiarias, getVentasMensuales, getVentasDetalle } from '../services/reportService'
import { exportToExcel } from '../services/exportService'

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
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Reportes de Ventas</h1>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setVista('diario')}
          className={`px-4 py-2 rounded ${vista === 'diario' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
          Diario
        </button>
        <button onClick={() => setVista('mensual')}
          className={`px-4 py-2 rounded ${vista === 'mensual' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
          Mensual
        </button>
        <button onClick={exportarResumen} className="ml-auto bg-green-600 text-white px-4 py-2 rounded">
          Exportar {vista}
        </button>
      </div>

      {cargando ? (
        <p className="text-gray-500">Cargando...</p>
      ) : datos.length === 0 ? (
        <p className="text-gray-500">No hay ventas registradas todavía.</p>
      ) : (
        <table className="w-full border-collapse bg-white rounded shadow-sm mb-8">
          <thead>
            <tr className="text-left border-b bg-gray-50">
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
              <tr key={i} className="border-b">
                <td className="p-3">{new Date(vista === 'diario' ? r.dia : r.mes).toLocaleDateString()}</td>
                <td className="p-3">{r.num_ventas}</td>
                <td className="p-3">{r.unidades_vendidas}</td>
                <td className="p-3">${Number(r.ingresos).toFixed(2)}</td>
                <td className="p-3">${Number(r.costos).toFixed(2)}</td>
                <td className="p-3 font-medium text-green-700">${Number(r.margen_ganancia).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="border-t pt-4">
        <h2 className="font-bold mb-2">Detalle de ventas por rango de fecha</h2>
        <div className="flex gap-2 items-end">
          <div>
            <label className="block text-sm">Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm">Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="border p-2 rounded" />
          </div>
          <button onClick={exportarDetalle} className="bg-green-600 text-white px-4 py-2 rounded">
            Exportar Detalle
          </button>
        </div>
      </div>
    </div>
  )
}