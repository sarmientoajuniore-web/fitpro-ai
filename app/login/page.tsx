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
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(225,29,42,0.12) 0%, transparent 60%), #FFFFFF' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/caricaturas/poroto-logo.png" alt="PorotoFit" className="mx-auto pointer-events-none select-none" style={{ height: 190, width: 'auto' }} />
          <p className="text-[#787f70] mt-3 text-sm">Tu plataforma de fitness inteligente</p>
        </div>

        <div className="bg-white border border-black/10 rounded-2xl p-6 flex flex-col gap-4" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
          <div>
            <label className="text-xs text-[#5d6358] uppercase tracking-wider mb-1 block">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full bg-[#F7F7F8] border border-black/10 rounded-xl px-4 py-3 text-[#1b201a] text-sm outline-none focus:border-[#E11D2A] transition-colors placeholder-[#9ba192]"
            />
          </div>

          <div>
            <label className="text-xs text-[#5d6358] uppercase tracking-wider mb-1 block">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full bg-[#F7F7F8] border border-black/10 rounded-xl px-4 py-3 text-[#1b201a] text-sm outline-none focus:border-[#E11D2A] transition-colors placeholder-[#9ba192]"
            />
          </div>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full text-white font-bold py-3 rounded-xl text-sm transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #E11D2A, #B3121D)',
              boxShadow: '0 0 20px rgba(225,29,42,0.30)',
            }}
          >
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>

          <p className="text-center text-xs text-[#787f70]">
            ¿No tienes cuenta?{' '}
            <a href="/registro" className="text-[#E11D2A] font-semibold hover:underline">Regístrate gratis</a>
          </p>
        </div>
      </div>
    </div>
  )
}
