// Rutinas plantilla curadas (evidencia 2024-2025: frecuencia 2x, RIR 1-2, 10-20 series/músculo).
// Generado a partir del catálogo de ejercicios real. Los ejercicio_id existen en la tabla ejercicios.
// El módulo "Elige tu rutina" (Modelo B) las copia a la rutina del usuario.

export type PlantillaEjercicio = {
  ejercicio_id: string
  orden: number
  series: number
  repeticiones: string
  descanso_segundos: number
}
export type PlantillaDia = {
  nombre_dia: string
  dia_semana: string
  ejercicios: PlantillaEjercicio[]
}
export type RutinaPlantilla = {
  id: string
  nombre: string
  sexo: "hombre" | "mujer"
  dias_semana: number
  nivel: string
  descripcion: string
  dias: PlantillaDia[]
}

export const RUTINAS_PLANTILLA: RutinaPlantilla[] = [
  {
    "id": "full-body-3-dias-hombre",
    "nombre": "Full Body 3 días",
    "sexo": "hombre",
    "dias_semana": 3,
    "nivel": "principiante",
    "descripcion": "Todo el cuerpo cada sesión, 3x/semana. La mejor opción para empezar.",
    "dias": [
      {
        "nombre_dia": "Día A · Cuerpo completo",
        "dia_semana": "Lunes",
        "ejercicios": [
          {
            "ejercicio_id": "7c1b4bd5-6921-4194-a7ca-79ed325f0d5b",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "87370860-4602-4032-b424-9ed256178db3",
            "orden": 2,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "6d3f54a6-77e2-4c55-a07e-871136f7673b",
            "orden": 3,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "e6219331-612a-4a0f-befb-125b664de33d",
            "orden": 4,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "81ede5e5-eaa0-401a-909c-815eb7b0e0b9",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día B · Cuerpo completo",
        "dia_semana": "Miércoles",
        "ejercicios": [
          {
            "ejercicio_id": "0975c709-6014-4cd6-8576-3a3fe3e6f4f5",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "8694fb1b-ef20-4951-81b3-30b025591020",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "91ea4247-9ec1-438c-b1a1-a8d9b1b0556f",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "d0a0d26e-e296-4130-a502-6ed4b4af70b2",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "578e8eaf-bab3-464b-938c-a05243338807",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día C · Cuerpo completo",
        "dia_semana": "Viernes",
        "ejercicios": [
          {
            "ejercicio_id": "f61b9fa6-7317-4dc5-b373-0dab658b2358",
            "orden": 1,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "5ff25d50-9727-41e2-8d02-a52ebdb0b3d5",
            "orden": 2,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "39b8e979-6e53-4ad6-9344-0703dce6f761",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "11e910e1-6f92-4c1e-a76e-d50f1f60f8c7",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "5034178a-e717-44d1-83ac-7be4b42322f5",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      }
    ]
  },
  {
    "id": "full-body-3-dias-mujer",
    "nombre": "Full Body 3 días",
    "sexo": "mujer",
    "dias_semana": 3,
    "nivel": "principiante",
    "descripcion": "Todo el cuerpo cada sesión con énfasis en glúteo y pierna.",
    "dias": [
      {
        "nombre_dia": "Día A · Cuerpo completo",
        "dia_semana": "Lunes",
        "ejercicios": [
          {
            "ejercicio_id": "65b4ece3-cb9a-4493-a651-a056e1b2209f",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "7c1b4bd5-6921-4194-a7ca-79ed325f0d5b",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "91ea4247-9ec1-438c-b1a1-a8d9b1b0556f",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "e6219331-612a-4a0f-befb-125b664de33d",
            "orden": 4,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "81ede5e5-eaa0-401a-909c-815eb7b0e0b9",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día B · Cuerpo completo",
        "dia_semana": "Miércoles",
        "ejercicios": [
          {
            "ejercicio_id": "0975c709-6014-4cd6-8576-3a3fe3e6f4f5",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "f8823e40-b79a-4d9e-a2bc-82883b6ff4c8",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "39b8e979-6e53-4ad6-9344-0703dce6f761",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "d0a0d26e-e296-4130-a502-6ed4b4af70b2",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "578e8eaf-bab3-464b-938c-a05243338807",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día C · Cuerpo completo",
        "dia_semana": "Viernes",
        "ejercicios": [
          {
            "ejercicio_id": "f02b2ffe-0662-4c4c-8621-b131ec18af0c",
            "orden": 1,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "83cb929d-67df-453c-b3e6-3d6ae8f14003",
            "orden": 2,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "f61b9fa6-7317-4dc5-b373-0dab658b2358",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "11e910e1-6f92-4c1e-a76e-d50f1f60f8c7",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "e2d3f67d-da33-4c3b-8206-8cc90bb6a8dc",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      }
    ]
  },
  {
    "id": "clasica-3-dias-hombre",
    "nombre": "Clásica 3 días",
    "sexo": "hombre",
    "dias_semana": 3,
    "nivel": "intermedio",
    "descripcion": "Pecho+Bíceps / Espalda+Tríceps / Pierna. El split de toda la vida.",
    "dias": [
      {
        "nombre_dia": "Día 1 · Pecho y bíceps",
        "dia_semana": "Lunes",
        "ejercicios": [
          {
            "ejercicio_id": "87370860-4602-4032-b424-9ed256178db3",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "8694fb1b-ef20-4951-81b3-30b025591020",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "5ff25d50-9727-41e2-8d02-a52ebdb0b3d5",
            "orden": 3,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "81ede5e5-eaa0-401a-909c-815eb7b0e0b9",
            "orden": 4,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "8a31f3b3-0bf7-4925-a0bf-df1f3ed95a46",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 2 · Espalda y tríceps",
        "dia_semana": "Miércoles",
        "ejercicios": [
          {
            "ejercicio_id": "93f6ad59-50d8-45d2-8d21-4e20823776da",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "6d3f54a6-77e2-4c55-a07e-871136f7673b",
            "orden": 2,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "39b8e979-6e53-4ad6-9344-0703dce6f761",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "578e8eaf-bab3-464b-938c-a05243338807",
            "orden": 4,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "8e7da923-d333-45a5-b3a9-5c09c2c71c80",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 3 · Pierna y hombro",
        "dia_semana": "Viernes",
        "ejercicios": [
          {
            "ejercicio_id": "7c1b4bd5-6921-4194-a7ca-79ed325f0d5b",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "f61b9fa6-7317-4dc5-b373-0dab658b2358",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "11e910e1-6f92-4c1e-a76e-d50f1f60f8c7",
            "orden": 3,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "e6219331-612a-4a0f-befb-125b664de33d",
            "orden": 4,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "d0a0d26e-e296-4130-a502-6ed4b4af70b2",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      }
    ]
  },
  {
    "id": "clasica-3-dias-mujer",
    "nombre": "Clásica 3 días",
    "sexo": "mujer",
    "dias_semana": 3,
    "nivel": "intermedio",
    "descripcion": "Glúteo+Pierna / Torso / Posterior. Con foco en tren inferior.",
    "dias": [
      {
        "nombre_dia": "Día 1 · Glúteos y pierna",
        "dia_semana": "Lunes",
        "ejercicios": [
          {
            "ejercicio_id": "65b4ece3-cb9a-4493-a651-a056e1b2209f",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "7c1b4bd5-6921-4194-a7ca-79ed325f0d5b",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "f02b2ffe-0662-4c4c-8621-b131ec18af0c",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "83cb929d-67df-453c-b3e6-3d6ae8f14003",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "11e910e1-6f92-4c1e-a76e-d50f1f60f8c7",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 2 · Torso",
        "dia_semana": "Miércoles",
        "ejercicios": [
          {
            "ejercicio_id": "91ea4247-9ec1-438c-b1a1-a8d9b1b0556f",
            "orden": 1,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "39b8e979-6e53-4ad6-9344-0703dce6f761",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "e6219331-612a-4a0f-befb-125b664de33d",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "d0a0d26e-e296-4130-a502-6ed4b4af70b2",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "81ede5e5-eaa0-401a-909c-815eb7b0e0b9",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 3 · Glúteo posterior y abdomen",
        "dia_semana": "Viernes",
        "ejercicios": [
          {
            "ejercicio_id": "0975c709-6014-4cd6-8576-3a3fe3e6f4f5",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "f8823e40-b79a-4d9e-a2bc-82883b6ff4c8",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "f61b9fa6-7317-4dc5-b373-0dab658b2358",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "5034178a-e717-44d1-83ac-7be4b42322f5",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "e2d3f67d-da33-4c3b-8206-8cc90bb6a8dc",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      }
    ]
  },
  {
    "id": "torso-pierna-4-dias-hombre",
    "nombre": "Torso-Pierna 4 días",
    "sexo": "hombre",
    "dias_semana": 4,
    "nivel": "intermedio",
    "descripcion": "Upper/Lower ×2. Cada músculo 2x/semana: lo más efectivo en 4 días.",
    "dias": [
      {
        "nombre_dia": "Día 1 · Torso A (fuerza)",
        "dia_semana": "Lunes",
        "ejercicios": [
          {
            "ejercicio_id": "87370860-4602-4032-b424-9ed256178db3",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "6d3f54a6-77e2-4c55-a07e-871136f7673b",
            "orden": 2,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "e6219331-612a-4a0f-befb-125b664de33d",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "91ea4247-9ec1-438c-b1a1-a8d9b1b0556f",
            "orden": 4,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "81ede5e5-eaa0-401a-909c-815eb7b0e0b9",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 2 · Pierna A",
        "dia_semana": "Martes",
        "ejercicios": [
          {
            "ejercicio_id": "7c1b4bd5-6921-4194-a7ca-79ed325f0d5b",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "11e910e1-6f92-4c1e-a76e-d50f1f60f8c7",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "f61b9fa6-7317-4dc5-b373-0dab658b2358",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "5034178a-e717-44d1-83ac-7be4b42322f5",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "e2d3f67d-da33-4c3b-8206-8cc90bb6a8dc",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 3 · Torso B (volumen)",
        "dia_semana": "Jueves",
        "ejercicios": [
          {
            "ejercicio_id": "8694fb1b-ef20-4951-81b3-30b025591020",
            "orden": 1,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "93f6ad59-50d8-45d2-8d21-4e20823776da",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "d0a0d26e-e296-4130-a502-6ed4b4af70b2",
            "orden": 3,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "5ff25d50-9727-41e2-8d02-a52ebdb0b3d5",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "578e8eaf-bab3-464b-938c-a05243338807",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 4 · Pierna B",
        "dia_semana": "Viernes",
        "ejercicios": [
          {
            "ejercicio_id": "0975c709-6014-4cd6-8576-3a3fe3e6f4f5",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "f02b2ffe-0662-4c4c-8621-b131ec18af0c",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "c8df269f-82e5-4e41-bf60-297aafabb8f6",
            "orden": 3,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "777ffbb4-1a4a-4bc9-998f-4d9b2caf7a81",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "68c23ed1-d2bc-460f-b64a-5cef646f8635",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      }
    ]
  },
  {
    "id": "torso-pierna-4-dias-mujer",
    "nombre": "Torso-Pierna 4 días",
    "sexo": "mujer",
    "dias_semana": 4,
    "nivel": "intermedio",
    "descripcion": "Upper/Lower ×2 con mayor volumen de glúteo y pierna.",
    "dias": [
      {
        "nombre_dia": "Día 1 · Torso A",
        "dia_semana": "Lunes",
        "ejercicios": [
          {
            "ejercicio_id": "91ea4247-9ec1-438c-b1a1-a8d9b1b0556f",
            "orden": 1,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "e6219331-612a-4a0f-befb-125b664de33d",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "39b8e979-6e53-4ad6-9344-0703dce6f761",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "d0a0d26e-e296-4130-a502-6ed4b4af70b2",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "81ede5e5-eaa0-401a-909c-815eb7b0e0b9",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 2 · Pierna A (glúteo)",
        "dia_semana": "Martes",
        "ejercicios": [
          {
            "ejercicio_id": "65b4ece3-cb9a-4493-a651-a056e1b2209f",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "7c1b4bd5-6921-4194-a7ca-79ed325f0d5b",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "11e910e1-6f92-4c1e-a76e-d50f1f60f8c7",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "83cb929d-67df-453c-b3e6-3d6ae8f14003",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "5034178a-e717-44d1-83ac-7be4b42322f5",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 3 · Torso B",
        "dia_semana": "Jueves",
        "ejercicios": [
          {
            "ejercicio_id": "8694fb1b-ef20-4951-81b3-30b025591020",
            "orden": 1,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "93f6ad59-50d8-45d2-8d21-4e20823776da",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "0bda89c6-194e-40a6-b9c8-2da3537657e9",
            "orden": 3,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "578e8eaf-bab3-464b-938c-a05243338807",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "ac63f4ab-8eea-4bb5-9b32-83326856a758",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 4 · Pierna B (posterior)",
        "dia_semana": "Viernes",
        "ejercicios": [
          {
            "ejercicio_id": "0975c709-6014-4cd6-8576-3a3fe3e6f4f5",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "f8823e40-b79a-4d9e-a2bc-82883b6ff4c8",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "f02b2ffe-0662-4c4c-8621-b131ec18af0c",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "f61b9fa6-7317-4dc5-b373-0dab658b2358",
            "orden": 4,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "e2d3f67d-da33-4c3b-8206-8cc90bb6a8dc",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      }
    ]
  },
  {
    "id": "clasica-4-dias-hombre",
    "nombre": "Clásica 4 días",
    "sexo": "hombre",
    "dias_semana": 4,
    "nivel": "intermedio",
    "descripcion": "Pecho+Tríceps / Espalda+Bíceps / Pierna / Hombro+Abdomen.",
    "dias": [
      {
        "nombre_dia": "Día 1 · Pecho y tríceps",
        "dia_semana": "Lunes",
        "ejercicios": [
          {
            "ejercicio_id": "87370860-4602-4032-b424-9ed256178db3",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "8694fb1b-ef20-4951-81b3-30b025591020",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "5ff25d50-9727-41e2-8d02-a52ebdb0b3d5",
            "orden": 3,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "578e8eaf-bab3-464b-938c-a05243338807",
            "orden": 4,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "8e7da923-d333-45a5-b3a9-5c09c2c71c80",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 2 · Espalda y bíceps",
        "dia_semana": "Martes",
        "ejercicios": [
          {
            "ejercicio_id": "93f6ad59-50d8-45d2-8d21-4e20823776da",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "6d3f54a6-77e2-4c55-a07e-871136f7673b",
            "orden": 2,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "91ea4247-9ec1-438c-b1a1-a8d9b1b0556f",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "81ede5e5-eaa0-401a-909c-815eb7b0e0b9",
            "orden": 4,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "8a31f3b3-0bf7-4925-a0bf-df1f3ed95a46",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 3 · Pierna",
        "dia_semana": "Jueves",
        "ejercicios": [
          {
            "ejercicio_id": "7c1b4bd5-6921-4194-a7ca-79ed325f0d5b",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "f61b9fa6-7317-4dc5-b373-0dab658b2358",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "0975c709-6014-4cd6-8576-3a3fe3e6f4f5",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "11e910e1-6f92-4c1e-a76e-d50f1f60f8c7",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "5034178a-e717-44d1-83ac-7be4b42322f5",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 4 · Hombro y abdomen",
        "dia_semana": "Viernes",
        "ejercicios": [
          {
            "ejercicio_id": "e6219331-612a-4a0f-befb-125b664de33d",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "d0a0d26e-e296-4130-a502-6ed4b4af70b2",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "0bda89c6-194e-40a6-b9c8-2da3537657e9",
            "orden": 3,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "e2d3f67d-da33-4c3b-8206-8cc90bb6a8dc",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "68c23ed1-d2bc-460f-b64a-5cef646f8635",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      }
    ]
  },
  {
    "id": "clasica-4-dias-mujer",
    "nombre": "Clásica 4 días",
    "sexo": "mujer",
    "dias_semana": 4,
    "nivel": "intermedio",
    "descripcion": "Glúteo / Espalda+Bíceps / Pierna / Pecho+Hombro. Foco inferior.",
    "dias": [
      {
        "nombre_dia": "Día 1 · Glúteos",
        "dia_semana": "Lunes",
        "ejercicios": [
          {
            "ejercicio_id": "65b4ece3-cb9a-4493-a651-a056e1b2209f",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "f8823e40-b79a-4d9e-a2bc-82883b6ff4c8",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "83cb929d-67df-453c-b3e6-3d6ae8f14003",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "f02b2ffe-0662-4c4c-8621-b131ec18af0c",
            "orden": 4,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "e2d3f67d-da33-4c3b-8206-8cc90bb6a8dc",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 2 · Espalda y bíceps",
        "dia_semana": "Martes",
        "ejercicios": [
          {
            "ejercicio_id": "91ea4247-9ec1-438c-b1a1-a8d9b1b0556f",
            "orden": 1,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "39b8e979-6e53-4ad6-9344-0703dce6f761",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "6d3f54a6-77e2-4c55-a07e-871136f7673b",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "81ede5e5-eaa0-401a-909c-815eb7b0e0b9",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "ac63f4ab-8eea-4bb5-9b32-83326856a758",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 3 · Pierna",
        "dia_semana": "Jueves",
        "ejercicios": [
          {
            "ejercicio_id": "7c1b4bd5-6921-4194-a7ca-79ed325f0d5b",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "0975c709-6014-4cd6-8576-3a3fe3e6f4f5",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "f61b9fa6-7317-4dc5-b373-0dab658b2358",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "11e910e1-6f92-4c1e-a76e-d50f1f60f8c7",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "5034178a-e717-44d1-83ac-7be4b42322f5",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 4 · Pecho y hombro",
        "dia_semana": "Viernes",
        "ejercicios": [
          {
            "ejercicio_id": "8694fb1b-ef20-4951-81b3-30b025591020",
            "orden": 1,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "5ff25d50-9727-41e2-8d02-a52ebdb0b3d5",
            "orden": 2,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "e6219331-612a-4a0f-befb-125b664de33d",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "d0a0d26e-e296-4130-a502-6ed4b4af70b2",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "0bda89c6-194e-40a6-b9c8-2da3537657e9",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      }
    ]
  },
  {
    "id": "5-dias-completa-hombre",
    "nombre": "5 días completa",
    "sexo": "hombre",
    "dias_semana": 5,
    "nivel": "avanzado",
    "descripcion": "Torso / Pierna / Empuje / Tirón / Pierna. Dos días de pierna.",
    "dias": [
      {
        "nombre_dia": "Día 1 · Torso",
        "dia_semana": "Lunes",
        "ejercicios": [
          {
            "ejercicio_id": "87370860-4602-4032-b424-9ed256178db3",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "6d3f54a6-77e2-4c55-a07e-871136f7673b",
            "orden": 2,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "e6219331-612a-4a0f-befb-125b664de33d",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "91ea4247-9ec1-438c-b1a1-a8d9b1b0556f",
            "orden": 4,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "81ede5e5-eaa0-401a-909c-815eb7b0e0b9",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 2 · Pierna (cuádriceps)",
        "dia_semana": "Martes",
        "ejercicios": [
          {
            "ejercicio_id": "7c1b4bd5-6921-4194-a7ca-79ed325f0d5b",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "f61b9fa6-7317-4dc5-b373-0dab658b2358",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "f02b2ffe-0662-4c4c-8621-b131ec18af0c",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "c8df269f-82e5-4e41-bf60-297aafabb8f6",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "5034178a-e717-44d1-83ac-7be4b42322f5",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 3 · Empuje",
        "dia_semana": "Miércoles",
        "ejercicios": [
          {
            "ejercicio_id": "8694fb1b-ef20-4951-81b3-30b025591020",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "5ff25d50-9727-41e2-8d02-a52ebdb0b3d5",
            "orden": 2,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "d0a0d26e-e296-4130-a502-6ed4b4af70b2",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "578e8eaf-bab3-464b-938c-a05243338807",
            "orden": 4,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "8e7da923-d333-45a5-b3a9-5c09c2c71c80",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 4 · Tirón",
        "dia_semana": "Jueves",
        "ejercicios": [
          {
            "ejercicio_id": "93f6ad59-50d8-45d2-8d21-4e20823776da",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "39b8e979-6e53-4ad6-9344-0703dce6f761",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "982547cc-2a3b-4b45-9dcd-23227fc07a8a",
            "orden": 3,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "8a31f3b3-0bf7-4925-a0bf-df1f3ed95a46",
            "orden": 4,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "ac63f4ab-8eea-4bb5-9b32-83326856a758",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 5 · Pierna (posterior)",
        "dia_semana": "Viernes",
        "ejercicios": [
          {
            "ejercicio_id": "0975c709-6014-4cd6-8576-3a3fe3e6f4f5",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "11e910e1-6f92-4c1e-a76e-d50f1f60f8c7",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "65b4ece3-cb9a-4493-a651-a056e1b2209f",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "777ffbb4-1a4a-4bc9-998f-4d9b2caf7a81",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "e2d3f67d-da33-4c3b-8206-8cc90bb6a8dc",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      }
    ]
  },
  {
    "id": "5-dias-completa-mujer",
    "nombre": "5 días completa",
    "sexo": "mujer",
    "dias_semana": 5,
    "nivel": "avanzado",
    "descripcion": "Glúteo / Espalda / Pierna / Pecho+Hombro / Glúteo. Tres días de tren inferior.",
    "dias": [
      {
        "nombre_dia": "Día 1 · Glúteos",
        "dia_semana": "Lunes",
        "ejercicios": [
          {
            "ejercicio_id": "65b4ece3-cb9a-4493-a651-a056e1b2209f",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "f8823e40-b79a-4d9e-a2bc-82883b6ff4c8",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "83cb929d-67df-453c-b3e6-3d6ae8f14003",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "f02b2ffe-0662-4c4c-8621-b131ec18af0c",
            "orden": 4,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "5034178a-e717-44d1-83ac-7be4b42322f5",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 2 · Espalda y bíceps",
        "dia_semana": "Martes",
        "ejercicios": [
          {
            "ejercicio_id": "91ea4247-9ec1-438c-b1a1-a8d9b1b0556f",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "39b8e979-6e53-4ad6-9344-0703dce6f761",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "6d3f54a6-77e2-4c55-a07e-871136f7673b",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "81ede5e5-eaa0-401a-909c-815eb7b0e0b9",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "ac63f4ab-8eea-4bb5-9b32-83326856a758",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 3 · Pierna (cuádriceps)",
        "dia_semana": "Miércoles",
        "ejercicios": [
          {
            "ejercicio_id": "7c1b4bd5-6921-4194-a7ca-79ed325f0d5b",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "f61b9fa6-7317-4dc5-b373-0dab658b2358",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "c8df269f-82e5-4e41-bf60-297aafabb8f6",
            "orden": 3,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "11e910e1-6f92-4c1e-a76e-d50f1f60f8c7",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "e2d3f67d-da33-4c3b-8206-8cc90bb6a8dc",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 4 · Pecho y hombro",
        "dia_semana": "Jueves",
        "ejercicios": [
          {
            "ejercicio_id": "8694fb1b-ef20-4951-81b3-30b025591020",
            "orden": 1,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "5ff25d50-9727-41e2-8d02-a52ebdb0b3d5",
            "orden": 2,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "e6219331-612a-4a0f-befb-125b664de33d",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "d0a0d26e-e296-4130-a502-6ed4b4af70b2",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "0bda89c6-194e-40a6-b9c8-2da3537657e9",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      },
      {
        "nombre_dia": "Día 5 · Glúteo posterior",
        "dia_semana": "Viernes",
        "ejercicios": [
          {
            "ejercicio_id": "0975c709-6014-4cd6-8576-3a3fe3e6f4f5",
            "orden": 1,
            "series": 4,
            "repeticiones": "6-8",
            "descanso_segundos": 120
          },
          {
            "ejercicio_id": "65b4ece3-cb9a-4493-a651-a056e1b2209f",
            "orden": 2,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "11e910e1-6f92-4c1e-a76e-d50f1f60f8c7",
            "orden": 3,
            "series": 3,
            "repeticiones": "8-12",
            "descanso_segundos": 90
          },
          {
            "ejercicio_id": "f8823e40-b79a-4d9e-a2bc-82883b6ff4c8",
            "orden": 4,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          },
          {
            "ejercicio_id": "68c23ed1-d2bc-460f-b64a-5cef646f8635",
            "orden": 5,
            "series": 3,
            "repeticiones": "12-15",
            "descanso_segundos": 60
          }
        ]
      }
    ]
  }
]
