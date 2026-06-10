 'use client'

import { useState } from 'react'

const comidas = [
  {
    nombre: 'Desayuno', hora: '8:30 AM', icono: '🍳',
    items: [
      { nombre: 'Avena con frutas', porcion: '100g + 80g', cals: 310, p: 8, c: 58, g: 5 },
      { nombre: 'Yogur griego', porcion: '150g', cals: 87, p: 15, c: 5, g: 0 },
      { nombre: 'Café negro', porcion: '240ml', cals: 5, p: 0, c: 0, g: 0 },
    ]
  },
  {
    nombre: 'Almuerzo', hora: '1:00 PM', icono: '🥗',
    items: [
      { nombre: 'Pechuga de pollo', porcion: '180g', cals: 270, p: 55, c: 0, g: 4 },
      { nombre: 'Arroz integral', porcion: '150g cocido', cals: 170, p: 4, c: 36, g: 1 },
    ]
  },
  {
    nombre: 'Cena', hora: '', icono: '🍽️',
    items: []
  },
]

export default function NutricionPage() {
  const [abierto, setAbierto] = useState<number[]>([0, 1])

  const toggleComida = (i: number) => {
    setAbierto(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  const totalCals = comidas.flatMap(c => c.items).reduce((sum, i) => sum + i.cals, 0)
  const totalP = comidas.flatMap(c => c.items).reduce((sum, i) => sum + i.p, 0)
  const totalC = comidas.flatMap(c => c.items).reduce((sum, i) => sum + i.c, 0)
  const totalG = comidas.flatMap(c => c.items).reduce((sum, i) => sum + i.g, 0)

  const objetivo = 2700

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white max-w-lg mx-auto">
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
              <div className="text-3xl font-black">{totalCals} <span className="text-sm text-gray-500 font-normal">/ {objetivo}</span></div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-[#22C55E]">–{objetivo - totalCals}</div>
              <div className="text-xs text-gray-500">déficit</div>
            </div>
          </div>
          <div className="h-2 bg-[#222] rounded-full overflow-hidden mb-4">
            <div className="h-full bg-[#F5C518] rounded-full transition-all" style={{ width: `${Math.min((totalCals/objetivo)*100, 100)}%` }}/>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { lbl: 'Proteína', val: totalP, obj: 180, color: '#3B82F6' },
              { lbl: 'Carbos', val: totalC, obj: 290, color: '#22C55E' },
              { lbl: 'Grasas', val: totalG, obj: 90, color: '#EF4444' },
            ].map(({ lbl, val, obj, color }) => (
              <div key={lbl}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{lbl}</span>
                  <span className="font-bold" style={{ color }}>{val}g</span>
                </div>
                <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min((val/obj)*100,100)}%`, background: color }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COMIDAS */}
        {comidas.map((comida, i) => (
          <div key={i} className="bg-[#1a1a1a] border border-white/10 rounded-xl mb-3 overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => toggleComida(i)}>
              <div>
                <div className="font-semibold text-sm">{comida.icono} {comida.nombre}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {comida.items.length > 0 ? `${comida.items.length} alimentos · ${comida.hora}` : 'Sin registrar'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-[#F5C518]">
                  {comida.items.reduce((s, item) => s + item.cals, 0)} kcal
                </span>
                <span className="text-gray-500">{abierto.includes(i) ? '▲' : '▼'}</span>
              </div>
            </div>

            {abierto.includes(i) && (
              <div className="border-t border-white/10">
                {comida.items.map((item, j) => (
                  <div key={j} className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <div>
                      <div className="text-sm font-medium">{item.nombre}</div>
                      <div className="text-xs text-gray-500">{item.porcion}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{item.cals} kcal</div>
                      <div className="text-xs text-gray-500">P{item.p} · C{item.c} · G{item.g}</div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 px-4 py-3 text-[#3B82F6] text-sm cursor-pointer hover:bg-white/5">
                  <span>＋</span> Añadir alimento
                </div>
              </div>
            )}
          </div>
        ))}

        {/* BOTÓN IA */}
        <div className="mt-4 bg-[#1a1a1a] border border-[#3B82F6]/30 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-[#3B82F6] transition-colors">
          <div className="text-2xl">🧠</div>
          <div>
            <div className="text-sm font-semibold">Registrar con IA</div>
            <div className="text-xs text-gray-500">Foto, voz o descripción de tu comida</div>
          </div>
          <span className="ml-auto text-gray-500">›</span>
        </div>
      </div>
    </div>
  )
}
