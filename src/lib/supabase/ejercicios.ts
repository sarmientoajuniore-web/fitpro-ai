'use client'

import type { Ejercicio } from '@/types/ejercicios'

export async function getEjercicios(): Promise<Ejercicio[]> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/ejercicios?select=*&order=nombre.asc`
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Faltan variables de entorno de Supabase')
    return []
  }

  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
  })

  if (!res.ok) {
    console.error('Error HTTP:', res.status, await res.text())
    return []
  }

  const data: Ejercicio[] = await res.json()
  return data
}
