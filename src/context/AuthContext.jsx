import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState(null)
  // Rol del usuario con sesión (de profiles), para ocultar pantallas según
  // el rol. undefined = todavía cargando; null = sin perfil.
  const [role, setRole] = useState(undefined)

  useEffect(() => {
    // 1. Obtener sesión actual
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) setInitError(error.message)
        else setSession(session)
      })
      .catch(err => setInitError(err.message))
      .finally(() => setLoading(false))

    // 2. Escuchar cambios de estado
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  // Se pide fuera de onAuthStateChange: hacer consultas dentro de ese
  // callback puede bloquear el cliente de Supabase.
  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) {
      setRole(undefined)
      return
    }
    let cancelado = false
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
      .then(({ data }) => { if (!cancelado) setRole(data?.role ?? null) })
    return () => { cancelado = true }
  }, [userId])

  const login = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const logout = () => supabase.auth.signOut()

  if (initError) {
    return (
      <div style={{ padding: '2rem', color: 'red', fontFamily: 'sans-serif' }}>
        <h2>Error de inicialización en Auth:</h2>
        <p>{initError}</p>
        <p><small>Revisa que las credenciales en tu .env sean correctas.</small></p>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ session, role, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)