import { useState } from 'react'
import { Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { changeOwnPassword } from '../services/userService'

function CampoPassword({ placeholder, value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3B2418]/50">
        <KeyRound size={16} />
      </span>
      <input
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        autoComplete={autoComplete}
        className="border border-[#E4D9CB] p-2 pl-9 pr-10 w-full rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30"
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#3B2418]/60 hover:text-[#3B2418]"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

export default function CambiarPasswordModal({ onClose }) {
  const { session } = useAuth()
  const email = session?.user?.email ?? ''
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (guardando) return
    setError('')
    if (nueva.length < 6) {
      setError('La contraseña nueva debe tener al menos 6 caracteres.')
      return
    }
    if (nueva !== confirmacion) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }
    if (nueva === actual) {
      setError('La contraseña nueva debe ser distinta a la actual.')
      return
    }
    setGuardando(true)
    const { error } = await changeOwnPassword(email, actual, nueva)
    setGuardando(false)
    if (error) {
      setError(error.message)
      return
    }
    setListo(true)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
      {listo ? (
        <div className="bg-white border border-[#E4D9CB] p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl w-full sm:w-96 text-center">
          <span className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-[#3B2418] text-[#F4EDE4] mb-3">
            <CheckCircle2 size={22} />
          </span>
          <h2 className="text-base sm:text-lg font-bold text-[#1C140F] mb-1">Contraseña actualizada</h2>
          <p className="text-xs sm:text-sm text-[#3B2418]/60 mb-4">La próxima vez inicia sesión con tu contraseña nueva.</p>
          <button onClick={onClose}
            className="w-full bg-[#3B2418] text-[#F4EDE4] px-4 py-2.5 rounded-2xl text-sm sm:text-base font-medium hover:shadow-md transition-all">
            Listo
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[#E4D9CB] p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl w-full sm:w-96 space-y-3 max-h-[92vh] sm:max-h-[90vh] overflow-auto"
        >
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1C140F]">Cambiar contraseña</h2>
            <p className="text-xs text-[#3B2418]/60 truncate">{email}</p>
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 text-sm p-2 rounded-2xl border border-red-300">
              {error}
            </div>
          )}

          <CampoPassword placeholder="Contraseña actual" value={actual} onChange={e => setActual(e.target.value)} autoComplete="current-password" />
          <CampoPassword placeholder="Contraseña nueva" value={nueva} onChange={e => setNueva(e.target.value)} autoComplete="new-password" />
          <CampoPassword placeholder="Confirmar contraseña nueva" value={confirmacion} onChange={e => setConfirmacion(e.target.value)} autoComplete="new-password" />
          <p className="text-xs text-[#3B2418]/50 px-1">Mínimo 6 caracteres.</p>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} disabled={guardando}
              className="px-4 py-2 text-sm sm:text-base text-[#3B2418]/70 hover:text-[#1C140F] transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando}
              className="bg-[#3B2418] text-[#F4EDE4] px-4 py-2 rounded-2xl text-sm sm:text-base font-medium hover:shadow-md transition-all disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Cambiar'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
