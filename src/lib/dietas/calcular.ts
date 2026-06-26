// Motor de cálculo de macros y objetivos nutricionales personalizados.
// No tiene dependencias externas: funciones puras, testables de forma aislada.
// Usa la misma fórmula Mifflin-St Jeor que el onboarding para que los resultados
// sean consistentes con los valores ya guardados en la tabla "perfiles".

// ─── Tipos públicos ─────────────────────────────────────────────────────────

export type NivelActividad = 'sedentario' | 'moderada' | 'alta'
export type Objetivo = 'bajar' | 'mantener' | 'subir'
export type Sexo = 'hombre' | 'mujer'

export type Perfil = {
  peso_kg:         number
  altura_cm:       number
  edad:            number
  sexo:            Sexo
  nivel_actividad: NivelActividad
  objetivo:        Objetivo
}

export type MacrosObjetivo = {
  bmr:     number  // metabolismo basal (kcal)
  tdee:    number  // gasto total diario (kcal) — el "mantenimiento real"
  calorias: number  // meta calórica según objetivo
  proteina: number  // g/día
  carbos:   number  // g/día
  grasas:   number  // g/día
  diferencia_calorias: number  // vs TDEE: negativo = déficit, positivo = superávit
}

export type MacrosConsumidos = {
  calorias: number
  proteina: number
  carbos:   number
  grasas:   number
}

export type ProgresoDiario = {
  consumido:  MacrosConsumidos
  restante: {
    calorias: number
    proteina: number
    carbos:   number
    grasas:   number
  }
  porcentaje: {
    calorias: number
    proteina: number
    carbos:   number
    grasas:   number
  }
}

// ─── Constantes del motor ───────────────────────────────────────────────────

// Factores de actividad física (escala de Harris-Benedict)
const FACTOR_ACTIVIDAD: Record<NivelActividad, number> = {
  sedentario: 1.2,    // trabajo de oficina, poco ejercicio
  moderada:   1.55,   // 3-5 días de ejercicio por semana
  alta:       1.725,  // 6-7 días o trabajo físico intenso
}

// Ajuste calórico sobre el TDEE según el objetivo.
// bajar: -20% ≈ -500 kcal para la mayoría → déficit seguro de ~0,5 kg/semana.
// subir: +12% ≈ +300 kcal → "lean bulk" que minimiza la ganancia de grasa.
const FACTOR_OBJETIVO: Record<Objetivo, number> = {
  bajar:    0.80,
  mantener: 1.00,
  subir:    1.12,
}

// Proteína en g por kg de peso corporal.
// Sedentario: mínimo para preservar músculo.
// Moderada: soporte a la recuperación y adaptación.
// Alta: maximizar síntesis proteica muscular (evidencia ISSN 2023).
const G_PROTEINA_POR_KG: Record<NivelActividad, number> = {
  sedentario: 1.2,
  moderada:   1.6,
  alta:       2.0,
}

// Las grasas cubren el 25% de las calorías totales: nivel mínimo para
// la producción hormonal y absorción de vitaminas liposolubles.
const FRACCION_GRASAS = 0.25

// ─── Función principal ──────────────────────────────────────────────────────

/**
 * Dado el perfil del usuario calcula las calorías objetivo del día
 * y la distribución de macros (proteína, carbos, grasas) en gramos.
 *
 * Orden de prioridad en la distribución:
 *   1. Proteína (fija por kg de peso y nivel de actividad)
 *   2. Grasas   (25% de las calorías totales)
 *   3. Carbos   (el resto de calorías disponibles)
 *
 * La meta calórica nunca baja del BMR, incluso en objetivos de pérdida,
 * para evitar déficits extremos.
 */
export function calcularMacros(perfil: Perfil): MacrosObjetivo {
  const { peso_kg, altura_cm, edad, sexo, nivel_actividad, objetivo } = perfil

  // Mifflin-St Jeor (1990) — el más preciso para población general
  const bmr = Math.round(
    sexo === 'hombre'
      ? 10 * peso_kg + 6.25 * altura_cm - 5 * edad + 5
      : 10 * peso_kg + 6.25 * altura_cm - 5 * edad - 161
  )

  const tdee     = Math.round(bmr * FACTOR_ACTIVIDAD[nivel_actividad])
  const calRaw   = Math.round(tdee * FACTOR_OBJETIVO[objetivo])
  const calorias = Math.max(calRaw, bmr)  // piso de seguridad

  const proteina = Math.round(G_PROTEINA_POR_KG[nivel_actividad] * peso_kg)
  const grasas   = Math.round((calorias * FRACCION_GRASAS) / 9)
  const carbos   = Math.max(
    Math.round((calorias - proteina * 4 - grasas * 9) / 4),
    0
  )

  return {
    bmr,
    tdee,
    calorias,
    proteina,
    carbos,
    grasas,
    diferencia_calorias: calorias - tdee,
  }
}

// ─── Progreso del día ────────────────────────────────────────────────────────

/**
 * Dado el objetivo calculado y lo que la persona ya consumió en el día,
 * devuelve cuánto falta, cuánto se pasó y el porcentaje de cumplimiento.
 * El restante nunca es negativo (si ya se superó el objetivo, restante = 0).
 */
export function calcularProgreso(
  objetivo: MacrosObjetivo,
  consumido: MacrosConsumidos,
): ProgresoDiario {
  const pct = (val: number, obj: number) =>
    Math.round((val / Math.max(obj, 1)) * 100)

  return {
    consumido,
    restante: {
      calorias: Math.max(objetivo.calorias - consumido.calorias, 0),
      proteina: Math.max(objetivo.proteina  - consumido.proteina, 0),
      carbos:   Math.max(objetivo.carbos    - consumido.carbos,   0),
      grasas:   Math.max(objetivo.grasas    - consumido.grasas,   0),
    },
    porcentaje: {
      calorias: pct(consumido.calorias, objetivo.calorias),
      proteina: pct(consumido.proteina, objetivo.proteina),
      carbos:   pct(consumido.carbos,   objetivo.carbos),
      grasas:   pct(consumido.grasas,   objetivo.grasas),
    },
  }
}

// ─── Utilidades de presentación ──────────────────────────────────────────────

/**
 * Texto descriptivo del déficit o superávit para mostrar en UI.
 * Ej: "-500 kcal/día · ≈ 0,5 kg por semana"
 */
export function textoObjetivoCalorico(macros: MacrosObjetivo): string {
  const { diferencia_calorias, objetivo } = macros as MacrosObjetivo & { objetivo?: Objetivo }
  if (Math.abs(diferencia_calorias) < 50) return 'Calorías de mantenimiento'
  const signo = diferencia_calorias > 0 ? '+' : ''
  const kcal  = `${signo}${diferencia_calorias} kcal/día`

  // 1 kg de tejido adiposo ≈ 7.700 kcal; 1 kg de músculo ≈ 5.000 kcal
  const kcalPorKg = (objetivo as string) === 'subir' ? 5000 : 7700
  const kgPorSemana = Math.abs((diferencia_calorias * 7) / kcalPorKg).toFixed(2)
    .replace('.', ',')

  const accion = diferencia_calorias < 0 ? 'perder' : 'ganar'
  return `${kcal}  ·  aprox. ${kgPorSemana} kg/semana (${accion})`
}

/**
 * Distribución calórica de cada macro como porcentaje del total,
 * útil para gráficas de dona o barras de progreso.
 */
export function distribucionMacros(macros: MacrosObjetivo): {
  proteina: number
  carbos:   number
  grasas:   number
} {
  const total = macros.proteina * 4 + macros.carbos * 4 + macros.grasas * 9
  if (total === 0) return { proteina: 33, carbos: 34, grasas: 33 }
  return {
    proteina: Math.round((macros.proteina * 4 / total) * 100),
    carbos:   Math.round((macros.carbos   * 4 / total) * 100),
    grasas:   Math.round((macros.grasas   * 9 / total) * 100),
  }
}

/**
 * Distribuye las calorías objetivo entre las comidas del día en proporciones
 * estándar: desayuno 25%, almuerzo 35%, cena 30%, snack 10%.
 * Devuelve las kcal sugeridas por comida, no los gramos de macros.
 */
export function caloriasporComida(caloriasTotal: number): {
  desayuno: number
  almuerzo: number
  cena:     number
  snack:    number
} {
  return {
    desayuno: Math.round(caloriasTotal * 0.25),
    almuerzo: Math.round(caloriasTotal * 0.35),
    cena:     Math.round(caloriasTotal * 0.30),
    snack:    Math.round(caloriasTotal * 0.10),
  }
}
