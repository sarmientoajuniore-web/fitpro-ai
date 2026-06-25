// Rellena la columna "porcion_g" de la tabla "alimentos" a partir de los campos
// serving_size / serving_quantity de Open Food Facts, SOLO para los alimentos que
// ya tienen codigo_barras. No toca el resto de columnas ni crea filas nuevas.
//
// "serving_quantity" es el número de la porción tal cual aparece en "serving_size"
// (ej. serving_size="75 g" -> serving_quantity="75.0"; serving_size="5 ml" ->
// serving_quantity="5.0"). La unidad no viene aparte, hay que leerla del texto de
// serving_size para saber si son gramos, kg, ml, cl o litros y convertir a gramos
// (para volumen se asume densidad ~1, igual que la mayoría de apps de nutrición).
//
// Requiere en .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...
// Requiere que ya exista en Supabase (correr antes en el SQL Editor):
//   alter table alimentos add column if not exists porcion_g numeric;
//
// Es re-ejecutable: vuelve a calcular y a upsertear por codigo_barras, no
// duplica ni borra nada existente (solo escribe codigo_barras + porcion_g).
//
// Uso:
//   node scripts/import-porciones.mjs

import { createClient } from '@supabase/supabase-js'
import duckdb from 'duckdb'

process.loadEnvFile('.env.local')

const PARQUET_URL = 'https://huggingface.co/datasets/openfoodfacts/product-database/resolve/main/food.parquet'
const BATCH_SIZE = 200
const MAX_REINTENTOS = 6

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

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

// Nunca inserta filas nuevas: envía UPDATE ... WHERE codigo_barras = X en paralelo.
// Si el código no existe, Supabase simplemente no toca nada (safe by default).
async function updateBatch(lote, intentos = 3) {
  const CONCURRENCIA = 20
  for (let i = 0; i < lote.length; i += CONCURRENCIA) {
    const chunk = lote.slice(i, i + CONCURRENCIA)
    await Promise.all(
      chunk.map(async ({ codigo_barras, porcion_g }) => {
        for (let intento = 0; intento < intentos; intento++) {
          const { error } = await supabase
            .from('alimentos')
            .update({ porcion_g })
            .eq('codigo_barras', codigo_barras)
          if (!error) return
          if (intento === intentos - 1) throw error
          await new Promise((r) => setTimeout(r, 3000 * (intento + 1)))
        }
      })
    )
  }
}

// Convierte serving_size + serving_quantity a gramos. La unidad no viene en un campo
// aparte, así que se lee del texto de serving_size (ej. "75 g", "1 bar (23 g)", "5 ml").
function porcionAGramos(servingSize, servingQuantity) {
  const cantidad = parseFloat(servingQuantity)
  if (!Number.isFinite(cantidad) || cantidad <= 0) return null

  const texto = (servingSize || '').toLowerCase()
  if (/\bkg\b/.test(texto)) return cantidad * 1000
  if (/\bg\b|\bgr\b|gramos?/.test(texto)) return cantidad
  if (/\bl\b|litros?/.test(texto)) return cantidad * 1000
  if (/\bcl\b/.test(texto)) return cantidad * 10
  if (/\bml\b|mililitros?/.test(texto)) return cantidad // aproximación: 1 ml ≈ 1 g

  return null // unidad desconocida, no se inventa un valor
}

// Trae TODOS los codigo_barras existentes en "alimentos" (paginado, el límite de
// PostgREST por defecto es 1000 filas por respuesta).
async function obtenerCodigosExistentes() {
  const codigos = []
  const PAGE = 1000
  let desde = 0
  while (true) {
    const { data, error } = await supabase
      .from('alimentos')
      .select('codigo_barras')
      .not('codigo_barras', 'is', null)
      .range(desde, desde + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    codigos.push(...data.map((r) => r.codigo_barras))
    if (data.length < PAGE) break
    desde += PAGE
  }
  return codigos
}

async function main() {
  console.log('Leyendo codigo_barras existentes en la tabla "alimentos"...')
  const codigos = await obtenerCodigosExistentes()
  console.log(`Alimentos con código de barras: ${codigos.length}`)
  if (codigos.length === 0) {
    console.log('No hay nada que actualizar.')
    return
  }

  console.log('Resolviendo la URL directa del parquet en Hugging Face...')
  const urlDirecta = await resolverUrlDirecta(PARQUET_URL)
  console.log('URL resuelta, consultando vía DuckDB.')

  const db = new duckdb.Database(':memory:')
  await consultarConReintentos(db, 'INSTALL httpfs; LOAD httpfs;')

  const listaCodigos = codigos.map((c) => `'${String(c).replace(/'/g, "''")}'`).join(', ')
  const sql = `
    SELECT code, serving_size, serving_quantity
    FROM read_parquet('${urlDirecta}')
    WHERE code IN (${listaCodigos})
      AND serving_quantity IS NOT NULL
    QUALIFY row_number() OVER (PARTITION BY code ORDER BY completeness DESC) = 1
  `

  console.log('Buscando serving_size/serving_quantity en Open Food Facts para esos códigos (puede tardar varios minutos, es un scan completo del parquet remoto)...')
  const filas = await consultarConReintentos(db, sql)
  console.log(`Productos encontrados en Open Food Facts con datos de porción: ${filas.length}`)

  const actualizaciones = []
  let sinUnidadReconocida = 0
  for (const f of filas) {
    const gramos = porcionAGramos(f.serving_size, f.serving_quantity)
    if (gramos == null) {
      sinUnidadReconocida++
      continue
    }
    actualizaciones.push({ codigo_barras: f.code, porcion_g: Math.round(gramos * 10) / 10 })
  }
  console.log(`Con porción convertible a gramos: ${actualizaciones.length} (descartados por unidad no reconocida: ${sinUnidadReconocida})`)

  let procesados = 0
  for (let i = 0; i < actualizaciones.length; i += BATCH_SIZE) {
    const lote = actualizaciones.slice(i, i + BATCH_SIZE)
    await updateBatch(lote)
    procesados += lote.length
    console.log(`Procesados ${procesados}/${actualizaciones.length}`)
  }

  console.log(`\nListo. ${codigos.length} alimentos tenían código de barras; ${filas.length} se encontraron en Open Food Facts con dato de porción; ${procesados} quedaron con "porcion_g" actualizado.`)
}

main().catch((err) => {
  console.error('Error importando porciones:', err)
  process.exit(1)
})
