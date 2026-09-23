import { supabase } from '../lib/supabaseClient'

export const getVentasDiarias = async () => {
  return await supabase.from('v_ventas_diarias').select('*').limit(31)
}

export const getVentasMensuales = async () => {
  return await supabase.from('v_ventas_mensuales').select('*').limit(12)
}

// Trae cada venta con sus items (producto, cantidad, precio) para el reporte detallado
export const getVentasDetalle = async (desde, hasta) => {
  let query = supabase
    .from('sales')
    .select(`
      id, created_at, payment_method, status, total,
      customers(name),
      sale_items(quantity, unit_price, unit_cost, products(name, sku))
    `)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  if (desde) query = query.gte('created_at', desde)
  if (hasta) query = query.lte('created_at', hasta + 'T23:59:59')

  return await query
}

// Trae cada item de venta con su categoría, fecha y cajera (sales.user_id),
// filtrable por rango, categoría y cajera
export const getVentasDetalladoFiltrado = async (desde, hasta, categoriaId, cajeraId) => {
  let query = supabase
    .from('sale_items')
    .select(`
      quantity, unit_price, unit_cost,
      products!inner(name, sku, category_id, categories(name)),
      sales!inner(id, created_at, status, payment_method, user_id, customers(name), profiles(full_name))
    `)
    .eq('sales.status', 'completed')

  if (categoriaId) query = query.eq('products.category_id', categoriaId)
  if (cajeraId) query = query.eq('sales.user_id', cajeraId)
  if (desde) query = query.gte('sales.created_at', desde)
  if (hasta) query = query.lte('sales.created_at', hasta + 'T23:59:59')

  return await query
}