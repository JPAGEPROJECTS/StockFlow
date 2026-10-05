import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import {
  getSavedRequest,
  clearSavedRequest,
  requestPasswordReset,
  getPasswordResetStatus,
  completePasswordReset
} from '../services/passwordResetService'

const inputClass = `w-full bg-[#F4EDE4]/60 border border-[#E4D9CB] rounded-full px-4 py-2.5 sm:py-3
  text-sm sm:text-base text-[#1C140F] placeholder:text-[#B3A192] focus:outline-none focus:ring-2
  focus:ring-[#3B2418]/30 focus:border-[#3B2418] transition`

const botonPrimario = `w-full bg-[#3B2418] text-[#F4EDE4] py-3 sm:py-3.5 rounded-full font-medium text-sm sm:text-base
  hover:bg-[#2A1A11] transition disabled:opacity-50 shadow-md`

const botonSecundario = `w-full flex items-center justify-center gap-2 border border-[#E4D9CB] text-[#3B2418] py-2.5 sm:py-3
  rounded-full font-medium text-sm hover:bg-[#F4EDE4] transition disabled:opacity-50`

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
        className={`${inputClass} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full
          text-[#B3A192] hover:text-[#3B2418] hover:bg-[#F4EDE4] transition"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

function Icono({ children, oscuro }) {
  return (
    <span className={`flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
      oscuro ? 'bg-[#3B2418] text-[#F4EDE4]' : 'bg-[#F4EDE4] text-[#3B2418]'
    }`}>
      {children}
    </span>
  )
}

// Pasos: cargando → email → pending → approved → done
//        (o rejected / expired, que vuelven a email)
export default function RecuperarPassword() {
  const [paso, setPaso] = useState('cargando')
  const [solicitud, setSolicitud] = useState(null) // { token, email }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)

  const consultarEstado = async (req) => {
    setError('')
    setEnviando(true)
    const { status, error } = await getPasswordResetStatus(req.token)
    setEnviando(false)
    if (error) {
      setError('No se pudo consultar la solicitud. Intenta de nuevo.')
      setPaso('pending')
      return
    }
    if (status === 'pending' || status === 'approved' || status === 'rejected' || status === 'expired') {
      setPaso(status)
    } else {
      // completed / cancelled / invalid: no hay nada pendiente en este dispositivo
      clearSavedRequest()
      setSolicitud(null)
      setPaso('email')
    }
  }

  useEffect(() => {
    const guardada = getSavedRequest()
    if (guardada?.token) {
      setSolicitud(guardada)
      setEmail(guardada.email ?? '')
      consultarEstado(guardada)
    } else {
      setPaso('email')
    }
  }, [])

  const enviarSolicitud = async (e) => {
    e.preventDefault()
    if (enviandoRef.current) return
    enviandoRef.current = true
    setError('')
    setEnviando(true)
    const { token, error } = await requestPasswordReset(email)
    setEnviando(false)
    enviandoRef.current = false
    if (error) {
      setError(error.message)
      return
    }
    setSolicitud({ token, email: email.trim().toLowerCase() })
    setPaso('pending')
  }

  const cambiarPassword = async (e) => {
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
    setEnviando(true)
    const { error } = await completePasswordReset(solicitud.token, password)
    setEnviando(false)
    enviandoRef.current = false
    if (error) {
      setError(error.message)
      return
    }
    setPaso('done')
  }

  const nuevaSolicitud = () => {
    clearSavedRequest()
    setSolicitud(null)
    setError('')
    setPaso('email')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4EDE4] p-3 sm:p-4">
      <div className="w-full max-w-md bg-white border border-[#E4D9CB] rounded-2xl shadow-2xl p-6 sm:p-8 md:p-10">

        {error && (
          <div className="mb-4 text-sm text-[#3B2418] bg-[#F4EDE4] border border-[#3B2418]/20 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {paso === 'cargando' && (
          <p className="text-center text-sm text-[#8A7160] py-8">Revisando tu solicitud...</p>
        )}

        {paso === 'email' && (
          <>
            <Icono><KeyRound size={22} /></Icono>
            <h1 className="text-[#1C140F] text-2xl sm:text-3xl font-bold mb-2">¿Olvidaste tu contraseña?</h1>
            <p className="text-xs sm:text-sm text-[#8A7160] mb-6">
              Escribe tu correo y enviaremos una solicitud a un administrador o supervisor.
              Cuando la apruebe podrás crear una contraseña nueva desde este mismo dispositivo.
            </p>
            <form onSubmit={enviarSolicitud} className="space-y-4">
              <input
                type="email"
                placeholder="Correo"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputClass}
              />
              <button type="submit" disabled={enviando} className={botonPrimario}>
                {enviando ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </form>
          </>
        )}

        {paso === 'pending' && (
          <>
            <Icono><Clock size={22} /></Icono>
            <h1 className="text-[#1C140F] text-xl sm:text-2xl font-bold mb-2">Solicitud enviada</h1>
            <p className="text-xs sm:text-sm text-[#8A7160] mb-6">
              Tu solicitud para <span className="font-medium text-[#3B2418]">{solicitud?.email}</span> está
              esperando la aprobación de un administrador o supervisor. Vuelve a esta pantalla en este
              mismo dispositivo para revisar si ya fue aprobada.
            </p>
            <div className="space-y-3">
              <button onClick={() => consultarEstado(solicitud)} disabled={enviando} className={botonPrimario}>
                <span className="inline-flex items-center gap-2">
                  <RefreshCw size={16} className={enviando ? 'animate-spin' : ''} />
                  {enviando ? 'Revisando...' : 'Revisar estado'}
                </span>
              </button>
              <button onClick={nuevaSolicitud} disabled={enviando} className={botonSecundario}>
                Usar otro correo
              </button>
            </div>
          </>
        )}

        {paso === 'approved' && (
          <>
            <Icono oscuro><CheckCircle2 size={22} /></Icono>
            <h1 className="text-[#1C140F] text-xl sm:text-2xl font-bold mb-2">Solicitud aprobada</h1>
            <p className="text-xs sm:text-sm text-[#8A7160] mb-6">
              Crea tu contraseña nueva para <span className="font-medium text-[#3B2418]">{solicitud?.email}</span>.
            </p>
            <form onSubmit={cambiarPassword} className="space-y-4">
              <CampoPassword placeholder="Contraseña nueva" value={password} onChange={e => setPassword(e.target.value)} />
              <CampoPassword placeholder="Confirmar contraseña" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              <button type="submit" disabled={enviando} className={botonPrimario}>
                {enviando ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </>
        )}

        {(paso === 'rejected' || paso === 'expired') && (
          <>
            <Icono><XCircle size={22} /></Icono>
            <h1 className="text-[#1C140F] text-xl sm:text-2xl font-bold mb-2">
              {paso === 'rejected' ? 'Solicitud rechazada' : 'La aprobación venció'}
            </h1>
            <p className="text-xs sm:text-sm text-[#8A7160] mb-6">
              {paso === 'rejected'
                ? 'Un administrador o supervisor rechazó tu solicitud. Habla con ellos o envía una nueva.'
                : 'Pasaron más de 24 horas desde que se aprobó. Envía una solicitud nueva.'}
            </p>
            <button onClick={nuevaSolicitud} className={botonPrimario}>Enviar otra solicitud</button>
          </>
        )}

        {paso === 'done' && (
          <>
            <Icono oscuro><CheckCircle2 size={22} /></Icono>
            <h1 className="text-[#1C140F] text-xl sm:text-2xl font-bold mb-2">¡Contraseña actualizada!</h1>
            <p className="text-xs sm:text-sm text-[#8A7160] mb-6">Ya puedes iniciar sesión con tu contraseña nueva.</p>
            <Link to="/login" className={`${botonPrimario} block text-center`}>Ir a iniciar sesión</Link>
          </>
        )}

        {paso !== 'done' && (
          <p className="text-center text-xs sm:text-sm text-[#8A7160] mt-5 sm:mt-6">
            <Link to="/login" className="text-[#3B2418] font-medium hover:underline">Volver a iniciar sesión</Link>
          </p>
        )}
      </div>
    </div>
  )
}
