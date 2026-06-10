export default async function InicioPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-lg mx-auto p-5">
        
        {/* HEADER */}
        <div className="flex items-center justify-between py-4 mb-4 border-b border-white/10">
          <h1 className="text-xl font-bold">Fit<span className="text-[#F5C518]">Pro</span> IA</h1>
          <a href="/login" className="text-xs text-gray-400 hover:text-white">Cerrar sesión</a>
        </div>

        {/* BIENVENIDA */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#1c1a00] border border-[#F5C518]/20 rounded-2xl p-5 mb-4">
          <h2 className="text-2xl font-bold mb-1">¡Bienvenido! 💪</h2>
          <p className="text-gray-500 text-sm mb-4">Tu plataforma de fitness inteligente está lista</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: '2.700', lbl: 'kcal objetivo' },
              { val: '180g', lbl: 'proteína' },
              { val: '0', lbl: 'racha días' },
            ].map(({ val, lbl }) => (
              <div key={lbl} className="bg-black/30 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-[#F5C518]">{val}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ACCESO RÁPIDO */}
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Módulos</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { emoji: '🏋️', title: 'Ejercicios', sub: 'Biblioteca completa', href: '/ejercicios' },
            { emoji: '🥗', title: 'Nutrición', sub: 'Registro de comidas', href: '/nutricion' },
            { emoji: '📋', title: 'Rutinas', sub: 'Mis entrenamientos', href: '/rutinas' },
            { emoji: '📈', title: 'Progreso', sub: 'Seguimiento corporal', href: '/progreso' },
          ].map(({ emoji, title, sub, href }) => (
            <a key={href} href={href}
              className="bg-[#1a1a1a] border border-white/8 rounded-xl p-4 hover:border-white/20 transition-colors">
              <div className="text-2xl mb-2">{emoji}</div>
              <div className="text-sm font-semibold text-white mb-1">{title}</div>
              <div className="text-xs text-gray-500">{sub}</div>
            </a>
          ))}
        </div>

      </div>
    </div>
  )
}
