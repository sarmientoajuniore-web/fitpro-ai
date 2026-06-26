'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { calcularMacros, type Objetivo, type NivelActividad, type Perfil } from '@/lib/dietas/calcular'
import { calcularDieta, PLANTILLAS, type DietaCalculada, type Plantilla } from '@/lib/dietas/plantillas'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type PerfilDB = {
  peso_kg:         number
  altura_cm:       number
  edad:            number
  sexo:            string
  nivel_actividad: string
  objetivo:        string | null
}

// ─── Configuración visual de cada objetivo ──────────────────────────────────

const OPCIONES_OBJETIVO = [
  {
    val:        'bajar' as Objetivo,
    icono:      '🔻',
    titulo:     'Pérdida de peso',
    sub:        'Déficit calórico · perder grasa de forma saludable',
    badge:      '−500 kcal/día',
    borde:      'border-blue-500/40',
    fondo:      'bg-blue-500/8',
    fondoActivo:'bg-blue-500/15',
    texto:      'text-blue-300',
    textoCal:   'text-blue-400',
  },
  {
    val:        'mantener' as Objetivo,
    icono:      '⚖️',
    titulo:     'Mantenimiento',
    sub:        'Calorías de equilibrio · conservar el peso actual',
    badge:      'TDEE',
    borde:      'border-[#F5C518]/40',
    fondo:      'bg-[#F5C518]/8',
    fondoActivo:'bg-[#F5C518]/15',
    texto:      'text-[#F5C518]',
    textoCal:   'text-[#F5C518]',
  },
  {
    val:        'subir' as Objetivo,
    icono:      '🔺',
    titulo:     'Aumento de peso',
    sub:        'Superávit calórico · ganar músculo progresivamente',
    badge:      '+300 kcal/día',
    borde:      'border-green-500/40',
    fondo:      'bg-green-500/8',
    fondoActivo:'bg-green-500/15',
    texto:      'text-green-400',
    textoCal:   'text-green-400',
  },
]

// ─── Componente principal ────────────────────────────────────────────────────

export default function DietaPage() {
  // Datos del perfil del usuario
  const [perfil,    setPerfil]    = useState<PerfilDB | null>(null)
  const [cargando,  setCargando]  = useState(true)
  const [sinPerfil, setSinPerfil] = useState(false)

  // Flujo de dos pasos
  const [objetivoSel, setObjetivoSel] = useState<Objetivo | null>(null)
  const [plantilla,   setPlantilla]   = useState<Plantilla>(PLANTILLAS[0])
  const [estiloAbierto, setEstiloAbierto] = useState(false)

  // ── Carga del perfil ───────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCargando(false); setSinPerfil(true); return }

      const { data } = await supabase
        .from('perfiles')
        .select('peso_kg, altura_cm, edad, sexo, nivel_actividad, objetivo')
        .eq('id', user.id)
        .single()

      if (!data?.peso_kg || !data?.altura_cm || !data?.edad || !data?.sexo || !data?.nivel_actividad) {
        setSinPerfil(true)
      } else {
        setPerfil(data as PerfilDB)
      }
      setCargando(false)
    })()
  }, [])

  // ── Macros pre-calculados para los 3 objetivos (para mostrar kcal en las cards) ──
  const macrosPorObjetivo = useMemo(() => {
    if (!perfil) return null
    const base: Perfil = {
      peso_kg:         perfil.peso_kg,
      altura_cm:       perfil.altura_cm,
      edad:            perfil.edad,
      sexo:            perfil.sexo as 'hombre' | 'mujer',
      nivel_actividad: perfil.nivel_actividad as NivelActividad,
      objetivo:        'mantener',
    }
    return {
      bajar:    calcularMacros({ ...base, objetivo: 'bajar' }),
      mantener: calcularMacros({ ...base, objetivo: 'mantener' }),
      subir:    calcularMacros({ ...base, objetivo: 'subir' }),
    }
  }, [perfil])

  // ── Dieta calculada para el objetivo y plantilla elegidos ─────────────
  const dieta: DietaCalculada | null = useMemo(() => {
    if (!objetivoSel || !macrosPorObjetivo) return null
    return calcularDieta(plantilla, macrosPorObjetivo[objetivoSel])
  }, [objetivoSel, plantilla, macrosPorObjetivo])

  // ── Estados de carga / sin perfil ─────────────────────────────────────
  if (cargando) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white max-w-lg mx-auto">
        <Header />
        <div className="p-5 flex flex-col gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-[#1a1a1a] rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (sinPerfil) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white max-w-lg mx-auto flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="text-6xl mb-5">📋</div>
          <div className="text-xl font-black mb-2">Primero completa tu perfil</div>
          <p className="text-sm text-gray-400 mb-8 leading-relaxed">
            Para calcular tu dieta necesitamos tu peso, altura, edad y nivel de actividad.
          </p>
          <a href="/onboarding"
            className="w-full bg-[#F5C518] text-black font-bold py-4 rounded-2xl text-base text-center block">
            Completar perfil →
          </a>
        </div>
      </div>
    )
  }

  // ── PASO 1: elegir objetivo ────────────────────────────────────────────
  if (!objetivoSel) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white max-w-lg mx-auto">
        <Header />
        <div className="p-5">
          <h2 className="text-xl font-bold mb-1">
            Dieta <span className="text-[#F5C518]">Personalizada</span>
          </h2>
          <p className="text-sm text-gray-500 mb-7">¿Cuál es tu objetivo ahora mismo?</p>

          <div className="flex flex-col gap-3">
            {OPCIONES_OBJETIVO.map(op => {
              const kcal = macrosPorObjetivo?.[op.val]?.calorias
              return (
                <button
                  key={op.val}
                  onClick={() => { setObjetivoSel(op.val); setEstiloAbierto(false) }}
                  className={`w-full text-left px-5 py-5 rounded-2xl border ${op.borde} ${op.fondo}
                    hover:${op.fondoActivo} transition-all active:scale-[0.98]`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{op.icono}</span>
                      <div>
                        <div className={`text-base font-black ${op.texto}`}>{op.titulo}</div>
                        <div className="text-xs text-gray-500 mt-0.5 leading-snug">{op.sub}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      {kcal && (
                        <div className={`text-xl font-black ${op.textoCal}`}>
                          {kcal.toLocaleString()}
                          <span className="text-xs font-normal text-gray-500 ml-1">kcal</span>
                        </div>
                      )}
                      <div className={`text-[10px] mt-0.5 ${op.texto} opacity-70`}>{op.badge}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <p className="text-[11px] text-gray-600 text-center mt-6 leading-relaxed">
            Calculado con tu peso, altura, edad y nivel de actividad actual.
          </p>
        </div>
      </div>
    )
  }

  // ── PASO 2: plan de dieta ─────────────────────────────────────────────
  const opActual = OPCIONES_OBJETIVO.find(o => o.val === objetivoSel)!
  const macros   = macrosPorObjetivo![objetivoSel]

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white max-w-lg mx-auto">
      <Header />

      <div className="p-5 pb-16">

        {/* Botón volver + nombre del objetivo */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => setObjetivoSel(null)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors">
            ← Cambiar objetivo
          </button>
          <div className={`flex items-center gap-1.5 text-sm font-bold ${opActual.texto}`}>
            <span>{opActual.icono}</span>
            <span>{opActual.titulo}</span>
          </div>
        </div>

        {/* Resumen de macros meta */}
        <div className={`border ${opActual.borde} ${opActual.fondo} rounded-2xl p-4 mb-6`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tu meta diaria</div>
              <div className={`text-3xl font-black ${opActual.textoCal}`}>
                {macros.calorias.toLocaleString()}
                <span className="text-sm font-normal text-gray-400 ml-1">kcal</span>
              </div>
            </div>
            <div className="text-right text-[11px] text-gray-500 space-y-0.5">
              <div>Mantenimiento: {macros.tdee.toLocaleString()} kcal</div>
              <div className={`font-semibold ${opActual.textoCal}`}>
                {macros.diferencia_calorias > 0 ? '+' : ''}{macros.diferencia_calorias} kcal/día
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { lbl: 'Proteína', val: macros.proteina, color: 'text-blue-400' },
              { lbl: 'Carbos',   val: macros.carbos,   color: 'text-[#F5C518]' },
              { lbl: 'Grasas',   val: macros.grasas,   color: 'text-orange-400' },
            ].map(({ lbl, val, color }) => (
              <div key={lbl} className="bg-black/20 rounded-xl p-2.5 text-center">
                <div className={`text-lg font-bold ${color}`}>{val}g</div>
                <div className="text-[10px] text-gray-500">{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan del día — comidas */}
        {dieta && (
          <div className="flex flex-col gap-4 mb-6">
            {dieta.comidas.map(comida => (
              <div key={comida.tipo} className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">

                {/* Cabecera de comida */}
                <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{comida.icono}</span>
                    <div>
                      <div className="font-bold text-sm">{comida.label}</div>
                      <div className="text-[10px] text-gray-600">{comida.hora}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#F5C518]">{comida.totalCalorias} kcal</div>
                    <div className="text-[10px] text-gray-600">
                      P{comida.totalProteina} · C{comida.totalCarbos} · G{comida.totalGrasas}
                    </div>
                  </div>
                </div>

                {/* Alimentos */}
                {comida.alimentos.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-tight">{a.nombre}</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">
                        <span className="text-blue-400/80">P{a.proteina}g</span>
                        <span className="mx-1 text-gray-700">·</span>
                        <span className="text-[#F5C518]/70">C{a.carbos}g</span>
                        <span className="mx-1 text-gray-700">·</span>
                        <span className="text-orange-400/70">G{a.grasas}g</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="text-base font-black">{a.gramos}g</div>
                      <div className="text-[10px] text-gray-500">{a.calorias} kcal</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Total del día */}
        {dieta && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 mb-6 flex items-center justify-between">
            <span className="text-xs text-gray-500">Total del día</span>
            <div className="flex items-center gap-3 text-xs">
              <span><span className="font-bold text-white">{dieta.totalDia.calorias.toLocaleString()}</span> <span className="text-gray-500">kcal</span></span>
              <span className="text-gray-700">·</span>
              <span className="text-blue-400 font-semibold">P{dieta.totalDia.proteina}g</span>
              <span className="text-[#F5C518] font-semibold">C{dieta.totalDia.carbos}g</span>
              <span className="text-orange-400 font-semibold">G{dieta.totalDia.grasas}g</span>
            </div>
          </div>
        )}

        {/* ── CAMBIAR ESTILO (secundario) ───────────────────────────────── */}
        <div className="border border-white/8 rounded-2xl overflow-hidden">
          <button
            onClick={() => setEstiloAbierto(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/3 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-base">{plantilla.icono}</span>
              <div>
                <div className="text-xs font-semibold text-gray-300">Estilo: {plantilla.nombre}</div>
                <div className="text-[10px] text-gray-600">{plantilla.descripcion}</div>
              </div>
            </div>
            <span className={`text-gray-500 text-xs transition-transform ${estiloAbierto ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {estiloAbierto && (
            <div className="border-t border-white/8 px-3 pb-3 pt-2 flex flex-col gap-2">
              {PLANTILLAS.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setPlantilla(p); setEstiloAbierto(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    plantilla.id === p.id
                      ? 'border-[#F5C518]/40 bg-[#F5C518]/8'
                      : 'border-white/8 bg-black/20 hover:border-white/15'
                  }`}>
                  <span className="text-xl shrink-0">{p.icono}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-bold ${plantilla.id === p.id ? 'text-[#F5C518]' : 'text-gray-200'}`}>
                      {p.nombre}
                    </div>
                    <div className="text-[10px] text-gray-500 leading-snug">{p.para}</div>
                  </div>
                  {plantilla.id === p.id && <span className="text-[#F5C518] text-xs shrink-0">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-[11px] text-gray-700 text-center mt-5 leading-relaxed px-2">
          Las porciones son orientativas. Ajusta según tu apetito y disponibilidad.
        </p>
      </div>
    </div>
  )
}

// ─── Header compartido ───────────────────────────────────────────────────────

function Header() {
  return (
    <div className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/10 px-5 py-3 flex items-center justify-between">
      <h1 className="text-lg font-bold">Fit<span className="text-[#F5C518]">Pro</span> JS</h1>
      <a href="/nutricion" className="text-xs text-gray-400">← Nutrición</a>
    </div>
  )
}
