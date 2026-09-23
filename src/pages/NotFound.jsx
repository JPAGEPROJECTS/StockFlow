import { Link, useNavigate } from 'react-router-dom'
import { SearchX, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4EDE4] p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border border-[#E4D9CB] rounded-2xl p-6 sm:p-8 md:p-10 text-center shadow-sm">

        <div className="mx-auto mb-5 sm:mb-6 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#F4EDE4] flex items-center justify-center">
          <SearchX className="w-7 h-7 sm:w-8 sm:h-8 text-[#3B2418]" />
        </div>

        <p className="text-5xl sm:text-6xl font-bold text-[#3B2418] mb-2">404</p>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1C140F] mb-2 sm:mb-3">
          Página no encontrada
        </h1>
        <p className="text-sm sm:text-base text-[#8A7160] mb-6 sm:mb-8">
          La página que buscas no existe o fue movida.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 border border-[#E4D9CB] text-[#3B2418] px-5 py-2.5 rounded-2xl
              text-sm sm:text-base font-medium hover:bg-[#F4EDE4] hover:shadow-md transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver atrás
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-[#3B2418] text-[#F4EDE4] px-5 py-2.5 rounded-2xl
              text-sm sm:text-base font-medium hover:bg-[#2A1A11] hover:shadow-md transition"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
