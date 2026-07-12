'use client'

import { useState, useEffect } from 'react'
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
  { val: 'bajar',    label: 'Bajar de peso',    sub: 'Perder grasa de forma saludable' },
  { val: 'mantener', label: 'Mantener tu peso', sub: 'Conservar mi peso actual' },
  { val: 'subir',    label: 'Subir de peso',    sub: 'Ganar peso / músculo' },
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

  const [nombre,    setNombre]    = useState('')
  const [edad,      setEdad]      = useState('')
  const [sexo,      setSexo]      = useState<'hombre' | 'mujer' | ''>('')
  const [altura,    setAltura]    = useState('')
  const [peso,      setPeso]      = useState('')
  const [actividad, setActividad] = useState<Actividad | ''>('')
  const [objetivo,  setObjetivo]  = useState<Objetivo | ''>('')
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [perfilCompleto, setPerfilCompleto] = useState(false)

  // Precarga los datos actuales del perfil (para corregir/recalcular sin empezar de cero)
  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase
        .from('perfiles')
        .select('nombre_completo, edad, sexo, altura_cm, peso_kg, nivel_actividad, objetivo')
        .eq('id', user.id)
        .maybeSingle()
      if (!p) return
      // Perfil ya calculado antes → el usuario viene a revisar/recalcular (puede volver)
      if (p.edad != null && p.altura_cm != null && p.peso_kg != null) setPerfilCompleto(true)
      if (p.nombre_completo) setNombre(p.nombre_completo)
      if (p.edad != null)    setEdad(String(p.edad))
      if (p.sexo === 'hombre' || p.sexo === 'mujer') setSexo(p.sexo)
      if (p.altura_cm != null) setAltura(String(p.altura_cm))
      if (p.peso_kg != null)   setPeso(String(p.peso_kg))
      const act = p.nivel_actividad as Actividad
      if (act === 'sedentario' || act === 'moderada' || act === 'alta') setActividad(act)
      const obj = p.objetivo as Objetivo
      if (obj === 'bajar' || obj === 'mantener' || obj === 'subir') setObjetivo(obj)
    }
    cargar()
  }, [])

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
      <div
        className="min-h-screen text-[#1b201a] flex flex-col items-center justify-center p-5"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,107,87, 0.18) 0%, transparent 65%), #FFF8F3' }}
      >
        <div className="w-full max-w-sm">
          <div className="text-center mb-7">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-black">Tu plan está listo</h2>
            <p className="text-xs text-[#787f70] mt-1">Calculado con Mifflin-St Jeor</p>
          </div>

          <div className="bg-[#FFF1EC] border border-[#FF6B57]/20 rounded-2xl p-4 mb-3">
            <p className="text-[10px] text-[#787f70] uppercase tracking-widest mb-3">Metabolismo</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/[0.04] rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-[#1b201a]">{resultado.bmr.toLocaleString()}</div>
                <div className="text-[10px] text-[#787f70] mt-0.5">BMR (basal)</div>
              </div>
              <div className="bg-black/[0.04] rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-[#1b201a]">{resultado.tdee.toLocaleString()}</div>
                <div className="text-[10px] text-[#787f70] mt-0.5">TDEE (mantenimiento)</div>
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl p-4 mb-3 border border-[#FF6B57]/30"
            style={{ background: 'linear-gradient(135deg, #FFF1EC, #FDE6DB)' }}
          >
            <p className="text-[10px] text-[#787f70] uppercase tracking-widest mb-3">Calorías</p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-[#787f70] shrink-0">Mantenimiento</span>
              <span className="text-base font-bold text-[#1b201a]">{resultado.tdee.toLocaleString()} kcal</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-[#787f70] shrink-0">Tu meta</span>
              <span className="text-3xl font-black text-[#E14E2C]">{resultado.calorias.toLocaleString()}</span>
              <span className="text-sm text-[#5d6358]">kcal</span>
            </div>
          </div>

          <div className="bg-[#FFF1EC] border border-[#FF6B57]/20 rounded-2xl p-4 mb-6">
            <p className="text-[10px] text-[#787f70] uppercase tracking-widest mb-3">Macros diarios</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: resultado.proteina, lbl: 'Proteína', color: 'text-[#2ECC9B]' },
                { val: resultado.carbos,   lbl: 'Carbos',   color: 'text-[#E14E2C]' },
                { val: resultado.grasas,   lbl: 'Grasas',   color: 'text-orange-400' },
              ].map(({ val, lbl, color }) => (
                <div key={lbl} className="bg-black/[0.04] rounded-xl p-3 text-center">
                  <div className={`text-xl font-bold ${color}`}>{val}g</div>
                  <div className="text-[10px] text-[#787f70] mt-0.5">{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => router.push('/inicio')}
            className="w-full text-white font-bold py-4 rounded-2xl text-base"
            style={{
              background: 'linear-gradient(135deg, #FF6B57, #E14E2C)',
              boxShadow: '0 0 24px rgba(255,107,87, 0.4)',
            }}
          >
            Empezar →
          </button>
        </div>
      </div>
    )
  }

  const inputCls = "w-full bg-[#FFF3EC] border border-[#FF6B57]/20 rounded-xl px-4 py-3 text-[#1b201a] text-sm outline-none focus:border-[#FF6B57] transition-colors placeholder-[#9ba192]"

  return (
    <div
      className="min-h-screen text-[#1b201a]"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,107,87, 0.18) 0%, transparent 65%), #FFF8F3' }}
    >
      <div className="max-w-lg mx-auto p-5 pb-12">

        {perfilCompleto && (
          <button
            onClick={() => router.push('/inicio')}
            className="flex items-center gap-1 text-sm font-semibold text-[#E14E2C] hover:opacity-80 transition-opacity pt-1">
            ← Volver
          </button>
        )}

        <div className="text-center py-8">
          <h1 className="text-2xl font-black">Fit<span className="text-[#E14E2C]">Pro</span></h1>
          <p className="text-[#787f70] text-sm mt-1">Completa tu perfil para calcular tus macros</p>
        </div>

        <div className="flex flex-col gap-5">

          <div>
            <label className="text-xs text-[#5d6358] uppercase tracking-widest mb-2 block">Nombre completo</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre" className={inputCls} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[#5d6358] uppercase tracking-widest mb-2 block">Edad</label>
              <input type="number" min="10" max="100" value={edad} onChange={e => setEdad(e.target.value)}
                placeholder="25" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[#5d6358] uppercase tracking-widest mb-2 block">Altura (cm)</label>
              <input type="number" min="100" max="250" value={altura} onChange={e => setAltura(e.target.value)}
                placeholder="175" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[#5d6358] uppercase tracking-widest mb-2 block">Peso (kg)</label>
              <input type="number" min="30" max="300" step="0.1" value={peso} onChange={e => setPeso(e.target.value)}
                placeholder="75" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-xs text-[#5d6358] uppercase tracking-widest mb-2 block">Sexo biológico</label>
            <div className="flex gap-3">
              {(['hombre', 'mujer'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSexo(s)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all text-center cursor-pointer"
                  style={sexo === s
                    ? { background: 'linear-gradient(135deg, #FF6B57, #E14E2C)', borderColor: '#FF6B57', color: 'white' }
                    : { background: '#FFF3EC', borderColor: 'rgba(255,107,87,0.2)', color: '#9ca3af' }
                  }
                >
                  {s === 'hombre' ? '♂ Masculino' : '♀ Femenino'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-[#5d6358] uppercase tracking-widest mb-2 block">Nivel de actividad</label>
            <div className="flex flex-col gap-2">
              {ACTIVIDADES.map(a => (
                <button
                  key={a.val}
                  onClick={() => setActividad(a.val)}
                  className="w-full text-left px-4 py-3 rounded-xl border transition-all"
                  style={actividad === a.val
                    ? { background: 'rgba(255,107,87,0.14)', borderColor: 'rgba(255,107,87,0.7)', color: '#E14E2C' }
                    : { background: '#FFF3EC', borderColor: 'rgba(255,107,87,0.2)', color: '#9ca3af' }
                  }
                >
                  <span className="font-semibold text-sm">{a.label}</span>
                  <span className="text-xs text-[#787f70] ml-2">{a.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-[#5d6358] uppercase tracking-widest mb-2 block">Objetivo</label>
            <div className="flex flex-col gap-2">
              {OBJETIVOS.map(o => (
                <button
                  key={o.val}
                  onClick={() => setObjetivo(o.val)}
                  className="w-full text-left px-4 py-3 rounded-xl border transition-all"
                  style={objetivo === o.val
                    ? { background: 'rgba(255,107,87,0.14)', borderColor: 'rgba(255,107,87,0.7)', color: '#E14E2C' }
                    : { background: '#FFF3EC', borderColor: 'rgba(255,107,87,0.2)', color: '#9ca3af' }
                  }
                >
                  <span className="font-semibold text-sm">{o.label}</span>
                  <span className="text-xs text-[#787f70] ml-2">{o.sub}</span>
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
            className="w-full text-white font-bold py-4 rounded-2xl text-base disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #FF6B57, #E14E2C)',
              boxShadow: '0 0 24px rgba(255,107,87, 0.4)',
            }}
          >
            {guardando ? 'Calculando...' : 'Calcular y guardar mi plan'}
          </button>
        </div>
      </div>
    </div>
  )
}
