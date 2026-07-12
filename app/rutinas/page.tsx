'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Share2, Users, Search, Download, Copy, Check, Dumbbell, Trash2, Calendar, ArrowLeftRight, Sparkles, Play, Plus } from 'lucide-react'
import GaleriaPlantillas from './GaleriaPlantillas'

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
          className="w-16 bg-[#FFFFFF] border border-black/10 rounded-lg py-1.5 text-sm text-[#1b201a] text-center focus:outline-none focus:border-[#FF6B57]/50 disabled:opacity-50"
        />
        <span className="text-[10px] text-[#6d7362] mt-0.5">segundos</span>
      </div>

      <div className="relative w-[72px] h-[72px] shrink-0">
        <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}>
          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
          <circle
            cx="36" cy="36" r={r} fill="none"
            stroke={restante === 0 || enAviso ? '#EF4444' : '#FB8C3C'}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xl font-black" style={{ color: restante === 0 || enAviso ? '#EF4444' : '#FB8C3C' }}>
          {restante}
        </div>
      </div>

      <div className="flex gap-2">
        {!corriendo ? (
          <button
            onClick={iniciar}
            className="w-11 h-11 rounded-full text-[#1b201a] flex items-center justify-center text-sm" style={{ background: '#FB8C3C' }}>
            ▶
          </button>
        ) : (
          <button
            onClick={pausar}
            className="w-11 h-11 rounded-full bg-black/[0.05] text-[#1b201a] flex items-center justify-center text-sm">
            ⏸
          </button>
        )}
        <button
          onClick={reiniciar}
          className="w-11 h-11 rounded-full bg-black/[0.05] text-[#3b4137] flex items-center justify-center text-sm">
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
              className="h-40 w-auto rounded-xl border border-black/10 bg-black/[0.04] object-contain shrink-0"
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs bg-[#FFFFFF] border border-black/10 rounded-full px-3 py-1 text-[#3b4137]">
          💪 {ej.musculo_principal}
        </span>
        {ej.equipo && (
          <span className="text-xs bg-[#FFFFFF] border border-black/10 rounded-full px-3 py-1 text-[#3b4137]">
            🏋️ {ej.equipo}
          </span>
        )}
      </div>

      {ej.instrucciones && (
        <div className="mb-5">
          <div className="text-[10px] text-[#787f70] uppercase tracking-widest mb-1.5">Instrucciones</div>
          <p className="text-sm text-[#3b4137] leading-relaxed">{ej.instrucciones}</p>
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

  // Galería de rutinas listas (Modelo B)
  const [galeriaAbierta, setGaleriaAbierta] = useState(false)

  // Plegar/desplegar lista de ejercicios por rutina (true = plegado)
  const [ejPlegados, setEjPlegados] = useState<Record<string, boolean>>({})

  // Vista semanal
  const [vistaSemanal, setVistaSemanal]         = useState<string | null>(null)
  const [diaOrigenSemanal, setDiaOrigenSemanal] = useState<string | null>(null)
  const [avisoSemanal, setAvisoSemanal]         = useState<string | null>(null)
  const [avisoSemanalError, setAvisoSemanalError] = useState(false)

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

  // Sexo del usuario para la caricatura y filtrar plantillas
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
  // Mascota PorotoFit: una sola para todos (ya no depende del sexo del usuario).
  const porotoEntrena = '/caricaturas/poroto-entrena.png'
  const porotoAmigos = '/caricaturas/poroto-amigos.png'

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  useEffect(() => {
    if (!userId) return
    supabase.from('perfiles').select('sexo').eq('id', userId).single()
      .then(({ data }) => {
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
  // Devuelve true SOLO si el servidor confirmó el cambio. El intercambio se hace
  // en /api/rutinas/mover-dia (con service role) porque la tabla rutina_ejercicios
  // no tiene política RLS de UPDATE: un UPDATE directo desde el cliente responde
  // "ok" pero afecta 0 filas y no guarda nada. En conexiones intermitentes (wifi
  // del gym) se reintenta; si finalmente falla, NO se toca la pantalla para no
  // aparentar que se movió cuando en realidad no se guardó.
  const intercambiarDias = async (rutinaId: string, diaA: string, diaB: string): Promise<boolean> => {
    const rutina = rutinas.find(r => r.id === rutinaId)
    if (!rutina) return false

    let guardado = false
    for (let intento = 0; intento < 3; intento++) {
      try {
        const res = await fetch('/api/rutinas/mover-dia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rutina_id: rutinaId, diaA, diaB }),
        })
        if (res.ok) { guardado = true; break }
        // 4xx (sin permiso, datos inválidos) no se arregla reintentando
        if (res.status >= 400 && res.status < 500) {
          console.error('[intercambiarDias] el servidor rechazó el cambio:', res.status)
          break
        }
      } catch (e) {
        console.error(`[intercambiarDias] intento ${intento + 1} falló (red):`, e)
      }
      await new Promise(res => setTimeout(res, 500 * (intento + 1)))
    }
    if (!guardado) return false

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
    return true
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
    const texto = `¡Entrena conmigo en PorotoFit! Usa mi código de rutina: ${codigo}`
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
    <div className="min-h-screen bg-[#FFF8F3] text-[#1b201a] max-w-lg mx-auto">

      {/* HEADER */}
      <div className="sticky top-0 z-10 px-5 py-3 flex items-center justify-between" style={{ background: '#FF6B57' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/caricaturas/poroto-wordmark.png" alt="PorotoFit" style={{ height: 28, width: 'auto' }} className="pointer-events-none select-none" />
        <a href="/inicio" className="text-xs text-white/85">← Inicio</a>
      </div>

      <div className="p-5">
        <h2 className="text-xl font-bold mb-5">Mis <span className="text-[#E14E2C]">Rutinas</span></h2>

        {/* Skeleton */}
        {cargando && (
          <div className="flex flex-col gap-5">
            {[1, 2].map(i => (
              <div key={i} className="bg-[#FFFFFF] border border-black/10 rounded-2xl p-5 animate-pulse">
                <div className="h-6 bg-black/[0.05] rounded w-2/3 mb-2" />
                <div className="h-3 bg-black/[0.05] rounded w-1/4 mb-5" />
                <div className="h-40 bg-black/[0.05] rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {!cargando && rutinas.length === 0 && (
          <div className="flex flex-col items-center text-center pt-4 pb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={porotoEntrena}
              alt=""
              className="mb-5 pointer-events-none select-none"
              style={{ width: 180, height: 180, objectFit: 'contain', objectPosition: 'bottom center', filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.18))' }}
            />
            <h3 className="text-2xl font-black">Crea tu primera rutina</h3>
            <p className="text-sm text-[#5d6358] mt-2 mb-7 leading-relaxed mx-auto" style={{ maxWidth: 300 }}>
              Elige una rutina lista hecha para tu objetivo, o arma la tuya desde cero.
            </p>
            <button
              onClick={() => setGaleriaAbierta(true)}
              className="w-full rounded-2xl py-4 text-white text-sm font-bold flex items-center justify-center gap-2 mb-3"
              style={{ background: 'linear-gradient(135deg, #FF6B57, #E14E2C)', boxShadow: '0 0 24px rgba(255,107,87,0.35)' }}>
              <Sparkles className="w-4 h-4" />
              Elegir una rutina lista
            </button>
            <button
              onClick={abrirWizard}
              className="w-full text-[#E14E2C]/70 text-xs font-semibold py-1.5 hover:text-[#E14E2C] transition-colors">
              ＋ Crear desde cero (avanzado)
            </button>
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
                <div key={rutina.id} className="rounded-2xl overflow-hidden border border-[#FF6B57]/40" style={{ background: 'rgba(255,107,87,0.04)', boxShadow: '0 0 32px rgba(255,107,87,0.10)' }}>

                  {/* Cabecera: nombre usuario + código compartir + borrar */}
                  <div className="px-5 pt-5 pb-4 flex items-start justify-between border-b border-black/[0.06]">
                    <div className="min-w-0">
                      <div className="text-xl font-black leading-tight">Entrenamiento de hoy</div>
                      <div className="text-xs text-[#E14E2C]/70 mt-0.5 truncate">{rutina.nombre}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3 mt-0.5">
                      {confirmBorrar === rutina.id ? (
                        <>
                          <span className="text-[10px] text-[#5d6358]">¿Eliminar?</span>
                          <button
                            onClick={() => borrarRutina(rutina.id)}
                            disabled={borrando}
                            className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-2 py-1 disabled:opacity-50">
                            {borrando ? '...' : 'Sí'}
                          </button>
                          <button
                            onClick={() => setConfirmBorrar(null)}
                            className="text-[10px] text-[#787f70] border border-black/10 rounded-lg px-2 py-1">
                            No
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmBorrar(rutina.id)}
                          className="text-[#6d7362] hover:text-red-400 transition-colors text-lg leading-none">
                          🗑
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fila del día: cuadrito + info + ícono calendario */}
                  <div className="px-5 py-4 flex items-center gap-4">
                    <div
                      className="shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #FF6B57, #E14E2C)' }}>
                      <span className="text-3xl font-black leading-none text-white">{dateSel.getDate()}</span>
                      <span className="text-[10px] font-bold text-white/80 uppercase tracking-wide mt-0.5">
                        {diaSel.slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[#1b201a] capitalize">{diaDisplay}</div>
                      <div className="text-[11px] text-[#E14E2C]/60 mt-0.5">
                        {ejsDia.length} ejercicio{ejsDia.length !== 1 ? 's' : ''} · {rutina.dias_semana} días/sem
                      </div>
                    </div>
                    <button
                      onClick={() => setCalendarAbierto(prev => ({ ...prev, [rutina.id]: !prev[rutina.id] }))}
                      className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                      style={{
                        background: calendarAbierto[rutina.id] ? 'rgba(255,107,87,0.20)' : 'rgba(255,107,87,0.08)',
                        border: '1px solid rgba(255,107,87,0.30)',
                        color: '#FF6B57',
                      }}>
                      <Calendar className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Calendario plegable */}
                  {calendarAbierto[rutina.id] && (
                    <div className="px-5 pb-4 pt-3 border-t border-black/[0.06]">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => prevMes(rutina.id)}
                          className="w-7 h-7 flex items-center justify-center text-[#787f70] hover:text-[#1b201a] transition-colors rounded-lg hover:bg-black/[0.03]">
                          ‹
                        </button>
                        <span className="text-xs font-semibold text-[#3b4137]">{MESES[mes.m]} {mes.y}</span>
                        <button
                          onClick={() => nextMes(rutina.id)}
                          className="w-7 h-7 flex items-center justify-center text-[#787f70] hover:text-[#1b201a] transition-colors rounded-lg hover:bg-black/[0.03]">
                          ›
                        </button>
                      </div>
                      <div className="grid grid-cols-7 mb-1">
                        {DIAS_CORTO.map(d => (
                          <div key={d} className="text-[9px] text-[#6d7362] text-center uppercase tracking-wide">{d}</div>
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
                          if (esSel && esDone)      circulo += 'bg-green-500 text-[#1b201a]'
                          else if (esSel && esHoy)  circulo += 'bg-[#FF6B57] text-white'
                          else if (esSel)            circulo += 'bg-[#FF6B57] text-white'
                          else if (esDone)           circulo += 'bg-green-500/15 text-green-400'
                          else if (esHoy)            circulo += 'ring-1 ring-[#FF6B57] text-[#E14E2C]'
                          else if (esEnt)            circulo += 'text-[#1b201a] hover:bg-white/8 cursor-pointer'
                          else                       circulo += 'text-[#7c8271] hover:bg-black/[0.03] cursor-pointer'
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

                  {/* Lista de ejercicios — plegable */}
                  <div className="px-5 pb-5">

                    {/* Encabezado plegador */}
                    <button
                      onClick={() => setEjPlegados(prev => ({ ...prev, [rutina.id]: !prev[rutina.id] }))}
                      className="flex items-center w-full mb-3">
                      <span
                        className="text-sm font-black tracking-wider"
                        style={{ fontFamily: "'Oswald', sans-serif", color: '#FB8C3C' }}>
                        EJERCICIOS
                      </span>
                      <span className="ml-2 text-[11px] font-semibold text-[#E14E2C]">
                        {ejsDia.length} {ejsDia.length === 1 ? 'ejercicio' : 'ejercicios'}
                      </span>
                      <span
                        className="ml-auto text-[#787f70] text-xs transition-transform duration-300"
                        style={{ display: 'inline-block', transform: ejPlegados[rutina.id] ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                        ▲
                      </span>
                    </button>

                    {/* Contenido plegable */}
                    <div className={`overflow-hidden transition-all duration-300 ${ejPlegados[rutina.id] ? 'max-h-0' : 'max-h-[9999px]'}`}>
                      {ejsDia.length === 0 ? (
                        <div className="text-xs text-[#6d7362] py-4 text-center border border-dashed border-black/[0.08] rounded-xl mb-3">
                          Sin ejercicios para {diaSel}
                        </div>
                      ) : (
                        <div className="mb-3">
                          {ejsDia.map((ej, i) => (
                            <div key={ej.id} className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-black/[0.03] mb-1.5">
                              <span className="text-[#E14E2C] text-xs font-bold shrink-0 w-5 text-right">{i + 1}.</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{ej.ejercicios?.nombre}</div>
                              </div>
                              {/* Flechitas reordenar */}
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <button
                                  onClick={() => moverEjercicio(rutina.id, ej.id, 'arriba')}
                                  disabled={i === 0}
                                  className={`w-6 h-5 flex items-center justify-center rounded text-[10px] leading-none transition-colors
                                    ${i === 0 ? 'text-[#7c8271] cursor-not-allowed' : 'text-[#5d6358] active:text-[#E14E2C]'}`}>
                                  ▲
                                </button>
                                <button
                                  onClick={() => moverEjercicio(rutina.id, ej.id, 'abajo')}
                                  disabled={i === ejsDia.length - 1}
                                  className={`w-6 h-5 flex items-center justify-center rounded text-[10px] leading-none transition-colors
                                    ${i === ejsDia.length - 1 ? 'text-[#7c8271] cursor-not-allowed' : 'text-[#5d6358] active:text-[#E14E2C]'}`}>
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
                                    className="text-[10px] text-[#787f70] border border-black/10 rounded px-1.5 py-0.5 hover:text-[#1b201a] transition-colors">
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmBorrarEj(ej.id)}
                                  className="text-[#6d7362] hover:text-red-400 transition-colors shrink-0 text-sm leading-none">
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => iniciarSesion(rutina, diaSel, fechaSel)}
                        disabled={ejsDia.length === 0}
                        className="w-full mt-1 flex items-center justify-center gap-2 text-[#1b201a] font-bold rounded-xl py-3.5 text-[15px] disabled:opacity-25 transition-opacity"
                        style={{ background: 'linear-gradient(135deg, #FB8C3C, #EA7A1C)', boxShadow: '0 0 20px rgba(251,140,60,0.32)' }}>
                        <Play className="w-4 h-4 fill-white" />
                        Empezar entrenamiento
                      </button>

                      {/* Acciones secundarias: agregar ejercicio · ordenar días */}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => abrirModalEj(rutina.id, diaSel)}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#E14E2C] border border-[#FF6B57]/30 rounded-xl py-2.5 hover:bg-[#FF6B57]/10 transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                          Agregar ejercicio
                        </button>
                        <button
                          onClick={() => { setVistaSemanal(rutina.id); setDiaOrigenSemanal(null); setAvisoSemanal(null) }}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#E14E2C] border border-[#FF6B57]/30 rounded-xl py-2.5 hover:bg-[#FF6B57]/10 transition-colors">
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          Ordenar días
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Conseguir otra rutina (solo si ya hay alguna) ── */}
        {rutinas.length > 0 && (
          <div className="mb-5">
            <div className="text-[11px] text-[#787f70] uppercase tracking-widest mb-2 text-center">¿Quieres otra rutina?</div>
            <button
              onClick={() => setGaleriaAbierta(true)}
              className="w-full rounded-2xl py-3.5 text-white text-sm font-bold flex items-center justify-center gap-2 mb-2"
              style={{ background: 'linear-gradient(135deg, #FF6B57, #E14E2C)', boxShadow: '0 0 24px rgba(255,107,87,0.35)' }}>
              <Sparkles className="w-4 h-4" />
              Elegir una rutina lista
            </button>
            <button
              onClick={abrirWizard}
              className="w-full text-[#E14E2C]/70 text-xs font-semibold py-1.5 hover:text-[#E14E2C] transition-colors">
              ＋ Crear desde cero (avanzado)
            </button>
          </div>
        )}

        {/* ── BANNER: ¡Reta a un amigo! (al final) ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #FF6B57 0%, #FB8C3C 100%)' }}
        >
          {/* Fila principal */}
          <div className="flex items-stretch">
            {/* Caricatura libre: sin recuadro, apoyada en la base del banner */}
            <div className="shrink-0 flex flex-col justify-center" style={{ width: '118px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={porotoAmigos}
                alt="Reta a un amigo"
                style={{
                  display: 'block',
                  width: '118px',
                  height: '112px',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.35))',
                }}
              />
            </div>

            {/* Texto y botones */}
            <div className="flex-1 min-w-0 py-4 pr-4 pl-2">
              <div className="text-white font-black text-[15px] leading-tight">
                {rutinas.length === 0 ? '¿Tienes un código?' : '¡Reta a un amigo!'}
              </div>
              <div className="text-white/85 text-xs mt-0.5 leading-relaxed">
                {rutinas.length === 0 ? 'Agrega la rutina que un amigo te compartió' : 'Comparte tu rutina o agrega una'}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {rutinas.length > 0 && (
                  <button
                    onClick={() => compartirDirecto(rutinas[0].id)}
                    disabled={compartiendoDirecto}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-white font-bold rounded-lg text-xs disabled:opacity-40 transition-opacity"
                    style={{ color: '#FF6B57' }}
                  >
                    <Share2 className="w-3 h-3" />
                    {compartiendoDirecto ? '...' : 'Compartir'}
                  </button>
                )}
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
                <div className="mt-2 text-[11px] text-[#1b201a]/90 flex items-center gap-1.5">
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
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm text-[#1b201a] font-mono tracking-[0.2em] focus:outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.30)' }}
                />
                <button
                  onClick={buscarPorCodigo}
                  disabled={!inputImportar.trim() || buscandoCodigo}
                  className="flex items-center gap-1.5 bg-white font-bold rounded-xl px-4 py-2.5 text-xs disabled:opacity-40 whitespace-nowrap transition-opacity"
                  style={{ color: '#FF6B57' }}
                >
                  <Search className="w-3.5 h-3.5" />
                  {buscandoCodigo ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              {errorImportar && (
                <div className="text-xs text-[#1b201a] bg-red-500/40 border border-red-400/30 rounded-xl px-3 py-2 mb-2">{errorImportar}</div>
              )}

              {previewImport && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.20)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Dumbbell className="w-4 h-4 text-[#1b201a] shrink-0" />
                    <div className="text-sm font-bold text-[#1b201a]">{previewImport.nombre}</div>
                  </div>
                  <div className="text-xs text-[#1b201a]/60 mb-3 pl-6">
                    {previewImport.dias_semana} días/semana · {previewImport.rutina_ejercicios.length} ejercicios
                  </div>
                  <button
                    onClick={importarRutina}
                    disabled={importando}
                    className="w-full bg-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
                    style={{ color: '#FF6B57' }}
                  >
                    <Download className="w-4 h-4" />
                    {importando ? 'Importando...' : 'Añadir a mis rutinas'}
                  </button>
                </div>
              )}

              {importOk && (
                <div className="text-xs text-[#1b201a] rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: 'rgba(255,107,87,0.30)', border: '1px solid rgba(255,107,87,0.35)' }}>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>¡Rutina añadida! Ya aparece en tu lista arriba.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════
          GALERÍA DE RUTINAS LISTAS (Modelo B)
      ══════════════════════════════════ */}
      {galeriaAbierta && userId && (
        <GaleriaPlantillas
          userId={userId}
          userSexo={userSexo}
          onClose={() => setGaleriaAbierta(false)}
          onUsada={() => { setGaleriaAbierta(false); cargarRutinas() }}
        />
      )}

      {/* ══════════════════════════════════
          WIZARD — CREAR RUTINA (pantalla completa)
      ══════════════════════════════════ */}
      {wizard && (
        <div className="fixed inset-0 bg-[#FFF8F3] z-50 flex flex-col max-w-lg mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 shrink-0">
            <div>
              <div className="text-[10px] text-[#787f70] uppercase tracking-widest mb-0.5">
                Paso {wizard.paso} de 2
              </div>
              <div className="font-bold text-sm">
                {wizard.paso === 1 ? 'Nueva rutina' : wizard.nombre}
              </div>
            </div>
            <button
              onClick={cerrarWizard}
              className="text-xs text-[#787f70] hover:text-[#1b201a] border border-black/10 rounded-lg px-3 py-1.5 transition-colors">
              Cancelar
            </button>
          </div>

          {/* Barra de progreso */}
          <div className="h-0.5 bg-black/[0.05] shrink-0">
            <div
              className="h-full bg-[#FF6B57] transition-all duration-300"
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
                    <label className="text-xs text-[#5d6358] uppercase tracking-widest mb-2.5 block">
                      Nombre de la rutina
                    </label>
                    <input
                      value={wizard.nombre}
                      onChange={e => setWizard(prev => prev ? { ...prev, nombre: e.target.value } : prev)}
                      placeholder="Ej: Push / Pull / Legs"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && avanzarPaso1()}
                      className="w-full bg-[#FFFFFF] border border-black/10 rounded-xl px-4 py-3 text-sm text-[#1b201a] placeholder-[#9ba192] focus:outline-none focus:border-[#FF6B57]/50"
                    />
                  </div>

                  {/* Días */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs text-[#5d6358] uppercase tracking-widest">
                        Días de entrenamiento
                      </label>
                      {wizard.diasElegidos.length > 0 && (
                        <span className="text-xs text-[#E14E2C] font-semibold">
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
                                ? 'bg-[#FF6B57] text-white'
                                : 'bg-[#FFFFFF] text-[#787f70] border border-black/10 hover:border-black/15 hover:text-[#1b201a]'
                            }`}>
                            {DIAS_CORTO[i]}
                          </button>
                        )
                      })}
                    </div>
                    {wizard.diasElegidos.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {wizard.diasElegidos.map(d => (
                          <span key={d} className="text-[10px] text-[#E14E2C]/70 bg-[#FF6B57]/8 border border-[#FF6B57]/20 rounded-full px-2.5 py-0.5">
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
                  className="w-full bg-[#FF6B57] text-white font-bold py-4 rounded-2xl text-base disabled:opacity-30 transition-opacity">
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
                <p className="text-[10px] text-[#787f70] uppercase tracking-widest mb-2">Selecciona un día para armar su plantilla</p>
                <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                  {wizard.diasElegidos.map(dia => {
                    const ejsEnDia = (wizardRutina?.rutina_ejercicios ?? []).filter(e => e.dia_semana === dia).length
                    return (
                      <button
                        key={dia}
                        onClick={() => setWizard(prev => prev ? { ...prev, diaActivo: dia } : prev)}
                        className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors relative ${
                          wizard.diaActivo === dia
                            ? 'bg-[#FF6B57] text-white'
                            : 'bg-[#FFFFFF] text-[#5d6358] border border-black/10 hover:border-black/15'
                        }`}>
                        {dia}
                        {ejsEnDia > 0 && (
                          <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                            wizard.diaActivo === dia ? 'bg-black text-[#E14E2C]' : 'bg-[#FF6B57] text-white'
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
                  <div className="text-xs text-[#6d7362] py-10 text-center border border-dashed border-black/[0.08] rounded-xl mb-3">
                    Sin ejercicios para el {wizard.diaActivo}
                  </div>
                ) : (
                  <div className="bg-[#FFFFFF] border border-black/10 rounded-2xl overflow-hidden mb-3">
                    {wizardEjsDia.map((ej, i) => (
                      <div key={ej.id} className="flex items-center gap-2 px-4 py-3 border-b border-black/[0.06] last:border-0">
                        <span className="text-[#E14E2C] text-xs font-bold w-4 text-center shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{ej.ejercicios?.nombre}</div>
                          <div className="text-[10px] text-[#787f70] mt-0.5">{ej.ejercicios?.musculo_principal}</div>
                        </div>
                        <div className="text-xs text-[#787f70] shrink-0">{esCardio(ej) ? '🏃 Cardio' : `${ej.series}×${ej.repeticiones}`}</div>
                        {/* Flechitas reordenar */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            onClick={() => wizard?.rutinaId && moverEjercicio(wizard.rutinaId, ej.id, 'arriba')}
                            disabled={i === 0}
                            className={`w-6 h-5 flex items-center justify-center rounded text-[10px] leading-none transition-colors
                              ${i === 0 ? 'text-[#7c8271] cursor-not-allowed' : 'text-[#787f70] active:text-[#E14E2C]'}`}>
                            ▲
                          </button>
                          <button
                            onClick={() => wizard?.rutinaId && moverEjercicio(wizard.rutinaId, ej.id, 'abajo')}
                            disabled={i === wizardEjsDia.length - 1}
                            className={`w-6 h-5 flex items-center justify-center rounded text-[10px] leading-none transition-colors
                              ${i === wizardEjsDia.length - 1 ? 'text-[#7c8271] cursor-not-allowed' : 'text-[#787f70] active:text-[#E14E2C]'}`}>
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
                              className="text-[10px] text-[#787f70] border border-black/10 rounded px-1.5 py-0.5 hover:text-[#1b201a] transition-colors">
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmBorrarEj(ej.id)}
                            className="text-[#7c8271] hover:text-red-400 transition-colors shrink-0 text-base leading-none">
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
                    className="w-full border border-dashed border-white/15 rounded-xl py-3 text-xs text-[#5d6358] hover:border-[#FF6B57]/40 hover:text-[#E14E2C] transition-colors font-medium">
                    ＋ Agregar ejercicio al {wizard.diaActivo}
                  </button>
                )}
              </div>

              <div className="px-5 pb-10 pt-3 border-t border-black/10 shrink-0">
                <button
                  onClick={terminarWizard}
                  className="w-full bg-[#FF6B57] text-white font-bold py-4 rounded-2xl text-base">
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
          <div className="bg-[#111] border border-black/10 rounded-t-3xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-black/[0.06] rounded-full" />
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <div>
                <div className="font-bold text-sm">
                  {detalleEj ? detalleEj.nombre : 'Agregar ejercicio'}
                </div>
                <div className="text-xs text-[#E14E2C]">{modalEj.dia}</div>
              </div>
              <button
                onClick={() => detalleEj ? setDetalleEj(null) : cerrarModalEj()}
                className="text-[#787f70] hover:text-[#1b201a] text-xl leading-none">×</button>
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
                  className="text-xs text-[#5d6358] hover:text-[#1b201a] mb-3 flex items-center gap-1">
                  ← Volver a la lista
                </button>

                <DetalleEjercicioContenido ej={detalleEj} />

                {errorEj && (
                  <div className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{errorEj}</div>
                )}

                <button
                  onClick={() => agregarEjercicioDirecto(detalleEj)}
                  disabled={insertandoEjId !== null}
                  className="w-full bg-[#FF6B57] text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60">
                  {insertandoEjId === detalleEj.id ? 'Agregando…' : `＋ Agregar a ${modalEj.dia}`}
                </button>
              </div>
            ) : (
              <>
                {/* Buscador con ícono cian */}
                <div className="px-5 pb-3 shrink-0">
                  <div className="flex items-center gap-2 bg-[#FFFFFF] border border-[#FB8C3C]/40 rounded-xl px-4 py-2.5 focus-within:border-[#FB8C3C]/70 transition-colors">
                    <Search className="w-4 h-4 text-[#FB8C3C] shrink-0" />
                    <input
                      value={busquedaEj}
                      onChange={e => setBusquedaEj(e.target.value)}
                      placeholder="Buscar ejercicio..."
                      className="flex-1 bg-transparent text-sm text-[#1b201a] placeholder-[#9ba192] focus:outline-none"
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
                          ? { background: 'linear-gradient(135deg, #FF6B57, #E14E2C)', color: '#fff' }
                          : { background: '#FFFFFF', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.10)' }}>
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
                        <div key={i} className="bg-[#FFFFFF] rounded-2xl animate-pulse h-44" />
                      ))}
                    </div>
                  ) : ejsCat.length === 0 ? (
                    <div className="text-center text-[#6d7362] text-sm py-10">Sin resultados</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {ejsCat.map(ej => (
                        <div key={ej.id} className="bg-[#FFFFFF] border border-black/[0.08] rounded-2xl overflow-hidden flex flex-col min-w-0">
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
                                <Dumbbell className="w-8 h-8 text-[#7c8271]" />
                              </div>
                            )}
                          </button>
                          {/* Nombre + botón agregar */}
                          <div className="p-2.5 flex flex-col gap-2 flex-1">
                            <div className="text-xs font-medium leading-snug text-[#1b201a] overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {ej.nombre}
                            </div>
                            <button
                              onClick={() => agregarEjercicioDirecto(ej)}
                              disabled={insertandoEjId !== null}
                              className="mt-auto w-full rounded-lg py-1.5 text-[11px] font-bold text-[#FB8C3C] disabled:opacity-50 transition-colors"
                              style={{ background: 'rgba(251,140,60,0.10)', border: '1px solid rgba(251,140,60,0.25)' }}>
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
          VISTA SEMANAL
      ══════════════════════════════════ */}
      {vistaSemanal && (() => {
        const rutinaS = rutinas.find(r => r.id === vistaSemanal)
        if (!rutinaS) return null
        const hoyDia = diaSemanaLocal(new Date())
        return (
          <div className="fixed inset-0 z-50 flex flex-col max-w-lg mx-auto" style={{ background: '#F1F3EE' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 shrink-0">
              <div>
                <div className="text-[10px] text-[#787f70] uppercase tracking-widest">Cambiar día de entreno</div>
                <div
                  className="font-black text-sm mt-0.5"
                  style={{ fontFamily: "'Oswald', sans-serif", color: '#FB8C3C' }}>
                  {rutinaS.nombre.toUpperCase()}
                </div>
              </div>
              <button
                onClick={() => { setVistaSemanal(null); setDiaOrigenSemanal(null); setAvisoSemanal(null) }}
                className="text-xs text-[#787f70] hover:text-[#1b201a] border border-black/10 rounded-lg px-3 py-1.5">
                ← Volver
              </button>
            </div>

            {/* Instrucción */}
            <div className="px-5 pt-3 pb-1 text-[11px] shrink-0" style={{ color: '#6b7280' }}>
              {diaOrigenSemanal
                ? <span>Toca el día destino para mover el entreno del <span className="font-semibold" style={{ color: '#FB8C3C' }}>{diaOrigenSemanal}</span></span>
                : 'Toca un día con entreno para seleccionarlo y moverlo'}
            </div>

            {/* Aviso: verde si se guardó, rojo si falló */}
            {avisoSemanal && (
              <div className={`mx-5 mt-2 px-4 py-2 rounded-xl text-xs text-center shrink-0 border ${
                avisoSemanalError
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-green-500/10 border-green-500/20 text-green-400'
              }`}>
                {avisoSemanal}
              </div>
            )}

            {/* 7 días */}
            <div className="flex-1 overflow-y-auto px-5 pt-3 pb-8 space-y-2.5">
              {DIAS.map(dia => {
                const ejsDelDia = rutinaS.rutina_ejercicios.filter(e => e.dia_semana === dia)
                const tieneEntreno = ejsDelDia.length > 0
                const esHoy = dia === hoyDia
                const esOrigen = diaOrigenSemanal === dia
                const musculos = [...new Set(
                  ejsDelDia.map(e => e.ejercicios?.musculo_principal).filter(Boolean)
                )].slice(0, 3).join(' · ')

                return (
                  <button
                    key={dia}
                    onClick={async () => {
                      if (diaOrigenSemanal === null) {
                        if (tieneEntreno) setDiaOrigenSemanal(dia)
                        return
                      }
                      if (diaOrigenSemanal === dia) { setDiaOrigenSemanal(null); return }
                      const tieneDestino = rutinaS.rutina_ejercicios.some(e => e.dia_semana === dia)
                      const ok = await intercambiarDias(vistaSemanal, diaOrigenSemanal, dia)
                      setDiaOrigenSemanal(null)
                      if (ok) {
                        setAvisoSemanalError(false)
                        setAvisoSemanal(tieneDestino ? '✓ Días intercambiados' : '✓ Entreno movido')
                        setTimeout(() => setAvisoSemanal(null), 2500)
                      } else {
                        setAvisoSemanalError(true)
                        setAvisoSemanal('⚠ No se pudo guardar. Revisa tu conexión e inténtalo otra vez.')
                        setTimeout(() => setAvisoSemanal(null), 4000)
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all text-left
                      ${esOrigen
                        ? 'border-[#FB8C3C] bg-[#FB8C3C]/8'
                        : esHoy
                          ? 'border-[#FF6B57]/60 bg-[#FF6B57]/5'
                          : tieneEntreno
                            ? 'border-black/10 bg-black/[0.03]'
                            : 'border-black/[0.06] bg-transparent'}`}
                  >
                    {/* Nombre corto del día en Oswald */}
                    <div
                      className="text-sm font-black w-8 shrink-0"
                      style={{
                        fontFamily: "'Oswald', sans-serif",
                        color: esOrigen ? '#FB8C3C' : esHoy ? '#FF6B57' : '#6b7280',
                      }}>
                      {dia.slice(0, 3).toUpperCase()}
                    </div>

                    {/* Pill de entreno o Descanso */}
                    {tieneEntreno ? (
                      <div
                        className="flex-1 min-w-0 px-3 py-1.5 rounded-xl text-xs font-black truncate"
                        style={{
                          fontFamily: "'Oswald', sans-serif",
                          fontSize: '13px',
                          background: esOrigen
                            ? 'rgba(251,140,60,0.15)'
                            : 'linear-gradient(135deg, rgba(255,107,87,0.18), rgba(22,163,74,0.12))',
                          color: esOrigen ? '#FB8C3C' : '#FF6B57',
                        }}>
                        {musculos || 'Entrenamiento'}
                      </div>
                    ) : (
                      <div className="flex-1 text-xs text-[#6d7362] italic">Descanso</div>
                    )}

                    {/* Contador de ejercicios */}
                    {tieneEntreno && (
                      <span className="text-[10px] text-[#6d7362] shrink-0">{ejsDelDia.length} ej.</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ══════════════════════════════════
          SESIÓN (pantalla completa)
      ══════════════════════════════════ */}
      {sesion && (
        <div className="fixed inset-0 bg-[#FFF8F3] z-50 flex flex-col max-w-lg mx-auto">

          <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 shrink-0">
            <div>
              <div className="text-[10px] text-[#787f70] uppercase tracking-widest">
                {sesion.dia} · {new Date(sesion.fecha + 'T00:00:00').getDate()} {MESES[new Date(sesion.fecha + 'T00:00:00').getMonth()].toLowerCase()} · Sesión en curso
              </div>
              <div className="font-bold text-sm mt-0.5">{sesion.rutina.nombre}</div>
            </div>
            <button onClick={() => { setSesion(null); setDetalleSesionEj(null) }}
              className="text-xs text-[#787f70] hover:text-[#1b201a] border border-black/10 rounded-lg px-3 py-1.5">
              Salir
            </button>
          </div>

          {!sesionOk ? (
            <>
              {/* Barra de progreso */}
              <div className="px-5 pt-3 pb-2 shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-[#5d6358]">
                    Ejercicio {ejActivo + 1} de {sesion.ejercicios.length}
                  </span>
                  <span className="text-[11px] text-[#6d7362]">
                    {Math.round(((ejActivo + 1) / sesion.ejercicios.length) * 100)}%
                  </span>
                </div>
                <div className="h-1 bg-black/[0.05] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${((ejActivo + 1) / sesion.ejercicios.length) * 100}%`, background: 'linear-gradient(90deg, #FF6B57, #FF6B57)' }}
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
                      className="rounded-2xl border border-[#FF6B57]/40 p-4 w-full"
                      style={{ background: 'rgba(255,107,87,0.06)', boxShadow: '0 0 24px rgba(255,107,87,0.08)', boxSizing: 'border-box' }}
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
                            color: '#FB8C3C',
                            lineHeight: 1.15,
                          }}
                        >{ej.ejercicios?.nombre}</div>
                        {historial[ej.ejercicio_id] && (
                          <div className="text-[10px] text-[#E14E2C]/60 mt-1.5 flex items-center gap-2 flex-wrap">
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
                              return <span key="eq" className="bg-black/[0.05] text-[#5d6358] border border-white/15 rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap">= Igual</span>
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Foto plegable */}
                      {ej.ejercicios?.imagenes && ej.ejercicios.imagenes.length > 0 && (
                        <div className="mb-4">
                          <button
                            onClick={() => setFotoAbierta(v => !v)}
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#E14E2C] hover:text-[#E14E2C] transition-colors mb-2">
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
                                  className="h-36 w-auto rounded-xl border border-black/10 bg-black/[0.04] object-contain shrink-0"
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
                              ${serie.ok ? 'border-[#FF6B57]/30 bg-[#FF6B57]/5' : 'border-black/10 bg-black/[0.04]'}`}>
                              <div className="grid grid-cols-2 gap-2 mb-2.5">
                                <div>
                                  <label className="text-[9px] text-[#6d7362] uppercase block mb-1 text-center">Minutos</label>
                                  <input type="number" min="0" inputMode="numeric" value={serie.duracionMin}
                                    onChange={e => updateSerie(ej.id, i, 'duracionMin', e.target.value)} placeholder="—"
                                    className="w-full bg-[#FFFFFF] border border-black/10 rounded-xl py-3 text-sm text-[#1b201a] text-center font-bold placeholder-gray-700 focus:outline-none focus:border-[#FF6B57]/40" />
                                </div>
                                <div>
                                  <label className="text-[9px] text-[#6d7362] uppercase block mb-1 text-center">Calorías (kcal)</label>
                                  <input type="number" min="0" inputMode="numeric" value={serie.calorias}
                                    onChange={e => updateSerie(ej.id, i, 'calorias', e.target.value)} placeholder="—"
                                    className="w-full bg-[#FFFFFF] border border-black/10 rounded-xl py-3 text-sm text-[#1b201a] text-center font-bold placeholder-gray-700 focus:outline-none focus:border-[#FF6B57]/40" />
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${serie.ok ? 'text-[#E14E2C]' : 'text-[#6d7362]'}`}>Bloque {i + 1}</span>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => updateSerie(ej.id, i, 'ok', !serie.ok)}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                      ${serie.ok ? 'bg-[#FF6B57] text-white scale-110' : 'bg-[#FFFFFF] border border-white/15 text-[#6d7362]'}`}>✓</button>
                                  {(registros[ej.id] || []).length > 1 && (
                                    <button
                                      onClick={() => eliminarSerie(ej.id, i)}
                                      className="w-9 h-9 flex items-center justify-center rounded-full bg-[#D85A30]/10 text-[#D85A30] active:bg-[#D85A30]/20 transition-colors">
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
                              <div key={h} className="text-[9px] text-[#7c8271] uppercase text-center">{h}</div>
                            ))}
                          </div>
                          {(registros[ej.id] || []).map((serie, i) => (
                            <div key={i} className="grid grid-cols-[1.5rem_1fr_1fr_2.25rem_2.25rem] gap-2 mb-2 items-center">
                              <div className={`text-xs font-bold text-center ${serie.ok ? 'text-[#E14E2C]' : 'text-[#6d7362]'}`}>{i + 1}</div>
                              <input type="text" value={serie.reps} onChange={e => updateSerie(ej.id, i, 'reps', e.target.value)}
                                className={`w-full min-w-0 bg-[#FFFFFF] border rounded-xl py-3 text-sm text-[#1b201a] text-center font-bold focus:outline-none transition-colors
                                  ${serie.ok ? 'border-[#FF6B57]/30 bg-[#FF6B57]/5' : 'border-black/10'}`} />
                              <input type="number" min="0" step="0.5" value={serie.peso} onChange={e => updateSerie(ej.id, i, 'peso', e.target.value)} placeholder="—"
                                className={`w-full min-w-0 bg-[#FFFFFF] border rounded-xl py-3 text-sm text-[#1b201a] text-center font-bold placeholder-gray-700 focus:outline-none transition-colors
                                  ${serie.ok ? 'border-[#FF6B57]/30 bg-[#FF6B57]/5' : 'border-black/10'}`} />
                              <button onClick={() => updateSerie(ej.id, i, 'ok', !serie.ok)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                  ${serie.ok ? 'bg-[#FF6B57] text-white scale-110' : 'bg-[#FFFFFF] border border-white/15 text-[#6d7362]'}`}>✓</button>
                              <button
                                onClick={() => eliminarSerie(ej.id, i)}
                                disabled={(registros[ej.id] || []).length <= 1}
                                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors
                                  ${(registros[ej.id] || []).length > 1
                                    ? 'bg-[#D85A30]/10 text-[#D85A30] active:bg-[#D85A30]/20'
                                    : 'opacity-20 text-[#6d7362] cursor-not-allowed'}`}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </>
                      )}

                      <button
                        onClick={() => agregarSerie(ej.id)}
                        className="mt-1 mb-4 flex items-center gap-1.5 text-xs text-[#6d7362] hover:text-[#E14E2C] transition-colors">
                        <span className="text-sm leading-none font-bold">+</span> Agregar serie
                      </button>

                      {/* Cronómetro de descanso integrado */}
                      <div className="border-t border-black/10 pt-4">
                        <div className="text-[10px] text-[#787f70] uppercase tracking-widest mb-2.5">⏱ Descanso</div>
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
                          className="flex-1 border border-black/10 text-[#5d6358] font-semibold py-3.5 rounded-xl text-sm disabled:opacity-25 hover:border-black/15 transition-all">
                          ‹ Anterior
                        </button>
                        {ejActivo < sesion.ejercicios.length - 1 ? (
                          <button
                            onClick={() => { setEjActivo(v => v + 1); setFotoAbierta(false) }}
                            className="flex-1 text-white font-bold py-3.5 rounded-xl text-sm"
                            style={{ background: 'linear-gradient(135deg, #FF6B57, #E14E2C)', boxShadow: '0 0 16px rgba(255,107,87,0.35)' }}>
                            Siguiente ›
                          </button>
                        ) : (
                          <button
                            onClick={guardarSesion}
                            disabled={guardandoSesion}
                            className="flex-1 text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-40"
                            style={{ background: 'linear-gradient(135deg, #FF6B57, #E14E2C)', boxShadow: '0 0 16px rgba(255,107,87,0.35)' }}>
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
              <div className="text-sm text-[#787f70] mb-2">
                {sesion.ejercicios.length} ejercicios · {sesion.dia}
              </div>
              <div className="text-xs text-[#7c8271] mb-10">
                {sesion.ejercicios.reduce((t, e) => t + (registros[e.id]?.filter(s => s.ok).length || 0), 0)} series completadas
              </div>
              <button onClick={() => setSesion(null)}
                className="w-full bg-[#FF6B57] text-white font-bold py-4 rounded-2xl text-base">
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
          <div className="bg-[#111] border border-black/10 rounded-t-3xl w-full max-w-lg flex flex-col">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-black/[0.06] rounded-full" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF6B57]/10 border border-[#FF6B57]/20 flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-[#E14E2C]" />
                </div>
                <div>
                  <div className="font-bold text-sm">Comparte tu rutina 💪</div>
                  <div className="text-xs text-[#787f70] mt-0.5">
                    {rutinas.find(r => r.id === modalCompartir)?.nombre}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setModalCompartir(null); setCodigoCompartir(null) }}
                className="text-[#787f70] hover:text-[#1b201a] text-xl leading-none">×</button>
            </div>

            <div className="px-5 pb-8">
              {generandoCodigo ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-8 h-8 border-2 border-[#FF6B57]/20 border-t-[#FF6B57] rounded-full animate-spin" />
                  <div className="text-[#787f70] text-sm">Generando tu código único...</div>
                </div>
              ) : codigoCompartir ? (
                <>
                  {/* Código con card dorada */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-[#E7F1E3] to-[#111] border border-[#FF6B57]/30 rounded-2xl px-5 py-7 text-center mb-4">
                    <div className="absolute -top-8 -right-8 w-28 h-28 bg-[#FF6B57]/8 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-[#FF6B57]/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="text-[9px] text-[#E14E2C]/50 uppercase tracking-[0.3em] mb-3 font-semibold">Código de tu rutina</div>
                    <div className="text-5xl font-black font-mono tracking-[0.12em] text-[#E14E2C] mb-6"
                      style={{ textShadow: '0 0 30px rgba(245,197,24,0.25)' }}>
                      {codigoCompartir}
                    </div>
                    <button
                      onClick={copiarCodigo}
                      className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        copiado
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-[#FF6B57] text-white hover:bg-[#E14E2C]'
                      }`}>
                      {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiado ? '¡Copiado!' : 'Copiar código'}
                    </button>
                  </div>

                  {/* Instrucciones */}
                  <div className="bg-[#FFFFFF] border border-black/[0.08] rounded-xl p-4 space-y-2.5">
                    <div className="text-xs font-semibold text-[#2b302a]">¿Cómo lo comparto?</div>
                    <div className="flex items-start gap-2 text-xs text-[#5d6358]">
                      <span className="text-[#E14E2C] font-bold shrink-0">1.</span>
                      <span>Copia el código y mándalo por WhatsApp, mensaje o como quieras.</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-[#5d6358]">
                      <span className="text-[#E14E2C] font-bold shrink-0">2.</span>
                      <span>Tu amigo/a abre PorotoFit → Rutinas → &ldquo;¿Te compartieron una rutina?&rdquo;</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-[#5d6358]">
                      <span className="text-[#E14E2C] font-bold shrink-0">3.</span>
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
          <div className="bg-[#111] border border-black/10 rounded-t-3xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-black/[0.06] rounded-full" />
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <div className="font-bold text-sm">{detalleSesionEj.nombre}</div>
              <button
                onClick={() => setDetalleSesionEj(null)}
                className="text-[#787f70] hover:text-[#1b201a] text-xl leading-none">×</button>
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
