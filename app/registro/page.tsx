'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegistroPage() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [privacidad, setPrivacidad] = useState(false)
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
    if (!privacidad) {
      setError('Debes aceptar el aviso de privacidad para continuar')
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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(123, 47, 247, 0.18) 0%, transparent 65%), #0a0a0a' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Fit<span className="text-[#B57BFF]">Pro</span> JS</h1>
          <p className="text-gray-500 mt-2 text-sm">Crea tu cuenta gratis</p>
        </div>
        <div className="bg-[#110d1a] border border-[#B57BFF]/20 rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Nombre completo</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Junior Sarmiento"
              className="w-full bg-[#15101f] border border-[#B57BFF]/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#B57BFF] transition-colors placeholder-gray-600" />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com"
              className="w-full bg-[#15101f] border border-[#B57BFF]/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#B57BFF] transition-colors placeholder-gray-600" />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRegistro()} placeholder="Mínimo 6 caracteres"
              className="w-full bg-[#15101f] border border-[#B57BFF]/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#B57BFF] transition-colors placeholder-gray-600" />
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <div className="relative mt-0.5 shrink-0" onClick={() => setPrivacidad(v => !v)}>
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  privacidad ? 'border-[#B57BFF] bg-[#B57BFF]' : 'border-[#B57BFF]/40 bg-[#15101f]'
                }`}
              >
                {privacidad && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs text-gray-400 leading-relaxed" onClick={() => setPrivacidad(v => !v)}>
              Acepto el aviso de privacidad y el tratamiento de mis datos
            </span>
          </label>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button onClick={handleRegistro} disabled={loading}
            className="w-full text-white font-bold py-3 rounded-xl text-sm transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #B57BFF, #7B2FF7)',
              boxShadow: '0 0 20px rgba(181, 123, 255, 0.35)',
            }}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
          </button>
          <p className="text-center text-xs text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <a href="/login" className="text-[#B57BFF] hover:underline">Inicia sesión</a>
          </p>
        </div>
      </div>
    </div>
  )
}
