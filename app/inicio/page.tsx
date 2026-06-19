'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const OBJETIVO_LABEL: Record<string, string> = {
  // Objetivo simplificado actual
  bajar:    'Bajar de peso',
  mantener: 'Mantenerme',
  subir:    'Subir de peso',
  // Compatibilidad con perfiles creados antes de simplificar el onboarding
  deficit_leve:     'Bajar de peso',
  deficit_moderado: 'Bajar de peso',
  deficit_agresivo: 'Bajar de peso',
  mantenimiento:    'Mantenerme',
  superavit_leve:   'Subir de peso',
  superavit:        'Subir de peso',
}

type Perfil = {
  nombre_completo: string | null
  edad: number | null
  peso_kg: number | null
  altura_cm: number | null
  tdee: number | null
  calorias_objetivo: number | null
  objetivo: string | null
  proteina_objetivo: number | null
  carbos_objetivo: number | null
  grasas_objetivo: number | null
}

type Consumo = { calorias: number; proteina: number; carbos: number; grasas: number }

function Barra({ consumido, meta, color }: { consumido: number; meta: number; color: string }) {
  const pct = meta > 0 ? Math.min((consumido / meta) * 100, 100) : 0
  const excedido = consumido > meta
  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${excedido ? 'bg-red-500' : color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function InicioPage() {
  const router = useRouter()
  const [perfil, setPerfil]   = useState<Perfil | null>(null)
  const [consumo, setConsumo] = useState<Consumo>({ calorias: 0, proteina: 0, carbos: 0, grasas: 0 })
  const [listo, setListo]     = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const hoy = new Date().toISOString().split('T')[0]

      const [{ data: perfilData }, { data: comidas }] = await Promise.all([
        supabase
          .from('perfiles')
          .select('nombre_completo, edad, peso_kg, altura_cm, tdee, calorias_objetivo, objetivo, proteina_objetivo, carbos_objetivo, grasas_objetivo')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('registro_comidas')
          .select('calorias, proteina, carbos, grasas')
          .eq('user_id', user.id)
          .eq('fecha', hoy),
      ])

      if (!perfilData || perfilData.edad === null || perfilData.peso_kg === null || perfilData.altura_cm === null) {
        router.replace('/onboarding')
        return
      }

      setPerfil(perfilData)

      if (comidas && comidas.length > 0) {
        setConsumo({
          calorias: comidas.reduce((s, r) => s + (r.calorias ?? 0), 0),
          proteina: comidas.reduce((s, r) => s + (r.proteina ?? 0), 0),
          carbos:   comidas.reduce((s, r) => s + (r.carbos   ?? 0), 0),
          grasas:   comidas.reduce((s, r) => s + (r.grasas   ?? 0), 0),
        })
      }

      setListo(true)
    }
    init()
  }, [router])

  if (!listo) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#F5C518] border-t-transparent animate-spin" />
      </div>
    )
  }

  const nombre   = perfil?.nombre_completo?.split(' ')[0] ?? ''
  const tdee     = perfil?.tdee?.toLocaleString() ?? '—'
  const kcal     = perfil?.calorias_objetivo?.toLocaleString() ?? '—'
  const objLabel = perfil?.objetivo ? (OBJETIVO_LABEL[perfil.objetivo] ?? 'Personalizado') : '—'
  const metaCal  = perfil?.calorias_objetivo  ?? 0
  const metaPro  = perfil?.proteina_objetivo  ?? 0
  const metaCarb = perfil?.carbos_objetivo    ?? 0
  const metaGra  = perfil?.grasas_objetivo    ?? 0

  const calRestantes = metaCal - Math.round(consumo.calorias)
  const calExcedido = consumo.calorias > metaCal

  const macros = [
    { lbl: 'Proteína',      con: Math.round(consumo.proteina), meta: metaPro,  color: 'bg-blue-500',   text: 'text-blue-400'   },
    { lbl: 'Carbohidratos', con: Math.round(consumo.carbos),   meta: metaCarb, color: 'bg-[#F5C518]',  text: 'text-[#F5C518]'  },
    { lbl: 'Grasas',        con: Math.round(consumo.grasas),   meta: metaGra,  color: 'bg-orange-500', text: 'text-orange-400' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-lg mx-auto p-5">

        {/* HEADER */}
        <div className="flex items-center justify-between py-4 mb-4 border-b border-white/10">
          <h1 className="text-xl font-bold">Fit<span className="text-[#F5C518]">Pro</span> JS</h1>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            className="text-xs text-gray-400 hover:text-white transition-colors">
            Cerrar sesión
          </button>
        </div>

        {/* BIENVENIDA */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#1c1a00] border border-[#F5C518]/20 rounded-2xl p-5 mb-4">
          <h2 className="text-2xl font-bold mb-1">¡Hola, {nombre}! 💪</h2>
          <p className="text-gray-500 text-sm mb-4">Tu plataforma de fitness inteligente está lista</p>
          {/* Calorías meta */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-base font-bold text-white">{tdee}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Mantenimiento</div>
            </div>
            <div className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-base font-bold text-[#F5C518]">{kcal}</div>
              <div className="text-[10px] text-[#F5C518]/60 mt-1">{objLabel}</div>
            </div>
          </div>
          {/* Macros meta */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: metaPro,  lbl: 'Proteína',      color: 'text-blue-400'   },
              { val: metaCarb, lbl: 'Carbohidratos', color: 'text-[#F5C518]'  },
              { val: metaGra,  lbl: 'Grasas',        color: 'text-orange-400' },
            ].map(({ val, lbl, color }) => (
              <div key={lbl} className="bg-black/30 rounded-xl p-3 text-center">
                <div className={`text-base font-bold ${color}`}>{val > 0 ? `${val}g` : '—'}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* HOY */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Hoy</p>

          {/* Calorías del día */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Te quedan hoy</p>
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className={`text-5xl font-black tracking-tight ${calExcedido ? 'text-red-400' : 'text-[#F5C518]'}`}>
                {calRestantes.toLocaleString()}
              </span>
              <span className="text-lg font-semibold text-gray-400">kcal</span>
            </div>

            <div className="flex items-end justify-between mb-1">
              <span className="text-xs text-gray-500">
                {Math.round(consumo.calorias).toLocaleString()} / {metaCal.toLocaleString()} kcal
              </span>
            </div>
            <Barra consumido={consumo.calorias} meta={metaCal} color="bg-[#F5C518]" />
          </div>

          {/* Macros del día */}
          <div className="flex flex-col gap-3">
            {macros.map(({ lbl, con, meta, color, text }) => {
              const excedido = con > meta
              const quedan = Math.max(meta - con, 0)
              return (
                <div key={lbl}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">{lbl}</span>
                    <span className={`text-xs font-medium ${excedido ? 'text-red-400' : 'text-gray-500'}`}>
                      <span className={text}>{con}g</span>
                      {' / '}{meta}g
                      {excedido
                        ? <span className="text-red-400"> · +{con - meta}g</span>
                        : <span className="text-gray-600"> · quedan {quedan}g</span>}
                    </span>
                  </div>
                  <Barra consumido={con} meta={meta} color={color} />
                </div>
              )
            })}
          </div>
        </div>

        {/* ACCESO RÁPIDO */}
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Módulos</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { emoji: '🥗', title: 'Nutrición',  sub: 'Registro de comidas',  href: '/nutricion'  },
            { emoji: '📋', title: 'Rutinas',    sub: 'Mis entrenamientos',   href: '/rutinas'    },
            { emoji: '📈', title: 'Progreso',   sub: 'Seguimiento corporal', href: '/progreso'   },
          ].map(({ emoji, title, sub, href }) => (
            <a key={href} href={href}
              className="bg-[#1a1a1a] border border-white/8 rounded-xl p-4 hover:border-white/20 transition-colors">
              <div className="text-2xl mb-2">{emoji}</div>
              <div className="text-sm font-semibold text-white mb-1">{title}</div>
              <div className="text-xs text-gray-500">{sub}</div>
            </a>
          ))}
        </div>

      </div>
    </div>
  )
}
