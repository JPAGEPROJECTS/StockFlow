// Métodos con los que se puede cobrar (valores de payment_method_enum)
export const METODOS_PAGO = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' }

// 'mixed' solo existe como resumen en sales.payment_method (venta con varios pagos)
export const etiquetaMetodo = (metodo) =>
  metodo === 'mixed' ? 'Mixto' : (METODOS_PAGO[metodo] ?? metodo)

// Pagos de una venta. Si no tiene filas en sale_payments (ventas que no
// pasaron por registrar_pagos_venta), se toma su método y total completos,
// igual que efectivo_ventas_turno() en Supabase.
export const pagosDeVenta = (venta) =>
  venta.sale_payments?.length
    ? venta.sale_payments.map(p => ({ method: p.method, amount: Number(p.amount) }))
    : [{ method: venta.payment_method, amount: Number(venta.total) }]
