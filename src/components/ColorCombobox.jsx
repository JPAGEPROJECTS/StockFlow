import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'

// Colores de la guía de SKU (docs/guia-estructuracion-sku.md §2.4), con su muestra visual
export const COLORES = [
  { nombre: 'Dorado', muestra: '#D4A73A' },
  { nombre: 'Plateado', muestra: '#C0C0C8' },
  { nombre: 'Negro', muestra: '#1C140F' },
  { nombre: 'Blanco', muestra: '#FFFFFF' },
  { nombre: 'Azul', muestra: '#2F6FD1' },
  { nombre: 'Rojo', muestra: '#C62828' },
  { nombre: 'Verde', muestra: '#2E7D32' },
  { nombre: 'Rosa', muestra: '#E88AAE' },
  { nombre: 'Multicolor', muestra: 'conic-gradient(#C62828, #D4A73A, #2E7D32, #2F6FD1, #E88AAE, #C62828)' },
  { nombre: 'Morado', muestra: '#7B4FA0' },
  { nombre: 'Turquesa', muestra: '#2FB7B0' },
  { nombre: 'Coral', muestra: '#E8734A' },
  { nombre: 'Beige', muestra: '#E3D2B4' },
  { nombre: 'Vino', muestra: '#7A1F2B' },
  { nombre: 'Bronce', muestra: '#8C5A2B' },
  { nombre: 'Perla', muestra: '#F1EDE3' },
  { nombre: 'Fucsia', muestra: '#D6247A' },
  { nombre: 'Amarillo', muestra: '#F2C230' },
  { nombre: 'Naranja', muestra: '#E67E22' },
  { nombre: 'Gris', muestra: '#8A8D91' },
  { nombre: 'Marrón', muestra: '#5B3A29' },
  { nombre: 'Celeste', muestra: '#8FCBEE' },
  { nombre: 'Lila', muestra: '#B79CD9' },
  { nombre: 'Rosa Gold', muestra: '#E8B4A0' },
  { nombre: 'Cobre', muestra: '#B46A4A' }
]

// Quita acentos y normaliza para que "platedo" o "PLATEADO" encuentren "Plateado"
const normalizar = (str) =>
  (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

// Círculo con la muestra del color; los colores libres (fuera de la lista) usan crema
export function MuestraColor({ nombre, size = 14 }) {
  const color = COLORES.find(c => normalizar(c.nombre) === normalizar(nombre))
  return (
    <span
      aria-hidden="true"
      className="inline-block rounded-full border border-[#E4D9CB] shrink-0"
      style={{ width: size, height: size, background: color?.muestra ?? '#F4EDE4' }}
    />
  )
}

export default function ColorCombobox({ id, value, onChange }) {
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const contenedorRef = useRef(null)
  const listaId = useId()

  const texto = normalizar(value)
  const opciones = useMemo(() => {
    const filtradas = COLORES.filter(c => normalizar(c.nombre).includes(texto))
    const existeExacto = COLORES.some(c => normalizar(c.nombre) === texto)
    // Si lo escrito no está en la lista, se ofrece usarlo tal cual
    return texto && !existeExacto
      ? [...filtradas.map(c => ({ ...c, libre: false })), { nombre: value.trim(), libre: true }]
      : filtradas.map(c => ({ ...c, libre: false }))
  }, [texto, value])

  // Cierra el panel al hacer clic fuera del componente
  useEffect(() => {
    const onClickFuera = (e) => {
      if (!contenedorRef.current?.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', onClickFuera)
    return () => document.removeEventListener('mousedown', onClickFuera)
  }, [])

  const elegir = (opcion) => {
    onChange(opcion.nombre)
    setAbierto(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAbierto(true)
      setActivo(a => Math.min(a + 1, opciones.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActivo(a => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && abierto && opciones[activo]) {
      e.preventDefault() // evita enviar el formulario al elegir un color
      elegir(opciones[activo])
    } else if (e.key === 'Escape' && abierto) {
      e.preventDefault()
      setAbierto(false)
    }
  }

  return (
    <div ref={contenedorRef} className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 flex">
        <MuestraColor nombre={value} />
      </span>
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={abierto}
        aria-controls={listaId}
        aria-autocomplete="list"
        placeholder="Buscar o escribir un color..."
        value={value}
        onChange={e => { onChange(e.target.value); setAbierto(true); setActivo(0) }}
        onFocus={() => setAbierto(true)}
        onKeyDown={handleKeyDown}
        className="border border-[#E4D9CB] p-2 pl-9 pr-9 w-full rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3B2418]/30"
      />
      {value && (
        <button
          type="button"
          aria-label="Quitar color"
          title="Quitar color"
          onClick={() => { onChange(''); setAbierto(true) }}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-[#F4EDE4] text-[#3B2418] hover:shadow-md transition"
        >
          <X size={12} />
        </button>
      )}

      {abierto && opciones.length > 0 && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute z-10 mt-1 w-full max-h-56 overflow-auto bg-white border border-[#E4D9CB] rounded-2xl shadow-md py-1"
        >
          {opciones.map((o, idx) => (
            <li
              key={o.libre ? '__libre' : o.nombre}
              role="option"
              aria-selected={idx === activo}
              // mousedown en vez de click para elegir antes de que el input pierda el foco
              onMouseDown={e => { e.preventDefault(); elegir(o) }}
              onMouseEnter={() => setActivo(idx)}
              className={`flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer text-[#1C140F]
                ${idx === activo ? 'bg-[#F4EDE4]' : ''} ${o.libre ? 'border-t border-[#E4D9CB]' : ''}`}
            >
              <MuestraColor nombre={o.nombre} />
              {o.libre ? <span>Usar «{o.nombre}»</span> : o.nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
