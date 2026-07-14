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
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(225,29,42,0.12) 0%, transparent 60%), #FFFFFF' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/caricaturas/poroto-logo.webp" alt="PorotoFit" className="mx-auto pointer-events-none select-none" style={{ height: 190, width: 'auto' }} />
          <p className="text-[#787f70] mt-3 text-sm">Crea tu cuenta gratis</p>
        </div>
        <div className="bg-white border border-black/10 rounded-2xl p-6 flex flex-col gap-4" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
          <div>
            <label className="text-xs text-[#5d6358] uppercase tracking-wider mb-1 block">Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com"
              className="w-full bg-[#F7F7F8] border border-black/10 rounded-xl px-4 py-3 text-[#1b201a] text-sm outline-none focus:border-[#E11D2A] transition-colors placeholder-[#9ba192]" />
          </div>
          <div>
            <label className="text-xs text-[#5d6358] uppercase tracking-wider mb-1 block">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
              className="w-full bg-[#F7F7F8] border border-black/10 rounded-xl px-4 py-3 text-[#1b201a] text-sm outline-none focus:border-[#E11D2A] transition-colors placeholder-[#9ba192]" />
          </div>
          <div>
            <label className="text-xs text-[#5d6358] uppercase tracking-wider mb-1 block">Teléfono</label>
            <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegistro()}
              placeholder="+56 9 1234 5678"
              className="w-full bg-[#F7F7F8] border border-black/10 rounded-xl px-4 py-3 text-[#1b201a] text-sm outline-none focus:border-[#E11D2A] transition-colors placeholder-[#9ba192]" />
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <div className="relative mt-0.5 shrink-0" onClick={() => setPrivacidad(v => !v)}>
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  privacidad ? 'border-[#E11D2A] bg-[#E11D2A]' : 'border-black/25 bg-[#F7F7F8]'
                }`}
              >
                {privacidad && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs text-[#5d6358] leading-relaxed" onClick={() => setPrivacidad(v => !v)}>
              Acepto el{' '}
              <a href="/privacidad" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[#E11D2A] underline">aviso de privacidad</a>
              {' '}y el tratamiento de mis datos
            </span>
          </label>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button onClick={handleRegistro} disabled={loading}
            className="w-full text-white font-bold py-3 rounded-xl text-sm transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #E11D2A, #B3121D)',
              boxShadow: '0 0 20px rgba(225,29,42,0.30)',
            }}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
          </button>
          <p className="text-center text-xs text-[#787f70]">
            ¿Ya tienes cuenta?{' '}
            <a href="/login" className="text-[#E11D2A] font-semibold hover:underline">Inicia sesión</a>
          </p>
        </div>
      </div>
    </div>
  )
}
