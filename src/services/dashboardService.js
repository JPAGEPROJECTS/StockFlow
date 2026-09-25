import { supabase } from '../lib/supabaseClient'

// Fecha local en formato YYYY-MM-DD (no UTC), para agrupar ventas por día real de la tienda
export const claveDia = (fecha) => new Date(fecha).toLocaleDateString('en-CA')

// Inicio del día local de hace `dias` días, en ISO para filtrar en Supabase
export const inicioHaceDias = (dias) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - dias)
  return d.toISOString()
}

export const getPerfil = async (id) => {
  return await supabase.from('profiles').select('full_name').eq('id', id).maybeSingle()
}

// Ventas completadas desde una fecha, con lo necesario para KPIs, gráfica y últimas ventas.
// No se piden montos: el inicio solo muestra cantidades (ventas y piezas).
export const getVentasDesde = async (desdeISO) => {
  return await supabase
    .from('sales')
    .select('id, created_at, payment_method, sale_items(quantity, products(name))')
    .eq('status', 'completed')
    .gte('created_at', desdeISO)
    .order('created_at', { ascending: false })
}

// Productos vendidos desde una fecha, para el ranking de más vendidos
export const getItemsVendidosDesde = async (desdeISO) => {
  return await supabase
    .from('sale_items')
    .select('quantity, product_id, products(name, sku, color), sales!inner(created_at, status)')
    .eq('sales.status', 'completed')
    .gte('sales.created_at', desdeISO)
}
