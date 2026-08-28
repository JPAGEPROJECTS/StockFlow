import { supabase } from '../lib/supabaseClient'

// La vista v_stock_por_almacen no trae price ni stock_min (Inventario.jsx los necesita
// para "stock bajo" y "valor total en inventario"), y usa product_name/quantity en vez
// de name/stock. Por eso combinamos la vista con products y remapeamos los campos.
export const getProducts = async () => {
  const [{ data: stockView, error: viewError }, { data: products, error: prodError }] =
    await Promise.all([
      supabase.from('v_stock_por_almacen').select('*').order('product_name'),
      supabase.from('products').select('id, price, stock_min')
    ])

  const error = viewError || prodError
  if (error) return { data: null, error }

  const infoPorProducto = new Map(products.map(p => [p.id, p]))

  const data = stockView.map(row => {
    const info = infoPorProducto.get(row.product_id) || {}
    return {
      product_id: row.product_id,
      warehouse_id: row.warehouse_id,
      warehouse_name: row.warehouse_name,
      sku: row.sku,
      name: row.product_name,
      stock: row.quantity,
      price: info.price,
      stock_min: info.stock_min
    }
  })

  return { data, error: null }
}

export const getWarehouses = async () => {
  return await supabase.from('warehouses').select('*')
}

export const getCategories = async () => {
  return await supabase.from('categories').select('*')
}

// Trae el producto completo (incluye cost y category_id, que la fila aplanada
// de getProducts no tiene) para poder precargar el formulario al editar.
export const getProduct = async (id) => {
  return await supabase.from('products').select('*').eq('id', id).single()
}

export const createProduct = async (product) => {
  return await supabase
    .from('products')
    .insert({
      ...product,
      price: Number(product.price),
      cost: Number(product.cost) || 0,
      stock_min: Number(product.stock_min) || 0
    })
    .select()
    .single()
}

export const updateProduct = async (id, updates) => {
  return await supabase
    .from('products')
    .update({
      ...updates,
      price: Number(updates.price),
      cost: Number(updates.cost) || 0,
      stock_min: Number(updates.stock_min) || 0
    })
    .eq('id', id)
    .select()
}

export const deactivateProduct = async (id) => {
  return await supabase.from('products').update({ is_active: false }).eq('id', id)
}

// ProductModal.jsx llama a esta función con { movement_type, note }, no { type, reason }.
// El check chk_quantity_sign exige quantity > 0 salvo para 'adjustment'.
export const registerMovement = async ({ product_id, warehouse_id, movement_type, quantity, note }) => {
  return await supabase
    .from('inventory_movements')
    .insert({
      product_id,
      warehouse_id,
      type: movement_type,
      quantity,
      reason: note
    })
    .select()
}

// inventory_movements tiene dos FKs hacia warehouses (warehouse_id y warehouse_to_id),
// así que hay que indicarle a PostgREST cuál usar con !warehouse_id, o el embed falla
// con "more than one relationship was found".
export const getMovements = async (product_id) => {
  return await supabase
    .from('inventory_movements')
    .select('*, warehouses!warehouse_id(name)')
    .eq('product_id', product_id)
    .order('created_at', { ascending: false })
}

// v_stock_por_almacen es un cross join + left join, así que PostgREST no puede detectar
// una relación FK hacia products/categories desde ahí: un embed products!inner(...) sobre
// esa vista falla con "Could not find a relationship...". Por eso consultamos inventory
// directamente, que sí tiene FKs reales hacia products y warehouses, y aplanamos el
// resultado para que sea consistente con el resto del servicio.
export const getProductsForSale = async () => {
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      quantity,
      product_id,
      warehouse_id,
      warehouses(name),
      products!inner(sku, name, price, cost, stock_min, category_id, is_active, categories(name))
    `)
    .gt('quantity', 0)
    .eq('products.is_active', true)
    .order('name', { foreignTable: 'products' })

  if (error) return { data: null, error }

  const mapped = data
    .filter(row => row.products)
    .map(row => ({
      product_id: row.product_id,
      warehouse_id: row.warehouse_id,
      warehouse_name: row.warehouses?.name ?? '',
      sku: row.products.sku,
      name: row.products.name,
      price: row.products.price,
      cost: row.products.cost,
      stock_min: row.products.stock_min,
      category_id: row.products.category_id,
      category_name: row.products.categories?.name ?? null,
      quantity: row.quantity
    }))

  return { data: mapped, error: null }
}