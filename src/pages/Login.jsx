import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await login(email, password)
    if (error) alert(error.message)
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="p-6 bg-white rounded shadow-md w-80 space-y-4">
        <h1 className="text-xl font-bold text-center">Iniciar Sesión</h1>
        <input 
          type="email" 
          placeholder="Email" 
          value={email}
          onChange={e => setEmail(e.target.value)} 
          className="border p-2 w-full rounded" 
        />
        <input 
          type="password" 
          placeholder="Contraseña" 
          value={password}
          onChange={e => setPassword(e.target.value)} 
          className="border p-2 w-full rounded" 
        />
        <button className="bg-blue-600 text-white p-2 w-full rounded hover:bg-blue-700">
          Entrar
        </button>
      </form>
    </div>
  )
}