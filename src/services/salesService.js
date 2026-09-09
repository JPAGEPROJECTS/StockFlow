import { supabase } from '../lib/supabaseClient'

export const getCustomers = async () => {
  return await supabase.from('customers').select('*').order('name')
}

export const createSale = async ({ customer_id, user_id, payment_method, shift_id }) => {
  return await supabase
    .from('sales')
    .insert({ customer_id: customer_id || null, user_id, payment_method, shift_id })
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