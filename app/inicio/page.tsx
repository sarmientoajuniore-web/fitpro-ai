'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// ─── Constantes ───────────────────────────────────────────────────────────────

const OBJETIVO_LABEL: Record<string, string> = {
  bajar:            'Bajar de peso',
  mantener:         'Mantenerme',
  subir:            'Subir de peso',
  deficit_leve:     'Bajar de peso',
  deficit_moderado: 'Bajar de peso',
  deficit_agresivo: 'Bajar de peso',
  mantenimiento:    'Mantenerme',
  superavit_leve:   'Subir de peso',
  superavit:        'Subir de peso',
}

const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Perfil = {
  nombre_completo:   string | null
  edad:              number | null
  peso_kg:           number | null
  altura_cm:         number | null
  tdee:              number | null
  calorias_objetivo: number | null
  objetivo:          string | null
  proteina_objetivo: number | null
  carbos_objetivo:   number | null
  grasas_objetivo:   number | null
  nivel_actividad:   string | null
  sexo:              string | null
}

type RegistroItem = {
  id:                string
  nombre_comida:     string
  cantidad_gramos:   number
  unidades:          number | null
  gramos_por_unidad: number | null
  calorias:          number
  proteina:          number
  carbos:            number
  grasas:            number
}

type AlimentoBusqueda = {
  id:            string
  nombre:        string
  calorias_100g: number
  proteina_100g: number
  carbos_100g:   number
  grasas_100g:   number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcularMetaAgua(pesoKg: number | null, nivelActividad: string | null): number {
  const base  = Math.round((pesoKg ?? 70) * 35)
  const extra = nivelActividad === 'alto' ? 750 : nivelActividad === 'moderado' ? 500 : 0
  return Math.round((base + extra) / 250) * 250
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function sumarDias(fechaStr: string, dias: number): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const f = new Date(y, m - 1, d)
  f.setDate(f.getDate() + dias)
  return toLocalDateStr(f)
}

function labelFecha(fechaStr: string): string {
  const hoy  = toLocalDateStr(new Date())
  const ayer = sumarDias(hoy, -1)
  if (fechaStr === hoy)  return 'Hoy'
  if (fechaStr === ayer) return 'Ayer'
  const [y, m, d] = fechaStr.split('-').map(Number)
  const f = new Date(y, m - 1, d)
  return `${d} ${MESES_CORTOS[f.getMonth()]} ${y}`
}

function gramosPorUnidad(nombre: string): number {
  const n = nombre.toLowerCase()
  if (n.includes('huevo'))                                          return 50
  if (n.includes('limon') || n.includes('limón'))                  return 30
  if (n.includes('banana') || n.includes('platano') || n.includes('plátano')) return 120
  if (n.includes('manzana'))                                        return 150
  if (n.includes('naranja'))                                        return 180
  if (n.includes('galleta') || n.includes('oreo'))                 return 11
  if (n.includes('pan') && !n.includes('empanada'))                return 30
  return 100
}

function formatCantidad(item: RegistroItem): string {
  if (item.unidades && item.gramos_por_unidad) {
    const porciones = item.unidades === 1 ? '1 porción' : `${item.unidades} porciones`
    return `${porciones} (${item.cantidad_gramos}g)`
  }
  return `${item.cantidad_gramos}g`
}

// ─── Audio ────────────────────────────────────────────────────────────────────

function reproducirSonido(tipo: 'pop' | 'gota') {
  if (typeof window === 'undefined') return
  try {
    const src = tipo === 'pop' ? '/sonidos/sonido-comida.mp3' : '/sonidos/sonido-agua.mp3'
    const audio = new Audio(src)
    audio.volume = 0.6
    audio.currentTime = 0
    audio.play()
  } catch { /* sin soporte de audio */ }
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function Barra({ consumido, meta, color }: { consumido: number; meta: number; color: string }) {
  const pct     = meta > 0 ? Math.min((consumido / meta) * 100, 100) : 0
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

// ─── Componente principal ─────────────────────────────────────────────────────

export default function InicioPage() {
  const router = useRouter()

  // ── Perfil / auth ─────────────────────────────────────────────────────────
  const [perfil,  setPerfil]  = useState<Perfil | null>(null)
  const [listo,   setListo]   = useState(false)
  const [userId,  setUserId]  = useState<string>('')

  // ── Fecha seleccionada ────────────────────────────────────────────────────
  const hoyStr = useMemo(() => toLocalDateStr(new Date()), [])
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyStr)
  const esHoy = fechaSeleccionada === hoyStr

  // ── Registros del día (array completo → macros se derivan de aquí) ────────
  const [registros,         setRegistros]         = useState<RegistroItem[]>([])
  const [cargandoRegistros, setCargandoRegistros] = useState(false)

  const consumo = useMemo(() => ({
    calorias: registros.reduce((s, r) => s + r.calorias, 0),
    proteina: registros.reduce((s, r) => s + r.proteina, 0),
    carbos:   registros.reduce((s, r) => s + r.carbos,   0),
    grasas:   registros.reduce((s, r) => s + r.grasas,   0),
  }), [registros])

  // ── Agua ──────────────────────────────────────────────────────────────────
  const [mlBebidos,       setMlBebidos]       = useState(0)
  const [guardandoAgua,   setGuardandoAgua]   = useState(false)
  const [mlManual,        setMlManual]        = useState('')
  const [permisoNotif,    setPermisoNotif]    = useState<NotificationPermission>('default')
  const [recordatoriosOn, setRecordatoriosOn] = useState(false)
  const [aguaSaltando,    setAguaSaltando]    = useState(false)
  const [listaAbierta,    setListaAbierta]    = useState(false)

  // ── Formulario de agregar alimento ────────────────────────────────────────
  const [formAbierto,    setFormAbierto]    = useState(false)
  const [busquedaAlim,   setBusquedaAlim]   = useState('')
  const [resultadosAlim, setResultadosAlim] = useState<AlimentoBusqueda[]>([])
  const [buscandoAlim,   setBuscandoAlim]   = useState(false)
  const [alimentoSel,    setAlimentoSel]    = useState<AlimentoBusqueda | null>(null)
  const [gramosInput,    setGramosInput]    = useState('100')
  const [modoRegistro,   setModoRegistro]   = useState<'gramos' | 'unidades'>('gramos')
  const [unidadesInput,  setUnidadesInput]  = useState('1')
  const [pesoPorcion,    setPesoPorcion]    = useState('100')
  const [guardandoAlim,  setGuardandoAlim]  = useState(false)
  const busquedaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Carga inicial: perfil + agua ──────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)

      const hoy = toLocalDateStr(new Date())
      const [{ data: perfilData }, { data: aguaHoy }] = await Promise.all([
        supabase
          .from('perfiles')
          .select('nombre_completo, edad, peso_kg, altura_cm, tdee, calorias_objetivo, objetivo, proteina_objetivo, carbos_objetivo, grasas_objetivo, nivel_actividad, sexo')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('registro_agua')
          .select('ml')
          .eq('user_id', user.id)
          .eq('fecha', hoy)
          .maybeSingle(),
      ])

      if (aguaHoy) setMlBebidos(aguaHoy.ml ?? 0)

      if (!perfilData || perfilData.edad === null || perfilData.peso_kg === null || perfilData.altura_cm === null) {
        router.replace('/onboarding')
        return
      }

      setPerfil(perfilData)
      setListo(true)

      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermisoNotif(Notification.permission)
        const guardado = localStorage.getItem('fitpro_recordatorios') === 'true'
        setRecordatoriosOn(guardado && Notification.permission === 'granted')
      }
    }
    init()
  }, [router])

  // ── Carga de registros del día ─────────────────────────────────────────────
  const cargarRegistros = useCallback(async () => {
    if (!userId) return
    setCargandoRegistros(true)
    const { data } = await supabase
      .from('registro_comidas')
      .select('id, nombre_comida, cantidad_gramos, unidades, gramos_por_unidad, calorias, proteina, carbos, grasas')
      .eq('user_id', userId)
      .eq('fecha', fechaSeleccionada)
      .order('created_at', { ascending: true })
    setRegistros(data ?? [])
    setCargandoRegistros(false)
  }, [userId, fechaSeleccionada])

  useEffect(() => { cargarRegistros() }, [cargarRegistros])

  // ── Service worker: recordatorios de agua ─────────────────────────────────
  useEffect(() => {
    if (!listo || !recordatoriosOn || !perfil || !('serviceWorker' in navigator)) return
    const meta = calcularMetaAgua(perfil.peso_kg, perfil.nivel_actividad)
    navigator.serviceWorker.ready.then(reg => {
      reg.active?.postMessage({ type: 'SCHEDULE_WATER', mlBebidos, metaMl: meta })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, recordatoriosOn])

  useEffect(() => {
    if (!recordatoriosOn || !perfil || !('serviceWorker' in navigator)) return
    const meta = calcularMetaAgua(perfil.peso_kg, perfil.nivel_actividad)
    navigator.serviceWorker.ready.then(reg => {
      reg.active?.postMessage({ type: 'UPDATE_AGUA', mlBebidos, metaMl: meta })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mlBebidos])

  // ── Búsqueda de alimentos (debounced 300 ms) ──────────────────────────────
  useEffect(() => {
    if (busquedaTimerRef.current) clearTimeout(busquedaTimerRef.current)
    if (!formAbierto || alimentoSel || busquedaAlim.trim().length < 2) {
      setResultadosAlim([])
      setBuscandoAlim(false)
      return
    }
    setBuscandoAlim(true)
    busquedaTimerRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('alimentos')
        .select('id, nombre, calorias_100g, proteina_100g, carbos_100g, grasas_100g')
        .ilike('nombre', `%${busquedaAlim.trim()}%`)
        .limit(10)
      setResultadosAlim(data ?? [])
      setBuscandoAlim(false)
    }, 300)
    return () => { if (busquedaTimerRef.current) clearTimeout(busquedaTimerRef.current) }
  }, [busquedaAlim, formAbierto, alimentoSel])

  // ── Navegación de fecha ───────────────────────────────────────────────────
  const irDiaAnterior  = () => setFechaSeleccionada(f => sumarDias(f, -1))
  const irDiaSiguiente = () => setFechaSeleccionada(f => {
    const sig = sumarDias(f, 1)
    return sig > hoyStr ? f : sig
  })

  // ── Agregar alimento al día ───────────────────────────────────────────────
  const agregarAlimento = async () => {
    if (!alimentoSel || !userId) return
    const g = modoRegistro === 'gramos'
      ? Math.max(parseInt(gramosInput) || 1, 1)
      : Math.max(Math.round((parseFloat(unidadesInput) || 1) * (parseFloat(pesoPorcion) || 1)), 1)
    const unids    = modoRegistro === 'unidades' ? (parseFloat(unidadesInput) || null) : null
    const gramsPU  = modoRegistro === 'unidades' ? (parseFloat(pesoPorcion)   || null) : null
    setGuardandoAlim(true)
    const { error: errComida } = await supabase.from('registro_comidas').insert({
      user_id:           userId,
      alimento_id:       alimentoSel.id,
      nombre_comida:     alimentoSel.nombre,
      tipo_comida:       'merienda',
      cantidad_gramos:   g,
      unidades:          unids,
      gramos_por_unidad: gramsPU,
      calorias:          Math.round(alimentoSel.calorias_100g * g / 100),
      proteina:          Math.round(alimentoSel.proteina_100g * g / 100),
      carbos:            Math.round(alimentoSel.carbos_100g   * g / 100),
      grasas:            Math.round(alimentoSel.grasas_100g   * g / 100),
      fecha:             fechaSeleccionada,
    })
    setGuardandoAlim(false)
    if (errComida) { console.error('[FitPro] Error guardando comida:', errComida); return }
    reproducirSonido('pop')
    setAlimentoSel(null)
    setBusquedaAlim('')
    setGramosInput('100')
    setModoRegistro('gramos')
    setUnidadesInput('1')
    setPesoPorcion('100')
    cargarRegistros()
  }

  // ── Eliminar alimento (optimistic) ────────────────────────────────────────
  const eliminarAlimento = async (id: string) => {
    setRegistros(prev => prev.filter(r => r.id !== id))
    await supabase.from('registro_comidas').delete().eq('id', id)
  }

  const cerrarFormulario = () => {
    setFormAbierto(false)
    setAlimentoSel(null)
    setBusquedaAlim('')
    setResultadosAlim([])
    setGramosInput('100')
    setModoRegistro('gramos')
    setUnidadesInput('1')
    setPesoPorcion('100')
  }

  const seleccionarAlimento = (a: AlimentoBusqueda) => {
    setAlimentoSel(a)
    setPesoPorcion(String(gramosPorUnidad(a.nombre)))
    setResultadosAlim([])
  }

  // ── Agua ──────────────────────────────────────────────────────────────────
  const ajustarAgua = async (delta: number) => {
    const nuevo = Math.max(0, mlBebidos + delta)
    setMlBebidos(nuevo)
    setGuardandoAgua(true)
    const hoy = toLocalDateStr(new Date())
    const { error: errAgua } = await supabase.from('registro_agua').upsert(
      { user_id: userId, fecha: hoy, ml: nuevo },
      { onConflict: 'user_id,fecha' }
    )
    if (errAgua) console.error('[FitPro] Error guardando agua:', errAgua)
    setGuardandoAgua(false)
  }

  const activarRecordatorios = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    const permiso = await Notification.requestPermission()
    setPermisoNotif(permiso)
    if (permiso !== 'granted') return
    localStorage.setItem('fitpro_recordatorios', 'true')
    setRecordatoriosOn(true)
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

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!listo) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#F5C518] border-t-transparent animate-spin" />
      </div>
    )
  }

  // ── Valores de presentación ───────────────────────────────────────────────
  const nombre   = perfil?.nombre_completo?.split(' ')[0] ?? ''
  const tdee     = perfil?.tdee?.toLocaleString() ?? '—'
  const kcal     = perfil?.calorias_objetivo?.toLocaleString() ?? '—'
  const objLabel = perfil?.objetivo ? (OBJETIVO_LABEL[perfil.objetivo] ?? 'Personalizado') : '—'
  const metaCal  = perfil?.calorias_objetivo  ?? 0
  const metaPro  = perfil?.proteina_objetivo  ?? 0
  const metaCarb = perfil?.carbos_objetivo    ?? 0
  const metaGra  = perfil?.grasas_objetivo    ?? 0

  const calRestantes = metaCal - Math.round(consumo.calorias)
  const calExcedido  = consumo.calorias > metaCal
  const pctCal         = metaCal > 0 ? Math.min((consumo.calorias / metaCal) * 100, 100) : 0
  const tdeeNum        = perfil?.tdee ?? 0
  const estadoLabel    = metaCal < tdeeNum - 50 ? 'DÉFICIT' : metaCal > tdeeNum + 50 ? 'SUPERÁVIT' : 'MANTENIM.'
  const estadoBadgeClass = metaCal < tdeeNum - 50
    ? 'bg-red-500/20 text-red-400'
    : metaCal > tdeeNum + 50
    ? 'bg-emerald-500/20 text-emerald-400'
    : 'bg-blue-500/20 text-blue-300'

  const metaAgua    = calcularMetaAgua(perfil?.peso_kg ?? null, perfil?.nivel_actividad ?? null)
  const pctAgua     = metaAgua > 0 ? (mlBebidos / metaAgua) * 100 : 0
  const imagenComida = perfil?.sexo === 'mujer'
    ? '/caricaturas/mujer-comida.png'
    : '/caricaturas/hombre-comida.png'
  const imagenAgua = perfil?.sexo === 'mujer'
    ? '/caricaturas/mujer-agua.png'
    : '/caricaturas/hombre-agua.png'
  const imagenEntrena = perfil?.sexo === 'mujer'
    ? '/caricaturas/mujer-entrena.png'
    : '/caricaturas/hombre-entrena.png'
  const imagenProteina = perfil?.sexo === 'mujer'
    ? '/caricaturas/mujer-proteina.png'
    : '/caricaturas/hombre-proteina.png'
  const imagenProgreso = perfil?.sexo === 'mujer'
    ? '/caricaturas/mujer-progreso.png'
    : '/caricaturas/hombre-progreso.png'

  const macros = [
    { lbl: 'Proteína',      con: Math.round(consumo.proteina), meta: metaPro,  color: 'bg-[#38B6FF]',  text: 'text-[#38B6FF]'  },
    { lbl: 'Carbohidratos', con: Math.round(consumo.carbos),   meta: metaCarb, color: 'bg-[#FF9D42]',  text: 'text-[#FF9D42]'  },
    { lbl: 'Grasas',        con: Math.round(consumo.grasas),   meta: metaGra,  color: 'bg-[#FF5C5C]',  text: 'text-[#FF5C5C]'  },
  ]

  // Preview en tiempo real: usa gramos o unidades×peso según el modo
  const totalGramosPreview = modoRegistro === 'gramos'
    ? Math.max(parseInt(gramosInput) || 1, 1)
    : Math.max(Math.round((parseFloat(unidadesInput) || 1) * (parseFloat(pesoPorcion) || 1)), 1)
  const preview = alimentoSel ? {
    calorias: Math.round(alimentoSel.calorias_100g * totalGramosPreview / 100),
    proteina: Math.round(alimentoSel.proteina_100g * totalGramosPreview / 100),
    carbos:   Math.round(alimentoSel.carbos_100g   * totalGramosPreview / 100),
    grasas:   Math.round(alimentoSel.grasas_100g   * totalGramosPreview / 100),
  } : null

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

        {/* MÓDULO UNIFICADO: SALUDO + NUTRICIÓN */}
        <div className="mb-4">
          <div
            className="rounded-2xl border border-[#B57BFF]/40"
            style={{ background: 'linear-gradient(135deg, #12062a 0%, #0a0318 100%)', boxShadow: '0 0 28px rgba(181,123,255,0.13)' }}>

            {/* ── Saludo + muñequito ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 className="text-2xl font-bold text-[#B57BFF]">¡Hola, {nombre}!</h2>
                <p className="text-[11px] text-[#B57BFF]/45 mt-0.5 uppercase tracking-widest">Nutrición</p>
              </div>
              <img
                src={imagenComida}
                alt=""
                className="comida-caricatura pointer-events-none select-none"
                style={{ animation: 'aguaFloat 3s ease-in-out infinite' }}
              />
            </div>

            <div className="px-5 pb-5">

              {/* ── Navegador de fecha ── */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={irDiaAnterior}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 text-xs transition-colors">
                  ◄
                </button>
                <span className="text-sm font-semibold text-gray-300 tracking-wide">
                  {labelFecha(fechaSeleccionada)}
                </span>
                <button
                  onClick={irDiaSiguiente}
                  disabled={esHoy}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 disabled:opacity-25 disabled:cursor-not-allowed text-xs transition-colors">
                  ►
                </button>
              </div>

              {/* ── Anillo + cajitas ── */}
              <div className="flex items-center gap-4 mb-4">

                {/* Anillo circular de progreso */}
                <div className="relative shrink-0" style={{ width: 108, height: 108 }}>
                  <div
                    className="w-full h-full rounded-full"
                    style={{
                      background: `conic-gradient(${calExcedido ? '#FF5C5C' : '#B57BFF'} ${pctCal}%, rgba(255,255,255,0.06) 0%)`,
                    }}>
                    <div
                      className="absolute inset-[11px] rounded-full flex flex-col items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #12062a 0%, #0a0318 100%)' }}>
                      <span className={`text-xl font-black leading-none tabular-nums ${calExcedido ? 'text-red-400' : 'text-[#B57BFF]'}`}>
                        {Math.abs(calRestantes).toLocaleString()}
                      </span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide mt-0.5">
                        {calExcedido ? 'excedido' : 'restantes'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cajitas mantenimiento + meta */}
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <div className="bg-black/30 rounded-xl px-3 py-2.5">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Mantenimiento</div>
                    <div className="text-base font-bold text-white">{tdee} <span className="text-xs font-normal text-gray-500">kcal</span></div>
                  </div>
                  <div className="bg-black/30 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wide">Meta</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${estadoBadgeClass}`}>{estadoLabel}</span>
                    </div>
                    <div className="text-base font-bold text-[#B57BFF]">{kcal} <span className="text-xs font-normal text-gray-500">kcal</span></div>
                    <div className="text-[10px] text-gray-600">{Math.round(consumo.calorias).toLocaleString()} consumidas</div>
                  </div>
                </div>

              </div>

              {/* ── Macros en cajitas ── */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {macros.map(({ lbl, con, meta, color, text }) => (
                  <div key={lbl} className="bg-black/30 rounded-xl px-2.5 py-2.5">
                    <div className="text-[10px] text-gray-500 mb-1 truncate">{lbl}</div>
                    <div className={`text-xs font-bold ${con > meta ? 'text-red-400' : text}`}>
                      {con} / {meta}g
                    </div>
                    <div className="mt-1.5">
                      <Barra consumido={con} meta={meta} color={color} />
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Lista de alimentos del día (acordeón) ── */}
              {cargandoRegistros && (
                <div className="flex justify-center py-3">
                  <div className="w-4 h-4 rounded-full border border-white/20 border-t-white/60 animate-spin" />
                </div>
              )}

              {!cargandoRegistros && registros.length > 0 && (
                <div className="mb-3">
                  <button
                    onClick={() => setListaAbierta(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/4 border border-[#B57BFF]/15 hover:border-[#B57BFF]/30 transition-colors">
                    <span className="text-xs font-semibold text-[#B57BFF]/70">
                      Ver lo que comí {esHoy ? 'hoy' : 'ese día'} ({registros.length})
                    </span>
                    <span className="text-[10px] text-[#B57BFF]/50 ml-2 select-none">
                      {listaAbierta ? '▲' : '▼'}
                    </span>
                  </button>
                  {listaAbierta && (
                    <div className="flex flex-col gap-1.5 mt-2">
                      {registros.map(r => (
                        <div key={r.id} className="flex items-center gap-2 px-3 py-2.5 bg-white/4 rounded-xl border border-white/5">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{r.nombre_comida}</div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-gray-600">{formatCantidad(r)}</span>
                              <span className="text-[10px] font-bold text-[#B57BFF]/90">{r.calorias} kcal</span>
                              <span className="text-[10px] text-blue-400/70">P{r.proteina}</span>
                              <span className="text-[10px] text-[#FF9D42]/50">C{r.carbos}</span>
                              <span className="text-[10px] text-orange-400/50">G{r.grasas}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => eliminarAlimento(r.id)}
                            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-600 hover:text-red-400 text-xs transition-colors">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!cargandoRegistros && registros.length === 0 && !formAbierto && (
                <p className="text-xs text-gray-700 text-center py-1 mb-2">
                  Sin alimentos registrados {esHoy ? 'hoy' : 'ese día'}.
                </p>
              )}

              {/* ── Formulario de búsqueda / agregar alimento ── */}
              {formAbierto ? (
                <div className="border-t border-[#B57BFF]/10 pt-3">

                  {/* Título del formulario */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🍽️</span>
                    <h3 className="text-sm font-bold text-white flex-1">¿Qué comiste?</h3>
                    <button
                      onClick={cerrarFormulario}
                      className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white text-xs transition-colors">
                      ✕
                    </button>
                  </div>

                  {/* Estado A: buscando alimento */}
                  {!alimentoSel ? (
                    <>
                      <div className="mb-2">
                        <input
                          type="text"
                          placeholder="Buscar alimento…"
                          value={busquedaAlim}
                          onChange={e => setBusquedaAlim(e.target.value)}
                          autoFocus
                          className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#B57BFF]/40 focus:bg-black/60 transition-all"
                        />
                      </div>

                      {buscandoAlim && (
                        <p className="text-xs text-gray-600 text-center py-2">Buscando…</p>
                      )}

                      {!buscandoAlim && busquedaAlim.trim().length >= 2 && resultadosAlim.length === 0 && (
                        <p className="text-xs text-gray-600 text-center py-2">
                          Sin resultados para &ldquo;{busquedaAlim}&rdquo;
                        </p>
                      )}

                      {resultadosAlim.length > 0 && (
                        <div className="max-h-44 overflow-y-auto flex flex-col gap-1">
                          {resultadosAlim.map(a => (
                            <button
                              key={a.id}
                              onClick={() => seleccionarAlimento(a)}
                              className="w-full text-left px-3 py-2.5 rounded-xl bg-white/4 hover:bg-[#B57BFF]/8 border border-transparent hover:border-[#B57BFF]/15 transition-all">
                              <div className="text-xs font-semibold text-white">{a.nombre}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5">
                                <span className="text-[#B57BFF]/70">{a.calorias_100g} kcal</span>
                                {' · '}
                                <span className="text-blue-400/60">P{a.proteina_100g}</span>
                                {' · '}
                                <span className="text-[#B57BFF]/40">C{a.carbos_100g}</span>
                                {' · '}
                                <span className="text-orange-400/40">G{a.grasas_100g}</span>
                                {' /100g'}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    /* Estado B: alimento seleccionado → elegir cantidad */
                    <>
                      {/* Chip del alimento elegido */}
                      <div className="bg-gradient-to-r from-[#1a0d35] to-[#150a2a] border border-[#B57BFF]/30 rounded-2xl px-4 py-3 mb-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm shrink-0">✅</span>
                            <span className="text-sm font-bold text-white truncate">{alimentoSel.nombre}</span>
                          </div>
                          <button
                            onClick={() => { setAlimentoSel(null); setBusquedaAlim('') }}
                            className="shrink-0 text-[10px] text-gray-500 hover:text-[#B57BFF] border border-white/10 hover:border-[#B57BFF]/30 rounded-lg px-2 py-0.5 transition-all">
                            cambiar
                          </button>
                        </div>
                        {preview && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-[#B57BFF]">{preview.calorias} kcal</span>
                            <span className="text-gray-700 text-xs">·</span>
                            <span className="text-xs font-semibold text-blue-400">P {preview.proteina}g</span>
                            <span className="text-xs font-semibold text-[#B57BFF]/70">C {preview.carbos}g</span>
                            <span className="text-xs font-semibold text-orange-400">G {preview.grasas}g</span>
                          </div>
                        )}
                      </div>

                      {/* Toggle gramos / porción-unidad */}
                      <div className="flex gap-2 mb-3">
                        {(['gramos', 'unidades'] as const).map(m => (
                          <button
                            key={m}
                            onClick={() => {
                              setModoRegistro(m)
                              if (m === 'unidades' && alimentoSel) {
                                setPesoPorcion(String(gramosPorUnidad(alimentoSel.nombre)))
                              }
                            }}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                              modoRegistro === m
                                ? 'bg-[#B57BFF] text-black shadow-[0_0_12px_rgba(181,123,255,0.25)]'
                                : 'bg-black/40 text-gray-500 border border-white/10 hover:border-white/20 hover:text-gray-300'
                            }`}>
                            {m === 'gramos' ? '⚖️ Gramos' : '🔢 Porción / Unidad'}
                          </button>
                        ))}
                      </div>

                      {modoRegistro === 'gramos' ? (
                        /* Modo gramos */
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              min="1"
                              value={gramosInput}
                              onChange={e => setGramosInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && agregarAlimento()}
                              className="w-full bg-black/50 border border-white/15 rounded-xl pl-4 pr-9 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#B57BFF]/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 pointer-events-none">g</span>
                          </div>
                          <button
                            onClick={agregarAlimento}
                            disabled={guardandoAlim}
                            className="bg-[#B57BFF] hover:bg-[#c490ff] disabled:opacity-40 text-black font-black rounded-xl px-5 py-2.5 text-sm active:scale-95 transition-all whitespace-nowrap shadow-[0_0_16px_rgba(181,123,255,0.3)]">
                            {guardandoAlim ? '…' : '＋ Agregar'}
                          </button>
                        </div>
                      ) : (
                        /* Modo porción / unidad */
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Porciones</label>
                              <input
                                type="number"
                                min="1"
                                value={unidadesInput}
                                onChange={e => setUnidadesInput(e.target.value)}
                                className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#B57BFF]/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Peso c/u (g)</label>
                              <input
                                type="number"
                                min="1"
                                value={pesoPorcion}
                                onChange={e => setPesoPorcion(e.target.value)}
                                className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#B57BFF]/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          </div>
                          <p className="text-[11px] text-[#B57BFF]/50 pl-1">
                            Total: {unidadesInput || 0} × {pesoPorcion || 0}g = {Math.round((parseFloat(unidadesInput) || 0) * (parseFloat(pesoPorcion) || 0))}g
                          </p>
                          <button
                            onClick={agregarAlimento}
                            disabled={guardandoAlim}
                            className="w-full bg-[#B57BFF] hover:bg-[#c490ff] disabled:opacity-40 text-black font-black rounded-xl py-2.5 text-sm active:scale-95 transition-all shadow-[0_0_16px_rgba(181,123,255,0.3)]">
                            {guardandoAlim ? '…' : '＋ Agregar'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* Botón para abrir el formulario */
                <button
                  onClick={() => setFormAbierto(true)}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-[#B57BFF]/25 rounded-xl py-3 text-sm font-semibold text-[#B57BFF]/50 hover:text-[#B57BFF]/80 hover:border-[#B57BFF]/40 hover:bg-[#B57BFF]/4 transition-all">
                  <span className="text-base">🍽️</span>
                  Agregar alimento
                </button>
              )}

              {/* ── Hidratación ── */}
              <div className="border-t border-white/8 mt-2 pt-4">
                <div className="flex items-start gap-4">

                  {/* Gota de agua con relleno */}
                  <div className="shrink-0" style={{ width: 80, height: 110, position: 'relative' }}>
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        clipPath: 'path("M 40,5 C 65,15 80,45 80,70 A 40,40,0,1,1,0,70 C 0,45 15,15 40,5 Z")',
                        background: 'rgba(56,182,255,0.08)',
                      }}>
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: `${Math.min(pctAgua, 100)}%`,
                          background: pctAgua >= 100
                            ? 'linear-gradient(180deg,#34d399 0%,#10b981 100%)'
                            : 'linear-gradient(180deg,#38B6FF 0%,#0A6FD4 100%)',
                          transition: 'height 0.7s ease-out',
                        }}
                      />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: 'white', lineHeight: 1.2, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
                          {(mlBebidos / 1000).toFixed(1)}
                        </span>
                        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.85)', lineHeight: 1.3, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
                          / {(metaAgua / 1000).toFixed(1)} L
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Info + entrada */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-semibold ${pctAgua >= 100 ? 'text-emerald-400' : 'text-[#38B6FF]'}`}>
                      Hidratación · {Math.min(Math.round(pctAgua), 100)}%
                    </span>
                    <p className="text-[11px] text-gray-600 mb-3 mt-0.5">
                      {Math.floor(mlBebidos / 250)} {Math.floor(mlBebidos / 250) === 1 ? 'vaso' : 'vasos'} · meta {metaAgua >= 1000 ? `${(metaAgua / 1000).toFixed(1)} L` : `${metaAgua} ml`}
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="1"
                          placeholder="¿Cuánto tomaste?"
                          value={mlManual}
                          onChange={e => setMlManual(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && aplicarManual(1)}
                          className="w-full bg-black/40 border border-white/8 rounded-xl pl-3 pr-8 py-2 text-xs font-medium text-white placeholder-gray-700 outline-none focus:border-sky-500/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 pointer-events-none select-none">ml</span>
                      </div>
                      <button
                        onClick={() => { reproducirSonido('gota'); aplicarManual(1) }}
                        disabled={guardandoAgua || !mlManual}
                        className="bg-[#38B6FF] hover:bg-[#5ec6ff] disabled:bg-[#38B6FF]/30 text-black font-bold rounded-xl px-3 py-2 text-xs active:scale-95 transition-all whitespace-nowrap">
                        💧 Sumar
                      </button>
                    </div>
                    {mlManual && mlBebidos > 0 && (
                      <button
                        onClick={() => aplicarManual(-1)}
                        disabled={guardandoAgua}
                        className="mt-1 text-[10px] text-gray-600 hover:text-red-400 transition-colors py-1">
                        − Corregir (quitar {mlManual} ml)
                      </button>
                    )}
                  </div>

                </div>

                {pctAgua >= 100 && (
                  <p className="mt-3 text-xs font-semibold text-emerald-400 text-center">🎉 ¡Meta de agua cumplida hoy! 💧</p>
                )}

                {typeof window !== 'undefined' && 'Notification' in window && (
                  <div className="mt-3">
                    {recordatoriosOn ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#38B6FF]/40">🔔 Recordatorios · 6 avisos/día</span>
                        <button onClick={desactivarRecordatorios} className="text-[10px] text-gray-600 hover:text-red-400 transition-colors">Desactivar</button>
                      </div>
                    ) : permisoNotif !== 'denied' ? (
                      <button
                        onClick={activarRecordatorios}
                        className="w-full border border-[#38B6FF]/15 rounded-xl py-1.5 text-[10px] font-medium text-[#38B6FF]/50 hover:text-[#38B6FF] hover:border-[#38B6FF]/30 transition-all">
                        🔔 Activar recordatorios de agua
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        <style>{`
          @keyframes aguaFloat {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-6px); }
          }
          @keyframes aguaSalto {
            0%   { transform: translateY(0px)   rotate(0deg);  }
            30%  { transform: translateY(-14px) rotate(-8deg); }
            65%  { transform: translateY(-4px)  rotate(4deg);  }
            100% { transform: translateY(0px)   rotate(0deg);  }
          }
          .agua-caricatura { height: 130px; width: auto; }
          @media (max-width: 640px) { .agua-caricatura { height: 95px; } }
          .comida-caricatura { height: 100px; width: auto; }
          @media (max-width: 640px) { .comida-caricatura { height: 72px; } }
          @keyframes rutinaFloatSalto {
            0%   { transform: translateY(0px); }
            16%  { transform: translateY(-5px); }
            33%  { transform: translateY(0px); }
            50%  { transform: translateY(-5px); }
            57%  { transform: translateY(0px); }
            67%  { transform: translateY(-16px) rotate(-5deg); }
            77%  { transform: translateY(-3px) rotate(3deg); }
            83%  { transform: translateY(-7px); }
            90%  { transform: translateY(0px); }
            100% { transform: translateY(0px); }
          }
          @keyframes progresoBalanceo {
            0%   { transform: translateY(0px) rotate(0deg); }
            15%  { transform: translateY(-5px) rotate(3deg); }
            30%  { transform: translateY(0px) rotate(-3deg); }
            45%  { transform: translateY(-5px) rotate(3deg); }
            60%  { transform: translateY(0px) rotate(-3deg); }
            75%  { transform: translateY(-4px) rotate(2deg); }
            90%  { transform: translateY(0px) rotate(-1deg); }
            100% { transform: translateY(0px) rotate(0deg); }
          }
          .modulo-caricatura { height: 72px; width: auto; }
          @media (max-width: 640px) { .modulo-caricatura { height: 52px; } }
          @keyframes orbitCW  { from { transform: rotate(0deg);    } to { transform: rotate(360deg);   } }
          @keyframes orbitCCW { from { transform: rotate(0deg);    } to { transform: rotate(-360deg);  } }
          .orbit-btn { transition: transform 0.15s ease; display: block; }
          .orbit-btn:active { transform: scale(1.12); }
          @media (hover: hover) { .orbit-btn:hover { transform: scale(1.08); } }
        `}</style>
        {/* MÓDULOS ORBITALES */}
        <div
          className="rounded-2xl border border-[#B57BFF]/40 mb-4"
          style={{ background: 'linear-gradient(135deg, #12062a 0%, #0a0318 100%)', boxShadow: '0 0 24px rgba(181,123,255,0.12)' }}>
          <div style={{ position: 'relative', height: 370, width: '100%' }}>

          {/* Círculo central FitPro */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 112, height: 112, borderRadius: '50%',
            border: '3px solid #B57BFF',
            boxShadow: '0 0 32px rgba(181,123,255,0.55), 0 0 10px rgba(181,123,255,0.28)',
            background: 'linear-gradient(135deg, #1a0a2e 0%, #0a0318 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10, pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: 'white', letterSpacing: '-0.3px' }}>
              Fit<span style={{ color: '#B57BFF' }}>Pro</span>
            </span>
          </div>

          {/* Brazo Rutinas — arranca a la derecha */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 0, height: 0, transformOrigin: '0 0',
            animation: 'orbitCW 18s linear infinite',
          }}>
            {/* Posicionador: centro del planeta a 118px del origen */}
            <div style={{ position: 'absolute', top: -58, left: 60, width: 116, height: 116 }}>
              {/* Contra-rotación para que el contenido quede siempre recto */}
              <div style={{ width: '100%', height: '100%', animation: 'orbitCCW 18s linear infinite' }}>
                <a href="/rutinas" className="orbit-btn" style={{
                  width: 116, height: 116, borderRadius: '50%',
                  border: '2.5px solid #2EE57D',
                  boxShadow: '0 0 22px rgba(46,229,125,0.45), 0 0 7px rgba(46,229,125,0.2)',
                  background: 'linear-gradient(160deg, #030f07 0%, #071f0e 100%)',
                  position: 'relative', overflow: 'hidden', textDecoration: 'none',
                }}>
                  <img
                    src={imagenEntrena} alt=""
                    style={{
                      position: 'absolute', bottom: 16, left: '50%',
                      transform: 'translateX(-50%)',
                      height: 84, width: 'auto',
                      pointerEvents: 'none', userSelect: 'none',
                    }}
                  />
                  <span style={{
                    position: 'absolute', bottom: 4, left: 0, right: 0,
                    textAlign: 'center', fontSize: 9, fontWeight: 700,
                    color: '#2EE57D', letterSpacing: '0.3px',
                  }}>Rutinas</span>
                </a>
              </div>
            </div>
          </div>

          {/* Brazo Progreso — arranca 180° opuesto (delay = -9s) */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 0, height: 0, transformOrigin: '0 0',
            animation: 'orbitCW 18s linear infinite',
            animationDelay: '-9s',
          }}>
            <div style={{ position: 'absolute', top: -58, left: 60, width: 116, height: 116 }}>
              <div style={{ width: '100%', height: '100%', animation: 'orbitCCW 18s linear infinite', animationDelay: '-9s' }}>
                <a href="/progreso" className="orbit-btn" style={{
                  width: 116, height: 116, borderRadius: '50%',
                  border: '2.5px solid #FFD400',
                  boxShadow: '0 0 22px rgba(255,212,0,0.45), 0 0 7px rgba(255,212,0,0.2)',
                  background: 'linear-gradient(160deg, #0f0c00 0%, #1c1500 100%)',
                  position: 'relative', overflow: 'hidden', textDecoration: 'none',
                }}>
                  <img
                    src={imagenProgreso} alt=""
                    style={{
                      position: 'absolute', bottom: 16, left: '50%',
                      transform: 'translateX(-50%)',
                      height: 84, width: 'auto',
                      pointerEvents: 'none', userSelect: 'none',
                    }}
                  />
                  <span style={{
                    position: 'absolute', bottom: 4, left: 0, right: 0,
                    textAlign: 'center', fontSize: 9, fontWeight: 700,
                    color: '#FFD400', letterSpacing: '0.3px',
                  }}>Progreso</span>
                </a>
              </div>
            </div>
          </div>

          </div>
        </div>

        {/* Botón reporte WhatsApp */}
        <a
          href="https://wa.me/56934580344?text=Hola!%20FitPro%20est%C3%A1%20en%20prueba.%20Quiero%20reportar%20esto%3A%20"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full rounded-xl py-3 px-4 mt-3 transition-opacity hover:opacity-90 active:opacity-80"
          style={{
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            boxShadow: '0 0 16px rgba(37,211,102,0.28)',
            textDecoration: 'none',
          }}>
          <svg viewBox="0 0 24 24" fill="#064E3B" width="18" height="18" style={{ flexShrink: 0 }}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#064E3B' }}>
            ¿Encontraste un error? Repórtalo aquí
          </span>
        </a>

      </div>
    </div>
  )
}
