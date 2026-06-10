import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function InicioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const nombre = user.user_metadata?.nombre_completo?.split(' ')[0] || 'Atleta'

  return (
    <div className="p-5 flex flex-col gap-4">

      {/* SALUDO */}
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#1c1a00] border border-[#F5C518]/20 rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-[#F5C518]/5 rounded-full" />
        <h2 className="text-2xl font-bold text-white mb-1">¡Hola, {nombre}! 💪</h2>
        <p className="text-gray-500 text-sm mb-4">Bienvenido a tu panel de control</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { val: '2.700', lbl: 'kcal objetivo' },
            { val: '180g',  lbl: 'proteína' },
            { val: '0',     lbl: 'racha días' },
          ].map(({ val, lbl }) => (
            <div key={lbl} className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-[#F5C518]">{val}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* REGISTRO RÁPIDO */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Registro rápido</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { emoji: '🧠', title: 'IA: Registrar comida', sub: 'Foto, voz o texto', href: '/ia' },
            { emoji: '➕', title: 'Añadir alimento',      sub: 'Buscar base de datos', href: '/nutricion' },
            { emoji: '🏋️', title: 'Registrar serie',     sub: 'Sesión de hoy',       href: '/rutinas' },
            { emoji: '⚖️', title: 'Registrar peso',      sub: 'Seguimiento corporal', href: '/progreso' },
          ].map(({ emoji, title, sub, href }) => (
            <a
              key={href}
              href={href}
              className="bg-[#1a1a1a] border border-white/8 rounded-xl p-4 hover:border-white/20 transition-colors"
            >
              <div className="text-2xl mb-2">{emoji}</div>
              <div className="text-sm font-semibold text-white mb-1">{title}</div>
              <div className="text-xs text-gray-500">{sub}</div>
            </a>
          ))}
        </div>
      </div>

      {/* ESTADO */}
      <div className="bg-[#1a1a1a] border border-white/8 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Estado de hoy</h3>
        <div className="flex flex-col gap-3">
          {[
            { label: 'Calorías',      val: '0 / 2.700 kcal', pct: 0,   color: '#F5C518' },
            { label: 'Proteína',      val: '0 / 180g',        pct: 0,   color: '#3B82F6' },
            { label: 'Carbohidratos', val: '0 / 290g',        pct: 0,   color: '#22C55E' },
            { label: 'Grasas',        val: '0 / 90g',         pct: 0,   color: '#EF4444' },
          ].map(({ label, val, pct, color }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">{label}</span>
                <span className="font-semibold text-white">{val}</span>
              </div>
              <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
