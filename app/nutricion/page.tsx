'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { BrowserMultiFormatOneDReader, type IScannerControls } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const OBJETIVO = { cals: 2700, p: 180, c: 290, g: 90 }

type Alimento = {
  id: string
  nombre: string
  calorias_100g: number
  proteina_100g: number
  carbos_100g: number
  grasas_100g: number
}

// Alimento elegido desde la tabla local "alimentos" (entrada manual existente)
type AlimentoLocalSel = Alimento & { origen: 'local' }

// Alimento elegido desde Open Food Facts (búsqueda por nombre o código de barras)
type AlimentoOffSel = {
  origen: 'off'
  id: string
  codigoBarras: string | null
  nombre: string
  marca: string
  calorias_100g: number
  proteina_100g: number
  carbos_100g: number
  grasas_100g: number
  sinDatos: boolean
}

type Seleccion = AlimentoLocalSel | AlimentoOffSel

type OFFNutriments = {
  'energy-kcal_100g'?: number
  proteins_100g?: number
  carbohydrates_100g?: number
  fat_100g?: number
}

type OFFProductoRaw = {
  code?: string
  product_name?: string
  brands?: string
  nutriments?: OFFNutriments
}

function offProductoAAlimento(p: OFFProductoRaw, codigoFallback?: string): AlimentoOffSel {
  const n = p.nutriments || {}
  const cal = n['energy-kcal_100g']
  const prot = n.proteins_100g
  const carb = n.carbohydrates_100g
  const gra = n.fat_100g
  const sinDatos = cal == null && prot == null && carb == null && gra == null
  const codigo = p.code ?? codigoFallback ?? null
  return {
    origen: 'off',
    id: `off-${codigo ?? Date.now()}`,
    codigoBarras: codigo,
    nombre: p.product_name?.trim() || 'Producto sin nombre',
    marca: p.brands?.split(',')[0]?.trim() || '',
    calorias_100g: cal ?? 0,
    proteina_100g: prot ?? 0,
    carbos_100g: carb ?? 0,
    grasas_100g: gra ?? 0,
    sinDatos,
  }
}

type RegistroComida = {
  id: string
  tipo_comida: string
  cantidad_gramos: number
  calorias: number
  proteina: number
  carbos: number
  grasas: number
  fecha: string
  nombre_comida: string
  alimentos: { nombre: string } | null
}

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function sumarDias(fechaStr: string, dias: number): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  fecha.setDate(fecha.getDate() + dias)
  return toLocalDateStr(fecha)
}

function formatFechaLarga(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  const diaSemana = DIAS_SEMANA[fecha.getDay()]
  const mes = MESES[fecha.getMonth()]
  return `${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)} ${d} de ${mes} de ${y}`
}

const TIPOS = [
  { key: 'desayuno', label: 'Desayuno', icono: '🍳', hora: '8:30 AM' },
  { key: 'almuerzo', label: 'Almuerzo', icono: '🥗', hora: '1:00 PM' },
  { key: 'cena',     label: 'Cena',     icono: '🍽️', hora: '7:00 PM' },
  { key: 'snack',    label: 'Snack',    icono: '🍎', hora: '' },
]

const ORIGENES = [
  { key: 'local' as const,   label: 'Mi lista' },
  { key: 'off' as const,     label: 'Buscar online' },
  { key: 'barcode' as const, label: 'Código de barras' },
]

export default function NutricionPage() {
  const [registros, setRegistros] = useState<RegistroComida[]>([])
  const [abierto, setAbierto] = useState<string[]>(['desayuno', 'almuerzo'])
  const [modal, setModal] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [alimentos, setAlimentos] = useState<Alimento[]>([])
  const [seleccionado, setSeleccionado] = useState<Seleccion | null>(null)
  const [modo, setModo] = useState<'gramos' | 'unidades'>('gramos')
  const [gramos, setGramos] = useState('100')
  const [unidades, setUnidades] = useState('1')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardando, setErrorGuardando] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Búsqueda por nombre en Open Food Facts
  const [origenBusqueda, setOrigenBusqueda] = useState<'local' | 'off' | 'barcode'>('local')
  const [busquedaOff, setBusquedaOff] = useState('')
  const [resultadosOff, setResultadosOff] = useState<OFFProductoRaw[]>([])
  const [buscandoOff, setBuscandoOff] = useState(false)
  const [errorOff, setErrorOff] = useState<string | null>(null)
  const [codigoNoEncontrado, setCodigoNoEncontrado] = useState<string | null>(null)

  // Lector de código de barras (cámara)
  const [escaneando, setEscaneando] = useState(false)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)
  const [codigoDetectado, setCodigoDetectado] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)

  // Edición de un alimento ya registrado
  const [editando, setEditando] = useState<RegistroComida | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editGramos, setEditGramos] = useState('')
  const [editCalorias, setEditCalorias] = useState('')
  const [editProteina, setEditProteina] = useState('')
  const [editCarbos, setEditCarbos] = useState('')
  const [editGrasas, setEditGrasas] = useState('')
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null)

  const hoyStr = toLocalDateStr(new Date())
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyStr)
  const esHoy = fechaSeleccionada === hoyStr

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  const cargarRegistros = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('registro_comidas')
      .select('*, alimentos(nombre)')
      .eq('user_id', userId)
      .eq('fecha', fechaSeleccionada)
      .order('created_at', { ascending: true })
    if (data) setRegistros(data)
  }, [userId, fechaSeleccionada])

  useEffect(() => {
    cargarRegistros()
  }, [cargarRegistros])

  const irDiaAnterior = () => setFechaSeleccionada(f => sumarDias(f, -1))
  const irDiaSiguiente = () => setFechaSeleccionada(f => {
    const siguiente = sumarDias(f, 1)
    return siguiente > hoyStr ? f : siguiente
  })

  // Búsqueda local (tabla "alimentos") — entrada manual existente, sin cambios
  useEffect(() => {
    if (busqueda.length < 2) { setAlimentos([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('alimentos')
        .select('id, nombre, calorias_100g, proteina_100g, carbos_100g, grasas_100g')
        .ilike('nombre', `%${busqueda}%`)
        .limit(10)
      if (data) setAlimentos(data)
    }, 300)
    return () => clearTimeout(timer)
  }, [busqueda])

  // Búsqueda por nombre en Open Food Facts, vía nuestra ruta API interna (evita CORS y el User-Agent bloqueado)
  useEffect(() => {
    if (origenBusqueda !== 'off' || busquedaOff.trim().length < 2) { setResultadosOff([]); return }
    const timer = setTimeout(async () => {
      setBuscandoOff(true)
      setErrorOff(null)
      try {
        const res = await fetch(`/api/alimentos/buscar?q=${encodeURIComponent(busquedaOff.trim())}`)
        const data = await res.json()
        if (data?.error) {
          setErrorOff(data.error)
          setResultadosOff([])
        } else {
          setResultadosOff(Array.isArray(data?.products) ? data.products : [])
        }
      } catch {
        setErrorOff('No se pudo conectar con el servidor. Revisa tu conexión.')
        setResultadosOff([])
      } finally {
        setBuscandoOff(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [busquedaOff, origenBusqueda])

  // Detiene la cámara si el componente se desmonta con el escáner activo
  useEffect(() => {
    return () => { controlsRef.current?.stop() }
  }, [])

  const registrosPorTipo = (tipo: string) =>
    registros.filter(r => r.tipo_comida === tipo)

  const totalCals = registros.reduce((s, r) => s + (r.calorias || 0), 0)
  const totalP = registros.reduce((s, r) => s + (r.proteina || 0), 0)
  const totalC = registros.reduce((s, r) => s + (r.carbos || 0), 0)
  const totalG = registros.reduce((s, r) => s + (r.grasas || 0), 0)

  const toggleComida = (key: string) =>
    setAbierto(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])

  const detenerEscaneo = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    setEscaneando(false)
  }, [])

  const abrirModal = (tipo: string) => {
    setModal(tipo)
    setBusqueda('')
    setAlimentos([])
    setSeleccionado(null)
    setModo('gramos')
    setGramos('100')
    setUnidades('1')
    setErrorGuardando(null)
    setOrigenBusqueda('local')
    setBusquedaOff('')
    setResultadosOff([])
    setErrorOff(null)
    setCodigoNoEncontrado(null)
    setErrorCamara(null)
    setCodigoDetectado(null)
    detenerEscaneo()
  }

  const cerrarModal = () => {
    detenerEscaneo()
    setModal(null)
  }

  const cambiarOrigenBusqueda = (o: 'local' | 'off' | 'barcode') => {
    if (o !== 'barcode') detenerEscaneo()
    setOrigenBusqueda(o)
    setSeleccionado(null)
    setErrorOff(null)
    setErrorCamara(null)
    setCodigoDetectado(null)
    setCodigoNoEncontrado(null)
  }

  const buscarPorCodigoBarras = async (codigo: string) => {
    setBuscandoOff(true)
    setErrorOff(null)
    setCodigoNoEncontrado(null)
    try {
      const res = await fetch(`/api/alimentos/codigo?code=${encodeURIComponent(codigo)}`)
      const data = await res.json()
      if (data?.error) {
        setErrorOff(data.error)
        return
      }
      if (!data?.product || data.status === 0) {
        setErrorOff('Producto no encontrado. Agrégalo manualmente.')
        setCodigoNoEncontrado(codigo)
        return
      }
      setSeleccionado(offProductoAAlimento(data.product, codigo))
    } catch {
      setErrorOff('No se pudo conectar con el servidor. Revisa tu conexión.')
    } finally {
      setBuscandoOff(false)
    }
  }

  const agregarOffManual = () => {
    setSeleccionado({
      origen: 'off',
      id: `off-manual-${Date.now()}`,
      codigoBarras: codigoNoEncontrado,
      nombre: '',
      marca: '',
      calorias_100g: 0,
      proteina_100g: 0,
      carbos_100g: 0,
      grasas_100g: 0,
      sinDatos: true,
    })
    setErrorOff(null)
    setCodigoNoEncontrado(null)
  }

  const actualizarOffTexto = (campo: 'nombre' | 'marca', valor: string) =>
    setSeleccionado(prev => prev && prev.origen === 'off' ? { ...prev, [campo]: valor } : prev)

  const actualizarOffMacro = (
    campo: 'calorias_100g' | 'proteina_100g' | 'carbos_100g' | 'grasas_100g',
    valor: string
  ) =>
    setSeleccionado(prev => prev && prev.origen === 'off' ? { ...prev, [campo]: parseFloat(valor) || 0 } : prev)

  const iniciarEscaneo = async () => {
    setErrorCamara(null)
    setErrorOff(null)
    setCodigoDetectado(null)
    if (!videoRef.current) return
    setEscaneando(true)
    try {
      const hints = new Map<DecodeHintType, unknown>()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128,
      ])
      // Sin TRY_HARDER, OneDReader solo escanea ~15 filas centrales y nunca rota la imagen,
      // por lo que un código bien enfocado pero no perfectamente centrado nunca se detecta.
      hints.set(DecodeHintType.TRY_HARDER, true)
      const lector = new BrowserMultiFormatOneDReader(hints)
      const controls = await lector.decodeFromVideoDevice(undefined, videoRef.current, (resultado) => {
        if (resultado) {
          const codigo = resultado.getText()
          setCodigoDetectado(codigo)
          detenerEscaneo()
          buscarPorCodigoBarras(codigo)
        }
      })
      controlsRef.current = controls
    } catch {
      setErrorCamara('No se pudo acceder a la cámara. Revisa los permisos del navegador.')
      setEscaneando(false)
    }
  }

  const gramosPorUnidad = (nombre: string): number => {
    const n = nombre.toLowerCase()
    if (n.includes('huevo'))                    return 50
    if (n.includes('limon') || n.includes('limón')) return 30
    if (n.includes('banana') || n.includes('platano')) return 120
    if (n.includes('manzana'))                  return 150
    if (n.includes('naranja'))                  return 180
    return 100
  }

  const totalGramos =
    modo === 'gramos'
      ? parseFloat(gramos) || 0
      : (parseFloat(unidades) || 0) * (seleccionado ? gramosPorUnidad(seleccionado.nombre) : 100)

  const calcularMacros = (
    alimento: { calorias_100g: number; proteina_100g: number; carbos_100g: number; grasas_100g: number },
    g: number
  ) => ({
    calorias: Math.round((alimento.calorias_100g || 0) * g / 100),
    proteina: Math.round((alimento.proteina_100g || 0) * g / 100),
    carbos: Math.round((alimento.carbos_100g || 0) * g / 100),
    grasas: Math.round((alimento.grasas_100g || 0) * g / 100),
  })

  const guardarRegistro = async () => {
    if (!seleccionado || !modal) return

    if (seleccionado.origen === 'off' && !seleccionado.nombre.trim()) {
      setErrorGuardando('Ingresa un nombre para el alimento.')
      return
    }

    setGuardando(true)
    setErrorGuardando(null)

    // 1. Verificar sesión activa
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    console.log('[guardarRegistro] getSession →', sessionData?.session?.user?.id ?? null, sessionError)

    if (sessionError || !sessionData.session) {
      console.warn('[guardarRegistro] Sin sesión activa')
      setErrorGuardando('Tu sesión expiró. Vuelve a iniciar sesión para continuar.')
      setGuardando(false)
      return
    }

    // 2. Obtener user verificado por el servidor
    const { data: userData, error: userError } = await supabase.auth.getUser()
    console.log('[guardarRegistro] getUser →', userData?.user?.id ?? null, userError)

    if (userError || !userData.user) {
      console.warn('[guardarRegistro] getUser falló:', userError)
      setErrorGuardando('No se pudo verificar tu usuario. Vuelve a iniciar sesión.')
      setGuardando(false)
      return
    }

    const uid = userData.user.id
    console.log('[guardarRegistro] user_id a insertar:', uid)

    const g = totalGramos || 100
    const macros = calcularMacros(seleccionado, g)
    const nombreFinal = seleccionado.origen === 'off' && seleccionado.marca.trim()
      ? `${seleccionado.nombre.trim()} (${seleccionado.marca.trim()})`
      : seleccionado.nombre.trim()

    const payload = {
      user_id: uid,
      alimento_id: seleccionado.origen === 'local' ? seleccionado.id : null,
      nombre_comida: nombreFinal,
      tipo_comida: modal,
      cantidad_gramos: g,
      calorias: macros.calorias,
      proteina: macros.proteina,
      carbos: macros.carbos,
      grasas: macros.grasas,
      fecha: fechaSeleccionada,
    }
    console.log('[guardarRegistro] payload →', payload)

    const { error } = await supabase.from('registro_comidas').insert(payload)

    if (error) {
      console.error('[guardarRegistro] INSERT error →', error)
      setErrorGuardando(`Error al guardar: ${error.message}`)
      setGuardando(false)
      return
    }

    console.log('[guardarRegistro] INSERT ok')
    setGuardando(false)
    cerrarModal()
    cargarRegistros()
  }

  const eliminarRegistro = async (id: string) => {
    await supabase.from('registro_comidas').delete().eq('id', id)
    cargarRegistros()
  }

  const abrirEdicion = (item: RegistroComida) => {
    setEditando(item)
    setEditNombre(item.alimentos?.nombre ?? item.nombre_comida)
    setEditGramos(String(item.cantidad_gramos))
    setEditCalorias(String(item.calorias))
    setEditProteina(String(item.proteina))
    setEditCarbos(String(item.carbos))
    setEditGrasas(String(item.grasas))
    setErrorEdicion(null)
  }

  const cerrarEdicion = () => {
    setEditando(null)
    setErrorEdicion(null)
  }

  const guardarEdicion = async () => {
    if (!editando) return
    if (!editNombre.trim()) {
      setErrorEdicion('Ingresa un nombre para el alimento.')
      return
    }

    setGuardandoEdicion(true)
    setErrorEdicion(null)

    const payload = {
      alimento_id: null,
      nombre_comida: editNombre.trim(),
      cantidad_gramos: parseFloat(editGramos) || 0,
      calorias: parseFloat(editCalorias) || 0,
      proteina: parseFloat(editProteina) || 0,
      carbos: parseFloat(editCarbos) || 0,
      grasas: parseFloat(editGrasas) || 0,
    }

    const { error } = await supabase.from('registro_comidas').update(payload).eq('id', editando.id)

    if (error) {
      setErrorEdicion(`Error al guardar: ${error.message}`)
      setGuardandoEdicion(false)
      return
    }

    setGuardandoEdicion(false)
    cerrarEdicion()
    cargarRegistros()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white max-w-lg mx-auto">
      <div className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/10 px-5 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Fit<span className="text-[#F5C518]">Pro</span> JS</h1>
        <a href="/inicio" className="text-xs text-gray-400">← Inicio</a>
      </div>

      <div className="p-5">
        <h2 className="text-xl font-bold mb-4">Registro <span className="text-[#F5C518]">Nutricional</span></h2>

        {/* NAVEGACIÓN DE FECHA */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <button
            onClick={irDiaAnterior}
            aria-label="Día anterior"
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-[#1a1a1a] border border-white/10 text-gray-300 hover:text-[#F5C518] hover:border-[#F5C518]/40 transition-colors">
            ◄
          </button>
          <span className="text-sm font-semibold text-center px-1">
            {esHoy ? `Hoy · ${formatFechaLarga(fechaSeleccionada)}` : formatFechaLarga(fechaSeleccionada)}
          </span>
          <button
            onClick={irDiaSiguiente}
            disabled={esHoy}
            aria-label="Día siguiente"
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-[#1a1a1a] border border-white/10 text-gray-300 hover:text-[#F5C518] hover:border-[#F5C518]/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-300 disabled:hover:border-white/10">
            ►
          </button>
        </div>

        {/* RESUMEN DEL DÍA */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{esHoy ? 'Calorías hoy' : 'Calorías'}</div>
              <div className="text-3xl font-black">{totalCals} <span className="text-sm text-gray-500 font-normal">/ {OBJETIVO.cals}</span></div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${totalCals > OBJETIVO.cals ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                {totalCals > OBJETIVO.cals ? '+' : '–'}{Math.abs(OBJETIVO.cals - totalCals)}
              </div>
              <div className="text-xs text-gray-500">{totalCals > OBJETIVO.cals ? 'exceso' : 'déficit'}</div>
            </div>
          </div>
          <div className="h-2 bg-[#222] rounded-full overflow-hidden mb-4">
            <div className="h-full bg-[#F5C518] rounded-full transition-all"
              style={{ width: `${Math.min((totalCals / OBJETIVO.cals) * 100, 100)}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { lbl: 'Proteína', val: totalP, obj: OBJETIVO.p, color: '#3B82F6' },
              { lbl: 'Carbos',   val: totalC, obj: OBJETIVO.c, color: '#22C55E' },
              { lbl: 'Grasas',   val: totalG, obj: OBJETIVO.g, color: '#EF4444' },
            ].map(({ lbl, val, obj, color }) => (
              <div key={lbl}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{lbl}</span>
                  <span className="font-bold" style={{ color }}>{val}g</span>
                </div>
                <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min((val / obj) * 100, 100)}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COMIDAS */}
        {TIPOS.map(({ key, label, icono, hora }) => {
          const items = registrosPorTipo(key)
          const calsTipo = items.reduce((s, r) => s + (r.calorias || 0), 0)
          return (
            <div key={key} className="bg-[#1a1a1a] border border-white/10 rounded-xl mb-3 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => toggleComida(key)}>
                <div>
                  <div className="font-semibold text-sm">{icono} {label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {items.length > 0 ? `${items.length} alimentos · ${hora}` : 'Sin registrar'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[#F5C518]">{calsTipo} kcal</span>
                  <span className="text-gray-500">{abierto.includes(key) ? '▲' : '▼'}</span>
                </div>
              </div>

              {abierto.includes(key) && (
                <div className="border-t border-white/10">
                  {items.map((item) => (
                    <div key={item.id} className="px-4 py-3 border-b border-white/5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{item.alimentos?.nombre ?? item.nombre_comida}</div>
                          <div className="text-xs text-gray-500">{item.cantidad_gramos}g</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-sm font-bold text-[#F5C518]">{item.calorias} kcal</div>
                          <button onClick={() => abrirEdicion(item)} className="text-gray-600 hover:text-[#F5C518] text-sm leading-none">✎</button>
                          <button onClick={() => eliminarRegistro(item.id)} className="text-gray-600 hover:text-red-400 text-lg leading-none">×</button>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-1.5">
                        <span className="text-xs">
                          <span className="text-blue-400 font-medium">Proteína</span>
                          <span className="text-gray-300 ml-1">{item.proteina}g</span>
                        </span>
                        <span className="text-xs">
                          <span className="text-amber-400 font-medium">Carbos</span>
                          <span className="text-gray-300 ml-1">{item.carbos}g</span>
                        </span>
                        <span className="text-xs">
                          <span className="text-rose-400 font-medium">Grasas</span>
                          <span className="text-gray-300 ml-1">{item.grasas}g</span>
                        </span>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => abrirModal(key)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-[#3B82F6] text-sm hover:bg-white/5 transition-colors">
                    <span>＋</span> Añadir alimento
                  </button>
                </div>
              )}
            </div>
          )
        })}

      </div>

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg p-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Añadir alimento</h3>
              <button onClick={cerrarModal} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>

            {/* Selector de forma de búsqueda */}
            <div className="flex gap-2 mb-3">
              {ORIGENES.map(o => (
                <button
                  key={o.key}
                  onClick={() => cambiarOrigenBusqueda(o.key)}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-semibold transition-colors ${
                    origenBusqueda === o.key
                      ? 'bg-[#F5C518] text-black'
                      : 'bg-[#111] text-gray-400 border border-white/10'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>

            {/* ── TAB: Mi lista (entrada manual existente, sin cambios) ── */}
            {origenBusqueda === 'local' && !seleccionado && (
              <>
                <input
                  type="text"
                  placeholder="Buscar alimento..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[#F5C518]/50 mb-3"
                  autoFocus
                />

                {alimentos.length > 0 && (
                  <div className="max-h-48 overflow-y-auto mb-3 rounded-xl border border-white/10 divide-y divide-white/5">
                    {alimentos.map(a => (
                      <button key={a.id} onClick={() => setSeleccionado({ ...a, origen: 'local' })}
                        className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors">
                        <div className="text-sm font-medium">{a.nombre}</div>
                        <div className="text-xs text-gray-500">{a.calorias_100g} kcal · P{a.proteina_100g} · C{a.carbos_100g} · G{a.grasas_100g} (por 100g)</div>
                      </button>
                    ))}
                  </div>
                )}

                {busqueda.length >= 2 && alimentos.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-4 mb-3">No se encontraron alimentos</div>
                )}
              </>
            )}

            {/* ── TAB: Buscar online (Open Food Facts por nombre) ── */}
            {origenBusqueda === 'off' && !seleccionado && (
              <>
                <input
                  type="text"
                  placeholder="Ej: galletas oreo, manzana, pechuga de pollo..."
                  value={busquedaOff}
                  onChange={e => setBusquedaOff(e.target.value)}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[#F5C518]/50 mb-3"
                  autoFocus
                />

                {buscandoOff && (
                  <div className="text-center text-gray-500 text-sm py-4 mb-3">Buscando en Open Food Facts...</div>
                )}

                {errorOff && (
                  <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                    {errorOff}
                  </div>
                )}

                {!buscandoOff && resultadosOff.length > 0 && (
                  <div className="max-h-56 overflow-y-auto mb-3 rounded-xl border border-white/10 divide-y divide-white/5">
                    {resultadosOff.map((p, i) => {
                      const a = offProductoAAlimento(p)
                      return (
                        <button key={`${a.codigoBarras ?? 'sc'}-${i}`} onClick={() => setSeleccionado(a)}
                          className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors">
                          <div className="text-sm font-medium">{a.nombre}</div>
                          <div className="text-xs text-gray-500">
                            {a.marca && <span>{a.marca} · </span>}
                            {a.sinDatos
                              ? 'sin datos nutricionales'
                              : `${Math.round(a.calorias_100g)} kcal · P${a.proteina_100g} · C${a.carbos_100g} · G${a.grasas_100g} (por 100g)`}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {!buscandoOff && !errorOff && busquedaOff.trim().length >= 2 && resultadosOff.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-4 mb-3">
                    No se encontraron alimentos con información nutricional. Intenta con otro nombre o agrégalo manualmente.
                  </div>
                )}
              </>
            )}

            {/* ── TAB: Código de barras (cámara) ── */}
            {origenBusqueda === 'barcode' && !seleccionado && (
              <div className="mb-3">
                <div className={`rounded-xl overflow-hidden border border-white/10 relative bg-black transition-all ${escaneando ? 'h-56 mb-2' : 'h-0'}`}>
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                  {escaneando && (
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-black/60 flex justify-center">
                      <button onClick={detenerEscaneo} className="text-xs text-white border border-white/30 rounded-lg px-3 py-1.5">
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>

                {!escaneando && (
                  <button
                    onClick={iniciarEscaneo}
                    className="w-full border border-dashed border-white/20 rounded-xl py-4 text-sm text-gray-300 hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors font-medium">
                    📷 Escanear código de barras
                  </button>
                )}

                {codigoDetectado && (
                  <div className="mb-2 px-3 py-2 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl text-xs text-[#22C55E]">
                    ✓ Código detectado: {codigoDetectado}
                  </div>
                )}

                {buscandoOff && (
                  <div className="text-center text-gray-500 text-sm py-3">Consultando Open Food Facts...</div>
                )}

                {errorCamara && (
                  <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                    {errorCamara}
                  </div>
                )}

                {errorOff && (
                  <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                    {errorOff}
                    {codigoNoEncontrado && (
                      <button onClick={agregarOffManual} className="block mt-1.5 text-[#F5C518] underline">
                        + Agregar manualmente
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Alimento local seleccionado (sin cambios) ── */}
            {seleccionado && seleccionado.origen === 'local' && (
              <div className="mb-4">
                <div className="bg-[#111] border border-[#F5C518]/30 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{seleccionado.nombre}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {calcularMacros(seleccionado, totalGramos || 100).calorias} kcal ·
                        P{calcularMacros(seleccionado, totalGramos || 100).proteina} ·
                        C{calcularMacros(seleccionado, totalGramos || 100).carbos} ·
                        G{calcularMacros(seleccionado, totalGramos || 100).grasas}
                        {totalGramos > 0 && <span className="ml-1">· {totalGramos}g total</span>}
                      </div>
                    </div>
                    <button onClick={() => setSeleccionado(null)} className="text-gray-500 text-sm">cambiar</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Producto de Open Food Facts seleccionado (editable) ── */}
            {seleccionado && seleccionado.origen === 'off' && (
              <div className="mb-4">
                {seleccionado.sinDatos && (
                  <div className="mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400">
                    ⚠️ Sin datos nutricionales de Open Food Facts. Complétalos manualmente.
                  </div>
                )}
                <div className="bg-[#111] border border-[#F5C518]/30 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gray-500">
                      {seleccionado.codigoBarras ? `Código: ${seleccionado.codigoBarras}` : 'Open Food Facts'}
                    </span>
                    <button onClick={() => setSeleccionado(null)} className="text-gray-500 text-sm">cambiar</button>
                  </div>
                  <input
                    type="text"
                    placeholder="Nombre del alimento"
                    value={seleccionado.nombre}
                    onChange={e => actualizarOffTexto('nombre', e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-[#F5C518]/50 mb-2"
                  />
                  <input
                    type="text"
                    placeholder="Marca (opcional)"
                    value={seleccionado.marca}
                    onChange={e => actualizarOffTexto('marca', e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-[#F5C518]/50 mb-2"
                  />
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {([
                      { campo: 'calorias_100g' as const, lbl: 'Kcal' },
                      { campo: 'proteina_100g' as const, lbl: 'Prot' },
                      { campo: 'carbos_100g'   as const, lbl: 'Carb' },
                      { campo: 'grasas_100g'   as const, lbl: 'Gras' },
                    ]).map(({ campo, lbl }) => (
                      <div key={campo}>
                        <label className="text-[9px] text-gray-500 block mb-1">{lbl} /100g</label>
                        <input
                          type="number"
                          value={seleccionado[campo]}
                          onChange={e => actualizarOffMacro(campo, e.target.value)}
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-1.5 py-1.5 text-xs text-white text-center outline-none focus:border-[#F5C518]/50"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500">
                    Total con {totalGramos || 100}g: {calcularMacros(seleccionado, totalGramos || 100).calorias} kcal ·
                    P{calcularMacros(seleccionado, totalGramos || 100).proteina} ·
                    C{calcularMacros(seleccionado, totalGramos || 100).carbos} ·
                    G{calcularMacros(seleccionado, totalGramos || 100).grasas}
                  </div>
                </div>
              </div>
            )}

            {/* ── Cantidad (compartido por las 3 formas de búsqueda) ── */}
            {seleccionado && (
              <div className="mb-4">
                <div className="flex gap-2 mb-3">
                  {(['gramos', 'unidades'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setModo(m)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        modo === m
                          ? 'bg-[#F5C518] text-black'
                          : 'bg-[#111] text-gray-400 border border-white/10'
                      }`}>
                      {m === 'gramos' ? 'Por gramos' : 'Por unidades'}
                    </button>
                  ))}
                </div>

                {modo === 'gramos' ? (
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-400 whitespace-nowrap">Cantidad (g)</label>
                    <input
                      type="number"
                      value={gramos}
                      onChange={e => setGramos(e.target.value)}
                      className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-[#F5C518]/50"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-400 whitespace-nowrap">Unidades</label>
                      <input
                        type="number"
                        value={unidades}
                        onChange={e => setUnidades(e.target.value)}
                        className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-[#F5C518]/50"
                      />
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1.5 pl-1">
                      1 unidad ≈ {seleccionado ? gramosPorUnidad(seleccionado.nombre) : 100}g
                      · total: {totalGramos}g
                    </p>
                  </div>
                )}
              </div>
            )}

            {errorGuardando && (
              <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                {errorGuardando}
              </div>
            )}

            <button
              onClick={guardarRegistro}
              disabled={!seleccionado || guardando}
              className="w-full bg-[#F5C518] text-black font-bold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f0bb00] transition-colors">
              {guardando ? 'Guardando...' : 'Añadir alimento'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN */}
      {editando && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg p-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Editar alimento</h3>
              <button onClick={cerrarEdicion} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>

            <div className="mb-3">
              <label className="text-[11px] text-gray-500 block mb-1">Nombre</label>
              <input
                type="text"
                value={editNombre}
                onChange={e => setEditNombre(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#F5C518]/50"
                autoFocus
              />
            </div>

            <div className="mb-3">
              <label className="text-[11px] text-gray-500 block mb-1">Cantidad (g)</label>
              <input
                type="number"
                value={editGramos}
                onChange={e => setEditGramos(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#F5C518]/50"
              />
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {([
                { lbl: 'Kcal', val: editCalorias, set: setEditCalorias },
                { lbl: 'Prot', val: editProteina, set: setEditProteina },
                { lbl: 'Carb', val: editCarbos,   set: setEditCarbos },
                { lbl: 'Gras', val: editGrasas,   set: setEditGrasas },
              ]).map(({ lbl, val, set }) => (
                <div key={lbl}>
                  <label className="text-[9px] text-gray-500 block mb-1">{lbl}</label>
                  <input
                    type="number"
                    value={val}
                    onChange={e => set(e.target.value)}
                    className="w-full bg-[#111] border border-white/10 rounded-lg px-1.5 py-1.5 text-xs text-white text-center outline-none focus:border-[#F5C518]/50"
                  />
                </div>
              ))}
            </div>

            {errorEdicion && (
              <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                {errorEdicion}
              </div>
            )}

            <button
              onClick={guardarEdicion}
              disabled={guardandoEdicion}
              className="w-full bg-[#F5C518] text-black font-bold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f0bb00] transition-colors">
              {guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
