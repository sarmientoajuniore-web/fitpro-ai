import { NextRequest } from 'next/server'
import { soloMacros, type NutrimentosOFF } from '../nutrientes'

// Open Food Facts exige un User-Agent identificable; sin él (o desde el navegador, por CORS) rechaza la petición.
const USER_AGENT = 'FitProJS/1.0 (app de fitness)'
const TIMEOUT_MS = 9000

type OFFHit = {
  code?: string
  product_name?: string
  product_name_es?: string
  brands?: string | string[]
  nutriments?: NutrimentosOFF
}

function normalizarMarca(b?: string | string[]) {
  if (!b) return ''
  return Array.isArray(b) ? b.join(', ') : b
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return Response.json({ products: [] })
  }

  // Pedimos más resultados de los que mostramos porque luego filtramos los que no traen
  // nombre ni datos nutricionales (ver más abajo).
  const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=45&langs=es&fields=code,product_name,product_name_es,brands,nutriments`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    })

    if (!res.ok) {
      return Response.json(
        { error: 'Open Food Facts no respondió correctamente. Intenta de nuevo.', products: [] },
        { status: 502 }
      )
    }

    const data = await res.json()
    const hits: OFFHit[] = Array.isArray(data?.hits) ? data.hits : []

    // Solo mostramos productos con nombre y con calorías o macros válidos
    // (soloMacros ya devuelve undefined cuando no hay ni calorías ni macros).
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
  } catch (err) {
    const agotado = err instanceof Error && err.name === 'AbortError'
    return Response.json(
      {
        error: agotado
          ? 'Open Food Facts no respondió a tiempo. Intenta de nuevo.'
          : 'No se pudo conectar con Open Food Facts.',
        products: [],
      },
      { status: 502 }
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
