// Genera SQL de INSERT para la tabla "ejercicios" a partir de free-exercise-db
// (github.com/yuhonas/free-exercise-db, dominio publico / Unlicense).
//
// No modifica Supabase ni borra nada: solo escribe archivos .sql en esta misma
// carpeta para que los corras manualmente en el SQL Editor de Supabase.
//
// Uso:
//   node scripts/generate-ejercicios-sql.mjs

import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const JSON_URL = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json'
const IMG_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/'
const CHUNK_SIZE = 150
const MAX_IMAGENES = 3

function esc(valor) {
  return String(valor).replace(/'/g, "''")
}

function sqlStr(valor) {
  if (valor == null || valor === '') return 'NULL'
  return `'${esc(valor)}'`
}

function sqlArray(arr) {
  if (!arr || arr.length === 0) return 'ARRAY[]::text[]'
  return `ARRAY[${arr.map(v => `'${esc(v)}'`).join(', ')}]::text[]`
}

function filaSQL(ex) {
  const nombre = sqlStr(ex.name)
  const musculoPrincipal = sqlStr(ex.primaryMuscles?.[0] ?? null)
  const musculosSecundarios = sqlArray(ex.secondaryMuscles ?? [])
  const categoria = sqlStr(ex.category ?? null)
  const equipo = sqlStr(ex.equipment ?? null)
  const nivel = sqlStr(ex.level ?? null)
  const instrucciones = sqlStr((ex.instructions ?? []).join(' '))
  const consejos = 'NULL' // free-exercise-db no trae un campo equivalente a "consejos"
  const imagenes = sqlArray(
    (ex.images ?? []).slice(0, MAX_IMAGENES).map(ruta => `${IMG_BASE}${ruta}`)
  )
  return `(${nombre}, ${musculoPrincipal}, ${musculosSecundarios}, ${categoria}, ${equipo}, ${nivel}, ${instrucciones}, ${consejos}, ${imagenes})`
}

async function main() {
  console.log('Descargando', JSON_URL)
  const res = await fetch(JSON_URL)
  if (!res.ok) throw new Error(`No se pudo descargar exercises.json (HTTP ${res.status})`)
  const ejercicios = await res.json()
  console.log(`Total ejercicios en free-exercise-db: ${ejercicios.length}`)

  const columnas = '(nombre, musculo_principal, musculos_secundarios, categoria, equipo, nivel, instrucciones, consejos, imagenes)'
  const totalPartes = Math.ceil(ejercicios.length / CHUNK_SIZE)
  const archivos = []

  for (let i = 0; i < totalPartes; i++) {
    const inicio = i * CHUNK_SIZE
    const lote = ejercicios.slice(inicio, inicio + CHUNK_SIZE)
    const filas = lote.map(filaSQL)
    const sql =
`-- Ejercicios de free-exercise-db (github.com/yuhonas/free-exercise-db, dominio publico)
-- Parte ${i + 1} de ${totalPartes} (${lote.length} ejercicios)
-- Generado por scripts/generate-ejercicios-sql.mjs -- no borra nada, solo agrega filas nuevas.
INSERT INTO ejercicios ${columnas} VALUES
${filas.join(',\n')};
`
    const nombreArchivo = `insert_ejercicios_part${i + 1}.sql`
    const ruta = join(__dirname, nombreArchivo)
    writeFileSync(ruta, sql, 'utf8')
    archivos.push(nombreArchivo)
    console.log(`Escrito ${nombreArchivo} (${lote.length} filas, ${(sql.length / 1024).toFixed(1)} KB)`)
  }

  console.log(`\nListo: ${archivos.length} archivo(s) en scripts/`)
  archivos.forEach(a => console.log(' -', a))
}

main().catch(err => {
  console.error('Error generando el SQL:', err)
  process.exit(1)
})
