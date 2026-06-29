'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  LineChart, Line, BarChart, Bar, ReferenceLine, LabelList,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DIAS_CORTOS  = ['Do','Lu','Ma','Mi','Ju','Vi','Sa']

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function formatFechaCorta(fecha: string): string {
  const d = new Date(fecha + 'T00:00:00')
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`
}
function formatDiaLabel(fecha: string): string {
  const d = new Date(fecha + 'T00:00:00')
  return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()}`
}
function formatFechaDDMMYYYY(fecha: string): string {
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}
function formatNumeroEs(n: number, decimales = 1): string {
  return n.toFixed(decimales).replace('.', ',')
}

type PeriodoNutri = 'dia' | 'semana' | 'mes'

const PERIODOS_NUTRI: { key: PeriodoNutri; label: string }[] = [
  { key: 'dia',    label: 'Día'    },
  { key: 'semana', label: 'Semana' },
  { key: 'mes',    label: 'Mes'    },
]

const RESUMEN_NUTRI_TXT: Record<PeriodoNutri, { titulo: string }> = {
  dia:    { titulo: 'Resumen del día'      },
  semana: { titulo: 'Resumen de la semana' },
  mes:    { titulo: 'Resumen del mes'      },
}

function rangoPeriodoNutri(periodo: PeriodoNutri, fechaDia: string, hoyStr: string): { inicio: string; fin: string; dias: number; diasTotal: number } {
  if (periodo === 'dia') return { inicio: fechaDia, fin: fechaDia, dias: 1, diasTotal: 1 }
  const hoy = new Date(hoyStr + 'T00:00:00')
  if (periodo === 'semana') {
    const diaSemana = hoy.getDay()
    const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() + diffLunes)
    const domingo = new Date(lunes)
    domingo.setDate(lunes.getDate() + 6)
    const dias = Math.round((hoy.getTime() - lunes.getTime()) / 86400000) + 1
    return { inicio: toLocalDateStr(lunes), fin: toLocalDateStr(domingo), dias, diasTotal: 7 }
  }
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const finMes    = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
  return { inicio: toLocalDateStr(inicioMes), fin: toLocalDateStr(finMes), dias: hoy.getDate(), diasTotal: finMes.getDate() }
}

type ObjetivoPersona = 'bajar' | 'mantener' | 'subir'

function evaluarNutricion(valor: number, objetivo: number, metaPersona: ObjetivoPersona): {
  estado: 'debajo' | 'meta' | 'encima'
  color: 'verde' | 'rojo'
} {
  if (!objetivo) return { estado: 'meta', color: 'verde' }
  const tolerancia = metaPersona === 'mantener' ? 0.10 : 0.05
  const diffPct = (valor - objetivo) / objetivo
  const estado: 'debajo' | 'meta' | 'encima' =
    diffPct < -tolerancia ? 'debajo' : diffPct > tolerancia ? 'encima' : 'meta'
  const color: 'verde' | 'rojo' =
    metaPersona === 'bajar'  ? (estado === 'encima' ? 'rojo' : 'verde') :
    metaPersona === 'subir'  ? (estado === 'debajo' ? 'rojo' : 'verde') :
    /* mantener */              (estado === 'meta'   ? 'verde' : 'rojo')
  return { estado, color }
}

type RegistroPeso = { fecha: string; peso_kg: number }
type SesionRow = {
  ejercicio_id: string
  peso_kg: number | null
  fecha: string
}
type NutriDia = { fecha: string; label: string; consumido: number }

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#111',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 12,
  },
  labelStyle: { color: '#9ca3af', marginBottom: 2 },
}
const AXIS = {
  tick:     { fill: '#6b7280', fontSize: 10 },
  tickLine: false as const,
  axisLine: false as const,
}

export default function ProgresoPage() {
  const [tab, setTab]     = useState('peso')
  const [userId, setUserId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  // ── Peso ──
  const [historialPeso, setHistorialPeso] = useState<RegistroPeso[]>([])
  const [pesoInput, setPesoInput]   = useState('')
  const [guardando, setGuardando]   = useState(false)
  const [errorPeso, setErrorPeso]   = useState<string | null>(null)
  const [sexoPerfil, setSexoPerfil] = useState<string | null>(null)

  // ── Ejercicios ──
  const [sesiones, setSesiones]           = useState<SesionRow[]>([])
  const [ejerciciosList, setEjerciciosList] = useState<{ id: string; nombre: string; imagen: string | null }[]>([])
  const [ejercicioSel, setEjercicioSel]   = useState<string>('')
  const [expandedEj, setExpandedEj]       = useState<Set<string>>(new Set())

  // ── Nutrición ──
  const [nutriData, setNutriData]   = useState<NutriDia[]>([])
  const [metaDiaria, setMetaDiaria] = useState<number>(0)
  const [tdee, setTdee]             = useState<number>(0)
  const [metaProteina, setMetaProteina] = useState<number>(0)
  const [metaCarbos, setMetaCarbos]     = useState<number>(0)
  const [metaGrasas, setMetaGrasas]     = useState<number>(0)
  const [objetivoPersona, setObjetivoPersona] = useState<ObjetivoPersona>('mantener')

  const [periodoNutri, setPeriodoNutri]   = useState<PeriodoNutri>('semana')
  const [fechaDiaNutri, setFechaDiaNutri] = useState<string>(() => toLocalDateStr(new Date()))
  const [resumenPeriodo, setResumenPeriodo] = useState({ calorias: 0, proteina: 0, carbos: 0, grasas: 0, diasConRegistro: 0 })
  const [cargandoResumenPeriodo, setCargandoResumenPeriodo] = useState(false)

  const hoyStr = useMemo(() => toLocalDateStr(new Date()), [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCargando(false); return }
      setUserId(user.id)

      // Últimos 7 días, del más antiguo al más reciente
      const ultimos7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        return toLocalDateStr(d)
      })

      const [
        { data: pesosData },
        { data: sesionesData },
        { data: comidasData },
        { data: perfilData },
      ] = await Promise.all([
        supabase
          .from('peso_corporal')
          .select('fecha, peso_kg')
          .eq('user_id', user.id)
          .order('fecha', { ascending: true }),
        supabase
          .from('sesiones')
          .select('ejercicio_id, peso_kg, fecha')
          .eq('user_id', user.id)
          .not('peso_kg', 'is', null)
          .order('fecha', { ascending: true }),
        supabase
          .from('registro_comidas')
          .select('fecha, calorias')
          .eq('user_id', user.id)
          .in('fecha', ultimos7),
        supabase
          .from('perfiles')
          .select('calorias_objetivo, tdee, proteina_objetivo, carbos_objetivo, grasas_objetivo, objetivo, sexo')
          .eq('id', user.id)
          .single(),
      ])

      // — Peso —
      const pesos = (pesosData ?? []) as RegistroPeso[]
      setHistorialPeso(pesos)
      const hoyReg = pesos.find(r => r.fecha === hoyStr)
      if (hoyReg) setPesoInput(String(hoyReg.peso_kg))

      // — Ejercicios —
      const sRows = (sesionesData ?? []) as SesionRow[]
      setSesiones(sRows)
      const uniqueEjIds = [...new Set(sRows.map(s => s.ejercicio_id))]
      const ejInfoMap = new Map<string, { nombre: string; imagen: string | null }>()
      if (uniqueEjIds.length > 0) {
        const { data: ejerciciosData } = await supabase
          .from('ejercicios')
          .select('id, nombre, imagenes')
          .in('id', uniqueEjIds)
        ;(ejerciciosData ?? []).forEach((e: { id: string; nombre: string; imagenes: string[] | null }) => {
          ejInfoMap.set(e.id, { nombre: e.nombre, imagen: e.imagenes?.[0] ?? null })
        })
      }
      const ejList = Array.from(ejInfoMap.entries())
        .map(([id, info]) => ({ id, ...info }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
      setEjerciciosList(ejList)
      if (ejList.length > 0) setEjercicioSel(ejList[0].id)

      // — Nutrición —
      setMetaDiaria(perfilData?.calorias_objetivo ?? 0)
      setTdee(perfilData?.tdee ?? 0)
      setMetaProteina(perfilData?.proteina_objetivo ?? 0)
      setMetaCarbos(perfilData?.carbos_objetivo ?? 0)
      setMetaGrasas(perfilData?.grasas_objetivo ?? 0)
      setObjetivoPersona((perfilData?.objetivo as ObjetivoPersona) ?? 'mantener')
      setSexoPerfil(perfilData?.sexo ?? null)
      const comidasMap = new Map<string, number>()
      ;(comidasData ?? []).forEach(r => {
        comidasMap.set(r.fecha, (comidasMap.get(r.fecha) ?? 0) + (r.calorias ?? 0))
      })
      setNutriData(ultimos7.map(f => ({
        fecha: f,
        label: formatDiaLabel(f),
        consumido: Math.round(comidasMap.get(f) ?? 0),
      })))

      setCargando(false)
    }
    init()
  }, [hoyStr])

  // ── Resumen nutricional por período (Día/Semana/Mes) ──
  const rangoNutri = useMemo(
    () => rangoPeriodoNutri(periodoNutri, fechaDiaNutri, hoyStr),
    [periodoNutri, fechaDiaNutri, hoyStr]
  )

  useEffect(() => {
    if (!userId) return
    setCargandoResumenPeriodo(true)
    supabase
      .from('registro_comidas')
      .select('fecha, calorias, proteina, carbos, grasas')
      .eq('user_id', userId)
      .gte('fecha', rangoNutri.inicio)
      .lte('fecha', rangoNutri.fin)
      .then(({ data }) => {
        const totales = (data ?? []).reduce((acc, r) => ({
          calorias: acc.calorias + (r.calorias || 0),
          proteina: acc.proteina + (r.proteina || 0),
          carbos:   acc.carbos   + (r.carbos   || 0),
          grasas:   acc.grasas   + (r.grasas   || 0),
        }), { calorias: 0, proteina: 0, carbos: 0, grasas: 0 })
        const diasConRegistro = new Set((data ?? []).map(r => r.fecha)).size
        setResumenPeriodo({ ...totales, diasConRegistro })
        setCargandoResumenPeriodo(false)
      })
  }, [userId, rangoNutri.inicio, rangoNutri.fin])

  // ── Guardar peso ──
  const guardarPeso = async () => {
    if (!userId) return
    const kg = parseFloat(pesoInput.replace(',', '.'))
    if (!pesoInput || isNaN(kg) || kg < 20 || kg > 500) {
      setErrorPeso('Ingresa un peso válido (kg)')
      return
    }
    setGuardando(true)
    setErrorPeso(null)
    const { error } = await supabase
      .from('peso_corporal')
      .upsert({ user_id: userId, peso_kg: kg, fecha: hoyStr }, { onConflict: 'user_id,fecha' })
    if (error) { setGuardando(false); setErrorPeso(error.message); return }
    const { data } = await supabase
      .from('peso_corporal')
      .select('fecha, peso_kg')
      .eq('user_id', userId)
      .order('fecha', { ascending: true })
    setHistorialPeso((data ?? []) as RegistroPeso[])
    setGuardando(false)
  }

  // ── Datos derivados: peso ──
  const pesoActual  = historialPeso.length > 0 ? historialPeso[historialPeso.length - 1].peso_kg : null
  const pesoInicial = historialPeso.length > 0 ? historialPeso[0].peso_kg : null
  const cambioPeso  = pesoActual != null && pesoInicial != null && historialPeso.length > 1
    ? +(pesoActual - pesoInicial).toFixed(1) : null
  const pesosArr = historialPeso.map(r => r.peso_kg)
  const yMinPeso = pesosArr.length > 0 ? Math.floor(Math.min(...pesosArr) - 1) : 40
  const yMaxPeso = pesosArr.length > 0 ? Math.ceil(Math.max(...pesosArr)  + 1) : 120
  const chartPeso = historialPeso.map(r => ({ fecha: formatFechaCorta(r.fecha), peso: r.peso_kg }))
  // Intervalo del eje X: muestra todas las fechas si hay ≤7 registros, si no inicio y fin
  const chartPesoInterval = historialPeso.length <= 7 ? 0 : 'preserveStartEnd' as const
  // Barra de progreso: % del cambio sobre el peso inicial (cap 100%)
  const pctCambioPeso = pesoInicial && cambioPeso != null
    ? Math.min(Math.abs(cambioPeso) / pesoInicial * 100 * 5, 100) : 0
  const imagenEntrenaPeso = sexoPerfil === 'mujer'
    ? '/caricaturas/mujer-progreso.png'
    : '/caricaturas/hombre-progreso.png'

  // ── Datos derivados: ejercicio seleccionado ──
  const chartEjercicio = useMemo(() => {
    if (!ejercicioSel) return []
    const porFecha = new Map<string, number>()
    sesiones
      .filter(s => s.ejercicio_id === ejercicioSel && s.peso_kg != null)
      .forEach(s => {
        const prev = porFecha.get(s.fecha) ?? 0
        if ((s.peso_kg ?? 0) > prev) porFecha.set(s.fecha, s.peso_kg!)
      })
    return Array.from(porFecha.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, peso]) => ({ fecha: formatFechaCorta(fecha), fechaRaw: fecha, peso }))
  }, [sesiones, ejercicioSel])

  const recordEjercicio = useMemo(() => {
    if (!ejercicioSel) return null
    const vals = sesiones
      .filter(s => s.ejercicio_id === ejercicioSel && s.peso_kg != null)
      .map(s => s.peso_kg!)
    return vals.length > 0 ? Math.max(...vals) : null
  }, [sesiones, ejercicioSel])

  const recordFecha = useMemo(() => {
    if (!ejercicioSel || recordEjercicio == null) return null
    const fechas = sesiones
      .filter(s => s.ejercicio_id === ejercicioSel && s.peso_kg === recordEjercicio)
      .map(s => s.fecha)
      .sort()
    return fechas.length > 0 ? fechas[0] : null
  }, [sesiones, ejercicioSel, recordEjercicio])

  const ejArr = chartEjercicio.map(d => d.peso)
  const yMinEj = ejArr.length > 0 ? Math.floor(Math.min(...ejArr) - 2.5) : 0
  const yMaxEj = ejArr.length > 0 ? Math.ceil(Math.max(...ejArr)  + 2.5) : 100

  // ── Datos derivados: ejercicios (vista de PRs) ──
  const ejercicioChartMap = useMemo(() => {
    const map = new Map<string, { fecha: string; label: string; peso: number }[]>()
    ejerciciosList.forEach(ej => {
      const porFecha = new Map<string, number>()
      sesiones
        .filter(s => s.ejercicio_id === ej.id && s.peso_kg != null)
        .forEach(s => {
          const prev = porFecha.get(s.fecha) ?? 0
          if ((s.peso_kg ?? 0) > prev) porFecha.set(s.fecha, s.peso_kg!)
        })
      const data = Array.from(porFecha.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, peso]) => ({ fecha, label: formatFechaCorta(fecha), peso }))
      map.set(ej.id, data)
    })
    return map
  }, [sesiones, ejerciciosList])

  const ejercicioIdsHoy = useMemo(
    () => new Set(sesiones.filter(s => s.fecha === hoyStr && s.peso_kg != null).map(s => s.ejercicio_id)),
    [sesiones, hoyStr]
  )

  const ejerciciosHoy   = useMemo(() => ejerciciosList.filter(e =>  ejercicioIdsHoy.has(e.id)), [ejerciciosList, ejercicioIdsHoy])
  const ejerciciosOtros = useMemo(() => ejerciciosList.filter(e => !ejercicioIdsHoy.has(e.id)), [ejerciciosList, ejercicioIdsHoy])

  // ── Datos derivados: nutrición ──
  const comidasMax = Math.max(...nutriData.map(d => d.consumido), metaDiaria, 1)
  const yMaxNutri  = Math.ceil(comidasMax * 1.2)

  // Objetivo prorrateado a los días ya transcurridos (para comparar de forma justa contra lo ya consumido)
  const objCalorias = metaDiaria   * rangoNutri.dias
  const objProteina = metaProteina * rangoNutri.dias
  const objCarbos   = metaCarbos   * rangoNutri.dias
  const objGrasas   = metaGrasas   * rangoNutri.dias

  // Objetivo total del período completo (para el número grande/destacado)
  const objCaloriasPeriodo = metaDiaria   * rangoNutri.diasTotal
  const objProteinaPeriodo = metaProteina * rangoNutri.diasTotal
  const objCarbosPeriodo   = metaCarbos   * rangoNutri.diasTotal
  const objGrasasPeriodo   = metaGrasas   * rangoNutri.diasTotal

  // Resumen del período activo (Día/Semana/Mes)
  // GRUPO A — mantenimiento y objetivo del período: informativos, siempre con valor,
  // calculados sobre TODOS los días del período (no dependen de lo que se haya comido).
  // GRUPO B — consumido, déficit/superávit y peso estimado: el avance real, calculado
  // SOLO sobre los días que sí tienen comida registrada, para que sea realista.
  const consumidoPeriodo        = resumenPeriodo.calorias
  const diasConRegistro         = resumenPeriodo.diasConRegistro
  const mantenimientoPeriodo    = tdee * rangoNutri.diasTotal
  const promedioConsumidoDia    = diasConRegistro > 0 ? consumidoPeriodo / diasConRegistro : 0
  const mantenimientoRegistrado = tdee * diasConRegistro
  const deficitSuperavitPeriodo = mantenimientoRegistrado - consumidoPeriodo
  const pesoEstimadoKg          = diasConRegistro > 0 ? deficitSuperavitPeriodo / 7700 : null

  // Déficit/superávit: verde si va bien según su objetivo (bajar/mantener/subir), rojo si va mal
  const deficitColorClass = diasConRegistro === 0
    ? 'text-gray-500'
    : evaluarNutricion(consumidoPeriodo, mantenimientoRegistrado, objetivoPersona).color === 'verde'
      ? 'text-green-400'
      : 'text-red-400'
  const pesoEstimadoColorClass = pesoEstimadoKg === null ? 'text-gray-500' : 'text-green-400'

  const pesoEstimadoLabel = pesoEstimadoKg === null
    ? 'Peso estimado'
    : objetivoPersona === 'mantener'
      ? 'Diferencia de peso estimada'
      : pesoEstimadoKg >= 0 ? 'Peso perdido estimado' : 'Peso ganado estimado'
  const pesoEstimadoTexto = pesoEstimadoKg === null
    ? '— sin datos suficientes'
    : `≈ ${objetivoPersona === 'mantener'
        ? `${pesoEstimadoKg >= 0 ? '+' : ''}${formatNumeroEs(pesoEstimadoKg)}`
        : formatNumeroEs(Math.abs(pesoEstimadoKg))} kg`

  // Etiquetas del bloque "Resumen del período activo", acordes a la pestaña elegida
  const periodoTxt = periodoNutri === 'dia' ? 'del día' : periodoNutri === 'semana' ? 'de la semana' : 'del mes'
  const mantenimientoLabel = `Mantenimiento ${periodoTxt} (TDEE)`
  const objetivoPeriodoLabel = `Objetivo ${periodoTxt}`
  const promedioConsumidoLabel = periodoNutri === 'dia' ? 'Consumido del día' : `Promedio consumido/día ${periodoTxt}`
  const deficitLabelBase = diasConRegistro === 0
    ? 'Déficit / superávit'
    : deficitSuperavitPeriodo >= 0 ? 'Déficit real' : 'Superávit real'
  const deficitLabel = `${deficitLabelBase} ${periodoTxt}`

  // ── UI helpers ──
  const TABS = [
    { key: 'peso',       label: 'Peso'       },
    { key: 'ejercicios', label: 'Ejercicios' },
    { key: 'nutricion',  label: 'Nutrición'  },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white max-w-lg mx-auto">

      {/* HEADER */}
      <div className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/10 px-5 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Fit<span className="text-[#B57BFF]">Pro</span></h1>
        <a href="/inicio" className="text-xs text-gray-400">← Inicio</a>
      </div>

      <div className="p-5">
        <h2 className="text-xl font-bold mb-4">Progreso</h2>

        {/* TABS */}
        <div className="flex gap-2 mb-5">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors
                ${tab === key
                  ? 'bg-[#B57BFF] text-white'
                  : 'bg-[#1a1a1a] text-gray-400 border border-white/10'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Skeleton mientras carga */}
        {cargando && (
          <div className="flex flex-col gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-[#1a1a1a] border border-white/10 rounded-2xl animate-pulse h-28" />
            ))}
          </div>
        )}

        {!cargando && (
          <>

            {/* ═══════════════ PESO ═══════════════ */}
            {tab === 'peso' && (
              <div className="flex flex-col gap-4">

                {/* ── Hero: actual + caricatura ── */}
                <div
                  className="rounded-2xl border border-[#B57BFF]/40 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #12062a 0%, #0a0318 100%)', boxShadow: '0 0 28px rgba(181,123,255,0.13)' }}>

                  <div className="flex items-end justify-between px-5 pt-5 pb-4 gap-2">
                    {/* Peso actual */}
                    <div className="shrink-0">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Actual</p>
                      {pesoActual != null ? (
                        <>
                          <p className="text-5xl font-black text-white leading-none">{pesoActual}</p>
                          <p className="text-sm text-[#B57BFF]/60 mt-0.5">kg</p>
                          <p className="text-[10px] text-gray-600 mt-1">
                            {formatFechaDDMMYYYY(historialPeso[historialPeso.length - 1].fecha)}
                          </p>
                        </>
                      ) : (
                        <p className="text-2xl font-black text-gray-600">—</p>
                      )}
                    </div>

                    {/* Caricatura central */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagenEntrenaPeso}
                      alt=""
                      style={{ height: 110, width: 'auto', objectFit: 'contain', objectPosition: 'bottom', pointerEvents: 'none', userSelect: 'none', flexShrink: 0 }}
                    />

                    {/* Cambio desde el inicio (lado derecho) */}
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Desde inicio</p>
                      {cambioPeso != null ? (
                        <>
                          <p className={`text-2xl font-black leading-none ${cambioPeso < 0 ? 'text-[#2EE57D]' : cambioPeso > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {cambioPeso > 0 ? '+' : ''}{cambioPeso}
                          </p>
                          <p className="text-sm text-gray-500 mt-0.5">kg</p>
                        </>
                      ) : (
                        <p className="text-2xl font-black text-gray-600">—</p>
                      )}
                    </div>
                  </div>

                  {/* Barra de progreso del cambio */}
                  {cambioPeso != null && pesoInicial != null && (
                    <div className="px-5 pb-5">
                      <div className="h-2 bg-white/8 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pctCambioPeso}%`,
                            background: cambioPeso <= 0
                              ? 'linear-gradient(90deg, #B57BFF 0%, #2EE57D 100%)'
                              : 'linear-gradient(90deg, #B57BFF 0%, #FF5C5C 100%)',
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 leading-snug">
                        {cambioPeso < 0
                          ? <>Llevas <span className="text-[#2EE57D] font-semibold">{Math.abs(cambioPeso)} kg perdidos</span> · peso inicial: {pesoInicial} kg</>
                          : cambioPeso > 0
                          ? <>Llevas <span className="text-red-400 font-semibold">{cambioPeso} kg ganados</span> · peso inicial: {pesoInicial} kg</>
                          : <span className="text-gray-500">Sin cambio desde el inicio ({pesoInicial} kg)</span>
                        }
                      </p>
                    </div>
                  )}

                  {pesoActual == null && (
                    <p className="text-center pb-6 text-gray-600 text-sm">
                      Registra tu primer peso para comenzar el seguimiento
                    </p>
                  )}
                </div>

                {/* ── Gráfica de evolución con fechas ── */}
                {historialPeso.length >= 2 && (
                  <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Evolución del peso</p>
                    <ResponsiveContainer width="100%" height={210}>
                      <LineChart data={chartPeso} margin={{ top: 18, right: 12, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="fecha" {...AXIS} interval={chartPesoInterval} />
                        <YAxis domain={[yMinPeso, yMaxPeso]} {...AXIS} width={42} tickFormatter={v => `${v}kg`} />
                        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} kg`, 'Peso']} />
                        <Line
                          type="monotone"
                          dataKey="peso"
                          stroke="#B57BFF"
                          strokeWidth={2}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          dot={(props: any) => {
                            const isLast = props.index === chartPeso.length - 1
                            return <circle key={props.index} cx={props.cx} cy={props.cy} r={isLast ? 5 : 3} fill={isLast ? '#2EE57D' : '#B57BFF'} />
                          }}
                          activeDot={{ r: 6, fill: '#2EE57D', strokeWidth: 0 }}
                        >
                          <LabelList
                            dataKey="peso"
                            position="top"
                            style={{ fill: 'rgba(181,123,255,0.75)', fontSize: 10, fontWeight: 700 }}
                          />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {historialPeso.length === 1 && (
                  <p className="text-center py-6 text-gray-600 text-xs">
                    Registra al menos 2 pesajes para ver la gráfica
                  </p>
                )}

                {/* ── Input registrar peso de hoy ── */}
                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Registrar peso de hoy</p>
                  <div className="flex gap-3 items-center">
                    <input
                      type="number"
                      value={pesoInput}
                      onChange={e => { setPesoInput(e.target.value); setErrorPeso(null) }}
                      onKeyDown={e => e.key === 'Enter' && guardarPeso()}
                      placeholder="Ej: 95.5"
                      step="0.1" min="20" max="500"
                      className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#B57BFF]/60 placeholder-gray-600"
                    />
                    <span className="text-gray-500 text-sm shrink-0">kg</span>
                    <button
                      onClick={guardarPeso}
                      disabled={guardando || !pesoInput}
                      className="font-bold px-5 py-3 rounded-xl text-sm text-white disabled:opacity-40 shrink-0"
                      style={{ background: 'linear-gradient(135deg, #B57BFF, #7B2FF7)' }}>
                      {guardando ? '...' : 'Guardar'}
                    </button>
                  </div>
                  {errorPeso && <p className="mt-2 text-xs text-red-400">{errorPeso}</p>}
                </div>

              </div>
            )}

            {/* ═══════════════ EJERCICIOS ═══════════════ */}
            {tab === 'ejercicios' && (
              <div className="flex flex-col gap-4">
                {ejerciciosList.length === 0 ? (
                  <p className="text-center py-16 text-gray-600 text-sm leading-relaxed">
                    Aún no tienes sesiones con pesos registrados.<br />
                    Completa entrenamientos en Rutinas para ver tu progreso aquí.
                  </p>
                ) : (
                  <>
                    {/* A · Entrenados hoy */}
                    <div>
                      <p className="text-[11px] uppercase tracking-widest mb-3 px-1"
                        style={{ color: '#22D3EE', fontFamily: "'Oswald', sans-serif", letterSpacing: '0.12em' }}>
                        Entrenados hoy
                      </p>
                      {ejerciciosHoy.length === 0 ? (
                        <p className="text-xs text-gray-600 px-1">Sin entrenamientos registrados hoy</p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {ejerciciosHoy.map(ej => {
                            const data = ejercicioChartMap.get(ej.id) ?? []
                            const pr = data.length > 0 ? Math.max(...data.map(d => d.peso)) : 0
                            const hoyPeso = data.find(d => d.fecha === hoyStr)?.peso ?? 0
                            const prevMax = data.filter(d => d.fecha < hoyStr).reduce((m, d) => Math.max(m, d.peso), 0)
                            const esNuevoPR = prevMax > 0 && hoyPeso > prevMax
                            return (
                              <div key={ej.id} className="rounded-2xl p-4"
                                style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.22)' }}>
                                {/* Cabecera: foto + nombre + badge */}
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
                                    style={{ width: 44, height: 44, background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(34,211,238,0.18)' }}>
                                    {ej.imagen ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={ej.imagen} alt={ej.nombre} loading="lazy"
                                        className="w-full h-full object-contain"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                    ) : (
                                      <span style={{ fontSize: 20, opacity: 0.3 }}>🏋️</span>
                                    )}
                                  </div>
                                  <p className="flex-1 min-w-0 text-sm text-white uppercase leading-tight"
                                    style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700 }}>
                                    {ej.nombre}
                                  </p>
                                  {esNuevoPR ? (
                                    <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
                                      style={{ color: '#22D3EE', background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.35)' }}>
                                      🏆 ¡PR! {hoyPeso}kg
                                    </span>
                                  ) : (
                                    <span className="shrink-0 text-xs font-bold"
                                      style={{ color: '#22D3EE' }}>PR {pr}kg</span>
                                  )}
                                </div>
                                {/* Gráfica */}
                                {data.length >= 2 ? (
                                  <ResponsiveContainer width="100%" height={90}>
                                    <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                                      <XAxis dataKey="label" {...AXIS} />
                                      <YAxis {...AXIS} width={36} />
                                      <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} kg`, 'Peso máx.']} />
                                      <Line type="monotone" dataKey="peso" stroke="#22D3EE" strokeWidth={2}
                                        dot={{ fill: '#22D3EE', r: 2, strokeWidth: 0 }}
                                        activeDot={{ r: 4, fill: '#22D3EE', strokeWidth: 0 }} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <p className="text-[10px] mt-1" style={{ color: 'rgba(34,211,238,0.4)' }}>
                                    Primera sesión — ¡vuelve a entrenar para ver tu progreso!
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* B · Otros ejercicios (acordeón) */}
                    {ejerciciosOtros.length > 0 && (
                      <div>
                        <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-3 px-1"
                          style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: '0.12em' }}>
                          Otros ejercicios
                        </p>
                        <div className="rounded-2xl overflow-hidden"
                          style={{ background: '#111', border: '1px solid rgba(181,123,255,0.2)' }}>
                          {ejerciciosOtros.map((ej, idx) => {
                            const data = ejercicioChartMap.get(ej.id) ?? []
                            const pr = data.length > 0 ? Math.max(...data.map(d => d.peso)) : 0
                            const isExpanded = expandedEj.has(ej.id)
                            const isLast = idx === ejerciciosOtros.length - 1
                            return (
                              <div key={ej.id}
                                style={{ borderBottom: !isLast ? '1px solid rgba(255,255,255,0.05)' : undefined }}>
                                <button
                                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                                  onClick={() => setExpandedEj(prev => {
                                    const next = new Set(prev)
                                    if (next.has(ej.id)) next.delete(ej.id)
                                    else next.add(ej.id)
                                    return next
                                  })}
                                >
                                  {/* Foto */}
                                  <div className="shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                                    style={{ width: 40, height: 42, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(181,123,255,0.15)' }}>
                                    {ej.imagen ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={ej.imagen} alt={ej.nombre} loading="lazy"
                                        className="w-full h-full object-contain"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                    ) : (
                                      <span style={{ fontSize: 18, opacity: 0.25 }}>🏋️</span>
                                    )}
                                  </div>
                                  {/* Nombre */}
                                  <span className="flex-1 min-w-0 text-sm text-white uppercase leading-tight"
                                    style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700 }}>
                                    {ej.nombre}
                                  </span>
                                  {/* PR + flecha */}
                                  <span className="shrink-0 text-xs font-bold mr-1"
                                    style={{ color: '#B57BFF' }}>
                                    {pr > 0 ? `PR ${pr}kg` : '—'}
                                  </span>
                                  <span className={`text-gray-600 text-[10px] transition-transform duration-200 inline-block ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                                </button>
                                {isExpanded && (
                                  <div className="px-3 pb-4">
                                    {data.length >= 2 ? (
                                      <ResponsiveContainer width="100%" height={130}>
                                        <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                          <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" />
                                          <YAxis {...AXIS} width={36} tickFormatter={v => `${v}kg`} />
                                          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} kg`, 'Peso máx.']} />
                                          <Line type="monotone" dataKey="peso" stroke="#B57BFF" strokeWidth={2}
                                            dot={{ fill: '#B57BFF', r: 2, strokeWidth: 0 }}
                                            activeDot={{ r: 4, fill: '#B57BFF', strokeWidth: 0 }} />
                                        </LineChart>
                                      </ResponsiveContainer>
                                    ) : (
                                      <p className="text-[10px] text-gray-600">
                                        {data.length === 0
                                          ? 'Sin datos de peso para este ejercicio'
                                          : 'Entrena al menos 2 veces para ver la gráfica'}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ═══════════════ NUTRICIÓN ═══════════════ */}
            {tab === 'nutricion' && (
              <div className="flex flex-col gap-4">
                {metaDiaria === 0 ? (
                  <p className="text-center py-16 text-gray-600 text-sm leading-relaxed">
                    Completa el onboarding para ver<br />tu seguimiento nutricional.
                  </p>
                ) : (
                  <>
                    {/* 1 · Selector Semana / Mes */}
                    <div className="flex gap-2">
                      {(['semana', 'mes'] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => setPeriodoNutri(p)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                            periodoNutri === p ? 'text-white' : 'bg-[#1a1a1a] text-gray-400 border border-white/10'
                          }`}
                          style={periodoNutri === p
                            ? { background: 'linear-gradient(135deg, #B57BFF, #7B2FF7)' }
                            : undefined}
                        >
                          {p === 'semana' ? 'Semana' : 'Mes'}
                        </button>
                      ))}
                    </div>

                    {/* 2a · Calorías del período */}
                    {(() => {
                      const meta = objCaloriasPeriodo
                      const consumido = consumidoPeriodo
                      const pct = meta > 0 ? Math.min((consumido / meta) * 100, 100) : 0
                      const sePaso = consumido > meta
                      const titulo = periodoNutri === 'mes' ? 'CALORÍAS DEL MES' : 'CALORÍAS DE LA SEMANA'
                      return (
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">{titulo}</p>
                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-3xl font-black text-white">
                              {Math.round(consumido).toLocaleString('es-ES')}
                            </span>
                            <span className="text-base text-gray-500">
                              / {Math.round(meta).toLocaleString('es-ES')} kcal
                            </span>
                          </div>
                          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden mb-2">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: sePaso ? '#EF4444' : '#22C55E' }}
                            />
                          </div>
                          {cargandoResumenPeriodo ? (
                            <p className="text-[10px] text-gray-600">Actualizando…</p>
                          ) : (
                            <p className={`text-xs font-semibold ${sePaso ? 'text-red-400' : 'text-green-400'}`}>
                              {sePaso ? 'Te pasaste de tu meta' : '✓ Vas por debajo de tu meta'}
                            </p>
                          )}
                        </div>
                      )
                    })()}

                    {/* 2b · Margen de calorías */}
                    {(() => {
                      const restantes = Math.round(objCaloriasPeriodo - consumidoPeriodo)
                      const sePaso = restantes < 0
                      const label = periodoNutri === 'mes' ? 'TE QUEDAN ESTE MES' : 'TE QUEDAN ESTA SEMANA'
                      return (
                        <div
                          className="rounded-2xl p-5"
                          style={{
                            background: sePaso ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                            border: `1px solid ${sePaso ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'}`,
                          }}
                        >
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">🍔 {label}</p>
                          <p className={`text-3xl font-black mb-1 ${sePaso ? 'text-red-400' : 'text-green-400'}`}>
                            {Math.abs(restantes).toLocaleString('es-ES')} kcal
                          </p>
                          <p className={`text-xs ${sePaso ? 'text-red-400/80' : 'text-green-400/80'}`}>
                            {sePaso
                              ? `Te pasaste por ${Math.abs(restantes).toLocaleString('es-ES')} kcal`
                              : '¡Puedes darte un gusto y seguir en meta!'}
                          </p>
                        </div>
                      )
                    })()}

                    {/* 3 · Calidad de tu alimentación – anillos de macros */}
                    {(() => {
                      const macros = [
                        { label: 'Proteína',      consumido: resumenPeriodo.proteina, meta: objProteinaPeriodo, color: '#38B6FF' },
                        { label: 'Carbohidratos', consumido: resumenPeriodo.carbos,   meta: objCarbosPeriodo,   color: '#FF9D42' },
                        { label: 'Grasas',        consumido: resumenPeriodo.grasas,   meta: objGrasasPeriodo,   color: '#FF5C5C' },
                      ]
                      const rawPcts = macros.map(m =>
                        m.meta > 0 ? Math.round((m.consumido / m.meta) * 100) : 0
                      )
                      const displayPcts = rawPcts.map(p => Math.min(p, 100))
                      const [rawProt, rawCarb, rawGras] = rawPcts
                      const mensajeMacro =
                        rawProt < 80  ? `💪 Tu proteína va al ${rawProt}% de la meta — ¡súbele un poco!` :
                        rawCarb > 110 ? '🌾 Te pasaste un poco en carbohidratos — revisa las porciones.' :
                        rawGras > 110 ? '🥑 Cuidado con las grasas, ya superaste la meta.' :
                        rawProt >= 90 ? `💪 ¡Excelente! Tu proteína va en ${rawProt}% — ¡sigue así!` :
                                        '🥗 Tus macros van bien por ahora.'
                      return (
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">Calidad de tu alimentación</p>
                          <div className="flex justify-around">
                            {macros.map((m, idx) => {
                              const displayPct = displayPcts[idx]
                              const rawPct = rawPcts[idx]
                              return (
                                <div key={m.label} className="flex flex-col items-center gap-2">
                                  <div className="relative" style={{ width: 80, height: 80 }}>
                                    <PieChart width={80} height={80}>
                                      <Pie
                                        data={[{ v: displayPct }, { v: Math.max(0, 100 - displayPct) }]}
                                        cx={40} cy={40}
                                        innerRadius={26} outerRadius={36}
                                        startAngle={90} endAngle={-270}
                                        dataKey="v"
                                        strokeWidth={0}
                                        isAnimationActive={false}
                                      >
                                        <Cell fill={m.color} />
                                        <Cell fill="rgba(255,255,255,0.07)" />
                                      </Pie>
                                    </PieChart>
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      <span className="text-xs font-black text-white">{rawPct}%</span>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-gray-400 text-center leading-tight" style={{ maxWidth: 70 }}>{m.label}</p>
                                </div>
                              )
                            })}
                          </div>
                          <p className="text-xs text-gray-400 mt-4 text-center leading-snug">{mensajeMacro}</p>
                          {cargandoResumenPeriodo && (
                            <p className="text-[10px] text-gray-600 text-center mt-1">Actualizando…</p>
                          )}
                        </div>
                      )
                    })()}

                    {/* 4 · Gráfica de barras por día */}
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Calorías por día</p>
                      <p className="text-[10px] text-gray-600 mb-4">
                        Línea punteada = meta diaria ({metaDiaria.toLocaleString('es-ES')} kcal)
                      </p>
                      <ResponsiveContainer width="100%" height={190}>
                        <BarChart data={nutriData} margin={{ top: 5, right: 8, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="label" {...AXIS} />
                          <YAxis domain={[0, yMaxNutri]} {...AXIS} width={42} />
                          <Tooltip
                            {...TOOLTIP_STYLE}
                            formatter={(v) => [typeof v === 'number' ? v.toLocaleString() : v, 'Consumido']}
                          />
                          <ReferenceLine y={metaDiaria} stroke="#FFC93C" strokeDasharray="5 4" />
                          <Bar dataKey="consumido" radius={[4, 4, 0, 0]} maxBarSize={36}>
                            {nutriData.map((d, i) => (
                              <Cell key={`bar-${i}`} fill={d.consumido > metaDiaria ? '#FF7A3D' : '#B57BFF'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 5 · Peso estimado del período */}
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">⚖️ Peso estimado del período</p>
                        <p className={`text-base font-bold ${pesoEstimadoKg == null ? 'text-gray-500' : pesoEstimadoKg >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                          {pesoEstimadoKg == null
                            ? '—'
                            : `≈ ${formatNumeroEs(Math.abs(pesoEstimadoKg))} kg ${pesoEstimadoKg >= 0 ? 'perdido' : 'ganado'}`}
                        </p>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1">
                        El peso estimado es una aproximación. El resultado real depende de tu metabolismo y otros factores.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

          </>
        )}
      </div>

    </div>
  )
}
