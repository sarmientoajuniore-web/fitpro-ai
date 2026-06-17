'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  LineChart, Line, BarChart, Bar, ReferenceLine,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
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

type RegistroPeso = { fecha: string; peso_kg: number }
type SesionRow = {
  ejercicio_id: string
  peso_kg: number | null
  fecha: string
  ejercicios: { nombre: string } | null
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

  // ── Ejercicios ──
  const [sesiones, setSesiones]           = useState<SesionRow[]>([])
  const [ejerciciosList, setEjerciciosList] = useState<{ id: string; nombre: string }[]>([])
  const [ejercicioSel, setEjercicioSel]   = useState<string>('')

  // ── Nutrición ──
  const [nutriData, setNutriData]   = useState<NutriDia[]>([])
  const [metaDiaria, setMetaDiaria] = useState<number>(0)
  const [tdee, setTdee]             = useState<number>(0)

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
          .select('ejercicio_id, peso_kg, fecha, ejercicios(nombre)')
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
          .select('calorias_objetivo, tdee')
          .eq('id', user.id)
          .single(),
      ])

      // — Peso —
      const pesos = (pesosData ?? []) as RegistroPeso[]
      setHistorialPeso(pesos)
      const hoyReg = pesos.find(r => r.fecha === hoyStr)
      if (hoyReg) setPesoInput(String(hoyReg.peso_kg))

      // — Ejercicios —
      const sRows = (sesionesData ?? []) as unknown as SesionRow[]
      setSesiones(sRows)
      const ejMap = new Map<string, string>()
      sRows.forEach(s => {
        if (!ejMap.has(s.ejercicio_id) && s.ejercicios?.nombre) {
          ejMap.set(s.ejercicio_id, s.ejercicios.nombre)
        }
      })
      const ejList = Array.from(ejMap.entries())
        .map(([id, nombre]) => ({ id, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
      setEjerciciosList(ejList)
      if (ejList.length > 0) setEjercicioSel(ejList[0].id)

      // — Nutrición —
      setMetaDiaria(perfilData?.calorias_objetivo ?? 0)
      setTdee(perfilData?.tdee ?? 0)
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
      .map(([fecha, peso]) => ({ fecha: formatFechaCorta(fecha), peso }))
  }, [sesiones, ejercicioSel])

  const recordEjercicio = useMemo(() => {
    if (!ejercicioSel) return null
    const vals = sesiones
      .filter(s => s.ejercicio_id === ejercicioSel && s.peso_kg != null)
      .map(s => s.peso_kg!)
    return vals.length > 0 ? Math.max(...vals) : null
  }, [sesiones, ejercicioSel])

  const ejArr = chartEjercicio.map(d => d.peso)
  const yMinEj = ejArr.length > 0 ? Math.floor(Math.min(...ejArr) - 2.5) : 0
  const yMaxEj = ejArr.length > 0 ? Math.ceil(Math.max(...ejArr)  + 2.5) : 100

  // ── Datos derivados: nutrición ──
  const consumidoSemana     = nutriData.reduce((s, d) => s + d.consumido, 0)
  const metaSemana          = metaDiaria * 7
  const mantenimientoSemana = tdee * 7
  const deficitSuperavit    = mantenimientoSemana - consumidoSemana
  const comidasMax = Math.max(...nutriData.map(d => d.consumido), metaDiaria, 1)
  const yMaxNutri  = Math.ceil(comidasMax * 1.2)

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
        <h1 className="text-lg font-bold">Fit<span className="text-[#F5C518]">Pro</span> JS</h1>
        <a href="/inicio" className="text-xs text-gray-400">← Inicio</a>
      </div>

      <div className="p-5">
        <h2 className="text-xl font-bold mb-4">Progreso <span className="text-[#F5C518]">Corporal</span></h2>

        {/* TABS */}
        <div className="flex gap-2 mb-5">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors
                ${tab === key
                  ? 'bg-[#F5C518] text-black'
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

                {/* Input peso hoy */}
                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Registrar peso de hoy</p>
                  <div className="flex gap-3 items-center">
                    <input
                      type="number"
                      value={pesoInput}
                      onChange={e => { setPesoInput(e.target.value); setErrorPeso(null) }}
                      onKeyDown={e => e.key === 'Enter' && guardarPeso()}
                      placeholder="Ej: 75.5"
                      step="0.1" min="20" max="500"
                      className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#F5C518]/60 placeholder-gray-600"
                    />
                    <span className="text-gray-500 text-sm shrink-0">kg</span>
                    <button
                      onClick={guardarPeso}
                      disabled={guardando || !pesoInput}
                      className="bg-[#F5C518] text-black font-bold px-5 py-3 rounded-xl text-sm disabled:opacity-40 shrink-0">
                      {guardando ? '...' : 'Guardar'}
                    </button>
                  </div>
                  {errorPeso && <p className="mt-2 text-xs text-red-400">{errorPeso}</p>}
                </div>

                {/* Resumen peso */}
                {pesoActual != null && (
                  <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Peso actual</p>
                        <p className="text-3xl font-black">
                          {pesoActual}
                          <span className="text-sm text-gray-500 font-normal"> kg</span>
                        </p>
                      </div>
                      {cambioPeso != null && (
                        <div className="text-right">
                          <p className={`text-xl font-bold ${cambioPeso < 0 ? 'text-green-400' : cambioPeso > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {cambioPeso > 0 ? '+' : ''}{cambioPeso} kg
                          </p>
                          <p className="text-xs text-gray-500">desde el inicio</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Gráfica peso */}
                {historialPeso.length >= 2 && (
                  <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Evolución del peso</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartPeso} margin={{ top: 5, right: 8, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="fecha" {...AXIS} interval="preserveStartEnd" />
                        <YAxis domain={[yMinPeso, yMaxPeso]} {...AXIS} width={42} tickFormatter={v => `${v}kg`} />
                        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} kg`, 'Peso']} />
                        <Line type="monotone" dataKey="peso" stroke="#F5C518" strokeWidth={2}
                          dot={{ fill: '#F5C518', r: 3, strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: '#F5C518', strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {historialPeso.length === 0 && (
                  <p className="text-center py-12 text-gray-600 text-sm">
                    Registra tu primer peso para comenzar el seguimiento
                  </p>
                )}
                {historialPeso.length === 1 && (
                  <p className="text-center py-6 text-gray-600 text-xs">
                    Registra al menos 2 pesajes para ver la gráfica
                  </p>
                )}
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
                    {/* Selector */}
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Selecciona un ejercicio</p>
                      <select
                        value={ejercicioSel}
                        onChange={e => setEjercicioSel(e.target.value)}
                        className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#F5C518]/60">
                        {ejerciciosList.map(e => (
                          <option key={e.id} value={e.id}>{e.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {/* Récord */}
                    {recordEjercicio != null && (
                      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Récord personal</p>
                            <p className="text-3xl font-black text-[#F5C518]">
                              {recordEjercicio}
                              <span className="text-sm text-gray-500 font-normal"> kg</span>
                            </p>
                          </div>
                          {chartEjercicio.length > 0 && (
                            <div className="text-right">
                              <p className="text-xs text-gray-500 mb-0.5">Último registro</p>
                              <p className="text-lg font-bold text-white">
                                {chartEjercicio[chartEjercicio.length - 1].peso} kg
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Gráfica ejercicio */}
                    {chartEjercicio.length >= 2 && (
                      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Evolución del peso levantado</p>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={chartEjercicio} margin={{ top: 5, right: 8, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="fecha" {...AXIS} interval="preserveStartEnd" />
                            <YAxis domain={[yMinEj, yMaxEj]} {...AXIS} width={42} tickFormatter={v => `${v}kg`} />
                            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} kg`, 'Peso máx.']} />
                            <Line type="monotone" dataKey="peso" stroke="#F5C518" strokeWidth={2}
                              dot={{ fill: '#F5C518', r: 3, strokeWidth: 0 }}
                              activeDot={{ r: 5, fill: '#F5C518', strokeWidth: 0 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {chartEjercicio.length < 2 && (
                      <p className="text-center py-6 text-gray-600 text-xs">
                        {chartEjercicio.length === 0
                          ? 'Sin datos de peso para este ejercicio'
                          : 'Entrena este ejercicio al menos 2 veces para ver la gráfica'}
                      </p>
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
                    {/* Resumen semanal */}
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Resumen — últimos 7 días</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/30 rounded-xl p-3">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Meta semanal</p>
                          <p className="text-base font-bold text-white">{metaSemana.toLocaleString()} kcal</p>
                        </div>
                        <div className="bg-black/30 rounded-xl p-3">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Consumido</p>
                          <p className="text-base font-bold text-[#F5C518]">{consumidoSemana.toLocaleString()} kcal</p>
                        </div>
                        <div className="bg-black/30 rounded-xl p-3">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Mantenimiento sem.</p>
                          <p className="text-base font-bold text-white">{mantenimientoSemana.toLocaleString()} kcal</p>
                        </div>
                        <div className="bg-black/30 rounded-xl p-3">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
                            {deficitSuperavit >= 0 ? 'Déficit total' : 'Superávit total'}
                          </p>
                          <p className={`text-base font-bold ${deficitSuperavit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {Math.abs(deficitSuperavit).toLocaleString()} kcal
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Gráfica calorías diarias */}
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Calorías diarias</p>
                      <p className="text-[10px] text-gray-600 mb-4">
                        Línea punteada = meta ({metaDiaria.toLocaleString()} kcal/día)
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
                          <ReferenceLine y={metaDiaria} stroke="rgba(255,255,255,0.3)" strokeDasharray="5 4" />
                          <Bar dataKey="consumido" fill="#F5C518" radius={[4, 4, 0, 0]} maxBarSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Detalle día a día */}
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
                      {nutriData.map((d, i) => {
                        const excedido = d.consumido > metaDiaria
                        const pct = metaDiaria > 0 ? Math.min((d.consumido / metaDiaria) * 100, 100) : 0
                        return (
                          <div key={d.fecha}
                            className={`px-4 py-3 ${i < nutriData.length - 1 ? 'border-b border-white/5' : ''}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-gray-400">{d.label}</span>
                              <span className={`text-xs font-medium ${
                                d.consumido === 0 ? 'text-gray-600' : excedido ? 'text-red-400' : 'text-white'
                              }`}>
                                {d.consumido === 0
                                  ? 'Sin registros'
                                  : `${d.consumido.toLocaleString()} / ${metaDiaria.toLocaleString()} kcal`}
                              </span>
                            </div>
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${excedido ? 'bg-red-500' : 'bg-[#F5C518]'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
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
