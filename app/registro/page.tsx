'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegistroPage() {
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [telefono,   setTelefono]   = useState('')
  const [privacidad, setPrivacidad] = useState(false)
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegistro = async () => {
    setLoading(true)
    setError('')
    if (!email || !password || !telefono) {
      setError('Por favor completa todos los campos')
      setLoading(false)
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }
    if (!privacidad) {
      setError('Debes aceptar el aviso de privacidad para continuar')
      setLoading(false)
      return
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Guardar teléfono en perfiles (la fila la crea el trigger de auth)
    if (authData.user) {
      await supabase
        .from('perfiles')
        .update({ telefono: telefono.trim() })
        .eq('id', authData.user.id)
    }

    router.push('/onboarding')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(22,163,74, 0.18) 0%, transparent 65%), #F4F6F1' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1b201a]">Fit<span className="text-[#15803D]">Pro</span></h1>
          <p className="text-[#787f70] mt-2 text-sm">Crea tu cuenta gratis</p>
        </div>
        <div className="bg-[#ECEFE8] border border-[#22C55E]/20 rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <label className="text-xs text-[#5d6358] uppercase tracking-wider mb-1 block">Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com"
              className="w-full bg-[#EFF1EB] border border-[#22C55E]/20 rounded-xl px-4 py-3 text-[#1b201a] text-sm outline-none focus:border-[#22C55E] transition-colors placeholder-[#9ba192]" />
          </div>
          <div>
            <label className="text-xs text-[#5d6358] uppercase tracking-wider mb-1 block">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
              className="w-full bg-[#EFF1EB] border border-[#22C55E]/20 rounded-xl px-4 py-3 text-[#1b201a] text-sm outline-none focus:border-[#22C55E] transition-colors placeholder-[#9ba192]" />
          </div>
          <div>
            <label className="text-xs text-[#5d6358] uppercase tracking-wider mb-1 block">Teléfono</label>
            <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegistro()}
              placeholder="+56 9 1234 5678"
              className="w-full bg-[#EFF1EB] border border-[#22C55E]/20 rounded-xl px-4 py-3 text-[#1b201a] text-sm outline-none focus:border-[#22C55E] transition-colors placeholder-[#9ba192]" />
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <div className="relative mt-0.5 shrink-0" onClick={() => setPrivacidad(v => !v)}>
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  privacidad ? 'border-[#22C55E] bg-[#22C55E]' : 'border-[#22C55E]/40 bg-[#EFF1EB]'
                }`}
              >
                {privacidad && (
                  <svg className="w-3 h-3 text-[#1b201a]" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs text-[#5d6358] leading-relaxed" onClick={() => setPrivacidad(v => !v)}>
              Acepto el aviso de privacidad y el tratamiento de mis datos
            </span>
          </label>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button onClick={handleRegistro} disabled={loading}
            className="w-full text-white font-bold py-3 rounded-xl text-sm transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #16A34A, #15803D)',
              boxShadow: '0 0 20px rgba(34,197,94, 0.35)',
            }}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
          </button>
          <p className="text-center text-xs text-[#787f70]">
            ¿Ya tienes cuenta?{' '}
            <a href="/login" className="text-[#15803D] hover:underline">Inicia sesión</a>
          </p>
        </div>
      </div>
    </div>
  )
}
