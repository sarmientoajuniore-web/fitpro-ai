'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BrowserMultiFormatReader } from '@zxing/browser'

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

const PESTANAS = [
  { key: 'local'   as const, label: 'Mi lista'         },
  { key: 'off'     as const, label: 'Buscar online'    },
  { key: 'barcode' as const, label: 'Código de barras' },
]

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
    <div className="h-1.5 bg-black/[0.05] rounded-full overflow-hidden">
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
  const [errorBusqueda,  setErrorBusqueda]  = useState<string | null>(null)
  const [alimentoSel,    setAlimentoSel]    = useState<AlimentoBusqueda | null>(null)
  const [gramosInput,    setGramosInput]    = useState('100')
  const [modoRegistro,   setModoRegistro]   = useState<'gramos' | 'unidades'>('gramos')
  const [unidadesInput,  setUnidadesInput]  = useState('1')
  const [pesoPorcion,    setPesoPorcion]    = useState('100')
  const [guardandoAlim,  setGuardandoAlim]  = useState(false)
  const busquedaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Pestañas del buscador ─────────────────────────────────────────────────
  const [origenBusqueda, setOrigenBusqueda] = useState<'local' | 'off' | 'barcode'>('local')
  const [busquedaLocal,   setBusquedaLocal]   = useState('')
  const [resultadosLocal, setResultadosLocal] = useState<AlimentoBusqueda[]>([])
  const [buscandoLocal,   setBuscandoLocal]   = useState(false)
  const [buscandoBarcode, setBuscandoBarcode] = useState(false)
  const [errorBarcode,    setErrorBarcode]    = useState<string | null>(null)
  const [scanKey,         setScanKey]         = useState(0)
  const busquedaLocalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoRef   = useRef<HTMLVideoElement | null>(null)
  const scannerRef = useRef<{ stop: () => void } | null>(null)

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

  // ── Búsqueda de alimentos vía Open Food Facts (debounced 500 ms) ────────────
  useEffect(() => {
    if (busquedaTimerRef.current) clearTimeout(busquedaTimerRef.current)
    if (!formAbierto || alimentoSel || origenBusqueda !== 'off' || busquedaAlim.trim().length < 2) {
      setResultadosAlim([])
      setBuscandoAlim(false)
      setErrorBusqueda(null)
      return
    }
    setBuscandoAlim(true)
    setErrorBusqueda(null)
    busquedaTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/alimentos/buscar?q=${encodeURIComponent(busquedaAlim.trim())}`)
        const json = await res.json()
        const productos: Array<{
          code: string | null
          product_name: string
          brands: string
          nutriments?: Record<string, number>
        }> = Array.isArray(json?.products) ? json.products : []

        const mapped: AlimentoBusqueda[] = productos.map((p, i) => ({
          id:            p.code ?? `off-${i}`,
          nombre:        p.product_name + (p.brands ? ` · ${p.brands}` : ''),
          calorias_100g: Math.round((p.nutriments?.['energy-kcal_100g'] ?? 0) * 10) / 10,
          proteina_100g: Math.round((p.nutriments?.['proteins_100g']       ?? 0) * 10) / 10,
          carbos_100g:   Math.round((p.nutriments?.['carbohydrates_100g']  ?? 0) * 10) / 10,
          grasas_100g:   Math.round((p.nutriments?.['fat_100g']            ?? 0) * 10) / 10,
        }))

        setResultadosAlim(mapped)
        if (mapped.length === 0) setErrorBusqueda(json?.error ?? null)
      } catch {
        setResultadosAlim([])
        setErrorBusqueda('No se pudo conectar con el buscador de alimentos.')
      } finally {
        setBuscandoAlim(false)
      }
    }, 500)
    return () => { if (busquedaTimerRef.current) clearTimeout(busquedaTimerRef.current) }
  }, [busquedaAlim, formAbierto, alimentoSel, origenBusqueda])

  // ── Búsqueda local en tabla "alimentos" (Supabase) ────────────────────────
  useEffect(() => {
    if (busquedaLocalTimerRef.current) clearTimeout(busquedaLocalTimerRef.current)
    if (!formAbierto || alimentoSel || origenBusqueda !== 'local' || busquedaLocal.trim().length < 2) {
      setResultadosLocal([])
      setBuscandoLocal(false)
      return
    }
    setBuscandoLocal(true)
    busquedaLocalTimerRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('alimentos')
        .select('id, nombre, calorias_100g, proteina_100g, carbos_100g, grasas_100g')
        .ilike('nombre', `%${busquedaLocal.trim()}%`)
        .limit(15)
      setResultadosLocal(
        (data ?? []).map(a => ({
          id:            a.id,
          nombre:        a.nombre,
          calorias_100g: a.calorias_100g ?? 0,
          proteina_100g: a.proteina_100g ?? 0,
          carbos_100g:   a.carbos_100g   ?? 0,
          grasas_100g:   a.grasas_100g   ?? 0,
        }))
      )
      setBuscandoLocal(false)
    }, 300)
    return () => { if (busquedaLocalTimerRef.current) clearTimeout(busquedaLocalTimerRef.current) }
  }, [busquedaLocal, formAbierto, alimentoSel, origenBusqueda])

  // ── Escáner de código de barras (ZXing) ───────────────────────────────────
  useEffect(() => {
    const deberiaEscanear = origenBusqueda === 'barcode' && formAbierto && !alimentoSel
    if (!deberiaEscanear) {
      scannerRef.current?.stop()
      scannerRef.current = null
      return
    }

    let activo = true
    ;(async () => {
      if (!videoRef.current) return
      try {
        const codeReader = new BrowserMultiFormatReader()
        const controls = await codeReader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current,
          async (result) => {
            if (!result || !activo) return
            activo = false
            scannerRef.current?.stop()
            scannerRef.current = null

            const codigo = result.getText()
            setBuscandoBarcode(true)
            setErrorBarcode(null)
            try {
              const res  = await fetch(`/api/alimentos/codigo?code=${encodeURIComponent(codigo)}`)
              const json = await res.json() as {
                status: number
                product?: { code?: string; product_name?: string; brands?: string; nutriments?: Record<string, number> }
              }
              if (json.status === 1 && json.product?.product_name) {
                const p = json.product
                const n = p.nutriments ?? {}
                setAlimentoSel({
                  id:            p.code ?? codigo,
                  nombre:        p.product_name + (p.brands ? ` · ${p.brands}` : ''),
                  calorias_100g: Math.round((n['energy-kcal_100g'] ?? 0) * 10) / 10,
                  proteina_100g: Math.round((n.proteins_100g       ?? 0) * 10) / 10,
                  carbos_100g:   Math.round((n.carbohydrates_100g  ?? 0) * 10) / 10,
                  grasas_100g:   Math.round((n.fat_100g            ?? 0) * 10) / 10,
                })
                setPesoPorcion('100')
              } else {
                setErrorBarcode('Producto no encontrado, búscalo por nombre.')
              }
            } catch {
              setErrorBarcode('No se pudo consultar el producto.')
            } finally {
              setBuscandoBarcode(false)
            }
          }
        )
        if (activo) scannerRef.current = controls
        else controls.stop()
      } catch {
        if (activo) setErrorBarcode('No se pudo acceder a la cámara. Verifica los permisos.')
      }
    })()

    return () => {
      activo = false
      scannerRef.current?.stop()
      scannerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origenBusqueda, formAbierto, alimentoSel, scanKey])

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
    const esUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(alimentoSel.id)
    setGuardandoAlim(true)
    const { error: errComida } = await supabase.from('registro_comidas').insert({
      user_id:           userId,
      alimento_id:       esUUID ? alimentoSel.id : null,
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
    scannerRef.current?.stop()
    scannerRef.current = null
    setFormAbierto(false)
    setAlimentoSel(null)
    setBusquedaAlim('')
    setBusquedaLocal('')
    setResultadosAlim([])
    setResultadosLocal([])
    setGramosInput('100')
    setModoRegistro('gramos')
    setUnidadesInput('1')
    setPesoPorcion('100')
    setOrigenBusqueda('local')
    setErrorBarcode(null)
    setBuscandoBarcode(false)
    setScanKey(0)
  }

  const seleccionarAlimento = (a: AlimentoBusqueda) => {
    setAlimentoSel(a)
    setPesoPorcion(String(gramosPorUnidad(a.nombre)))
    setResultadosAlim([])
    setResultadosLocal([])
  }

  const cambiarPestana = (nueva: 'local' | 'off' | 'barcode') => {
    setOrigenBusqueda(nueva)
    setAlimentoSel(null)
    setBusquedaAlim('')
    setBusquedaLocal('')
    setResultadosAlim([])
    setResultadosLocal([])
    setErrorBarcode(null)
    setErrorBusqueda(null)
    setBuscandoBarcode(false)
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
      <div className="min-h-screen bg-[#F4F6F1] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#22C55E] border-t-transparent animate-spin" />
      </div>
    )
  }

  // ── Valores de presentación ───────────────────────────────────────────────
  const _n       = perfil?.nombre_completo?.trim().split(/\s+/)[0] ?? ''
  const nombre   = _n ? _n[0].toUpperCase() + _n.slice(1).toLowerCase() : ''
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
  const polloEtapa     = pctCal < 20 ? 1 : pctCal < 40 ? 2 : pctCal < 65 ? 3 : pctCal < 90 ? 4 : 5
  const tdeeNum        = perfil?.tdee ?? 0
  const estadoLabel    = metaCal < tdeeNum - 50 ? 'DÉFICIT' : metaCal > tdeeNum + 50 ? 'SUPERÁVIT' : 'MANTENIM.'
  const estadoBadgeClass = metaCal < tdeeNum - 50
    ? 'bg-red-600 text-white'
    : metaCal > tdeeNum + 50
    ? 'bg-[#15803D] text-white'
    : 'bg-blue-600 text-white'

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
    <div className="min-h-screen bg-[#F4F6F1] text-[#1b201a]">
      <div className="max-w-lg mx-auto p-5">

        {/* HEADER */}
        <div className="flex items-center justify-between py-4 mb-4 border-b border-black/10">
          <h1 className="text-xl font-bold">Fit<span className="text-[#15803D]">Pro</span></h1>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            className="text-xs text-[#5d6358] hover:text-[#1b201a] transition-colors">
            Cerrar sesión
          </button>
        </div>

        {/* MÓDULO UNIFICADO: SALUDO + NUTRICIÓN */}
        <div className="mb-4">
          <div
            className="rounded-2xl border border-[#22C55E]/40"
            style={{ background: 'linear-gradient(135deg, #E9F0E6 0%, #EDF2EA 100%)', boxShadow: '0 0 28px rgba(34,197,94,0.13)' }}>

            {/* ── Saludo ── */}
            <div className="px-5 pt-5 pb-2">
              <h2 className="text-2xl font-bold text-[#15803D]">¡Hola, {nombre}!</h2>
              <p className="text-[11px] text-[#15803D]/45 mt-0.5 uppercase tracking-widest">Nutrición</p>
            </div>

            <div className="px-5 pb-5">

              {/* ── Navegador de fecha ── */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={irDiaAnterior}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-black/[0.03] hover:bg-black/[0.05] text-[#5d6358] text-xs transition-colors">
                  ◄
                </button>
                <span className="text-sm font-semibold text-[#3b4137] tracking-wide">
                  {labelFecha(fechaSeleccionada)}
                </span>
                <button
                  onClick={irDiaSiguiente}
                  disabled={esHoy}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-black/[0.03] hover:bg-black/[0.05] text-[#5d6358] disabled:opacity-25 disabled:cursor-not-allowed text-xs transition-colors">
                  ►
                </button>
              </div>

              {/* ── Hero: caricatura grande + kcal restantes ── */}
              <div className="flex flex-col items-center text-center mb-4">
                <img
                  src={imagenComida} alt=""
                  className="pointer-events-none select-none h-40 w-auto"
                />
                <div className={`text-4xl font-black tabular-nums mt-1 ${calExcedido ? 'text-red-500' : 'text-[#15803D]'}`}>
                  {Math.abs(calRestantes).toLocaleString()}
                </div>
                <div className="text-xs text-[#6d7362] mt-0.5">
                  {calExcedido ? 'kcal de más hoy' : 'kcal que te quedan hoy'}
                </div>
                <div className="w-full mt-3">
                  <div className="h-2.5 rounded-full bg-black/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((consumo.calorias / (metaCal || 1)) * 100, 100)}%`,
                        background: calExcedido ? '#EF4444' : 'linear-gradient(90deg,#16A34A,#22C55E)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#6d7362] mt-1.5">
                    <span>{Math.round(consumo.calorias).toLocaleString()} consumidas</span>
                    <span>Meta {kcal} kcal</span>
                  </div>
                </div>
              </div>

              {/* ── Ver macros (detalle) ── */}
              <details className="mb-4 group">
                <summary className="flex items-center justify-center gap-1.5 cursor-pointer list-none py-2 rounded-xl bg-black/[0.03] hover:bg-black/[0.05] text-xs font-semibold text-[#15803D] transition-colors select-none">
                  <span>Ver mis macros</span>
                  <span className="text-[9px] transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-black/[0.04] rounded-xl px-3 py-2.5">
                    <div className="text-[10px] text-[#6d7362] uppercase tracking-wide mb-0.5">Mantenimiento</div>
                    <div className="text-base font-bold text-[#1b201a]">{tdee} <span className="text-xs font-normal text-[#6d7362]">kcal</span></div>
                  </div>
                  <div className="bg-black/[0.04] rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] text-[#6d7362] uppercase tracking-wide">Meta</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${estadoBadgeClass}`}>{estadoLabel}</span>
                    </div>
                    <div className="text-base font-bold text-[#15803D]">{kcal} <span className="text-xs font-normal text-[#6d7362]">kcal</span></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {macros.map(({ lbl, con, meta, color, text }) => (
                    <div key={lbl} className="bg-black/[0.04] rounded-xl px-2.5 py-2.5">
                      <div className="text-[10px] text-[#6d7362] mb-1 truncate">{lbl}</div>
                      <div className={`text-xs font-bold ${con > meta ? 'text-red-400' : text}`}>
                        {con} / {meta}g
                      </div>
                      <div className="mt-1.5">
                        <Barra consumido={con} meta={meta} color={color} />
                      </div>
                    </div>
                  ))}
                </div>
              </details>

              {/* ── Lista de alimentos del día (acordeón) ── */}
              {cargandoRegistros && (
                <div className="flex justify-center py-3">
                  <div className="w-4 h-4 rounded-full border border-black/15 border-t-white/60 animate-spin" />
                </div>
              )}

              {!cargandoRegistros && registros.length > 0 && (
                <div className="mb-3">
                  <button
                    onClick={() => setListaAbierta(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/4 border border-[#22C55E]/15 hover:border-[#22C55E]/30 transition-colors">
                    <span className="text-xs font-semibold text-[#15803D]/70">
                      Ver lo que comí {esHoy ? 'hoy' : 'ese día'} ({registros.length})
                    </span>
                    <span className="text-[10px] text-[#15803D]/50 ml-2 select-none">
                      {listaAbierta ? '▲' : '▼'}
                    </span>
                  </button>
                  {listaAbierta && (
                    <div className="flex flex-col gap-1.5 mt-2">
                      {registros.map(r => (
                        <div key={r.id} className="flex items-center gap-2 px-3 py-2.5 bg-white/4 rounded-xl border border-black/[0.06]">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-[#1b201a] truncate">{r.nombre_comida}</div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-[#6d7362]">{formatCantidad(r)}</span>
                              <span className="text-[10px] font-bold text-[#15803D]/90">{r.calorias} kcal</span>
                              <span className="text-[10px] text-blue-400/70">P{r.proteina}</span>
                              <span className="text-[10px] text-[#FF9D42]/50">C{r.carbos}</span>
                              <span className="text-[10px] text-orange-400/50">G{r.grasas}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => eliminarAlimento(r.id)}
                            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg bg-black/[0.03] hover:bg-red-500/20 text-[#6d7362] hover:text-red-400 text-xs transition-colors">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!cargandoRegistros && registros.length === 0 && !formAbierto && (
                <p className="text-xs text-[#7c8271] text-center py-1 mb-2">
                  Sin alimentos registrados {esHoy ? 'hoy' : 'ese día'}.
                </p>
              )}

              {/* ── Formulario de búsqueda / agregar alimento ── */}
              {formAbierto ? (
                <div className="border-t border-[#22C55E]/10 pt-3">

                  {/* Título del formulario */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🍽️</span>
                    <h3 className="text-sm font-bold text-[#1b201a] flex-1">¿Qué comiste?</h3>
                    <button
                      onClick={cerrarFormulario}
                      className="w-6 h-6 flex items-center justify-center rounded-lg bg-black/[0.03] hover:bg-black/[0.05] text-[#787f70] hover:text-[#1b201a] text-xs transition-colors">
                      ✕
                    </button>
                  </div>

                  {/* Estado A: buscando alimento (pestañas) */}
                  {!alimentoSel ? (
                    <>
                      {/* ── Selector de pestañas ── */}
                      <div className="flex gap-1 mb-3 bg-black/[0.04] p-1 rounded-xl">
                        {PESTANAS.map(({ key, label }) => (
                          <button
                            key={key}
                            onClick={() => cambiarPestana(key)}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all leading-tight ${
                              origenBusqueda === key
                                ? key === 'local'
                                  ? 'bg-[#16A34A] text-white shadow-[0_0_8px_rgba(22,163,74,0.35)]'
                                  : 'bg-[#EA7A1C] text-[#1b201a] shadow-[0_0_8px_rgba(8,145,178,0.35)]'
                                : 'text-[#787f70] hover:text-[#3b4137]'
                            }`}>
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* ── Mi lista (Supabase) ── */}
                      {origenBusqueda === 'local' && (
                        <>
                          <div className="mb-2">
                            <input
                              type="text"
                              placeholder="Buscar en mi lista…"
                              value={busquedaLocal}
                              onChange={e => setBusquedaLocal(e.target.value)}
                              autoFocus
                              className="w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-sm text-[#1b201a] placeholder-[#9ba192] outline-none focus:border-[#16A34A]/50 focus:bg-white transition-all"
                            />
                          </div>
                          {buscandoLocal && (
                            <p className="text-xs text-[#6d7362] text-center py-2">Buscando…</p>
                          )}
                          {!buscandoLocal && busquedaLocal.trim().length >= 2 && resultadosLocal.length === 0 && (
                            <p className="text-xs text-[#6d7362] text-center py-2">
                              No encontrado en tu lista. Prueba &quot;Buscar online&quot;.
                            </p>
                          )}
                          {resultadosLocal.length > 0 && (
                            <div className="max-h-44 overflow-y-auto flex flex-col gap-1">
                              {resultadosLocal.map(a => (
                                <button
                                  key={a.id}
                                  onClick={() => seleccionarAlimento(a)}
                                  className="w-full text-left px-3 py-2.5 rounded-xl bg-white/4 hover:bg-[#16A34A]/10 border border-transparent hover:border-[#16A34A]/20 transition-all">
                                  <div className="text-xs font-semibold text-[#1b201a]">{a.nombre}</div>
                                  <div className="text-[10px] text-[#787f70] mt-0.5">
                                    <span className="text-[#15803D]/70">{a.calorias_100g} kcal</span>
                                    {' · '}
                                    <span className="text-blue-400/60">P{a.proteina_100g}</span>
                                    {' · '}
                                    <span className="text-[#15803D]/40">C{a.carbos_100g}</span>
                                    {' · '}
                                    <span className="text-orange-400/40">G{a.grasas_100g}</span>
                                    {' /100g'}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {/* ── Buscar online (Open Food Facts) ── */}
                      {origenBusqueda === 'off' && (
                        <>
                          <div className="mb-2">
                            <input
                              type="text"
                              placeholder="Buscar en internet…"
                              value={busquedaAlim}
                              onChange={e => setBusquedaAlim(e.target.value)}
                              autoFocus
                              className="w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-sm text-[#1b201a] placeholder-[#9ba192] outline-none focus:border-[#EA7A1C]/50 focus:bg-white transition-all"
                            />
                          </div>
                          {buscandoAlim && (
                            <p className="text-xs text-[#6d7362] text-center py-2">Buscando en internet…</p>
                          )}
                          {!buscandoAlim && busquedaAlim.trim().length >= 2 && resultadosAlim.length === 0 && (
                            <p className="text-xs text-[#6d7362] text-center py-2">
                              {errorBusqueda ?? `No se encontró "${busquedaAlim}"`}
                            </p>
                          )}
                          {resultadosAlim.length > 0 && (
                            <div className="max-h-44 overflow-y-auto flex flex-col gap-1">
                              {resultadosAlim.map(a => (
                                <button
                                  key={a.id}
                                  onClick={() => seleccionarAlimento(a)}
                                  className="w-full text-left px-3 py-2.5 rounded-xl bg-white/4 hover:bg-[#EA7A1C]/10 border border-transparent hover:border-[#EA7A1C]/20 transition-all">
                                  <div className="text-xs font-semibold text-[#1b201a]">{a.nombre}</div>
                                  <div className="text-[10px] text-[#787f70] mt-0.5">
                                    <span className="text-[#38B6FF]/80">{a.calorias_100g} kcal</span>
                                    {' · '}
                                    <span className="text-blue-400/60">P{a.proteina_100g}</span>
                                    {' · '}
                                    <span className="text-[#15803D]/40">C{a.carbos_100g}</span>
                                    {' · '}
                                    <span className="text-orange-400/40">G{a.grasas_100g}</span>
                                    {' /100g'}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {/* ── Código de barras (ZXing) ── */}
                      {origenBusqueda === 'barcode' && (
                        <div>
                          {buscandoBarcode ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-3">
                              <div className="w-6 h-6 rounded-full border-2 border-[#EA7A1C] border-t-transparent animate-spin" />
                              <p className="text-xs text-[#787f70]">Buscando producto…</p>
                            </div>
                          ) : errorBarcode ? (
                            <div className="flex flex-col items-center justify-center py-6 gap-3">
                              <p className="text-xs text-orange-400 text-center">{errorBarcode}</p>
                              <button
                                onClick={() => { setErrorBarcode(null); setScanKey(k => k + 1) }}
                                className="text-xs font-semibold text-[#EA7A1C] hover:text-[#38B6FF] border border-[#EA7A1C]/30 rounded-xl px-4 py-1.5 transition-colors">
                                Escanear de nuevo
                              </button>
                            </div>
                          ) : (
                            <div className="relative rounded-xl overflow-hidden bg-black/60" style={{ aspectRatio: '4/3' }}>
                              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                              <video
                                ref={videoRef}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="border-2 border-[#EA7A1C]/70 rounded-lg" style={{ width: '60%', height: '35%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
                              </div>
                              <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-[#1b201a]/50">
                                Apunta al código de barras
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    /* Estado B: alimento seleccionado → elegir cantidad */
                    <>
                      {/* Chip del alimento elegido */}
                      <div className="bg-gradient-to-r from-[#1a0d35] to-[#150a2a] border border-[#22C55E]/30 rounded-2xl px-4 py-3 mb-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm shrink-0">✅</span>
                            <span className="text-sm font-bold text-[#1b201a] truncate">{alimentoSel.nombre}</span>
                          </div>
                          <button
                            onClick={() => { setAlimentoSel(null); setBusquedaAlim('') }}
                            className="shrink-0 text-[10px] text-[#787f70] hover:text-[#15803D] border border-black/10 hover:border-[#22C55E]/30 rounded-lg px-2 py-0.5 transition-all">
                            cambiar
                          </button>
                        </div>
                        {preview && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-[#15803D]">{preview.calorias} kcal</span>
                            <span className="text-[#7c8271] text-xs">·</span>
                            <span className="text-xs font-semibold text-blue-400">P {preview.proteina}g</span>
                            <span className="text-xs font-semibold text-[#15803D]/70">C {preview.carbos}g</span>
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
                                ? 'bg-[#22C55E] text-white shadow-[0_0_12px_rgba(34,197,94,0.25)]'
                                : 'bg-black/[0.04] text-[#5d6358] border border-black/10 hover:border-black/15 hover:text-[#1b201a]'
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
                              className="w-full bg-white border border-black/10 rounded-xl pl-4 pr-9 py-2.5 text-sm font-semibold text-[#1b201a] outline-none focus:border-[#22C55E]/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#787f70] pointer-events-none">g</span>
                          </div>
                          <button
                            onClick={agregarAlimento}
                            disabled={guardandoAlim}
                            className="bg-[#22C55E] hover:bg-[#c490ff] disabled:opacity-40 text-black font-black rounded-xl px-5 py-2.5 text-sm active:scale-95 transition-all whitespace-nowrap shadow-[0_0_16px_rgba(34,197,94,0.3)]">
                            {guardandoAlim ? '…' : '＋ Agregar'}
                          </button>
                        </div>
                      ) : (
                        /* Modo porción / unidad */
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[10px] text-[#787f70] uppercase tracking-wide mb-1 block">Porciones</label>
                              <input
                                type="number"
                                min="1"
                                value={unidadesInput}
                                onChange={e => setUnidadesInput(e.target.value)}
                                className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#1b201a] outline-none focus:border-[#22C55E]/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] text-[#787f70] uppercase tracking-wide mb-1 block">Peso c/u (g)</label>
                              <input
                                type="number"
                                min="1"
                                value={pesoPorcion}
                                onChange={e => setPesoPorcion(e.target.value)}
                                className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#1b201a] outline-none focus:border-[#22C55E]/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          </div>
                          <p className="text-[11px] text-[#15803D]/50 pl-1">
                            Total: {unidadesInput || 0} × {pesoPorcion || 0}g = {Math.round((parseFloat(unidadesInput) || 0) * (parseFloat(pesoPorcion) || 0))}g
                          </p>
                          <button
                            onClick={agregarAlimento}
                            disabled={guardandoAlim}
                            className="w-full bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-40 text-white font-bold rounded-xl py-2.5 text-sm active:scale-95 transition-all shadow-[0_0_16px_rgba(34,197,94,0.3)]">
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
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white active:scale-[0.98] transition-all shadow-[0_0_18px_rgba(34,197,94,0.3)]"
                  style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)' }}>
                  <span className="text-base">🍽️</span>
                  Agregar alimento
                </button>
              )}

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
        `}</style>
        {/* Accesos rápidos: Rutinas y Progreso */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <a
            href="/rutinas"
            className="flex flex-col items-center justify-end rounded-2xl border border-[#22C55E]/25 pt-4 pb-3 px-3 transition-all active:scale-[0.97] hover:border-[#22C55E]/45"
            style={{ background: 'linear-gradient(135deg, #EAF3DE 0%, #EDF2EA 100%)', boxShadow: '0 0 18px rgba(34,197,94,0.10)', textDecoration: 'none' }}>
            <img
              src={imagenEntrena} alt=""
              className="h-24 w-auto pointer-events-none select-none"
            />
            <span className="mt-2 text-sm font-bold text-[#15803D]">Rutinas</span>
            <span className="text-[10px] text-[#6d7362]">Tu plan de entrenamiento</span>
          </a>

          <a
            href="/progreso"
            className="flex flex-col items-center justify-end rounded-2xl border border-[#EA7A1C]/25 pt-4 pb-3 px-3 transition-all active:scale-[0.97] hover:border-[#EA7A1C]/45"
            style={{ background: 'linear-gradient(135deg, #FAEEDA 0%, #F7F1E6 100%)', boxShadow: '0 0 18px rgba(234,122,28,0.10)', textDecoration: 'none' }}>
            <img
              src={imagenProgreso} alt=""
              className="h-24 w-auto pointer-events-none select-none"
            />
            <span className="mt-2 text-sm font-bold text-[#B45309]">Progreso</span>
            <span className="text-[10px] text-[#6d7362]">Mira tu avance</span>
          </a>
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
          <svg viewBox="0 0 24 24" fill="#FFFFFF" width="18" height="18" style={{ flexShrink: 0 }}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
            ¿Encontraste un error? Repórtalo aquí
          </span>
        </a>

      </div>
    </div>
  )
}
