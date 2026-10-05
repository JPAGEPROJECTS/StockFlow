import { supabase } from '../lib/supabaseClient'

// Flujo de "¿Olvidaste tu contraseña?" con aprobación de admin/supervisor
// (parche_recuperar_password.sql). El token que devuelve la solicitud es
// la prueba de que este dispositivo la hizo: se guarda en localStorage y
// se necesita para consultar el estado y para fijar la contraseña nueva.

const STORAGE_KEY = 'stockflow_password_reset'

const logError = (op, error, context) => {
  console.error(`[passwordResetService] ${op} falló`, { message: error.message, code: error.code, ...context })
}

export const getSavedRequest = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const clearSavedRequest = () => {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* sin storage: nada que limpiar */ }
}

export const requestPasswordReset = async (email) => {
  const { data: token, error } = await supabase.rpc('request_password_reset', { p_email: email })
  if (error) {
    logError('requestPasswordReset', error, { email })
    return { error }
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, email: email.trim().toLowerCase() }))
  } catch { /* sin storage el usuario tendrá que no cerrar la pestaña */ }
  return { token, error: null }
}

export const getPasswordResetStatus = async (token) => {
  const { data, error } = await supabase.rpc('get_password_reset_status', { p_token: token })
  if (error) logError('getPasswordResetStatus', error)
  return { status: data, error }
}

export const completePasswordReset = async (token, password) => {
  const { error } = await supabase.rpc('complete_password_reset', { p_token: token, p_password: password })
  if (error) logError('completePasswordReset', error)
  else clearSavedRequest()
  return { error }
}

// --- Lado admin/supervisor ---

// La policy de la tabla solo devuelve filas a admin/supervisor activos;
// a cualquier otro rol le llega una lista vacía (no un error).
export const getPendingResetRequests = async () => {
  const { data, error } = await supabase
    .from('password_reset_requests')
    .select('id, user_id, email, full_name, created_at')
    .eq('status', 'pending')
    .order('created_at')
  if (error) logError('getPendingResetRequests', error)
  return { data: data ?? [], error }
}

export const reviewResetRequest = async (id, approve) => {
  const { error } = await supabase.rpc('review_password_reset', { p_request_id: id, p_approve: approve })
  if (error) logError('reviewResetRequest', error, { id, approve })
  return { error }
}
