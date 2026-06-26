'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { calcularMacros, type Objetivo, type NivelActividad, type Perfil } from '@/lib/dietas/calcular'
import { calcularDieta, PLANTILLAS, type DietaCalculada, type Plantilla } from '@/lib/dietas/plantillas'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type PerfilDB = {
  peso_kg:         number | null
  altura_cm:       number | null
  edad:            number | null
  sexo:            string | null
  nivel_actividad: string | null
  objetivo:        string | null
}

const OBJETIVOS: { val: Objetivo; label: string; sub: string; icono: string; color: string }[] = [
  { val: 'bajar',    label: 'Bajar',    sub: 'Déficit calórico',  icono: '📉', color: 'border-blue-500/50 bg-blue-500/8 text-blue-300' },
  { val: 'mantener', label: 'Mantener', sub: 'Calorías de manten.', icono: '⚖️', color: 'border-[#F5C518]/50 bg-[#F5C518]/8 text-[#F5C518]' },
  { val: 'subir',    label: 'Subir',    sub: 'Superávit calórico', icono: '📈', color: 'border-green-500/50 bg-green-500/8 text-green-300' },
]

export default function DietaPage() {
  const [perfilDB,     setPerfilDB]     = useState<PerfilDB | null>(null)
  const [cargando,     setCargando]     = useState(true)
  const [sinPerfil,    setSinPerfil]    = useState(false)

  const [objetivo,     setObjetivo]     = useState<Objetivo>('mantener')
  const [plantilla,    setPlantilla]    = useState<Plantilla>(PLANTILLAS[0])
  const [dieta,        setDieta]        = useState<DietaCalculada | null>(null)

  // ── Carga del perfil ─────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCargando(false); setSinPerfil(true); return }

      const { data } = await supabase
        .from('perfiles')
        .select('peso_kg, altura_cm, edad, sexo, nivel_actividad, objetivo')
        .eq('id', user.id)
        .single()

      if (!data || !data.peso_kg || !data.altura_cm || !data.edad || !data.sexo || !data.nivel_actividad) {
        setSinPerfil(true)
      } else {
        setPerfilDB(data)
        const obj = (data.objetivo as Objetivo | null) ?? 'mantener'
        setObjetivo(obj)
      }
      setCargando(false)
    })()
  }, [])

  // ── Recalcula la dieta cuando cambia objetivo o plantilla ────────────────
  useEffect(() => {
    if (!perfilDB?.peso_kg || !perfilDB.altura_cm || !perfilDB.edad || !perfilDB.sexo || !perfilDB.nivel_actividad) return

    const perfil: Perfil = {
      peso_kg:         perfilDB.peso_kg,
      altura_cm:       perfilDB.altura_cm,
      edad:            perfilDB.edad,
      sexo:            perfilDB.sexo as 'hombre' | 'mujer',
      nivel_actividad: perfilDB.nivel_actividad as NivelActividad,
      objetivo,
    }

    const macros  = calcularMacros(perfil)
    const calculada = calcularDieta(plantilla, macros)
    setDieta(calculada)
  }, [perfilDB, objetivo, plantilla])

  // ── Skeleton / errores ───────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white max-w-lg mx-auto">
        <div className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/10 px-5 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold">Fit<span className="text-[#F5C518]">Pro</span> JS</h1>
          <a href="/nutricion" className="text-xs text-gray-400">← Nutrición</a>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-[#1a1a1a] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (sinPerfil) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white max-w-lg mx-auto flex flex-col">
        <div className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/10 px-5 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold">Fit<span className="text-[#F5C518]">Pro</span> JS</h1>
          <a href="/nutricion" className="text-xs text-gray-400">← Nutrición</a>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="text-6xl mb-5">📋</div>
          <div className="text-xl font-black mb-2">Primero completa tu perfil</div>
          <p className="text-sm text-gray-400 mb-8 leading-relaxed">
            Para calcular tu dieta personalizada necesitamos tu peso, altura, edad y nivel de actividad.
          </p>
          <a
            href="/onboarding"
            className="w-full bg-[#F5C518] text-black font-bold py-4 rounded-2xl text-base text-center block">
            Completar perfil →
          </a>
        </div>
      </div>
    )
  }

  const macrosTotal = dieta ? calcularMacros({
    peso_kg:         perfilDB!.peso_kg!,
    altura_cm:       perfilDB!.altura_cm!,
    edad:            perfilDB!.edad!,
    sexo:            perfilDB!.sexo! as 'hombre' | 'mujer',
    nivel_actividad: perfilDB!.nivel_actividad! as NivelActividad,
    objetivo,
  }) : null

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white max-w-lg mx-auto">

      {/* HEADER */}
      <div className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/10 px-5 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Fit<span className="text-[#F5C518]">Pro</span> JS</h1>
        <a href="/nutricion" className="text-xs text-gray-400">← Nutrición</a>
      </div>

      <div className="p-5 pb-16">
        <h2 className="text-xl font-bold mb-1">Mi <span className="text-[#F5C518]">Dieta</span> Personalizada</h2>
        <p className="text-xs text-gray-500 mb-5">Calculada con tu perfil · Mifflin-St Jeor</p>

        {/* ── SELECTOR DE OBJETIVO ──────────────────────────────────────── */}
        <div className="flex gap-2 mb-5">
          {OBJETIVOS.map(o => (
            <button
              key={o.val}
              onClick={() => setObjetivo(o.val)}
              className={`flex-1 py-3 rounded-xl border text-center transition-all ${
                objetivo === o.val
                  ? o.color
                  : 'border-white/10 bg-[#1a1a1a] text-gray-500'
              }`}>
              <div className="text-base leading-none mb-0.5">{o.icono}</div>
              <div className="text-xs font-bold leading-tight">{o.label}</div>
            </button>
          ))}
        </div>

        {/* ── META CALÓRICA ────────────────────────────────────────────── */}
        {macrosTotal && (
          <div className="bg-gradient-to-br from-[#1c1a00] to-[#111] border border-[#F5C518]/20 rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tu meta diaria</div>
                <div className="text-3xl font-black text-[#F5C518]">
                  {macrosTotal.calorias.toLocaleString()}
                  <span className="text-sm font-normal text-gray-400 ml-1">kcal</span>
                </div>
              </div>
              <div className="text-right text-xs text-gray-500">
                <div>BMR: {macrosTotal.bmr.toLocaleString()} kcal</div>
                <div>TDEE: {macrosTotal.tdee.toLocaleString()} kcal</div>
                <div className={`font-semibold mt-1 ${macrosTotal.diferencia_calorias < 0 ? 'text-blue-400' : macrosTotal.diferencia_calorias > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                  {macrosTotal.diferencia_calorias > 0 ? '+' : ''}{macrosTotal.diferencia_calorias} kcal/día
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { lbl: 'Proteína', val: macrosTotal.proteina, color: 'text-blue-400' },
                { lbl: 'Carbos',   val: macrosTotal.carbos,   color: 'text-[#F5C518]' },
                { lbl: 'Grasas',   val: macrosTotal.grasas,   color: 'text-orange-400' },
              ].map(({ lbl, val, color }) => (
                <div key={lbl} className="bg-black/30 rounded-xl p-2.5 text-center">
                  <div className={`text-lg font-bold ${color}`}>{val}g</div>
                  <div className="text-[10px] text-gray-500">{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SELECTOR DE PLANTILLA ────────────────────────────────────── */}
        <div className="mb-5">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Elige una plantilla</div>
          <div className="grid grid-cols-3 gap-2">
            {PLANTILLAS.map(p => (
              <button
                key={p.id}
                onClick={() => setPlantilla(p)}
                className={`py-3 px-2 rounded-xl border text-center transition-all ${
                  plantilla.id === p.id
                    ? 'border-[#F5C518]/60 bg-[#F5C518]/10'
                    : 'border-white/10 bg-[#1a1a1a]'
                }`}>
                <div className="text-2xl mb-1">{p.icono}</div>
                <div className={`text-xs font-bold ${plantilla.id === p.id ? 'text-[#F5C518]' : 'text-gray-400'}`}>
                  {p.nombre}
                </div>
                <div className="text-[9px] text-gray-600 mt-0.5 leading-tight">{p.descripcion}</div>
              </button>
            ))}
          </div>
          {/* Descripción de la plantilla activa */}
          <div className="mt-2.5 px-3 py-2 bg-[#1a1a1a] border border-white/8 rounded-xl">
            <p className="text-xs text-gray-400 leading-relaxed">{plantilla.para}</p>
          </div>
        </div>

        {/* ── PLAN DEL DÍA ────────────────────────────────────────────── */}
        {dieta && (
          <div className="flex flex-col gap-4">

            {/* Total del día — resumen rápido */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Total calculado del día</div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-black">{dieta.totalDia.calorias.toLocaleString()}</span>
                <span className="text-sm text-gray-500">kcal</span>
                {macrosTotal && (
                  <span className={`text-xs ml-auto font-semibold ${
                    Math.abs(dieta.totalDia.calorias - macrosTotal.calorias) < 100
                      ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {dieta.totalDia.calorias >= macrosTotal.calorias ? '+' : ''}
                    {dieta.totalDia.calorias - macrosTotal.calorias} vs meta
                  </span>
                )}
              </div>
              <div className="flex gap-4 text-xs">
                <span><span className="text-blue-400 font-semibold">{dieta.totalDia.proteina}g</span> <span className="text-gray-500">P</span></span>
                <span><span className="text-[#F5C518] font-semibold">{dieta.totalDia.carbos}g</span> <span className="text-gray-500">C</span></span>
                <span><span className="text-orange-400 font-semibold">{dieta.totalDia.grasas}g</span> <span className="text-gray-500">G</span></span>
              </div>
            </div>

            {/* Comidas */}
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
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{a.nombre}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        <span className="text-blue-400">P{a.proteina}g</span>
                        <span className="mx-1 text-gray-700">·</span>
                        <span className="text-[#F5C518]/80">C{a.carbos}g</span>
                        <span className="mx-1 text-gray-700">·</span>
                        <span className="text-orange-400/80">G{a.grasas}g</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-base font-black text-white">{a.gramos}g</div>
                      <div className="text-[10px] text-gray-500">{a.calorias} kcal</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Nota informativa */}
            <div className="px-4 py-3 bg-[#1a1a1a] border border-white/8 rounded-2xl text-xs text-gray-500 leading-relaxed text-center">
              Las porciones son orientativas. Puedes ajustar cantidades según tu apetito y los alimentos disponibles.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
