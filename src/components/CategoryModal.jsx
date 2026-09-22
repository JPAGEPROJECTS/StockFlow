import { useState } from 'react'
import { createCategory, updateCategory } from '../services/productService'

export default function CategoryModal({ categoria, onClose, onSaved }) {
  const [name, setName] = useState(categoria?.name || '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    setGuardando(true)

    const { error: opError } = categoria
      ? await updateCategory(categoria.id, name.trim())
      : await createCategory(name.trim())

    setGuardando(false)

    if (opError) {
      console.error('[CategoryModal] guardar categoría falló', opError)
      // categories.name es unique: 23505 = violación de constraint único.
      setError(opError.code === '23505'
        ? 'Ya existe una categoría con ese nombre.'
        : opError.message)
      return
    }

    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#E4D9CB] p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl w-full sm:w-96 space-y-3 max-h-[92vh] sm:max-h-[90vh] overflow-auto"
      >
        <h2 className="text-base sm:text-lg font-bold text-[#1C140F]">{categoria ? 'Editar' : 'Nueva'} categoría</h2>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-2 rounded-2xl border border-red-300">
            {error}
          </div>
        )}

        <input
          placeholder="Nombre de la categoría"
          value={name}
          onChange={e => setName(e.target.value)}
          className="border border-[#E4D9CB] p-2 w-full rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30"
          autoFocus
          required
        />

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
