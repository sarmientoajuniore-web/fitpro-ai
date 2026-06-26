'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { calcularMacros, type Objetivo, type NivelActividad, type Perfil } from '@/lib/dietas/calcular'
import { calcularDieta, PLANTILLAS, type Plantilla } from '@/lib/dietas/plantillas'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Tipos ───────────────────────────────────────────────────────────────────

type PerfilDB = {
  peso_kg:         number
  altura_cm:       number
  edad:            number
  sexo:            string
  nivel_actividad: string
  objetivo:        string | null
}

type AlimentoLocal = {
  id:            string
  nombre:        string
  calorias_100g: number
  proteina_100g: number
  carbos_100g:   number
  grasas_100g:   number
}

type ItemEditable = {
  _key:          string
  nombre:        string
  alimento_id:   string | null
  gramos:        number
  calorias:      number
  proteina:      number
  carbos:        number
  grasas:        number
  calorias_100g: number
  proteina_100g: number
  carbos_100g:   number
  grasas_100g:   number
}

type ComidaEditable = {
  tipo:  string
  label: string
  icono: string
  hora:  string
  items: ItemEditable[]
}

// ─── Constantes de UI ────────────────────────────────────────────────────────

const OPCIONES_OBJETIVO = [
  {
    val:      'bajar' as Objetivo,
    icono:    '🔻',
    titulo:   'Pérdida de peso',
    sub:      'Déficit calórico · perder grasa de forma saludable',
    badge:    '−500 kcal/día',
    borde:    'border-blue-500/40',
    fondo:    'bg-blue-500/8',
    texto:    'text-blue-300',
    calColor: 'text-blue-400',
  },
  {
    val:      'mantener' as Objetivo,
    icono:    '⚖️',
    titulo:   'Mantenimiento',
    sub:      'Calorías de equilibrio · conservar el peso actual',
    badge:    'TDEE',
    borde:    'border-[#F5C518]/40',
    fondo:    'bg-[#F5C518]/8',
    texto:    'text-[#F5C518]',
    calColor: 'text-[#F5C518]',
  },
  {
    val:      'subir' as Objetivo,
    icono:    '🔺',
    titulo:   'Aumento de peso',
    sub:      'Superávit calórico · ganar músculo progresivamente',
    badge:    '+300 kcal/día',
    borde:    'border-green-500/40',
    fondo:    'bg-green-500/8',
    texto:    'text-green-400',
    calColor: 'text-green-400',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function recalcItem(item: ItemEditable, gramos: number): ItemEditable {
  const g = Math.max(gramos, 1)
  return {
    ...item,
    gramos,
    calorias: Math.round(item.calorias_100g * g / 100),
    proteina: Math.round(item.proteina_100g * g / 100),
    carbos:   Math.round(item.carbos_100g   * g / 100),
    grasas:   Math.round(item.grasas_100g   * g / 100),
  }
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function DietaPage() {
  // ── Perfil y auth ─────────────────────────────────────────────────────
  const [perfil,    setPerfil]    = useState<PerfilDB | null>(null)
  const [cargando,  setCargando]  = useState(true)
  const [sinPerfil, setSinPerfil] = useState(false)
  const [userId,    setUserId]    = useState<string | null>(null)

  // ── Flujo de 2 pasos ─────────────────────────────────────────────────
  const [objetivoSel,   setObjetivoSel]   = useState<Objetivo | null>(null)
  const [plantilla,     setPlantilla]     = useState<Plantilla>(PLANTILLAS[0])
  const [estiloAbierto, setEstiloAbierto] = useState(false)

  // ── Dieta editable ────────────────────────────────────────────────────
  const [dietaEditable, setDietaEditable] = useState<ComidaEditable[]>([])

  // ── Modal cambiar alimento ────────────────────────────────────────────
  const [modalCambio,  setModalCambio]  = useState<{ comidaIdx: number; itemKey: string; itemActual: ItemEditable } | null>(null)
  const [busqueda,     setBusqueda]     = useState('')
  const [resultados,   setResultados]   = useState<AlimentoLocal[]>([])
  const [buscando,     setBuscando]     = useState(false)
  const [alimentoSel,  setAlimentoSel]  = useState<AlimentoLocal | null>(null)
  const [gramosInput,  setGramosInput]  = useState('100')
  const busquedaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Cargar dieta al día ───────────────────────────────────────────────
  const [cargandoDieta, setCargandoDieta] = useState(false)
  const [dietaCargada,  setDietaCargada]  = useState(false)
  const [errorCarga,    setErrorCarga]    = useState<string | null>(null)

  // ── Carga inicial: perfil + userId ────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCargando(false); setSinPerfil(true); return }
      setUserId(user.id)

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

  // ── Macros pre-calculados para los 3 objetivos ────────────────────────
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

  // ── Dieta base (calculada con el motor) ──────────────────────────────
  const dieta = useMemo(() => {
    if (!objetivoSel || !macrosPorObjetivo) return null
    return calcularDieta(plantilla, macrosPorObjetivo[objetivoSel])
  }, [objetivoSel, plantilla, macrosPorObjetivo])

  // ── Sincronizar dietaEditable cuando la dieta base cambia ─────────────
  useEffect(() => {
    if (!dieta) { setDietaEditable([]); return }
    setDietaEditable(
      dieta.comidas.map(c => ({
        tipo:  c.tipo,
        label: c.label,
        icono: c.icono,
        hora:  c.hora,
        items: c.alimentos.map(a => ({
          _key:          `${c.tipo}__${a.nombre}`,
          nombre:        a.nombre,
          alimento_id:   null,
          gramos:        a.gramos,
          calorias:      a.calorias,
          proteina:      a.proteina,
          carbos:        a.carbos,
          grasas:        a.grasas,
          calorias_100g: a.calorias_100g,
          proteina_100g: a.proteina_100g,
          carbos_100g:   a.carbos_100g,
          grasas_100g:   a.grasas_100g,
        })),
      }))
    )
    setDietaCargada(false)
    setErrorCarga(null)
  }, [dieta])

  // ── Totales del día calculados en vivo desde dietaEditable ────────────
  const totalDia = useMemo(() =>
    dietaEditable.reduce((acc, c) => ({
      calorias: acc.calorias + c.items.reduce((s, i) => s + i.calorias, 0),
      proteina: acc.proteina + c.items.reduce((s, i) => s + i.proteina, 0),
      carbos:   acc.carbos   + c.items.reduce((s, i) => s + i.carbos,   0),
      grasas:   acc.grasas   + c.items.reduce((s, i) => s + i.grasas,   0),
    }), { calorias: 0, proteina: 0, carbos: 0, grasas: 0 }),
    [dietaEditable]
  )

  // ── Eliminar alimento de la dieta editable ────────────────────────────
  function eliminarItem(comidaIdx: number, itemKey: string) {
    setDietaEditable(prev => prev.map((c, ci) =>
      ci !== comidaIdx ? c : { ...c, items: c.items.filter(i => i._key !== itemKey) }
    ))
  }

  // ── Abrir modal de cambio ─────────────────────────────────────────────
  function abrirModalCambio(comidaIdx: number, item: ItemEditable) {
    setModalCambio({ comidaIdx, itemKey: item._key, itemActual: item })
    setBusqueda('')
    setResultados([])
    setAlimentoSel(null)
    setGramosInput(String(item.gramos))
  }

  // ── Búsqueda en tabla alimentos (debounced 300ms) ─────────────────────
  function handleBusqueda(q: string) {
    setBusqueda(q)
    setAlimentoSel(null)
    if (busquedaTimer.current) clearTimeout(busquedaTimer.current)
    if (q.trim().length < 2) { setResultados([]); return }
    busquedaTimer.current = setTimeout(async () => {
      setBuscando(true)
      const { data } = await supabase
        .from('alimentos')
        .select('id, nombre, calorias_100g, proteina_100g, carbos_100g, grasas_100g')
        .ilike('nombre', `%${q.trim()}%`)
        .limit(20)
      setResultados(data ?? [])
      setBuscando(false)
    }, 300)
  }

  // ── Aplicar cambio (nuevo alimento y/o nuevos gramos) ─────────────────
  function aplicarCambio() {
    if (!modalCambio) return
    const g = Math.max(parseInt(gramosInput) || 1, 1)

    setDietaEditable(prev => prev.map((c, ci) => {
      if (ci !== modalCambio.comidaIdx) return c
      return {
        ...c,
        items: c.items.map(i => {
          if (i._key !== modalCambio.itemKey) return i
          if (alimentoSel) {
            return {
              _key:          i._key,
              nombre:        alimentoSel.nombre,
              alimento_id:   alimentoSel.id,
              gramos:        g,
              calorias:      Math.round(alimentoSel.calorias_100g * g / 100),
              proteina:      Math.round(alimentoSel.proteina_100g * g / 100),
              carbos:        Math.round(alimentoSel.carbos_100g   * g / 100),
              grasas:        Math.round(alimentoSel.grasas_100g   * g / 100),
              calorias_100g: alimentoSel.calorias_100g,
              proteina_100g: alimentoSel.proteina_100g,
              carbos_100g:   alimentoSel.carbos_100g,
              grasas_100g:   alimentoSel.grasas_100g,
            }
          }
          return recalcItem(i, g)
        }),
      }
    }))
    setModalCambio(null)
  }

  // ── Insertar todos los alimentos de la dieta en registro_comidas ──────
  async function cargarDietaAlDia() {
    if (!userId) return
    setCargandoDieta(true)
    setErrorCarga(null)

    const hoy = toLocalDateStr(new Date())
    const filas = dietaEditable.flatMap(comida =>
      comida.items.map(item => ({
        user_id:           userId,
        alimento_id:       item.alimento_id,
        nombre_comida:     item.nombre,
        tipo_comida:       comida.tipo === 'merienda' ? 'snack' : comida.tipo,
        cantidad_gramos:   item.gramos,
        unidades:          null,
        gramos_por_unidad: null,
        calorias:          item.calorias,
        proteina:          item.proteina,
        carbos:            item.carbos,
        grasas:            item.grasas,
        fecha:             hoy,
      }))
    )

    const { error } = await supabase.from('registro_comidas').insert(filas)
    if (error) {
      setErrorCarga(`No se pudo cargar: ${error.message}`)
    } else {
      setDietaCargada(true)
    }
    setCargandoDieta(false)
  }

  // ── Skeleton mientras carga ───────────────────────────────────────────
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

  // ── Sin perfil ────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────────────────
  // PASO 1 — Elegir objetivo
  // ────────────────────────────────────────────────────────────────────────
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
                  className={`w-full text-left px-5 py-5 rounded-2xl border ${op.borde} ${op.fondo} active:scale-[0.98] transition-all`}>
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
                        <div className={`text-xl font-black ${op.calColor}`}>
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
            Calculado con tu peso, altura, edad y nivel de actividad.
          </p>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────
  // PASO 2 — Plan de dieta editable
  // ────────────────────────────────────────────────────────────────────────
  const opActual = OPCIONES_OBJETIVO.find(o => o.val === objetivoSel)!
  const macros   = macrosPorObjetivo![objetivoSel]
  const totalItems = dietaEditable.reduce((s, c) => s + c.items.length, 0)

  return (
    <>
      <div className="min-h-screen bg-[#0a0a0a] text-white max-w-lg mx-auto">
        <Header />

        <div className="p-5 pb-20">

          {/* Volver + badge objetivo */}
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

          {/* Resumen macros meta */}
          <div className={`border ${opActual.borde} ${opActual.fondo} rounded-2xl p-4 mb-6`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tu meta diaria</div>
                <div className={`text-3xl font-black ${opActual.calColor}`}>
                  {macros.calorias.toLocaleString()}
                  <span className="text-sm font-normal text-gray-400 ml-1">kcal</span>
                </div>
              </div>
              <div className="text-right text-[11px] text-gray-500 space-y-0.5">
                <div>Mantenimiento: {macros.tdee.toLocaleString()} kcal</div>
                <div className={`font-semibold ${opActual.calColor}`}>
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

          {/* ── COMIDAS EDITABLES ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-4 mb-5">
            {dietaEditable.map((comida, comidaIdx) => {
              const totCal = comida.items.reduce((s, i) => s + i.calorias, 0)
              const totP   = comida.items.reduce((s, i) => s + i.proteina, 0)
              const totC   = comida.items.reduce((s, i) => s + i.carbos,   0)
              const totG   = comida.items.reduce((s, i) => s + i.grasas,   0)

              return (
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
                      <div className="text-sm font-bold text-[#F5C518]">{totCal} kcal</div>
                      <div className="text-[10px] text-gray-600">P{totP} · C{totC} · G{totG}</div>
                    </div>
                  </div>

                  {/* Estado vacío */}
                  {comida.items.length === 0 && (
                    <div className="px-4 py-3 text-xs text-gray-600 italic">
                      Sin alimentos — todos eliminados
                    </div>
                  )}

                  {/* Alimentos con botones editar/eliminar */}
                  {comida.items.map(item => (
                    <div key={item._key}
                      className="flex items-center gap-2 px-4 py-3 border-b border-white/5 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-tight">{item.nombre}</div>
                        <div className="text-[10px] text-gray-600 mt-0.5">
                          <span className="text-blue-400/80">P{item.proteina}g</span>
                          <span className="mx-1 text-gray-700">·</span>
                          <span className="text-[#F5C518]/70">C{item.carbos}g</span>
                          <span className="mx-1 text-gray-700">·</span>
                          <span className="text-orange-400/70">G{item.grasas}g</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base font-black">{item.gramos}g</div>
                        <div className="text-[10px] text-gray-500">{item.calorias} kcal</div>
                      </div>
                      {/* Botones */}
                      <div className="flex flex-col gap-1 shrink-0 ml-1">
                        <button
                          onClick={() => abrirModalCambio(comidaIdx, item)}
                          title="Cambiar alimento o gramos"
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-xs transition-colors">
                          ✏️
                        </button>
                        <button
                          onClick={() => eliminarItem(comidaIdx, item._key)}
                          title="Quitar alimento"
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-600 hover:text-red-400 text-xs font-bold transition-colors">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Total del día en vivo */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 mb-5 flex items-center justify-between">
            <span className="text-xs text-gray-500">Total del día</span>
            <div className="flex items-center gap-2 text-xs flex-wrap justify-end">
              <span>
                <span className="font-bold text-white">{totalDia.calorias.toLocaleString()}</span>
                <span className="text-gray-500 ml-1">kcal</span>
              </span>
              <span className="text-gray-700">·</span>
              <span className="text-blue-400 font-semibold">P{totalDia.proteina}g</span>
              <span className="text-[#F5C518] font-semibold">C{totalDia.carbos}g</span>
              <span className="text-orange-400 font-semibold">G{totalDia.grasas}g</span>
            </div>
          </div>

          {/* ── BOTÓN CARGAR ──────────────────────────────────────────────── */}
          {dietaCargada ? (
            <div className="rounded-2xl border border-green-500/30 bg-green-500/8 px-5 py-5 mb-5 text-center">
              <div className="text-2xl mb-2">✅</div>
              <div className="font-bold text-green-400 text-sm mb-1">Dieta cargada a tu día de hoy</div>
              <div className="text-xs text-gray-500 mb-4">
                {totalItems} alimentos agregados al registro
              </div>
              <a href="/nutricion"
                className="inline-block bg-[#F5C518] text-black text-xs font-bold px-5 py-2.5 rounded-xl">
                Ver en Nutrición →
              </a>
            </div>
          ) : (
            <div className="mb-5">
              {errorCarga && (
                <div className="text-xs text-red-400 text-center mb-3 px-2">{errorCarga}</div>
              )}
              <button
                onClick={cargarDietaAlDia}
                disabled={cargandoDieta || totalItems === 0}
                className="w-full py-4 rounded-2xl font-bold text-black text-base
                  bg-[#F5C518] hover:bg-[#f0bc00] active:scale-[0.98]
                  disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                {cargandoDieta ? 'Cargando…' : '📥 Cargar esta dieta a mi día de hoy'}
              </button>
              <p className="text-[10px] text-gray-600 text-center mt-2">
                Agrega {totalItems} alimentos al registro del {toLocalDateStr(new Date())}
              </p>
            </div>
          )}

          {/* ── CAMBIAR ESTILO (colapsable, secundario) ───────────────────── */}
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
                <p className="text-[10px] text-gray-600 text-center pt-1">
                  Cambiar estilo reiniciará los alimentos que hayas modificado
                </p>
              </div>
            )}
          </div>

          <p className="text-[11px] text-gray-700 text-center mt-5 leading-relaxed px-2">
            Las porciones son orientativas. Ajusta según tu apetito y disponibilidad.
          </p>
        </div>
      </div>

      {/* ── MODAL: CAMBIAR / AJUSTAR ALIMENTO ────────────────────────────────── */}
      {modalCambio && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModalCambio(null)} />

          <div className="relative w-full max-w-lg bg-[#111] border-t border-white/10 rounded-t-3xl p-5 pb-8 max-h-[88vh] flex flex-col">

            {/* Cabecera del modal */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <div className="font-bold text-base">Modificar alimento</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Actual: <span className="text-gray-300">{modalCambio.itemActual.nombre}</span>
                </div>
              </div>
              <button
                onClick={() => setModalCambio(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/8 text-gray-400 text-xl leading-none">
                ×
              </button>
            </div>

            {/* Gramos */}
            <div className="mb-4 shrink-0">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2">
                Gramos a consumir
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={gramosInput}
                  onChange={e => setGramosInput(e.target.value)}
                  inputMode="numeric"
                  min={1}
                  className="w-28 bg-[#1a1a1a] border border-white/15 rounded-xl px-3 py-2.5 text-white font-bold text-base text-center focus:outline-none focus:border-[#F5C518]/50"
                />
                <span className="text-xs text-gray-500">gramos</span>
                {(() => {
                  const src = alimentoSel ?? modalCambio.itemActual
                  const g   = Math.max(parseInt(gramosInput) || 1, 1)
                  return (
                    <div className="text-xs text-gray-500 leading-snug">
                      <span className="text-white font-bold">{Math.round(src.calorias_100g * g / 100)}</span> kcal
                      <span className="ml-1 text-blue-400">P{Math.round(src.proteina_100g * g / 100)}</span>
                      {' '}
                      <span className="text-[#F5C518]/80">C{Math.round(src.carbos_100g * g / 100)}</span>
                      {' '}
                      <span className="text-orange-400/80">G{Math.round(src.grasas_100g * g / 100)}</span>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Buscador de alimento alternativo */}
            <div className="mb-3 shrink-0">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2">
                Cambiar por otro alimento <span className="normal-case text-gray-700">(opcional)</span>
              </label>
              <input
                type="text"
                value={busqueda}
                onChange={e => handleBusqueda(e.target.value)}
                placeholder="Busca en tu lista de alimentos…"
                autoComplete="off"
                className="w-full bg-[#1a1a1a] border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#F5C518]/50 placeholder:text-gray-600"
              />
            </div>

            {/* Resultados de búsqueda */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {buscando && (
                <div className="text-xs text-gray-500 text-center py-4">Buscando…</div>
              )}
              {!buscando && busqueda.length >= 2 && resultados.length === 0 && (
                <div className="text-xs text-gray-600 text-center py-4">
                  Sin resultados para &ldquo;{busqueda}&rdquo;
                </div>
              )}
              {resultados.map(a => (
                <button
                  key={a.id}
                  onClick={() => {
                    setAlimentoSel(a)
                    setGramosInput(String(modalCambio.itemActual.gramos))
                    setBusqueda(a.nombre)
                    setResultados([])
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl mb-1 text-left transition-colors ${
                    alimentoSel?.id === a.id
                      ? 'bg-[#F5C518]/10 border border-[#F5C518]/30'
                      : 'bg-[#1a1a1a] border border-white/5 hover:border-white/15'
                  }`}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.nombre}</div>
                    <div className="text-[10px] text-gray-500">
                      {a.calorias_100g} kcal · P{a.proteina_100g} C{a.carbos_100g} G{a.grasas_100g} (por 100g)
                    </div>
                  </div>
                  {alimentoSel?.id === a.id && <span className="text-[#F5C518] text-xs ml-2 shrink-0">✓</span>}
                </button>
              ))}
            </div>

            {/* Chip: alimento seleccionado */}
            {alimentoSel && (
              <div className="mt-3 px-3 py-2 bg-[#F5C518]/8 border border-[#F5C518]/25 rounded-xl flex items-center gap-2 shrink-0">
                <span className="text-[#F5C518] text-xs">✓</span>
                <span className="text-xs text-gray-300 min-w-0 truncate">
                  Nuevo: <span className="font-bold text-white">{alimentoSel.nombre}</span>
                </span>
                <button
                  onClick={() => { setAlimentoSel(null); setBusqueda('') }}
                  className="ml-auto text-gray-600 hover:text-gray-400 text-sm shrink-0">
                  ✕
                </button>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-2 mt-4 shrink-0">
              <button
                onClick={() => setModalCambio(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 text-sm font-semibold">
                Cancelar
              </button>
              <button
                onClick={aplicarCambio}
                className="flex-1 py-3 rounded-xl bg-[#F5C518] text-black font-bold text-sm">
                {alimentoSel ? 'Cambiar alimento' : 'Actualizar gramos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Header compartido ────────────────────────────────────────────────────────

function Header() {
  return (
    <div className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/10 px-5 py-3 flex items-center justify-between">
      <h1 className="text-lg font-bold">Fit<span className="text-[#F5C518]">Pro</span> JS</h1>
      <a href="/nutricion" className="text-xs text-gray-400">← Nutrición</a>
    </div>
  )
}
