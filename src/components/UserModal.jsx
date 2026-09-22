import { useState } from 'react'
import { updateUser, ROLES } from '../services/userService'

export default function UserModal({ usuario, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name: usuario.full_name,
    role: usuario.role,
    is_active: usuario.is_active
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleChange = e => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.full_name) {
      setError('El nombre es obligatorio.')
      return
    }
    setGuardando(true)

    try {
      const { error: updError } = await updateUser(usuario.id, form)
      if (updError) throw updError
      onSaved()
      onClose()
    } catch (err) {
      console.error('[UserModal] updateUser falló', err)
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#E4D9CB] p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl w-full sm:w-96 space-y-3 max-h-[92vh] sm:max-h-[90vh] overflow-auto"
      >
        <h2 className="text-base sm:text-lg font-bold text-[#1C140F]">Editar usuario</h2>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-2 rounded-2xl border border-red-300">
            {error}
          </div>
        )}

        <input name="full_name" placeholder="Nombre completo" value={form.full_name} onChange={handleChange}
          className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30" required />

        {/* El correo vive en auth.users; cambiarlo requiere la service role key,
            no disponible en el frontend, así que solo se muestra de referencia. */}
        <input value={usuario.email || ''} disabled
          className="border border-[#E4D9CB] bg-[#F4EDE4] p-2 w-full rounded-2xl text-sm sm:text-base text-[#3B2418]/60" />

        <select name="role" value={form.role} onChange={handleChange}
          className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base text-[#3B2418] focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30">
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>

        <label className="flex items-center gap-2 border border-[#E4D9CB] rounded-2xl px-3 py-2 text-sm text-[#3B2418]">
          <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
          Cuenta aprobada / activa
        </label>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} disabled={guardando}
            className="px-4 py-2 text-sm sm:text-base text-[#3B2418]/70 hover:text-[#1C140F] transition-colors">Cancelar</button>
          <button type="submit" disabled={guardando}
            className="bg-[#3B2418] text-[#F4EDE4] px-4 py-2 rounded-2xl text-sm sm:text-base font-medium hover:shadow-md transition-all disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
