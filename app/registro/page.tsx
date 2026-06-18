'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegistroPage() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegistro = async () => {
    setLoading(true)
    setError('')
    if (!nombre || !email || !password) {
      setError('Por favor completa todos los campos')
      setLoading(false)
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre_completo: nombre } }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/onboarding')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Fit<span className="text-[#F5C518]">Pro</span> JS</h1>
          <p className="text-gray-500 mt-2 text-sm">Crea tu cuenta gratis</p>
        </div>
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Nombre completo</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Junior Sarmiento"
              className="w-full bg-[#222] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#F5C518] transition-colors"/>
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com"
              className="w-full bg-[#222] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#F5C518] transition-colors"/>
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRegistro()} placeholder="Mínimo 6 caracteres"
              className="w-full bg-[#222] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#F5C518] transition-colors"/>
          </div>
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button onClick={handleRegistro} disabled={loading}
            className="w-full bg-[#F5C518] hover:bg-[#e6b800] text-black font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-50">
            {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
          </button>
          <p className="text-center text-xs text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <a href="/login" className="text-[#F5C518] hover:underline">Inicia sesión</a>
          </p>
        </div>
      </div>
    </div>
  )
}