export type Ejercicio = {
  id: string
  nombre: string
  musculo_principal: string
  musculos_secundarios: string[]
  categoria: string
  equipo: string
  // Catálogo original (ES): 'principiante' | 'intermedio' | 'avanzado'.
  // free-exercise-db (EN): 'beginner' | 'intermediate' | 'expert'.
  nivel: string
  instrucciones: string
  consejos: string | null
  imagenes: string[] | null
}
