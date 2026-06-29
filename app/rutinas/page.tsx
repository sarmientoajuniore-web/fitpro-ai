'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Share2, Users, Search, Download, Copy, Check, Dumbbell, Trash2, Calendar } from 'lucide-react'

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

type GrupoMuscular = { nombre: string; musculos?: string[]; categoria?: string }

// Grupos musculares en español para el selector de ejercicios, sobre los valores
// ya traducidos de musculo_principal/categoria en la base de datos.
// "Cardio" no es un músculo: se filtra por la columna categoria en vez de musculo_principal.
// Brazos y pantorrillas van como botones individuales (antes agrupados) para filtrar por músculo exacto.
const GRUPOS_MUSCULARES: GrupoMuscular[] = [
  { nombre: 'Pecho', musculos: ['Pecho'] },
  { nombre: 'Espalda', musculos: ['Dorsales', 'Espalda baja', 'Espalda media', 'Trapecios'] },
  { nombre: 'Hombros', musculos: ['Hombros', 'Cuello'] },
  { nombre: 'Bíceps', musculos: ['Bíceps'] },
  { nombre: 'Tríceps', musculos: ['Tríceps'] },
  { nombre: 'Antebrazos', musculos: ['Antebrazos'] },
  { nombre: 'Piernas', musculos: ['Cuádriceps', 'Isquiotibiales', 'Aductores', 'Abductores'] },
  { nombre: 'Glúteos', musculos: ['Glúteos'] },
  { nombre: 'Core', musculos: ['Abdominales'] },
  { nombre: 'Pantorrillas', musculos: ['Pantorrillas'] },
  { nombre: 'Cardio', categoria: 'Cardio' },
]

// Normaliza para comparar musculo_principal sin depender de mayúsculas/acentos.
function normalizarMusculo(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const fechaRelativa = (fecha: string): string => {
  const dias = Math.floor((Date.now() - new Date(fecha + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'hace 1 día'
  if (dias < 7) return `hace ${dias} días`
  const semanas = Math.floor(dias / 7)
  return semanas === 1 ? 'hace 1 semana' : `hace ${semanas} semanas`
}

type EjBasico = {
  id: string
  nombre: string
  musculo_principal: string
  categoria?: string | null
  equipo: string | null
  instrucciones: string | null
  imagenes: string[] | null
}

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
  codigo_compartir?: string | null
  rutina_ejercicios: REjercicio[]
}

type RutinaImport = {
  nombre: string
  dias_semana: number
  rutina_ejercicios: Array<{
    ejercicio_id: string
    dia_semana: string | null
    orden: number
    series: number
    repeticiones: string
    descanso_segundos: number
  }>
}

type SerieDato = {
  reps: string
  peso: string
  ok: boolean
  duracionMin: string
  calorias: string
  intensidad: string
}

function esCardio(ej: REjercicio | undefined | null): boolean {
  return ej?.ejercicios?.categoria === 'Cardio'
}

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

function vibrar(patron: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(patron)
  }
}

function pitido(ctx: AudioContext, t0: number, freq: number, dur: number, vol: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = freq
  osc.connect(gain)
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

// Aviso: un pitido por segundo durante los últimos 10s del descanso
function beepAviso(ctx: AudioContext) {
  pitido(ctx, ctx.currentTime, 880, 0.12, 0.35)
  vibrar(70)
}

// Alarma final al llegar a 0: ráfagas de pitidos rápidos y repetidos + vibración insistente
function alarmaFinal(ctx: AudioContext) {
  const rondas = 5
  const beepsPorRonda = 3
  const beepDur = 0.1
  const gapBeep = 0.06
  const gapRonda = 0.22
  for (let r = 0; r < rondas; r++) {
    for (let b = 0; b < beepsPorRonda; b++) {
      const t0 = ctx.currentTime + r * (beepsPorRonda * (beepDur + gapBeep) + gapRonda) + b * (beepDur + gapBeep)
      pitido(ctx, t0, 1300, beepDur, 0.6)
    }
  }
  vibrar([250, 120, 250, 120, 250, 120, 250, 120, 250])
}

function CronometroDescanso({ segundosIniciales }: { segundosIniciales: number }) {
  const inicial = segundosIniciales > 0 ? segundosIniciales : 90
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

  // Aviso en los últimos 10s + alarma final al llegar a 0
  useEffect(() => {
    if (!corriendo) return
    const ctx = audioCtxRef.current
    if (!ctx) return
    if (restante === 0) {
      setCorriendo(false)
      alarmaFinal(ctx)
    } else if (restante <= 10) {
      beepAviso(ctx)
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

  const r = 30
  const circunferencia = 2 * Math.PI * r
  const pct = duracion > 0 ? restante / duracion : 0
  const offset = circunferencia * (1 - pct)
  const enAviso = restante > 0 && restante <= 10

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center">
        <input
          type="number"
          min="1"
          value={duracion}
          onChange={e => cambiarDuracion(e.target.value)}
          disabled={corriendo}
          className="w-16 bg-[#1a1a1a] border border-white/10 rounded-lg py-1.5 text-sm text-white text-center focus:outline-none focus:border-[#B57BFF]/50 disabled:opacity-50"
        />
        <span className="text-[10px] text-gray-600 mt-0.5">segundos</span>
      </div>

      <div className="relative w-[72px] h-[72px] shrink-0">
        <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}>
          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
          <circle
            cx="36" cy="36" r={r} fill="none"
            stroke={restante === 0 || enAviso ? '#EF4444' : '#22D3EE'}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xl font-black" style={{ color: restante === 0 || enAviso ? '#EF4444' : '#22D3EE' }}>
          {restante}
        </div>
      </div>

      <div className="flex gap-2">
        {!corriendo ? (
          <button
            onClick={iniciar}
            className="w-11 h-11 rounded-full text-white flex items-center justify-center text-sm" style={{ background: '#22D3EE' }}>
            ▶
          </button>
        ) : (
          <button
            onClick={pausar}
            className="w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center text-sm">
            ⏸
          </button>
        )}
        <button
          onClick={reiniciar}
          className="w-11 h-11 rounded-full bg-white/10 text-gray-300 flex items-center justify-center text-sm">
          ↺
        </button>
      </div>
    </div>
  )
}

// Contenido de detalle de un ejercicio (foto, músculo, equipo, instrucciones).
// Se reutiliza tanto en el selector de ejercicios como en la sesión en curso.
function DetalleEjercicioContenido({ ej }: { ej: EjBasico }) {
  return (
    <>
      {ej.imagenes && ej.imagenes.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {ej.imagenes.slice(0, 3).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`${ej.nombre} ${i + 1}`}
              loading="lazy"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              className="h-40 w-auto rounded-xl border border-white/10 bg-black/30 object-contain shrink-0"
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs bg-[#1a1a1a] border border-white/10 rounded-full px-3 py-1 text-gray-300">
          💪 {ej.musculo_principal}
        </span>
        {ej.equipo && (
          <span className="text-xs bg-[#1a1a1a] border border-white/10 rounded-full px-3 py-1 text-gray-300">
            🏋️ {ej.equipo}
          </span>
        )}
      </div>

      {ej.instrucciones && (
        <div className="mb-5">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Instrucciones</div>
          <p className="text-sm text-gray-300 leading-relaxed">{ej.instrucciones}</p>
        </div>
      )}
    </>
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

  // Reordenar días de la rutina (panel expandible)
  const [reordenarDiasId, setReordenarDiasId] = useState<string | null>(null)

  // Wizard de creación
  const [wizard, setWizard]               = useState<WizardState | null>(null)
  const [guardandoRutina, setGuardandoRutina] = useState(false)
  const [errorCrear, setErrorCrear]       = useState<string | null>(null)

  // Agregar ejercicio
  const [modalEj, setModalEj]               = useState<{ rutinaId: string; dia: string } | null>(null)
  const [catFiltro, setCatFiltro]           = useState(GRUPOS_MUSCULARES[0].nombre)
  const [busquedaEj, setBusquedaEj]         = useState('')
  const [ejsCat, setEjsCat]                 = useState<EjBasico[]>([])
  const [cargandoCat, setCargandoCat]       = useState(false)
  const [detalleEj, setDetalleEj]           = useState<EjBasico | null>(null)
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
  const [detalleSesionEj, setDetalleSesionEj] = useState<EjBasico | null>(null)

  // Sesión: navegación uno a uno
  const [ejActivo, setEjActivo] = useState(0)
  const [fotoAbierta, setFotoAbierta] = useState(false)

  // Refs para el guardado automático (debounce al escribir kg/reps)
  const debounceAutoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const registrosRef        = useRef<Record<string, SerieDato[]>>({})
  const sesionRef           = useRef<SesionState | null>(null)
  const userIdRef           = useRef<string | null>(null)

  // Nombre del usuario (primer nombre) y sexo para caricatura
  const [userName, setUserName] = useState<string | null>(null)
  const [userSexo, setUserSexo] = useState<string | null>(null)
  // Calendario abierto/cerrado por rutina
  const [calendarAbierto, setCalendarAbierto] = useState<Record<string, boolean>>({})

  // Compartir rutina por código
  const [modalCompartir, setModalCompartir] = useState<string | null>(null)
  const [codigoCompartir, setCodigoCompartir] = useState<string | null>(null)
  const [generandoCodigo, setGenerandoCodigo] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [compartiendoDirecto, setCompartiendoDirecto] = useState(false)
  const [compartidoAviso, setCompartidoAviso] = useState(false)

  // Importar rutina por código
  const [inputImportar, setInputImportar] = useState('')
  const [buscandoCodigo, setBuscandoCodigo] = useState(false)
  const [errorImportar, setErrorImportar] = useState<string | null>(null)
  const [previewImport, setPreviewImport] = useState<RutinaImport | null>(null)
  const [importando, setImportando] = useState(false)
  const [importOk, setImportOk] = useState(false)
  // Banner: mostrar campo para pegar código
  const [mostrarPegar, setMostrarPegar] = useState(false)

  const hoyStr = toLocalDate(new Date())
  const imagenEntrena = userSexo === 'mujer' ? '/caricaturas/mujer-entrena.png' : '/caricaturas/hombre-entrena.png'

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  useEffect(() => {
    if (!userId) return
    supabase.from('perfiles').select('nombre_completo, sexo').eq('user_id', userId).single()
      .then(({ data }) => {
        if (data?.nombre_completo) setUserName((data.nombre_completo as string).split(' ')[0])
        if (data?.sexo) setUserSexo(data.sexo as string)
      })
  }, [userId])

  const cargarRutinas = useCallback(async () => {
    if (!userId) return
    setCargando(true)

    const [{ data: rutinaData }, { data: sesionesData }] = await Promise.all([
      supabase
        .from('rutinas')
        .select('id, nombre, dias_semana, codigo_compartir, rutina_ejercicios(id, ejercicio_id, dia_semana, orden, series, repeticiones, descanso_segundos, ejercicios(id, nombre, musculo_principal, categoria, equipo, instrucciones, imagenes))')
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
    setEjActivo(0)
    setFotoAbierta(false)
  }, [sesion])

  // Mantener refs sincronizados para el auto-guardado
  useEffect(() => { registrosRef.current = registros }, [registros])
  useEffect(() => { sesionRef.current = sesion }, [sesion])
  useEffect(() => { userIdRef.current = userId }, [userId])

  // Limpiar debounce pendiente al desmontar
  useEffect(() => () => { if (debounceAutoSaveRef.current) clearTimeout(debounceAutoSaveRef.current) }, [])

  // Búsqueda combinada: grupo muscular seleccionado + texto (por nombre o músculo principal).
  // Solo se muestran ejercicios con imagen: el catálogo original en español aún no tiene
  // (se deja en la base de datos pero no aparece aquí hasta que se traduzca).
  useEffect(() => {
    if (!modalEj) return
    let cancelado = false
    const texto = busquedaEj.trim().replace(/,/g, '')
    setCargandoCat(true)
    const timer = setTimeout(async () => {
      let query = supabase
        .from('ejercicios')
        .select('id, nombre, musculo_principal, equipo, instrucciones, imagenes')
        .not('imagenes', 'is', null)
        .order('nombre')
      const grupo = GRUPOS_MUSCULARES.find(g => g.nombre === catFiltro)
      // Filtrar por músculo en la propia consulta (rápido: solo trae las filas del grupo,
      // no las ~870 del catálogo completo). El .in() exige coincidencia exacta, así que
      // además se vuelve a comparar abajo de forma normalizada (sin mayúsculas/acentos)
      // por si algún registro tuviera el valor con distinto formato.
      if (grupo?.musculos) query = query.in('musculo_principal', grupo.musculos)
      if (grupo?.categoria) query = query.eq('categoria', grupo.categoria)
      if (texto.length >= 2) query = query.or(`nombre.ilike.%${texto}%,musculo_principal.ilike.%${texto}%`)
      const { data, error } = await query
      if (cancelado) return // respuesta de un grupo/búsqueda ya superado: se descarta
      if (error) console.error('[selector ejercicios] error de Supabase:', error.message)
      const musculosGrupo = grupo?.musculos?.map(normalizarMusculo)
      const filtrados = (data || []).filter(ej =>
        ej.imagenes && ej.imagenes.length > 0 &&
        (!musculosGrupo || musculosGrupo.includes(normalizarMusculo(ej.musculo_principal)))
      )
      console.log(`[selector ejercicios] grupo="${catFiltro}" → BD devolvió ${data?.length ?? 0} filas, ${filtrados.length} tras filtro de músculo/imagen`)
      setEjsCat(filtrados)
      setCargandoCat(false)
    }, 300)
    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [catFiltro, busquedaEj, modalEj])

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

  // ── Mover ejercicio ↑↓ dentro del día (intercambia campo "orden") ──
  const moverEjercicio = async (rutinaId: string, ejId: string, dir: 'arriba' | 'abajo') => {
    const rutina = rutinas.find(r => r.id === rutinaId)
    if (!rutina) return
    const ej = rutina.rutina_ejercicios.find(e => e.id === ejId)
    if (!ej || !ej.dia_semana) return
    const lista = rutina.rutina_ejercicios
      .filter(e => e.dia_semana === ej.dia_semana)
      .sort((a, b) => a.orden - b.orden)
    const idx = lista.findIndex(e => e.id === ejId)
    if (dir === 'arriba' && idx === 0) return
    if (dir === 'abajo' && idx === lista.length - 1) return
    const idxB = dir === 'arriba' ? idx - 1 : idx + 1
    const ejA = lista[idx]
    const ejB = lista[idxB]
    await Promise.all([
      supabase.from('rutina_ejercicios').update({ orden: ejB.orden }).eq('id', ejA.id),
      supabase.from('rutina_ejercicios').update({ orden: ejA.orden }).eq('id', ejB.id),
    ])
    setRutinas(prev => prev.map(r => {
      if (r.id !== rutinaId) return r
      return {
        ...r,
        rutina_ejercicios: r.rutina_ejercicios.map(e => {
          if (e.id === ejA.id) return { ...e, orden: ejB.orden }
          if (e.id === ejB.id) return { ...e, orden: ejA.orden }
          return e
        }),
      }
    }))
  }

  // ── Intercambiar todos los ejercicios entre dos días ──
  const intercambiarDias = async (rutinaId: string, diaA: string, diaB: string) => {
    const rutina = rutinas.find(r => r.id === rutinaId)
    if (!rutina) return
    const idsA = rutina.rutina_ejercicios.filter(e => e.dia_semana === diaA).map(e => e.id)
    const idsB = rutina.rutina_ejercicios.filter(e => e.dia_semana === diaB).map(e => e.id)
    await Promise.all([
      ...(idsA.length ? [supabase.from('rutina_ejercicios').update({ dia_semana: diaB }).in('id', idsA)] : []),
      ...(idsB.length ? [supabase.from('rutina_ejercicios').update({ dia_semana: diaA }).in('id', idsB)] : []),
    ])
    setRutinas(prev => prev.map(r => {
      if (r.id !== rutinaId) return r
      return {
        ...r,
        rutina_ejercicios: r.rutina_ejercicios.map(e => {
          if (e.dia_semana === diaA) return { ...e, dia_semana: diaB }
          if (e.dia_semana === diaB) return { ...e, dia_semana: diaA }
          return e
        }),
      }
    }))
  }

  // ── Agregar ejercicio ──
  const abrirModalEj = (rutinaId: string, dia: string) => {
    setModalEj({ rutinaId, dia })
    setCatFiltro(GRUPOS_MUSCULARES[0].nombre)
    setBusquedaEj('')
    setDetalleEj(null)
    setErrorEj(null)
    setAgregadosCount(0)
  }

  const cerrarModalEj = () => {
    setModalEj(null)
    setEjsCat([])
    setDetalleEj(null)
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
    setDetalleEj(null)
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
      .select('ejercicio_id, numero_serie, peso_kg, repeticiones, completada, duracion_minutos, calorias_quemadas, intensidad')
      .eq('user_id', userId)
      .eq('rutina_id', rutina.id)
      .in('ejercicio_id', ejIds)
      .eq('fecha', fecha)
      .eq('dia_semana', dia)
      .order('numero_serie', { ascending: true })

    const { data: referenciaRaw } = await supabase
      .from('sesiones')
      .select('ejercicio_id, peso_kg, repeticiones, duracion_minutos, calorias_quemadas, intensidad, fecha, dia_semana')
      .eq('user_id', userId)
      .eq('rutina_id', rutina.id)
      .in('ejercicio_id', ejIds)
      .order('fecha', { ascending: false })

    type FilaSesion = {
      numero_serie: number; peso_kg: number | null; repeticiones: string | null; completada: boolean | null
      duracion_minutos: number | null; calorias_quemadas: number | null; intensidad: string | null
    }
    const sesionFechaMap: Record<string, FilaSesion[]> = {}
    for (const d of sesionFecha ?? []) {
      if (!sesionFechaMap[d.ejercicio_id]) sesionFechaMap[d.ejercicio_id] = []
      sesionFechaMap[d.ejercicio_id].push(d)
    }

    type FilaRef = {
      peso_kg: number | null; repeticiones: string | null
      duracion_minutos: number | null; calorias_quemadas: number | null; intensidad: string | null
      fecha: string
    }
    const refMap: Record<string, FilaRef> = {}
    for (const d of referenciaRaw ?? []) {
      if (d.fecha === fecha && d.dia_semana === dia) continue
      if (!refMap[d.ejercicio_id]) refMap[d.ejercicio_id] = d
    }

    const histMap: Record<string, string> = {}
    const pesosNum: Record<string, number> = {}
    ejercicios.forEach(ej => {
      const ref = refMap[ej.ejercicio_id]
      if (!ref) return
      const rel = ref.fecha ? ` · ${fechaRelativa(ref.fecha)}` : ''
      if (esCardio(ej)) {
        const partes: string[] = []
        if (ref.duracion_minutos) partes.push(`${ref.duracion_minutos} min`)
        if (ref.calorias_quemadas) partes.push(`${ref.calorias_quemadas} kcal`)
        if (ref.intensidad) partes.push(ref.intensidad)
        if (partes.length) histMap[ej.ejercicio_id] = `Última vez: ${partes.join(' · ')}${rel}`
      } else {
        const partes: string[] = []
        if (ref.peso_kg) partes.push(`${ref.peso_kg}kg`)
        if (ref.repeticiones) partes.push(`${ref.repeticiones} reps`)
        if (partes.length) histMap[ej.ejercicio_id] = `Última vez: ${partes.join(' × ')}${rel}`
        if (ref.peso_kg) pesosNum[ej.ejercicio_id] = Number(ref.peso_kg)
      }
    })

    setHistorial(histMap)
    setUltimoPesos(pesosNum)

    const init: Record<string, SerieDato[]> = {}
    ejercicios.forEach(ej => {
      const cardio = esCardio(ej)
      const seriesGuardadas = sesionFechaMap[ej.ejercicio_id]
      if (seriesGuardadas && seriesGuardadas.length > 0) {
        init[ej.id] = seriesGuardadas.map(s => ({
          reps: s.repeticiones ?? ej.repeticiones,
          peso: s.peso_kg != null ? String(s.peso_kg) : '',
          ok: Boolean(s.completada),
          duracionMin: s.duracion_minutos != null ? String(s.duracion_minutos) : '',
          calorias: s.calorias_quemadas != null ? String(s.calorias_quemadas) : '',
          intensidad: s.intensidad ?? '',
        }))
      } else {
        const ref = refMap[ej.ejercicio_id]
        init[ej.id] = [{
          reps: ej.repeticiones,
          peso: !cardio && ref?.peso_kg != null ? String(ref.peso_kg) : '',
          ok: false,
          duracionMin: '',
          calorias: '',
          intensidad: cardio ? (ref?.intensidad ?? '') : '',
        }]
      }
    })

    setRegistros(init)
    setSesion({ rutina, dia, fecha, ejercicios })
    setSesionOk(false)
  }

  const updateSerie = (ejId: string, idx: number, campo: keyof SerieDato, valor: string | boolean) => {
    setRegistros(prev => ({
      ...prev,
      [ejId]: prev[ejId].map((s, i) => i === idx ? { ...s, [campo]: valor } : s),
    }))

    // Guardado automático al editar campos de datos (no al marcar el check)
    if (campo === 'peso' || campo === 'reps' || campo === 'duracionMin' || campo === 'calorias' || campo === 'intensidad') {
      if (debounceAutoSaveRef.current) clearTimeout(debounceAutoSaveRef.current)
      debounceAutoSaveRef.current = setTimeout(async () => {
        const currentSesion  = sesionRef.current
        const currentRegs    = registrosRef.current
        const currentUserId  = userIdRef.current
        if (!currentSesion || !currentUserId) return
        const fecha = currentSesion.fecha
        const filas: object[] = []
        currentSesion.ejercicios.forEach(ej => {
          const cardio = esCardio(ej)
          ;(currentRegs[ej.id] || []).forEach((dato, i) => {
            filas.push({
              user_id:           currentUserId,
              rutina_id:         currentSesion.rutina.id,
              ejercicio_id:      ej.ejercicio_id,
              dia_semana:        currentSesion.dia,
              numero_serie:      i + 1,
              repeticiones:      cardio ? null : dato.reps,
              peso_kg:           cardio ? null : (parseFloat(dato.peso) || null),
              duracion_minutos:  cardio ? (parseInt(dato.duracionMin, 10) || null) : null,
              calorias_quemadas: cardio ? (parseInt(dato.calorias, 10) || null) : null,
              intensidad:        cardio ? (dato.intensidad || null) : null,
              completada:        dato.ok,
              fecha,
            })
          })
        })
        if (filas.length === 0) return
        await supabase.from('sesiones').upsert(filas, { onConflict: 'user_id,ejercicio_id,numero_serie,fecha,dia_semana' })
        setSesionesMap(prev => {
          const set = new Set(prev[currentSesion.rutina.id] ?? [])
          set.add(fecha)
          return { ...prev, [currentSesion.rutina.id]: set }
        })
      }, 900)
    }
  }

  const agregarSerie = (ejId: string) =>
    setRegistros(prev => {
      const series = prev[ejId] || []
      const ultima = series[series.length - 1]
      return {
        ...prev,
        [ejId]: [...series, {
          reps: '', peso: ultima?.peso ?? '', ok: false,
          duracionMin: '', calorias: '', intensidad: ultima?.intensidad ?? '',
        }],
      }
    })

  const eliminarSerie = (ejId: string, idx: number) =>
    setRegistros(prev => {
      const series = prev[ejId] || []
      if (series.length <= 1) return prev
      return { ...prev, [ejId]: series.filter((_, i) => i !== idx) }
    })

  const quitarEjercicio = (idx: number) => {
    if (!sesion) return
    const nombre = sesion.ejercicios[idx].ejercicios?.nombre ?? 'este ejercicio'
    if (!window.confirm(`¿Quitar "${nombre}" de esta sesión?`)) return
    const nuevosEj = sesion.ejercicios.filter((_, i) => i !== idx)
    if (nuevosEj.length === 0) { setSesion(null); return }
    setSesion({ ...sesion, ejercicios: nuevosEj })
    if (idx >= nuevosEj.length) setEjActivo(nuevosEj.length - 1)
  }

  const guardarSesion = async () => {
    if (!sesion || !userId) return
    setGuardandoSesion(true)
    const fecha = sesion.fecha
    const filas: object[] = []

    sesion.ejercicios.forEach(ej => {
      const cardio = esCardio(ej)
      ;(registros[ej.id] || []).forEach((dato, i) => {
        filas.push({
          user_id:           userId,
          rutina_id:         sesion.rutina.id,
          ejercicio_id:      ej.ejercicio_id,
          dia_semana:        sesion.dia,
          numero_serie:      i + 1,
          repeticiones:      cardio ? null : dato.reps,
          peso_kg:           cardio ? null : (parseFloat(dato.peso) || null),
          duracion_minutos:  cardio ? (parseInt(dato.duracionMin, 10) || null) : null,
          calorias_quemadas: cardio ? (parseInt(dato.calorias, 10) || null) : null,
          intensidad:        cardio ? (dato.intensidad || null) : null,
          completada:        dato.ok,
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

  // ── Compartir rutina ──
  const generarCodigoCompartir = async (rutinaId: string) => {
    setModalCompartir(rutinaId)
    setCopiado(false)
    const rutina = rutinas.find(r => r.id === rutinaId)
    if (rutina?.codigo_compartir?.startsWith('FIT-')) {
      setCodigoCompartir(rutina.codigo_compartir)
      return
    }
    setCodigoCompartir(null)
    setGenerandoCodigo(true)
    const res = await fetch('/api/rutinas/compartir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rutina_id: rutinaId }),
    })
    const json = await res.json()
    setGenerandoCodigo(false)
    if (json.codigo) {
      setCodigoCompartir(json.codigo)
      setRutinas(prev => prev.map(r => r.id === rutinaId ? { ...r, codigo_compartir: json.codigo } : r))
    }
  }

  const copiarCodigo = async () => {
    if (!codigoCompartir) return
    await navigator.clipboard.writeText(codigoCompartir).catch(() => {})
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  // Compartir directo: genera el código si hace falta, luego usa Web Share API
  // (o copia al portapapeles como respaldo en escritorio)
  const compartirDirecto = async (rutinaId: string) => {
    setCompartiendoDirecto(true)
    const rutina = rutinas.find(r => r.id === rutinaId)
    let codigo = rutina?.codigo_compartir?.startsWith('FIT-') ? rutina.codigo_compartir : null
    if (!codigo) {
      const res = await fetch('/api/rutinas/compartir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rutina_id: rutinaId }),
      })
      const json = await res.json()
      if (json.codigo) {
        codigo = json.codigo
        setRutinas(prev => prev.map(r => r.id === rutinaId ? { ...r, codigo_compartir: json.codigo } : r))
      }
    }
    setCompartiendoDirecto(false)
    if (!codigo) return
    const texto = `¡Entrena conmigo en FitPro! Usa mi código de rutina: ${codigo}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ text: texto }) } catch { /* usuario canceló */ }
    } else {
      await navigator.clipboard.writeText(texto).catch(() => {})
      setCompartidoAviso(true)
      setTimeout(() => setCompartidoAviso(false), 2500)
    }
  }

  // ── Importar rutina ──
  const buscarPorCodigo = async () => {
    const codigo = inputImportar.trim().toUpperCase()
    if (!codigo) return
    setBuscandoCodigo(true)
    setErrorImportar(null)
    setPreviewImport(null)
    setImportOk(false)
    const res = await fetch(`/api/rutinas/compartir?codigo=${encodeURIComponent(codigo)}`)
    const json = await res.json()
    setBuscandoCodigo(false)
    if (!res.ok) { setErrorImportar(json.error); return }
    setPreviewImport(json.rutina)
  }

  const importarRutina = async () => {
    if (!previewImport || !userId) return
    setImportando(true)
    const { data: nueva, error: errRut } = await supabase
      .from('rutinas')
      .insert({ user_id: userId, nombre: previewImport.nombre, dias_semana: previewImport.dias_semana })
      .select('id')
      .single()
    if (errRut || !nueva) { setImportando(false); setErrorImportar('Error al crear la rutina'); return }
    const filas = previewImport.rutina_ejercicios.map(e => ({
      rutina_id: nueva.id,
      ejercicio_id: e.ejercicio_id,
      dia_semana: e.dia_semana,
      orden: e.orden,
      series: e.series,
      repeticiones: e.repeticiones,
      descanso_segundos: e.descanso_segundos,
    }))
    const { error: errEj } = await supabase.from('rutina_ejercicios').insert(filas)
    setImportando(false)
    if (errEj) { setErrorImportar('Error al copiar ejercicios: ' + errEj.message); return }
    setImportOk(true)
    setPreviewImport(null)
    setInputImportar('')
    cargarRutinas()
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
        <h1 className="text-lg font-bold">Fit<span className="text-[#B57BFF]">Pro</span></h1>
        <a href="/inicio" className="text-xs text-gray-400">← Inicio</a>
      </div>

      <div className="p-5">
        <h2 className="text-xl font-bold mb-5">Mis <span className="text-[#B57BFF]">Rutinas</span></h2>

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
                <div key={rutina.id} className="rounded-2xl overflow-hidden border border-[#B57BFF]/40" style={{ background: 'rgba(181,123,255,0.04)', boxShadow: '0 0 32px rgba(181,123,255,0.10)' }}>

                  {/* Cabecera: nombre usuario + código compartir + borrar */}
                  <div className="px-5 pt-5 pb-4 flex items-start justify-between border-b border-white/5">
                    <div className="min-w-0">
                      {userName
                        ? <div className="text-xl font-black leading-tight">{userName}</div>
                        : <div className="text-xl font-black leading-tight">{rutina.nombre}</div>
                      }
                      {userName && <div className="text-xs text-[#B57BFF]/60 mt-0.5">{rutina.nombre}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3 mt-0.5">
                      {confirmBorrar === rutina.id ? (
                        <>
                          <span className="text-[10px] text-gray-400">¿Eliminar?</span>
                          <button
                            onClick={() => borrarRutina(rutina.id)}
                            disabled={borrando}
                            className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-2 py-1 disabled:opacity-50">
                            {borrando ? '...' : 'Sí'}
                          </button>
                          <button
                            onClick={() => setConfirmBorrar(null)}
                            className="text-[10px] text-gray-500 border border-white/10 rounded-lg px-2 py-1">
                            No
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmBorrar(rutina.id)}
                          className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none">
                          🗑
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fila del día: cuadrito + info + ícono calendario */}
                  <div className="px-5 py-4 flex items-center gap-4">
                    <div
                      className="shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #B57BFF, #7B2FF7)' }}>
                      <span className="text-3xl font-black leading-none text-white">{dateSel.getDate()}</span>
                      <span className="text-[10px] font-bold text-white/70 uppercase tracking-wide mt-0.5">
                        {diaSel.slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">Entrenamiento de hoy</div>
                      <div className="text-sm font-semibold text-white capitalize">{diaDisplay}</div>
                      <div className="text-[11px] text-[#B57BFF]/60 mt-0.5">
                        {ejsDia.length} ejercicio{ejsDia.length !== 1 ? 's' : ''} · {rutina.dias_semana} días/sem
                      </div>
                    </div>
                    <button
                      onClick={() => setCalendarAbierto(prev => ({ ...prev, [rutina.id]: !prev[rutina.id] }))}
                      className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                      style={{
                        background: calendarAbierto[rutina.id] ? 'rgba(181,123,255,0.20)' : 'rgba(181,123,255,0.08)',
                        border: '1px solid rgba(181,123,255,0.30)',
                        color: '#B57BFF',
                      }}>
                      <Calendar className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Calendario plegable */}
                  {calendarAbierto[rutina.id] && (
                    <div className="px-5 pb-4 pt-3 border-t border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => prevMes(rutina.id)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                          ‹
                        </button>
                        <span className="text-xs font-semibold text-gray-300">{MESES[mes.m]} {mes.y}</span>
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
                          else if (esSel && esHoy)  circulo += 'bg-[#B57BFF] text-white'
                          else if (esSel)            circulo += 'bg-[#B57BFF] text-white'
                          else if (esDone)           circulo += 'bg-green-500/15 text-green-400'
                          else if (esHoy)            circulo += 'ring-1 ring-[#B57BFF] text-[#B57BFF]'
                          else if (esEnt)            circulo += 'text-white hover:bg-white/8 cursor-pointer'
                          else                       circulo += 'text-gray-700 hover:bg-white/5 cursor-pointer'
                          return (
                            <div key={i} className="h-9 flex items-center justify-center">
                              <div
                                className={circulo}
                                onClick={() => {
                                  setFechaActiva(prev => ({ ...prev, [rutina.id]: fs }))
                                  setCalendarAbierto(prev => ({ ...prev, [rutina.id]: false }))
                                }}>
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
                  )}

                  {/* Lista de ejercicios */}
                  <div className="px-5 pb-5">
                    {ejsDia.length === 0 ? (
                      <div className="text-xs text-gray-600 py-4 text-center border border-dashed border-white/8 rounded-xl mb-3">
                        Sin ejercicios para {diaSel}
                      </div>
                    ) : (
                      <div className="mb-3">
                        {ejsDia.map((ej, i) => (
                          <div key={ej.id} className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-black/20 mb-1.5">
                            <span className="text-[#B57BFF] text-xs font-bold shrink-0 w-5 text-right">{i + 1}.</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{ej.ejercicios?.nombre}</div>
                            </div>
                            {/* Flechitas reordenar */}
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <button
                                onClick={() => moverEjercicio(rutina.id, ej.id, 'arriba')}
                                disabled={i === 0}
                                className={`w-6 h-5 flex items-center justify-center rounded text-[10px] leading-none transition-colors
                                  ${i === 0 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 active:text-[#B57BFF]'}`}>
                                ▲
                              </button>
                              <button
                                onClick={() => moverEjercicio(rutina.id, ej.id, 'abajo')}
                                disabled={i === ejsDia.length - 1}
                                className={`w-6 h-5 flex items-center justify-center rounded text-[10px] leading-none transition-colors
                                  ${i === ejsDia.length - 1 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 active:text-[#B57BFF]'}`}>
                                ▼
                              </button>
                            </div>
                            {confirmBorrarEj === ej.id ? (
                              <div className="flex items-center gap-1 shrink-0">
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
                                className="text-gray-600 hover:text-red-400 transition-colors shrink-0 text-sm leading-none">
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => abrirModalEj(rutina.id, diaSel)}
                        className="flex-1 border border-[#22D3EE] rounded-xl py-2.5 text-xs text-[#22D3EE] font-semibold hover:bg-[#22D3EE]/5 transition-colors">
                        ＋ Agregar
                      </button>
                      <button
                        onClick={() => iniciarSesion(rutina, diaSel, fechaSel)}
                        disabled={ejsDia.length === 0}
                        className="flex-[2] text-[#0a0a0a] font-bold rounded-xl py-2.5 text-sm disabled:opacity-25 transition-opacity"
                        style={{ background: 'linear-gradient(135deg, #22D3EE, #0891B2)', boxShadow: '0 0 16px rgba(34,211,238,0.25)' }}>
                        ▶ Iniciar sesión
                      </button>
                    </div>

                    {/* ── Reordenar días ── */}
                    {(() => {
                      const diasOrdenados = DIAS.filter(d => diasEnt.has(d))
                      if (diasOrdenados.length < 2) return null
                      const abierto = reordenarDiasId === rutina.id
                      return (
                        <div className="mt-3">
                          <button
                            onClick={() => setReordenarDiasId(abierto ? null : rutina.id)}
                            className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-[#B57BFF] transition-colors w-full">
                            <span className="text-xs">⇅</span>
                            <span>Reordenar días de entrenamiento</span>
                            <span className="ml-auto text-[10px]">{abierto ? '▲' : '▼'}</span>
                          </button>
                          {abierto && (
                            <div className="mt-2 bg-black/30 rounded-xl border border-white/8 p-3 space-y-2">
                              {diasOrdenados.map((dia, di) => {
                                const ejsD = rutina.rutina_ejercicios
                                  .filter(e => e.dia_semana === dia)
                                  .sort((a, b) => a.orden - b.orden)
                                const musculos = [...new Set(
                                  ejsD.map(e => e.ejercicios?.musculo_principal).filter(Boolean)
                                )].slice(0, 3).join(', ')
                                return (
                                  <div key={dia} className="flex items-center gap-2">
                                    <div className="flex flex-col gap-0.5 shrink-0">
                                      <button
                                        onClick={() => intercambiarDias(rutina.id, diasOrdenados[di - 1], dia)}
                                        disabled={di === 0}
                                        className={`w-6 h-5 flex items-center justify-center rounded text-[10px] leading-none transition-colors
                                          ${di === 0 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 active:text-[#B57BFF]'}`}>
                                        ▲
                                      </button>
                                      <button
                                        onClick={() => intercambiarDias(rutina.id, dia, diasOrdenados[di + 1])}
                                        disabled={di === diasOrdenados.length - 1}
                                        className={`w-6 h-5 flex items-center justify-center rounded text-[10px] leading-none transition-colors
                                          ${di === diasOrdenados.length - 1 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 active:text-[#B57BFF]'}`}>
                                        ▼
                                      </button>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-semibold text-white">{dia}</span>
                                      {musculos && <span className="text-[10px] text-gray-500 ml-1.5">{musculos}</span>}
                                    </div>
                                    <span className="text-[10px] text-gray-600 shrink-0">{ejsD.length} ej.</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── BANNER: ¡Reta a un amigo! ── */}
        <div
          className="rounded-2xl mb-4 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #7B2FF7 0%, #22D3EE 100%)' }}
        >
          {/* Fila principal */}
          <div className="flex items-stretch">
            {/* Caricatura libre: sin recuadro, apoyada en la base del banner */}
            <div className="shrink-0 flex flex-col justify-end" style={{ width: '88px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagenEntrena}
                alt="Entrena"
                style={{
                  display: 'block',
                  width: '88px',
                  height: '110px',
                  objectFit: 'contain',
                  objectPosition: 'bottom center',
                  filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.55))',
                }}
              />
            </div>

            {/* Texto y botones */}
            <div className="flex-1 min-w-0 py-4 pr-4 pl-2">
              <div className="text-white font-black text-[15px] leading-tight">¡Reta a un amigo!</div>
              <div className="text-white/80 text-xs mt-0.5 leading-relaxed">Comparte tu rutina o agrega una</div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => rutinas.length > 0 && compartirDirecto(rutinas[0].id)}
                  disabled={rutinas.length === 0 || compartiendoDirecto}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-white font-bold rounded-lg text-xs disabled:opacity-40 transition-opacity"
                  style={{ color: '#7B2FF7' }}
                >
                  <Share2 className="w-3 h-3" />
                  {compartiendoDirecto ? '...' : 'Compartir'}
                </button>
                <button
                  onClick={() => { setMostrarPegar(p => !p); setErrorImportar(null); setPreviewImport(null); setImportOk(false) }}
                  className="flex items-center gap-1.5 px-4 py-1.5 font-bold rounded-lg text-xs text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.65)' }}
                >
                  <span className="text-base leading-none">+</span>
                  Agregar rutina
                </button>
              </div>
              {compartidoAviso && (
                <div className="mt-2 text-[11px] text-white/90 flex items-center gap-1.5">
                  <Check className="w-3 h-3 shrink-0" />
                  ¡Texto copiado al portapapeles!
                </div>
              )}
            </div>
          </div>

          {/* Campo para pegar código (expandible) */}
          {mostrarPegar && (
            <div className="px-4 pb-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.25)' }}>
              <div className="flex gap-2 mb-3">
                <input
                  value={inputImportar}
                  onChange={e => { setInputImportar(e.target.value.toUpperCase()); setErrorImportar(null); setImportOk(false) }}
                  onKeyDown={e => e.key === 'Enter' && buscarPorCodigo()}
                  placeholder="FIT-XXXX"
                  maxLength={8}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white font-mono tracking-[0.2em] focus:outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.30)' }}
                />
                <button
                  onClick={buscarPorCodigo}
                  disabled={!inputImportar.trim() || buscandoCodigo}
                  className="flex items-center gap-1.5 bg-white font-bold rounded-xl px-4 py-2.5 text-xs disabled:opacity-40 whitespace-nowrap transition-opacity"
                  style={{ color: '#7B2FF7' }}
                >
                  <Search className="w-3.5 h-3.5" />
                  {buscandoCodigo ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              {errorImportar && (
                <div className="text-xs text-white bg-red-500/40 border border-red-400/30 rounded-xl px-3 py-2 mb-2">{errorImportar}</div>
              )}

              {previewImport && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.20)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Dumbbell className="w-4 h-4 text-white shrink-0" />
                    <div className="text-sm font-bold text-white">{previewImport.nombre}</div>
                  </div>
                  <div className="text-xs text-white/60 mb-3 pl-6">
                    {previewImport.dias_semana} días/semana · {previewImport.rutina_ejercicios.length} ejercicios
                  </div>
                  <button
                    onClick={importarRutina}
                    disabled={importando}
                    className="w-full bg-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
                    style={{ color: '#7B2FF7' }}
                  >
                    <Download className="w-4 h-4" />
                    {importando ? 'Importando...' : 'Añadir a mis rutinas'}
                  </button>
                </div>
              )}

              {importOk && (
                <div className="text-xs text-white rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: 'rgba(34,197,94,0.30)', border: '1px solid rgba(34,197,94,0.35)' }}>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>¡Rutina añadida! Ya aparece en tu lista arriba.</span>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={abrirWizard}
          className="w-full border border-dashed border-[#B57BFF]/30 rounded-2xl py-4 text-[#B57BFF] text-sm font-semibold hover:border-[#B57BFF] hover:bg-[#B57BFF]/5 transition-colors">
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
              className="h-full bg-[#B57BFF] transition-all duration-300"
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
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#B57BFF]/50"
                    />
                  </div>

                  {/* Días */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs text-gray-400 uppercase tracking-widest">
                        Días de entrenamiento
                      </label>
                      {wizard.diasElegidos.length > 0 && (
                        <span className="text-xs text-[#B57BFF] font-semibold">
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
                                ? 'bg-[#B57BFF] text-white'
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
                          <span key={d} className="text-[10px] text-[#B57BFF]/70 bg-[#B57BFF]/8 border border-[#B57BFF]/20 rounded-full px-2.5 py-0.5">
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
                  className="w-full bg-[#B57BFF] text-white font-bold py-4 rounded-2xl text-base disabled:opacity-30 transition-opacity">
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
                            ? 'bg-[#B57BFF] text-white'
                            : 'bg-[#1a1a1a] text-gray-400 border border-white/10 hover:border-white/25'
                        }`}>
                        {dia}
                        {ejsEnDia > 0 && (
                          <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                            wizard.diaActivo === dia ? 'bg-black text-[#B57BFF]' : 'bg-[#B57BFF] text-white'
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
                      <div key={ej.id} className="flex items-center gap-2 px-4 py-3 border-b border-white/5 last:border-0">
                        <span className="text-[#B57BFF] text-xs font-bold w-4 text-center shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{ej.ejercicios?.nombre}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">{ej.ejercicios?.musculo_principal}</div>
                        </div>
                        <div className="text-xs text-gray-500 shrink-0">{esCardio(ej) ? '🏃 Cardio' : `${ej.series}×${ej.repeticiones}`}</div>
                        {/* Flechitas reordenar */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            onClick={() => wizard?.rutinaId && moverEjercicio(wizard.rutinaId, ej.id, 'arriba')}
                            disabled={i === 0}
                            className={`w-6 h-5 flex items-center justify-center rounded text-[10px] leading-none transition-colors
                              ${i === 0 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-500 active:text-[#B57BFF]'}`}>
                            ▲
                          </button>
                          <button
                            onClick={() => wizard?.rutinaId && moverEjercicio(wizard.rutinaId, ej.id, 'abajo')}
                            disabled={i === wizardEjsDia.length - 1}
                            className={`w-6 h-5 flex items-center justify-center rounded text-[10px] leading-none transition-colors
                              ${i === wizardEjsDia.length - 1 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-500 active:text-[#B57BFF]'}`}>
                            ▼
                          </button>
                        </div>
                        {confirmBorrarEj === ej.id ? (
                          <div className="flex items-center gap-1 shrink-0">
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
                            className="text-gray-700 hover:text-red-400 transition-colors shrink-0 text-base leading-none">
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
                    className="w-full border border-dashed border-white/15 rounded-xl py-3 text-xs text-gray-400 hover:border-[#B57BFF]/40 hover:text-[#B57BFF] transition-colors font-medium">
                    ＋ Agregar ejercicio al {wizard.diaActivo}
                  </button>
                )}
              </div>

              <div className="px-5 pb-10 pt-3 border-t border-white/10 shrink-0">
                <button
                  onClick={terminarWizard}
                  className="w-full bg-[#B57BFF] text-white font-bold py-4 rounded-2xl text-base">
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
                <div className="font-bold text-sm">
                  {detalleEj ? detalleEj.nombre : 'Agregar ejercicio'}
                </div>
                <div className="text-xs text-[#B57BFF]">{modalEj.dia}</div>
              </div>
              <button
                onClick={() => detalleEj ? setDetalleEj(null) : cerrarModalEj()}
                className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            {agregadosCount > 0 && (
              <div className="mx-5 mb-3 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400 shrink-0">
                ✓ {agregadosCount} ejercicio{agregadosCount > 1 ? 's' : ''} agregado{agregadosCount > 1 ? 's' : ''} a {modalEj.dia}
              </div>
            )}

            {detalleEj ? (
              /* ── DETALLE DEL EJERCICIO ── */
              <div className="flex-1 overflow-y-auto px-5 pb-5">
                <button
                  onClick={() => setDetalleEj(null)}
                  className="text-xs text-gray-400 hover:text-white mb-3 flex items-center gap-1">
                  ← Volver a la lista
                </button>

                <DetalleEjercicioContenido ej={detalleEj} />

                {errorEj && (
                  <div className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{errorEj}</div>
                )}

                <button
                  onClick={() => agregarEjercicioDirecto(detalleEj)}
                  disabled={insertandoEjId !== null}
                  className="w-full bg-[#B57BFF] text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60">
                  {insertandoEjId === detalleEj.id ? 'Agregando…' : `＋ Agregar a ${modalEj.dia}`}
                </button>
              </div>
            ) : (
              <>
                {/* Buscador con ícono cian */}
                <div className="px-5 pb-3 shrink-0">
                  <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#22D3EE]/40 rounded-xl px-4 py-2.5 focus-within:border-[#22D3EE]/70 transition-colors">
                    <Search className="w-4 h-4 text-[#22D3EE] shrink-0" />
                    <input
                      value={busquedaEj}
                      onChange={e => setBusquedaEj(e.target.value)}
                      placeholder="Buscar ejercicio..."
                      className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                    />
                  </div>
                </div>
                {/* Chips de músculo — horizontal scroll */}
                <div className="px-5 pb-3 shrink-0">
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {GRUPOS_MUSCULARES.map(g => g.nombre).map(grupo => (
                      <button
                        key={grupo}
                        onClick={() => setCatFiltro(grupo)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                        style={catFiltro === grupo
                          ? { background: 'linear-gradient(135deg, #B57BFF, #7B2FF7)', color: '#fff' }
                          : { background: '#1a1a1a', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.10)' }}>
                        {grupo}
                      </button>
                    ))}
                  </div>
                </div>
                {errorEj && (
                  <div className="mx-5 mb-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 shrink-0">{errorEj}</div>
                )}
                {/* Cuadrícula 2 columnas */}
                <div className="flex-1 overflow-y-auto px-4 pb-5">
                  {cargandoCat ? (
                    <div className="grid grid-cols-2 gap-3">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-[#1a1a1a] rounded-2xl animate-pulse h-44" />
                      ))}
                    </div>
                  ) : ejsCat.length === 0 ? (
                    <div className="text-center text-gray-600 text-sm py-10">Sin resultados</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {ejsCat.map(ej => (
                        <div key={ej.id} className="bg-[#1a1a1a] border border-white/8 rounded-2xl overflow-hidden flex flex-col min-w-0">
                          {/* Foto — toca para ver detalle */}
                          <button onClick={() => setDetalleEj(ej)} className="block w-full shrink-0">
                            {ej.imagenes && ej.imagenes[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={ej.imagenes[0]}
                                alt={ej.nombre}
                                loading="lazy"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                className="w-full h-32 object-contain bg-black/40"
                              />
                            ) : (
                              <div className="w-full h-32 bg-black/40 flex items-center justify-center">
                                <Dumbbell className="w-8 h-8 text-gray-700" />
                              </div>
                            )}
                          </button>
                          {/* Nombre + botón agregar */}
                          <div className="p-2.5 flex flex-col gap-2 flex-1">
                            <div className="text-xs font-medium leading-snug text-white overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {ej.nombre}
                            </div>
                            <button
                              onClick={() => agregarEjercicioDirecto(ej)}
                              disabled={insertandoEjId !== null}
                              className="mt-auto w-full rounded-lg py-1.5 text-[11px] font-bold text-[#22D3EE] disabled:opacity-50 transition-colors"
                              style={{ background: 'rgba(34,211,238,0.10)', border: '1px solid rgba(34,211,238,0.25)' }}>
                              {insertandoEjId === ej.id ? '…' : '+ Agregar'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
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
            <button onClick={() => { setSesion(null); setDetalleSesionEj(null) }}
              className="text-xs text-gray-500 hover:text-white border border-white/10 rounded-lg px-3 py-1.5">
              Salir
            </button>
          </div>

          {!sesionOk ? (
            <>
              {/* Barra de progreso */}
              <div className="px-5 pt-3 pb-2 shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-gray-400">
                    Ejercicio {ejActivo + 1} de {sesion.ejercicios.length}
                  </span>
                  <span className="text-[11px] text-gray-600">
                    {Math.round(((ejActivo + 1) / sesion.ejercicios.length) * 100)}%
                  </span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${((ejActivo + 1) / sesion.ejercicios.length) * 100}%`, background: 'linear-gradient(90deg, #B57BFF, #7B2FF7)' }}
                  />
                </div>
              </div>

              {/* Ejercicio activo */}
              {(() => {
                const ej = sesion.ejercicios[ejActivo]
                if (!ej) return null
                const cardio = esCardio(ej)
                return (
                  <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-3 flex flex-col">
                    <div
                      className="rounded-2xl border border-[#B57BFF]/40 p-4 w-full"
                      style={{ background: 'rgba(181,123,255,0.06)', boxShadow: '0 0 24px rgba(181,123,255,0.08)', boxSizing: 'border-box' }}
                    >
                      {/* Nombre + meta */}
                      <div className="mb-3">
                        <div
                          style={{
                            fontFamily: "'Oswald', sans-serif",
                            fontWeight: 700,
                            fontSize: 'clamp(13px, 4.5vw, 24px)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                            color: '#22D3EE',
                            lineHeight: 1.15,
                          }}
                        >{ej.ejercicios?.nombre}</div>
                        {historial[ej.ejercicio_id] && (
                          <div className="text-[10px] text-[#B57BFF]/60 mt-1.5 flex items-center gap-2 flex-wrap">
                            <span>{historial[ej.ejercicio_id]}</span>
                            {!cardio && ultimoPesos[ej.ejercicio_id] > 0 && (() => {
                              const pesosValidos = (registros[ej.id] || [])
                                .map(s => parseFloat(s.peso))
                                .filter(p => !isNaN(p) && p > 0)
                              if (pesosValidos.length === 0) return null
                              const maxPeso = Math.max(...pesosValidos)
                              const anterior = ultimoPesos[ej.ejercicio_id]
                              const diff = (maxPeso - anterior).toFixed(1).replace(/\.0$/, '')
                              if (maxPeso > anterior) return <span key="up" className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap">↑ Subiste +{diff}kg</span>
                              if (maxPeso < anterior) return <span key="dn" className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap">↓ Bajaste {diff}kg</span>
                              return <span key="eq" className="bg-white/10 text-gray-400 border border-white/15 rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap">= Igual</span>
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Foto plegable */}
                      {ej.ejercicios?.imagenes && ej.ejercicios.imagenes.length > 0 && (
                        <div className="mb-4">
                          <button
                            onClick={() => setFotoAbierta(v => !v)}
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#B57BFF] hover:text-[#9B5BF7] transition-colors mb-2">
                            <span className="text-xs">{fotoAbierta ? '▲' : '▼'}</span>
                            Ver ejercicio
                          </button>
                          {fotoAbierta && (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {ej.ejercicios.imagenes.slice(0, 3).map((url, i) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  key={i}
                                  src={url}
                                  alt={`${ej.ejercicios?.nombre} ${i + 1}`}
                                  loading="lazy"
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                  className="h-36 w-auto rounded-xl border border-white/10 bg-black/30 object-contain shrink-0"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Series cardio */}
                      {cardio ? (
                        <>
                          {(registros[ej.id] || []).map((serie, i) => (
                            <div key={i} className={`rounded-xl p-3 mb-2 border transition-colors
                              ${serie.ok ? 'border-[#B57BFF]/30 bg-[#B57BFF]/5' : 'border-white/10 bg-black/30'}`}>
                              <div className="grid grid-cols-3 gap-2 mb-2.5">
                                <div>
                                  <label className="text-[9px] text-gray-600 uppercase block mb-1 text-center">Min</label>
                                  <input type="number" min="0" inputMode="numeric" value={serie.duracionMin}
                                    onChange={e => updateSerie(ej.id, i, 'duracionMin', e.target.value)} placeholder="—"
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 text-sm text-white text-center font-bold placeholder-gray-700 focus:outline-none focus:border-[#B57BFF]/40" />
                                </div>
                                <div>
                                  <label className="text-[9px] text-gray-600 uppercase block mb-1 text-center">Kcal</label>
                                  <input type="number" min="0" inputMode="numeric" value={serie.calorias}
                                    onChange={e => updateSerie(ej.id, i, 'calorias', e.target.value)} placeholder="—"
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 text-sm text-white text-center font-bold placeholder-gray-700 focus:outline-none focus:border-[#B57BFF]/40" />
                                </div>
                                <div>
                                  <label className="text-[9px] text-gray-600 uppercase block mb-1 text-center">Intensidad</label>
                                  <input type="text" value={serie.intensidad}
                                    onChange={e => updateSerie(ej.id, i, 'intensidad', e.target.value)} placeholder="ej. nivel 6"
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 text-sm text-white text-center font-bold placeholder-gray-700 focus:outline-none focus:border-[#B57BFF]/40" />
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${serie.ok ? 'text-[#B57BFF]' : 'text-gray-600'}`}>Bloque {i + 1}</span>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => updateSerie(ej.id, i, 'ok', !serie.ok)}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                      ${serie.ok ? 'bg-[#B57BFF] text-white scale-110' : 'bg-[#1a1a1a] border border-white/15 text-gray-600'}`}>✓</button>
                                  {(registros[ej.id] || []).length > 1 && (
                                    <button
                                      onClick={() => eliminarSerie(ej.id, i)}
                                      className="w-9 h-9 flex items-center justify-center rounded-full bg-[#FF5C5C]/10 text-[#FF5C5C] active:bg-[#FF5C5C]/20 transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-[1.5rem_1fr_1fr_2.25rem_2.25rem] gap-2 mb-1.5 px-0.5">
                            {['#', 'Reps', 'kg', '✓', ''].map(h => (
                              <div key={h} className="text-[9px] text-gray-700 uppercase text-center">{h}</div>
                            ))}
                          </div>
                          {(registros[ej.id] || []).map((serie, i) => (
                            <div key={i} className="grid grid-cols-[1.5rem_1fr_1fr_2.25rem_2.25rem] gap-2 mb-2 items-center">
                              <div className={`text-xs font-bold text-center ${serie.ok ? 'text-[#B57BFF]' : 'text-gray-600'}`}>{i + 1}</div>
                              <input type="text" value={serie.reps} onChange={e => updateSerie(ej.id, i, 'reps', e.target.value)}
                                className={`w-full min-w-0 bg-[#1a1a1a] border rounded-xl py-3 text-sm text-white text-center font-bold focus:outline-none transition-colors
                                  ${serie.ok ? 'border-[#B57BFF]/30 bg-[#B57BFF]/5' : 'border-white/10'}`} />
                              <input type="number" min="0" step="0.5" value={serie.peso} onChange={e => updateSerie(ej.id, i, 'peso', e.target.value)} placeholder="—"
                                className={`w-full min-w-0 bg-[#1a1a1a] border rounded-xl py-3 text-sm text-white text-center font-bold placeholder-gray-700 focus:outline-none transition-colors
                                  ${serie.ok ? 'border-[#B57BFF]/30 bg-[#B57BFF]/5' : 'border-white/10'}`} />
                              <button onClick={() => updateSerie(ej.id, i, 'ok', !serie.ok)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                  ${serie.ok ? 'bg-[#B57BFF] text-white scale-110' : 'bg-[#1a1a1a] border border-white/15 text-gray-600'}`}>✓</button>
                              <button
                                onClick={() => eliminarSerie(ej.id, i)}
                                disabled={(registros[ej.id] || []).length <= 1}
                                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors
                                  ${(registros[ej.id] || []).length > 1
                                    ? 'bg-[#FF5C5C]/10 text-[#FF5C5C] active:bg-[#FF5C5C]/20'
                                    : 'opacity-20 text-gray-600 cursor-not-allowed'}`}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </>
                      )}

                      <button
                        onClick={() => agregarSerie(ej.id)}
                        className="mt-1 mb-4 flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#B57BFF] transition-colors">
                        <span className="text-sm leading-none font-bold">+</span> Agregar serie
                      </button>

                      {/* Cronómetro de descanso integrado */}
                      <div className="border-t border-white/10 pt-4">
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2.5">⏱ Descanso</div>
                        <CronometroDescanso
                          key={`${ejActivo}-${sesion.rutina.id}-${sesion.fecha}`}
                          segundosIniciales={ej.descanso_segundos ?? 90}
                        />
                      </div>
                    </div>

                    {/* Navegación — pegada a la tarjeta */}
                    <div className="pt-3 pb-6">
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setEjActivo(v => Math.max(0, v - 1)); setFotoAbierta(false) }}
                          disabled={ejActivo === 0}
                          className="flex-1 border border-white/10 text-gray-400 font-semibold py-3.5 rounded-xl text-sm disabled:opacity-25 hover:border-white/20 transition-all">
                          ‹ Anterior
                        </button>
                        {ejActivo < sesion.ejercicios.length - 1 ? (
                          <button
                            onClick={() => { setEjActivo(v => v + 1); setFotoAbierta(false) }}
                            className="flex-1 text-white font-bold py-3.5 rounded-xl text-sm"
                            style={{ background: 'linear-gradient(135deg, #B57BFF, #7B2FF7)', boxShadow: '0 0 16px rgba(181,123,255,0.35)' }}>
                            Siguiente ›
                          </button>
                        ) : (
                          <button
                            onClick={guardarSesion}
                            disabled={guardandoSesion}
                            className="flex-1 text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-40"
                            style={{ background: 'linear-gradient(135deg, #B57BFF, #7B2FF7)', boxShadow: '0 0 16px rgba(181,123,255,0.35)' }}>
                            {guardandoSesion ? 'Guardando...' : '✓ Guardar sesión'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}
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
                className="w-full bg-[#B57BFF] text-white font-bold py-4 rounded-2xl text-base">
                Volver a mis rutinas
              </button>
            </div>
          )}
        </div>
      )}


      {/* ══════════════════════════════════
          MODAL COMPARTIR RUTINA
      ══════════════════════════════════ */}
      {modalCompartir && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-end justify-center">
          <div className="bg-[#111] border border-white/10 rounded-t-3xl w-full max-w-lg flex flex-col">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#B57BFF]/10 border border-[#B57BFF]/20 flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-[#B57BFF]" />
                </div>
                <div>
                  <div className="font-bold text-sm">Comparte tu rutina 💪</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {rutinas.find(r => r.id === modalCompartir)?.nombre}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setModalCompartir(null); setCodigoCompartir(null) }}
                className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="px-5 pb-8">
              {generandoCodigo ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-8 h-8 border-2 border-[#B57BFF]/20 border-t-[#B57BFF] rounded-full animate-spin" />
                  <div className="text-gray-500 text-sm">Generando tu código único...</div>
                </div>
              ) : codigoCompartir ? (
                <>
                  {/* Código con card dorada */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-[#1a0d2e] to-[#111] border border-[#B57BFF]/30 rounded-2xl px-5 py-7 text-center mb-4">
                    <div className="absolute -top-8 -right-8 w-28 h-28 bg-[#B57BFF]/8 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-[#B57BFF]/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="text-[9px] text-[#B57BFF]/50 uppercase tracking-[0.3em] mb-3 font-semibold">Código de tu rutina</div>
                    <div className="text-5xl font-black font-mono tracking-[0.12em] text-[#B57BFF] mb-6"
                      style={{ textShadow: '0 0 30px rgba(245,197,24,0.25)' }}>
                      {codigoCompartir}
                    </div>
                    <button
                      onClick={copiarCodigo}
                      className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        copiado
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-[#B57BFF] text-white hover:bg-[#9B5BF7]'
                      }`}>
                      {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiado ? '¡Copiado!' : 'Copiar código'}
                    </button>
                  </div>

                  {/* Instrucciones */}
                  <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-4 space-y-2.5">
                    <div className="text-xs font-semibold text-gray-200">¿Cómo lo comparto?</div>
                    <div className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="text-[#B57BFF] font-bold shrink-0">1.</span>
                      <span>Copia el código y mándalo por WhatsApp, mensaje o como quieras.</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="text-[#B57BFF] font-bold shrink-0">2.</span>
                      <span>Tu amigo/a abre FitPro → Rutinas → &ldquo;¿Te compartieron una rutina?&rdquo;</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="text-[#B57BFF] font-bold shrink-0">3.</span>
                      <span>Pega el código y listo — recibirán su propia copia para editar.</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-red-400 py-10 text-center">Error al generar el código. Intenta de nuevo.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          DETALLE DE EJERCICIO (desde la sesión en curso)
      ══════════════════════════════════ */}
      {detalleSesionEj && (
        <div className="fixed inset-0 bg-black/85 z-[60] flex items-end justify-center">
          <div className="bg-[#111] border border-white/10 rounded-t-3xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <div className="font-bold text-sm">{detalleSesionEj.nombre}</div>
              <button
                onClick={() => setDetalleSesionEj(null)}
                className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-5">
              <DetalleEjercicioContenido ej={detalleSesionEj} />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
