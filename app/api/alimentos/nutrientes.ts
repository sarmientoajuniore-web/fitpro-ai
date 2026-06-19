export type NutrimentosOFF = Record<string, number | string | undefined>

const KJ_POR_KCAL = 4.184

function num(n: NutrimentosOFF | undefined, key: string): number | undefined {
  const v = n?.[key]
  return typeof v === 'number' ? v : undefined
}

// Algunas entradas de Open Food Facts (ej. ciertas Oreo) no traen energy-kcal_100g
// pero sí traen los macros o la energía en kJ. Resuelve las calorías por 100g
// probando, en orden: kcal directo > conversión desde kJ > estimación desde macros.
export function resolverCaloriasPor100g(n: NutrimentosOFF | undefined): number | undefined {
  const kcal = num(n, 'energy-kcal_100g')
  if (kcal != null && kcal > 0) return kcal

  const kj = num(n, 'energy-kj_100g') ?? num(n, 'energy_100g')
  if (kj != null && kj > 0) return kj / KJ_POR_KCAL

  const prot = num(n, 'proteins_100g')
  const carb = num(n, 'carbohydrates_100g')
  const gras = num(n, 'fat_100g')
  if (prot != null || carb != null || gras != null) {
    return (prot ?? 0) * 4 + (carb ?? 0) * 4 + (gras ?? 0) * 9
  }

  return undefined
}

// Reduce los nutriments crudos de Open Food Facts a solo los 4 campos que usa la app,
// con las calorías ya resueltas de forma robusta (ver resolverCaloriasPor100g).
export function soloMacros(n: NutrimentosOFF | undefined): NutrimentosOFF | undefined {
  const kcal = resolverCaloriasPor100g(n)
  const prot = num(n, 'proteins_100g')
  const carb = num(n, 'carbohydrates_100g')
  const gras = num(n, 'fat_100g')

  const out: NutrimentosOFF = {}
  if (kcal != null) out['energy-kcal_100g'] = kcal
  if (prot != null) out.proteins_100g = prot
  if (carb != null) out.carbohydrates_100g = carb
  if (gras != null) out.fat_100g = gras

  return Object.keys(out).length ? out : undefined
}
