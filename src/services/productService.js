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

// Para la página /categorias: incluye cuántos productos usan cada una,
// para poder avisar antes de borrar una que sigue en uso. products(count)
// es un embed de PostgREST vía la FK products.category_id -> categories.id.
export const getCategoriesConCantidad = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, created_at, products(count)')
    .order('name')
  if (error) return { data: null, error }

  const mapped = data.map(c => ({
    id: c.id,
    name: c.name,
    created_at: c.created_at,
    product_count: c.products?.[0]?.count ?? 0
  }))
  return { data: mapped, error: null }
}

export const createCategory = async (name) => {
  return await supabase.from('categories').insert({ name }).select().single()
}

export const updateCategory = async (id, name) => {
  return await supabase.from('categories').update({ name }).eq('id', id).select().single()
}

// categories.id tiene "on delete set null" en products.category_id, así
// que borrar una categoría no borra productos: solo los deja "Sin
// categoría".
export const deleteCategory = async (id) => {
  return await supabase.from('categories').delete().eq('id', id)
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

// Se llama con { movement_type, note }, no { type, reason } (los nombres
// que de verdad usa la tabla), para que el resto del código no tenga que
// conocer esos nombres. El check chk_quantity_sign exige quantity > 0
// salvo para 'adjustment', donde quantity es un DELTA (puede ser
// negativo) que fn_apply_inventory_movement suma al stock actual — no es
// el stock final. warehouse_to_id solo aplica (y es obligatorio) para
// 'transfer', por chk_transfer_target.
export const registerMovement = async ({ product_id, warehouse_id, warehouse_to_id, movement_type, quantity, note }) => {
  return await supabase
    .from('inventory_movements')
    .insert({
      product_id,
      warehouse_id,
      warehouse_to_id: warehouse_to_id || null,
      type: movement_type,
      quantity,
      reason: note
    })
    .select()
}

// Stock actual de un producto en un almacén puntual. inventory no tiene
// fila hasta el primer movimiento ahí, así que sin ese producto/almacén
// devuelve 0 en vez de null (maybeSingle no truena si no hay fila).
export const getStock = async (product_id, warehouse_id) => {
  const { data, error } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('product_id', product_id)
    .eq('warehouse_id', warehouse_id)
    .maybeSingle()
  if (error) return { data: null, error }
  return { data: data?.quantity ?? 0, error: null }
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