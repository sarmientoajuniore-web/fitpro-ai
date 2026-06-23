// Importa los ejercicios de free-exercise-db (github.com/yuhonas/free-exercise-db,
// dominio publico / Unlicense) directamente a Supabase via la API, sin pasar por
// el SQL Editor. Es re-ejecutable: antes de insertar borra los ejercicios
// importados previamente (los que tienen "imagenes" no nulo).
//
// Requiere en .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...
//
// Uso:
//   node scripts/import-ejercicios.mjs

import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('.env.local')

const JSON_URL = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json'
const IMG_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/'
const MAX_IMAGENES = 3
const BATCH_SIZE = 100

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const strOrNull = (valor) => (valor == null || valor === '' ? null : valor)

function mapEjercicio(ex) {
  return {
    nombre: strOrNull(ex.name),
    musculo_principal: strOrNull(ex.primaryMuscles?.[0] ?? null),
    musculos_secundarios: ex.secondaryMuscles ?? [],
    categoria: strOrNull(ex.category ?? null),
    equipo: strOrNull(ex.equipment ?? null),
    nivel: strOrNull(ex.level ?? null),
    instrucciones: strOrNull((ex.instructions ?? []).join(' ')),
    consejos: null, // free-exercise-db no trae un campo equivalente a "consejos"
    imagenes: (ex.images ?? []).slice(0, MAX_IMAGENES).map((ruta) => `${IMG_BASE}${ruta}`),
  }
}

async function main() {
  console.log('Descargando', JSON_URL)
  const res = await fetch(JSON_URL)
  if (!res.ok) throw new Error(`No se pudo descargar exercises.json (HTTP ${res.status})`)
  const ejercicios = await res.json()
  console.log(`Total ejercicios en free-exercise-db: ${ejercicios.length}`)

  console.log('Borrando ejercicios importados previamente (imagenes no nulo)...')
  const { error: deleteError } = await supabase.from('ejercicios').delete().not('imagenes', 'is', null)
  if (deleteError) throw deleteError

  const filas = ejercicios.map(mapEjercicio)

  let insertados = 0
  for (let i = 0; i < filas.length; i += BATCH_SIZE) {
    const lote = filas.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from('ejercicios').insert(lote)
    if (error) throw error
    insertados += lote.length
    console.log(`Insertados ${insertados}/${filas.length}`)
  }

  const { count, error: countError } = await supabase
    .from('ejercicios')
    .select('*', { count: 'exact', head: true })
  if (countError) throw countError

  console.log(`\nListo. La tabla "ejercicios" tiene ahora ${count} fila(s).`)
}

main().catch((err) => {
  console.error('Error importando ejercicios:', err)
  process.exit(1)
})
