 'use client'

import { useState } from 'react'

const rutinas = [
  {
    nombre: 'Empuje / Jale / Piernas',
    meta: 'Hipertrofia · 6 días',
    dias: 6, ejercicios: 18, minutos: 52, semanas: 14,
    activa: true,
    ejerciciosList: ['Press de banca', 'Press inclinado', 'Fondos', 'Dominadas', 'Remo con barra', 'Sentadilla']
  },
  {
    nombre: 'Fuerza Tren Superior',
    meta: 'Fuerza · 4 días',
    dias: 4, ejercicios: 12, minutos: 45, semanas: 3,
    activa: false,
    ejerciciosList: ['Press de banca', 'Peso muerto', 'Press militar', 'Dominadas']
  },
  {
    nombre: 'Cardio y Movilidad',
    meta: 'Recuperación · 2 días',
    dias: 2, ejercicios: 8, minutos: 30, semanas: 6,
    activa: false,
    ejerciciosList: ['Carrera continua', 'Estiramiento isquios', 'Rotación cadera']
  },
]

export default function RutinasPage() {
  const [expandida, setExpandida] = useState<number | null>(0)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white max-w-lg mx-auto">
      <div className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/10 px-5 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Fit<span className="text-[#F5C518]">Pro</span> IA</h1>
        <a href="/inicio" className="text-xs text-gray-400">← Inicio</a>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Mis <span className="text-[#F5C518]">Rutinas</span></h2>
          <button className="text-xs text-gray-400 border border-white/10 px-3 py-1.5 rounded-lg hover:border-white/20">
            Populares
          </button>
        </div>

        {/* LISTA DE RUTINAS */}
        <div className="flex flex-col gap-3 mb-4">
          {rutinas.map((r, i) => (
            <div key={i} className={`bg-[#1a1a1a] border rounded-2xl overflow-hidden transition-colors
              ${r.activa ? 'border-[#F5C518]/30' : 'border-white/10'}`}>
              
              {/* HEADER */}
              <div className="p-4 cursor-pointer" onClick={() => setExpandida(expandida === i ? null : i)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    {r.activa && (
                      <span className="text-[10px] font-bold bg-[#F5C518]/15 text-[#F5C518] px-2 py-0.5 rounded-full uppercase tracking-wider mr-2">
                        Activa
                      </span>
                    )}
                    <div className="font-bold text-sm mt-1">{r.nombre}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{r.meta}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="w-7 h-7 rounded-lg bg-[#222] flex items-center justify-center text-sm hover:bg-[#333]"
                      onClick={e => { e.stopPropagation() }}>📋</button>
                    <button className="w-7 h-7 rounded-lg bg-[#222] flex items-center justify-center text-sm hover:bg-[#333]"
                      onClick={e => { e.stopPropagation() }}>🔗</button>
                  </div>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: r.dias, lbl: 'Días' },
                    { val: r.ejercicios, lbl: 'Ejercicios' },
                    { val: r.minutos, lbl: 'Min/sesión' },
                    { val: `${r.semanas}s`, lbl: 'Activa' },
                  ].map(({ val, lbl }) => (
                    <div key={lbl} className="bg-[#222] rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-[#F5C518]">{val}</div>
                      <div className="text-[9px] text-gray-500 uppercase tracking-wide mt-0.5">{lbl}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* EXPANDIDO */}
              {expandida === i && (
                <div className="border-t border-white/10">
                  <div className="p-4 pb-2">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Ejercicios principales</div>
                    {r.ejerciciosList.map((ej, j) => (
                      <div key={j} className="flex items-center gap-3 py-2 border-b border-white/5">
                        <div className="w-6 h-6 rounded-full bg-[#F5C518]/15 text-[#F5C518] text-xs flex items-center justify-center font-bold">
                          {j + 1}
                        </div>
                        <span className="text-sm">{ej}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 flex gap-2">
                    <button className="flex-1 bg-[#F5C518] text-black font-bold py-2.5 rounded-xl text-sm">
                      ▶ Iniciar sesión
                    </button>
                    <button className="flex-1 bg-[#222] text-white font-semibold py-2.5 rounded-xl text-sm border border-white/10">
                      ✏️ Editar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CREAR NUEVA */}
        <button className="w-full border border-dashed border-[#F5C518]/30 rounded-xl py-4 text-[#F5C518] text-sm font-semibold flex items-center justify-center gap-2 hover:border-[#F5C518] hover:bg-[#F5C518]/5 transition-colors">
          ＋ Crear nueva rutina
        </button>
      </div>
    </div>
  )
}
