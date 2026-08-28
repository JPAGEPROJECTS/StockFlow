import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState(null)

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
    <AuthContext.Provider value={{ session, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)