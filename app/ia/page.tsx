 'use client'

import { useState } from 'react'

type Mensaje = {
  rol: 'usuario' | 'ia'
  texto: string
  sugerencia?: {
    titulo: string
    descripcion: string
    cals: number
    proteina: number
    carbos: number
    grasas: number
  }
}

const respuestasIA: Record<string, string> = {
  'pollo': 'Pechuga de pollo a la plancha (180g) tiene aproximadamente 270 kcal, 55g proteína, 0g carbos y 4g grasas. ¿Lo registro en tu almuerzo?',
  'avena': 'Un bowl de avena (100g) tiene 389 kcal, 17g proteína, 66g carbos y 7g grasas. ¿Para el desayuno?',
  'proteína': `Llevas ${Math.round(Math.random()*50+60)}g de proteína hoy. Tu objetivo es 180g. Te faltan unos 100g más. Te recomiendo añadir pollo, huevos o un batido de proteínas.`,
  'calorias': 'Llevas 842 kcal hoy de un objetivo de 2.700 kcal. Vas bien para tu déficit calórico. Tienes 1.858 kcal disponibles.',
  'rutina': 'Hoy toca Empuje (Día 1): Press de banca 4×8-10, Press inclinado 3×10-12, Press militar 4×8. ¿Iniciamos la sesión?',
  'peso': 'Tu peso actual es 82,4 kg. Llevas –1,8 kg en el último mes. ¡Excelente progreso! Estás perdiendo grasa a un ritmo saludable.',
  'descanso': 'Has entrenado 5 días seguidos. Te recomiendo un día de descanso activo hoy — camina 30 minutos o haz movilidad.',
}

function obtenerRespuesta(msg: string): { texto: string; sugerencia?: Mensaje['sugerencia'] } {
  const lower = msg.toLowerCase()
  for (const clave in respuestasIA) {
    if (lower.includes(clave)) {
      return { texto: respuestasIA[clave] }
    }
  }
  if (lower.includes('registr') || lower.includes('comí') || lower.includes('comi') || lower.includes('tomé')) {
    return {
      texto: 'Detecté una comida en tu mensaje. Aquí está mi estimación:',
      sugerencia: {
        titulo: 'Comida detectada',
        descripcion: msg,
        cals: Math.round(Math.random() * 300 + 200),
        proteina: Math.round(Math.random() * 30 + 10),
        carbos: Math.round(Math.random() * 40 + 15),
        grasas: Math.round(Math.random() * 15 + 5),
      }
    }
  }
  return { texto: '¡Entendido! Puedo ayudarte a registrar comidas, revisar tu progreso, analizar tu rutina o responder preguntas de nutrición. ¿En qué te ayudo?' }
}

export default function IAPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      rol: 'ia',
      texto: '¡Hola! Soy tu asistente de fitness con IA. Puedo registrar tus comidas, analizar tu progreso, revisar tu rutina y responder preguntas de nutrición. ¿En qué te ayudo hoy?'
    }
  ])
  const [entrada, setEntrada] = useState('')
  const [cargando, setCargando] = useState(false)

  const enviar = async () => {
    if (!entrada.trim()) return
    const msg = entrada.trim()
    setEntrada('')
    setMensajes(prev => [...prev, { rol: 'usuario', texto: msg }])
    setCargando(true)
    await new Promise(r => setTimeout(r, 800))
    const respuesta = obtenerRespuesta(msg)
    setMensajes(prev => [...prev, { rol: 'ia', texto: respuesta.texto, sugerencia: respuesta.sugerencia }])
    setCargando(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white max-w-lg mx-auto flex flex-col">
      <div className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/10 px-5 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Fit<span className="text-[#F5C518]">Pro</span> IA</h1>
        <a href="/inicio" className="text-xs text-gray-400">← Inicio</a>
      </div>

      <div className="p-5 pb-2">
        <h2 className="text-xl font-bold mb-1">Asistente <span className="text-[#F5C518]">IA</span></h2>
        <p className="text-xs text-gray-500 mb-4">Registra comidas, analiza tu progreso y obtén asesoramiento</p>

        {/* ACCIONES RÁPIDAS */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { icono: '📷', label: 'Foto de plato', msg: 'Analizar foto' },
            { icono: '🔍', label: 'Código de barras', msg: 'Escanear código' },
            { icono: '🎤', label: 'Entrada de voz', msg: 'Me tomé un batido de proteínas con plátano' },
          ].map(({ icono, label, msg }) => (
            <button key={label}
              onClick={() => { setEntrada(msg); }}
              className="bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-center hover:border-[#3B82F6] transition-colors">
              <div className="text-2xl mb-1">{icono}</div>
              <div className="text-[10px] text-gray-400 font-medium">{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* CHAT */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 flex flex-col gap-3">
        {mensajes.map((m, i) => (
          <div key={i} className={`flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed
              ${m.rol === 'usuario'
                ? 'bg-[#3B82F6]/20 border border-[#3B82F6]/30 text-white'
                : 'bg-[#1a1a1a] border border-white/10'}`}>
              {m.rol === 'ia' && (
                <div className="text-[10px] font-bold text-[#60A5FA] uppercase tracking-wider mb-1">FitPro IA</div>
              )}
              {m.texto}
              {m.sugerencia && (
                <div className="mt-3 bg-[#222] rounded-xl p-3 border border-white/10">
                  <div className="text-[10px] text-[#F5C518] font-bold uppercase tracking-wider mb-1">
                    Detección IA · estimación
                  </div>
                  <div className="font-semibold text-sm mb-1">{m.sugerencia.titulo}</div>
                  <div className="text-xs text-gray-400 mb-2">{m.sugerencia.descripcion}</div>
                  <div className="flex gap-2 flex-wrap mb-3">
                    <span className="text-[10px] font-bold bg-[#F5C518]/15 text-[#F5C518] px-2 py-0.5 rounded-full">🔥 {m.sugerencia.cals} kcal</span>
                    <span className="text-[10px] font-bold bg-[#3B82F6]/15 text-blue-400 px-2 py-0.5 rounded-full">P {m.sugerencia.proteina}g</span>
                    <span className="text-[10px] font-bold bg-[#22C55E]/15 text-green-400 px-2 py-0.5 rounded-full">C {m.sugerencia.carbos}g</span>
                    <span className="text-[10px] font-bold bg-[#EF4444]/15 text-red-400 px-2 py-0.5 rounded-full">G {m.sugerencia.grasas}g</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-[#F5C518] text-black font-bold py-2 rounded-lg text-xs">✓ Confirmar</button>
                    <button className="flex-1 bg-[#333] text-white font-semibold py-2 rounded-lg text-xs">Editar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {cargando && (
          <div className="flex justify-start">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3">
              <div className="text-[10px] font-bold text-[#60A5FA] uppercase tracking-wider mb-1">FitPro IA</div>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#F5C518] rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                <div className="w-2 h-2 bg-[#F5C518] rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                <div className="w-2 h-2 bg-[#F5C518] rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INPUT */}
      <div className="sticky bottom-0 bg-[#0a0a0a] border-t border-white/10 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={entrada}
            onChange={e => setEntrada(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enviar()}
            placeholder="Describe tu comida o pregunta algo..."
            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#3B82F6] transition-colors"
          />
          <button onClick={enviar}
            className="w-11 h-11 bg-[#3B82F6] rounded-xl flex items-center justify-center text-white font-bold hover:bg-blue-500 transition-colors">
            ➤
          </button>
        </div>
        <div className="flex gap-2 mt-2">
          {['¿Cuántas calorías llevo?', 'Mi rutina de hoy', '¿Cómo va mi peso?'].map(s => (
            <button key={s} onClick={() => setEntrada(s)}
              className="flex-1 text-[10px] text-gray-500 border border-white/10 rounded-lg py-1.5 px-2 hover:border-white/20 hover:text-gray-300 transition-colors truncate">
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
