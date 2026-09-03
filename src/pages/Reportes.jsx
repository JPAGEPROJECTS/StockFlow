import { useEffect, useState, useMemo } from 'react'
import { getVentasDetalladoFiltrado } from '../services/reportService'
import { getCategories } from '../services/productService'
import { exportToExcel } from '../services/exportService'
import { CalendarDays, CalendarRange, FileDown, Filter, List, LayoutGrid } from 'lucide-react'

export default function Reportes() {
  const [items, setItems] = useState([])
  const [categorias, setCategorias] = useState([])
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [agrupacion, setAgrupacion] = useState('dia') // 'dia' | 'mes'
  const [vista, setVista] = useState('resumen') // 'resumen' | 'detallado'
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getCategories().then(({ data }) => setCategorias(data || []))
    cargar()
  }, [])

  useEffect(() => {
    cargar()
  }, [desde, hasta, categoriaFiltro])

  const cargar = async () => {
    setCargando(true)
    setError('')
    const { data, error } = await getVentasDetalladoFiltrado(desde, hasta, categoriaFiltro || null)
    if (error) {
      setError('No se pudo cargar el reporte: ' + error.message)
      setItems([])
    } else {
      setItems(data || [])
    }
    setCargando(false)
  }

  // Vista resumen: agrupado por día/mes
  const agrupado = useMemo(() => {
    const grupos = new Map()

    items.forEach(item => {
      const fecha = new Date(item.sales.created_at)
      const clave = agrupacion === 'dia'
        ? fecha.toISOString().slice(0, 10)
        : fecha.toISOString().slice(0, 7)

      if (!grupos.has(clave)) {
        grupos.set(clave, { periodo: clave, ventasIds: new Set(), unidades: 0, ingresos: 0, costos: 0 })
      }
      const g = grupos.get(clave)
      g.ventasIds.add(item.sales.id)
      g.unidades += item.quantity
      g.ingresos += item.quantity * item.unit_price
      g.costos += item.quantity * item.unit_cost
    })

    return Array.from(grupos.values())
      .map(g => ({
        periodo: g.periodo,
        numVentas: g.ventasIds.size,
        unidades: g.unidades,
        ingresos: g.ingresos,
        costos: g.costos,
        margen: g.ingresos - g.costos
      }))
      .sort((a, b) => b.periodo.localeCompare(a.periodo))
  }, [items, agrupacion])

  // Vista detallada: una fila por cada producto vendido, sin agrupar
  const detallado = useMemo(() => {
    return items
      .map(item => ({
        fecha: new Date(item.sales.created_at).toLocaleString(),
        fechaOrden: item.sales.created_at,
        cliente: item.sales.customers?.name ?? 'Sin cliente',
        producto: item.products?.name ?? '—',
        sku: item.products?.sku ?? '—',
        categoria: item.products?.categories?.name ?? '—',
        cantidad: item.quantity,
        precioUnitario: item.unit_price,
        subtotal: item.quantity * item.unit_price,
        metodoPago: item.sales.payment_method
      }))
      .sort((a, b) => b.fechaOrden.localeCompare(a.fechaOrden))
  }, [items])

  const totalesResumen = useMemo(() => ({
    unidades: agrupado.reduce((s, r) => s + r.unidades, 0),
    ingresos: agrupado.reduce((s, r) => s + r.ingresos, 0),
    costos: agrupado.reduce((s, r) => s + r.costos, 0),
    margen: agrupado.reduce((s, r) => s + r.margen, 0)
  }), [agrupado])

  const totalDetallado = useMemo(
    () => detallado.reduce((s, r) => s + r.subtotal, 0),
    [detallado]
  )

  const limpiarFiltros = () => {
    setDesde('')
    setHasta('')
    setCategoriaFiltro('')
  }

  const hayFiltrosActivos = desde || hasta || categoriaFiltro

  const exportar = () => {
    const nombreCategoria = categorias.find(c => c.id === categoriaFiltro)?.name || 'todas'

    if (vista === 'resumen') {
      if (agrupado.length === 0) return alert('No hay datos para exportar')

      const filas = agrupado.map(r => ({
        Periodo: r.periodo,
        'N° Ventas': r.numVentas,
        Unidades: r.unidades,
        Ingresos: r.ingresos.toFixed(2),
        Costos: r.costos.toFixed(2),
        Margen: r.margen.toFixed(2)
      }))

      filas.push({
        Periodo: 'TOTAL',
        'N° Ventas': '',
        Unidades: totalesResumen.unidades,
        Ingresos: totalesResumen.ingresos.toFixed(2),
        Costos: totalesResumen.costos.toFixed(2),
        Margen: totalesResumen.margen.toFixed(2)
      })

      exportToExcel(filas, `ventas_resumen_${agrupacion}_${nombreCategoria}`, 'Reporte')
    } else {
      if (detallado.length === 0) return alert('No hay datos para exportar')

      const filas = detallado.map(r => ({
        Fecha: r.fecha,
        Cliente: r.cliente,
        Producto: r.producto,
        SKU: r.sku,
        Categoría: r.categoria,
        Cantidad: r.cantidad,
        'Precio unitario': r.precioUnitario,
        Subtotal: r.subtotal.toFixed(2),
        'Método de pago': r.metodoPago
      }))

      filas.push({
        Fecha: '', Cliente: '', Producto: '', SKU: '', Categoría: '',
        Cantidad: '', 'Precio unitario': 'TOTAL',
        Subtotal: totalDetallado.toFixed(2), 'Método de pago': ''
      })

      exportToExcel(filas, `ventas_detalle_${nombreCategoria}`, 'Detalle')
    }
  }

  return (
    <div className="min-h-screen bg-[#F4EDE4]">
      <div className="p-4 sm:p-6">
        <h1 className="text-lg sm:text-xl font-bold mb-4 text-[#1C140F]">Reportes de Ventas</h1>

        {/* Barra de filtros */}
        <div className="bg-white border border-[#E4D9CB] rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-[#3B2418] font-medium text-sm">
            <Filter size={14} /> Filtros
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-[#3B2418]/70 mb-1">Desde</label>
              <input
                type="date"
                value={desde}
                onChange={e => setDesde(e.target.value)}
                className="border border-[#E4D9CB] bg-white p-2 rounded-2xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30 text-[#3B2418]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#3B2418]/70 mb-1">Hasta</label>
              <input
                type="date"
                value={hasta}
                onChange={e => setHasta(e.target.value)}
                className="border border-[#E4D9CB] bg-white p-2 rounded-2xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30 text-[#3B2418]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#3B2418]/70 mb-1">Categoría</label>
              <select
                value={categoriaFiltro}
                onChange={e => setCategoriaFiltro(e.target.value)}
                className="border border-[#E4D9CB] bg-white p-2 rounded-2xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30 text-[#3B2418]"
              >
                <option value="">Todas</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#3B2418]/70 mb-1">
                {vista === 'resumen' ? 'Agrupar por' : 'Vista'}
              </label>
              {vista === 'resumen' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setAgrupacion('dia')}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-2xl text-sm font-medium transition ${
                      agrupacion === 'dia' ? 'bg-[#3B2418] text-[#F4EDE4]' : 'bg-[#F4EDE4] text-[#3B2418]'
                    }`}
                  >
                    <CalendarDays size={13} /> Día
                  </button>
                  <button
                    onClick={() => setAgrupacion('mes')}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-2xl text-sm font-medium transition ${
                      agrupacion === 'mes' ? 'bg-[#3B2418] text-[#F4EDE4]' : 'bg-[#F4EDE4] text-[#3B2418]'
                    }`}
                  >
                    <CalendarRange size={13} /> Mes
                  </button>
                </div>
              ) : (
                <p className="text-sm text-[#3B2418]/50 px-2 py-2">Todos los productos vendidos</p>
              )}
            </div>
          </div>

          {hayFiltrosActivos && (
            <button onClick={limpiarFiltros} className="text-[#3B2418] text-xs hover:underline mt-3">
              Limpiar filtros
            </button>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl text-sm mb-4">{error}</div>}

        {/* Toggle vista + exportar */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setVista('resumen')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl font-medium text-sm transition-all ${
                vista === 'resumen' ? 'bg-[#3B2418] text-[#F4EDE4]' : 'bg-white border border-[#E4D9CB] text-[#3B2418]'
              }`}
            >
              <LayoutGrid size={14} /> Resumen
            </button>
            <button
              onClick={() => setVista('detallado')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl font-medium text-sm transition-all ${
                vista === 'detallado' ? 'bg-[#3B2418] text-[#F4EDE4]' : 'bg-white border border-[#E4D9CB] text-[#3B2418]'
              }`}
            >
              <List size={14} /> Detallado
            </button>
          </div>

          <button
            onClick={exportar}
            disabled={(vista === 'resumen' ? agrupado.length : detallado.length) === 0}
            className="flex items-center justify-center gap-2 bg-[#3B2418] text-[#F4EDE4] px-4 py-2 rounded-2xl font-medium text-sm hover:shadow-md transition-all disabled:opacity-50"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F4EDE4] text-[#3B2418]">
              <FileDown size={13} />
            </span>
            Exportar
          </button>
        </div>

        {/* Tabla */}
        {cargando ? (
          <p className="text-[#3B2418]/50 text-sm">Cargando...</p>
        ) : vista === 'resumen' ? (
          agrupado.length === 0 ? (
            <p className="text-[#3B2418]/50 text-sm">No hay ventas con estos filtros.</p>
          ) : (
            <div className="overflow-x-auto border border-[#E4D9CB] rounded-2xl bg-white shadow-sm">
              <table className="w-full border-collapse min-w-[640px]">
                <thead>
                  <tr className="text-left border-b border-[#E4D9CB] bg-[#F4EDE4] text-sm text-[#3B2418]/70">
                    <th className="p-3 whitespace-nowrap">{agrupacion === 'dia' ? 'Día' : 'Mes'}</th>
                    <th className="p-3 whitespace-nowrap">N° Ventas</th>
                    <th className="p-3 whitespace-nowrap">Unidades</th>
                    <th className="p-3 whitespace-nowrap">Ingresos</th>
                    <th className="p-3 whitespace-nowrap">Costos</th>
                    <th className="p-3 whitespace-nowrap">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {agrupado.map((r, i) => (
                    <tr key={i} className="border-b border-[#E4D9CB] last:border-0 text-sm">
                      <td className="p-3 text-[#1C140F] whitespace-nowrap">{r.periodo}</td>
                      <td className="p-3 text-[#3B2418]">{r.numVentas}</td>
                      <td className="p-3 text-[#3B2418]">{r.unidades}</td>
                      <td className="p-3 text-[#3B2418] whitespace-nowrap">${r.ingresos.toFixed(2)}</td>
                      <td className="p-3 text-[#3B2418] whitespace-nowrap">${r.costos.toFixed(2)}</td>
                      <td className="p-3 font-medium text-green-700 whitespace-nowrap">${r.margen.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#F4EDE4] font-semibold text-sm">
                    <td className="p-3 text-[#1C140F]">TOTAL</td>
                    <td className="p-3"></td>
                    <td className="p-3 text-[#3B2418]">{totalesResumen.unidades}</td>
                    <td className="p-3 text-[#3B2418]">${totalesResumen.ingresos.toFixed(2)}</td>
                    <td className="p-3 text-[#3B2418]">${totalesResumen.costos.toFixed(2)}</td>
                    <td className="p-3 text-green-700">${totalesResumen.margen.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        ) : detallado.length === 0 ? (
          <p className="text-[#3B2418]/50 text-sm">No hay ventas con estos filtros.</p>
        ) : (
          <div className="overflow-x-auto border border-[#E4D9CB] rounded-2xl bg-white shadow-sm">
            <table className="w-full border-collapse min-w-[820px]">
              <thead>
                <tr className="text-left border-b border-[#E4D9CB] bg-[#F4EDE4] text-sm text-[#3B2418]/70">
                  <th className="p-3 whitespace-nowrap">Fecha</th>
                  <th className="p-3 whitespace-nowrap">Cliente</th>
                  <th className="p-3 whitespace-nowrap">Producto</th>
                  <th className="p-3 whitespace-nowrap">SKU</th>
                  <th className="p-3 whitespace-nowrap">Categoría</th>
                  <th className="p-3 whitespace-nowrap">Cant.</th>
                  <th className="p-3 whitespace-nowrap">P. Unitario</th>
                  <th className="p-3 whitespace-nowrap">Subtotal</th>
                  <th className="p-3 whitespace-nowrap">Pago</th>
                </tr>
              </thead>
              <tbody>
                {detallado.map((r, i) => (
                  <tr key={i} className="border-b border-[#E4D9CB] last:border-0 text-sm">
                    <td className="p-3 text-[#1C140F] whitespace-nowrap">{r.fecha}</td>
                    <td className="p-3 text-[#3B2418] whitespace-nowrap">{r.cliente}</td>
                    <td className="p-3 text-[#3B2418] whitespace-nowrap">{r.producto}</td>
                    <td className="p-3 text-[#3B2418]/60 whitespace-nowrap">{r.sku}</td>
                    <td className="p-3 text-[#3B2418]/60 whitespace-nowrap">{r.categoria}</td>
                    <td className="p-3 text-[#3B2418]">{r.cantidad}</td>
                    <td className="p-3 text-[#3B2418] whitespace-nowrap">${r.precioUnitario.toFixed(2)}</td>
                    <td className="p-3 font-medium text-[#1C140F] whitespace-nowrap">${r.subtotal.toFixed(2)}</td>
                    <td className="p-3 text-[#3B2418]/60 whitespace-nowrap">{r.metodoPago}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F4EDE4] font-semibold text-sm">
                  <td className="p-3 text-[#1C140F]" colSpan={7}>TOTAL</td>
                  <td className="p-3 text-green-700">${totalDetallado.toFixed(2)}</td>
                  <td className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}