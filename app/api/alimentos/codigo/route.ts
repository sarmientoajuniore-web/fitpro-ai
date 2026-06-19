import { NextRequest } from 'next/server'
import { soloMacros, type NutrimentosOFF } from '../nutrientes'

const USER_AGENT = 'FitProJS/1.0 (app de fitness)'
const TIMEOUT_MS = 9000

type OFFProducto = {
  code?: string
  product_name?: string
  brands?: string
  nutriments?: NutrimentosOFF
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim() ?? ''
  if (!code) {
    return Response.json({ status: 0, error: 'Código no proporcionado.' }, { status: 400 })
  }

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,brands,nutriments`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    })

    if (!res.ok) {
      return Response.json(
        { status: 0, error: 'Open Food Facts no respondió correctamente. Intenta de nuevo.' },
        { status: 502 }
      )
    }

    const data = await res.json()
    const productoRaw: OFFProducto | null = data.product ?? null
    const producto = productoRaw
      ? {
          code: productoRaw.code ?? code,
          product_name: productoRaw.product_name ?? '',
          brands: productoRaw.brands ?? '',
          nutriments: soloMacros(productoRaw.nutriments),
        }
      : null

    return Response.json({ status: data.status ?? 0, product: producto })
  } catch (err) {
    const agotado = err instanceof Error && err.name === 'AbortError'
    return Response.json(
      {
        status: 0,
        error: agotado
          ? 'Open Food Facts no respondió a tiempo. Intenta de nuevo.'
          : 'No se pudo conectar con Open Food Facts.',
      },
      { status: 502 }
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
