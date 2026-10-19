import { supabase } from '../lib/supabaseClient'

export const getCustomers = async () => {
  return await supabase.from('customers').select('*').order('name')
}

// note solo se envía si trae texto (motivo del cambio de total en el punto de venta)
export const createSale = async ({ customer_id, user_id, payment_method, shift_id, note }) => {
  const nota = note?.trim()
  return await supabase
    .from('sales')
    .insert({
      customer_id: customer_id || null,
      user_id,
      payment_method,
      shift_id,
      ...(nota && { note: nota })
    })
    .select()
    .single()
}

// El trigger fn_apply_sale_item descuenta stock y suma sales.total automáticamente
export const addSaleItem = async ({ sale_id, product_id, warehouse_id, quantity, unit_price, unit_cost }) => {
  return await supabase
    .from('sale_items')
    .insert({ sale_id, product_id, warehouse_id, quantity, unit_price, unit_cost })
    .select()
}

// Guarda los pagos de la venta (uno o varios métodos) después de insertar sus
// items. La función de Supabase valida que sumen sales.total y fija
// sales.payment_method ('mixed' si hay más de uno).
// pagos: [{ method, amount, cash_received? }]
export const registrarPagosVenta = async ({ sale_id, pagos }) => {
  return await supabase.rpc('registrar_pagos_venta', {
    p_sale_id: sale_id,
    p_pagos: pagos
  })
}

export const cancelSale = async (sale_id) => {
  return await supabase.from('sales').update({ status: 'cancelled' }).eq('id', sale_id)
}

export const getSalesReport = async (desde, hasta) => {
  let query = supabase
    .from('sales')
    .select('id, created_at, payment_method, status, total, customers(name)')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  if (desde) query = query.gte('created_at', desde)
  if (hasta) query = query.lte('created_at', hasta + 'T23:59:59')

  return await query
}

// Corrige el método de pago de una venta ya registrada (ej. se cobró en
// efectivo y se presionó Tarjeta). La función de Supabase valida permisos,
// guarda la bitácora en sale_edits y, si el turno ya cerró, recalcula su
// esperado y diferencia.
export const corregirMetodoPago = async ({ sale_id, nuevo_metodo, motivo }) => {
  return await supabase.rpc('corregir_metodo_pago', {
    p_sale_id: sale_id,
    p_nuevo: nuevo_metodo,
    p_motivo: motivo
  })
}
