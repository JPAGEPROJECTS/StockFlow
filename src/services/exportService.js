// Exportación a Excel con estilos (colores de la app, moneda, totales).
// Usa exceljs porque la edición gratuita de SheetJS (xlsx) no escribe
// estilos. Se importa de forma dinámica para que su peso (~1 MB) solo se
// descargue al exportar, no en la carga inicial de la app.

const COLORES = {
  chocolate: 'FF3B2418',
  crema: 'FFF4EDE4',
  cremaSuave: 'FFFBF8F4',
  borde: 'FFE4D9CB',
  texto: 'FF1C140F',
  textoSuave: 'FF8A7160',
  verde: 'FF15803D',
  rojo: 'FFB91C1C'
}

const FORMATOS = {
  moneda: '"$"#,##0.00',
  entero: '#,##0',
  texto: '@'
}

const bordeFino = { style: 'thin', color: { argb: COLORES.borde } }
const bordes = { top: bordeFino, left: bordeFino, bottom: bordeFino, right: bordeFino }

/**
 * @param {object[]} filas     Datos: un objeto por fila, con las claves de `columnas`.
 * @param {string}   archivo   Nombre base del archivo (se le agrega la fecha).
 * @param {string}   hoja      Nombre de la hoja.
 * @param {object}   [opciones]
 * @param {string}   [opciones.titulo]    Título grande de la primera fila.
 * @param {string[]} [opciones.info]      Líneas bajo el título (filtros, etc.).
 * @param {{key:string, header?:string, tipo?:'moneda'|'entero'|'texto', ancho?:number}[]} [opciones.columnas]
 *                                        Si se omite, se deducen de las claves de la primera fila.
 * @param {object}   [opciones.totales]   Fila de totales (mismas claves); se muestra en negrita.
 * @param {string}   [opciones.agruparPor] Clave cuyo cambio de valor marca un bloque nuevo
 *                                        (línea superior más gruesa), p. ej. N° de venta.
 * @param {(fila:object, key:string) => string|undefined} [opciones.colorTexto]
 *                                        Color ARGB opcional por celda (p. ej. margen, estado).
 */
export const exportToExcel = async (filas, archivo, hoja = 'Datos', opciones = {}) => {
  if (!filas || filas.length === 0) {
    alert('No hay datos para exportar')
    return
  }

  const { default: ExcelJS } = await import('exceljs')

  const columnas = (opciones.columnas || Object.keys(filas[0]).map(key => ({ key })))
    .map(c => ({ header: c.key, tipo: 'texto', ...c }))
  const n = columnas.length
  const titulo = opciones.titulo || hoja
  // Filtros + fecha de generación en una sola línea, para ocupar menos alto
  const info = [
    ...(opciones.info || []),
    `Generado: ${new Date().toLocaleString()}`
  ].join('   ·   ')

  const wb = new ExcelJS.Workbook()
  wb.creator = 'StockFlow'
  wb.created = new Date()
  const ws = wb.addWorksheet(hoja, {
    views: [{ state: 'frozen', ySplit: 4 }], // título + info + espacio + encabezado fijos
    pageSetup: { orientation: n > 7 ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  })

  // --- Título ---
  ws.addRow([titulo])
  ws.mergeCells(1, 1, 1, n)
  const celdaTitulo = ws.getCell(1, 1)
  celdaTitulo.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLORES.crema } }
  celdaTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.chocolate } }
  celdaTitulo.alignment = { vertical: 'middle', indent: 1 }
  ws.getRow(1).height = 30

  // --- Línea de información (filtros, fecha de generación) ---
  const filaInfo = ws.addRow([info])
  ws.mergeCells(filaInfo.number, 1, filaInfo.number, n)
  filaInfo.getCell(1).font = { size: 10, italic: true, color: { argb: COLORES.textoSuave } }
  filaInfo.getCell(1).alignment = { vertical: 'middle', indent: 1 }
  filaInfo.height = 18
  ws.addRow([]).height = 6 // separación mínima antes del encabezado

  // --- Encabezado de la tabla ---
  const header = ws.addRow(columnas.map(c => c.header))
  header.height = 22
  header.eachCell(cell => {
    cell.font = { bold: true, color: { argb: COLORES.crema } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.chocolate } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = bordes
  })
  const filaHeader = header.number

  // --- Datos ---
  let bloque = 0
  filas.forEach((fila, i) => {
    const nuevoBloque = opciones.agruparPor && i > 0 &&
      fila[opciones.agruparPor] !== filas[i - 1][opciones.agruparPor]
    if (opciones.agruparPor && (i === 0 || nuevoBloque)) bloque++
    // Con agrupación, la franja alterna por bloque (todas las filas de una
    // misma venta del mismo color); sin ella, por fila.
    const franja = opciones.agruparPor ? bloque % 2 === 0 : i % 2 === 1

    const row = ws.addRow(columnas.map(c => fila[c.key] ?? ''))
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const c = columnas[col - 1]
      cell.numFmt = FORMATOS[c.tipo] || FORMATOS.texto
      cell.alignment = { vertical: 'middle', horizontal: c.tipo === 'texto' ? 'left' : 'right' }
      cell.font = { color: { argb: opciones.colorTexto?.(fila, c.key) || COLORES.texto } }
      cell.border = nuevoBloque
        ? { ...bordes, top: { style: 'medium', color: { argb: COLORES.chocolate } } }
        : bordes
      if (franja) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.cremaSuave } }
    })
  })

  // --- Totales ---
  if (opciones.totales) {
    const row = ws.addRow(columnas.map(c => opciones.totales[c.key] ?? ''))
    row.height = 20
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const c = columnas[col - 1]
      cell.numFmt = FORMATOS[c.tipo] || FORMATOS.texto
      cell.font = { bold: true, color: { argb: opciones.colorTexto?.(opciones.totales, c.key) || COLORES.texto } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.crema } }
      cell.alignment = { vertical: 'middle', horizontal: c.tipo === 'texto' ? 'left' : 'right' }
      cell.border = { ...bordes, top: { style: 'medium', color: { argb: COLORES.chocolate } } }
    })
  }

  // --- Anchos de columna: el indicado, o según el contenido más largo ---
  columnas.forEach((c, idx) => {
    const largo = Math.max(
      String(c.header).length,
      ...filas.map(f => {
        const v = f[c.key]
        return typeof v === 'number' ? v.toFixed(2).length + 3 : String(v ?? '').length
      })
    )
    ws.getColumn(idx + 1).width = c.ancho || Math.min(Math.max(largo + 3, 10), 45)
  })

  // Filtro desplegable en el encabezado (sin incluir la fila de totales)
  ws.autoFilter = {
    from: { row: filaHeader, column: 1 },
    to: { row: filaHeader + filas.length, column: n }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${archivo}_${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
