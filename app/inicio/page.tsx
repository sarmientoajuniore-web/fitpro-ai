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
  nivel_actividad: string | null
}

function calcularMetaAgua(pesoKg: number | null, nivelActividad: string | null): number {
  const base = Math.round((pesoKg ?? 70) * 35)
  const extra = nivelActividad === 'alto' ? 750 : nivelActividad === 'moderado' ? 500 : 0
  return Math.round((base + extra) / 250) * 250
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
  const [mlBebidos, setMlBebidos]         = useState(0)
  const [guardandoAgua, setGuardandoAgua] = useState(false)
  const [userId, setUserId]               = useState<string>('')
  const [mlManual, setMlManual]           = useState('')
  const [permisoNotif, setPermisoNotif]   = useState<NotificationPermission>('default')
  const [recordatoriosOn, setRecordatoriosOn] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const hoy = new Date().toISOString().split('T')[0]

      const [{ data: perfilData }, { data: comidas }, { data: aguaHoy }] = await Promise.all([
        supabase
          .from('perfiles')
          .select('nombre_completo, edad, peso_kg, altura_cm, tdee, calorias_objetivo, objetivo, proteina_objetivo, carbos_objetivo, grasas_objetivo, nivel_actividad')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('registro_comidas')
          .select('calorias, proteina, carbos, grasas')
          .eq('user_id', user.id)
          .eq('fecha', hoy),
        supabase
          .from('registro_agua')
          .select('ml')
          .eq('user_id', user.id)
          .eq('fecha', hoy)
          .maybeSingle(),
      ])
      setUserId(user.id)
      if (aguaHoy) setMlBebidos(aguaHoy.ml ?? 0)

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

      // Cargar preferencia de recordatorios guardada
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermisoNotif(Notification.permission)
        const guardado = localStorage.getItem('fitpro_recordatorios') === 'true'
        setRecordatoriosOn(guardado && Notification.permission === 'granted')
      }
    }
    init()
  }, [router])

  // Programar recordatorios en el SW al activarlos o al cargar la app con ellos activos
  useEffect(() => {
    if (!listo || !recordatoriosOn || !perfil || !('serviceWorker' in navigator)) return
    const meta = calcularMetaAgua(perfil.peso_kg, perfil.nivel_actividad)
    navigator.serviceWorker.ready.then(reg => {
      reg.active?.postMessage({ type: 'SCHEDULE_WATER', mlBebidos, metaMl: meta })
    })
  // Solo re-ejecutar cuando se activan/desactivan, no en cada cambio de ml
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, recordatoriosOn])

  // Avisar al SW cada vez que cambia el agua bebida (para que sepa si ya se alcanzó la meta)
  useEffect(() => {
    if (!recordatoriosOn || !perfil || !('serviceWorker' in navigator)) return
    const meta = calcularMetaAgua(perfil.peso_kg, perfil.nivel_actividad)
    navigator.serviceWorker.ready.then(reg => {
      reg.active?.postMessage({ type: 'UPDATE_AGUA', mlBebidos, metaMl: meta })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mlBebidos])

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

  const metaAgua = calcularMetaAgua(perfil?.peso_kg ?? null, perfil?.nivel_actividad ?? null)
  const pctAgua  = metaAgua > 0 ? (mlBebidos / metaAgua) * 100 : 0

  const ajustarAgua = async (delta: number) => {
    const nuevo = Math.max(0, mlBebidos + delta)
    setMlBebidos(nuevo)
    setGuardandoAgua(true)
    const hoy = new Date().toISOString().split('T')[0]
    await supabase.from('registro_agua').upsert(
      { user_id: userId, fecha: hoy, ml: nuevo },
      { onConflict: 'user_id,fecha' }
    )
    setGuardandoAgua(false)
  }

  const activarRecordatorios = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    const permiso = await Notification.requestPermission()
    setPermisoNotif(permiso)
    if (permiso !== 'granted') return
    localStorage.setItem('fitpro_recordatorios', 'true')
    setRecordatoriosOn(true)
    // El useEffect [listo, recordatoriosOn] se dispara y programa los timers en el SW
  }

  const desactivarRecordatorios = () => {
    localStorage.setItem('fitpro_recordatorios', 'false')
    setRecordatoriosOn(false)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.active?.postMessage({ type: 'CANCEL_WATER' })
      })
    }
  }

  const aplicarManual = (signo: 1 | -1) => {
    const val = parseInt(mlManual, 10)
    if (!Number.isFinite(val) || val <= 0) return
    setMlManual('')
    ajustarAgua(signo * val)
  }

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

        {/* AGUA */}
        <div className="relative bg-gradient-to-br from-[#0c1628] to-[#151515] border border-sky-500/20 rounded-2xl p-5 mb-4 overflow-hidden">

          {/* Glow decorativo */}
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-start justify-between mb-5 relative">
            <p className="text-xs font-semibold text-sky-400/60 uppercase tracking-widest pt-0.5">Hidratación</p>
            <div className="text-right">
              <p className="text-sm font-bold text-white/70">
                {metaAgua >= 1000 ? `${(metaAgua / 1000).toFixed(1)} L` : `${metaAgua} ml`}
              </p>
              <p className="text-[10px] text-gray-600 uppercase tracking-wide">meta diaria</p>
            </div>
          </div>

          {/* Número protagonista */}
          <div className="flex items-baseline gap-2.5 mb-0.5 relative">
            <span className={`text-6xl font-black tracking-tight transition-colors duration-500 ${
              pctAgua >= 100 ? 'text-emerald-400' : 'text-sky-400'
            }`}>
              {mlBebidos >= 1000 ? (mlBebidos / 1000).toFixed(1) : mlBebidos}
            </span>
            <span className="text-2xl font-semibold text-gray-500">
              {mlBebidos >= 1000 ? 'L' : 'ml'}
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-5">
            de {metaAgua >= 1000 ? `${(metaAgua / 1000).toFixed(1)} L` : `${metaAgua} ml`}
            {' · '}{Math.floor(mlBebidos / 250)} {Math.floor(mlBebidos / 250) === 1 ? 'vaso' : 'vasos'}
          </p>

          {/* Barra de progreso gruesa con gradiente */}
          <div className="mb-1.5">
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(pctAgua, 100)}%`,
                  background: pctAgua >= 100
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : 'linear-gradient(90deg, #0369a1, #38bdf8)',
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-gray-600">{mlBebidos} ml registrados</span>
              <span className={`text-[11px] font-semibold ${pctAgua >= 100 ? 'text-emerald-400' : 'text-sky-400'}`}>
                {Math.min(Math.round(pctAgua), 100)}%
              </span>
            </div>
          </div>

          {/* Mensajes de hito */}
          {pctAgua >= 100 ? (
            <div className="mt-4 mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-center">
              <p className="text-sm font-bold text-emerald-400">🎉 ¡Felicitaciones! Cumpliste tu meta de agua hoy 💧🙌</p>
              <p className="text-xs text-gray-500 mt-0.5">Excelente hidratación. Los recordatorios se pausan por hoy.</p>
            </div>
          ) : pctAgua >= 75 ? (
            <p className="mt-3 mb-4 text-xs font-medium text-sky-300/80 text-center">
              🔥 ¡Casi llegas! Solo te faltan {metaAgua - mlBebidos} ml más.
            </p>
          ) : pctAgua >= 50 ? (
            <p className="mt-3 mb-4 text-xs font-medium text-sky-400/60 text-center">
              💪 ¡Vas a la mitad! Mantén el ritmo.
            </p>
          ) : (
            <div className="mt-3 mb-4" />
          )}

          {/* Entrada manual */}
          <div className="flex gap-2.5">
            <div className="relative flex-1">
              <input
                type="number"
                min="1"
                placeholder="¿Cuánto tomaste?"
                value={mlManual}
                onChange={e => setMlManual(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && aplicarManual(1)}
                className="w-full bg-black/40 border border-white/8 rounded-2xl pl-4 pr-10 py-3 text-sm font-medium text-white placeholder-gray-700 outline-none focus:border-sky-500/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-600 pointer-events-none select-none">ml</span>
            </div>
            <button
              onClick={() => aplicarManual(1)}
              disabled={guardandoAgua || !mlManual}
              className="bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/30 text-white font-bold rounded-2xl px-5 py-3 text-sm active:scale-95 transition-all whitespace-nowrap">
              💧 Sumar
            </button>
          </div>

          {/* Restar: solo visible cuando hay texto en el input */}
          {mlManual && mlBebidos > 0 && (
            <button
              onClick={() => aplicarManual(-1)}
              disabled={guardandoAgua}
              className="mt-2 w-full text-xs text-gray-600 hover:text-red-400 transition-colors py-1">
              − Corregir (quitar {mlManual} ml del total)
            </button>
          )}

          {/* Toggle de recordatorios */}
          {typeof window !== 'undefined' && 'Notification' in window && (
            <div className="border-t border-white/5 mt-4 pt-3.5">
              {permisoNotif === 'denied' ? (
                <p className="text-xs text-gray-600 text-center">
                  🔕 Notificaciones bloqueadas en el navegador.
                </p>
              ) : recordatoriosOn ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-sky-400/50">🔔 Recordatorios activos · 6 avisos al día</span>
                  <button onClick={desactivarRecordatorios} className="text-xs text-gray-600 hover:text-red-400 transition-colors">
                    Desactivar
                  </button>
                </div>
              ) : (
                <button
                  onClick={activarRecordatorios}
                  className="w-full border border-sky-500/20 rounded-xl py-2.5 text-xs font-medium text-sky-400/60 hover:text-sky-400 hover:border-sky-500/40 transition-all">
                  🔔 Activar recordatorios de agua
                </button>
              )}
            </div>
          )}

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
