'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const OBJETIVO = { cals: 2700, p: 180, c: 290, g: 90 }

type Alimento = {
  id: string
  nombre: string
  calorias_por_100g: number
  proteinas_por_100g: number
  carbos_por_100g: number
  grasas_por_100g: number
}

type RegistroComida = {
  id: string
  tipo_comida: string
  cantidad_gramos: number
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
  hora_registro: string
  alimentos: { nombre: string }
}

const TIPOS = [
  { key: 'desayuno', label: 'Desayuno', icono: '🍳', hora: '8:30 AM' },
  { key: 'almuerzo', label: 'Almuerzo', icono: '🥗', hora: '1:00 PM' },
  { key: 'cena',     label: 'Cena',     icono: '🍽️', hora: '7:00 PM' },
  { key: 'snack',    label: 'Snack',    icono: '🍎', hora: '' },
]

export default function NutricionPage() {
  const [registros, setRegistros] = useState<RegistroComida[]>([])
  const [abierto, setAbierto] = useState<string[]>(['desayuno', 'almuerzo'])
  const [modal, setModal] = useState<string | null>(null) // tipo_comida activo
  const [busqueda, setBusqueda] = useState('')
  const [alimentos, setAlimentos] = useState<Alimento[]>([])
  const [seleccionado, setSeleccionado] = useState<Alimento | null>(null)
  const [gramos, setGramos] = useState('100')
  const [guardando, setGuardando] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Obtener usuario actual
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  // Cargar registros del día
  const cargarRegistros = useCallback(async () => {
    if (!userId) return
    const hoy = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('registro_comidas')
      .select('*, alimentos(nombre)')
      .eq('usuario_id', userId)
      .gte('hora_registro', `${hoy}T00:00:00`)
      .lte('hora_registro', `${hoy}T23:59:59`)
      .order('hora_registro', { ascending: true })
    if (data) setRegistros(data)
  }, [userId])

  useEffect(() => {
    cargarRegistros()
  }, [cargarRegistros])

  // Buscar alimentos
  useEffect(() => {
    if (busqueda.length < 2) { setAlimentos([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('alimentos')
        .select('*')
        .ilike('nombre', `%${busqueda}%`)
        .limit(10)
      if (data) setAlimentos(data)
    }, 300)
    return () => clearTimeout(timer)
  }, [busqueda])

  const registrosPorTipo = (tipo: string) =>
    registros.filter(r => r.tipo_comida === tipo)

  const totalCals = registros.reduce((s, r) => s + r.calorias, 0)
  const totalP = registros.reduce((s, r) => s + r.proteinas, 0)
  const totalC = registros.reduce((s, r) => s + r.carbohidratos, 0)
  const totalG = registros.reduce((s, r) => s + r.grasas, 0)

  const toggleComida = (key: string) =>
    setAbierto(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])

  const abrirModal = (tipo: string) => {
    setModal(tipo)
    setBusqueda('')
    setAlimentos([])
    setSeleccionado(null)
    setGramos('100')
  }

  const calcularMacros = (alimento: Alimento, g: number) => ({
    calorias: Math.round(alimento.calorias_por_100g * g / 100),
    proteinas: Math.round(alimento.proteinas_por_100g * g / 100),
    carbohidratos: Math.round(alimento.carbos_por_100g * g / 100),
    grasas: Math.round(alimento.grasas_por_100g * g / 100),
  })

  const guardarRegistro = async () => {
    if (!seleccionado || !userId || !modal) return
    setGuardando(true)
    const g = parseFloat(gramos) || 100
    const macros = calcularMacros(seleccionado, g)
    await supabase.from('registro_comidas').insert({
      usuario_id: userId,
      alimento_id: seleccionado.id,
      tipo_comida: modal,
      cantidad_gramos: g,
      ...macros,
      hora_registro: new Date().toISOString(),
    })
    setGuardando(false)
    setModal(null)
    cargarRegistros()
  }

  const eliminarRegistro = async (id: string) => {
    await supabase.from('registro_comidas').delete().eq('id', id)
    cargarRegistros()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white max-w-lg mx-auto">
      {/* HEADER */}
      <div className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/10 px-5 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Fit<span className="text-[#F5C518]">Pro</span> IA</h1>
        <a href="/inicio" className="text-xs text-gray-400">← Inicio</a>
      </div>

      <div className="p-5">
        <h2 className="text-xl font-bold mb-4">Registro <span className="text-[#F5C518]">Nutricional</span></h2>

        {/* RESUMEN DEL DÍA */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Calorías hoy</div>
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
          const calsTipo = items.reduce((s, r) => s + r.calorias, 0)
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
                    <div key={item.id} className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                      <div>
                        <div className="text-sm font-medium">{item.alimentos?.nombre}</div>
                        <div className="text-xs text-gray-500">{item.cantidad_gramos}g</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-bold">{item.calorias} kcal</div>
                          <div className="text-xs text-gray-500">P{item.proteinas} · C{item.carbohidratos} · G{item.grasas}</div>
                        </div>
                        <button onClick={() => eliminarRegistro(item.id)} className="text-gray-600 hover:text-red-400 text-lg leading-none">×</button>
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

        {/* BOTÓN IA */}
        <a href="/ia" className="mt-4 bg-[#1a1a1a] border border-[#3B82F6]/30 rounded-xl p-4 flex items-center gap-3 hover:border-[#3B82F6] transition-colors">
          <div className="text-2xl">🧠</div>
          <div>
            <div className="text-sm font-semibold">Registrar con IA</div>
            <div className="text-xs text-gray-500">Foto, voz o descripción de tu comida</div>
          </div>
          <span className="ml-auto text-gray-500">›</span>
        </a>
      </div>

      {/* MODAL AÑADIR ALIMENTO */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Añadir alimento</h3>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>

            {/* BUSCADOR */}
            <input
              type="text"
              placeholder="Buscar alimento..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[#F5C518]/50 mb-3"
              autoFocus
            />

            {/* RESULTADOS */}
            {alimentos.length > 0 && !seleccionado && (
              <div className="max-h-48 overflow-y-auto mb-3 rounded-xl border border-white/10 divide-y divide-white/5">
                {alimentos.map(a => (
                  <button key={a.id} onClick={() => setSeleccionado(a)}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors">
                    <div className="text-sm font-medium">{a.nombre}</div>
                    <div className="text-xs text-gray-500">{a.calorias_por_100g} kcal · P{a.proteinas_por_100g} · C{a.carbos_por_100g} · G{a.grasas_por_100g} (por 100g)</div>
                  </button>
                ))}
              </div>
            )}

            {busqueda.length >= 2 && alimentos.length === 0 && !seleccionado && (
              <div className="text-center text-gray-500 text-sm py-4 mb-3">No se encontraron alimentos</div>
            )}

            {/* ALIMENTO SELECCIONADO */}
            {seleccionado && (
              <div className="mb-4">
                <div className="bg-[#111] border border-[#F5C518]/30 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{seleccionado.nombre}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {calcularMacros(seleccionado, parseFloat(gramos) || 100).calorias} kcal ·
                        P{calcularMacros(seleccionado, parseFloat(gramos) || 100).proteinas} ·
                        C{calcularMacros(seleccionado, parseFloat(gramos) || 100).carbohidratos} ·
                        G{calcularMacros(seleccionado, parseFloat(gramos) || 100).grasas}
                      </div>
                    </div>
                    <button onClick={() => setSeleccionado(null)} className="text-gray-500 text-sm">cambiar</button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-400 whitespace-nowrap">Cantidad (g)</label>
                  <input
                    type="number"
                    value={gramos}
                    onChange={e => setGramos(e.target.value)}
                    className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-[#F5C518]/50"
                  />
                </div>
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
    </div>
  )
}

