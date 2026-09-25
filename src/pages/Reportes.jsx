import { useEffect, useState, useMemo } from 'react'
import { getVentasDetalladoFiltrado } from '../services/reportService'
import { getCategories } from '../services/productService'
import { getUsers } from '../services/userService'
import { exportToExcel } from '../services/exportService'
import { CalendarDays, CalendarRange, FileDown, Filter, List, LayoutGrid } from 'lucide-react'

const METODOS_PAGO = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' }

export default function Reportes() {
  const [items, setItems] = useState([])
  const [categorias, setCategorias] = useState([])
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [cajeras, setCajeras] = useState([])
  const [cajeraFiltro, setCajeraFiltro] = useState('')
  const [agrupacion, setAgrupacion] = useState('dia') // 'dia' | 'mes'
  const [vista, setVista] = useState('resumen') // 'resumen' | 'detallado'
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getCategories().then(({ data }) => setCategorias(data || []))
    // Incluye inactivas: pueden tener ventas históricas en el rango
    getUsers().then(({ data }) => setCajeras(data || []))
    cargar()
  }, [])

  useEffect(() => {
    cargar()
  }, [desde, hasta, categoriaFiltro, cajeraFiltro])

  const cargar = async () => {
    setCargando(true)
    setError('')
    const { data, error } = await getVentasDetalladoFiltrado(desde, hasta, categoriaFiltro || null, cajeraFiltro || null)
    if (error) {
      setError('No se pudo cargar el reporte: ' + error.message)
      setItems([])
    } else {
      setItems(data || [])
    }
    setCargando(false)
  }

  // Vista resumen: agrupado por día/mes y cajera (una fila por cada
  // combinación). La clave usa user_id y no el nombre, que puede repetirse.
  const agrupado = useMemo(() => {
    const grupos = new Map()

    items.forEach(item => {
      const fecha = new Date(item.sales.created_at)
      const periodo = agrupacion === 'dia'
        ? fecha.toISOString().slice(0, 10)
        : fecha.toISOString().slice(0, 7)
      const clave = `${periodo}|${item.sales.user_id ?? ''}`

      if (!grupos.has(clave)) {
        grupos.set(clave, {
          periodo,
          cajera: item.sales.profiles?.full_name ?? '—',
          ventasIds: new Set(), unidades: 0, ingresos: 0, costos: 0
        })
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
        cajera: g.cajera,
        numVentas: g.ventasIds.size,
        unidades: g.unidades,
        ingresos: g.ingresos,
        costos: g.costos,
        margen: g.ingresos - g.costos
      }))
      .sort((a, b) => b.periodo.localeCompare(a.periodo) || a.cajera.localeCompare(b.cajera))
  }, [items, agrupacion])

  // Vista detallada: una fila por cada producto vendido, agrupada por venta.
  // No hay folio de venta en la base de datos, así que se asigna un número
  // secuencial por orden cronológico (Venta 1 = la más antigua del rango
  // filtrado) y se ordena por ese número, para que todos los productos de
  // una misma venta queden juntos en vez de mezclados por fecha exacta.
  const detallado = useMemo(() => {
    const idsPorFecha = [...items]
      .sort((a, b) => a.sales.created_at.localeCompare(b.sales.created_at))
      .map(item => item.sales.id)
    const numeroPorVenta = new Map(Array.from(new Set(idsPorFecha)).map((id, i) => [id, i + 1]))

    return items
      .map(item => ({
        numeroVenta: numeroPorVenta.get(item.sales.id),
        fecha: new Date(item.sales.created_at).toLocaleString(),
        cajera: item.sales.profiles?.full_name ?? '—',
        cliente: item.sales.customers?.name ?? 'Sin cliente',
        producto: item.products?.name ?? '—',
        sku: item.products?.sku ?? '—',
        categoria: item.products?.categories?.name ?? '—',
        cantidad: item.quantity,
        precioUnitario: item.unit_price,
        subtotal: item.quantity * item.unit_price,
        metodoPago: item.sales.payment_method,
        nota: item.sales.note ?? '' // motivo del cambio de total, si lo hubo
      }))
      .sort((a, b) => a.numeroVenta - b.numeroVenta)
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
    setCajeraFiltro('')
  }

  const hayFiltrosActivos = desde || hasta || categoriaFiltro || cajeraFiltro

  const exportar = () => {
    const nombreCategoria = categorias.find(c => c.id === categoriaFiltro)?.name || 'todas'
    const nombreCajera = cajeras.find(p => p.id === cajeraFiltro)?.full_name
    const sufijo = nombreCajera ? `${nombreCategoria}_${nombreCajera}` : nombreCategoria

    // Filtros aplicados, impresos bajo el título del Excel
    const rango = desde || hasta
      ? `Periodo: ${desde || 'inicio'} a ${hasta || 'hoy'}`
      : 'Periodo: todas las fechas'
    const info = [
      rango,
      `Categoría: ${categoriaFiltro ? nombreCategoria : 'Todas'}`,
      `Cajera: ${nombreCajera || 'Todas'}`
    ]

    if (vista === 'resumen') {
      if (agrupado.length === 0) return alert('No hay datos para exportar')

      exportToExcel(agrupado, `ventas_resumen_${agrupacion}_${sufijo}`, 'Resumen', {
        titulo: `Reporte de ventas — Resumen por ${agrupacion === 'dia' ? 'día' : 'mes'}`,
        info,
        columnas: [
          { key: 'periodo', header: agrupacion === 'dia' ? 'Día' : 'Mes' },
          { key: 'cajera', header: 'Cajera' },
          { key: 'numVentas', header: 'N° Ventas', tipo: 'entero' },
          { key: 'unidades', header: 'Unidades', tipo: 'entero' },
          { key: 'ingresos', header: 'Ingresos', tipo: 'moneda' },
          { key: 'costos', header: 'Costos', tipo: 'moneda' },
          { key: 'margen', header: 'Margen', tipo: 'moneda' }
        ],
        totales: {
          periodo: 'TOTAL',
          numVentas: agrupado.reduce((s, r) => s + r.numVentas, 0),
          ...totalesResumen
        },
        colorTexto: (fila, key) => key === 'margen' ? (fila.margen < 0 ? 'FFB91C1C' : 'FF15803D') : undefined
      })
    } else {
      if (detallado.length === 0) return alert('No hay datos para exportar')

      // El N° de venta y la nota se muestran solo en la primera fila de cada venta,
      // igual que en la tabla; numeroVenta se conserva para agrupar.
      const filas = detallado.map((r, i) => {
        const nuevaVenta = i === 0 || detallado[i - 1].numeroVenta !== r.numeroVenta
        return {
          ...r,
          venta: nuevaVenta ? `#${r.numeroVenta}` : '',
          nota: nuevaVenta ? r.nota : '',
          metodoPago: METODOS_PAGO[r.metodoPago] ?? r.metodoPago
        }
      })

      exportToExcel(filas, `ventas_detalle_${sufijo}`, 'Detalle', {
        titulo: 'Reporte de ventas — Detalle',
        info,
        agruparPor: 'numeroVenta',
        columnas: [
          { key: 'venta', header: 'N° Venta', ancho: 10 },
          { key: 'fecha', header: 'Fecha' },
          { key: 'cajera', header: 'Cajera' },
          { key: 'cliente', header: 'Cliente' },
          { key: 'producto', header: 'Producto' },
          { key: 'sku', header: 'SKU' },
          { key: 'categoria', header: 'Categoría' },
          { key: 'cantidad', header: 'Cantidad', tipo: 'entero' },
          { key: 'precioUnitario', header: 'Precio unitario', tipo: 'moneda' },
          { key: 'subtotal', header: 'Subtotal', tipo: 'moneda' },
          { key: 'metodoPago', header: 'Método de pago' },
          { key: 'nota', header: 'Nota', ancho: 40 }
        ],
        totales: {
          venta: 'TOTAL',
          cantidad: detallado.reduce((s, r) => s + r.cantidad, 0),
          subtotal: totalDetallado
        }
      })
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
              <label className="block text-xs text-[#3B2418]/70 mb-1">Cajera</label>
              <select
                value={cajeraFiltro}
                onChange={e => setCajeraFiltro(e.target.value)}
                className="border border-[#E4D9CB] bg-white p-2 rounded-2xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30 text-[#3B2418]"
              >
                <option value="">Todas</option>
                {cajeras.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
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
              <table className="w-full border-collapse min-w-[760px]">
                <thead>
                  <tr className="text-left border-b border-[#E4D9CB] bg-[#F4EDE4] text-sm text-[#3B2418]/70">
                    <th className="p-3 whitespace-nowrap">{agrupacion === 'dia' ? 'Día' : 'Mes'}</th>
                    <th className="p-3 whitespace-nowrap">Cajera</th>
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
                      <td className="p-3 text-[#3B2418] whitespace-nowrap">{r.cajera}</td>
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
            <table className="w-full border-collapse min-w-[1160px]">
              <thead>
                <tr className="text-left border-b border-[#E4D9CB] bg-[#F4EDE4] text-sm text-[#3B2418]/70">
                  <th className="p-3 whitespace-nowrap">N° Venta</th>
                  <th className="p-3 whitespace-nowrap">Fecha</th>
                  <th className="p-3 whitespace-nowrap">Cajera</th>
                  <th className="p-3 whitespace-nowrap">Cliente</th>
                  <th className="p-3 whitespace-nowrap">Producto</th>
                  <th className="p-3 whitespace-nowrap">SKU</th>
                  <th className="p-3 whitespace-nowrap">Categoría</th>
                  <th className="p-3 whitespace-nowrap">Cant.</th>
                  <th className="p-3 whitespace-nowrap">P. Unitario</th>
                  <th className="p-3 whitespace-nowrap">Subtotal</th>
                  <th className="p-3 whitespace-nowrap">Pago</th>
                  <th className="p-3 whitespace-nowrap">Nota</th>
                </tr>
              </thead>
              <tbody>
                {detallado.map((r, i) => {
                  const nuevaVenta = i === 0 || detallado[i - 1].numeroVenta !== r.numeroVenta
                  return (
                    <tr
                      key={i}
                      className={`border-b border-[#E4D9CB] last:border-0 text-sm ${nuevaVenta ? 'border-t-2 border-t-[#3B2418]/20' : ''}`}
                    >
                      <td className="p-3 text-[#3B2418]/70 whitespace-nowrap">
                        {nuevaVenta ? `#${r.numeroVenta}` : ''}
                      </td>
                      <td className="p-3 text-[#1C140F] whitespace-nowrap">{r.fecha}</td>
                      <td className="p-3 text-[#3B2418] whitespace-nowrap">{r.cajera}</td>
                      <td className="p-3 text-[#3B2418] whitespace-nowrap">{r.cliente}</td>
                      <td className="p-3 text-[#3B2418] whitespace-nowrap">{r.producto}</td>
                      <td className="p-3 text-[#3B2418]/60 whitespace-nowrap">{r.sku}</td>
                      <td className="p-3 text-[#3B2418]/60 whitespace-nowrap">{r.categoria}</td>
                      <td className="p-3 text-[#3B2418]">{r.cantidad}</td>
                      <td className="p-3 text-[#3B2418] whitespace-nowrap">${r.precioUnitario.toFixed(2)}</td>
                      <td className="p-3 font-medium text-[#1C140F] whitespace-nowrap">${r.subtotal.toFixed(2)}</td>
                      <td className="p-3 text-[#3B2418]/60 whitespace-nowrap">{r.metodoPago}</td>
                      <td className="p-3 text-xs text-[#3B2418]/80 min-w-[180px] max-w-xs">
                        {nuevaVenta && r.nota}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#F4EDE4] font-semibold text-sm">
                  <td className="p-3 text-[#1C140F]" colSpan={9}>TOTAL</td>
                  <td className="p-3 text-green-700">${totalDetallado.toFixed(2)}</td>
                  <td className="p-3" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}