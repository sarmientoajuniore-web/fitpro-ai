// Importa alimentos de Open Food Facts (openfoodfacts.org, licencia ODbL/DbCL) a la tabla
// "alimentos" de Supabase. Filtra por nombre en español, datos nutricionales completos
// (calorias/proteina/carbohidratos/grasas) y pais de Latinoamerica o Espana.
//
// Usa DuckDB para leer y filtrar el parquet remoto de Open Food Facts sin descargarlo
// completo: lee via HTTP range-requests solo las columnas que necesita.
//
// Requiere en .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...
// Requiere que ya exista en Supabase (correr antes en el SQL Editor):
//   alter table alimentos add constraint alimentos_codigo_barras_key unique (codigo_barras);
//
// Es re-ejecutable: usa upsert por codigo_barras, no borra ni duplica nada existente.
//
// Uso:
//   node scripts/import-alimentos.mjs

import { createClient } from '@supabase/supabase-js'
import duckdb from 'duckdb'

process.loadEnvFile('.env.local')

const PARQUET_URL = 'https://huggingface.co/datasets/openfoodfacts/product-database/resolve/main/food.parquet'
const PAISES_OBJETIVO = [
  'en:spain', 'en:chile', 'en:mexico', 'en:argentina', 'en:colombia', 'en:peru',
  'en:venezuela', 'en:uruguay', 'en:ecuador', 'en:bolivia', 'en:paraguay',
  'en:guatemala', 'en:costa-rica', 'en:panama', 'en:dominican-republic',
  'en:honduras', 'en:el-salvador', 'en:nicaragua', 'en:cuba', 'en:puerto-rico',
]
const OBJETIVO_FILAS = 5000
const BATCH_SIZE = 200
const MAX_REINTENTOS = 6

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Resuelve la URL canónica de HF a la URL directa del CDN (sigue el redirect UNA sola vez con
// fetch normal), para que DuckDB no tenga que repetir el HEAD contra el endpoint que rate-limitea.
async function resolverUrlDirecta(url, intentos = 5) {
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.url
    } catch (err) {
      if (i === intentos - 1) throw err
      const esperaMs = 15000 * (i + 1)
      console.warn(`No se pudo resolver la URL del parquet (${err.message}); reintentando en ${esperaMs}ms...`)
      await new Promise((r) => setTimeout(r, esperaMs))
    }
  }
}

// Cada reintento usa una conexión NUEVA: reusar la misma tras un fallo deja a DuckDB con una
// transacción implícita a medio abrir ("cannot start a transaction within a transaction").
function consultarConReintentos(db, sql, intentos = MAX_REINTENTOS) {
  return new Promise((resolve, reject) => {
    const intentar = (restantes) => {
      const con = db.connect()
      con.all(sql, (err, rows) => {
        if (!err) return resolve(rows)
        if (restantes <= 0) return reject(err)
        const esperaMs = 5000 * (MAX_REINTENTOS - restantes + 1)
        console.warn(`Consulta falló (${err.message}); reintentando en ${esperaMs}ms...`)
        setTimeout(() => intentar(restantes - 1), esperaMs)
      })
    }
    intentar(intentos)
  })
}

const DIACRITICOS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g')
const normaliza = (s) =>
  (s || '').toLowerCase().normalize('NFD').replace(DIACRITICOS, '').trim()

async function main() {
  console.log('Resolviendo la URL directa del parquet en Hugging Face...')
  const urlDirecta = await resolverUrlDirecta(PARQUET_URL)
  console.log('URL resuelta, consultando vía DuckDB.')

  const db = new duckdb.Database(':memory:')
  await consultarConReintentos(db, 'INSTALL httpfs; LOAD httpfs;')

  console.log('Consultando y filtrando el catálogo de Open Food Facts (lee solo las columnas necesarias vía HTTP range-requests, puede tardar varios minutos)...')

  const listaPaises = PAISES_OBJETIVO.map((p) => `'${p}'`).join(', ')
  const sql = `
    WITH base AS (
      SELECT
        code, brands, completeness, unique_scans_n,
        list_extract(list_filter(product_name, x -> x.lang = 'es'), 1).text AS nombre_es,
        list_extract(list_filter(nutriments, x -> x.name = 'energy-kcal'), 1)."100g" AS calorias_100g,
        list_extract(list_filter(nutriments, x -> x.name = 'proteins'), 1)."100g" AS proteina_100g,
        list_extract(list_filter(nutriments, x -> x.name = 'carbohydrates'), 1)."100g" AS carbos_100g,
        list_extract(list_filter(nutriments, x -> x.name = 'fat'), 1)."100g" AS grasas_100g,
        list_extract(list_filter(nutriments, x -> x.name = 'fiber'), 1)."100g" AS fibra_100g
      FROM read_parquet('${urlDirecta}')
      WHERE lang = 'es'
        AND (obsolete IS NULL OR obsolete = false)
        AND len(list_intersect(countries_tags, [${listaPaises}])) > 0
    )
    SELECT code, nombre_es, brands, completeness, unique_scans_n,
           calorias_100g, proteina_100g, carbos_100g, grasas_100g, fibra_100g
    FROM base
    WHERE nombre_es IS NOT NULL AND length(trim(nombre_es)) > 0
      AND calorias_100g IS NOT NULL AND calorias_100g BETWEEN 0 AND 900
      AND proteina_100g IS NOT NULL
      AND carbos_100g IS NOT NULL
      AND grasas_100g IS NOT NULL
    QUALIFY row_number() OVER (PARTITION BY code ORDER BY completeness DESC) = 1
    ORDER BY coalesce(unique_scans_n, 0) DESC, completeness DESC
    LIMIT ${OBJETIVO_FILAS}
  `

  const filas = await consultarConReintentos(db, sql)
  console.log(`Candidatos que pasaron el filtro (español, macros completos, sin duplicar código de barras): ${filas.length}`)

  const vistos = new Set()
  const filasUnicas = filas.filter((f) => {
    const clave = `${normaliza(f.nombre_es)}|${normaliza(f.brands)}`
    if (vistos.has(clave)) return false
    vistos.add(clave)
    return true
  })
  console.log(`Tras quitar duplicados adicionales por nombre+marca: ${filasUnicas.length}`)

  const registros = filasUnicas.map((f) => ({
    nombre: f.nombre_es.trim(),
    marca: f.brands ? f.brands.split(',')[0].trim() : null,
    calorias_100g: f.calorias_100g,
    proteina_100g: f.proteina_100g,
    carbos_100g: f.carbos_100g,
    grasas_100g: f.grasas_100g,
    fibra_100g: f.fibra_100g ?? null,
    codigo_barras: f.code || null,
  }))

  let procesados = 0
  for (let i = 0; i < registros.length; i += BATCH_SIZE) {
    const lote = registros.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from('alimentos').upsert(lote, { onConflict: 'codigo_barras' })
    if (error) throw error
    procesados += lote.length
    console.log(`Procesados ${procesados}/${registros.length}`)
  }

  const { count, error: countError } = await supabase
    .from('alimentos')
    .select('*', { count: 'exact', head: true })
  if (countError) throw countError

  console.log(`\nListo. Se procesaron ${procesados} alimentos de Open Food Facts. La tabla "alimentos" tiene ahora ${count} fila(s) en total.`)
}

main().catch((err) => {
  console.error('Error importando alimentos:', err)
  process.exit(1)
})
