 'use client'

import { useState } from 'react'

const medidas = [
  { lbl: 'Peso corporal', val: '82,4', unidad: 'kg', delta: '-0,6', arriba: false },
  { lbl: 'Grasa corporal', val: '17,2', unidad: '%', delta: '-0,4%', arriba: false },
  { lbl: 'Pecho', val: '101', unidad: 'cm', delta: '+1cm', arriba: true },
  { lbl: 'Cintura', val: '84', unidad: 'cm', delta: '-2cm', arriba: false },
  { lbl: 'Cadera', val: '96', unidad: 'cm', delta: '-1cm', arriba: false },
  { lbl: 'Brazo', val: '38', unidad: 'cm', delta: '+0,5cm', arriba: true },
]

const records = [
  { nombre: 'Press de banca', peso: '95 kg', delta: '+5kg', fecha: 'Hace 3 días' },
  { nombre: 'Peso muerto', peso: '145 kg', delta: '+10kg', fecha: 'Hace 1 semana' },
  { nombre: 'Sentadilla', peso: '120 kg', delta: '+7,5kg', fecha: 'Hace 1 semana' },
  { nombre: 'Press militar', peso: '70 kg', delta: '+5kg', fecha: 'Hace 2 semanas' },
]

const pesoDias = [84.2, 84.0, 83.8, 83.9, 83.6, 83.4, 83.5, 83.2, 83.0, 83.1, 82.9, 82.7, 82.8, 82.6, 82.4]

export default function ProgresoPage() {
  const [tab, setTab] = useState('medidas')

  const maxPeso = Math.max(...pesoDias)
  const minPeso = Math.min(...pesoDias)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white max-w-lg mx-auto">
      <div className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/10 px-5 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Fit<span className="text-[#F5C518]">Pro</span> IA</h1>
        <a href="/inicio" className="text-xs text-gray-400">← Inicio</a>
      </div>

      <div className="p-5">
        <h2 className="text-xl font-bold mb-4">Progreso <span className="text-[#F5C518]">Corporal</span></h2>

        {/* TABS */}
        <div className="flex gap-2 mb-5">
          {['medidas', 'peso', 'records', 'fotos'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-colors
                ${tab === t ? 'bg-[#F5C518] text-black' : 'bg-[#1a1a1a] text-gray-400 border border-white/10'}`}>
              {t === 'medidas' ? 'Medidas' : t === 'peso' ? 'Peso' : t === 'records' ? 'RPs' : 'Fotos'}
            </button>
          ))}
        </div>

        {/* MEDIDAS */}
        {tab === 'medidas' && (
          <div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {medidas.map(({ lbl, val, unidad, delta, arriba }) => (
                <div key={lbl} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{lbl}</div>
                  <div className="text-2xl font-bold mb-1">{val} <span className="text-sm font-normal text-gray-500">{unidad}</span></div>
                  <div className={`text-xs font-semibold flex items-center gap-1 ${arriba ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {arriba ? '↑' : '↓'} {delta} esta semana
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full bg-[#F5C518] text-black font-bold py-3 rounded-xl text-sm">
              + Registrar medidas de hoy
            </button>
          </div>
        )}

        {/* PESO */}
        {tab === 'peso' && (
          <div>
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 mb-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Peso actual</div>
                  <div className="text-3xl font-black">82,4 <span className="text-sm text-gray-500 font-normal">kg</span></div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[#22C55E]">–1,8 kg</div>
                  <div className="text-xs text-gray-500">último mes</div>
                </div>
              </div>
              {/* GRÁFICO SIMPLE */}
              <div className="flex items-end gap-1 h-24">
                {pesoDias.map((p, i) => {
                  const altura = ((p - minPeso) / (maxPeso - minPeso)) * 80 + 20
                  const esUltimo = i === pesoDias.length - 1
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end">
                      <div className="w-full rounded-t-sm transition-all"
                        style={{ height: `${altura}%`, background: esUltimo ? '#F5C518' : 'rgba(245,197,24,0.3)' }}/>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>Hace 15 días</span>
                <span>Hoy</span>
              </div>
            </div>
            <button className="w-full bg-[#F5C518] text-black font-bold py-3 rounded-xl text-sm">
              + Registrar peso de hoy
            </button>
          </div>
        )}

        {/* RÉCORDS */}
        {tab === 'records' && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
            {records.map(({ nombre, peso, delta, fecha }, i) => (
              <div key={i} className={`flex items-center justify-between p-4 ${i < records.length-1 ? 'border-b border-white/10' : ''}`}>
                <div>
                  <div className="text-sm font-semibold">{nombre}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{fecha}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[#F5C518]">{peso}</div>
                  <div className="text-xs text-[#22C55E] font-semibold">↑ {delta} este mes</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FOTOS */}
        {tab === 'fotos' && (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#F5C518] transition-colors">
                <span className="text-2xl">📷</span>
                <span className="text-xs text-gray-500">Añadir foto</span>
              </div>
              {['9 jun', '26 may', '12 may', '28 abr', '14 abr'].map(fecha => (
                <div key={fecha} className="aspect-[3/4] rounded-xl bg-[#1a1a1a] border border-white/10 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-white/30 transition-colors">
                  <span className="text-2xl">🖼️</span>
                  <span className="text-xs text-gray-500">{fecha}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
