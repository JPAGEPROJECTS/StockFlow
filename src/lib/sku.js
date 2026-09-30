// Generación automática de SKU: VR + categoría + "-" + color + "-" + folio
// Ej. Pulseras + Azul → VRPUL-AZL-0015
// El folio es un solo consecutivo global: avanza sin importar la categoría ni el color.
// Los códigos salen de docs/guia-estructuracion-sku.md (§2.1 categorías, §2.4 colores).

export const PREFIJO_SKU = 'VR'
const DIGITOS_FOLIO = 4

// Quita acentos y normaliza para comparar nombres sin importar mayúsculas/acentos
export const normalizar = (str) =>
  (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

// Colores de la guía de SKU, con su código y muestra visual
export const COLORES = [
  { nombre: 'Dorado', codigo: 'DOR', muestra: '#D4A73A' },
  { nombre: 'Plateado', codigo: 'PLA', muestra: '#C0C0C8' },
  { nombre: 'Negro', codigo: 'NEG', muestra: '#1C140F' },
  { nombre: 'Blanco', codigo: 'BLA', muestra: '#FFFFFF' },
  { nombre: 'Azul', codigo: 'AZL', muestra: '#2F6FD1' },
  { nombre: 'Rojo', codigo: 'ROJ', muestra: '#C62828' },
  { nombre: 'Verde', codigo: 'VRD', muestra: '#2E7D32' },
  { nombre: 'Rosa', codigo: 'ROS', muestra: '#E88AAE' },
  { nombre: 'Multicolor', codigo: 'MUL', muestra: 'conic-gradient(#C62828, #D4A73A, #2E7D32, #2F6FD1, #E88AAE, #C62828)' }
]

// Categorías de la guía; se reconocen por la raíz de cualquier palabra del nombre
// (ej. "Pulseras de hilo" → PUL, "Aretes / Pendientes" → ARE)
const CATEGORIAS = [
  { raices: ['pulsera'], codigo: 'PUL' },
  { raices: ['collar'], codigo: 'COL' },
  { raices: ['anillo'], codigo: 'ANI' },
  { raices: ['arete', 'pendiente'], codigo: 'ARE' },
  { raices: ['tobillera'], codigo: 'TOB' },
  { raices: ['conjunto', 'set'], codigo: 'SET' }
]

const PALABRAS_VACIAS = new Set(['DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'E', 'CON', 'PARA'])
const VOCALES = new Set(['A', 'E', 'I', 'O', 'U'])

const palabras = (texto) =>
  normalizar(texto)
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(p => p && !PALABRAS_VACIAS.has(p))

// Para nombres fuera de la guía:
// - varias palabras → sigla con las iniciales ("Edición Limitada" → EL)
// - una palabra → contracción: primera letra + consonantes siguientes ("Turquesa" → TRQ)
export const abreviar = (texto) => {
  const lista = palabras(texto)
  if (lista.length === 0) return ''
  if (lista.length > 1) return lista.slice(0, 3).map(p => p[0]).join('')

  const [palabra] = lista
  let codigo = palabra[0]
  for (const letra of palabra.slice(1)) {
    if (codigo.length === 3) break
    if (!VOCALES.has(letra)) codigo += letra
  }
  // Palabras con pocas consonantes ("Oro") se completan con las letras restantes
  for (const letra of palabra.slice(1)) {
    if (codigo.length === 3) break
    if (VOCALES.has(letra)) codigo += letra
  }
  return codigo
}

export const codigoCategoria = (nombre) => {
  const lista = palabras(nombre).map(p => p.toLowerCase())
  const conocida = CATEGORIAS.find(c => lista.some(p => c.raices.some(r => p.startsWith(r))))
  return conocida ? conocida.codigo : abreviar(nombre)
}

export const codigoColor = (nombre) => {
  const conocido = COLORES.find(c => normalizar(c.nombre) === normalizar(nombre))
  return conocido ? conocido.codigo : abreviar(nombre)
}

// "VRPUL-AZL-" — se le agrega el siguiente folio global
export const prefijoSku = (nombreCategoria, nombreColor) => {
  const cat = codigoCategoria(nombreCategoria)
  const col = codigoColor(nombreColor)
  if (!cat || !col) return null
  return `${PREFIJO_SKU}${cat}-${col}-`
}

// Siguiente SKU: el prefijo + el folio más alto de toda la tienda + 1
export const siguienteSku = (prefijo, folioMaximo) =>
  prefijo + String(folioMaximo + 1).padStart(DIGITOS_FOLIO, '0')
