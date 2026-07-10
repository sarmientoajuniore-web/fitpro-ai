import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/rutinas/mover-dia  { rutina_id, diaA, diaB }
//
// Intercambia todos los ejercicios entre dos días de la semana dentro de una
// rutina. Se hace en el servidor con service role porque la tabla
// rutina_ejercicios no tiene política RLS de UPDATE (un UPDATE desde el cliente
// responde "ok" pero afecta 0 filas). Antes de tocar nada se verifica que la
// rutina pertenezca al usuario autenticado, para no permitir editar rutinas ajenas.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { rutina_id, diaA, diaB } = body
  if (!rutina_id || !diaA || !diaB) {
    return Response.json({ error: 'Faltan datos (rutina_id, diaA, diaB)' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 })

  // Verificar que la rutina sea del usuario
  const { data: rutina } = await admin
    .from('rutinas')
    .select('id, user_id')
    .eq('id', rutina_id)
    .maybeSingle()
  if (!rutina) return Response.json({ error: 'Rutina no encontrada' }, { status: 404 })
  if (rutina.user_id !== user.id) return Response.json({ error: 'Sin permiso' }, { status: 403 })

  // Ejercicios de ambos días (solo de esta rutina)
  const { data: ejercicios, error: errLeer } = await admin
    .from('rutina_ejercicios')
    .select('id, dia_semana')
    .eq('rutina_id', rutina_id)
    .in('dia_semana', [diaA, diaB])
  if (errLeer) return Response.json({ error: errLeer.message }, { status: 500 })

  const idsA = (ejercicios || []).filter(e => e.dia_semana === diaA).map(e => e.id)
  const idsB = (ejercicios || []).filter(e => e.dia_semana === diaB).map(e => e.id)

  if (!idsA.length && !idsB.length) {
    return Response.json({ error: 'No hay ejercicios que mover en esos días' }, { status: 400 })
  }

  // Se filtra por id (listas disjuntas), así que el orden de los updates no importa.
  if (idsA.length) {
    const { error } = await admin.from('rutina_ejercicios').update({ dia_semana: diaB }).in('id', idsA)
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }
  if (idsB.length) {
    const { error } = await admin.from('rutina_ejercicios').update({ dia_semana: diaA }).in('id', idsB)
    if (error) {
      // Revertir el primer paso para no dejar la rutina a medio intercambiar
      if (idsA.length) await admin.from('rutina_ejercicios').update({ dia_semana: diaA }).in('id', idsA)
      return Response.json({ error: error.message }, { status: 500 })
    }
  }

  return Response.json({ ok: true, movidosA: idsA.length, movidosB: idsB.length })
}
