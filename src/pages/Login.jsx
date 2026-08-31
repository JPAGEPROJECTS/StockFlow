import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [recordar, setRecordar] = useState(true)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    const { error } = await login(email, password)
    if (error) setError(error.message)
    setCargando(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4EDE4] p-4">
      <div className="w-full max-w-4xl bg-white rounded-[28px] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[560px]">

        {/* Panel izquierdo — decorativo, chocolate */}
        <div className="relative md:w-1/2 bg-[#3B2418] p-10 flex flex-col justify-between overflow-hidden">

          {/* Formas decorativas en tonos crema translúcidos */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#F4EDE4]/10 rounded-full"></div>
          <div className="absolute bottom-10 -left-10 w-40 h-40 bg-[#F4EDE4]/10 rounded-full"></div>
          <div className="absolute top-1/3 right-0 w-24 h-24 bg-black/20 rounded-full translate-x-1/2"></div>

          {/* Triángulos arriba */}
          <div className="relative z-10 flex gap-1.5">
            <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[15px] border-b-[#F4EDE4]"></div>
            <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[15px] border-b-[#F4EDE4]"></div>
            <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[15px] border-b-[#F4EDE4]"></div>
          </div>

          {/* Texto central */}
          <div className="relative z-10">
            <h1 className="text-[#F4EDE4] text-3xl font-bold leading-snug mb-3">
              Bienvenido de vuelta
            </h1>
            <p className="text-[#D8C7B8] text-sm leading-relaxed max-w-[30ch]">
              Inicia sesión para acceder con tu cuenta existente.
            </p>
          </div>

          {/* Triángulos abajo */}
          <div className="relative z-10 flex gap-1.5">
            <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[15px] border-b-[#F4EDE4]"></div>
            <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[15px] border-b-[#F4EDE4]"></div>
            <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[15px] border-b-[#F4EDE4]"></div>
          </div>
        </div>

        {/* Panel derecho — formulario */}
        <div className="md:w-1/2 bg-white p-10 md:p-12 flex flex-col justify-center">
          <h2 className="text-[#1C140F] text-3xl font-bold mb-8">
            Iniciar sesión
          </h2>

          {error && (
            <div className="mb-4 text-sm text-[#3B2418] bg-[#F4EDE4] border border-[#3B2418]/20 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Usuario / email con ícono */}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B3A192]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                type="email"
                placeholder="Usuario o correo"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-[#F4EDE4]/60 border border-[#E4D9CB] rounded-full pl-11 pr-4 py-3
                  text-[#1C140F] placeholder:text-[#B3A192] focus:outline-none focus:ring-2
                  focus:ring-[#3B2418]/30 focus:border-[#3B2418] transition"
              />
            </div>

            {/* Contraseña con ícono */}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B3A192]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="11" width="16" height="9" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              </span>
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#F4EDE4]/60 border border-[#E4D9CB] rounded-full pl-11 pr-4 py-3
                  text-[#1C140F] placeholder:text-[#B3A192] focus:outline-none focus:ring-2
                  focus:ring-[#3B2418]/30 focus:border-[#3B2418] transition"
              />
            </div>

            <div className="flex items-center justify-between text-sm pt-1 px-1">
              <label className="flex items-center gap-2 text-[#5C4433] cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordar}
                  onChange={e => setRecordar(e.target.checked)}
                  className="accent-[#3B2418] rounded"
                />
                Recordarme
              </label>
              <a href="#" className="text-[#3B2418] hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-[#3B2418] text-[#F4EDE4] py-3.5 rounded-full font-medium
                hover:bg-[#2A1A11] transition disabled:opacity-50 mt-2 shadow-md"
            >
              {cargando ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-sm text-[#8A7160] mt-6">
            ¿Nuevo aquí?{' '}
            <a href="#" className="text-[#3B2418] font-medium hover:underline">
              Crear una cuenta
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}