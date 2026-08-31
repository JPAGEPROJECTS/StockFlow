import { Link } from 'react-router-dom'
import { Package, ShoppingCart, BarChart3 } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F4EDE4] p-4 sm:p-6 pt-20 sm:pt-24">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1C140F] mb-1">StockFlow</h1>
        <p className="text-sm sm:text-base text-[#8A7160] mb-6 sm:mb-10">Gestión de inventario y ventas</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Link
            to="/inventario"
            className="bg-white border border-[#E4D9CB] rounded-2xl p-6 sm:p-8 text-center
              hover:border-[#3B2418] hover:shadow-lg transition"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 rounded-full bg-[#F4EDE4] flex items-center justify-center">
              <Package size={24} className="text-[#3B2418] sm:hidden" />
              <Package size={26} className="text-[#3B2418] hidden sm:block" />
            </div>
            <p className="font-semibold text-base sm:text-lg text-[#1C140F]">Inventario</p>
            <p className="text-xs sm:text-sm text-[#8A7160] mt-1">Ver stock, crear y editar productos</p>
          </Link>

          <Link
            to="/ventas"
            className="bg-white border border-[#E4D9CB] rounded-2xl p-6 sm:p-8 text-center
              hover:border-[#3B2418] hover:shadow-lg transition"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 rounded-full bg-[#F4EDE4] flex items-center justify-center">
              <ShoppingCart size={24} className="text-[#3B2418] sm:hidden" />
              <ShoppingCart size={26} className="text-[#3B2418] hidden sm:block" />
            </div>
            <p className="font-semibold text-base sm:text-lg text-[#1C140F]">Ventas</p>
            <p className="text-xs sm:text-sm text-[#8A7160] mt-1">Registrar una nueva venta</p>
          </Link>
        </div>

        <Link
          to="/reportes"
          className="mt-3 sm:mt-4 flex items-center gap-3 sm:gap-4 bg-white border border-[#E4D9CB] rounded-2xl p-4 sm:p-5
            hover:border-[#3B2418] hover:shadow-lg transition"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full bg-[#3B2418] flex items-center justify-center">
            <BarChart3 size={20} className="text-[#F4EDE4] sm:hidden" />
            <BarChart3 size={22} className="text-[#F4EDE4] hidden sm:block" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm sm:text-base text-[#1C140F]">Reportes</p>
            <p className="text-xs sm:text-sm text-[#8A7160]">Ventas diarias, mensuales y exportación</p>
          </div>
        </Link>
      </div>
    </div>
  )
}