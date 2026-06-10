'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
    } else {
      router.push('/inicio')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Fit<span className="text-[#F5C518]">Pro</span> IA</h1>
          <p className="text-gray-500 mt-2 text-sm">Tu plataforma de fitness inteligente</p>
        </div>

        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full bg-[#222] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#F5C518] transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full bg-[#222] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#F5C518] transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#F5C518] hover:bg-[#e6b800] text-black font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>

          <p className="text-center text-xs text-gray-500">
            ¿No tienes cuenta?{' '}
            <a href="/registro" className="text-[#F5C518] hover:underline">Regístrate gratis</a>
          </p>
        </div>
      </div>
    </div>
  )
}