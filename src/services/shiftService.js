import { supabase } from '../lib/supabaseClient'

export const getCashRegisters = async () => {
  return await supabase.from('cash_registers').select('*').order('name')
}

// Turno abierto actualmente por el usuario logueado (si existe).
// limit(1) evita que maybeSingle() truene si quedaron turnos abiertos
// duplicados; se toma el más reciente.
export const getTurnoActivo = async (user_id) => {
  return await supabase
    .from('shifts')
    .select('*, cash_registers(name)')
    .eq('user_id', user_id)
    .eq('status', 'abierto')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()
}

// Sin .single(): si el turno es para otra cajera, RLS puede no dejar
// leer la fila recién insertada y single() fallaría aunque el insert sí se hizo.
export const abrirTurno = async ({ cash_register_id, user_id, opening_amount }) => {
  return await supabase
    .from('shifts')
    .insert({ cash_register_id, user_id, opening_amount, status: 'abierto' })
    .select()
}

// Calcula lo esperado en caja (apertura + ventas en efectivo del turno) antes de cerrar
export const getResumenParaCierre = async (shift_id) => {
  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select('opening_amount')
    .eq('id', shift_id)
    .single()
  if (shiftError) return { data: null, error: shiftError }

  const { data: ventas, error: ventasError } = await supabase
    .from('sales')
    .select('total, payment_method')
    .eq('shift_id', shift_id)
    .eq('status', 'completed')
  if (ventasError) return { data: null, error: ventasError }

  const { data: movimientos, error: movError } = await supabase
    .from('cash_movements')
    .select('type, amount')
    .eq('shift_id', shift_id)
  if (movError) return { data: null, error: movError }

  const ventasEfectivo = ventas
    .filter(v => v.payment_method === 'cash')
    .reduce((s, v) => s + Number(v.total), 0)

  const totalVentas = ventas.reduce((s, v) => s + Number(v.total), 0)

  const ingresos = movimientos.filter(m => m.type === 'ingreso').reduce((s, m) => s + Number(m.amount), 0)
  const egresos = movimientos.filter(m => m.type === 'egreso').reduce((s, m) => s + Number(m.amount), 0)

  const expected = Number(shift.opening_amount) + ventasEfectivo + ingresos - egresos

  return {
    data: {
      opening_amount: Number(shift.opening_amount),
      ventasEfectivo,
      totalVentas,
      numVentas: ventas.length,
      ingresos,
      egresos,
      expected
    },
    error: null
  }
}

export const cerrarTurno = async ({ shift_id, closing_amount, expected_amount, notes }) => {
  return await supabase
    .from('shifts')
    .update({
      status: 'cerrado',
      closing_amount,
      expected_amount,
      difference: closing_amount - expected_amount,
      closed_at: new Date().toISOString(),
      notes
    })
    .eq('id', shift_id)
    .select()
}

export const registrarMovimiento = async ({ shift_id, type, amount, reason, created_by }) => {
  return await supabase
    .from('cash_movements')
    .insert({ shift_id, type, amount, reason, created_by })
    .select()
}

export const getMovimientos = async (shift_id) => {
  return await supabase
    .from('cash_movements')
    .select('*')
    .eq('shift_id', shift_id)
    .order('created_at', { ascending: false })
}

export const getHistorialTurnos = async (desde, hasta) => {
  let query = supabase
    .from('v_turnos_resumen')
    .select('*')
    .order('opened_at', { ascending: false })

  if (desde) query = query.gte('opened_at', desde)
  if (hasta) query = query.lte('opened_at', hasta + 'T23:59:59')

  return await query
}

