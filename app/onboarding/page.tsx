'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

type Actividad = 'sedentario' | 'moderada' | 'alta'
type Objetivo = 'bajar' | 'mantener' | 'subir'

const ACTIVIDADES: { val: Actividad; label: string; sub: string }[] = [
  { val: 'sedentario', label: 'Sedentario',  sub: 'Poco o nada de ejercicio' },
  { val: 'moderada',   label: 'Moderada',    sub: '3–5 días de ejercicio / semana' },
  { val: 'alta',       label: 'Alta',        sub: '6–7 días o trabajo físico' },
]

const OBJETIVOS: { val: Objetivo; label: string; sub: string }[] = [
  { val: 'bajar',    label: 'Bajar de peso', sub: 'Perder grasa de forma saludable' },
  { val: 'mantener', label: 'Mantenerme',    sub: 'Conservar mi peso actual' },
  { val: 'subir',    label: 'Subir de peso', sub: 'Ganar peso / músculo' },
]

const FACTOR_ACT: Record<Actividad, number> = { sedentario: 1.2, moderada: 1.55, alta: 1.725 }
const FACTOR_OBJ: Record<Objetivo, number> = {
  bajar: 0.80, mantener: 1, subir: 1.12,
}
const G_PROTEINA: Record<Actividad, number> = { sedentario: 1.2, moderada: 1.6, alta: 2.0 }

function calcular(
  peso: number, altura: number, edad: number,
  sexo: 'hombre' | 'mujer', actividad: Actividad, objetivo: Objetivo,
) {
  const bmr = Math.round(
    sexo === 'hombre'
      ? 10 * peso + 6.25 * altura - 5 * edad + 5
      : 10 * peso + 6.25 * altura - 5 * edad - 161
  )
  const tdee = Math.round(bmr * FACTOR_ACT[actividad])
  const calRaw = Math.round(tdee * FACTOR_OBJ[objetivo])
  const calorias = Math.max(calRaw, bmr)
  const proteina = Math.round(G_PROTEINA[actividad] * peso)
  const grasas   = Math.round((calorias * 0.25) / 9)
  const carbos   = Math.round((calorias - proteina * 4 - grasas * 9) / 4)
  return { bmr, tdee, calorias, proteina, carbos, grasas }
}

type Resultado = ReturnType<typeof calcular>

export default function OnboardingPage() {
  const router = useRouter()

  const [nombre,   setNombre]   = useState('')
  const [edad,     setEdad]     = useState('')
  const [sexo,     setSexo]     = useState<'hombre' | 'mujer' | ''>('')
  const [altura,   setAltura]   = useState('')
  const [peso,     setPeso]     = useState('')
  const [actividad, setActividad] = useState<Actividad | ''>('')
  const [objetivo,  setObjetivo]  = useState<Objetivo | ''>('')
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const handleSubmit = async () => {
    if (!nombre.trim() || !edad || !sexo || !altura || !peso || !actividad || !objetivo) {
      setError('Por favor completa todos los campos')
      return
    }
    setError(null)
    setGuardando(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const p = parseFloat(peso)
    const h = parseInt(altura)
    const e = parseInt(edad)
    const calc = calcular(p, h, e, sexo as 'hombre' | 'mujer', actividad as Actividad, objetivo as Objetivo)

    const { error: err } = await supabase.from('perfiles').update({
      nombre_completo:    nombre.trim(),
      edad:               e,
      sexo,
      altura_cm:          h,
      peso_kg:            p,
      nivel_actividad:    actividad,
      objetivo,
      bmr:                calc.bmr,
      tdee:               calc.tdee,
      calorias_objetivo:  calc.calorias,
      proteina_objetivo:  calc.proteina,
      carbos_objetivo:    calc.carbos,
      grasas_objetivo:    calc.grasas,
    }).eq('id', user.id)

    setGuardando(false)
    if (err) { setError(err.message); return }
    setResultado(calc)
  }

  if (resultado) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-5">
        <div className="w-full max-w-sm">
          <div className="text-center mb-7">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-black">Tu plan está listo</h2>
            <p className="text-xs text-gray-500 mt-1">Calculado con Mifflin-St Jeor</p>
          </div>

          {/* Metabolismo */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 mb-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Metabolismo</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/30 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{resultado.bmr.toLocaleString()}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">BMR (basal)</div>
              </div>
              <div className="bg-black/30 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{resultado.tdee.toLocaleString()}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">TDEE (mantenimiento)</div>
              </div>
            </div>
          </div>

          {/* Objetivo */}
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#1c1a00] border border-[#F5C518]/30 rounded-2xl p-4 mb-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Calorías</p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500 shrink-0">Mantenimiento</span>
              <span className="text-base font-bold text-white">{resultado.tdee.toLocaleString()} kcal</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-gray-500 shrink-0">Tu meta</span>
              <span className="text-3xl font-black text-[#F5C518]">{resultado.calorias.toLocaleString()}</span>
              <span className="text-sm text-gray-400">kcal</span>
            </div>
          </div>

          {/* Macros */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 mb-6">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Macros diarios</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: resultado.proteina, lbl: 'Proteína', color: 'text-blue-400' },
                { val: resultado.carbos,   lbl: 'Carbos',   color: 'text-[#F5C518]' },
                { val: resultado.grasas,   lbl: 'Grasas',   color: 'text-orange-400' },
              ].map(({ val, lbl, color }) => (
                <div key={lbl} className="bg-black/30 rounded-xl p-3 text-center">
                  <div className={`text-xl font-bold ${color}`}>{val}g</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => router.push('/inicio')}
            className="w-full bg-[#F5C518] text-black font-bold py-4 rounded-2xl text-base">
            Empezar →
          </button>
        </div>
      </div>
    )
  }

  const inputCls = "w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#F5C518]/60 transition-colors placeholder-gray-600"
  const chipBase = "flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors text-center cursor-pointer"
  const chipOn  = "bg-[#F5C518] text-black border-[#F5C518]"
  const chipOff = "bg-[#1a1a1a] text-gray-400 border-white/10 hover:border-white/25"

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-lg mx-auto p-5 pb-12">

        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-2xl font-black">Fit<span className="text-[#F5C518]">Pro</span> JS</h1>
          <p className="text-gray-500 text-sm mt-1">Completa tu perfil para calcular tus macros</p>
        </div>

        <div className="flex flex-col gap-5">

          {/* Nombre */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className={inputCls}
            />
          </div>

          {/* Edad + Altura + Peso en fila */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">Edad</label>
              <input type="number" min="10" max="100" value={edad} onChange={e => setEdad(e.target.value)}
                placeholder="25" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">Altura (cm)</label>
              <input type="number" min="100" max="250" value={altura} onChange={e => setAltura(e.target.value)}
                placeholder="175" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">Peso (kg)</label>
              <input type="number" min="30" max="300" step="0.1" value={peso} onChange={e => setPeso(e.target.value)}
                placeholder="75" className={inputCls} />
            </div>
          </div>

          {/* Sexo */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">Sexo biológico</label>
            <div className="flex gap-3">
              {(['hombre', 'mujer'] as const).map(s => (
                <button key={s} onClick={() => setSexo(s)}
                  className={`${chipBase} ${sexo === s ? chipOn : chipOff}`}>
                  {s === 'hombre' ? '♂ Masculino' : '♀ Femenino'}
                </button>
              ))}
            </div>
          </div>

          {/* Nivel de actividad */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">Nivel de actividad</label>
            <div className="flex flex-col gap-2">
              {ACTIVIDADES.map(a => (
                <button key={a.val} onClick={() => setActividad(a.val)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors
                    ${actividad === a.val ? 'bg-[#F5C518]/10 border-[#F5C518]/50 text-white' : 'bg-[#1a1a1a] border-white/10 text-gray-400 hover:border-white/20'}`}>
                  <span className="font-semibold text-sm">{a.label}</span>
                  <span className="text-xs text-gray-500 ml-2">{a.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Objetivo */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">Objetivo</label>
            <div className="flex flex-col gap-2">
              {OBJETIVOS.map(o => (
                <button key={o.val} onClick={() => setObjetivo(o.val)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors
                    ${objetivo === o.val ? 'bg-[#F5C518]/10 border-[#F5C518]/50 text-white' : 'bg-[#1a1a1a] border-white/10 text-gray-400 hover:border-white/20'}`}>
                  <span className="font-semibold text-sm">{o.label}</span>
                  <span className="text-xs text-gray-500 ml-2">{o.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={guardando}
            className="w-full bg-[#F5C518] text-black font-bold py-4 rounded-2xl text-base disabled:opacity-40">
            {guardando ? 'Calculando...' : 'Calcular y guardar mi plan'}
          </button>
        </div>
      </div>
    </div>
  )
}
