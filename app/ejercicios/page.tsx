 'use client'

import { useState } from 'react'

const ejercicios = [
  { nombre: 'Press de banca', musculos: 'Pectorales, tríceps, deltoides', cat: 'Pecho', nivel: 'Intermedio', equipo: 'Barra', icono: '🏋️', tags: ['Compuesto', 'Fuerza'] },
  { nombre: 'Press inclinado mancuernas', musculos: 'Pectorales superiores, tríceps', cat: 'Pecho', nivel: 'Principiante', equipo: 'Mancuernas', icono: '💪', tags: ['Compuesto', 'Hipertrofia'] },
  { nombre: 'Aperturas en polea', musculos: 'Pectorales, deltoides anterior', cat: 'Pecho', nivel: 'Principiante', equipo: 'Polea', icono: '🔧', tags: ['Aislamiento'] },
  { nombre: 'Dominadas', musculos: 'Dorsal ancho, bíceps, romboides', cat: 'Espalda', nivel: 'Intermedio', equipo: 'Peso corporal', icono: '⬆️', tags: ['Compuesto', 'Calistenia'] },
  { nombre: 'Remo con barra', musculos: 'Dorsal ancho, romboides, bíceps', cat: 'Espalda', nivel: 'Intermedio', equipo: 'Barra', icono: '🔁', tags: ['Compuesto', 'Fuerza'] },
  { nombre: 'Jalón al pecho', musculos: 'Dorsal ancho, teres mayor, bíceps', cat: 'Espalda', nivel: 'Principiante', equipo: 'Polea', icono: '⬇️', tags: ['Compuesto'] },
  { nombre: 'Peso muerto', musculos: 'Erectores, glúteos, isquios, trapecios', cat: 'Espalda', nivel: 'Avanzado', equipo: 'Barra', icono: '🏗️', tags: ['Compuesto', 'Fuerza'] },
  { nombre: 'Sentadilla', musculos: 'Cuádriceps, glúteos, isquios', cat: 'Piernas', nivel: 'Intermedio', equipo: 'Barra', icono: '🦵', tags: ['Compuesto', 'Fuerza'] },
  { nombre: 'Peso muerto rumano', musculos: 'Isquiotibiales, glúteos, erectores', cat: 'Piernas', nivel: 'Intermedio', equipo: 'Barra', icono: '🔻', tags: ['Compuesto'] },
  { nombre: 'Prensa de piernas', musculos: 'Cuádriceps, glúteos, isquios', cat: 'Piernas', nivel: 'Principiante', equipo: 'Máquina', icono: '🦵', tags: ['Compuesto'] },
  { nombre: 'Press militar', musculos: 'Deltoides, tríceps, trapecios', cat: 'Hombros', nivel: 'Intermedio', equipo: 'Barra', icono: '⬆️', tags: ['Compuesto', 'Fuerza'] },
  { nombre: 'Elevaciones laterales', musculos: 'Deltoides medio', cat: 'Hombros', nivel: 'Principiante', equipo: 'Mancuernas', icono: '↔️', tags: ['Aislamiento'] },
  { nombre: 'Face pull', musculos: 'Deltoides posterior, manguito rotador', cat: 'Hombros', nivel: 'Principiante', equipo: 'Polea', icono: '😤', tags: ['Aislamiento'] },
  { nombre: 'Curl de bíceps', musculos: 'Bíceps braquial, braquial', cat: 'Brazos', nivel: 'Principiante', equipo: 'Mancuernas', icono: '💪', tags: ['Aislamiento'] },
  { nombre: 'Press francés', musculos: 'Tríceps braquial', cat: 'Brazos', nivel: 'Principiante', equipo: 'Barra', icono: '🔽', tags: ['Aislamiento'] },
  { nombre: 'Plancha', musculos: 'Transverso abdominal, erectores', cat: 'Core', nivel: 'Principiante', equipo: 'Peso corporal', icono: '🧘', tags: ['Isométrico'] },
  { nombre: 'Crunch en polea', musculos: 'Recto abdominal, oblicuos', cat: 'Core', nivel: 'Principiante', equipo: 'Polea', icono: '🔧', tags: ['Aislamiento'] },
  { nombre: 'Carrera continua', musculos: 'Cuádriceps, isquios, gemelos', cat: 'Cardio', nivel: 'Principiante', equipo: 'Ninguno', icono: '🏃', tags: ['Cardio', 'LISS'] },
  { nombre: 'HIIT Sprints', musculos: 'Cuerpo completo, cardiovascular', cat: 'Cardio', nivel: 'Avanzado', equipo: 'Ninguno', icono: '⚡', tags: ['Cardio', 'HIIT'] },
  { nombre: 'Muscle-up', musculos: 'Pecho, espalda, hombros, tríceps', cat: 'Calistenia', nivel: 'Avanzado', equipo: 'Peso corporal', icono: '🤸', tags: ['Calistenia', 'Avanzado'] },
]

const categorias = ['Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core', 'Cardio', 'Calistenia']

export default function EjerciciosPage() {
  const [catActual, setCatActual] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')

  const lista = ejercicios.filter(e => {
    const matchCat = catActual === 'Todos' || e.cat === catActual
    const matchBusq = e.nombre.toLowerCase().includes(busqueda.toLowerCase()) || e.musculos.toLowerCase().includes(busqueda.toLowerCase())
    return matchCat && matchBusq
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white max-w-lg mx-auto">
      <div className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/10 px-5 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Fit<span className="text-[#F5C518]">Pro</span> IA</h1>
        <a href="/inicio" className="text-xs text-gray-400">← Inicio</a>
      </div>

      <div className="p-5">
        <h2 className="text-xl font-bold mb-4">Biblioteca de <span className="text-[#F5C518]">Ejercicios</span></h2>

        {/* BUSCADOR */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
          <input
            type="text"
            placeholder="Buscar ejercicios..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white outline-none focus:border-[#F5C518] transition-colors"
          />
        </div>

        {/* FILTROS */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {categorias.map(cat => (
            <button key={cat} onClick={() => setCatActual(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors
                ${catActual === cat ? 'bg-[#F5C518] text-black' : 'bg-[#1a1a1a] text-gray-400 border border-white/10'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* LISTA */}
        <div className="flex flex-col gap-3">
          {lista.map((e, i) => (
            <div key={i} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 flex gap-3 items-start hover:border-white/20 transition-colors cursor-pointer">
              <div className="w-11 h-11 rounded-lg bg-[#222] flex items-center justify-center text-xl flex-shrink-0">
                {e.icono}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm mb-1">{e.nombre}</div>
                <div className="text-xs text-gray-500 mb-2">{e.musculos}</div>
                <div className="flex gap-1 flex-wrap">
                  <span className="text-[10px] bg-[#F5C518]/15 text-[#F5C518] px-2 py-0.5 rounded-full">{e.nivel}</span>
                  <span className="text-[10px] bg-[#3B82F6]/15 text-blue-400 px-2 py-0.5 rounded-full">{e.equipo}</span>
                  {e.tags.map(t => (
                    <span key={t} className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
              <span className="text-gray-600 text-lg">›</span>
            </div>
          ))}
          {lista.length === 0 && (
            <div className="text-center text-gray-500 py-10">No se encontraron ejercicios</div>
          )}
        </div>
      </div>
    </div>
  )
}
