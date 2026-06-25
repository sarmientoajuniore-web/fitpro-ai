import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generarCodigo(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let c = 'FIT-'
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)]
  return c
}

// GET /api/rutinas/compartir?codigo=FIT-XXXX
// Devuelve la plantilla de la rutina para previsualizar antes de importar.
// Usa service role para poder leer rutinas de otros usuarios.
export async function GET(req: NextRequest) {
  const codigo = req.nextUrl.searchParams.get('codigo')?.trim().toUpperCase()
  if (!codigo) return Response.json({ error: 'Falta el código' }, { status: 400 })

  const { data, error } = await admin
    .from('rutinas')
    .select('nombre, dias_semana, rutina_ejercicios(ejercicio_id, dia_semana, orden, series, repeticiones, descanso_segundos)')
    .eq('codigo_compartir', codigo)
    .maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data) return Response.json({ error: 'Código no encontrado. Revisa que esté bien escrito.' }, { status: 404 })

  return Response.json({ rutina: data })
}

// POST /api/rutinas/compartir  { rutina_id }
// Genera (o devuelve) el código FIT-XXXX para una rutina del usuario autenticado.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { rutina_id } = body
  if (!rutina_id) return Response.json({ error: 'Falta rutina_id' }, { status: 400 })

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 })

  const { data: rutina } = await admin
    .from('rutinas')
    .select('id, user_id, codigo_compartir')
    .eq('id', rutina_id)
    .maybeSingle()

  if (!rutina) return Response.json({ error: 'Rutina no encontrada' }, { status: 404 })
  if (rutina.user_id !== user.id) return Response.json({ error: 'Sin permiso' }, { status: 403 })

  // Reusar código FIT- existente
  if (rutina.codigo_compartir?.startsWith('FIT-')) {
    return Response.json({ codigo: rutina.codigo_compartir })
  }

  // Generar código único
  let codigo = ''
  for (let i = 0; i < 10; i++) {
    const candidato = generarCodigo()
    const { data: conflicto } = await admin
      .from('rutinas')
      .select('id')
      .eq('codigo_compartir', candidato)
      .maybeSingle()
    if (!conflicto) { codigo = candidato; break }
  }
  if (!codigo) return Response.json({ error: 'No se pudo generar un código único' }, { status: 500 })

  const { error: updateError } = await admin
    .from('rutinas')
    .update({ codigo_compartir: codigo, es_publica: true })
    .eq('id', rutina_id)

  if (updateError) return Response.json({ error: updateError.message }, { status: 500 })
  return Response.json({ codigo })
}
