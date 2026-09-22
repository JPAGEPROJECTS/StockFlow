import { supabase } from '../lib/supabaseClient'

export const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'employee', label: 'Vendedor/Cajero' }
]

// Log centralizado del módulo: cada función registra sus errores acá con
// el mismo formato para poder filtrar por "[userService]" en devtools.
const logError = (op, error, context) => {
  console.error(`[userService] ${op} falló`, { message: error.message, status: error.status, code: error.code, ...context })
}

export const getUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active, created_at')
    .order('full_name')
  if (error) logError('getUsers', error)
  return { data, error }
}

// No existe tabla `users`: las cuentas viven en auth.users, y el trigger
// handle_new_user (schema_tienda.sql, 9.2) crea automáticamente la fila en
// profiles con role='employee' e is_active=false al hacer signUp. Por
// diseño del schema (9.2/9.4), un admin NO crea cuentas ajenas con
// contraseña -eso requeriría la service role key, que no está en el
// frontend-: cada usuario se registra con su propia contraseña desde
// /registro (sin sesión de admin de por medio) y luego un admin lo
// aprueba (is_active) y le asigna el rol aquí en /usuarios.
export const registerUser = async ({ full_name, email, password }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } }
  })

  if (error) {
    logError('registerUser', error, { email })

    // GoTrue (el servicio de auth de Supabase) limita cuántos correos de
    // confirmación puede enviar por hora con su SMTP compartido (2-4/hora
    // en free tier). No es un bug del formulario: se arregla configurando
    // un SMTP propio o desactivando "Confirm email" en el dashboard de
    // Supabase (Authentication > Emails / Rate Limits), o esperando a que
    // se libere la cuota.
    if (error.code === 'over_email_send_rate_limit') {
      return {
        data: null,
        error: new Error('Se alcanzó el límite de correos de confirmación de Supabase. Espera antes de registrar otra cuenta, o configura un SMTP propio en el dashboard.')
      }
    }
    if (error.status === 429) {
      return {
        data: null,
        error: new Error('Demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo.')
      }
    }
    return { data: null, error }
  }

  // Por seguridad, Supabase no marca error si el correo ya está
  // registrado (evita filtrar qué correos existen): devuelve un user
  // con identities: [] en vez de una cuenta nueva.
  if (data.user && data.user.identities?.length === 0) {
    const err = new Error('Ya existe una cuenta con ese correo.')
    logError('registerUser', err, { email, reason: 'identities vacío' })
    return { data: null, error: err }
  }

  // Con "Confirm email" desactivado en el proyecto de Supabase, signUp
  // deja al navegador logueado de inmediato con la cuenta recién creada,
  // aunque is_active siga en false. App.jsx solo revisa si hay session
  // (no si el perfil está aprobado), así que sin este signOut el usuario
  // quedaría "adentro" con todo bloqueado por RLS hasta que un admin lo
  // apruebe. Si el proyecto sí pide confirmación de correo, signUp no
  // devuelve sesión y este signOut es un no-op inofensivo.
  await supabase.auth.signOut()

  return { data: data.user, error: null }
}

// El correo y la contraseña viven en auth.users y editarlos ahí requiere
// la service role key (no disponible en el frontend), así que solo se
// actualizan los campos que sí pertenecen a profiles.
export const updateUser = async (id, { full_name, role, is_active }) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name, role, is_active })
    .eq('id', id)
    .select()
    .single()
  if (error) logError('updateUser', error, { id })
  return { data, error }
}

// Activar/desactivar rápido desde la tabla, sin abrir el modal completo.
export const setUserActive = async (id, is_active) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active })
    .eq('id', id)
    .select()
    .single()
  if (error) logError('setUserActive', error, { id, is_active })
  return { data, error }
}

// Borra la fila de profiles (permitido por la policy profiles_admin_delete).
// La cuenta de auth.users queda huérfana, pero sin perfil ninguna policy
// basada en current_user_role()/current_user_active() la deja usar la app.
export const deleteUser = async (id) => {
  const { data, error } = await supabase.from('profiles').delete().eq('id', id)
  if (error) logError('deleteUser', error, { id })
  return { data, error }
}
