import { supabase } from '../lib/supabaseClient'

export const getVentasDiarias = async () => {
  return await supabase.from('v_ventas_diarias').select('*').limit(31)
}

export const getVentasMensuales = async () => {
  return await supabase.from('v_ventas_mensuales').select('*').limit(12)
}

export const getVentasDetalle = async (desde, hasta) => {
  let query = supabase
    .from('sales')
    .select('id, created_at, payment_method, status, total, customers(name)')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  if (desde) query = query.gte('created_at', desde)
  if (hasta) query = query.lte('created_at', hasta + 'T23:59:59')

  return await query
}