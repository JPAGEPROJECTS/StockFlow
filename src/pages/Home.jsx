import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart, PackagePlus, Wallet, BarChart3, RefreshCw, Gem, CalendarRange,
  TrendingUp, TrendingDown, Receipt, PackageX, AlertTriangle,
  Trophy, CreditCard, Clock, ArrowRight, CircleCheck, CircleAlert
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { getProducts } from '../services/productService'
import { getTurnoActivo } from '../services/shiftService'
import { getPerfil, getVentasDesde, getItemsVendidosDesde, claveDia, inicioHaceDias } from '../services/dashboardService'
import { resumenStockPorProducto } from '../lib/stock'
import { MuestraColor } from '../components/ColorCombobox'

// El inicio no muestra montos de dinero (puede verlo un cliente o cualquier empleado):
// todo se expresa en número de ventas y piezas. Los importes quedan en Reportes.

const METODOS_PAGO = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' }
const DIAS_GRAFICA = 14
const DIAS_RANKING = 30

// Tope "redondo" y par del eje Y (ej. 7 → 8, 13 → 20) para que la línea guía
// de la mitad también caiga en un número entero de ventas
const escalaBonita = (max) => {
  if (max <= 0) return 4
  const magnitud = 10 ** Math.floor(Math.log10(max))
  const paso = [2, 4, 6, 8, 10].find(m => m * magnitud >= max)
  return Math.max(paso * magnitud, 2)
}

const saludo = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

const piezasDe = (venta) => (venta.sale_items || []).reduce((s, i) => s + i.quantity, 0)
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

// "Pulsera de hilo azul" o "Pulsera de hilo azul +2 más" según cuántos productos distintos lleve la venta
const resumenProductos = (venta) => {
  const nombres = (venta.sale_items || []).map(i => i.products?.name).filter(Boolean)
  const distintos = Array.from(new Set(nombres))
  if (distintos.length === 0) return 'Venta'
  return distintos.length === 1 ? distintos[0] : `${distintos[0]} +${distintos.length - 1} más`
}

export default function Home() {
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState('')
  const [turno, setTurno] = useState({ data: null, error: null })
  const [ventas, setVentas] = useState({ data: [], error: null })
  const [items, setItems] = useState({ data: [], error: null })
  const [stock, setStock] = useState({ data: [], error: null })

  const cargar = useCallback(async () => {
    setCargando(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Cada bloque maneja su propio error: si falla uno, el resto del tablero se sigue viendo
    const [perfil, turnoRes, ventasRes, itemsRes, stockRes] = await Promise.all([
      user ? getPerfil(user.id) : Promise.resolve({ data: null }),
      user ? getTurnoActivo(user.id) : Promise.resolve({ data: null, error: null }),
      getVentasDesde(inicioHaceDias(Math.max(DIAS_RANKING, DIAS_GRAFICA))),
      getItemsVendidosDesde(inicioHaceDias(DIAS_RANKING)),
      getProducts()
    ])

    setNombre(perfil.data?.full_name?.split(' ')[0] || '')
    setTurno({ data: turnoRes.data, error: turnoRes.error })
    setVentas({ data: ventasRes.data || [], error: ventasRes.error })
    setItems({ data: itemsRes.data || [], error: itemsRes.error })
    setStock({ data: stockRes.data || [], error: stockRes.error })
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // --- Indicadores del día y de la semana ---
  const kpis = useMemo(() => {
    const porDia = new Map()
    ventas.data.forEach(v => {
      const k = claveDia(v.created_at)
      const d = porDia.get(k) ?? { num: 0, piezas: 0 }
      d.num += 1
      d.piezas += piezasDe(v)
      porDia.set(k, d)
    })

    const diaHace = (n) => { const f = new Date(); f.setDate(f.getDate() - n); return f }
    const delDia = (n) => porDia.get(claveDia(diaHace(n))) ?? { num: 0, piezas: 0 }

    // Suma de los días [desde, hasta) contando hacia atrás desde hoy
    const sumarDias = (desde, hasta) => {
      const total = { num: 0, piezas: 0 }
      for (let i = desde; i < hasta; i++) {
        const d = delDia(i)
        total.num += d.num
        total.piezas += d.piezas
      }
      return total
    }

    const serie = Array.from({ length: DIAS_GRAFICA }, (_, idx) => {
      const n = DIAS_GRAFICA - 1 - idx
      return { clave: claveDia(diaHace(n)), fecha: diaHace(n), esHoy: n === 0, ...delDia(n) }
    })

    const metodos = new Map()
    ventas.data.forEach(v => metodos.set(v.payment_method, (metodos.get(v.payment_method) ?? 0) + 1))

    return {
      hoy: delDia(0),
      ayer: delDia(1),
      semana: sumarDias(0, 7),
      semanaAnterior: sumarDias(7, 14),
      serie,
      metodos: Array.from(metodos, ([metodo, num]) => ({
        metodo, num, porcentaje: ventas.data.length ? (num / ventas.data.length) * 100 : 0
      })).sort((a, b) => b.num - a.num),
      ultimas: ventas.data.slice(0, 6)
    }
  }, [ventas.data])

  // --- Más vendidos (por piezas) ---
  const topProductos = useMemo(() => {
    const porProducto = new Map()
    items.data.forEach(i => {
      const p = porProducto.get(i.product_id) ?? {
        nombre: i.products?.name ?? '—', sku: i.products?.sku, color: i.products?.color, piezas: 0
      }
      p.piezas += i.quantity
      porProducto.set(i.product_id, p)
    })
    return Array.from(porProducto.values()).sort((a, b) => b.piezas - a.piezas).slice(0, 5)
  }, [items.data])

  // --- Alertas de inventario (por producto, sumando almacenes) ---
  const alertas = useMemo(() => {
    const resumen = Array.from(resumenStockPorProducto(stock.data).values())
    const agotados = resumen.filter(r => r.estado === 'agotado')
    const bajos = resumen.filter(r => r.estado === 'bajo').sort((a, b) => a.stock - b.stock)
    return { agotados, bajos, lista: [...agotados, ...bajos].slice(0, 6) }
  }, [stock.data])

  const fechaLarga = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-[#F4EDE4]">
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">

        {/* Encabezado */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs sm:text-sm text-[#8A7160] capitalize">{fechaLarga}</p>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1C140F]">
              {saludo()}{nombre && `, ${nombre}`}
            </h1>
          </div>
          <button
            onClick={cargar}
            disabled={cargando}
            aria-label="Actualizar datos"
            title="Actualizar datos"
            className="flex items-center justify-center w-10 h-10 shrink-0 bg-white border border-[#E4D9CB] text-[#3B2418] rounded-2xl hover:shadow-md transition disabled:opacity-50"
          >
            <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AccesoRapido to="/ventas" icono={ShoppingCart} titulo="Nueva venta" principal />
          <AccesoRapido to="/inventario?nuevo=1" icono={PackagePlus} titulo="Nuevo producto" />
          <AccesoRapido to="/turno" icono={Wallet} titulo="Turno de caja" />
          <AccesoRapido to="/reportes" icono={BarChart3} titulo="Reportes" />
        </div>

        {/* Estado del turno */}
        {!cargando && !turno.error && (
          turno.data ? (
            <div className="flex items-center gap-3 bg-white border border-[#E4D9CB] rounded-2xl px-4 py-3 text-sm">
              <CircleCheck size={18} className="text-green-700 shrink-0" />
              <p className="text-[#3B2418]">
                <span className="font-medium text-[#1C140F]">Turno abierto</span>
                {turno.data.cash_registers?.name && ` en ${turno.data.cash_registers.name}`}
                {turno.data.opened_at && ` desde las ${new Date(turno.data.opened_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            </div>
          ) : (
            <Link
              to="/turno"
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm hover:shadow-md transition"
            >
              <span className="flex items-center gap-3">
                <CircleAlert size={18} className="text-amber-700 shrink-0" />
                <span className="text-[#3B2418]">
                  <span className="font-medium text-[#1C140F]">No tienes un turno abierto.</span> Ábrelo para poder registrar ventas.
                </span>
              </span>
              <span className="sm:ml-auto flex items-center gap-1 font-medium text-[#3B2418] pl-7 sm:pl-0">
                Abrir turno <ArrowRight size={14} />
              </span>
            </Link>
          )
        )}

        {/* Indicadores */}
        {ventas.error ? (
          <ErrorBloque texto="No se pudieron cargar las ventas." />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Indicador
              titulo="Ventas de hoy"
              icono={Receipt}
              valor={kpis.hoy.num}
              cargando={cargando}
              comparacion={<Variacion actual={kpis.hoy.num} anterior={kpis.ayer.num} referencia="ayer" />}
            />
            <Indicador
              titulo="Piezas vendidas hoy"
              icono={Gem}
              valor={kpis.hoy.piezas}
              cargando={cargando}
              comparacion={<Variacion actual={kpis.hoy.piezas} anterior={kpis.ayer.piezas} referencia="ayer" />}
            />
            <Indicador
              titulo="Ventas en 7 días"
              icono={CalendarRange}
              valor={kpis.semana.num}
              cargando={cargando}
              comparacion={<Variacion actual={kpis.semana.num} anterior={kpis.semanaAnterior.num} referencia="7 días previos" />}
            />
            <Indicador
              titulo="Piezas en 7 días"
              icono={TrendingUp}
              valor={kpis.semana.piezas}
              cargando={cargando}
              comparacion={<Variacion actual={kpis.semana.piezas} anterior={kpis.semanaAnterior.piezas} referencia="7 días previos" />}
            />
          </div>
        )}

        {/* Gráfica + inventario */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Tarjeta
            className="lg:col-span-2"
            titulo={`Ventas por día (últimos ${DIAS_GRAFICA} días)`}
            icono={BarChart3}
            accion={{ to: '/reportes', texto: 'Ver reportes' }}
          >
            {ventas.error ? (
              <ErrorBloque texto="No se pudo cargar la gráfica." />
            ) : cargando ? (
              <Esqueleto alto="h-56" />
            ) : (
              <GraficaVentas serie={kpis.serie} />
            )}
          </Tarjeta>

          <Tarjeta
            titulo="Alertas de inventario"
            icono={AlertTriangle}
            accion={{ to: '/inventario', texto: 'Ir a inventario' }}
          >
            {stock.error ? (
              <ErrorBloque texto="No se pudo cargar el inventario." />
            ) : cargando ? (
              <Esqueleto alto="h-56" />
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <ContadorAlerta
                    to="/inventario?estado=agotado"
                    icono={PackageX}
                    titulo="Agotados"
                    valor={alertas.agotados.length}
                  />
                  <ContadorAlerta
                    to="/inventario?estado=bajo"
                    icono={AlertTriangle}
                    titulo="Stock bajo"
                    valor={alertas.bajos.length}
                  />
                </div>

                {alertas.lista.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-[#3B2418]/70 py-4">
                    <CircleCheck size={16} className="text-green-700" /> Todo el inventario está en orden.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#E4D9CB]">
                    {alertas.lista.map(r => (
                      <li key={r.fila.product_id} className="flex items-center justify-between gap-2 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-[#1C140F] truncate flex items-center gap-1.5">
                            {r.fila.color && <MuestraColor nombre={r.fila.color} size={10} />}
                            <span className="truncate">{r.fila.name}</span>
                          </p>
                          <p className="text-xs text-[#3B2418]/50 font-mono truncate">{r.fila.sku}</p>
                        </div>
                        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                          r.estado === 'agotado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.estado === 'agotado' ? 'Agotado' : `${r.stock} / mín. ${r.stock_min}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Tarjeta>
        </div>

        {/* Más vendidos, métodos de pago y últimas ventas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Tarjeta titulo={`Más vendidos (${DIAS_RANKING} días)`} icono={Trophy}>
            {items.error ? (
              <ErrorBloque texto="No se pudo cargar el ranking." />
            ) : cargando ? (
              <Esqueleto alto="h-40" />
            ) : topProductos.length === 0 ? (
              <Vacio texto="Aún no hay ventas en este periodo." />
            ) : (
              <ol className="space-y-3">
                {topProductos.map((p, idx) => (
                  <li key={p.sku ?? idx}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-[#3B2418]/50 w-4 shrink-0">{idx + 1}</span>
                        {p.color && <MuestraColor nombre={p.color} size={10} />}
                        <span className="truncate text-[#1C140F]">{p.nombre}</span>
                      </span>
                      <span className="shrink-0 text-xs text-[#3B2418]/70">{plural(p.piezas, 'pieza', 'piezas')}</span>
                    </div>
                    <BarraHorizontal porcentaje={(p.piezas / topProductos[0].piezas) * 100} />
                  </li>
                ))}
              </ol>
            )}
          </Tarjeta>

          <Tarjeta titulo={`Métodos de pago (${DIAS_RANKING} días)`} icono={CreditCard}>
            {ventas.error ? (
              <ErrorBloque texto="No se pudieron cargar las ventas." />
            ) : cargando ? (
              <Esqueleto alto="h-40" />
            ) : kpis.metodos.length === 0 ? (
              <Vacio texto="Aún no hay ventas en este periodo." />
            ) : (
              <ul className="space-y-3">
                {kpis.metodos.map(m => (
                  <li key={m.metodo}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-[#1C140F]">{METODOS_PAGO[m.metodo] ?? m.metodo}</span>
                      <span className="text-xs text-[#3B2418]/70">
                        {Math.round(m.porcentaje)}% · {plural(m.num, 'venta', 'ventas')}
                      </span>
                    </div>
                    <BarraHorizontal porcentaje={m.porcentaje} />
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta
            className="md:col-span-2 lg:col-span-1"
            titulo="Últimas ventas"
            icono={Clock}
            accion={{ to: '/reportes', texto: 'Ver todas' }}
          >
            {ventas.error ? (
              <ErrorBloque texto="No se pudieron cargar las ventas." />
            ) : cargando ? (
              <Esqueleto alto="h-40" />
            ) : kpis.ultimas.length === 0 ? (
              <Vacio texto="Todavía no hay ventas registradas." />
            ) : (
              <ul className="divide-y divide-[#E4D9CB]">
                {kpis.ultimas.map(v => (
                  <li key={v.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="text-[#1C140F] truncate">{resumenProductos(v)}</p>
                      <p className="text-xs text-[#3B2418]/50">
                        {formatoCuando(v.created_at)} · {METODOS_PAGO[v.payment_method] ?? v.payment_method}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[#3B2418]/70">{plural(piezasDe(v), 'pieza', 'piezas')}</span>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>
      </div>
    </div>
  )
}

// "Hoy 14:05", "Ayer 18:30" o "22 sep 11:10"
function formatoCuando(fecha) {
  const f = new Date(fecha)
  const hora = f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1)
  if (claveDia(f) === claveDia(new Date())) return `Hoy ${hora}`
  if (claveDia(f) === claveDia(ayer)) return `Ayer ${hora}`
  return `${f.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} ${hora}`
}

function AccesoRapido({ to, icono: Icono, titulo, principal }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-2xl p-3 sm:p-4 border transition hover:shadow-md ${
        principal
          ? 'bg-[#3B2418] border-[#3B2418] text-[#F4EDE4]'
          : 'bg-white border-[#E4D9CB] text-[#1C140F] hover:border-[#3B2418]/40'
      }`}
    >
      <span className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0 bg-[#F4EDE4] text-[#3B2418]">
        <Icono size={18} />
      </span>
      <span className="font-medium text-sm sm:text-base leading-tight">{titulo}</span>
    </Link>
  )
}

function Tarjeta({ titulo, icono: Icono, accion, className = '', children }) {
  return (
    <section className={`bg-white border border-[#E4D9CB] rounded-2xl p-4 sm:p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="flex items-center gap-2 font-semibold text-sm sm:text-base text-[#1C140F]">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F4EDE4] text-[#3B2418] shrink-0">
            <Icono size={14} />
          </span>
          {titulo}
        </h2>
        {accion && (
          <Link to={accion.to} className="flex items-center gap-1 text-xs text-[#3B2418] hover:underline shrink-0">
            {accion.texto} <ArrowRight size={12} />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function Indicador({ titulo, icono: Icono, valor, comparacion, cargando }) {
  return (
    <div className="bg-white border border-[#E4D9CB] rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs sm:text-sm text-[#3B2418]/60">{titulo}</p>
        <span className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-[#F4EDE4] text-[#3B2418] shrink-0">
          <Icono size={15} />
        </span>
      </div>
      {cargando ? (
        <div className="mt-2 space-y-2 animate-pulse">
          <div className="h-7 w-16 bg-[#F4EDE4] rounded-lg" />
          <div className="h-3 w-28 bg-[#F4EDE4] rounded" />
        </div>
      ) : (
        <>
          <p className="text-2xl sm:text-3xl font-bold text-[#1C140F] mt-1">{valor}</p>
          <div className="text-[11px] sm:text-xs text-[#3B2418]/60 mt-1">{comparacion}</div>
        </>
      )}
    </div>
  )
}

// Cambio porcentual contra un periodo anterior, con flecha para no depender solo del color
function Variacion({ actual, anterior, referencia }) {
  if (anterior === 0) {
    return <span>{actual > 0 ? `Sin ventas ${referencia}` : `Igual que ${referencia}`}</span>
  }
  const cambio = ((actual - anterior) / anterior) * 100
  const sube = cambio >= 0
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${sube ? 'text-green-700' : 'text-red-700'}`}>
      {sube ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {sube ? '+' : ''}{Math.round(cambio)}%
      <span className="text-[#3B2418]/60">vs {referencia}</span>
    </span>
  )
}

function ContadorAlerta({ to, icono: Icono, titulo, valor }) {
  const alerta = valor > 0
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 rounded-2xl border p-2.5 hover:shadow-md transition ${
        alerta ? 'bg-red-50 border-red-200' : 'bg-[#F4EDE4]/60 border-[#E4D9CB]'
      }`}
    >
      <Icono size={16} className={alerta ? 'text-red-600' : 'text-[#3B2418]/60'} />
      <span className="min-w-0">
        <span className={`block text-lg font-bold leading-none ${alerta ? 'text-red-600' : 'text-[#1C140F]'}`}>{valor}</span>
        <span className="block text-xs text-[#3B2418]/60 mt-0.5">{titulo}</span>
      </span>
    </Link>
  )
}

function BarraHorizontal({ porcentaje }) {
  return (
    <div className="mt-1.5 h-2 rounded-full bg-[#F4EDE4] overflow-hidden">
      <div className="h-full rounded-full bg-[#3B2418]" style={{ width: `${Math.max(porcentaje, 2)}%` }} />
    </div>
  )
}

// Gráfica de barras con el número de ventas por día: una sola serie, eje Y entero
// y tooltip (ventas y piezas) al pasar el mouse o enfocar con teclado.
function GraficaVentas({ serie }) {
  const [activo, setActivo] = useState(null)
  const tope = escalaBonita(Math.max(...serie.map(d => d.num)))
  const guias = [tope, tope / 2, 0]
  const hayVentas = serie.some(d => d.num > 0)
  const dato = activo !== null ? serie[activo] : null

  const etiquetaDia = (f) => f.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })

  // El tooltip se alinea a la izquierda/derecha en los extremos para no salirse de la tarjeta
  const alineacion = activo === null ? '' : activo < 2 ? 'izq' : activo > serie.length - 3 ? 'der' : 'centro'
  const posicion = activo === null ? 0 : (activo + { izq: 0, centro: 0.5, der: 1 }[alineacion]) / serie.length

  return (
    <div className="relative">
      <div className="relative h-52 sm:h-56 flex">
        {/* Eje Y */}
        <div className="w-8 shrink-0 relative text-[10px] sm:text-xs text-[#3B2418]/50">
          {guias.map((g, i) => (
            <span key={i} className="absolute right-2 -translate-y-1/2" style={{ top: `${(i / (guias.length - 1)) * 100}%` }}>
              {g}
            </span>
          ))}
        </div>

        {/* Área de la gráfica */}
        <div className="relative flex-1" onMouseLeave={() => setActivo(null)}>
          {guias.map((_, i) => (
            <div
              key={i}
              className={`absolute left-0 right-0 border-t ${i === guias.length - 1 ? 'border-[#3B2418]/30' : 'border-dashed border-[#E4D9CB]'}`}
              style={{ top: `${(i / (guias.length - 1)) * 100}%` }}
            />
          ))}

          {!hayVentas && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-[#3B2418]/40">
              Sin ventas en estos días
            </p>
          )}

          <div className="absolute inset-0 flex items-end gap-[2px] sm:gap-1.5">
            {serie.map((d, i) => (
              <button
                key={d.clave}
                type="button"
                onMouseEnter={() => setActivo(i)}
                onFocus={() => setActivo(i)}
                onBlur={() => setActivo(null)}
                aria-label={`${etiquetaDia(d.fecha)}: ${plural(d.num, 'venta', 'ventas')}, ${plural(d.piezas, 'pieza', 'piezas')}`}
                className="relative flex-1 h-full flex items-end justify-center focus:outline-none group"
              >
                <span
                  className={`w-full max-w-[28px] rounded-t-[4px] transition-opacity ${
                    d.esHoy ? 'bg-[#3B2418]' : 'bg-[#8A6450]'
                  } ${activo !== null && activo !== i ? 'opacity-40' : ''} group-focus-visible:ring-2 group-focus-visible:ring-[#3B2418]/40`}
                  style={{ height: `${(d.num / tope) * 100}%` }}
                />
              </button>
            ))}
          </div>

          {/* Tooltip */}
          {dato && (
            <div
              className={`absolute -top-2 z-10 pointer-events-none bg-[#1C140F] text-[#F4EDE4] text-xs rounded-xl px-3 py-2 shadow-lg whitespace-nowrap ${
                alineacion === 'der' ? '-translate-x-full' : alineacion === 'centro' ? '-translate-x-1/2' : ''
              }`}
              style={{ left: `${posicion * 100}%` }}
            >
              <p className="capitalize text-[#F4EDE4]/70">{etiquetaDia(dato.fecha)}{dato.esHoy && ' · hoy'}</p>
              <p className="font-semibold">{plural(dato.num, 'venta', 'ventas')}</p>
              <p className="text-[#F4EDE4]/70">{plural(dato.piezas, 'pieza', 'piezas')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Eje X */}
      <div className="flex pl-8 mt-1.5 gap-[2px] sm:gap-1.5">
        {serie.map(d => (
          <span
            key={d.clave}
            className={`flex-1 text-center text-[10px] sm:text-xs ${d.esHoy ? 'font-semibold text-[#1C140F]' : 'text-[#3B2418]/50'}`}
          >
            {d.esHoy ? 'Hoy' : d.fecha.getDate()}
          </span>
        ))}
      </div>

      {/* Versión en tabla para lectores de pantalla. El sr-only va en un div: una <table>
          no respeta overflow:hidden y, aunque invisible, alargaba la página. */}
      <div className="sr-only">
        <table>
          <caption>Ventas por día</caption>
          <thead><tr><th>Día</th><th>Ventas</th><th>Piezas</th></tr></thead>
          <tbody>
            {serie.map(d => (
              <tr key={d.clave}>
                <td>{etiquetaDia(d.fecha)}</td>
                <td>{d.num}</td>
                <td>{d.piezas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ErrorBloque({ texto }) {
  return <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-3 py-2">{texto}</p>
}

function Vacio({ texto }) {
  return <p className="text-sm text-[#3B2418]/50 py-6 text-center">{texto}</p>
}

function Esqueleto({ alto }) {
  return <div className={`${alto} rounded-2xl bg-[#F4EDE4]/70 animate-pulse`} />
}
