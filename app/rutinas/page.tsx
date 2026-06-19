'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DIAS_CORTO = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function diaSemanaLocal(d: Date): string {
  return DIAS[[6,0,1,2,3,4,5][d.getDay()]]
}

function buildCalendar(year: number, month: number): Array<Date | null> {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = (firstDay.getDay() + 6) % 7
  const cells: Array<Date | null> = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

type Filtro =
  | { label: string; col: 'categoria'; op: 'eq'; val: string }
  | { label: string; col: 'musculo_principal'; op: 'ilike'; val: string }

const FILTROS: Filtro[] = [
  { label: 'Pecho',        col: 'categoria',         op: 'eq',    val: 'Pecho' },
  { label: 'Espalda',      col: 'categoria',         op: 'eq',    val: 'Espalda' },
  { label: 'Hombros',      col: 'categoria',         op: 'eq',    val: 'Hombros' },
  { label: 'Bíceps',       col: 'musculo_principal',  op: 'ilike', val: '%biceps%' },
  { label: 'Tríceps',      col: 'musculo_principal',  op: 'ilike', val: '%triceps%' },
  { label: 'Piernas',      col: 'categoria',         op: 'eq',    val: 'Piernas' },
  { label: 'Glúteos',      col: 'categoria',         op: 'eq',    val: 'Gluteos' },
  { label: 'Pantorrillas', col: 'categoria',         op: 'eq',    val: 'Pantorrillas' },
  { label: 'Core',         col: 'categoria',         op: 'eq',    val: 'Core' },
]

const fechaRelativa = (fecha: string): string => {
  const dias = Math.floor((Date.now() - new Date(fecha + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'hace 1 día'
  if (dias < 7) return `hace ${dias} días`
  const semanas = Math.floor(dias / 7)
  return semanas === 1 ? 'hace 1 semana' : `hace ${semanas} semanas`
}

type EjBasico = { id: string; nombre: string; musculo_principal: string }

type REjercicio = {
  id: string
  ejercicio_id: string
  dia_semana: string | null
  orden: number
  series: number
  repeticiones: string
  descanso_segundos: number
  ejercicios: EjBasico | null
}

type Rutina = {
  id: string
  nombre: string
  dias_semana: number
  rutina_ejercicios: REjercicio[]
}

type SerieDato = { reps: string; peso: string; ok: boolean }

type SesionState = {
  rutina: Rutina
  dia: string
  fecha: string
  ejercicios: REjercicio[]
}

type WizardState = {
  paso: 1 | 2
  nombre: string
  diasElegidos: string[]   // en orden DIAS
  rutinaId: string | null  // se asigna al terminar paso 1
  diaActivo: string        // tab activo en paso 2
}

function beepFinDescanso(ctx: AudioContext) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = 880
  osc.connect(gain)
  gain.connect(ctx.destination)

  const beepDur = 0.15
  const gap = 0.12
  const repeticiones = 3
  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  for (let i = 0; i < repeticiones; i++) {
    const t0 = ctx.currentTime + i * (beepDur + gap)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(0.5, t0 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + beepDur)
  }
  osc.start()
  osc.stop(ctx.currentTime + repeticiones * (beepDur + gap))
}

function CronometroDescanso({ segundosIniciales }: { segundosIniciales: number }) {
  const inicial = segundosIniciales > 0 ? segundosIniciales : 60
  const [duracion, setDuracion] = useState(inicial)
  const [restante, setRestante] = useState(inicial)
  const [corriendo, setCorriendo] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Cuenta regresiva
  useEffect(() => {
    if (!corriendo) return
    const id = setInterval(() => setRestante(s => Math.max(s - 1, 0)), 1000)
    return () => clearInterval(id)
  }, [corriendo])

  // Alarma al llegar a 0
  useEffect(() => {
    if (corriendo && restante === 0) {
      setCorriendo(false)
      if (audioCtxRef.current) beepFinDescanso(audioCtxRef.current)
    }
  }, [restante, corriendo])

  const iniciar = () => {
    // El AudioContext solo puede crearse/desbloquearse tras un gesto del usuario (clave en iOS)
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioCtxRef.current = new AudioCtxClass()
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    if (restante === 0) setRestante(duracion)
    setCorriendo(true)
  }

  const pausar = () => setCorriendo(false)

  const reiniciar = () => {
    setCorriendo(false)
    setRestante(duracion)
  }

  const cambiarDuracion = (valor: string) => {
    const v = Math.max(1, parseInt(valor) || 1)
    setDuracion(v)
    setRestante(v)
  }

  const r = 16
  const circunferencia = 2 * Math.PI * r
  const pct = duracion > 0 ? restante / duracion : 0
  const offset = circunferencia * (1 - pct)

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="1"
        value={duracion}
        onChange={e => cambiarDuracion(e.target.value)}
        disabled={corriendo}
        className="w-11 bg-[#1a1a1a] border border-white/10 rounded-lg py-1 text-xs text-white text-center focus:outline-none focus:border-[#F5C518]/50 disabled:opacity-50"
      />
      <span className="text-[10px] text-gray-600">s</span>

      <div className="relative w-10 h-10 shrink-0">
        <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}>
          <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
          <circle
            cx="20" cy="20" r={r} fill="none"
            stroke={restante === 0 ? '#EF4444' : '#F5C518'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
          {restante}
        </div>
      </div>

      <div className="flex gap-1">
        {!corriendo ? (
          <button
            onClick={iniciar}
            className="w-7 h-7 rounded-full bg-[#F5C518] text-black flex items-center justify-center text-[10px]">
            ▶
          </button>
        ) : (
          <button
            onClick={pausar}
            className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px]">
            ⏸
          </button>
        )}
        <button
          onClick={reiniciar}
          className="w-7 h-7 rounded-full bg-white/10 text-gray-300 flex items-center justify-center text-[10px]">
          ↺
        </button>
      </div>
    </div>
  )
}

export default function RutinasPage() {
  const [rutinas, setRutinas]   = useState<Rutina[]>([])
  const [cargando, setCargando] = useState(true)
  const [userId, setUserId]     = useState<string | null>(null)

  const [fechaActiva, setFechaActiva] = useState<Record<string, string>>({})
  const [mesActivo, setMesActivo]     = useState<Record<string, { y: number; m: number }>>({})
  const [sesionesMap, setSesionesMap] = useState<Record<string, Set<string>>>({})

  // Borrar rutina
  const [confirmBorrar, setConfirmBorrar] = useState<string | null>(null)
  const [borrando, setBorrando]           = useState(false)

  // Borrar ejercicio de la plantilla
  const [confirmBorrarEj, setConfirmBorrarEj] = useState<string | null>(null)
  const [borrandoEj, setBorrandoEj]           = useState(false)

  // Wizard de creación
  const [wizard, setWizard]               = useState<WizardState | null>(null)
  const [guardandoRutina, setGuardandoRutina] = useState(false)
  const [errorCrear, setErrorCrear]       = useState<string | null>(null)

  // Agregar ejercicio
  const [modalEj, setModalEj]               = useState<{ rutinaId: string; dia: string } | null>(null)
  const [grupoFiltro, setGrupoFiltro]       = useState(FILTROS[0].label)
  const [busquedaEj, setBusquedaEj]         = useState('')
  const [ejsCat, setEjsCat]                 = useState<EjBasico[]>([])
  const [cargandoCat, setCargandoCat]       = useState(false)
  const [insertandoEjId, setInsertandoEjId] = useState<string | null>(null)
  const [errorEj, setErrorEj]               = useState<string | null>(null)
  const [agregadosCount, setAgregadosCount] = useState(0)

  // Sesión
  const [sesion, setSesion]               = useState<SesionState | null>(null)
  const [registros, setRegistros]         = useState<Record<string, SerieDato[]>>({})
  const [historial, setHistorial]         = useState<Record<string, string>>({})
  const [ultimoPesos, setUltimoPesos]     = useState<Record<string, number>>({})
  const [guardandoSesion, setGuardandoSesion] = useState(false)
  const [sesionOk, setSesionOk]           = useState(false)

  const hoyStr = toLocalDate(new Date())

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  const cargarRutinas = useCallback(async () => {
    if (!userId) return
    setCargando(true)

    const [{ data: rutinaData }, { data: sesionesData }] = await Promise.all([
      supabase
        .from('rutinas')
        .select('id, nombre, dias_semana, rutina_ejercicios(id, ejercicio_id, dia_semana, orden, series, repeticiones, descanso_segundos, ejercicios(id, nombre, musculo_principal))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('sesiones')
        .select('rutina_id, fecha')
        .eq('user_id', userId)
        .eq('numero_serie', 1)
        .limit(1000),
    ])

    const parsed: Rutina[] = ((rutinaData || []) as unknown as Rutina[]).map(r => ({
      ...r,
      rutina_ejercicios: [...(r.rutina_ejercicios || [])].sort((a, b) => a.orden - b.orden),
    }))

    setRutinas(parsed)

    const hoy = new Date()
    setFechaActiva(prev => {
      const next = { ...prev }
      parsed.forEach(r => { if (!next[r.id]) next[r.id] = hoyStr })
      return next
    })
    setMesActivo(prev => {
      const next = { ...prev }
      parsed.forEach(r => {
        if (!next[r.id]) next[r.id] = { y: hoy.getFullYear(), m: hoy.getMonth() }
      })
      return next
    })

    const map: Record<string, Set<string>> = {}
    for (const s of sesionesData ?? []) {
      if (!map[s.rutina_id]) map[s.rutina_id] = new Set()
      map[s.rutina_id].add(s.fecha)
    }
    setSesionesMap(map)

    setCargando(false)
  }, [userId, hoyStr])

  useEffect(() => { cargarRutinas() }, [cargarRutinas])

  useEffect(() => {
    if (!modalEj) return
    const f = FILTROS.find(x => x.label === grupoFiltro) ?? FILTROS[0]
    setCargandoCat(true)
    const base = supabase.from('ejercicios').select('id, nombre, musculo_principal')
    const q = f.op === 'eq' ? base.eq(f.col, f.val) : base.ilike(f.col, f.val)
    q.order('nombre').then(({ data }) => { setEjsCat(data || []); setCargandoCat(false) })
  }, [grupoFiltro, modalEj])

  const prevMes = (rutinaId: string) =>
    setMesActivo(prev => {
      const cur = prev[rutinaId] ?? { y: new Date().getFullYear(), m: new Date().getMonth() }
      return { ...prev, [rutinaId]: cur.m === 0 ? { y: cur.y - 1, m: 11 } : { y: cur.y, m: cur.m - 1 } }
    })

  const nextMes = (rutinaId: string) =>
    setMesActivo(prev => {
      const cur = prev[rutinaId] ?? { y: new Date().getFullYear(), m: new Date().getMonth() }
      return { ...prev, [rutinaId]: cur.m === 11 ? { y: cur.y + 1, m: 0 } : { y: cur.y, m: cur.m + 1 } }
    })

  // ── Borrar rutina ──
  const borrarRutina = async (rutinaId: string) => {
    setBorrando(true)
    await supabase.from('rutina_ejercicios').delete().eq('rutina_id', rutinaId)
    await supabase.from('rutinas').delete().eq('id', rutinaId)
    setBorrando(false)
    setConfirmBorrar(null)
    cargarRutinas()
  }

  // ── Wizard: crear rutina ──
  const abrirWizard = () => {
    setWizard({ paso: 1, nombre: '', diasElegidos: [], rutinaId: null, diaActivo: '' })
    setErrorCrear(null)
  }

  const cerrarWizard = () => {
    setWizard(null)
    setErrorCrear(null)
  }

  const toggleDiaWizard = (dia: string) => {
    setWizard(prev => {
      if (!prev) return prev
      const raw = prev.diasElegidos.includes(dia)
        ? prev.diasElegidos.filter(d => d !== dia)
        : [...prev.diasElegidos, dia]
      return { ...prev, diasElegidos: DIAS.filter(d => raw.includes(d)) }
    })
  }

  const avanzarPaso1 = async () => {
    if (!wizard || !wizard.nombre.trim() || wizard.diasElegidos.length === 0 || !userId) return
    setGuardandoRutina(true)
    setErrorCrear(null)
    const { data, error } = await supabase
      .from('rutinas')
      .insert({ user_id: userId, nombre: wizard.nombre.trim(), dias_semana: wizard.diasElegidos.length })
      .select('id')
      .single()
    if (error || !data) {
      setErrorCrear(error?.message ?? 'Error al crear la rutina')
      setGuardandoRutina(false)
      return
    }
    await cargarRutinas()
    setGuardandoRutina(false)
    setWizard(prev => prev
      ? { ...prev, paso: 2, rutinaId: data.id, diaActivo: prev.diasElegidos[0] }
      : null)
  }

  const terminarWizard = () => {
    setWizard(null)
    setErrorCrear(null)
  }

  // ── Borrar ejercicio de la plantilla ──
  const borrarEjercicio = async (reId: string) => {
    setBorrandoEj(true)
    await supabase.from('rutina_ejercicios').delete().eq('id', reId)
    setBorrandoEj(false)
    setConfirmBorrarEj(null)
    cargarRutinas()
  }

  // ── Agregar ejercicio ──
  const abrirModalEj = (rutinaId: string, dia: string) => {
    setModalEj({ rutinaId, dia })
    setGrupoFiltro(FILTROS[0].label)
    setBusquedaEj('')
    setErrorEj(null)
    setAgregadosCount(0)
  }

  const cerrarModalEj = () => {
    setModalEj(null)
    setEjsCat([])
    setErrorEj(null)
    setAgregadosCount(0)
    cargarRutinas()
  }

  const agregarEjercicioDirecto = async (ej: EjBasico) => {
    if (!modalEj) return
    setInsertandoEjId(ej.id)
    setErrorEj(null)
    const rutina = rutinas.find(r => r.id === modalEj.rutinaId)
    const ejsDia = (rutina?.rutina_ejercicios || []).filter(e => e.dia_semana === modalEj.dia)
    const orden = ejsDia.length + 1
    const { error } = await supabase.from('rutina_ejercicios').insert({
      rutina_id: modalEj.rutinaId,
      ejercicio_id: ej.id,
      dia_semana: modalEj.dia,
      orden,
      series: 3,
      repeticiones: '10',
      descanso_segundos: 90,
    })
    setInsertandoEjId(null)
    if (error) { setErrorEj(error.message); return }
    setAgregadosCount(c => c + 1)
    cargarRutinas()
  }

  // ── Iniciar sesión ──
  const iniciarSesion = async (rutina: Rutina, dia: string, fecha: string) => {
    const ejercicios = rutina.rutina_ejercicios
      .filter(e => e.dia_semana === dia)
      .sort((a, b) => a.orden - b.orden)
    if (!ejercicios.length || !userId) return

    const ejIds = ejercicios.map(e => e.ejercicio_id)

    const { data: sesionFecha } = await supabase
      .from('sesiones')
      .select('ejercicio_id, numero_serie, peso_kg, repeticiones, completada')
      .eq('user_id', userId)
      .eq('rutina_id', rutina.id)
      .in('ejercicio_id', ejIds)
      .eq('fecha', fecha)
      .eq('dia_semana', dia)
      .order('numero_serie', { ascending: true })

    const { data: referenciaRaw } = await supabase
      .from('sesiones')
      .select('ejercicio_id, peso_kg, repeticiones, fecha, dia_semana')
      .eq('user_id', userId)
      .eq('rutina_id', rutina.id)
      .in('ejercicio_id', ejIds)
      .order('fecha', { ascending: false })

    const sesionFechaMap: Record<string, Array<{ numero_serie: number; peso_kg: number | null; repeticiones: string | null; completada: boolean | null }>> = {}
    for (const d of sesionFecha ?? []) {
      if (!sesionFechaMap[d.ejercicio_id]) sesionFechaMap[d.ejercicio_id] = []
      sesionFechaMap[d.ejercicio_id].push(d)
    }

    const refMap: Record<string, { peso_kg: number | null; repeticiones: string | null; fecha: string }> = {}
    for (const d of referenciaRaw ?? []) {
      if (d.fecha === fecha && d.dia_semana === dia) continue
      if (!refMap[d.ejercicio_id]) refMap[d.ejercicio_id] = d
    }

    const histMap: Record<string, string> = {}
    const pesosNum: Record<string, number> = {}
    for (const ejId of ejIds) {
      const ref = refMap[ejId]
      if (ref) {
        const partes: string[] = []
        if (ref.peso_kg) partes.push(`${ref.peso_kg}kg`)
        if (ref.repeticiones) partes.push(`${ref.repeticiones} reps`)
        const rel = ref.fecha ? ` · ${fechaRelativa(ref.fecha)}` : ''
        if (partes.length) histMap[ejId] = `Última vez: ${partes.join(' × ')}${rel}`
        if (ref.peso_kg) pesosNum[ejId] = Number(ref.peso_kg)
      }
    }

    setHistorial(histMap)
    setUltimoPesos(pesosNum)

    const init: Record<string, SerieDato[]> = {}
    ejercicios.forEach(ej => {
      const seriesGuardadas = sesionFechaMap[ej.ejercicio_id]
      if (seriesGuardadas && seriesGuardadas.length > 0) {
        init[ej.id] = seriesGuardadas.map(s => ({
          reps: s.repeticiones ?? ej.repeticiones,
          peso: s.peso_kg != null ? String(s.peso_kg) : '',
          ok: Boolean(s.completada),
        }))
      } else {
        const ref = refMap[ej.ejercicio_id]
        init[ej.id] = [{ reps: ej.repeticiones, peso: ref?.peso_kg != null ? String(ref.peso_kg) : '', ok: false }]
      }
    })

    setRegistros(init)
    setSesion({ rutina, dia, fecha, ejercicios })
    setSesionOk(false)
  }

  const updateSerie = (ejId: string, idx: number, campo: keyof SerieDato, valor: string | boolean) =>
    setRegistros(prev => ({
      ...prev,
      [ejId]: prev[ejId].map((s, i) => i === idx ? { ...s, [campo]: valor } : s),
    }))

  const agregarSerie = (ejId: string) =>
    setRegistros(prev => {
      const series = prev[ejId] || []
      const ultimoPeso = series.length > 0 ? series[series.length - 1].peso : ''
      return { ...prev, [ejId]: [...series, { reps: '', peso: ultimoPeso, ok: false }] }
    })

  const eliminarSerie = (ejId: string, idx: number) =>
    setRegistros(prev => {
      const series = prev[ejId] || []
      if (series.length <= 1) return prev
      return { ...prev, [ejId]: series.filter((_, i) => i !== idx) }
    })

  const guardarSesion = async () => {
    if (!sesion || !userId) return
    setGuardandoSesion(true)
    const fecha = sesion.fecha
    const filas: object[] = []

    sesion.ejercicios.forEach(ej => {
      ;(registros[ej.id] || []).forEach((dato, i) => {
        filas.push({
          user_id:      userId,
          rutina_id:    sesion.rutina.id,
          ejercicio_id: ej.ejercicio_id,
          dia_semana:   sesion.dia,
          numero_serie: i + 1,
          repeticiones: dato.reps,
          peso_kg:      parseFloat(dato.peso) || null,
          completada:   dato.ok,
          fecha,
        })
      })
    })

    await supabase.from('sesiones').upsert(filas, { onConflict: 'user_id,ejercicio_id,numero_serie,fecha,dia_semana' })

    setSesionesMap(prev => {
      const set = new Set(prev[sesion.rutina.id] ?? [])
      set.add(fecha)
      return { ...prev, [sesion.rutina.id]: set }
    })

    setGuardandoSesion(false)
    setSesionOk(true)
  }

  // Datos del wizard paso 2
  const wizardRutina = wizard?.rutinaId ? rutinas.find(r => r.id === wizard.rutinaId) : null
  const wizardEjsDia = (wizardRutina?.rutina_ejercicios ?? [])
    .filter(e => e.dia_semana === wizard?.diaActivo)
    .sort((a, b) => a.orden - b.orden)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white max-w-lg mx-auto">

      {/* HEADER */}
      <div className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/10 px-5 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Fit<span className="text-[#F5C518]">Pro</span> JS</h1>
        <a href="/inicio" className="text-xs text-gray-400">← Inicio</a>
      </div>

      <div className="p-5">
        <h2 className="text-xl font-bold mb-5">Mis <span className="text-[#F5C518]">Rutinas</span></h2>

        {/* Skeleton */}
        {cargando && (
          <div className="flex flex-col gap-5">
            {[1, 2].map(i => (
              <div key={i} className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-2/3 mb-2" />
                <div className="h-3 bg-white/10 rounded w-1/4 mb-5" />
                <div className="h-40 bg-white/10 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {!cargando && rutinas.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <div className="text-5xl mb-4">🏋️</div>
            <div className="text-sm">Sin rutinas aún. Crea la primera abajo.</div>
          </div>
        )}

        {/* Lista de rutinas */}
        {!cargando && (
          <div className="flex flex-col gap-5 mb-5">
            {rutinas.map(rutina => {
              const mes = mesActivo[rutina.id] ?? { y: new Date().getFullYear(), m: new Date().getMonth() }
              const cells = buildCalendar(mes.y, mes.m)
              // Días de entrenamiento derivados de los ejercicios registrados
              const diasEnt = new Set(
                rutina.rutina_ejercicios
                  .map(e => e.dia_semana)
                  .filter((d): d is string => d !== null)
              )
              const completados = sesionesMap[rutina.id] ?? new Set<string>()
              const fechaSel = fechaActiva[rutina.id] ?? hoyStr
              const dateSel = new Date(fechaSel + 'T00:00:00')
              const diaSel = diaSemanaLocal(dateSel)
              const ejsDia = rutina.rutina_ejercicios
                .filter(e => e.dia_semana === diaSel)
                .sort((a, b) => a.orden - b.orden)
              const diaDisplay = `${diaSel} ${dateSel.getDate()} de ${MESES[dateSel.getMonth()].toLowerCase()}`

              return (
                <div key={rutina.id} className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">

                  {/* Cabecera rutina */}
                  <div className="px-5 pt-5 pb-3 flex items-start justify-between">
                    <div>
                      <div className="text-xl font-black leading-tight">{rutina.nombre}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{rutina.dias_semana} días por semana</div>
                    </div>
                    {confirmBorrar === rutina.id ? (
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-xs text-gray-400">¿Eliminar?</span>
                        <button
                          onClick={() => borrarRutina(rutina.id)}
                          disabled={borrando}
                          className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-2.5 py-1 hover:bg-red-500/30 transition-colors disabled:opacity-50">
                          {borrando ? '...' : 'Sí'}
                        </button>
                        <button
                          onClick={() => setConfirmBorrar(null)}
                          className="text-xs text-gray-500 border border-white/10 rounded-lg px-2.5 py-1 hover:text-white transition-colors">
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmBorrar(rutina.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors ml-3 mt-0.5 text-lg leading-none shrink-0"
                        title="Eliminar rutina">
                        🗑
                      </button>
                    )}
                  </div>

                  {/* ── CALENDARIO ── */}
                  <div className="px-5 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => prevMes(rutina.id)}
                        className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                        ‹
                      </button>
                      <span className="text-xs font-semibold text-gray-300">
                        {MESES[mes.m]} {mes.y}
                      </span>
                      <button
                        onClick={() => nextMes(rutina.id)}
                        className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                        ›
                      </button>
                    </div>

                    <div className="grid grid-cols-7 mb-1">
                      {DIAS_CORTO.map(d => (
                        <div key={d} className="text-[9px] text-gray-600 text-center uppercase tracking-wide">{d}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7">
                      {cells.map((date, i) => {
                        if (!date) return <div key={i} className="h-9" />

                        const fs = toLocalDate(date)
                        const diaSem = diaSemanaLocal(date)
                        const esEnt  = diasEnt.has(diaSem)
                        const esDone = completados.has(fs)
                        const esSel  = fechaSel === fs
                        const esHoy  = hoyStr === fs

                        let circulo = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold mx-auto transition-all relative select-none '

                        if (esSel && esDone)      circulo += 'bg-green-500 text-white'
                        else if (esSel && esHoy)  circulo += 'bg-[#F5C518] text-black'
                        else if (esSel)            circulo += 'bg-[#F5C518] text-black'
                        else if (esDone)           circulo += 'bg-green-500/15 text-green-400'
                        else if (esHoy)            circulo += 'ring-1 ring-[#F5C518] text-[#F5C518]'
                        else if (esEnt)            circulo += 'text-white hover:bg-white/8 cursor-pointer'
                        else                       circulo += 'text-gray-700 hover:bg-white/5 cursor-pointer'

                        return (
                          <div key={i} className="h-9 flex items-center justify-center">
                            <div
                              className={circulo}
                              onClick={() => setFechaActiva(prev => ({ ...prev, [rutina.id]: fs }))}>
                              {date.getDate()}
                              {esDone && !esSel && (
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* ── CONTENIDO DEL DÍA SELECCIONADO ── */}
                  <div className="px-5 pb-5">
                    <div className="text-[11px] text-gray-500 font-medium mb-3 capitalize">{diaDisplay}</div>

                    {ejsDia.length === 0 ? (
                      <div className="text-xs text-gray-600 py-4 text-center border border-dashed border-white/8 rounded-xl mb-3">
                        Sin ejercicios para {diaSel}
                      </div>
                    ) : (
                      <div className="mb-3">
                        {ejsDia.map((ej, i) => (
                          <div key={ej.id} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                            <span className="text-[#F5C518] text-xs font-bold w-4 text-center shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{ej.ejercicios?.nombre}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5">{ej.ejercicios?.musculo_principal}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs text-gray-400 font-medium">{ej.series}×{ej.repeticiones}</div>
                              {ej.descanso_segundos > 0 && (
                                <div className="text-[10px] text-gray-700">{ej.descanso_segundos}s</div>
                              )}
                            </div>
                            {confirmBorrarEj === ej.id ? (
                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                <button
                                  onClick={() => borrarEjercicio(ej.id)}
                                  disabled={borrandoEj}
                                  className="text-[10px] text-red-400 border border-red-500/30 rounded px-1.5 py-0.5 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                                  {borrandoEj ? '...' : 'Sí'}
                                </button>
                                <button
                                  onClick={() => setConfirmBorrarEj(null)}
                                  className="text-[10px] text-gray-500 border border-white/10 rounded px-1.5 py-0.5 hover:text-white transition-colors">
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmBorrarEj(ej.id)}
                                className="text-gray-700 hover:text-red-400 transition-colors ml-1 shrink-0 text-base leading-none">
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => abrirModalEj(rutina.id, diaSel)}
                        className="flex-1 border border-white/15 rounded-xl py-2.5 text-xs text-gray-400 hover:border-white/30 hover:text-white transition-colors font-medium">
                        ＋ Agregar
                      </button>
                      <button
                        onClick={() => iniciarSesion(rutina, diaSel, fechaSel)}
                        disabled={ejsDia.length === 0}
                        className="flex-[2] bg-[#F5C518] text-black font-bold rounded-xl py-2.5 text-sm disabled:opacity-25 transition-opacity">
                        ▶ Iniciar sesión
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={abrirWizard}
          className="w-full border border-dashed border-[#F5C518]/30 rounded-2xl py-4 text-[#F5C518] text-sm font-semibold hover:border-[#F5C518] hover:bg-[#F5C518]/5 transition-colors">
          ＋ Crear nueva rutina
        </button>
      </div>

      {/* ══════════════════════════════════
          WIZARD — CREAR RUTINA (pantalla completa)
      ══════════════════════════════════ */}
      {wizard && (
        <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col max-w-lg mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">
                Paso {wizard.paso} de 2
              </div>
              <div className="font-bold text-sm">
                {wizard.paso === 1 ? 'Nueva rutina' : wizard.nombre}
              </div>
            </div>
            <button
              onClick={cerrarWizard}
              className="text-xs text-gray-500 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors">
              Cancelar
            </button>
          </div>

          {/* Barra de progreso */}
          <div className="h-0.5 bg-white/10 shrink-0">
            <div
              className="h-full bg-[#F5C518] transition-all duration-300"
              style={{ width: wizard.paso === 1 ? '50%' : '100%' }}
            />
          </div>

          {/* ── PASO 1: nombre + días ── */}
          {wizard.paso === 1 && (
            <>
              <div className="flex-1 overflow-y-auto px-5 py-6">
                <div className="flex flex-col gap-7">

                  {/* Nombre */}
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-widest mb-2.5 block">
                      Nombre de la rutina
                    </label>
                    <input
                      value={wizard.nombre}
                      onChange={e => setWizard(prev => prev ? { ...prev, nombre: e.target.value } : prev)}
                      placeholder="Ej: Push / Pull / Legs"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && avanzarPaso1()}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#F5C518]/50"
                    />
                  </div>

                  {/* Días */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs text-gray-400 uppercase tracking-widest">
                        Días de entrenamiento
                      </label>
                      {wizard.diasElegidos.length > 0 && (
                        <span className="text-xs text-[#F5C518] font-semibold">
                          {wizard.diasElegidos.length} día{wizard.diasElegidos.length > 1 ? 's' : ''} por semana
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {DIAS.map((dia, i) => {
                        const sel = wizard.diasElegidos.includes(dia)
                        return (
                          <button
                            key={dia}
                            onClick={() => toggleDiaWizard(dia)}
                            className={`py-3 rounded-xl text-xs font-bold transition-colors ${
                              sel
                                ? 'bg-[#F5C518] text-black'
                                : 'bg-[#1a1a1a] text-gray-500 border border-white/10 hover:border-white/25 hover:text-white'
                            }`}>
                            {DIAS_CORTO[i]}
                          </button>
                        )
                      })}
                    </div>
                    {wizard.diasElegidos.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {wizard.diasElegidos.map(d => (
                          <span key={d} className="text-[10px] text-[#F5C518]/70 bg-[#F5C518]/8 border border-[#F5C518]/20 rounded-full px-2.5 py-0.5">
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {errorCrear && (
                  <div className="mt-5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                    {errorCrear}
                  </div>
                )}
              </div>

              <div className="px-5 pb-10 pt-3 shrink-0">
                <button
                  onClick={avanzarPaso1}
                  disabled={!wizard.nombre.trim() || wizard.diasElegidos.length === 0 || guardandoRutina}
                  className="w-full bg-[#F5C518] text-black font-bold py-4 rounded-2xl text-base disabled:opacity-30 transition-opacity">
                  {guardandoRutina ? 'Creando...' : 'Siguiente →'}
                </button>
              </div>
            </>
          )}

          {/* ── PASO 2: armar plantilla por día ── */}
          {wizard.paso === 2 && (
            <>
              {/* Tabs de días elegidos */}
              <div className="px-5 pt-4 shrink-0">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Selecciona un día para armar su plantilla</p>
                <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                  {wizard.diasElegidos.map(dia => {
                    const ejsEnDia = (wizardRutina?.rutina_ejercicios ?? []).filter(e => e.dia_semana === dia).length
                    return (
                      <button
                        key={dia}
                        onClick={() => setWizard(prev => prev ? { ...prev, diaActivo: dia } : prev)}
                        className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors relative ${
                          wizard.diaActivo === dia
                            ? 'bg-[#F5C518] text-black'
                            : 'bg-[#1a1a1a] text-gray-400 border border-white/10 hover:border-white/25'
                        }`}>
                        {dia}
                        {ejsEnDia > 0 && (
                          <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                            wizard.diaActivo === dia ? 'bg-black text-[#F5C518]' : 'bg-[#F5C518] text-black'
                          }`}>
                            {ejsEnDia}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-4">
                {/* Lista de ejercicios del día activo */}
                {wizardEjsDia.length === 0 ? (
                  <div className="text-xs text-gray-600 py-10 text-center border border-dashed border-white/8 rounded-xl mb-3">
                    Sin ejercicios para el {wizard.diaActivo}
                  </div>
                ) : (
                  <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden mb-3">
                    {wizardEjsDia.map((ej, i) => (
                      <div key={ej.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
                        <span className="text-[#F5C518] text-xs font-bold w-4 text-center shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{ej.ejercicios?.nombre}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">{ej.ejercicios?.musculo_principal}</div>
                        </div>
                        <div className="text-xs text-gray-500 shrink-0">{ej.series}×{ej.repeticiones}</div>
                        {confirmBorrarEj === ej.id ? (
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <button
                              onClick={() => borrarEjercicio(ej.id)}
                              disabled={borrandoEj}
                              className="text-[10px] text-red-400 border border-red-500/30 rounded px-1.5 py-0.5 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                              {borrandoEj ? '...' : 'Sí'}
                            </button>
                            <button
                              onClick={() => setConfirmBorrarEj(null)}
                              className="text-[10px] text-gray-500 border border-white/10 rounded px-1.5 py-0.5 hover:text-white transition-colors">
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmBorrarEj(ej.id)}
                            className="text-gray-700 hover:text-red-400 transition-colors ml-1 shrink-0 text-base leading-none">
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {wizard.rutinaId && (
                  <button
                    onClick={() => abrirModalEj(wizard.rutinaId!, wizard.diaActivo)}
                    className="w-full border border-dashed border-white/15 rounded-xl py-3 text-xs text-gray-400 hover:border-[#F5C518]/40 hover:text-[#F5C518] transition-colors font-medium">
                    ＋ Agregar ejercicio al {wizard.diaActivo}
                  </button>
                )}
              </div>

              <div className="px-5 pb-10 pt-3 border-t border-white/10 shrink-0">
                <button
                  onClick={terminarWizard}
                  className="w-full bg-[#F5C518] text-black font-bold py-4 rounded-2xl text-base">
                  Listo — Ver calendario →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════
          MODAL AGREGAR EJERCICIO
      ══════════════════════════ */}
      {modalEj && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-end justify-center">
          <div className="bg-[#111] border border-white/10 rounded-t-3xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <div>
                <div className="font-bold text-sm">Agregar ejercicio</div>
                <div className="text-xs text-[#F5C518]">{modalEj.dia}</div>
              </div>
              <button onClick={cerrarModalEj} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            {agregadosCount > 0 && (
              <div className="mx-5 mb-3 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400 shrink-0">
                ✓ {agregadosCount} ejercicio{agregadosCount > 1 ? 's' : ''} agregado{agregadosCount > 1 ? 's' : ''} a {modalEj.dia}
              </div>
            )}
            <div className="px-5 pb-2 shrink-0">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {FILTROS.map(f => (
                  <button key={f.label} onClick={() => { setGrupoFiltro(f.label); setBusquedaEj('') }}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
                      ${grupoFiltro === f.label ? 'bg-[#F5C518] text-black' : 'bg-[#1a1a1a] text-gray-400 border border-white/10'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-5 pb-3 shrink-0">
              <input
                value={busquedaEj}
                onChange={e => setBusquedaEj(e.target.value)}
                placeholder="Buscar en este grupo..."
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#F5C518]/40"
              />
            </div>
            {errorEj && (
              <div className="mx-5 mb-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 shrink-0">{errorEj}</div>
            )}
            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {cargandoCat ? (
                [...Array(6)].map((_, i) => <div key={i} className="h-14 bg-[#1a1a1a] rounded-xl animate-pulse mb-2" />)
              ) : (() => {
                const visibles = busquedaEj.trim()
                  ? ejsCat.filter(e => e.nombre.toLowerCase().includes(busquedaEj.toLowerCase()))
                  : ejsCat
                return visibles.length === 0 ? (
                  <div className="text-center text-gray-600 text-sm py-10">
                    {busquedaEj ? `Sin resultados para "${busquedaEj}"` : `Sin ejercicios en ${grupoFiltro}`}
                  </div>
                ) : visibles.map(ej => (
                  <button
                    key={ej.id}
                    onClick={() => agregarEjercicioDirecto(ej)}
                    disabled={insertandoEjId !== null}
                    className="w-full text-left px-4 py-3.5 rounded-xl hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 disabled:opacity-60 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{ej.nombre}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{ej.musculo_principal}</div>
                    </div>
                    {insertandoEjId === ej.id && (
                      <span className="text-[#F5C518] text-xs ml-3 shrink-0">Agregando…</span>
                    )}
                  </button>
                ))
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          SESIÓN (pantalla completa)
      ══════════════════════════════════ */}
      {sesion && (
        <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col max-w-lg mx-auto">

          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">
                {sesion.dia} · {new Date(sesion.fecha + 'T00:00:00').getDate()} {MESES[new Date(sesion.fecha + 'T00:00:00').getMonth()].toLowerCase()} · Sesión en curso
              </div>
              <div className="font-bold text-sm mt-0.5">{sesion.rutina.nombre}</div>
            </div>
            <button onClick={() => setSesion(null)}
              className="text-xs text-gray-500 hover:text-white border border-white/10 rounded-lg px-3 py-1.5">
              Salir
            </button>
          </div>

          {!sesionOk ? (
            <>
              <div className="flex-1 overflow-y-auto px-5 py-5">
                {sesion.ejercicios.map((ej, idx) => (
                  <div key={ej.id} className="mb-7">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-base font-black">{ej.ejercicios?.nombre}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{ej.ejercicios?.musculo_principal}</div>
                        {historial[ej.ejercicio_id] && (
                          <div className="text-[10px] text-[#F5C518]/60 mt-1 flex items-center gap-2 flex-wrap">
                            <span>{historial[ej.ejercicio_id]}</span>
                            {ultimoPesos[ej.ejercicio_id] > 0 &&
                             (registros[ej.id] || []).some(s => parseFloat(s.peso) > ultimoPesos[ej.ejercicio_id]) && (() => {
                               const maxPeso = Math.max(...(registros[ej.id] || []).map(s => parseFloat(s.peso) || 0))
                               const diff = (maxPeso - ultimoPesos[ej.ejercicio_id]).toFixed(1).replace(/\.0$/, '')
                               return (
                                 <span className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap">
                                   ↑ Subiste +{diff}kg
                                 </span>
                               )
                             })()}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <div className="text-[10px] text-gray-600 uppercase">Plan</div>
                        <div className="text-sm font-bold text-[#F5C518]">{ej.series}×{ej.repeticiones}</div>
                        {ej.descanso_segundos > 0 && (
                          <div className="text-[10px] text-gray-700">{ej.descanso_segundos}s desc.</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3 bg-[#111] border border-white/5 rounded-xl px-3 py-2">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wide">Descanso</span>
                      <CronometroDescanso segundosIniciales={ej.descanso_segundos} />
                    </div>

                    <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem_1.25rem] gap-2 mb-1.5 px-0.5">
                      {['#', 'Reps', 'kg', '✓', ''].map(h => (
                        <div key={h} className="text-[9px] text-gray-700 uppercase text-center">{h}</div>
                      ))}
                    </div>

                    {(registros[ej.id] || []).map((serie, i) => (
                      <div key={i} className="grid grid-cols-[2rem_1fr_1fr_2.5rem_1.25rem] gap-2 mb-2 items-center">
                        <div className={`text-xs font-bold text-center ${serie.ok ? 'text-[#F5C518]' : 'text-gray-600'}`}>
                          {i + 1}
                        </div>
                        <input
                          type="text"
                          value={serie.reps}
                          onChange={e => updateSerie(ej.id, i, 'reps', e.target.value)}
                          className={`bg-[#1a1a1a] border rounded-xl py-2.5 text-sm text-white text-center font-bold focus:outline-none transition-colors
                            ${serie.ok ? 'border-[#F5C518]/30 bg-[#F5C518]/5' : 'border-white/10'}`}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={serie.peso}
                          onChange={e => updateSerie(ej.id, i, 'peso', e.target.value)}
                          placeholder="—"
                          className={`bg-[#1a1a1a] border rounded-xl py-2.5 text-sm text-white text-center font-bold placeholder-gray-700 focus:outline-none transition-colors
                            ${serie.ok ? 'border-[#F5C518]/30 bg-[#F5C518]/5' : 'border-white/10'}`}
                        />
                        <button
                          onClick={() => updateSerie(ej.id, i, 'ok', !serie.ok)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all
                            ${serie.ok ? 'bg-[#F5C518] text-black scale-110' : 'bg-[#1a1a1a] border border-white/15 text-gray-600'}`}>
                          ✓
                        </button>
                        <button
                          onClick={() => eliminarSerie(ej.id, i)}
                          disabled={(registros[ej.id] || []).length <= 1}
                          className="w-5 h-5 flex items-center justify-center text-xs text-gray-700 hover:text-red-400 transition-colors disabled:opacity-0">
                          ×
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => agregarSerie(ej.id)}
                      className="mt-1 mb-1 flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#F5C518] transition-colors">
                      <span className="text-sm leading-none font-bold">+</span> Agregar serie
                    </button>

                    {idx < sesion.ejercicios.length - 1 && (
                      <div className="border-b border-white/5 mt-5" />
                    )}
                  </div>
                ))}
              </div>

              <div className="px-5 pb-8 pt-3 shrink-0">
                <button
                  onClick={guardarSesion}
                  disabled={guardandoSesion}
                  className="w-full bg-[#F5C518] text-black font-bold py-4 rounded-2xl text-base disabled:opacity-40">
                  {guardandoSesion ? 'Guardando...' : '✓ Guardar sesión'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
              <div className="text-7xl mb-6">🏆</div>
              <div className="text-3xl font-black mb-2">¡Sesión guardada!</div>
              <div className="text-sm text-gray-500 mb-2">
                {sesion.ejercicios.length} ejercicios · {sesion.dia}
              </div>
              <div className="text-xs text-gray-700 mb-10">
                {sesion.ejercicios.reduce((t, e) => t + (registros[e.id]?.filter(s => s.ok).length || 0), 0)} series completadas
              </div>
              <button onClick={() => setSesion(null)}
                className="w-full bg-[#F5C518] text-black font-bold py-4 rounded-2xl text-base">
                Volver a mis rutinas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
