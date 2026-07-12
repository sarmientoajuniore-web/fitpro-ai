'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Check, ChevronLeft, Dumbbell, Venus, Mars } from 'lucide-react'
import { RUTINAS_PLANTILLA, type RutinaPlantilla } from '@/lib/rutinasPlantilla'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Props = {
  userId: string
  userSexo: string | null
  onClose: () => void
  onUsada: () => void   // se llama tras crear la rutina (refresca + cierra)
}

export default function GaleriaPlantillas({ userId, userSexo, onClose, onUsada }: Props) {
  const [filtroSexo, setFiltroSexo] = useState<'hombre' | 'mujer'>(userSexo === 'mujer' ? 'mujer' : 'hombre')
  const [preview, setPreview]       = useState<RutinaPlantilla | null>(null)
  const [nombres, setNombres]       = useState<Record<string, string>>({})
  const [cargandoNombres, setCargandoNombres] = useState(false)
  const [usando, setUsando]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const lista = RUTINAS_PLANTILLA.filter(r => r.sexo === filtroSexo)

  // Cargar los nombres reales de los ejercicios al abrir una vista previa
  useEffect(() => {
    if (!preview) return
    const ids = [...new Set(preview.dias.flatMap(d => d.ejercicios.map(e => e.ejercicio_id)))]
    setCargandoNombres(true)
    supabase.from('ejercicios').select('id, nombre').in('id', ids)
      .then(({ data }) => {
        const m: Record<string, string> = {}
        for (const e of data ?? []) m[e.id as string] = e.nombre as string
        setNombres(m)
        setCargandoNombres(false)
      })
  }, [preview])

  const usar = async (plantilla: RutinaPlantilla) => {
    setUsando(true)
    setError(null)
    const { data: rut, error: errRut } = await supabase
      .from('rutinas')
      .insert({ user_id: userId, nombre: plantilla.nombre, dias_semana: plantilla.dias_semana })
      .select('id')
      .single()
    if (errRut || !rut) { setUsando(false); setError('No se pudo crear la rutina. Revisa tu conexión.'); return }

    const filas = plantilla.dias.flatMap(dia =>
      dia.ejercicios.map(ej => ({
        rutina_id: rut.id,
        ejercicio_id: ej.ejercicio_id,
        dia_semana: dia.dia_semana,
        orden: ej.orden,
        series: ej.series,
        repeticiones: ej.repeticiones,
        descanso_segundos: ej.descanso_segundos,
      }))
    )
    const { error: errEj } = await supabase.from('rutina_ejercicios').insert(filas)
    setUsando(false)
    if (errEj) { setError('Error al copiar los ejercicios: ' + errEj.message); return }
    onUsada()
  }

  // Cada nivel = un color relleno (tarjetas modernas con letra blanca)
  // Escala por dificultad en la paleta PorotoFit: rojo -> rojo oscuro -> negro
  const nivelGrad: Record<string, string> = {
    principiante: 'linear-gradient(135deg, #F0453C, #E11D2A)',
    intermedio:   'linear-gradient(135deg, #B3121D, #7E0C14)',
    avanzado:     'linear-gradient(135deg, #2E2E2E, #141414)',
  }
  const nivelSombra: Record<string, string> = {
    principiante: '0 6px 16px rgba(225,29,42,0.30)',
    intermedio:   '0 6px 16px rgba(179,18,29,0.30)',
    avanzado:     '0 6px 16px rgba(20,20,20,0.30)',
  }

  return (
    <div className="fixed inset-0 bg-[#FFFFFF] z-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 shrink-0">
        {preview ? (
          <button onClick={() => { setPreview(null); setError(null) }}
            className="flex items-center gap-1 text-xs text-[#5d6358] hover:text-[#1b201a]">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
        ) : (
          <div>
            <div className="text-[10px] text-[#787f70] uppercase tracking-widest">Elige tu rutina</div>
            <div className="font-bold text-sm">Rutinas listas para empezar</div>
          </div>
        )}
        <button onClick={onClose}
          className="text-xs text-[#787f70] hover:text-[#1b201a] border border-black/10 rounded-lg px-3 py-1.5">
          Cerrar
        </button>
      </div>

      {/* ── GALERÍA ── */}
      {!preview && (
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Toggle hombre / mujer */}
          <div className="flex gap-2 mb-4">
            {(['hombre', 'mujer'] as const).map(s => (
              <button key={s} onClick={() => setFiltroSexo(s)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                style={filtroSexo === s
                  ? {
                      background: 'linear-gradient(135deg, #E11D2A, #B3121D)',
                      borderColor: 'transparent', color: 'white',
                    }
                  : { background: '#FCEBEB', borderColor: 'rgba(225,29,42,0.2)', color: '#9ca3af' }}>
                {s === 'hombre' ? <Mars className="w-4 h-4" /> : <Venus className="w-4 h-4" />}
                {s === 'hombre' ? 'Hombre' : 'Mujer'}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {lista.map(r => (
              <button key={r.id} onClick={() => { setPreview(r); setNombres({}) }}
                className="text-left rounded-2xl p-4 active:scale-[0.99] transition-transform"
                style={{ background: nivelGrad[r.nivel] ?? nivelGrad.intermedio, boxShadow: nivelSombra[r.nivel] ?? nivelSombra.intermedio }}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="font-bold text-[15px] text-white">{r.nombre}</div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white shrink-0"
                    style={{ background: 'rgba(255,255,255,0.25)' }}>
                    {r.nivel}
                  </span>
                </div>
                <div className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.92)' }}>{r.descripcion}</div>
                <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-white">
                  <Dumbbell className="w-3.5 h-3.5" />
                  {r.dias_semana} días por semana
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── VISTA PREVIA ── */}
      {preview && (
        <>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-4">
              <div className="text-xl font-black">{preview.nombre}</div>
              <div className="text-xs text-[#787f70] mt-1">{preview.descripcion}</div>
            </div>

            <div className="flex flex-col gap-3">
              {preview.dias.map((dia, i) => (
                <div key={i} className="bg-[#FFFFFF] border border-black/10 rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-black/[0.06] flex items-center justify-between">
                    <span className="text-sm font-bold">{dia.nombre_dia}</span>
                    <span className="text-[10px] text-[#B3121D] uppercase tracking-wider">{dia.dia_semana}</span>
                  </div>
                  <div className="px-4 py-2">
                    {dia.ejercicios.map((ej, j) => (
                      <div key={j} className="flex items-center gap-2 py-1.5">
                        <span className="text-[#B3121D] text-xs font-bold w-4 text-center shrink-0">{ej.orden}</span>
                        <span className="flex-1 text-sm text-[#2b302a] min-w-0 truncate">
                          {cargandoNombres ? '…' : (nombres[ej.ejercicio_id] ?? 'Ejercicio')}
                        </span>
                        <span className="text-xs text-[#787f70] shrink-0">{ej.series} × {ej.repeticiones}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {error}
              </div>
            )}
          </div>

          <div className="px-5 pb-10 pt-3 shrink-0">
            <button onClick={() => usar(preview)} disabled={usando}
              className="w-full text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #E11D2A, #B3121D)', boxShadow: '0 0 24px rgba(255,107,87,0.4)' }}>
              <Check className="w-5 h-5" />
              {usando ? 'Creando tu rutina…' : 'Usar esta rutina'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
