import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Tablas del usuario que se identifican por user_id.
const TABLAS_POR_USER_ID = [
  'rutinas',
  'sesiones',
  'registro_comidas',
  'peso_corporal',
  'registro_agua',
] as const

// POST /api/cuenta/eliminar
// Borra la cuenta del usuario autenticado y todos sus datos, sin vuelta atrás.
// Google Play exige que toda app con registro permita eliminar la cuenta desde
// la propia app. Usa service role porque borrar el usuario de auth y limpiar las
// filas no se puede hacer con la anon key.
export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 })

  const uid = user.id

  // rutina_ejercicios cuelga de rutinas (rutina_id), no del usuario: va primero
  // para no dejar filas huérfanas si no hay cascade en la FK.
  const { data: rutinas, error: errRutinas } = await admin
    .from('rutinas')
    .select('id')
    .eq('user_id', uid)

  if (errRutinas) return Response.json({ error: errRutinas.message }, { status: 500 })

  const rutinaIds = (rutinas ?? []).map((r) => r.id)
  if (rutinaIds.length > 0) {
    const { error } = await admin
      .from('rutina_ejercicios')
      .delete()
      .in('rutina_id', rutinaIds)
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }

  for (const tabla of TABLAS_POR_USER_ID) {
    const { error } = await admin.from(tabla).delete().eq('user_id', uid)
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }

  // perfiles se identifica por id (= uid de auth), no por user_id.
  const { error: errPerfil } = await admin.from('perfiles').delete().eq('id', uid)
  if (errPerfil) return Response.json({ error: errPerfil.message }, { status: 500 })

  // Último: sin el usuario de auth ya no se podría volver a limpiar lo anterior.
  const { error: errUser } = await admin.auth.admin.deleteUser(uid)
  if (errUser) return Response.json({ error: errUser.message }, { status: 500 })

  await supabase.auth.signOut()

  return Response.json({ ok: true })
}
