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
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    const ctx: AudioContext = new AudioCtx()
    const now = ctx.currentTime

    const tono = (freq: number, t: number, dur: number, vol: number) => {
      const osc = ctx.createOscillator()
      const g   = ctx.createGain()
      osc.connect(g)
      g.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + t)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + t + dur)
      g.gain.setValueAtTime(vol, now + t)
      g.gain.exponentialRampToValueAtTime(0.001, now + t + dur)
      osc.start(now + t)
      osc.stop(now + t + dur)
    }

    if (tipo === 'pop') {
      tono(800, 0, 0.15, 0.28)
    } else {
      tono(620, 0,    0.15, 0.22)
      tono(390, 0.13, 0.18, 0.22)
    }
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

  const metaAgua    = calcularMetaAgua(perfil?.peso_kg ?? null, perfil?.nivel_actividad ?? null)
  const pctAgua     = metaAgua > 0 ? (mlBebidos / metaAgua) * 100 : 0
  const imagenComida = perfil?.sexo === 'mujer'
    ? '/caricaturas/mujer-comida.png'
    : '/caricaturas/hombre-comida.png'
  const imagenEntrena = perfil?.sexo === 'mujer'
    ? '/caricaturas/mujer-entrena.png'
    : '/caricaturas/hombre-entrena.png'
  const imagenProteina = perfil?.sexo === 'mujer'
    ? '/caricaturas/mujer-proteina.png'
    : '/caricaturas/hombre-proteina.png'

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

        {/* BIENVENIDA */}
        <div
          className="rounded-2xl p-5 mb-4 border border-[#FFE08A]/50"
          style={{ background: 'linear-gradient(135deg, #1a1200 0%, #100c00 100%)', boxShadow: '0 0 28px rgba(255,193,60,0.13)' }}>
          <h2 className="text-2xl font-bold mb-3 text-[#FFC93C]">¡Hola, {nombre}! 💪</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-base font-bold text-white">{tdee}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Mantenimiento</div>
            </div>
            <div className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-base font-bold text-[#FFC93C]">{kcal}</div>
              <div className="text-[10px] text-[#FFC93C]/60 mt-1">{objLabel}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: metaPro,  lbl: 'Proteína',      color: 'text-[#38B6FF]' },
              { val: metaCarb, lbl: 'Carbohidratos', color: 'text-[#FF9D42]' },
              { val: metaGra,  lbl: 'Grasas',        color: 'text-[#FF5C5C]' },
            ].map(({ val, lbl, color }) => (
              <div key={lbl} className="bg-black/30 rounded-xl p-3 text-center">
                <div className={`text-base font-bold ${color}`}>{val > 0 ? `${val}g` : '—'}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CALORÍAS, MACROS Y REGISTRO DEL DÍA */}
        <div className="relative mb-4">
          <img
            src={imagenComida}
            alt=""
            className="comida-caricatura absolute right-4 z-10 pointer-events-none select-none"
            style={{ top: '-16px', animation: 'aguaFloat 3s ease-in-out infinite' }}
          />
          <div
            className="rounded-2xl p-4 border border-[#9CF5C2]/40"
            style={{ background: 'linear-gradient(135deg, #051a0b 0%, #081510 100%)', boxShadow: '0 0 28px rgba(46,229,125,0.10)' }}>
          <p className="text-xs font-semibold text-[#2EE57D]/70 uppercase tracking-widest mb-3">Nutrición</p>

          {/* ── Navegador de fecha ── */}
          <div className="flex items-center justify-between mb-3">
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

          {/* ── Calorías ── */}
          <div className="mb-3">
            <p className="text-xs font-semibold text-[#2EE57D]/60 uppercase tracking-wide mb-1">Te quedan hoy</p>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className={`text-3xl font-black tracking-tight ${calExcedido ? 'text-red-400' : 'text-[#2EE57D]'}`}>
                {calRestantes.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-gray-400">kcal</span>
            </div>
            <div className="flex items-end justify-between mb-1">
              <span className="text-xs text-gray-500">
                {Math.round(consumo.calorias).toLocaleString()} / {metaCal.toLocaleString()} kcal
              </span>
            </div>
            <Barra consumido={consumo.calorias} meta={metaCal} color="bg-[#2EE57D]" />
          </div>

          {/* ── Macros ── */}
          <div className="flex flex-col gap-2 mb-4">
            {macros.map(({ lbl, con, meta, color, text }) => {
              const excedido = con > meta
              const quedan   = Math.max(meta - con, 0)
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

          {/* ── Lista de alimentos del día ── */}
          {cargandoRegistros && (
            <div className="flex justify-center py-3">
              <div className="w-4 h-4 rounded-full border border-white/20 border-t-white/60 animate-spin" />
            </div>
          )}

          {!cargandoRegistros && registros.length > 0 && (
            <div className="border-t border-[#F5C518]/8 pt-3 mb-3">
              <p className="text-[10px] text-[#F5C518]/40 uppercase tracking-widest mb-2">
                Alimentos · {registros.length} {registros.length === 1 ? 'item' : 'items'}
              </p>
              <div className="flex flex-col gap-1.5">
                {registros.map(r => (
                  <div key={r.id} className="flex items-center gap-2 px-3 py-2.5 bg-white/4 rounded-xl border border-white/5">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{r.nombre_comida}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-gray-600">{formatCantidad(r)}</span>
                        <span className="text-[10px] font-bold text-[#F5C518]/90">{r.calorias} kcal</span>
                        <span className="text-[10px] text-blue-400/70">P{r.proteina}</span>
                        <span className="text-[10px] text-[#F5C518]/50">C{r.carbos}</span>
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
            </div>
          )}

          {!cargandoRegistros && registros.length === 0 && !formAbierto && (
            <p className="text-xs text-gray-700 text-center py-1 mb-2">
              Sin alimentos registrados {esHoy ? 'hoy' : 'ese día'}.
            </p>
          )}

          {/* ── Formulario de búsqueda / agregar alimento ── */}
          {formAbierto ? (
            <div className="border-t border-[#F5C518]/10 pt-3">

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
                      className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#F5C518]/40 focus:bg-black/60 transition-all"
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
                          className="w-full text-left px-3 py-2.5 rounded-xl bg-white/4 hover:bg-[#F5C518]/8 border border-transparent hover:border-[#F5C518]/15 transition-all">
                          <div className="text-xs font-semibold text-white">{a.nombre}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            <span className="text-[#F5C518]/70">{a.calorias_100g} kcal</span>
                            {' · '}
                            <span className="text-blue-400/60">P{a.proteina_100g}</span>
                            {' · '}
                            <span className="text-[#F5C518]/40">C{a.carbos_100g}</span>
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
                  <div className="bg-gradient-to-r from-[#1c1800] to-[#1a1a00] border border-[#F5C518]/30 rounded-2xl px-4 py-3 mb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm shrink-0">✅</span>
                        <span className="text-sm font-bold text-white truncate">{alimentoSel.nombre}</span>
                      </div>
                      <button
                        onClick={() => { setAlimentoSel(null); setBusquedaAlim('') }}
                        className="shrink-0 text-[10px] text-gray-500 hover:text-[#F5C518] border border-white/10 hover:border-[#F5C518]/30 rounded-lg px-2 py-0.5 transition-all">
                        cambiar
                      </button>
                    </div>
                    {preview && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-[#F5C518]">{preview.calorias} kcal</span>
                        <span className="text-gray-700 text-xs">·</span>
                        <span className="text-xs font-semibold text-blue-400">P {preview.proteina}g</span>
                        <span className="text-xs font-semibold text-[#F5C518]/70">C {preview.carbos}g</span>
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
                            ? 'bg-[#F5C518] text-black shadow-[0_0_12px_rgba(245,197,24,0.25)]'
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
                          className="w-full bg-black/50 border border-white/15 rounded-xl pl-4 pr-9 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#F5C518]/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 pointer-events-none">g</span>
                      </div>
                      <button
                        onClick={agregarAlimento}
                        disabled={guardandoAlim}
                        className="bg-[#F5C518] hover:bg-[#f0bc00] disabled:opacity-40 text-black font-black rounded-xl px-5 py-2.5 text-sm active:scale-95 transition-all whitespace-nowrap shadow-[0_0_16px_rgba(245,197,24,0.3)]">
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
                            className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#F5C518]/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Peso c/u (g)</label>
                          <input
                            type="number"
                            min="1"
                            value={pesoPorcion}
                            onChange={e => setPesoPorcion(e.target.value)}
                            className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#F5C518]/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-[#F5C518]/50 pl-1">
                        Total: {unidadesInput || 0} × {pesoPorcion || 0}g = {Math.round((parseFloat(unidadesInput) || 0) * (parseFloat(pesoPorcion) || 0))}g
                      </p>
                      <button
                        onClick={agregarAlimento}
                        disabled={guardandoAlim}
                        className="w-full bg-[#F5C518] hover:bg-[#f0bc00] disabled:opacity-40 text-black font-black rounded-xl py-2.5 text-sm active:scale-95 transition-all shadow-[0_0_16px_rgba(245,197,24,0.3)]">
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
              className="w-full flex items-center justify-center gap-2 border border-dashed border-[#F5C518]/25 rounded-xl py-3 text-sm font-semibold text-[#F5C518]/50 hover:text-[#F5C518]/80 hover:border-[#F5C518]/40 hover:bg-[#F5C518]/4 transition-all">
              <span className="text-base">🍽️</span>
              Agregar alimento
            </button>
          )}
          </div>
        </div>

        {/* HIDRATACIÓN */}
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
        `}</style>
        <div
          className="relative rounded-2xl p-4 mb-4 overflow-hidden border border-[#9DD9FF]/40"
          style={{ background: 'linear-gradient(135deg, #051220 0%, #081828 100%)', boxShadow: '0 0 28px rgba(56,182,255,0.12)' }}>

          {/* Glow decorativo */}
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header: título + meta diaria */}
          <div className="flex items-center justify-between mb-3 relative">
            <p className="text-xs font-semibold text-[#38B6FF]/70 uppercase tracking-widest">Hidratación</p>
            <p className="text-xs font-bold text-[#9DD9FF]/60">
              Meta: {metaAgua >= 1000 ? `${(metaAgua / 1000).toFixed(1)} L` : `${metaAgua} ml`}
            </p>
          </div>

          {/* Fila: datos (izq) + personaje (der) */}
          <div className="flex gap-3 items-end mb-1 relative">

            {/* Columna izquierda: números + barra */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className={`text-4xl font-black tracking-tight transition-colors duration-500 ${
                  pctAgua >= 100 ? 'text-emerald-400' : 'text-[#38B6FF]'
                }`}>
                  {mlBebidos >= 1000 ? (mlBebidos / 1000).toFixed(1) : mlBebidos}
                </span>
                <span className="text-lg font-semibold text-gray-500">
                  {mlBebidos >= 1000 ? 'L' : 'ml'}
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                {Math.floor(mlBebidos / 250)} {Math.floor(mlBebidos / 250) === 1 ? 'vaso' : 'vasos'}
                {' · de '}{metaAgua >= 1000 ? `${(metaAgua / 1000).toFixed(1)} L` : `${metaAgua} ml`}
              </p>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-1.5">
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
              <div className="flex justify-between">
                <span className="text-[11px] text-gray-600">{mlBebidos} ml registrados</span>
                <span className={`text-[11px] font-semibold ${pctAgua >= 100 ? 'text-emerald-400' : 'text-[#38B6FF]'}`}>
                  {Math.min(Math.round(pctAgua), 100)}%
                </span>
              </div>
            </div>

            {/* Columna derecha: personaje */}
            <div className="w-20 flex-shrink-0 flex items-end justify-center">
              <img
                src="/caricaturas/hombre-agua.png"
                alt=""
                className="agua-caricatura pointer-events-none select-none"
                style={{
                  animation: aguaSaltando
                    ? 'aguaSalto 0.5s ease-out forwards'
                    : 'aguaFloat 3s ease-in-out infinite',
                }}
              />
            </div>
          </div>

          {/* Mensajes de hito */}
          {pctAgua >= 100 ? (
            <div className="mt-2 mb-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-center">
              <p className="text-sm font-bold text-emerald-400">🎉 ¡Felicitaciones! Cumpliste tu meta de agua hoy 💧🙌</p>
              <p className="text-xs text-gray-500 mt-0.5">Excelente hidratación. Los recordatorios se pausan por hoy.</p>
            </div>
          ) : pctAgua >= 75 ? (
            <p className="mt-2 mb-2 text-xs font-medium text-sky-300/80 text-center">
              🔥 ¡Casi llegas! Solo te faltan {metaAgua - mlBebidos} ml más.
            </p>
          ) : pctAgua >= 50 ? (
            <p className="mt-2 mb-2 text-xs font-medium text-sky-400/60 text-center">
              💪 ¡Vas a la mitad! Mantén el ritmo.
            </p>
          ) : (
            <div className="mt-2 mb-2" />
          )}

          {/* Entrada manual */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                min="1"
                placeholder="¿Cuánto tomaste?"
                value={mlManual}
                onChange={e => setMlManual(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && aplicarManual(1)}
                className="w-full bg-black/40 border border-white/8 rounded-2xl pl-4 pr-10 py-2 text-sm font-medium text-white placeholder-gray-700 outline-none focus:border-sky-500/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-600 pointer-events-none select-none">ml</span>
            </div>
            <button
              onClick={() => {
                reproducirSonido('gota')
                aplicarManual(1)
                setAguaSaltando(true)
                setTimeout(() => setAguaSaltando(false), 500)
              }}
              disabled={guardandoAgua || !mlManual}
              className="bg-[#38B6FF] hover:bg-[#5ec6ff] disabled:bg-[#38B6FF]/30 text-black font-bold rounded-2xl px-4 py-2 text-sm active:scale-95 transition-all whitespace-nowrap">
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
            <div className="border-t border-white/5 mt-3 pt-3">
              {permisoNotif === 'denied' ? (
                <p className="text-xs text-gray-600 text-center">
                  🔕 Notificaciones bloqueadas en el navegador.
                </p>
              ) : recordatoriosOn ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#38B6FF]/50">🔔 Recordatorios activos · 6 avisos al día</span>
                  <button onClick={desactivarRecordatorios} className="text-xs text-gray-600 hover:text-red-400 transition-colors">
                    Desactivar
                  </button>
                </div>
              ) : (
                <button
                  onClick={activarRecordatorios}
                  className="w-full border border-[#38B6FF]/20 rounded-xl py-2 text-xs font-medium text-[#38B6FF]/60 hover:text-[#38B6FF] hover:border-[#38B6FF]/40 transition-all">
                  🔔 Activar recordatorios de agua
                </button>
              )}
            </div>
          )}
        </div>

        {/* MÓDULOS */}
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Módulos</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <img
              src={imagenEntrena}
              alt=""
              className="modulo-caricatura absolute z-10 pointer-events-none select-none"
              style={{ right: '-14px', bottom: '8px', animation: 'rutinaFloatSalto 3s ease-in-out infinite' }}
            />
            <a href="/rutinas"
              className="block rounded-xl p-4 transition-all border border-[#FFD0A3]/50 hover:border-[#FFD0A3]/80"
              style={{ background: 'linear-gradient(135deg, #1a0c00 0%, #110800 100%)', boxShadow: '0 0 18px rgba(255,157,66,0.10)' }}>
              <div className="text-2xl mb-2">📋</div>
              <div className="text-sm font-semibold mb-1 text-[#FF9D42]">Rutinas</div>
              <div className="text-xs text-gray-500">Mis entrenamientos</div>
            </a>
          </div>
          <div className="relative">
            <img
              src={imagenProteina}
              alt=""
              className="modulo-caricatura absolute z-10 pointer-events-none select-none"
              style={{ right: '-14px', bottom: '8px', animation: 'progresoBalanceo 3s ease-in-out infinite' }}
            />
            <a href="/progreso"
              className="block rounded-xl p-4 transition-all border border-[#DCC4FF]/50 hover:border-[#DCC4FF]/80"
              style={{ background: 'linear-gradient(135deg, #0e0820 0%, #090618 100%)', boxShadow: '0 0 18px rgba(181,123,255,0.10)' }}>
              <div className="text-2xl mb-2">📈</div>
              <div className="text-sm font-semibold mb-1 text-[#B57BFF]">Progreso</div>
              <div className="text-xs text-gray-500">Seguimiento corporal</div>
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
