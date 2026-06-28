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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('edad, peso_kg, altura_cm')
      .eq('id', data.user.id)
      .maybeSingle()

    const incompleto = !perfil || perfil.edad === null || perfil.peso_kg === null || perfil.altura_cm === null
    router.push(incompleto ? '/onboarding' : '/inicio')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(123, 47, 247, 0.18) 0%, transparent 65%), #0a0a0a' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Fit<span className="text-[#B57BFF]">Pro</span> JS</h1>
          <p className="text-gray-500 mt-2 text-sm">Tu plataforma de fitness inteligente</p>
        </div>

        <div className="bg-[#110d1a] border border-[#B57BFF]/20 rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full bg-[#15101f] border border-[#B57BFF]/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#B57BFF] transition-colors placeholder-gray-600"
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
              className="w-full bg-[#15101f] border border-[#B57BFF]/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#B57BFF] transition-colors placeholder-gray-600"
            />
          </div>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full text-white font-bold py-3 rounded-xl text-sm transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #B57BFF, #7B2FF7)',
              boxShadow: '0 0 20px rgba(181, 123, 255, 0.35)',
            }}
          >
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>

          <p className="text-center text-xs text-gray-500">
            ¿No tienes cuenta?{' '}
            <a href="/registro" className="text-[#B57BFF] hover:underline">Regístrate gratis</a>
          </p>
        </div>
      </div>
    </div>
  )
}
