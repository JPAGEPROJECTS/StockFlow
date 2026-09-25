import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { registerUser } from '../services/userService'

// Campo de contraseña con botón (ojito) para mostrarla u ocultarla
function CampoPassword({ placeholder, value, onChange }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        autoComplete="new-password"
        className="w-full bg-[#F4EDE4]/60 border border-[#E4D9CB] rounded-full pl-4 pr-12 py-2.5 sm:py-3
          text-sm sm:text-base text-[#1C140F] placeholder:text-[#B3A192] focus:outline-none focus:ring-2
          focus:ring-[#3B2418]/30 focus:border-[#3B2418] transition"
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full
          text-[#B3A192] hover:text-[#3B2418] hover:bg-[#F4EDE4] transition"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [listo, setListo] = useState(false)

  // El estado `cargando` no se refleja en el DOM hasta el siguiente render,
  // así que un doble clic muy rápido puede disparar dos submits (y quemar
  // más rápido el rate limit de Supabase). El ref se actualiza al instante.
  const enviandoRef = useRef(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (enviandoRef.current) return
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    enviandoRef.current = true
    setCargando(true)
    const { error } = await registerUser({ full_name: fullName, email, password })
    enviandoRef.current = false

    if (error) {
      console.error('[Register] registerUser falló', error)
      setError(error.message)
      setCargando(false)
      return
    }
    setListo(true)
    setCargando(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4EDE4] p-3 sm:p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-[28px] shadow-2xl overflow-hidden flex flex-col md:flex-row md:min-h-[560px]">

        {/* Panel izquierdo — decorativo, chocolate */}
        <div className="relative md:w-1/2 bg-[#3B2418] p-6 sm:p-8 md:p-10 flex flex-col justify-between overflow-hidden">
          <div className="absolute -top-16 -right-16 w-40 h-40 sm:w-64 sm:h-64 bg-[#F4EDE4]/10 rounded-full"></div>
          <div className="absolute bottom-10 -left-10 w-28 h-28 sm:w-40 sm:h-40 bg-[#F4EDE4]/10 rounded-full"></div>
          <div className="absolute top-1/3 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-black/20 rounded-full translate-x-1/2"></div>

          <div className="relative z-10 hidden sm:flex gap-1.5">
            <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[15px] border-b-[#F4EDE4]"></div>
            <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[15px] border-b-[#F4EDE4]"></div>
            <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[15px] border-b-[#F4EDE4]"></div>
          </div>

          <div className="relative z-10">
            <h1 className="text-[#F4EDE4] text-2xl sm:text-3xl font-bold leading-snug mb-2 sm:mb-3">
              Únete al equipo
            </h1>
            <p className="text-[#D8C7B8] text-xs sm:text-sm leading-relaxed max-w-[30ch]">
              Crea tu cuenta. Un administrador deberá aprobarla antes de que puedas iniciar sesión.
            </p>
          </div>

          <div className="relative z-10 hidden sm:flex gap-1.5">
            <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[15px] border-b-[#F4EDE4]"></div>
            <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[15px] border-b-[#F4EDE4]"></div>
            <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[15px] border-b-[#F4EDE4]"></div>
          </div>
        </div>

        {/* Panel derecho — formulario */}
        <div className="md:w-1/2 bg-white p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-center">
          <h2 className="text-[#1C140F] text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">
            Crear cuenta
          </h2>

          {listo ? (
            <div className="space-y-4">
              <div className="text-sm text-[#3B2418] bg-[#F4EDE4] border border-[#3B2418]/20 rounded-lg px-4 py-3">
                Tu cuenta fue creada. Espera a que un administrador la apruebe para poder iniciar sesión.
              </div>
              <Link to="/login" className="text-[#3B2418] font-medium hover:underline text-sm">
                Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 text-sm text-[#3B2418] bg-[#F4EDE4] border border-[#3B2418]/20 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  className="w-full bg-[#F4EDE4]/60 border border-[#E4D9CB] rounded-full px-4 py-2.5 sm:py-3
                    text-sm sm:text-base text-[#1C140F] placeholder:text-[#B3A192] focus:outline-none focus:ring-2
                    focus:ring-[#3B2418]/30 focus:border-[#3B2418] transition"
                />

                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#F4EDE4]/60 border border-[#E4D9CB] rounded-full px-4 py-2.5 sm:py-3
                    text-sm sm:text-base text-[#1C140F] placeholder:text-[#B3A192] focus:outline-none focus:ring-2
                    focus:ring-[#3B2418]/30 focus:border-[#3B2418] transition"
                />

                <CampoPassword
                  placeholder="Contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />

                <CampoPassword
                  placeholder="Confirmar contraseña"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />

                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full bg-[#3B2418] text-[#F4EDE4] py-3 sm:py-3.5 rounded-full font-medium text-sm sm:text-base
                    hover:bg-[#2A1A11] transition disabled:opacity-50 mt-2 shadow-md"
                >
                  {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
              </form>

              <p className="text-center text-xs sm:text-sm text-[#8A7160] mt-5 sm:mt-6">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-[#3B2418] font-medium hover:underline">
                  Iniciar sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
