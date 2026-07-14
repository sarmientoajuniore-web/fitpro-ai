import { NextRequest } from 'next/server'
import { soloMacros, type NutrimentosOFF } from '../nutrientes'

// Open Food Facts exige un User-Agent identificable; sin él (o desde el navegador, por CORS) rechaza la petición.
const USER_AGENT = 'PorotoFit/1.0 (contacto@porotofit.cl)'
const TIMEOUT_MS = 9000
// El 503 del clásico cae ~1 de cada 2 veces y vuelve rápido (~0.9s), así que
// reintentar sale barato. Los fallos vienen en ráfaga (medido: con espera fija de
// 250ms fallaba 1 de cada 10 aunque la probabilidad independiente daba 3%), por eso
// la espera crece: hay que salirse de la ventana mala, no reintentar dentro de ella.
const INTENTOS_CLASICO = 5
const ESPERAS_MS = [200, 500, 1100, 2000]

type OFFHit = {
  code?: string
  product_name?: string
  product_name_es?: string
  brands?: string | string[]
  nutriments?: NutrimentosOFF
}

// Open Food Facts tiene dos buscadores y ninguno aguanta solo:
//  - cgi/search.pl (el clásico) devuelve buenos resultados pero tira 503 de forma
//    intermitente: falla y anda alternadamente con el mismo request.
//  - search.openfoodfacts.org (el nuevo, "Search-a-licious") se cae por días enteros
//    con 502 desde su nginx.
// Por eso: reintentamos el clásico y, si no hay caso, caemos al nuevo.
// api/v2/search NO sirve de reemplazo: acepta search_terms pero lo ignora y devuelve
// la base entera (4,6M productos) sin filtrar.
function urlClasico(q: string) {
  return `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
    `&json=1&page_size=45&lc=es&fields=code,product_name,product_name_es,brands,nutriments`
}

function urlNuevo(q: string) {
  return `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}` +
    `&page_size=45&langs=es&fields=code,product_name,product_name_es,brands,nutriments`
}

function normalizarMarca(b?: string | string[]) {
  if (!b) return ''
  return Array.isArray(b) ? b.join(', ') : b
}

// Las dos APIs devuelven la lista bajo distinta clave: products (clásico) / hits (nuevo).
function extraerHits(data: unknown): OFFHit[] | null {
  if (!data || typeof data !== 'object') return null
  const d = data as { products?: unknown; hits?: unknown }
  if (Array.isArray(d.products)) return d.products as OFFHit[]
  if (Array.isArray(d.hits)) return d.hits as OFFHit[]
  return null
}

async function pedir(url: string): Promise<OFFHit[] | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!res.ok) return null
    return extraerHits(await res.json())
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

async function buscarEnOFF(q: string): Promise<OFFHit[] | null> {
  for (let i = 0; i < INTENTOS_CLASICO; i++) {
    const hits = await pedir(urlClasico(q))
    if (hits) return hits
    if (i < INTENTOS_CLASICO - 1) await new Promise(r => setTimeout(r, ESPERAS_MS[i]))
  }
  return pedir(urlNuevo(q))
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return Response.json({ products: [] })
  }

  const hits = await buscarEnOFF(q)

  if (!hits) {
    return Response.json(
      {
        error: 'El buscador de alimentos no está disponible en este momento. Puedes escanear el código de barras o usar Mi lista.',
        products: [],
      },
      { status: 502 }
    )
  }

  // Pedimos más resultados de los que mostramos porque acá filtramos los que no traen
  // nombre ni datos nutricionales (soloMacros devuelve undefined cuando no hay nada).
  const products = hits
    .map(h => ({
      code: h.code ?? null,
      product_name: h.product_name_es?.trim() || h.product_name?.trim() || '',
      brands: normalizarMarca(h.brands),
      nutriments: soloMacros(h.nutriments),
    }))
    .filter(p => p.product_name !== '' && p.nutriments !== undefined)
    .slice(0, 25)

  return Response.json({ products })
}
