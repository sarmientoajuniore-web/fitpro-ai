// Traduce al español los ejercicios importados de free-exercise-db (los que
// tienen "imagenes" no nulo). Los 110 ejercicios originales (imagenes NULL)
// ya estan en español y no se tocan.
//
// Requiere en .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...
//   ANTHROPIC_API_KEY=...
//
// Uso:
//   node scripts/traducir-ejercicios.mjs

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

process.loadEnvFile('.env.local')

const BATCH_SIZE = 10
const PAGE_SIZE = 100
const MODEL = 'claude-haiku-4-5-20251001'
const LOTES_CONCURRENTES = 3
const PAUSA_ENTRE_TANDAS_MS = 800
const MAX_REINTENTOS_RATE_LIMIT = 5
const BACKOFF_BASE_MS = 2000

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anthropicApiKey = process.env.ANTHROPIC_API_KEY

if (!supabaseUrl || !serviceRoleKey || !anthropicApiKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y/o ANTHROPIC_API_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)
const anthropic = new Anthropic({ apiKey: anthropicApiKey })

const DICCIONARIO_CATEGORIA = {
  'strength': 'Fuerza',
  'stretching': 'Estiramiento',
  'plyometrics': 'Pliometría',
  'powerlifting': 'Powerlifting',
  'strongman': 'Strongman',
  'cardio': 'Cardio',
  'olympic weightlifting': 'Halterofilia',
}

const DICCIONARIO_EQUIPO = {
  'body only': 'Peso corporal',
  'machine': 'Máquina',
  'kettlebells': 'Pesa rusa',
  'dumbbell': 'Mancuerna',
  'cable': 'Polea',
  'barbell': 'Barra',
  'bands': 'Banda elástica',
  'medicine ball': 'Balón medicinal',
  'exercise ball': 'Pelota de ejercicio',
  'e-z curl bar': 'Barra Z',
  'foam roll': 'Rodillo de espuma',
  'other': 'Otro',
}

const DICCIONARIO_MUSCULO = {
  'abdominals': 'Abdominales',
  'abductors': 'Abductores',
  'adductors': 'Aductores',
  'biceps': 'Bíceps',
  'calves': 'Pantorrillas',
  'chest': 'Pecho',
  'forearms': 'Antebrazos',
  'glutes': 'Glúteos',
  'hamstrings': 'Isquiotibiales',
  'lats': 'Dorsales',
  'lower back': 'Espalda baja',
  'middle back': 'Espalda media',
  'neck': 'Cuello',
  'quadriceps': 'Cuádriceps',
  'shoulders': 'Hombros',
  'traps': 'Trapecios',
  'triceps': 'Tríceps',
}

const DICCIONARIO_NIVEL = {
  'beginner': 'Principiante',
  'intermediate': 'Intermedio',
  'expert': 'Avanzado',
}

function traducirConDiccionario(valor, diccionario) {
  if (valor == null) return valor
  const traducido = diccionario[valor.toLowerCase()]
  return traducido ?? valor
}

function traducirCamposDiccionario(ejercicio) {
  return {
    categoria: traducirConDiccionario(ejercicio.categoria, DICCIONARIO_CATEGORIA),
    equipo: traducirConDiccionario(ejercicio.equipo, DICCIONARIO_EQUIPO),
    musculo_principal: traducirConDiccionario(ejercicio.musculo_principal, DICCIONARIO_MUSCULO),
    musculos_secundarios: (ejercicio.musculos_secundarios ?? []).map((m) => traducirConDiccionario(m, DICCIONARIO_MUSCULO)),
    nivel: traducirConDiccionario(ejercicio.nivel, DICCIONARIO_NIVEL),
  }
}

function limpiarJSON(texto) {
  return texto.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim()
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function esErrorDeRateLimit(err) {
  return err?.status === 429 || err?.error?.error?.type === 'rate_limit_error'
}

async function traducirLoteConIA(lote) {
  const entrada = lote.map((e) => ({ id: e.id, nombre: e.nombre, instrucciones: e.instrucciones }))

  const mensaje = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    temperature: 0,
    system: 'Eres traductor experto de fitness. Traduce al español de forma natural y profesional con terminología de gimnasio común en Latinoamérica. Mantén el mismo número de elementos y los mismos id. Devuelve SOLO el array JSON.',
    messages: [
      {
        role: 'user',
        content: `Traduce "nombre" e "instrucciones" al español de los siguientes ejercicios. Devuelve ÚNICAMENTE un array JSON válido, sin texto extra y sin \`\`\`, con esta forma exacta:\n[{"id": <id>, "nombre": "...", "instrucciones": "..."}, ...]\n\nEjercicios:\n${JSON.stringify(entrada, null, 2)}`,
      },
    ],
  })

  const texto = mensaje.content[0]?.text ?? ''
  return JSON.parse(limpiarJSON(texto))
}

async function traducirLoteConIAConBackoff(lote, intento = 0) {
  try {
    return await traducirLoteConIA(lote)
  } catch (err) {
    if (esErrorDeRateLimit(err) && intento < MAX_REINTENTOS_RATE_LIMIT) {
      const espera = BACKOFF_BASE_MS * 2 ** intento
      console.warn(`Rate limit (429) de Anthropic, esperando ${espera}ms antes de reintentar (intento ${intento + 1}/${MAX_REINTENTOS_RATE_LIMIT})...`)
      await esperar(espera)
      return traducirLoteConIAConBackoff(lote, intento + 1)
    }
    throw err
  }
}

async function traducirLoteConReintento(lote) {
  try {
    return await traducirLoteConIAConBackoff(lote)
  } catch (err) {
    console.warn('Fallo el parseo/llamada del lote, reintentando una vez...', err.message)
    try {
      return await traducirLoteConIAConBackoff(lote)
    } catch (err2) {
      console.error('El lote volvió a fallar. IDs no traducidos:', lote.map((e) => e.id).join(', '))
      return null
    }
  }
}

async function traerPendientes() {
  let pendientes = []
  let desde = 0

  while (true) {
    const { data, error } = await supabase
      .from('ejercicios')
      .select('id, nombre, instrucciones, categoria, equipo, musculo_principal, musculos_secundarios, nivel')
      .not('imagenes', 'is', null)
      .or('traducido.is.null,traducido.is.false')
      .range(desde, desde + PAGE_SIZE - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    pendientes = pendientes.concat(data)
    if (data.length < PAGE_SIZE) break
    desde += PAGE_SIZE
  }

  return pendientes
}

async function actualizarEjercicio(ejercicio, traduccion, contador) {
  if (!traduccion) {
    contador.error += 1
    console.error(`No se encontró traducción IA para el id ${ejercicio.id}`)
    return
  }

  const update = {
    nombre: traduccion.nombre,
    instrucciones: traduccion.instrucciones,
    ...traducirCamposDiccionario(ejercicio),
    traducido: true,
  }

  const { error: updateError } = await supabase.from('ejercicios').update(update).eq('id', ejercicio.id)

  if (updateError) {
    contador.error += 1
    console.error(`Error actualizando id ${ejercicio.id}:`, updateError.message)
  } else {
    contador.traducidos += 1
  }
}

async function procesarLote(lote, numeroLote, totalLotes, contador) {
  try {
    const traducciones = await traducirLoteConReintento(lote)

    if (!traducciones) {
      contador.error += lote.length
      console.log(`Lote ${numeroLote}/${totalLotes} — falló, ${lote.length} ejercicios sin traducir`)
      return
    }

    const traduccionesPorId = new Map(traducciones.map((t) => [String(t.id), t]))

    await Promise.all(
      lote.map((ejercicio) => actualizarEjercicio(ejercicio, traduccionesPorId.get(String(ejercicio.id)), contador))
    )

    console.log(`Lote ${numeroLote}/${totalLotes} — ${contador.traducidos} ejercicios traducidos`)
  } catch (err) {
    contador.error += lote.length
    console.error(`Error en lote ${numeroLote}/${totalLotes}:`, err.message)
  }
}

async function main() {
  console.log('Buscando ejercicios pendientes de traducir...')
  const pendientes = await traerPendientes()
  console.log(`Total pendientes: ${pendientes.length}`)

  if (pendientes.length === 0) {
    console.log('Listo. No hay ejercicios pendientes.')
    return
  }

  const lotes = []
  for (let i = 0; i < pendientes.length; i += BATCH_SIZE) {
    lotes.push(pendientes.slice(i, i + BATCH_SIZE))
  }
  const totalLotes = lotes.length

  const contador = { traducidos: 0, error: 0 }

  for (let i = 0; i < lotes.length; i += LOTES_CONCURRENTES) {
    const tanda = lotes.slice(i, i + LOTES_CONCURRENTES)

    await Promise.all(
      tanda.map((lote, indice) => procesarLote(lote, i + indice + 1, totalLotes, contador))
    )

    if (i + LOTES_CONCURRENTES < lotes.length) {
      await esperar(PAUSA_ENTRE_TANDAS_MS)
    }
  }

  console.log(`\nTotal traducidos: ${contador.traducidos}`)
  if (contador.error > 0) console.log(`Total con error: ${contador.error}`)
  console.log('Listo.')
}

main().catch((err) => {
  console.error('Error traduciendo ejercicios:', err)
  process.exit(1)
})
