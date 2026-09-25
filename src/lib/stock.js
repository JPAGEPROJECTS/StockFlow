// Estado del stock por producto. getProducts() devuelve una fila por producto y
// almacén, así que se suman todos los almacenes de cada producto antes de decidir
// si está agotado, en stock bajo o bien.
// Devuelve Map(product_id → { estado: 'agotado' | 'bajo' | 'ok', stock, stock_min, fila })
export const resumenStockPorProducto = (filas) => {
  const resumen = new Map()
  filas.forEach(f => {
    const actual = resumen.get(f.product_id) ?? { stock: 0, stock_min: f.stock_min ?? 0, fila: f }
    resumen.set(f.product_id, { ...actual, stock: actual.stock + (f.stock ?? 0) })
  })
  resumen.forEach((r, id) => {
    resumen.set(id, { ...r, estado: r.stock === 0 ? 'agotado' : r.stock <= r.stock_min ? 'bajo' : 'ok' })
  })
  return resumen
}
