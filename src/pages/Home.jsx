import { Link } from 'react-router-dom'
import { Package, ShoppingCart, BarChart3 } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F4EDE4] p-6 pt-24">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1C140F] mb-1">StockFlow</h1>
        <p className="text-[#8A7160] mb-10">Gestión de inventario y ventas</p>

        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/inventario"
            className="bg-white border border-[#E4D9CB] rounded-2xl p-8 text-center
              hover:border-[#3B2418] hover:shadow-lg transition"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#F4EDE4] flex items-center justify-center">
              <Package size={26} className="text-[#3B2418]" />
            </div>
            <p className="font-semibold text-lg text-[#1C140F]">Inventario</p>
            <p className="text-sm text-[#8A7160] mt-1">Ver stock, crear y editar productos</p>
          </Link>

          <Link
            to="/ventas"
            className="bg-white border border-[#E4D9CB] rounded-2xl p-8 text-center
              hover:border-[#3B2418] hover:shadow-lg transition"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#F4EDE4] flex items-center justify-center">
              <ShoppingCart size={26} className="text-[#3B2418]" />
            </div>
            <p className="font-semibold text-lg text-[#1C140F]">Ventas</p>
            <p className="text-sm text-[#8A7160] mt-1">Registrar una nueva venta</p>
          </Link>
        </div>

        <Link
          to="/reportes"
          className="mt-4 flex items-center gap-4 bg-white border border-[#E4D9CB] rounded-2xl p-5
            hover:border-[#3B2418] hover:shadow-lg transition"
        >
          <div className="w-12 h-12 shrink-0 rounded-full bg-[#3B2418] flex items-center justify-center">
            <BarChart3 size={22} className="text-[#F4EDE4]" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-[#1C140F]">Reportes</p>
            <p className="text-sm text-[#8A7160]">Ventas diarias, mensuales y exportación</p>
          </div>
        </Link>
      </div>
    </div>
  )
}