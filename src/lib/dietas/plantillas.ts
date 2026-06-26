// Plantillas de dieta diaria.
// Los `gramos_base` están calibrados para una persona con objetivo de ~2000 kcal/día.
// La función `calcularDieta` escala todas las porciones proporcionalmente al objetivo
// real del usuario (ej. 1500 kcal → factor 0.75; 2500 kcal → factor 1.25).
// Los valores nutricionales vienen de USDA / la misma fuente que la tabla `alimentos`.

import type { MacrosObjetivo } from './calcular'

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type AlimentoPlantilla = {
  nombre:        string
  calorias_100g: number
  proteina_100g: number
  carbos_100g:   number
  grasas_100g:   number
  gramos_base:   number  // porción de referencia a 2000 kcal/día
}

export type ComidaPlantilla = {
  tipo:      'desayuno' | 'almuerzo' | 'merienda' | 'cena'
  label:     string
  icono:     string
  hora:      string
  alimentos: AlimentoPlantilla[]
}

export type Plantilla = {
  id:          string
  nombre:      string
  descripcion: string
  icono:       string
  para:        string
  color:       string  // Tailwind class for accent
  comidas:     ComidaPlantilla[]
}

export type AlimentoCalculado = AlimentoPlantilla & {
  gramos:   number
  calorias: number
  proteina: number
  carbos:   number
  grasas:   number
}

export type ComidaCalculada = {
  tipo:         string
  label:        string
  icono:        string
  hora:         string
  alimentos:    AlimentoCalculado[]
  totalCalorias: number
  totalProteina: number
  totalCarbos:   number
  totalGrasas:   number
}

export type DietaCalculada = {
  plantilla: Plantilla
  comidas:   ComidaCalculada[]
  totalDia: {
    calorias: number
    proteina: number
    carbos:   number
    grasas:   number
  }
}

// ─── Plantillas ──────────────────────────────────────────────────────────────

// Calorías de referencia usadas para definir los gramos_base de cada alimento.
const REF_KCAL = 2000

export const PLANTILLAS: Plantilla[] = [
  // ── 1. Clásica equilibrada ──────────────────────────────────────────────
  {
    id:          'clasica',
    nombre:      'Clásica',
    descripcion: 'Equilibrada y variada',
    icono:       '🍽️',
    para:        'Para quien quiere una dieta completa, fácil de preparar y con buenos macros.',
    color:       'text-[#F5C518]',
    comidas: [
      {
        tipo: 'desayuno', label: 'Desayuno', icono: '🍳', hora: '8:30 AM',
        alimentos: [
          { nombre: 'Avena en hojuelas',  calorias_100g: 389, proteina_100g: 17, carbos_100g: 66, grasas_100g:  7, gramos_base:  70 },
          { nombre: 'Huevo entero',        calorias_100g: 155, proteina_100g: 13, carbos_100g:  1, grasas_100g: 11, gramos_base:  80 },
          { nombre: 'Plátano',             calorias_100g:  89, proteina_100g:  1, carbos_100g: 23, grasas_100g:  0, gramos_base: 100 },
        ],
      },
      {
        tipo: 'almuerzo', label: 'Almuerzo', icono: '🥗', hora: '1:00 PM',
        alimentos: [
          { nombre: 'Arroz blanco cocido', calorias_100g: 130, proteina_100g:  3, carbos_100g: 28, grasas_100g:  0, gramos_base: 200 },
          { nombre: 'Pechuga de pollo',    calorias_100g: 165, proteina_100g: 31, carbos_100g:  0, grasas_100g:  4, gramos_base: 200 },
          { nombre: 'Brócoli',             calorias_100g:  34, proteina_100g:  3, carbos_100g:  7, grasas_100g:  0, gramos_base: 100 },
          { nombre: 'Aceite de oliva',     calorias_100g: 884, proteina_100g:  0, carbos_100g:  0, grasas_100g:100, gramos_base:   8 },
        ],
      },
      {
        tipo: 'merienda', label: 'Merienda', icono: '🍎', hora: '4:00 PM',
        alimentos: [
          { nombre: 'Yogur griego natural', calorias_100g: 97, proteina_100g:  9, carbos_100g:  4, grasas_100g: 5, gramos_base: 130 },
          { nombre: 'Manzana',              calorias_100g: 52, proteina_100g:  0, carbos_100g: 14, grasas_100g: 0, gramos_base: 120 },
        ],
      },
      {
        tipo: 'cena', label: 'Cena', icono: '🍽️', hora: '7:30 PM',
        alimentos: [
          { nombre: 'Pasta cocida',     calorias_100g: 158, proteina_100g:  6, carbos_100g: 31, grasas_100g:  1, gramos_base: 180 },
          { nombre: 'Atún en agua',     calorias_100g: 116, proteina_100g: 26, carbos_100g:  0, grasas_100g:  1, gramos_base: 150 },
          { nombre: 'Tomate',           calorias_100g:  18, proteina_100g:  1, carbos_100g:  4, grasas_100g:  0, gramos_base: 100 },
          { nombre: 'Aceite de oliva',  calorias_100g: 884, proteina_100g:  0, carbos_100g:  0, grasas_100g:100, gramos_base:  10 },
        ],
      },
    ],
  },

  // ── 2. Económica ────────────────────────────────────────────────────────
  {
    id:          'economica',
    nombre:      'Económica',
    descripcion: 'Nutritiva y de bajo costo',
    icono:       '💰',
    para:        'Alimentos accesibles, sin suplementos. Fácil de conseguir en cualquier supermercado.',
    color:       'text-green-400',
    comidas: [
      {
        tipo: 'desayuno', label: 'Desayuno', icono: '🍳', hora: '8:00 AM',
        alimentos: [
          { nombre: 'Avena en hojuelas', calorias_100g: 389, proteina_100g: 17, carbos_100g: 66, grasas_100g:  7, gramos_base:  80 },
          { nombre: 'Huevo entero',      calorias_100g: 155, proteina_100g: 13, carbos_100g:  1, grasas_100g: 11, gramos_base:  80 },
          { nombre: 'Plátano',           calorias_100g:  89, proteina_100g:  1, carbos_100g: 23, grasas_100g:  0, gramos_base:  60 },
        ],
      },
      {
        tipo: 'almuerzo', label: 'Almuerzo', icono: '🫘', hora: '1:00 PM',
        alimentos: [
          { nombre: 'Arroz blanco cocido',  calorias_100g: 130, proteina_100g:  3, carbos_100g: 28, grasas_100g:  0, gramos_base: 250 },
          { nombre: 'Frijol negro cocido',  calorias_100g: 132, proteina_100g:  9, carbos_100g: 24, grasas_100g:  1, gramos_base: 200 },
          { nombre: 'Zanahoria',            calorias_100g:  40, proteina_100g:  2, carbos_100g:  9, grasas_100g:  0, gramos_base: 100 },
          { nombre: 'Aceite de oliva',      calorias_100g: 884, proteina_100g:  0, carbos_100g:  0, grasas_100g:100, gramos_base:   8 },
        ],
      },
      {
        tipo: 'merienda', label: 'Merienda', icono: '🥛', hora: '4:00 PM',
        alimentos: [
          { nombre: 'Leche entera', calorias_100g: 61, proteina_100g: 3, carbos_100g: 5, grasas_100g: 3, gramos_base: 200 },
          { nombre: 'Plátano',     calorias_100g: 89, proteina_100g: 1, carbos_100g:23, grasas_100g: 0, gramos_base:  80 },
        ],
      },
      {
        tipo: 'cena', label: 'Cena', icono: '🍳', hora: '7:00 PM',
        alimentos: [
          { nombre: 'Huevo entero',    calorias_100g: 155, proteina_100g: 13, carbos_100g:  1, grasas_100g: 11, gramos_base: 150 },
          { nombre: 'Pan integral',    calorias_100g: 247, proteina_100g: 13, carbos_100g: 41, grasas_100g:  3, gramos_base: 100 },
          { nombre: 'Tomate',          calorias_100g:  18, proteina_100g:  1, carbos_100g:  4, grasas_100g:  0, gramos_base: 150 },
          { nombre: 'Aceite de oliva', calorias_100g: 884, proteina_100g:  0, carbos_100g:  0, grasas_100g:100, gramos_base:   5 },
        ],
      },
    ],
  },

  // ── 3. Alta en Proteína ─────────────────────────────────────────────────
  {
    id:          'proteina',
    nombre:      'Alta Proteína',
    descripcion: 'Para ganar músculo',
    icono:       '💪',
    para:        'Prioriza la proteína en cada comida. Ideal para ganancias musculares o fases de definición.',
    color:       'text-blue-400',
    comidas: [
      {
        tipo: 'desayuno', label: 'Desayuno', icono: '🥚', hora: '8:00 AM',
        alimentos: [
          { nombre: 'Huevo entero',         calorias_100g: 155, proteina_100g: 13, carbos_100g:  1, grasas_100g: 11, gramos_base: 150 },
          { nombre: 'Yogur griego natural', calorias_100g:  97, proteina_100g:  9, carbos_100g:  4, grasas_100g:  5, gramos_base: 180 },
          { nombre: 'Avena en hojuelas',    calorias_100g: 389, proteina_100g: 17, carbos_100g: 66, grasas_100g:  7, gramos_base:  20 },
        ],
      },
      {
        tipo: 'almuerzo', label: 'Almuerzo', icono: '🍗', hora: '1:00 PM',
        alimentos: [
          { nombre: 'Pechuga de pollo', calorias_100g: 165, proteina_100g: 31, carbos_100g:  0, grasas_100g:  4, gramos_base: 250 },
          { nombre: 'Quinoa cocida',    calorias_100g:  86, proteina_100g:  3, carbos_100g: 19, grasas_100g:  0, gramos_base: 180 },
          { nombre: 'Espinaca',         calorias_100g:  23, proteina_100g:  3, carbos_100g:  4, grasas_100g:  0, gramos_base: 100 },
          { nombre: 'Aceite de oliva',  calorias_100g: 884, proteina_100g:  0, carbos_100g:  0, grasas_100g:100, gramos_base:   8 },
        ],
      },
      {
        tipo: 'merienda', label: 'Merienda', icono: '🐟', hora: '4:00 PM',
        alimentos: [
          { nombre: 'Atún en agua', calorias_100g: 116, proteina_100g: 26, carbos_100g:  0, grasas_100g: 1, gramos_base: 120 },
          { nombre: 'Manzana',      calorias_100g:  52, proteina_100g:  0, carbos_100g: 14, grasas_100g: 0, gramos_base:  80 },
        ],
      },
      {
        tipo: 'cena', label: 'Cena', icono: '🍗', hora: '7:30 PM',
        alimentos: [
          { nombre: 'Pechuga de pollo', calorias_100g: 165, proteina_100g: 31, carbos_100g:  0, grasas_100g:  4, gramos_base: 200 },
          { nombre: 'Batata cocida',    calorias_100g:  86, proteina_100g:  2, carbos_100g: 20, grasas_100g:  0, gramos_base: 200 },
          { nombre: 'Brócoli',          calorias_100g:  34, proteina_100g:  3, carbos_100g:  7, grasas_100g:  0, gramos_base: 100 },
          { nombre: 'Aceite de oliva',  calorias_100g: 884, proteina_100g:  0, carbos_100g:  0, grasas_100g:100, gramos_base:   6 },
        ],
      },
    ],
  },
]

// ─── Motor de cálculo de porciones ───────────────────────────────────────────

/**
 * Escala las porciones de una plantilla al objetivo calórico real del usuario.
 * Todos los gramos se multiplican por (calorias_objetivo / REF_KCAL).
 * Las calorías y macros de cada alimento se recalculan desde los gramos resultantes.
 */
export function calcularDieta(
  plantilla: Plantilla,
  objetivo:  MacrosObjetivo,
): DietaCalculada {
  const factor = objetivo.calorias / REF_KCAL

  const comidas: ComidaCalculada[] = plantilla.comidas.map(comida => {
    const alimentos: AlimentoCalculado[] = comida.alimentos.map(a => {
      const gramos   = Math.max(Math.round(a.gramos_base * factor), 1)
      const calorias = Math.round(a.calorias_100g * gramos / 100)
      const proteina = Math.round(a.proteina_100g * gramos / 100)
      const carbos   = Math.round(a.carbos_100g   * gramos / 100)
      const grasas   = Math.round(a.grasas_100g   * gramos / 100)
      return { ...a, gramos, calorias, proteina, carbos, grasas }
    })

    return {
      tipo:          comida.tipo,
      label:         comida.label,
      icono:         comida.icono,
      hora:          comida.hora,
      alimentos,
      totalCalorias: alimentos.reduce((s, a) => s + a.calorias, 0),
      totalProteina: alimentos.reduce((s, a) => s + a.proteina, 0),
      totalCarbos:   alimentos.reduce((s, a) => s + a.carbos,   0),
      totalGrasas:   alimentos.reduce((s, a) => s + a.grasas,   0),
    }
  })

  return {
    plantilla,
    comidas,
    totalDia: {
      calorias: comidas.reduce((s, c) => s + c.totalCalorias, 0),
      proteina: comidas.reduce((s, c) => s + c.totalProteina, 0),
      carbos:   comidas.reduce((s, c) => s + c.totalCarbos,   0),
      grasas:   comidas.reduce((s, c) => s + c.totalGrasas,   0),
    },
  }
}
